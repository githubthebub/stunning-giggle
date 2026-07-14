/* minigame.js — the "Dream Meter" befriending game.
 * A marker sweeps a track; tap Befriend while it's in the glowing zone to
 * build friendship. Fill the heart to befriend the dream Pokémon (and earn
 * its Hidden Ability). Miss three times and it slips back into the dream. */
(function () {
  'use strict';
  const DW = (window.DW = window.DW || {});
  const { el } = DW.ui;

  function play(species) {
    return new Promise((resolve) => {
      let friendship = 0;
      const TARGET = 100;
      let misses = 0;
      const MAX_MISS = 3;
      let pos = 0;            // 0..1 marker position
      let dir = 1;
      let speed = 0.014;      // per frame
      let zoneStart = 0.4, zoneW = 0.22;  // green zone
      let running = true;
      let raf = null;
      let finished = false;

      const marker = el('div', { class: 'dm-marker' });
      const zone = el('div', { class: 'dm-zone' });
      const track = el('div', { class: 'dm-track' }, [zone, marker]);
      const heartFill = el('div', { class: 'dm-heart-fill' });
      const heartBar = el('div', { class: 'dm-heart' }, [heartFill, el('span', { class: 'dm-heart-label' }, '❤')]);
      const missDots = el('div', { class: 'dm-misses' });
      function renderMisses() {
        DW.ui.clear(missDots);
        for (let i = 0; i < MAX_MISS; i++) {
          missDots.appendChild(el('span', { class: 'dm-miss-dot' + (i < misses ? ' spent' : '') }, i < misses ? '💤' : '⭐'));
        }
      }
      renderMisses();

      const hint = el('div', { class: 'dm-hint' }, 'Tap when the star is in the glow!');
      const btn = el('button', { class: 'btn primary big dm-btn', onclick: tap }, 'Befriend! ✦');

      const spriteWrap = el('div', { class: 'dm-sprite' }, DW.sprites.spriteImg(species, 120));

      const content = el('div', { class: 'dreammeter' }, [
        el('div', { class: 'dm-top' }, [
          spriteWrap,
          el('div', { class: 'dm-info' }, [
            el('div', { class: 'dm-name' }, 'Wild ' + species.name),
            el('div', { class: 'dm-ability' }, ['✨ Hidden Ability: ', species.ability]),
            heartBar,
            missDots,
          ]),
        ]),
        track,
        hint,
        btn,
      ]);

      const m = DW.ui.modal(content, {
        title: 'A dream Pokémon appears!',
        className: 'modal-game',
        closable: false,
      });

      function updateHeart() {
        heartFill.style.width = Math.min(100, friendship) + '%';
      }

      function frame() {
        if (!running) return;
        pos += dir * speed;
        if (pos >= 1) { pos = 1; dir = -1; }
        if (pos <= 0) { pos = 0; dir = 1; }
        marker.style.left = (pos * 100) + '%';
        raf = requestAnimationFrame(frame);
      }

      function setZone() {
        zoneW = Math.max(0.1, 0.22 - friendship * 0.0011);   // shrinks as you progress
        zoneStart = 0.12 + Math.random() * (0.76 - zoneW);
        zone.style.left = (zoneStart * 100) + '%';
        zone.style.width = (zoneW * 100) + '%';
        speed = 0.012 + friendship * 0.00016;                 // speeds up
      }

      function flash(kind) {
        track.classList.remove('hit', 'miss');
        void track.offsetWidth;
        track.classList.add(kind);
      }

      function tap() {
        if (!running || finished) return;
        const inZone = pos >= zoneStart && pos <= zoneStart + zoneW;
        if (inZone) {
          // Bonus for hitting near the centre of the zone.
          const centre = zoneStart + zoneW / 2;
          const closeness = 1 - Math.min(1, Math.abs(pos - centre) / (zoneW / 2));
          const gain = 16 + Math.round(closeness * 14);
          friendship = Math.min(TARGET, friendship + gain);
          updateHeart();
          flash('hit');
          DW.audio.play('select');
          spawnHeart();
          hint.textContent = closeness > 0.7 ? 'Perfect! It really likes you!' : 'Nice! Keep going!';
          if (friendship >= TARGET) return finish(true);
          setZone();
        } else {
          misses++;
          renderMisses();
          flash('miss');
          DW.audio.play('fail');
          hint.textContent = 'It got startled... steady now.';
          if (misses >= MAX_MISS) return finish(false);
          setZone();
        }
      }

      function spawnHeart() {
        const h = el('div', { class: 'floating-heart' }, ['💗', '💖', '💓'][Math.floor(Math.random() * 3)]);
        h.style.left = (30 + Math.random() * 40) + '%';
        spriteWrap.appendChild(h);
        setTimeout(() => h.remove(), 900);
      }

      function finish(befriended) {
        if (finished) return;
        finished = true;
        running = false;
        if (raf) cancelAnimationFrame(raf);
        btn.disabled = true;
        if (befriended) {
          DW.audio.play('catch');
          hint.textContent = species.name + ' became your friend!';
          spriteWrap.classList.add('befriended');
        } else {
          DW.audio.play('fail');
          hint.textContent = species.name + ' drifted back into the dream...';
          spriteWrap.classList.add('fled');
        }
        setTimeout(() => { m.close(); resolve({ befriended: befriended, species: species }); }, 1100);
      }

      // Keyboard support: space / enter to tap.
      function onKey(e) {
        if (e.code === 'Space' || e.code === 'Enter') { e.preventDefault(); tap(); }
      }
      document.addEventListener('keydown', onKey);
      const origResolve = resolve;
      resolve = (v) => { document.removeEventListener('keydown', onKey); origResolve(v); };

      setZone();
      updateHeart();
      raf = requestAnimationFrame(frame);
    });
  }

  DW.minigame = { play };
})();
