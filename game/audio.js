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

  // --- music: melodic 16-step loops per track (0 = rest) ---
  const N = {
    _: 0,
    C3: 130.81, D3: 146.83, E3: 164.81, F3: 174.61, G3: 196.0, A3: 220.0, B3: 246.94, Bb3: 233.08,
    C4: 261.63, D4: 293.66, E4: 329.63, F4: 349.23, G4: 392.0, A4: 440.0, B4: 493.88, Bb4: 466.16,
    C5: 523.25, D5: 587.33, E5: 659.25, F5: 698.46, G5: 783.99, A5: 880.0, B5: 987.77,
  };
  const _ = 0;
  const TRACKS = {
    town: { tempo: 360, wave: 'triangle', bassWave: 'sine',
      bass: [N.C3, _, N.G3, _, N.A3, _, N.E3, _, N.F3, _, N.C3, _, N.F3, _, N.G3, _],
      mel:  [N.E4, N.G4, N.C5, _, N.B4, N.G4, _, N.A4, N.G4, N.E4, N.A4, _, N.F4, N.A4, N.G4, _] },
    route: { tempo: 320, wave: 'triangle', bassWave: 'sine',
      bass: [N.G3, _, N.D3, _, N.E3, _, N.B3, _, N.C4, _, N.G3, _, N.C4, _, N.D4, _],
      mel:  [N.G4, N.B4, N.D5, N.B4, N.E5, _, N.B4, N.G4, N.C5, N.E5, N.D5, N.B4, N.C5, N.D5, _, _] },
    battle: { tempo: 240, wave: 'square', bassWave: 'sine',
      bass: [N.A3, N.A3, _, N.A3, N.F3, N.F3, _, N.F3, N.G3, N.G3, _, N.G3, N.E3, _, N.E3, _],
      mel:  [N.A4, N.C5, N.E5, N.C5, N.F4, N.A4, N.C5, N.A4, N.G4, N.B4, N.D5, N.B4, N.E5, N.D5, N.C5, _] },
    league: { tempo: 260, wave: 'square', bassWave: 'sine',
      bass: [N.D3, _, N.A3, _, N.Bb3, _, N.F3, _, N.G3, _, N.D3, _, N.A3, _, N.C4, _],
      mel:  [N.D5, N.A4, N.F5, N.A4, N.Bb4, N.D5, N.F5, _, N.G4, N.Bb4, N.D5, N.C5, N.A4, _, N.A4, _] },
    victory: { tempo: 200, wave: 'square', bassWave: 'triangle',
      bass: [N.C3, N.C3, N.G3, N.G3, N.C4, _, N.G3, _, N.F3, N.F3, N.C4, _, N.G3, _, _, _],
      mel:  [N.C5, N.C5, N.C5, N.E5, N.G5, _, N.E5, N.G5, N.C5, _, N.E5, N.G5, N.C5, _, _, _] },
    entralink: { tempo: 440, wave: 'sine', bassWave: 'sine',
      bass: [N.A3, _, _, _, N.F3, _, _, _, N.G3, _, _, _, N.E3, _, _, _],
      mel:  [N.E4, _, N.A4, _, _, N.C5, _, N.B4, N.A4, _, N.E5, _, _, N.C5, _, _] },
  };
  function startMusic(name) {
    if (currentTrack === name) return;
    stopMusic();
    const c = ac(); if (!c) { currentTrack = name; return; }
    currentTrack = name;
    const tk = TRACKS[name] || TRACKS.town;
    musicGain = c.createGain(); musicGain.gain.value = 0.34; musicGain.connect(c.destination);
    let step = 0;
    const dur = tk.tempo / 1000;
    musicTimer = setInterval(() => {
      if (!enabled || !musicGain) return;
      const b = tk.bass[step % tk.bass.length];
      const m = tk.mel[step % tk.mel.length];
      if (b) tone(b, dur * 1.6, tk.bassWave, 0.05, 0, musicGain);
      if (m) {
        tone(m, dur * 0.7, tk.wave, 0.045, 0, musicGain);
        tone(m * 2, dur * 0.35, 'sine', 0.014, 0, musicGain); // soft shimmer octave
      }
      // gentle pad chord at the top of each bar
      if (step % 8 === 0 && b) { tone(b, dur * 6, 'sine', 0.02, 0, musicGain); tone(b * 1.5, dur * 6, 'sine', 0.014, 0, musicGain); }
      step++;
    }, tk.tempo);
  }
  function stopMusic() { if (musicTimer) { clearInterval(musicTimer); musicTimer = null; } if (musicGain) { try { musicGain.disconnect(); } catch (e) {} musicGain = null; } currentTrack = null; }
  function setEnabled(v) { enabled = !!v; if (!v) stopMusic(); }
  function isEnabled() { return enabled; }

  G.audio = { play, startMusic, stopMusic, setEnabled, isEnabled, resume: () => ac() };
})();
