#!/usr/bin/env node
/*
 * make-music.js — original upbeat chiptune music bed, synthesized from scratch.
 *
 * Zero dependencies (Node 22). Writes 16-bit stereo 44100 Hz WAV to music.wav.
 *
 * "Cartridge Horizon" — an original composition (E minor, i-VI-III-VII):
 *   ~124 BPM, 52 bars (~100.6 s) + delay tail.
 *   Structure: 4-bar intro (bass/drums/arp build) -> A (16-bar lead melody)
 *              -> B (16-bar variation, rotated progression) -> A' (melody +
 *              octave doubling + arp backing).
 *   Voices: 25%-duty square lead (vibrato + ping-pong dotted-eighth echo),
 *           triangle bass in 8ths, sine-thump kick, noise snare, noise hats,
 *           50%-duty square arpeggio.
 *   Master: RMS normalize to ~-15 dBFS, tanh soft-clip, edge fades.
 */
'use strict';

const fs = require('fs');
const path = require('path');

// ---------------------------------------------------------------- constants
const SR = 44100;
const BPM = 124;
const BEAT = 60 / BPM;          // 0.4839 s
const BAR = 4 * BEAT;           // 1.9355 s
const BARS = 52;                // 4 intro + 16 A + 16 B + 16 A'
const TAIL = 1.8;               // let the echo ring out
const DUR = BARS * BAR + TAIL;  // ~102.5 s
const N = Math.round(DUR * SR);

const OUT = path.join(__dirname, 'music.wav');

// deterministic noise so renders are reproducible
let seed = 0x2f6e2b1;
function rnd() {
  seed = (seed * 1103515245 + 12345) & 0x7fffffff;
  return seed / 0x40000000 - 1; // ~[-1, 1)
}

const freqOf = (midi) => 440 * Math.pow(2, (midi - 69) / 12);

// per-voice buffers (mixed with pan gains at the end)
const bufLead = new Float64Array(N);
const bufArp = new Float64Array(N);
const bufBass = new Float64Array(N);
const bufKick = new Float64Array(N);
const bufSnare = new Float64Array(N);
const bufHat = new Float64Array(N);

// ---------------------------------------------------------------- voices
// DC-corrected pulse wave: mean is zero for any duty cycle.
function pulse(phase, duty) {
  return phase < duty ? 2 * (1 - duty) : -2 * duty;
}

function addLeadNote(buf, midi, startSec, durBeats, amp, duty = 0.25) {
  const i0 = Math.round(startSec * SR);
  const len = Math.round(durBeats * BEAT * 0.93 * SR); // slight gap between notes
  const base = freqOf(midi);
  let phase = 0;
  for (let i = 0; i < len && i0 + i < N; i++) {
    const t = i / SR;
    // delayed vibrato, ~5.6 Hz, +-20 cents
    let vib = 0;
    if (t > 0.1) vib = Math.sin(2 * Math.PI * 5.6 * (t - 0.1)) * 0.2 * Math.min(1, (t - 0.1) / 0.15);
    phase += (base * Math.pow(2, vib / 12)) / SR;
    if (phase >= 1) phase -= 1;
    const rel = len / SR - t;
    const env = Math.min(1, t / 0.004) *
      (0.72 + 0.28 * Math.exp(-t * 8)) *
      Math.min(1, rel / 0.025);
    buf[i0 + i] += pulse(phase, duty) * env * amp;
  }
}

function addBassNote(midi, startSec, durBeats, amp) {
  const i0 = Math.round(startSec * SR);
  const len = Math.round(durBeats * BEAT * 0.88 * SR);
  const f = freqOf(midi);
  let phase = 0;
  for (let i = 0; i < len && i0 + i < N; i++) {
    const t = i / SR;
    phase += f / SR;
    if (phase >= 1) phase -= 1;
    const tri = 1 - 4 * Math.abs((phase + 0.25) % 1 - 0.5); // triangle, zero-crossing start
    const rel = len / SR - t;
    const env = Math.min(1, t / 0.003) *
      (0.65 + 0.35 * Math.exp(-t * 6)) *
      Math.min(1, rel / 0.02);
    bufBass[i0 + i] += tri * env * amp;
  }
}

function addKick(startSec, amp = 0.95) {
  const i0 = Math.round(startSec * SR);
  const len = Math.round(0.13 * SR);
  let phase = 0;
  for (let i = 0; i < len && i0 + i < N; i++) {
    const t = i / SR;
    const f = 150 * Math.exp(-t * 32) + 46;      // pitch drop 150 -> 46 Hz
    phase += f / SR;
    const env = Math.min(1, t / 0.002) * Math.exp(-t * 26);
    bufKick[i0 + i] += Math.sin(2 * Math.PI * phase) * env * amp;
  }
}

