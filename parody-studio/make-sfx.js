#!/usr/bin/env node
'use strict';
/*
 * make-sfx.js — synthesizes a small library of ORIGINAL comedy sound effects
 * as 44.1 kHz / 16-bit / mono WAV files into ./sfx/.
 *
 * Everything here is generated from plain oscillators and noise — these are
 * original sounds "in the spirit of" classic meme SFX, not recordings or
 * recreations of any trademarked audio brand.
 *
 * Zero dependencies. Usage:  node make-sfx.js
 */

const fs = require('fs');
const path = require('path');

const SR = 44100;                              // sample rate
const OUT_DIR = path.join(__dirname, 'sfx');
const TWO_PI = Math.PI * 2;

/* ------------------------------------------------------------------ */
/* Small DSP toolbox                                                   */
/* ------------------------------------------------------------------ */

// Allocate a buffer of `dur` seconds.
function seconds(dur) {
  return new Float64Array(Math.round(dur * SR));
}

// White noise sample in [-1, 1].
function noise() {
  return Math.random() * 2 - 1;
}

// Naive sawtooth from a phase in radians (fine for lo-fi comedy SFX).
function saw(phase) {
  const t = (phase / TWO_PI) % 1;
  return 2 * (t < 0 ? t + 1 : t) - 1;
}

// One-pole lowpass; returns a stateful per-sample function.
function lowpass(cutoffHz) {
  const a = 1 - Math.exp((-TWO_PI * cutoffHz) / SR);
  let y = 0;
  return (x) => (y += a * (x - y));
}

// RBJ biquad bandpass with per-sample retunable center frequency.
// Recomputing coefficients every sample is wasteful but trivially fast
// at these durations, and it makes swept filters simple to write.
function bandpass(q) {
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  return (x, fc) => {
    const w0 = (TWO_PI * fc) / SR;
    const alpha = Math.sin(w0) / (2 * q);
    const b0 = alpha;
    const b2 = -alpha;
    const a0 = 1 + alpha;
    const a1 = -2 * Math.cos(w0);
    const a2 = 1 - alpha;
    const y = (b0 * x + b2 * x2 - a1 * y1 - a2 * y2) / a0;
    x2 = x1; x1 = x;
    y2 = y1; y1 = y;
    return y;
  };
}

// Fade edges to zero to avoid clicks (attack/release in seconds).
function fadeEdges(buf, attack = 0.003, release = 0.02) {
  const na = Math.min(buf.length, Math.round(attack * SR));
  const nr = Math.min(buf.length, Math.round(release * SR));
  for (let i = 0; i < na; i++) buf[i] *= i / na;
  for (let i = 0; i < nr; i++) buf[buf.length - 1 - i] *= i / nr;
}

// Peak-normalize to `peak` (leaves headroom below 0 dBFS).
function normalize(buf, peak = 0.85) {
  let max = 1e-9;
  for (let i = 0; i < buf.length; i++) max = Math.max(max, Math.abs(buf[i]));
  const g = peak / max;
  for (let i = 0; i < buf.length; i++) buf[i] *= g;
}

// Write mono 16-bit PCM WAV.
function writeWav(filePath, buf) {
  const n = buf.length;
  const out = Buffer.alloc(44 + n * 2);
  out.write('RIFF', 0);
  out.writeUInt32LE(36 + n * 2, 4);
  out.write('WAVE', 8);
  out.write('fmt ', 12);
  out.writeUInt32LE(16, 16);          // fmt chunk size
  out.writeUInt16LE(1, 20);           // PCM
  out.writeUInt16LE(1, 22);           // mono
  out.writeUInt32LE(SR, 24);
  out.writeUInt32LE(SR * 2, 28);      // byte rate
  out.writeUInt16LE(2, 32);           // block align
  out.writeUInt16LE(16, 34);          // bits per sample
  out.write('data', 36);
  out.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i++) {
    const v = Math.max(-1, Math.min(1, buf[i]));
    out.writeInt16LE(Math.round(v * 32767), 44 + i * 2);
  }
  fs.writeFileSync(filePath, out);
}

/* ------------------------------------------------------------------ */
/* The sounds                                                          */
/* ------------------------------------------------------------------ */

