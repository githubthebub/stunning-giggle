/* input.js — unified keyboard + touch input. Movement uses held direction;
 * menus use edge-triggered press events. */
(function () {
  'use strict';
  const G = (window.G = window.G || {});

  const held = { up: false, down: false, left: false, right: false, a: false, b: false, start: false };
  const dirStack = [];
  const listeners = {};
  let enabled = true;

  const KEYMAP = {
    ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down',
    ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right',
    Space: 'a', KeyZ: 'a', Enter: 'a', KeyJ: 'a',
    KeyX: 'b', Backspace: 'b', KeyK: 'b',
    Escape: 'start', ShiftLeft: 'start', Tab: 'start',
  };

  function on(evt, fn) { (listeners[evt] = listeners[evt] || []).push(fn); return () => off(evt, fn); }
  function off(evt, fn) { if (listeners[evt]) listeners[evt] = listeners[evt].filter((f) => f !== fn); }
  function emit(evt, arg) { (listeners[evt] || []).slice().forEach((f) => { try { f(arg); } catch (e) { console.error(e); } }); }

  function press(btn) {
    if (!enabled) return;
    if (held[btn]) return; // ignore key repeat
    held[btn] = true;
    if (btn === 'up' || btn === 'down' || btn === 'left' || btn === 'right') {
      dirStack.push(btn);
    }
    emit('press', btn);
    emit(btn, btn);
  }
  function release(btn) {
    held[btn] = false;
    const i = dirStack.lastIndexOf(btn);
    if (i >= 0) dirStack.splice(i, 1);
    emit('release', btn);
  }

  function currentDir() { return dirStack.length ? dirStack[dirStack.length - 1] : null; }
  function isHeld(btn) { return !!held[btn]; }
  function setEnabled(v) { enabled = v; if (!v) { Object.keys(held).forEach((k) => held[k] = false); dirStack.length = 0; } }

  // Don't hijack keys while the player is typing in a text field
  // (trainer name, nickname, paste-a-code box, etc.).
  function typingInField(e) {
    const t = e.target;
    return t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable);
  }

  function init() {
    window.addEventListener('keydown', (e) => {
      if (typingInField(e)) return;
      const btn = KEYMAP[e.code];
      if (btn) { e.preventDefault(); press(btn); }
    });
    window.addEventListener('keyup', (e) => {
      if (typingInField(e)) return;
      const btn = KEYMAP[e.code];
      if (btn) { e.preventDefault(); release(btn); }
    });
    window.addEventListener('blur', () => { Object.keys(held).forEach((k) => held[k] = false); dirStack.length = 0; });
  }

  // Bind an on-screen button element to a logical button.
  function bindButton(elm, btn) {
    const down = (e) => { e.preventDefault(); press(btn); elm.classList.add('pressed'); };
    const up = (e) => { if (e) e.preventDefault(); release(btn); elm.classList.remove('pressed'); };
    elm.addEventListener('touchstart', down, { passive: false });
    elm.addEventListener('touchend', up, { passive: false });
    elm.addEventListener('touchcancel', up, { passive: false });
    elm.addEventListener('mousedown', down);
    window.addEventListener('mouseup', up);
    elm.addEventListener('mouseleave', up);
  }

  G.input = { on, off, press, release, currentDir, isHeld, setEnabled, init, bindButton };
})();