function addSnare(startSec, amp = 0.5) {
  const i0 = Math.round(startSec * SR);
  const len = Math.round(0.16 * SR);
  let prev = 0, tone = 0;
  for (let i = 0; i < len && i0 + i < N; i++) {
    const t = i / SR;
    const r = rnd();
    const hp = r - 0.55 * prev; // tilt noise upward
    prev = r;
    tone += 192 / SR;
    const body = Math.sin(2 * Math.PI * tone) * Math.exp(-t * 34) * 0.55;
    const env = Math.min(1, t / 0.001) * Math.exp(-t * 19);
    bufSnare[i0 + i] += (hp * env + body * env) * amp;
  }
}

function addHat(startSec, accent) {
  const i0 = Math.round(startSec * SR);
  const len = Math.round((accent ? 0.085 : 0.038) * SR);
  const amp = accent ? 0.3 : 0.19;
  let prev = 0;
  for (let i = 0; i < len && i0 + i < N; i++) {
    const t = i / SR;
    const r = rnd();
    const hp = (r - prev) * 0.8; // differenced noise = bright hiss
    prev = r;
    const env = Math.min(1, t / 0.0008) * Math.exp(-t * (accent ? 55 : 110));
    bufHat[i0 + i] += hp * env * amp;
  }
}

// ---------------------------------------------------------------- harmony
// E minor, progression i - VI - III - VII  (Em - C - G - D)
const CH = {
  Em: { root: 40, arp: [64, 67, 71, 76] },  // E2 | E4 G4 B4 E5
  C:  { root: 36, arp: [60, 64, 67, 72] },  // C2 | C4 E4 G4 C5
  G:  { root: 43, arp: [62, 67, 71, 74] },  // G2 | D4 G4 B4 D5
  D:  { root: 38, arp: [62, 66, 69, 74] },  // D2 | D4 F#4 A4 D5
};
const PROG_A = ['Em', 'C', 'G', 'D'];   // intro, A, A'
const PROG_B = ['G', 'D', 'Em', 'C'];   // B section rotation for lift

function chordAtBar(bar) {
  const inB = bar >= 20 && bar < 36;
  const prog = inB ? PROG_B : PROG_A;
  return CH[prog[bar % 4]];
}

// ------------------------------------------------------------- composition
// Original melodies, E minor pentatonic (E G A B D) with F#/C color tones.
// Format: [midi, startBeat (section-relative), durBeats]
const MELODY_A = [
  // phrase 1 (question)
  [64, 0, 0.5], [67, 0.5, 0.5], [69, 1, 0.5], [71, 1.5, 0.5], [74, 2, 1], [71, 3, 1],
  [76, 4, 0.75], [74, 4.75, 0.75], [71, 5.5, 0.5], [69, 6, 1], [67, 7, 1],
  [71, 8, 0.5], [74, 8.5, 0.5], [76, 9, 1], [74, 10, 0.5], [71, 10.5, 0.5], [69, 11, 1],
  [69, 12, 1], [71, 13, 0.5], [69, 13.5, 0.5], [66, 14, 1], [64, 15, 1],
  // phrase 2 (answer, reaching up)
  [64, 16, 0.5], [67, 16.5, 0.5], [69, 17, 0.5], [71, 17.5, 0.5], [74, 18, 1], [76, 19, 1],
  [79, 20, 0.75], [76, 20.75, 0.75], [74, 21.5, 0.5], [76, 22, 1], [74, 23, 1],
  [71, 24, 0.5], [74, 24.5, 0.5], [76, 25, 0.5], [79, 25.5, 0.5], [81, 26, 1.5], [79, 27.5, 0.5],
  [78, 28, 1], [76, 29, 0.5], [74, 29.5, 0.5], [71, 30, 1.5],
  // phrase 3 (high contrast)
  [71, 32, 0.5], [76, 32.5, 0.5], [79, 33, 1], [76, 34, 0.5], [74, 34.5, 0.5], [71, 35, 1],
  [69, 36, 0.5], [71, 36.5, 0.5], [74, 37, 1], [76, 38, 1], [67, 39, 1],
  [67, 40, 0.5], [69, 40.5, 0.5], [71, 41, 1], [74, 42, 1], [71, 43, 0.5], [69, 43.5, 0.5],
  [69, 44, 1.5], [66, 45.5, 0.5], [69, 46, 1], [71, 47, 1],
  // phrase 4 (cadence)
  [76, 48, 0.5], [74, 48.5, 0.5], [71, 49, 0.5], [69, 49.5, 0.5], [67, 50, 1], [69, 51, 1],
  [71, 52, 0.75], [69, 52.75, 0.75], [67, 53.5, 0.5], [64, 54, 1], [67, 55, 1],
  [69, 56, 0.5], [71, 56.5, 0.5], [74, 57, 1], [71, 58, 0.5], [69, 58.5, 0.5], [67, 59, 1],
  [66, 60, 0.5], [69, 60.5, 0.5], [71, 61, 1], [76, 62, 2],
];

