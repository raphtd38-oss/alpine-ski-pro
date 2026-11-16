import { computeSkiSoundMix, type SkiSoundMix } from "./audio-mix";
import { poleImpactMix } from "./pole-sound";

/**
 * Multi-layer skiing sound engine, with local ElevenLabs audio where available
 * and original Web Audio procedural fallback when newer files are absent.
 *
 * Optional future soundpack files:
 *   public/audio/carving.mp3, ice.mp3, wind.mp3, crowd-long.mp3
 * No runtime API calls, account secrets or paid services are needed to play.
 */
type SoundName = "pole" | "menu" | "crowd" | "crowd-long" | "carving" | "ice" | "wind";
type LoopName = Exclude<SoundName, "pole">;
type NoiseVoice = { source: AudioBufferSourceNode; filter: BiquadFilterNode; gain: GainNode };
type BufferLoop = { source: AudioBufferSourceNode; gain: GainNode };

export class SkiAudio {
  ctx: AudioContext | null = null;
  master: GainNode | null = null;
  gain: GainNode | null = null;
  filter: BiquadFilterNode | null = null;
  enabled = true;
  buffers: Partial<Record<SoundName, AudioBuffer>> = {};
  looped: Partial<Record<LoopName, BufferLoop>> = {};
  voices: Partial<Record<"glide" | "carving" | "ice" | "wind", NoiseVoice>> = {};
  loaded = false;
  menuActive = true;
  crowdProximity = 0;
  lastMix: SkiSoundMix = computeSkiSoundMix(0, 0, 0, false);
  impactNoise: AudioBuffer | null = null;
  lastImpactSeconds = -1;

  async start() {
    if (!this.ctx) {
      this.ctx = new AudioContext();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.enabled ? 0.65 : 0;
      this.master.connect(this.ctx.destination);
      const noise = this.makeNoise();
      this.impactNoise = this.makeImpactNoise();
      this.voices.glide = this.makeVoice(noise, "lowpass", 1200);
      this.voices.carving = this.makeVoice(noise, "bandpass", 1500);
      this.voices.ice = this.makeVoice(noise, "highpass", 2500);
      this.voices.wind = this.makeVoice(noise, "lowpass", 600);
      this.gain = this.voices.glide.gain;
      this.filter = this.voices.glide.filter;
      void this.loadAssets();
    }
    await this.ctx.resume();
  }

  private makeNoise() {
    const ctx = this.ctx!;
    const buffer = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let last = 0;
    for (let i = 0; i < data.length; i++) {
      // Natural pinkish random texture instead of a harsh white hiss.
      last = (last + (Math.random() - 0.5) * 0.06) / 1.025;
      data[i] = Math.max(-1, Math.min(1, last * 4));
    }
    return buffer;
  }

