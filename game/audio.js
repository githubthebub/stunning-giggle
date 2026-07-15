/* audio.js — WebAudio SFX + tiny procedural chiptune music loops.
 * No assets. Muted until first user gesture. */
(function () {
  'use strict';
  const G = (window.G = window.G || {});
  let ctx = null, enabled = true, musicGain = null, musicTimer = null, currentTrack = null;

  function ac() {
    if (!enabled) return null;
    if (!ctx) { const AC = window.AudioContext || window.webkitAudioContext; if (!AC) { enabled = false; return null; } try { ctx = new AC(); } catch (e) { enabled = false; return null; } }
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});
    return ctx;
  }
  function tone(freq, dur, type, gain, when, dest) {
    const c = ac(); if (!c) return;
    const t0 = c.currentTime + (when || 0);
    const o = c.createOscillator(), g = c.createGain();
    o.type = type || 'square'; o.frequency.setValueAtTime(freq, t0);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(gain || 0.08, t0 + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g).connect(dest || c.destination); o.start(t0); o.stop(t0 + dur + 0.02);
  }

  const SFX = {
    cursor: () => tone(680, 0.05, 'square', 0.04),
    select: () => { tone(720, 0.06, 'square', 0.06); tone(960, 0.08, 'square', 0.05, 0.05); },
    cancel: () => tone(360, 0.08, 'square', 0.05),
    bump: () => tone(150, 0.08, 'sawtooth', 0.05),
    step: () => tone(220, 0.03, 'sine', 0.02),
    hit: () => { tone(300, 0.08, 'square', 0.07); tone(200, 0.1, 'square', 0.05, 0.03); },
    superhit: () => { tone(500, 0.06, 'square', 0.08); tone(700, 0.06, 'square', 0.08, 0.05); tone(900, 0.1, 'square', 0.08, 0.1); },
    weakhit: () => tone(240, 0.12, 'sine', 0.05),
    faint: () => { tone(400, 0.15, 'sawtooth', 0.06); tone(260, 0.25, 'sawtooth', 0.06, 0.12); },
    heal: () => { tone(660, 0.09, 'sine', 0.07); tone(880, 0.09, 'sine', 0.07, 0.09); tone(1175, 0.16, 'sine', 0.07, 0.18); },
    coin: () => { tone(988, 0.06, 'square', 0.06); tone(1319, 0.12, 'square', 0.06, 0.05); },
    ball: () => { tone(500, 0.06, 'triangle', 0.06); tone(400, 0.06, 'triangle', 0.06, 0.08); },
    catchgood: () => { tone(660, 0.1, 'square', 0.08); tone(830, 0.1, 'square', 0.08, 0.1); tone(990, 0.1, 'square', 0.08, 0.2); tone(1320, 0.3, 'square', 0.08, 0.3); },
    win: () => { [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.18, 'square', 0.08, i * 0.12)); },
    warp: () => { tone(400, 0.1, 'sine', 0.06); tone(800, 0.2, 'sine', 0.06, 0.08); },
    hm: () => { tone(523, 0.1, 'triangle', 0.07); tone(784, 0.2, 'triangle', 0.07, 0.1); },
    evolve: () => { [392, 523, 659, 784, 1047].forEach((f, i) => tone(f, 0.2, 'sine', 0.07, i * 0.15)); },
  };
  function play(name) { if (SFX[name]) try { SFX[name](); } catch (e) {} }

  // --- music: loop a simple bassline+arp per track ---
  const TRACKS = {
    town:   { tempo: 300, bass: [131, 131, 165, 196], arp: [523, 659, 784, 659] },
    route:  { tempo: 260, bass: [147, 110, 147, 175], arp: [587, 740, 880, 740] },
    battle: { tempo: 200, bass: [110, 110, 98, 98], arp: [440, 554, 659, 554] },
    league: { tempo: 220, bass: [98, 98, 110, 123], arp: [392, 494, 587, 494] },
    victory:{ tempo: 240, bass: [131, 165, 196, 262], arp: [523, 659, 784, 1047] },
  };
  function startMusic(name) {
    if (currentTrack === name) return;
    stopMusic();
    const c = ac(); if (!c) { currentTrack = name; return; }
    currentTrack = name;
    const tk = TRACKS[name] || TRACKS.town;
    musicGain = c.createGain(); musicGain.gain.value = 0.5; musicGain.connect(c.destination);
    let step = 0;
    const interval = tk.tempo;
    musicTimer = setInterval(() => {
      if (!enabled || !musicGain) return;
      const b = tk.bass[step % tk.bass.length];
      const a = tk.arp[step % tk.arp.length];
      tone(b, interval / 1000 * 0.9, 'triangle', 0.05, 0, musicGain);
      tone(a, interval / 1000 * 0.5, 'square', 0.03, 0, musicGain);
      if (step % 2 === 0) tone(a * 2, interval / 1000 * 0.3, 'square', 0.02, interval / 2000, musicGain);
      step++;
    }, interval);
  }
  function stopMusic() { if (musicTimer) { clearInterval(musicTimer); musicTimer = null; } if (musicGain) { try { musicGain.disconnect(); } catch (e) {} musicGain = null; } currentTrack = null; }
  function setEnabled(v) { enabled = !!v; if (!v) stopMusic(); }
  function isEnabled() { return enabled; }

  G.audio = { play, startMusic, stopMusic, setEnabled, isEnabled, resume: () => ac() };
})();
