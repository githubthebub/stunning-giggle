/* audio.js — tiny WebAudio blip synth. No assets, no dependencies.
 * Sounds are muted until the first user gesture (browser autoplay policy). */
(function () {
  'use strict';
  const DW = (window.DW = window.DW || {});

  let ctx = null;
  let enabled = true;

  function ensure() {
    if (!enabled) return null;
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) { enabled = false; return null; }
      try { ctx = new AC(); } catch (e) { enabled = false; return null; }
    }
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});
    return ctx;
  }

  function tone(freq, dur, type, gain, when) {
    const ac = ensure();
    if (!ac) return;
    const t0 = ac.currentTime + (when || 0);
    const osc = ac.createOscillator();
    const g = ac.createGain();
    osc.type = type || 'sine';
    osc.frequency.setValueAtTime(freq, t0);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(gain || 0.12, t0 + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g).connect(ac.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  const sfx = {
    click: () => tone(520, 0.06, 'square', 0.05),
    select: () => { tone(660, 0.08, 'triangle', 0.08); tone(880, 0.08, 'triangle', 0.06, 0.05); },
    success: () => { tone(660, 0.1, 'sine', 0.1); tone(880, 0.1, 'sine', 0.1, 0.09); tone(1175, 0.18, 'sine', 0.1, 0.18); },
    catch: () => { tone(392, 0.12, 'triangle', 0.1); tone(587, 0.12, 'triangle', 0.1, 0.1); tone(784, 0.2, 'triangle', 0.1, 0.2); },
    fail: () => { tone(300, 0.15, 'sawtooth', 0.06); tone(200, 0.2, 'sawtooth', 0.06, 0.1); },
    coin: () => { tone(988, 0.06, 'square', 0.06); tone(1319, 0.12, 'square', 0.06, 0.05); },
    dream: () => { tone(523, 0.3, 'sine', 0.05); tone(659, 0.3, 'sine', 0.05, 0.12); tone(784, 0.5, 'sine', 0.05, 0.24); },
    connect: () => { tone(440, 0.1, 'sine', 0.1); tone(554, 0.1, 'sine', 0.1, 0.1); tone(659, 0.1, 'sine', 0.1, 0.2); tone(880, 0.3, 'sine', 0.1, 0.3); },
  };

  function play(name) { if (sfx[name]) try { sfx[name](); } catch (e) {} }
  function setEnabled(v) { enabled = !!v; }
  function isEnabled() { return enabled; }

  DW.audio = { play, setEnabled, isEnabled };
})();
