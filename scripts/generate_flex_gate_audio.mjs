/**
 * Self-contained procedural replicas of Alpine Ski Pro's original flex-gate
 * sound design. No external downloads, native Python or audio licences.
 * The user's source ZIP also contains the full original WAVs; this generator
 * makes deployable equivalents from the same synthesis envelope.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const SR = 32000;
const out = resolve(dirname(fileURLToPath(import.meta.url)), "../public/audio");
mkdirSync(out, { recursive: true });
let seed = 20261117;
function rand() {
  seed ^= seed << 13;
  seed ^= seed >>> 17;
  seed ^= seed << 5;
  return ((seed >>> 0) / 4294967295) * 2 - 1;
}

function texture(duration, low, high) {
  const n = Math.floor(duration * SR);
  const raw = new Float64Array(n);
  let slow = 0, quick = 0;
  const lowCoef = 1 - Math.exp(-2 * Math.PI * low / SR);
  const highCoef = 1 - Math.exp(-2 * Math.PI * (high ?? SR * .45) / SR);
  for (let i = 0; i < n; i++) {
    const noise = rand();
    slow += lowCoef * (noise - slow);
    const hp = noise - slow;
    quick += highCoef * (hp - quick);
    raw[i] = high ? quick : hp;
  }
  let rms = 0;
  for (let i = 0; i < n; i++) rms += raw[i] * raw[i];
  const norm = Math.sqrt(rms / n) + 1e-7;
  for (let i = 0; i < n; i++) raw[i] /= norm;
  return raw;
}

function strike(hard) {
  const duration = hard ? .49 : .42;
  const n = Math.floor(duration * SR);
  const click = texture(duration, 1400, 11000);
  const brush = texture(duration, 420, 3700);
  const cloth = texture(duration, 240, 1700);
  const spring = texture(duration, 700, 6300);
  const result = new Float64Array(n);
  const amount = hard ? 1 : .66;
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const body = Math.sin(2 * Math.PI * (210 - 42 * t) * t) * Math.exp(-t * 42) +
      .6 * Math.sin(2 * Math.PI * (470 - 100 * t) * t) * Math.exp(-t * 54) +
      .22 * Math.sin(2 * Math.PI * (850 - 160 * t) * t) * Math.exp(-t * 65);
    const crack = click[i] * Math.exp(-t * 185) * (1 - Math.exp(-t * 9500));
    const brushStroke = brush[i] * Math.exp(-Math.max(0, t - .019) * 39) *
      (1 - Math.exp(-t * 140));
    const flap = cloth[i] * Math.exp(-Math.max(0, t - .044) * 22) *
      (1 - Math.exp(-t * 65));
    const whistle = Math.sin(2 * Math.PI * (1850 * t - 1150 * t * t)) *
      Math.exp(-Math.pow((t - .055) / .039, 2));
    const recoil = t > .14 ? spring[i] * Math.exp(-(t - .14) * 90) : 0;
    const mix = amount * (.54 * body + (hard ? .36 : .2) * crack +
      .17 * brushStroke + .07 * flap + .035 * whistle + .08 * recoil) +
      amount * .11 * Math.sin(2 * Math.PI * 114 * t) * Math.exp(-t * 23);
    const fade = Math.min(1, i / 80) * Math.max(0, Math.min(1, (duration - t) / .024));
    result[i] = Math.tanh(mix * .62) * fade;
  }
  return result;
}

function returnClick() {
  const duration = .28, n = Math.floor(duration * SR);
  const fibreglass = texture(duration, 800, 6500);
  const tail = texture(duration, 400, 3700);
  const samples = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const body = .55 * Math.sin(2 * Math.PI * (260 * t + 50 * t * t)) * Math.exp(-t * 44);
    const strand = fibreglass[i] * Math.exp(-t * 70);
    const after = t > .052 ? tail[i] * Math.exp(-(t - .052) * 80) : 0;
    const fade = Math.min(1, i / 60) * Math.max(0, Math.min(1, (duration - t) / .018));
    samples[i] = Math.tanh((.38 * body + .24 * strand + .12 * after) * .6) * fade;
  }
  return samples;
}

function writeWav(name, samples) {
  const bytes = Buffer.alloc(44 + samples.length * 2);
  bytes.write("RIFF", 0);
  bytes.writeUInt32LE(bytes.length - 8, 4);
  bytes.write("WAVEfmt ", 8);
  bytes.writeUInt32LE(16, 16);
  bytes.writeUInt16LE(1, 20);
  bytes.writeUInt16LE(1, 22);
  bytes.writeUInt32LE(SR, 24);
  bytes.writeUInt32LE(SR * 2, 28);
  bytes.writeUInt16LE(2, 32);
  bytes.writeUInt16LE(16, 34);
  bytes.write("data", 36);
  bytes.writeUInt32LE(samples.length * 2, 40);
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    bytes.writeInt16LE(Math.round(s * 32760), 44 + i * 2);
  }
  writeFileSync(resolve(out, name), bytes);
  console.log("generated", name, bytes.length);
}

writeWav("pole-hard.wav", strike(true));
writeWav("pole-soft.wav", strike(false));
writeWav("pole-return.wav", returnClick());
