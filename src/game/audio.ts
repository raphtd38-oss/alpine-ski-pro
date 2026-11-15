/** ElevenLabs assets are local; continuous ski/wind textures are synthesized.
 * No network service or API key is required at runtime. See docs/ASSETS.md.
 */
export class SkiAudio {
  ctx: AudioContext | null = null;
  gain: GainNode | null = null;
  filter: BiquadFilterNode | null = null;
  enabled = true;
  master: GainNode | null = null;
  buffers: Partial<Record<"pole" | "menu" | "crowd", AudioBuffer>> = {};
  menuSource: AudioBufferSourceNode | null = null;
  menuGain: GainNode | null = null;
  crowdSource: AudioBufferSourceNode | null = null;
  crowdGain: GainNode | null = null;
  loaded = false;
  menuActive = true;
  async start() {
    if (!this.ctx) {
      this.ctx = new AudioContext();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.enabled ? 0.65 : 0;
      this.master.connect(this.ctx.destination);
      const buffer = this.ctx.createBuffer(
        1,
        this.ctx.sampleRate * 2,
        this.ctx.sampleRate,
      );
      const data = buffer.getChannelData(0);
      let last = 0;
      for (let i = 0; i < data.length; i++) {
        last = (last + Math.random() * 0.04 - 0.02) / 1.02;
        data[i] = last * 5;
      }
      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;
      noise.loop = true;
      this.filter = this.ctx.createBiquadFilter();
      this.filter.type = "lowpass";
      this.gain = this.ctx.createGain();
      this.gain.gain.value = 0;
      noise.connect(this.filter).connect(this.gain).connect(this.master);
      noise.start();
      void this.loadAssets();
    }
    await this.ctx.resume();
  }
  private async loadAssets() {
    await Promise.all(
      (["pole", "menu", "crowd"] as const).map(async (name) => {
        try {
          const response = await fetch(
            import.meta.env.BASE_URL + `audio/${name}.mp3`,
          );
          if (response.ok)
            this.buffers[name] = await this.ctx!.decodeAudioData(
              await response.arrayBuffer(),
            );
        } catch {
          /* Synthesized impact remains available if an audio download fails. */
        }
      }),
    );
    this.loaded = true;
    this.startLoops();
  }
  private startLoops() {
    if (!this.ctx || !this.master) return;
    for (const name of ["menu", "crowd"] as const) {
      const b = this.buffers[name];
      if (!b) continue;
      const source = this.ctx.createBufferSource(),
        gain = this.ctx.createGain();
      source.buffer = b;
      source.loop = true;
      gain.gain.value = name === "menu" && this.menuActive ? 0.24 : 0;
      source.connect(gain).connect(this.master);
      source.start();
      if (name === "menu") {
        this.menuSource = source;
        this.menuGain = gain;
      } else {
        this.crowdSource = source;
        this.crowdGain = gain;
      }
    }
  }
  menu(active: boolean) {
    this.menuActive = active;
    if (this.ctx && this.menuGain)
      this.menuGain.gain.setTargetAtTime(
        active ? 0.24 : 0,
        this.ctx.currentTime,
        0.35,
      );
  }
  crowd(proximity: number) {
    if (this.ctx && this.crowdGain)
      this.crowdGain.gain.setTargetAtTime(
        Math.max(0, Math.min(1, proximity)) * 0.23,
        this.ctx.currentTime,
        0.3,
      );
  }
  impact(speed: number, side: number) {
    if (!this.ctx || !this.master) return;
    const buffer = this.buffers.pole;
    if (!buffer) {
      this.tone(140, 0.055);
      return;
    }
    const source = this.ctx.createBufferSource(),
      gain = this.ctx.createGain(),
      pan = this.ctx.createStereoPanner();
    source.buffer = buffer;
    source.playbackRate.value = 0.93 + Math.random() * 0.14;
    gain.gain.value = Math.min(0.8, 0.2 + speed * 0.018);
    pan.pan.value = Math.max(-0.8, Math.min(0.8, side * 0.6));
    source.connect(gain).connect(pan).connect(this.master);
    source.start();
    source.onended = () => {
      source.disconnect();
      gain.disconnect();
      pan.disconnect();
    };
  }
  update(speed: number, edge: number, slip: number, active: boolean) {
    if (!this.ctx || !this.gain || !this.filter) return;
    this.gain.gain.setTargetAtTime(
      active
        ? Math.min(0.7, speed / 65 + Math.abs(edge) * 0.12 + slip * 0.02)
        : 0,
      this.ctx.currentTime,
      0.12,
    );
    this.filter.frequency.setTargetAtTime(
      230 + speed * 30 + slip * 90,
      this.ctx.currentTime,
      0.1,
    );
  }
  tone(freq: number, duration = 0.12) {
    if (!this.ctx || !this.master) return;
    const osc = this.ctx.createOscillator(),
      gain = this.ctx.createGain();
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.09, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(
      0.001,
      this.ctx.currentTime + duration,
    );
    osc.connect(gain).connect(this.master);
    osc.start();
    osc.stop(this.ctx.currentTime + duration);
  }
  setEnabled(value: boolean) {
    this.enabled = value;
    if (this.master && this.ctx)
      this.master.gain.setTargetAtTime(
        value ? 0.65 : 0,
        this.ctx.currentTime,
        0.05,
      );
  }
}