  /** Short broadband fibreglass and fabric impulse for contact with gates.
   * Generated locally: no sound copied from the reference game.
   */
  private makeImpactNoise() {
    const ctx = this.ctx!;
    const buffer = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * 0.45), ctx.sampleRate);
    const samples = buffer.getChannelData(0);
    for (let i = 0; i < samples.length; i++)
      samples[i] = (Math.random() * 2 - 1) * (0.8 + 0.2 * Math.random());
    return buffer;
  }

  private makeVoice(buffer: AudioBuffer, type: BiquadFilterType, frequency: number): NoiseVoice {
    const ctx = this.ctx!, source = ctx.createBufferSource(),
      filter = ctx.createBiquadFilter(), gain = ctx.createGain();
    source.buffer = buffer;
    source.loop = true;
    type === "bandpass" ? (filter.Q.value = 0.7) : undefined;
    filter.type = type;
    filter.frequency.value = frequency;
    gain.gain.value = 0;
    source.connect(filter).connect(gain).connect(this.master!);
    source.start();
    return { source, filter, gain };
  }

  private async loadAssets() {
    const ctx = this.ctx!;
    await Promise.all(
      (["pole", "menu", "crowd", "crowd-long", "carving", "ice", "wind"] as SoundName[])
        .map(async (name) => {
          try {
            const response = await fetch(import.meta.env.BASE_URL + "audio/" + name + ".mp3");
            if (response.ok) {
              this.buffers[name] = await ctx.decodeAudioData(await response.arrayBuffer());
            }
          } catch {
            // All optional files have a graceful fallback: no blocking audio errors.
          }
        }),
    );
    this.loaded = true;
    this.startLoops();
    this.applyMix(this.lastMix);
    this.menu(this.menuActive);
    this.crowd(this.crowdProximity);
  }

  private makeBufferLoop(name: LoopName, buffer: AudioBuffer) {
    const ctx = this.ctx!;
    const source = ctx.createBufferSource(), gain = ctx.createGain();
    source.buffer = buffer;
    source.loop = true;
    gain.gain.value = 0;
    source.connect(gain).connect(this.master!);
    source.start();
    this.looped[name] = { source, gain };
  }

  private startLoops() {
    // Start only one crowd ambience; the long version replaces the old 2 s loop.
    const crowd = this.buffers["crowd-long"] ? "crowd-long" : "crowd";
    for (const name of ["menu", crowd, "carving", "ice", "wind"] as LoopName[]) {
      const buffer = this.buffers[name];
      if (buffer && !this.looped[name]) this.makeBufferLoop(name, buffer);
    }
  }

  private fade(gain: GainNode | undefined, value: number, response = 0.15) {
    if (!gain || !this.ctx) return;
    gain.gain.setTargetAtTime(value, this.ctx.currentTime, response);
  }

  private applyMix(mix: SkiSoundMix) {
    if (!this.ctx) return;
    const sample = (name: "carving" | "ice" | "wind", level: number) => {
      const hasFile = Boolean(this.looped[name]);
      this.fade(this.looped[name]?.gain, hasFile ? level : 0, 0.12);
      this.fade(this.voices[name]?.gain, level * (hasFile ? 0.18 : 0.7), 0.09);
    };
    this.fade(this.voices.glide?.gain, mix.glide * 0.9, 0.09);
    sample("carving", mix.carving);
    sample("ice", mix.ice);
    sample("wind", mix.wind);
    this.voices.glide?.filter.frequency.setTargetAtTime(mix.filterHz, this.ctx.currentTime, 0.12);
    this.voices.carving?.filter.frequency.setTargetAtTime(
      Math.max(450, mix.filterHz * 1.6), this.ctx.currentTime, 0.12,
    );
    this.voices.wind?.filter.frequency.setTargetAtTime(
      mix.windFilterHz, this.ctx.currentTime, 0.12,
    );
  }

  update(speed: number, edge: number, slip: number, active: boolean, snowGrip = 1) {
    this.lastMix = computeSkiSoundMix(speed, edge, slip, active, snowGrip);
    this.applyMix(this.lastMix);
  }

  menu(active: boolean) {
    this.menuActive = active;
    this.fade(this.looped.menu?.gain, active ? 0.24 : 0, 0.35);
  }

  crowd(proximity: number) {
    this.crowdProximity = Number.isFinite(proximity)
      ? Math.max(0, Math.min(1, proximity)) : 0;
    const name = this.looped["crowd-long"] ? "crowd-long" : "crowd";
    this.fade(this.looped[name]?.gain, this.crowdProximity * 0.25, 0.5);
  }

  impact(speed: number, side: number, banner = false) {
    if (!this.ctx || !this.master) return;
    const ctx = this.ctx;
    const now = ctx.currentTime;
    // Prevent duplicated snaps from closely spaced collision frames.
    if (now - this.lastImpactSeconds < 0.055) return;
    this.lastImpactSeconds = now;
    const mix = poleImpactMix(speed, banner);
    const pan = ctx.createStereoPanner();
    pan.pan.value = Math.max(-0.8, Math.min(0.8, side * 0.65));
    pan.connect(this.master);
    let playing = 0;
    const cleanup = () => { if (--playing <= 0) pan.disconnect(); };
    const noiseBurst = (
      gainAmount: number, frequency: number, duration: number,
      delay: number,
    ) => {
      if (!this.impactNoise || gainAmount <= 0) return;
      const source = ctx.createBufferSource();
      const filter = ctx.createBiquadFilter();
      const amp = ctx.createGain();
      source.buffer = this.impactNoise;
      filter.type = "bandpass";
      filter.frequency.value = frequency;
      filter.Q.value = 0.9;
      const begin = now + delay;
      amp.gain.setValueAtTime(0.0001, begin);
      amp.gain.exponentialRampToValueAtTime(
        Math.max(0.00011, gainAmount), begin + 0.006,
      );
      amp.gain.exponentialRampToValueAtTime(0.0001, begin + duration);
      source.connect(filter).connect(amp).connect(pan);
      playing++;
      source.start(begin, Math.random() * 0.12);
      source.stop(begin + duration + 0.005);
      source.onended = () => {
        source.disconnect();
        filter.disconnect();
        amp.disconnect();
        cleanup();
      };
    };
    // High-frequency crack, optional fabric snap, and a short spring resonance.
    noiseBurst(mix.crack, 1400 + Math.min(1500, speed * 26), 0.105, 0);
    noiseBurst(mix.cloth, 670, 0.23, 0.015);
    const resonance = ctx.createOscillator();
    const envelope = ctx.createGain();
    resonance.type = "triangle";
    resonance.frequency.setValueAtTime(380 + Math.min(240, speed * 6), now);
    resonance.frequency.exponentialRampToValueAtTime(135, now + 0.12);
    envelope.gain.setValueAtTime(Math.max(0.0001, mix.body), now);
    envelope.gain.exponentialRampToValueAtTime(0.0001, now + 0.16);
    resonance.connect(envelope).connect(pan);
    playing++;
    resonance.start(now);
    resonance.stop(now + 0.17);
    resonance.onended = () => {
      resonance.disconnect();
      envelope.disconnect();
      cleanup();
    };
    // Keep the original ElevenLabs impact, layered under the new sound.
    const recording = this.buffers.pole;
    if (recording) {
      const source = ctx.createBufferSource(), gain = ctx.createGain();
      source.buffer = recording;
      source.playbackRate.value = mix.playbackRate * (0.97 + Math.random() * 0.06);
      gain.gain.value = Math.min(0.42, 0.13 + speed * 0.008);
      source.connect(gain).connect(pan);
      playing++;
      source.start();
      source.onended = () => {
        source.disconnect();
        gain.disconnect();
        cleanup();
      };
    }
  }

  tone(freq: number, duration = 0.12) {
    if (!this.ctx || !this.master) return;
    const osc = this.ctx.createOscillator(),
      gain = this.ctx.createGain();
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.09, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
    osc.connect(gain).connect(this.master);
    osc.start();
    osc.stop(this.ctx.currentTime + duration);
    osc.onended = () => { osc.disconnect(); gain.disconnect(); };
  }

  setEnabled(value: boolean) {
    this.enabled = value;
    if (this.master && this.ctx)
      this.master.gain.setTargetAtTime(value ? 0.65 : 0, this.ctx.currentTime, 0.05);
  }
}