const MELODY_B = [
  // syncopated variation over G - D - Em - C
  [67, 0, 0.5], [71, 0.5, 0.5], [74, 1, 0.75], [76, 1.75, 0.75], [74, 2.5, 0.5], [71, 3, 1],
  [69, 4, 0.75], [74, 4.75, 0.75], [78, 5.5, 1], [76, 6.5, 0.5], [74, 7, 1],
  [76, 8, 0.5], [79, 8.5, 0.5], [76, 9, 0.5], [71, 9.5, 0.5], [74, 10, 1], [76, 11, 1],
  [79, 12, 1], [76, 13, 0.5], [74, 13.5, 0.5], [76, 14, 2],
  [74, 16, 0.5], [71, 16.5, 0.5], [67, 17, 0.75], [69, 17.75, 0.75], [71, 18.5, 0.5], [74, 19, 1],
  [78, 20, 0.75], [74, 20.75, 0.75], [69, 21.5, 0.5], [74, 22, 1], [78, 23, 1],
  [79, 24, 0.5], [81, 24.5, 0.5], [79, 25, 0.75], [76, 25.75, 0.75], [74, 26.5, 0.5], [76, 27, 1],
  [74, 28, 1], [72, 29, 0.5], [71, 29.5, 0.5], [67, 30, 1.5],
  [67, 32, 0.5], [71, 32.5, 0.5], [74, 33, 0.75], [76, 33.75, 0.75], [74, 34.5, 0.5], [71, 35, 1],
  [69, 36, 0.75], [74, 36.75, 0.75], [78, 37.5, 1], [81, 38.5, 0.5], [78, 39, 1],
  [76, 40, 0.5], [79, 40.5, 0.5], [81, 41, 0.75], [79, 41.75, 0.75], [76, 42.5, 0.5], [74, 43, 1],
  [76, 44, 1], [74, 45, 0.5], [72, 45.5, 0.5], [74, 46, 2],
  [74, 48, 0.5], [76, 48.5, 0.5], [79, 49, 1], [76, 50, 0.5], [74, 50.5, 0.5], [71, 51, 1],
  [69, 52, 0.5], [71, 52.5, 0.5], [74, 53, 0.75], [78, 53.75, 0.75], [76, 54.5, 0.5], [74, 55, 1],
  [76, 56, 0.5], [74, 56.5, 0.5], [71, 57, 0.5], [69, 57.5, 0.5], [67, 58, 1], [64, 59, 1],
  [67, 60, 0.5], [69, 60.5, 0.5], [71, 61, 1], [74, 62, 2],
];

const INTRO_END = 4, A_END = 20, B_END = 36; // bar indices

function renderMelody(notes, sectionStartBar, amp, octave = 0) {
  const t0 = sectionStartBar * BAR;
  for (const [m, s, d] of notes) {
    addLeadNote(bufLead, m + octave, t0 + s * BEAT, d, amp);
  }
}

// --- bass: pumping 8th-note pattern following the chord roots
const BASS_STEPS = [0, 0, 12, 0, 7, 0, 12, 7]; // semitone offsets per 8th
for (let bar = 0; bar < BARS; bar++) {
  const ch = chordAtBar(bar);
  const barT = bar * BAR;
  if (bar === BARS - 1) {
    addBassNote(ch.root, barT, 4, 0.42); // final bar: let the root ring
    continue;
  }
  for (let e = 0; e < 8; e++) {
    addBassNote(ch.root + BASS_STEPS[e], barT + e * 0.5 * BEAT, 0.5, 0.4);
  }
}

// --- percussion
for (let bar = 0; bar < BARS; bar++) {
  const barT = bar * BAR;
  const grooving = bar >= INTRO_END;
  addKick(barT);
  addKick(barT + 2 * BEAT);
  if (grooving) {
    addSnare(barT + 1 * BEAT);
    addSnare(barT + 3 * BEAT);
    if (bar % 4 === 3 && bar < BARS - 1) addSnare(barT + 3.5 * BEAT, 0.35); // fill
    if (bar >= 20 && bar < 36 && bar % 2 === 1) addKick(barT + 3.5 * BEAT, 0.7); // B drive
  }
  if (bar >= 2) {
    for (let e = 0; e < 8; e++) addHat(barT + e * 0.5 * BEAT, e % 2 === 1);
  }
}

