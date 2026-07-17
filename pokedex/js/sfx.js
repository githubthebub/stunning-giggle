/*
 * sfx.js — tiny WebAudio synth for catch sounds. No assets, a few cents of
 * square waves. The context is created lazily on the first user gesture so
 * autoplay policies never block it.
 */

let ctx = null;

function ac() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  return ctx;
}

function tone(freqFrom, freqTo, dur, type = 'square', vol = 0.08, when = 0) {
  const a = ac();
  if (!a) return;
  const t0 = a.currentTime + when;
  const osc = a.createOscillator();
  const gain = a.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freqFrom, t0);
  osc.frequency.exponentialRampToValueAtTime(Math.max(30, freqTo), t0 + dur);
  gain.gain.setValueAtTime(vol, t0);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(gain).connect(a.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

function melody(freqs, noteDur = 0.12, type = 'square', vol = 0.07) {
  freqs.forEach((f, i) => tone(f, f, noteDur, type, vol, i * noteDur));
}

export const sfx = {
  /** Call from any user gesture to pre-create the context so later
   *  non-gesture sounds (e.g. after an async scan) aren't muted. */
  unlock() { ac(); },
  throw() { tone(240, 880, 0.22, 'sine', 0.07); },
  bounce() { tone(140, 90, 0.1, 'triangle', 0.09); },
  shake() { tone(180, 140, 0.08, 'square', 0.05); },
  breakout() { tone(320, 60, 0.35, 'sawtooth', 0.09); },
  gotcha() { melody([523.25, 659.25, 783.99, 1046.5], 0.11); },
  newEntry() { melody([783.99, 987.77, 1174.66, 1567.98], 0.1); },
  shiny() { melody([1318.5, 1567.98, 2093.0, 2637.02], 0.09, 'sine', 0.06); },
};
