/* main.js — app shell: onboarding, navigation, view routing, profile. */
(function () {
  'use strict';
  const DW = (window.DW = window.DW || {});
  const { el, toast } = DW.ui;

  let view = 'dream';
  let mount = null;
  let pointsEl = null;

  const NAV = [
    { id: 'dream', icon: '💤', label: 'Dream' },
    { id: 'box', icon: '📦', label: 'Box' },
    { id: 'garden', icon: '🌱', label: 'Garden' },
    { id: 'house', icon: '🏠', label: 'House' },
    { id: 'crossover', icon: '↔️', label: 'Crossover' },
    { id: 'profile', icon: '🧑', label: 'Profile' },
  ];

  function boot() {
    DW.state.load();
    buildShell();
    const st = DW.state.get();
    if (!st.onboarded) openOnboarding();
    else rerender();
    // Unlock audio on first interaction.
    const unlock = () => { DW.audio.play('click'); window.removeEventListener('pointerdown', unlock); };
    window.addEventListener('pointerdown', unlock);
    // Handle a #visit= deep link.
    DW.crossover.checkVisitHash();
  }

  function buildShell() {
    const app = document.getElementById('app');
    DW.ui.clear(app);

    const header = el('header', { class: 'app-header' }, [
      el('div', { class: 'brand', onclick: () => setView('dream') }, [
        el('span', { class: 'brand-moon' }, '🌙'),
        el('span', { class: 'brand-title' }, ['Pokémon ', el('span', { class: 'brand-accent' }, 'Dream World')]),
      ]),
      el('div', { class: 'header-right' }, [
        pointsEl = el('div', { class: 'points', title: 'Dream Points' }, ['✨ ', el('b', { id: 'points-val' }, '0')]),
      ]),
    ]);

    const nav = el('nav', { class: 'app-nav' });
    NAV.forEach((n) => {
      nav.appendChild(el('button', {
        class: 'nav-btn', 'data-view': n.id, onclick: () => setView(n.id),
      }, [el('span', { class: 'nav-icon' }, n.icon), el('span', { class: 'nav-label' }, n.label)]));
    });

    mount = el('main', { class: 'app-main', id: 'view-mount' });

    const clouds = el('div', { class: 'bg-clouds', 'aria-hidden': 'true' });
    for (let i = 0; i < 6; i++) clouds.appendChild(el('div', { class: 'bg-cloud bg-cloud-' + i }, '☁️'));

    app.appendChild(clouds);
    app.appendChild(header);
    app.appendChild(nav);
    app.appendChild(mount);
    app.appendChild(el('footer', { class: 'app-footer' }, [
      el('span', {}, 'A dream you can share — cross over to a friend from the '),
      el('a', { href: '#', onclick: (e) => { e.preventDefault(); setView('crossover'); } }, 'Crossover'),
      el('span', {}, ' tab.'),
    ]));

    updatePoints();
  }

  function setView(v) {
    view = v;
    DW.audio.play('click');
    rerender();
  }

  function rerender() {
    if (!mount) return;
    // Highlight nav.
    document.querySelectorAll('.nav-btn').forEach((b) => {
      b.classList.toggle('active', b.getAttribute('data-view') === view);
    });
    DW.ui.clear(mount);
    switch (view) {
      case 'dream': DW.dreamworld.render(mount); break;
      case 'box': DW.box.render(mount); break;
      case 'garden': DW.garden.render(mount); break;
      case 'house': DW.house.render(mount); break;
      case 'crossover': DW.crossover.render(mount); break;
      case 'profile': renderProfile(mount); break;
      default: DW.dreamworld.render(mount);
    }
    updatePoints();
  }

  function updatePoints() {
    const val = document.getElementById('points-val');
    if (val) {
      const target = DW.state.get().trainer.dreamPoints;
      val.textContent = target;
      if (pointsEl) { pointsEl.classList.remove('pop'); void pointsEl.offsetWidth; pointsEl.classList.add('pop'); }
    }
  }

  // ---------- Onboarding ----------
  function openOnboarding() {
    const st = DW.state.get();
    let name = '';
    let avatar = DW.data.AVATARS[0];
    let partner = DW.data.STARTERS[0].id;

    const nameInput = el('input', { class: 'text-input big', type: 'text', maxlength: 14, placeholder: 'Your trainer name' });
    nameInput.addEventListener('input', () => { name = nameInput.value; });

    const avatarRow = el('div', { class: 'avatar-row' });
    DW.data.AVATARS.forEach((a) => {
      const b = el('button', { class: 'avatar-opt' + (a === avatar ? ' active' : ''), onclick: () => { avatar = a; avatarRow.querySelectorAll('.avatar-opt').forEach((x) => x.classList.remove('active')); b.classList.add('active'); DW.audio.play('click'); } }, a);
      avatarRow.appendChild(b);
    });

    const starterRow = el('div', { class: 'starter-row' });
    DW.data.STARTERS.forEach((s) => {
      const b = el('button', {
        class: 'starter-opt' + (s.id === partner ? ' active' : ''),
        onclick: () => { partner = s.id; starterRow.querySelectorAll('.starter-opt').forEach((x) => x.classList.remove('active')); b.classList.add('active'); DW.audio.play('select'); },
      }, [
        DW.sprites.spriteImg(s, 84, { className: 'floaty' }),
        el('div', { class: 'starter-name' }, s.name),
        el('div', { class: 'starter-type' }, s.types.map(DW.ui.typeChip)),
      ]);
      starterRow.appendChild(b);
    });

    const content = el('div', { class: 'onboard' }, [
      el('p', { class: 'onboard-lead' }, 'Welcome, dreamer! Send a Pokémon to sleep and slip into the Island of Dreams — a world you can share with anyone else who has it.'),
      el('label', { class: 'field-label' }, 'What\'s your name?'),
      nameInput,
      el('label', { class: 'field-label' }, 'Pick an avatar'),
      avatarRow,
      el('label', { class: 'field-label' }, 'Choose your partner (they\'ll be your first to fall asleep)'),
      starterRow,
      el('button', {
        class: 'btn primary big block', onclick: () => {
          st.trainer.name = (name || 'Dreamer').trim().slice(0, 14) || 'Dreamer';
          st.trainer.avatar = avatar;
          st.partner = partner;
          st.onboarded = true;
          DW.state.save();
          DW.audio.play('success');
          m.close();
          toast('Welcome, ' + st.trainer.name + '! Tap "Fall asleep" to begin.', { emoji: '🌙', kind: 'success' });
          rerender();
        },
      }, '✨ Enter the Dream World'),
    ]);

    const m = DW.ui.modal(content, { title: '🌙 Pokémon Dream World', className: 'modal-onboard', closable: false });
  }

  // ---------- Profile ----------
  function renderProfile(mount) {
    DW.ui.clear(mount);
    const st = DW.state.get();
    const wrap = el('div', { class: 'profile' });

    wrap.appendChild(el('div', { class: 'section-head' }, [
      el('div', {}, [el('h2', {}, '🧑 Trainer Profile'), el('p', { class: 'muted' }, 'Your Dream World identity and partner.')]),
    ]));

    // Identity card.
    const idCard = el('div', { class: 'card soft profile-id' });
    const nameInput = el('input', { class: 'text-input', type: 'text', maxlength: 14, value: st.trainer.name });
    const avatarRow = el('div', { class: 'avatar-row small' });
    DW.data.AVATARS.forEach((a) => {
      const b = el('button', { class: 'avatar-opt' + (a === st.trainer.avatar ? ' active' : ''), onclick: () => { st.trainer.avatar = a; DW.state.save(); renderProfile(mount); } }, a);
      avatarRow.appendChild(b);
    });
    idCard.appendChild(el('div', { class: 'profile-avatar-big' }, st.trainer.avatar));
    idCard.appendChild(el('div', { class: 'profile-fields' }, [
      el('label', { class: 'field-label' }, 'Name'),
      el('div', { class: 'row-actions' }, [
        nameInput,
        el('button', { class: 'btn ghost sm', onclick: () => { st.trainer.name = nameInput.value.trim().slice(0, 14) || 'Dreamer'; DW.state.save(); toast('Saved!', { emoji: '✅' }); renderProfile(mount); } }, 'Save'),
      ]),
      el('label', { class: 'field-label' }, 'Avatar'),
      avatarRow,
      el('div', { class: 'muted small' }, 'Trainer ID: ' + st.trainer.id),
    ]));
    wrap.appendChild(idCard);

    // Partner card.
    const partner = st.partner ? DW.data.speciesById(st.partner) : null;
    const partnerCard = el('div', { class: 'card soft' });
    partnerCard.appendChild(el('h3', {}, '😴 Sleeping Partner'));
    partnerCard.appendChild(el('p', { class: 'muted' }, 'The Pokémon you send to sleep to enter the Dream World.'));
    const starterRow = el('div', { class: 'starter-row' });
    DW.data.STARTERS.forEach((s) => {
      const b = el('button', {
        class: 'starter-opt' + (partner && s.id === partner.id ? ' active' : ''),
        onclick: () => { st.partner = s.id; DW.state.save(); DW.audio.play('select'); renderProfile(mount); },
      }, [
        DW.sprites.spriteImg(s, 72, { className: 'floaty' }),
        el('div', { class: 'starter-name' }, s.name),
        el('div', { class: 'pkmn-ability' }, ['✨ ', s.ability]),
      ]);
      starterRow.appendChild(b);
    });
    partnerCard.appendChild(starterRow);
    wrap.appendChild(partnerCard);

    // Stats.
    const stats = el('div', { class: 'card soft' });
    stats.appendChild(el('h3', {}, '📊 Dream Stats'));
    stats.appendChild(el('div', { class: 'stat-grid' }, [
      stat('✨', st.trainer.dreamPoints, 'Dream Points'),
      stat('🤝', st.box.length, 'Friends'),
      stat('✦', st.box.filter((p) => p.shiny).length, 'Shinies'),
      stat('↔️', (st.visitors || []).length, 'Crossovers'),
    ]));
    wrap.appendChild(stats);

    // Danger zone.
    const danger = el('div', { class: 'card soft' });
    danger.appendChild(el('button', {
      class: 'btn danger ghost', onclick: async () => {
        const ok = await DW.ui.confirmDialog('Reset EVERYTHING and start a new dream? This cannot be undone.', { ok: 'Reset', danger: true, title: 'Reset save' });
        if (ok) { DW.state.reset(); toast('Save reset.', { emoji: '🧹' }); location.reload(); }
      },
    }, '🧹 Reset save'));
    wrap.appendChild(danger);

    mount.appendChild(wrap);
  }

  function stat(icon, value, label) {
    return el('div', { class: 'stat' }, [
      el('div', { class: 'stat-icon' }, icon),
      el('div', { class: 'stat-value' }, String(value)),
      el('div', { class: 'stat-label' }, label),
    ]);
  }

  DW.main = { boot, rerender, updatePoints, setView, currentView: () => view };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