// --- arpeggio backing (intro low octave, A' mid octave)
function renderArp(fromBar, toBar, octShift, amp) {
  const pattern = [0, 1, 2, 3, 2, 1]; // rolling up-down, 16ths
  let step = 0;
  for (let bar = fromBar; bar < toBar; bar++) {
    const ch = chordAtBar(bar);
    for (let s = 0; s < 16; s++) {
      const midi = ch.arp[pattern[step % pattern.length]] + octShift;
      addLeadNote(bufArp, midi, bar * BAR + s * 0.25 * BEAT, 0.25, amp, 0.5);
      step++;
    }
  }
}
renderArp(0, INTRO_END, -12, 0.16);   // intro build
renderArp(B_END, BARS, 0, 0.1);       // A' sparkle layer

// --- lead melody
renderMelody(MELODY_A, INTRO_END, 0.3);
renderMelody(MELODY_B, A_END, 0.3);
renderMelody(MELODY_A, B_END, 0.28);       // A' reprise
renderMelody(MELODY_A, B_END, 0.09, 12);   // + quiet octave doubling

// ------------------------------------------------------- echo on the lead
// feedback delay, dotted eighth (~363 ms); R channel reads a shifted tap
const dSamp = Math.round(0.75 * BEAT * SR);
const wet = new Float64Array(N);
for (let i = dSamp; i < N; i++) wet[i] = bufLead[i - dSamp] * 0.45 + wet[i - dSamp] * 0.34;
const dHalf = Math.round(dSamp / 2);

// ---------------------------------------------------------------- mixdown
const L = new Float64Array(N);
const R = new Float64Array(N);
for (let i = 0; i < N; i++) {
  const common = bufBass[i] * 0.72 + bufKick[i] * 0.85 + bufSnare[i] * 0.6 + bufLead[i] * 0.62;
  L[i] = common + bufHat[i] * 0.42 + bufArp[i] * 0.58 + wet[i] * 0.3;
  R[i] = common + bufHat[i] * 0.62 + bufArp[i] * 0.38 +
    (i >= dHalf ? wet[i - dHalf] : 0) * 0.3;
}

// edge fades (click-free start, musical fade at the very end)
const fadeIn = Math.round(0.04 * SR);
for (let i = 0; i < fadeIn; i++) {
  const g = i / fadeIn;
  L[i] *= g; R[i] *= g;
}
const fadeOut = Math.round(1.4 * SR);
for (let i = 0; i < fadeOut; i++) {
  const g = i / fadeOut;
  L[N - 1 - i] *= g; R[N - 1 - i] *= g;
}

// normalize to ~-15 dBFS RMS, then tanh soft-clip (unity slope for small x,
// asymptote at 1.0 so nothing can hard-clip)
let sumSq = 0;
for (let i = 0; i < N; i++) sumSq += L[i] * L[i] + R[i] * R[i];
const rms = Math.sqrt(sumSq / (2 * N));
const gain = Math.pow(10, -15 / 20) / rms;
for (let i = 0; i < N; i++) {
  L[i] = Math.tanh(L[i] * gain);
  R[i] = Math.tanh(R[i] * gain);
}

// ---------------------------------------------------------------- WAV out
const dataBytes = N * 2 * 2; // stereo * 16-bit
const buf = Buffer.alloc(44 + dataBytes);
buf.write('RIFF', 0);
buf.writeUInt32LE(36 + dataBytes, 4);
buf.write('WAVE', 8);
buf.write('fmt ', 12);
buf.writeUInt32LE(16, 16);          // fmt chunk size
buf.writeUInt16LE(1, 20);           // PCM
buf.writeUInt16LE(2, 22);           // channels
buf.writeUInt32LE(SR, 24);          // sample rate
buf.writeUInt32LE(SR * 4, 28);      // byte rate
buf.writeUInt16LE(4, 32);           // block align
buf.writeUInt16LE(16, 34);          // bits per sample
buf.write('data', 36);
buf.writeUInt32LE(dataBytes, 40);
let off = 44;
for (let i = 0; i < N; i++) {
  buf.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(L[i] * 32767))), off); off += 2;
  buf.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(R[i] * 32767))), off); off += 2;
}
fs.writeFileSync(OUT, buf);

let peak = 0;
for (let i = 0; i < N; i++) peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i]));
console.log(`wrote ${OUT}`);
console.log(`duration ${DUR.toFixed(2)} s | ${BPM} BPM | ${BARS} bars | peak ${peak.toFixed(3)}`);