// boing — springy pitch-bent sine: pitch drops fast while a wobble
// (vibrato) rings out and slows down, like a cartoon spring.
function boing() {
  const buf = seconds(0.85);
  let phase = 0;
  for (let i = 0; i < buf.length; i++) {
    const t = i / SR;
    const base = 110 + 340 * Math.exp(-5 * t);               // fast drop
    const wobble = 70 * Math.exp(-2.5 * t) * Math.sin(TWO_PI * 16 * t);
    phase += (TWO_PI * (base + wobble)) / SR;
    const amp = Math.exp(-3.2 * t);
    buf[i] = amp * (Math.sin(phase) + 0.35 * Math.sin(2 * phase));
  }
  return buf;
}

// deep-impact — a very low sine thump with a slow decay. Sub-bass drop
// with a touch of saturation so it reads on small speakers.
function deepImpact() {
  const buf = seconds(2.2);
  let phase = 0;
  for (let i = 0; i < buf.length; i++) {
    const t = i / SR;
    const f = 36 + 52 * Math.exp(-9 * t);                    // 88 Hz -> 36 Hz
    phase += (TWO_PI * f) / SR;
    const amp = Math.min(1, t / 0.004) * Math.exp(-1.7 * t); // click-free attack
    const body = Math.sin(phase) + 0.4 * Math.sin(2 * phase) * Math.exp(-6 * t);
    buf[i] = Math.tanh(1.8 * amp * body);                    // soft saturation
  }
  return buf;
}

// record-scratch-ish — noise pushed through a resonant bandpass whose
// center frequency whips back and forth: a few quick "strokes".
function recordScratch() {
  const buf = seconds(0.55);
  const bp = bandpass(5);
  for (let i = 0; i < buf.length; i++) {
    const t = i / SR;
    const stroke = Math.sin(TWO_PI * 2.4 * t);               // back-and-forth
    const fc = 700 + 2300 * Math.abs(stroke);
    const gate = 0.25 + 0.75 * Math.abs(stroke);             // dips between strokes
    buf[i] = gate * bp(noise(), fc) * Math.exp(-1.2 * t);
  }
  return buf;
}

// whoosh — band-swept noise, rising then falling, with a smooth
// loudness bump in the middle.
function whoosh() {
  const buf = seconds(0.9);
  const bp = bandpass(1.6);
  for (let i = 0; i < buf.length; i++) {
    const t = i / SR;
    const p = t / 0.9;                                       // 0..1 progress
    const fc = 250 + 2800 * Math.pow(Math.sin(Math.PI * p), 1.5);
    const amp = Math.pow(Math.sin(Math.PI * p), 1.2);
    buf[i] = amp * bp(noise(), fc);
  }
  return buf;
}

// sad-trombone-ish — four descending sawtooth notes, each sliding down
// into the next; the last one droops and wobbles. Wah wah wah waaah.
function sadTrombone() {
  // note: [target frequency Hz, length s]
  const notes = [[233.08, 0.42], [220.0, 0.42], [207.65, 0.42], [196.0, 1.1]];
  const total = notes.reduce((s, n) => s + n[1], 0);
  const buf = seconds(total + 0.15);
  const lp = lowpass(2200);                                  // soften the saw buzz
  let phase = 0;
  let i = 0;
  let prevFreq = notes[0][0] * 1.06;                         // small scoop into note 1
  for (let n = 0; n < notes.length; n++) {
    const [freq, len] = notes[n];
    const isLast = n === notes.length - 1;
    const nSamp = Math.round(len * SR);
    for (let k = 0; k < nSamp && i < buf.length; k++, i++) {
      const t = k / SR;
      // slide from the previous pitch during the first 70 ms of each note
      const slide = Math.min(1, t / 0.07);
      let f = prevFreq + (freq - prevFreq) * slide;
      if (isLast) {
        f *= 1 - 0.10 * Math.min(1, Math.max(0, (t - 0.35) / 0.7));  // sad droop
        f *= 1 + 0.02 * Math.sin(TWO_PI * 5.5 * t);                  // slow vibrato
      }
      phase += (TWO_PI * f) / SR;
      // per-note envelope: quick swell, held, released at the end
      const env = Math.min(1, t / 0.04) * Math.min(1, Math.max(0, (len - t) / 0.08));
      buf[i] = env * lp(saw(phase)) * (isLast ? Math.exp(-0.9 * Math.max(0, t - 0.3)) : 1);
    }
    prevFreq = freq;
  }
  return buf;
}

