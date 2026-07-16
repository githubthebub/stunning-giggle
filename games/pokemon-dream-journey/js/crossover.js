/* crossover.js — visit another player's Dream World and trade Pokémon.
 *
 * Two ways to cross over:
 *   1. Dream Link  — export your world to a shareable code / URL. Anyone who
 *      also has the game can import it to visit your dream and receive your
 *      set gift. Fully offline.
 *   2. Live Crossover — a serverless WebRTC peer-to-peer link (manual
 *      copy/paste signaling, no server). Once connected you see each other's
 *      dreams live and can send Pokémon across in real time.
 */
(function () {
  'use strict';
  const DW = (window.DW = window.DW || {});
  const { el, toast } = DW.ui;

  // ---------- world packing ----------
  function packWorld() {
    const st = DW.state.get();
    return {
      v: 1,
      trainer: { id: st.trainer.id, name: st.trainer.name || 'Dreamer', avatar: st.trainer.avatar },
      box: st.box.slice(0, 30).map((p) => ({
        uid: p.uid, speciesId: p.speciesId, name: p.name, types: p.types,
        ability: p.ability, nickname: p.nickname, level: p.level, shiny: p.shiny,
      })),
      house: (st.house.placed || []).slice(0, 40),
      garden: st.garden.plots.filter(Boolean).map((pl) => pl.berry),
      gift: st.gift ? {
        speciesId: st.gift.speciesId, name: st.gift.name, types: st.gift.types,
        ability: st.gift.ability, nickname: st.gift.nickname, level: st.gift.level, shiny: st.gift.shiny,
      } : null,
      stamp: DW.state.now(),
    };
  }

  // ---------- code encode/decode (utf-8 safe base64) ----------
  function bytesToB64(bytes) {
    let bin = '';
    for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    return btoa(bin);
  }
  function b64ToBytes(b64) {
    const bin = atob(b64);
    const arr = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
    return arr;
  }
  function encodeObj(prefix, obj) {
    return prefix + bytesToB64(new TextEncoder().encode(JSON.stringify(obj)));
  }
  function decodeObj(prefix, code) {
    const clean = String(code).trim().replace(/\s+/g, '');
    const idx = clean.indexOf(prefix);
    if (idx < 0) throw new Error('Not a valid ' + prefix + ' code');
    const b64 = clean.slice(idx + prefix.length);
    return JSON.parse(new TextDecoder().decode(b64ToBytes(b64)));
  }

  const LINK_PREFIX = 'DW1.';
  function myLinkCode() { return encodeObj(LINK_PREFIX, packWorld()); }
  function myLinkUrl() {
    const base = location.origin + location.pathname;
    return base + '#visit=' + encodeURIComponent(myLinkCode());
  }
  function parseLink(code) { return decodeObj(LINK_PREFIX, code); }

  // ---------- give a Pokémon to your box from a visited world ----------
  function receivePokemon(giftLike, fromName) {
    const species = DW.data.speciesById(giftLike.speciesId) || {
      id: giftLike.speciesId, name: giftLike.name, types: giftLike.types || ['normal'], ability: giftLike.ability,
    };
    const pkmn = DW.state.makePokemon(species, {
      nickname: giftLike.nickname || '',
      level: giftLike.level,
      shiny: giftLike.shiny,
      from: 'crossover',
      fromTrainer: fromName || 'a friend',
    });
    DW.state.addPokemon(pkmn);
    DW.main.updatePoints();
    return pkmn;
  }

  // ================= rendering =================
  let currentMount = null;
  let tab = 'link';

  function render(mount) {
    currentMount = mount;
    DW.ui.clear(mount);
    const wrap = el('div', { class: 'crossover' });
    wrap.appendChild(el('div', { class: 'section-head' }, [
      el('div', {}, [
        el('h2', {}, '↔️ Crossover'),
        el('p', { class: 'muted' }, 'Cross over into another player\'s Dream World and trade Pokémon.'),
      ]),
    ]));

    const tabs = el('div', { class: 'tabs' }, [
      tabBtn('link', '🔗 Dream Link'),
      tabBtn('live', '📡 Live Crossover'),
    ]);
    wrap.appendChild(tabs);

    const panel = el('div', { class: 'tab-panel' });
    if (tab === 'link') renderLinkTab(panel);
    else renderLiveTab(panel);
    wrap.appendChild(panel);
    mount.appendChild(wrap);
  }

  function tabBtn(id, label) {
    return el('button', { class: 'tab' + (tab === id ? ' active' : ''), onclick: () => { tab = id; render(currentMount); } }, label);
  }

  // ---------- Dream Link tab (async) ----------
  function renderLinkTab(panel) {
    // Your shareable link.
    const code = myLinkCode();
    const url = myLinkUrl();
    const st = DW.state.get();

    const mine = el('div', { class: 'card soft' });
    mine.appendChild(el('h3', {}, '🔗 Your Dream Link'));
    mine.appendChild(el('p', { class: 'muted' }, 'Share this with a friend who has the game. They can visit your dream and receive your gift'
      + (st.gift ? ' (' + (st.gift.nickname || st.gift.name) + ').' : ' — tip: set a gift in your Box first.')));

    const codeBox = el('textarea', { class: 'code-box', readonly: true, rows: 3 });
    codeBox.value = code;
    mine.appendChild(codeBox);
    mine.appendChild(el('div', { class: 'row-actions' }, [
      copyBtn('Copy code', () => code),
      copyBtn('Copy visit link', () => url),
    ]));
    panel.appendChild(mine);

    // Visit a friend.
    const visit = el('div', { class: 'card soft' });
    visit.appendChild(el('h3', {}, '🚪 Visit a friend\'s dream'));
    visit.appendChild(el('p', { class: 'muted' }, 'Paste a friend\'s Dream Link code (or open their visit link).'));
    const input = el('textarea', { class: 'code-box', rows: 3, placeholder: 'Paste a DW1... code here' });
    visit.appendChild(input);
    visit.appendChild(el('div', { class: 'row-actions' }, [
      el('button', {
        class: 'btn primary', onclick: () => {
          try {
            const world = parseLink(input.value);
            openWorldView(world, { live: false });
          } catch (e) { toast('That doesn\'t look like a valid Dream Link.', { emoji: '⚠️', kind: 'warn' }); }
        },
      }, 'Visit dream'),
    ]));
    panel.appendChild(visit);
  }

  function copyBtn(label, getText) {
    return el('button', {
      class: 'btn ghost', onclick: async (e) => {
        const text = getText();
        try {
          await navigator.clipboard.writeText(text);
          toast('Copied!', { emoji: '📋' });
        } catch (err) {
          // Fallback for insecure contexts.
          const ta = el('textarea', {}); ta.value = text; document.body.appendChild(ta);
          ta.select(); try { document.execCommand('copy'); toast('Copied!', { emoji: '📋' }); } catch (e2) { toast('Copy failed — select and copy manually.', { kind: 'warn' }); }
          ta.remove();
        }
      },
    }, label);
  }

  // ---------- Visitor view (shared by async + live) ----------
  function openWorldView(world, opts) {
    opts = opts || {};
    const t = world.trainer || { name: 'Dreamer', avatar: '🌟' };
    const header = el('div', { class: 'visit-header' }, [
      el('span', { class: 'visit-avatar' }, t.avatar || '🌟'),
      el('div', {}, [
        el('div', { class: 'visit-name' }, (t.name || 'Dreamer') + '\'s Dream'),
        el('div', { class: 'muted small' }, (world.box ? world.box.length : 0) + ' dream friends • ' + (opts.live ? 'live visit' : 'Dream Link')),
      ]),
    ]);

    // House preview.
    const housePrev = el('div', { class: 'visit-house' });
    const placed = world.house || [];
    for (let c = 0; c < 24; c++) {
      const p = placed.find((x) => x.cell === c);
      const def = p ? DW.data.FURNITURE.find((f) => f.id === p.itemId) : null;
      housePrev.appendChild(el('div', { class: 'visit-tile' }, def ? def.emoji : ''));
    }

    // Their Pokémon.
    const grid = el('div', { class: 'visit-box' });
    (world.box || []).forEach((p) => grid.appendChild(DW.ui.pokemonCard(p, { mini: true })));
    if (!(world.box || []).length) grid.appendChild(el('p', { class: 'muted' }, 'No dream friends yet.'));

    const sections = [
      header,
      el('h4', {}, '🏠 Their Dream House'),
      housePrev,
      el('h4', {}, '📦 Their Dream Friends'),
      grid,
    ];

    // Gift from them.
    if (world.gift) {
      let received = false;
      const giftCard = el('div', { class: 'gift-offer' }, [
        el('div', { class: 'gift-offer-inner' }, [
          DW.sprites.spriteImg(DW.data.speciesById(world.gift.speciesId) || world.gift, 64),
          el('div', {}, [
            el('div', {}, ['🎁 ', el('b', {}, t.name || 'Your friend'), ' left you a gift:']),
            el('div', { class: 'accent' }, (world.gift.nickname || world.gift.name) + ' ✨ ' + world.gift.ability),
          ]),
        ]),
      ]);
      const acceptBtn = el('button', {
        class: 'btn primary', onclick: () => {
          if (received) return;
          received = true;
          receivePokemon(world.gift, t.name);
          DW.audio.play('catch');
          toast((world.gift.nickname || world.gift.name) + ' crossed over to your Box!', { emoji: '🤝', kind: 'success' });
          acceptBtn.disabled = true;
          acceptBtn.textContent = '✓ Received';
        },
      }, 'Accept gift');
      giftCard.appendChild(acceptBtn);
      sections.push(giftCard);
    }

    // Live: send them one of your Pokémon.
    if (opts.live && opts.onSendGift) {
      sections.push(el('div', { class: 'row-actions' }, [
        el('button', { class: 'btn primary', onclick: () => openGiftPicker(opts.onSendGift) }, '🎁 Send them a Pokémon'),
      ]));
    }

    DW.state.get().visitors.unshift({ name: t.name, at: DW.state.now(), live: !!opts.live });
    DW.state.get().visitors = DW.state.get().visitors.slice(0, 20);
    DW.state.save();

    return DW.ui.modal(sections, { title: '↔️ Crossover', className: 'modal-visit' });
  }

  function openGiftPicker(onPick) {
    const st = DW.state.get();
    if (!st.box.length) { toast('Your Box is empty — befriend a Pokémon first!', { kind: 'warn' }); return; }
    const grid = el('div', { class: 'box-grid pick' });
    st.box.forEach((p) => grid.appendChild(DW.ui.pokemonCard(p, {
      onClick: () => { m.close(); onPick(p); },
    })));
    const m = DW.ui.modal([el('p', { class: 'muted' }, 'Pick a Pokémon to send. You\'ll keep yours — they get a copy.'), grid],
      { title: '🎁 Send a Pokémon' });
  }

  // ---------- Live Crossover tab (WebRTC) ----------
  function renderLiveTab(panel) {
    if (!('RTCPeerConnection' in window)) {
      panel.appendChild(el('div', { class: 'card soft' }, el('p', {}, 'Live Crossover needs a browser with WebRTC support. Use the Dream Link tab instead.')));
      return;
    }
    const intro = el('div', { class: 'card soft' });
    intro.appendChild(el('h3', {}, '📡 Live Crossover (peer-to-peer)'));
    intro.appendChild(el('p', { class: 'muted' }, 'Connect directly to a friend — no server. One of you invites, the other joins, then you swap two connection codes. Once linked you can visit live and trade Pokémon in real time.'));
    intro.appendChild(el('div', { class: 'row-actions' }, [
      el('button', { class: 'btn primary', onclick: () => startHost(panel) }, '➕ Invite a friend'),
      el('button', { class: 'btn ghost', onclick: () => startGuest(panel) }, '🔗 Join a friend'),
    ]));
    panel.appendChild(intro);
    panel.appendChild(el('div', { class: 'live-stage', id: 'live-stage' }));
  }

  const OFFER_PREFIX = 'DWO.';
  const ANSWER_PREFIX = 'DWA.';

  function newPeer() {
    return new RTCPeerConnection({
      iceServers: [{ urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] }],
    });
  }

  // Wait for ICE gathering to finish (non-trickle) so the code carries all
  // candidates. Falls back after a timeout for networks that never complete.
  function waitIce(pc) {
    return new Promise((resolve) => {
      if (pc.iceGatheringState === 'complete') return resolve();
      let done = false;
      const finish = () => { if (done) return; done = true; resolve(); };
      pc.addEventListener('icegatheringstatechange', () => { if (pc.iceGatheringState === 'complete') finish(); });
      setTimeout(finish, 2500);
    });
  }

  function wireChannel(pc, channel, stageWrap, statusEl) {
    let peerWorld = null;
    let visitModal = null;

    channel.onopen = () => {
      DW.audio.play('connect');
      statusEl.textContent = '🟢 Connected!';
      statusEl.className = 'live-status ok';
      // Send our world across.
      try { channel.send(JSON.stringify({ type: 'hello', world: packWorld() })); } catch (e) {}
      renderConnected();
    };
    channel.onclose = () => {
      statusEl.textContent = '⚪ Disconnected';
      statusEl.className = 'live-status';
    };
    channel.onmessage = (ev) => {
      let msg; try { msg = JSON.parse(ev.data); } catch (e) { return; }
      if (msg.type === 'hello') {
        peerWorld = msg.world;
        renderConnected();
      } else if (msg.type === 'gift') {
        const p = receivePokemon(msg.pkmn, (peerWorld && peerWorld.trainer && peerWorld.trainer.name) || 'a friend');
        DW.audio.play('catch');
        toast('🎁 You received ' + (p.nickname || p.name) + ' from your friend!', { emoji: '🤝', kind: 'success' });
      }
    };

    function sendGift(pkmn) {
      const lite = {
        speciesId: pkmn.speciesId, name: pkmn.name, types: pkmn.types,
        ability: pkmn.ability, nickname: pkmn.nickname, level: pkmn.level, shiny: pkmn.shiny,
      };
      try {
        channel.send(JSON.stringify({ type: 'gift', pkmn: lite }));
        toast('Sent ' + (pkmn.nickname || pkmn.name) + ' across the crossover!', { emoji: '📤', kind: 'success' });
        DW.audio.play('coin');
      } catch (e) { toast('Could not send — connection lost.', { kind: 'warn' }); }
    }

    function renderConnected() {
      // Replace the signaling UI with a connected panel.
      const host = stageWrap;
      DW.ui.clear(host);
      const t = peerWorld && peerWorld.trainer;
      host.appendChild(el('div', { class: 'card soft connected' }, [
        el('div', { class: 'connected-head' }, [
          el('span', { class: 'live-dot' }, '🟢'),
          el('div', {}, [
            el('b', {}, t ? ('Connected to ' + (t.name || 'a friend') + ' ' + (t.avatar || '')) : 'Connected — waiting for their dream…'),
            el('div', { class: 'muted small' }, 'You are crossed over. Trade freely!'),
          ]),
        ]),
        el('div', { class: 'row-actions' }, [
          el('button', { class: 'btn primary', disabled: !peerWorld, onclick: () => { if (peerWorld) openWorldView(peerWorld, { live: true, onSendGift: sendGift }); } }, '👀 Visit their dream'),
          el('button', { class: 'btn ghost', onclick: () => openGiftPicker(sendGift) }, '🎁 Send a Pokémon'),
          el('button', { class: 'btn danger ghost', onclick: () => { try { channel.close(); pc.close(); } catch (e) {} DW.crossover.render(currentMount); } }, 'Disconnect'),
        ]),
      ]));
    }
  }

  async function startHost(panel) {
    const stage = panel.querySelector('#live-stage');
    DW.ui.clear(stage);
    const status = el('div', { class: 'live-status' }, '⏳ Creating invite…');
    stage.appendChild(el('div', { class: 'card soft' }, [
      el('h3', {}, '➕ Invite a friend'),
      status,
    ]));

    const pc = newPeer();
    const channel = pc.createDataChannel('dw');
    wireChannel(pc, channel, stage, status);

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    await waitIce(pc);
    const offerCode = encodeObj(OFFER_PREFIX, pc.localDescription);

    DW.ui.clear(stage);
    const answerInput = el('textarea', { class: 'code-box', rows: 3, placeholder: 'Paste your friend\'s reply code (DWA...) here' });
    const status2 = el('div', { class: 'live-status' }, '① Send your invite code, then paste their reply.');
    stage.appendChild(el('div', { class: 'card soft' }, [
      el('h3', {}, '➕ Invite a friend'),
      el('div', { class: 'step' }, [el('span', { class: 'step-num' }, '1'), 'Send this invite code to your friend:']),
      readonlyCode(offerCode),
      el('div', { class: 'row-actions' }, [copyBtn('Copy invite code', () => offerCode)]),
      el('div', { class: 'step' }, [el('span', { class: 'step-num' }, '2'), 'Paste the reply code they send back:']),
      answerInput,
      el('div', { class: 'row-actions' }, [
        el('button', {
          class: 'btn primary', onclick: async () => {
            try {
              const answer = decodeObj(ANSWER_PREFIX, answerInput.value);
              await pc.setRemoteDescription(answer);
              status2.textContent = '⏳ Connecting…';
            } catch (e) { toast('That reply code is invalid.', { kind: 'warn' }); }
          },
        }, 'Connect'),
      ]),
      status2,
    ]));
  }

  async function startGuest(panel) {
    const stage = panel.querySelector('#live-stage');
    DW.ui.clear(stage);
    const offerInput = el('textarea', { class: 'code-box', rows: 3, placeholder: 'Paste your friend\'s invite code (DWO...) here' });
    stage.appendChild(el('div', { class: 'card soft' }, [
      el('h3', {}, '🔗 Join a friend'),
      el('div', { class: 'step' }, [el('span', { class: 'step-num' }, '1'), 'Paste the invite code your friend sent:']),
      offerInput,
      el('div', { class: 'row-actions' }, [
        el('button', { class: 'btn primary', onclick: () => acceptOffer(stage, offerInput.value) }, 'Generate reply'),
      ]),
    ]));
  }

  async function acceptOffer(stage, offerCode) {
    let offer;
    try { offer = decodeObj(OFFER_PREFIX, offerCode); }
    catch (e) { toast('That invite code is invalid.', { kind: 'warn' }); return; }

    const pc = newPeer();
    const status = el('div', { class: 'live-status' }, '⏳ Preparing reply…');
    pc.ondatachannel = (ev) => { wireChannel(pc, ev.channel, stage, status); };

    await pc.setRemoteDescription(offer);
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    await waitIce(pc);
    const answerCode = encodeObj(ANSWER_PREFIX, pc.localDescription);

    DW.ui.clear(stage);
    stage.appendChild(el('div', { class: 'card soft' }, [
      el('h3', {}, '🔗 Join a friend'),
      el('div', { class: 'step' }, [el('span', { class: 'step-num' }, '2'), 'Send this reply code back to your friend:']),
      readonlyCode(answerCode),
      el('div', { class: 'row-actions' }, [copyBtn('Copy reply code', () => answerCode)]),
      status,
    ]));
  }

  function readonlyCode(text) {
    const ta = el('textarea', { class: 'code-box', readonly: true, rows: 3 });
    ta.value = text;
    return ta;
  }

  // Auto-open a visit if the page was loaded with #visit=<code>.
  function checkVisitHash() {
    const m = /[#&]visit=([^&]+)/.exec(location.hash || '');
    if (!m) return;
    try {
      const world = parseLink(decodeURIComponent(m[1]));
      // Clear the hash so a refresh doesn't re-open.
      history.replaceState(null, '', location.pathname);
      setTimeout(() => openWorldView(world, { live: false }), 400);
    } catch (e) { /* ignore malformed */ }
  }

  DW.crossover = { render, myLinkCode, myLinkUrl, parseLink, openWorldView, checkVisitHash, packWorld };
})();