// ding — a bright FM bell: one carrier, one modulator at a non-integer
// ratio (gives the metallic shimmer), both decaying.
function ding() {
  const buf = seconds(1.4);
  const fc = 1567.98;                                        // G6
  const fm = fc * 1.41;                                      // inharmonic ratio
  for (let i = 0; i < buf.length; i++) {
    const t = i / SR;
    const index = 3.0 * Math.exp(-6 * t);                    // FM depth fades fast
    const mod = index * Math.sin(TWO_PI * fm * t);
    const amp = Math.min(1, t / 0.002) * Math.exp(-3.0 * t);
    buf[i] = amp * (Math.sin(TWO_PI * fc * t + mod) + 0.25 * Math.sin(TWO_PI * fc * 2.01 * t) * Math.exp(-8 * t));
  }
  return buf;
}

// dramatic-sting — a minor chord stabbed with fast tremolo. DUN DUN DUN.
function dramaticSting() {
  const buf = seconds(1.7);
  const freqs = [110.0, 220.0, 261.63, 329.63];              // A minor stack
  const detune = [0, 1.5, -1.2, 0.8];                        // Hz, slight thickness
  const phases = new Float64Array(freqs.length);
  const lp = lowpass(3000);
  for (let i = 0; i < buf.length; i++) {
    const t = i / SR;
    let s = 0;
    for (let v = 0; v < freqs.length; v++) {
      phases[v] += (TWO_PI * (freqs[v] + detune[v])) / SR;
      s += saw(phases[v]) / freqs.length;
    }
    const tremolo = 0.55 + 0.45 * Math.sin(TWO_PI * 9 * t);  // fast pulse
    const env = Math.min(1, t / 0.01) * (t < 0.9 ? 1 : Math.exp(-3.5 * (t - 0.9)));
    buf[i] = env * tremolo * lp(s);
  }
  return buf;
}

// airhorn-ish — a cluster of detuned saws that rips upward in pitch and
// then leans on the note. Original synth blast, not a sampled horn.
function airhorn() {
  const buf = seconds(1.25);
  const cents = [-12, -5, 4, 11];                            // detune per voice
  const phases = new Float64Array(cents.length);
  const lp = lowpass(3800);
  for (let i = 0; i < buf.length; i++) {
    const t = i / SR;
    // pitch rise: 370 Hz -> ~465 Hz in the first 180 ms, then a slow lean up
    const base = 370 + 95 * Math.min(1, t / 0.18) + 6 * t;
    let s = 0;
    for (let v = 0; v < cents.length; v++) {
      const f = base * Math.pow(2, cents[v] / 1200);
      phases[v] += (TWO_PI * f) / SR;
      s += saw(phases[v]) / cents.length;
    }
    const tremolo = 1 - 0.06 * Math.sin(TWO_PI * 13 * t);    // slight blare wobble
    const env = Math.min(1, t / 0.012) * (t < 1.0 ? 1 : Math.exp(-9 * (t - 1.0)));
    buf[i] = env * tremolo * Math.tanh(1.4 * lp(s));
  }
  return buf;
}

/* ------------------------------------------------------------------ */
/* Render them all                                                     */
/* ------------------------------------------------------------------ */

const SOUNDS = [
  ['boing', boing],
  ['deep-impact', deepImpact],
  ['record-scratch-ish', recordScratch],
  ['whoosh', whoosh],
  ['sad-trombone-ish', sadTrombone],
  ['ding', ding],
  ['dramatic-sting', dramaticSting],
  ['airhorn-ish', airhorn],
];

fs.mkdirSync(OUT_DIR, { recursive: true });
for (const [name, gen] of SOUNDS) {
  const buf = gen();
  fadeEdges(buf);
  normalize(buf);
  const file = path.join(OUT_DIR, `${name}.wav`);
  writeWav(file, buf);
  console.log(`wrote ${file}  (${(buf.length / SR).toFixed(2)}s)`);
}
console.log(`\n${SOUNDS.length} sounds ready in ${OUT_DIR}`);
