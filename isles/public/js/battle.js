// Shellfire Isles — adventure battle screen. Drives engine.js locally
// (wild encounters + trainer fights), renders a GBA-style DOM overlay.

import { SPECIES, MOVES, ITEMS, typeEff } from './data.js';
import * as E from './engine.js';
import { monCanvas } from './art.js';

const $ = sel => document.querySelector(sel);

export class BattleScreen {
  constructor(root) {
    this.root = root;
    this.queue = [];
    this.busy = false;
  }

  // opts: { wild: mon } or { trainer: {name, team:[mon], reward, intro...} }
  // playerCtx: { party, bag, save } — mutated directly.
  start(opts, playerCtx, onEnd) {
    this.onEnd = onEnd;
    this.ctx = playerCtx;
    this.wild = !!opts.wild;
    this.trainer = opts.trainer || null;
    this.caught = null;
    this.fled = false;
    this.xpShare = new Set();

    const enemyTeam = this.wild ? [opts.wild] : opts.trainer.mons;
    const a = E.makeSide(playerCtx.party, playerCtx.save.name || 'You');
    const b = E.makeSide(enemyTeam, this.wild ? 'Wild' : opts.trainer.name);
    this.battle = E.makeBattle(a, b);
    this.xpShare.add(a.active);

    this.root.innerHTML = `
      <div class="battle">
        <div class="b-arena">
          <div class="b-foe">
            <div class="b-plate" id="bFoePlate"></div>
            <div class="b-spr" id="bFoeSpr"></div>
          </div>
          <div class="b-ally">
            <div class="b-spr" id="bAllySpr"></div>
            <div class="b-plate" id="bAllyPlate"></div>
          </div>
        </div>
        <div class="b-bottom">
          <div class="b-text" id="bText"></div>
          <div class="b-menu" id="bMenu"></div>
        </div>
      </div>`;
    this.root.classList.add('active');

    this.renderMons(true);
    const opener = this.wild
      ? `A wild ${E.activeMon(b).nick} appeared!`
      : `${opts.trainer.name} wants to battle!${opts.trainer.intro ? '\n' + opts.trainer.intro : ''}`;
    this.say(opener).then(() => this.mainMenu());
  }

  // ---------- rendering ----------
  renderMons(fresh = false) {
    const { a, b } = this.battle;
    const foe = E.activeMon(b), ally = E.activeMon(a);
    const foeSpr = $('#bFoeSpr'), allySpr = $('#bAllySpr');
    foeSpr.innerHTML = ''; allySpr.innerHTML = '';
    if (foe.hp > 0) foeSpr.appendChild(monCanvas(foe.sp, false, 3));
    if (ally.hp > 0) allySpr.appendChild(monCanvas(ally.sp, true, 4));
    this.renderPlates();
  }
  renderPlates() {
    const { a, b } = this.battle;
    $('#bFoePlate').innerHTML = plate(E.activeMon(b), false);
    $('#bAllyPlate').innerHTML = plate(E.activeMon(a), true);
  }

  say(text) {
    return new Promise(res => {
      const el = $('#bText');
      el.textContent = '';
      el.classList.add('typing');
      const full = text;
      let i = 0;
      const tick = () => {
        i += 2;
        el.textContent = full.slice(0, i);
        if (i < full.length) { this._t = setTimeout(tick, 14); }
        else { el.classList.remove('typing'); setTimeout(res, Math.min(900, 260 + full.length * 6)); }
      };
      tick();
    });
  }

  async playEvents(events) {
    for (const ev of events) {
      if (ev.t === 'dmg') {
        this.renderPlates();
        this.flash(ev.side);
        if (ev.text) await this.say(ev.text);
      } else if (ev.t === 'heal' || ev.t === 'stat' || ev.t === 'status') {
        this.renderPlates();
        if (ev.text) await this.say(ev.text);
      } else if (ev.t === 'switch') {
        this.renderMons();
        await this.say(ev.text);
      } else if (ev.t === 'faint') {
        await this.say(ev.text);
        this.renderMons();
        if (ev.side === 'b') await this.handleFoeFaint();
      } else if (ev.t === 'end') {
        // handled by caller
      } else if (ev.text) {
        await this.say(ev.text);
      }
    }
  }

  flash(sideKey) {
    const el = sideKey === 'b' ? $('#bFoeSpr') : $('#bAllySpr');
    if (!el) return;
    el.classList.remove('hit'); void el.offsetWidth; el.classList.add('hit');
  }

  // ---------- menus ----------
  mainMenu() {
    if (this.battle.over) return this.finish();
    const ally = E.activeMon(this.battle.a);
    if (ally.hp <= 0) return this.forcedSwitch();
    this.menu([
      { l:'FIGHT', f:() => this.fightMenu() },
      { l:'BAG',   f:() => this.bagMenu() },
      { l:'TEAM',  f:() => this.switchMenu(false) },
      { l:'RUN',   f:() => this.tryRun() },
    ], `What will ${ally.nick} do?`);
  }

  menu(entries, prompt) {
    if (prompt) $('#bText').textContent = prompt;
    const m = $('#bMenu');
    m.innerHTML = '';
    m.style.display = 'grid';
    for (const e of entries) {
      const btn = document.createElement('button');
      btn.className = 'b-btn' + (e.cls ? ' ' + e.cls : '');
      btn.innerHTML = e.l;
      btn.onclick = () => { m.style.display = 'none'; e.f(); };
      m.appendChild(btn);
    }
  }

  fightMenu() {
    const ally = E.activeMon(this.battle.a);
    const entries = ally.moves.map((s, i) => {
      const mv = MOVES[s.id];
      return { l:`${mv.n}<small>${mv.t} · PP ${s.pp}/${s.maxPp}</small>`, cls:'type-' + mv.t,
               f:() => s.pp > 0 ? this.takeTurn({ type:'move', slot:i }) : this.say('No PP left for that move!').then(() => this.fightMenu()) };
    });
    entries.push({ l:'BACK', f:() => this.mainMenu() });
    this.menu(entries, 'Choose a move.');
  }

  bagMenu() {
    const bag = this.ctx.bag;
    const entries = Object.entries(bag).filter(([, q]) => q > 0).map(([id, q]) => ({
      l:`${ITEMS[id].n} ×${q}`,
      f:() => this.useItem(id),
    }));
    if (!entries.length) return this.say('The bag is empty!').then(() => this.mainMenu());
    entries.push({ l:'BACK', f:() => this.mainMenu() });
    this.menu(entries, 'Use which item?');
  }

  async useItem(id) {
    const it = ITEMS[id];
    const bag = this.ctx.bag;
    if (it.kind === 'orb') {
      if (!this.wild) { await this.say("You can't capture another trainer's creature!"); return this.mainMenu(); }
      bag[id]--;
      await this.throwOrb(it);
      return;
    }
    // pick a target mon for heals
    const party = this.ctx.party;
    const entries = party.map((m, i) => ({
      l:`${m.nick} <small>HP ${m.hp}/${m.stats.hp}${m.status ? ' ' + m.status.toUpperCase() : ''}</small>`,
      f: async () => {
        let ok = false;
        if (it.kind === 'heal' && m.hp > 0 && m.hp < m.stats.hp) { m.hp = Math.min(m.stats.hp, m.hp + it.amt); ok = true; }
        if (it.kind === 'status' && m.status) { m.status = null; ok = true; }
        if (it.kind === 'revive' && m.hp <= 0) { m.hp = Math.floor(m.stats.hp * it.amt); ok = true; }
        if (!ok) { await this.say("It won't have any effect."); return this.bagMenu(); }
        bag[id]--;
        this.renderPlates();
        await this.say(`Used the ${it.n} on ${m.nick}!`);
        // using an item consumes the turn — enemy attacks
        await this.enemyOnlyTurn();
        if (!this.battle.over) this.mainMenu(); else this.finish();
      },
    }));
    entries.push({ l:'BACK', f:() => this.bagMenu() });
    this.menu(entries, 'On which team member?');
  }

  async throwOrb(it) {
    const foe = E.activeMon(this.battle.b);
    await this.say(`You threw a ${it.n}!`);
    const res = E.tryCatch(foe, it.mult);
    for (let i = 0; i < res.shakes; i++) { this.flash('b'); await new Promise(r => setTimeout(r, 420)); }
    if (res.caught) {
      this.caught = foe;
      await this.say(`Gotcha! ${foe.nick} was caught!`);
      this.battle.over = true; this.battle.winner = 'a';
      return this.finish();
    }
    await this.say(`Oh no! ${foe.nick} broke free!`);
    await this.enemyOnlyTurn();
    if (!this.battle.over) this.mainMenu(); else this.finish();
  }

  switchMenu(forced) {
    const side = this.battle.a;
    const entries = side.team.map((m, i) => ({
      l:`${m.nick} <small>Lv${m.level} · HP ${m.hp}/${m.stats.hp}</small>`,
      f: async () => {
        if (i === side.active && m.hp > 0) { await this.say(`${m.nick} is already out!`); return this.switchMenu(forced); }
        if (m.hp <= 0) { await this.say(`${m.nick} can't battle!`); return this.switchMenu(forced); }
        if (forced) {
          const ev = [];
          E.doSwitch(this.battle, 'a', i, ev);
          this.xpShare.add(i);
          this.renderMons();
          await this.playEvents(ev);
          this.mainMenu();
        } else {
          this.xpShare.add(i);
          await this.takeTurn({ type:'switch', to:i });
        }
      },
    }));
    if (!forced) entries.push({ l:'BACK', f:() => this.mainMenu() });
    this.menu(entries, forced ? 'Send out which creature?' : 'Switch to which creature?');
  }

  forcedSwitch() {
    if (!E.sideHasHealthy(this.battle.a)) return this.finish();
    this.switchMenu(true);
  }

  async tryRun() {
    if (!this.wild) { await this.say("Can't run from a trainer battle!"); return this.mainMenu(); }
    const mySpe = E.effSpe(E.activeMon(this.battle.a), this.battle.a);
    const foeSpe = E.effSpe(E.activeMon(this.battle.b), this.battle.b);
    if (Math.random() < (mySpe >= foeSpe ? 1 : 0.5)) {
      this.fled = true;
      await this.say('Got away safely!');
      this.battle.over = true;
      return this.finish();
    }
    await this.say("Can't escape!");
    await this.enemyOnlyTurn();
    if (!this.battle.over) this.mainMenu(); else this.finish();
  }

  async enemyOnlyTurn() {
    const actB = E.aiChoose(this.battle, 'b');
    const before = E.activeMon(this.battle.a);
    const ev = E.resolveTurn(this.battle, { type:'move', slot:-1 }, actB); // slot -1: player passes
    await this.playEvents(ev.filter(e => !(e.t === 'msg' && e.text.includes('no moves left'))));
    if (before.hp <= 0 && E.sideHasHealthy(this.battle.a)) await this.forcedSwitchNow();
  }

  async takeTurn(actA) {
    const actB = E.aiChoose(this.battle, 'b');
    const allyBefore = this.battle.a.active;
    const ev = E.resolveTurn(this.battle, actA, actB);
    await this.playEvents(ev);
    if (this.battle.over) return this.finish();
    if (E.activeMon(this.battle.a).hp <= 0) return this.forcedSwitch();
    this.mainMenu();
  }

  async forcedSwitchNow() { return new Promise(res => { const orig = this.mainMenu.bind(this); this.switchMenu(true); const iv = setInterval(() => { if (E.activeMon(this.battle.a).hp > 0) { clearInterval(iv); res(); } }, 200); }); }

  async handleFoeFaint() {
    // award XP to participants
    const foe = E.activeMon(this.battle.b);
    const sharers = [...this.xpShare].filter(i => this.ctx.party[i] && this.ctx.party[i].hp > 0);
    for (const i of sharers) {
      const evs = E.awardXp(this.ctx.party[i], foe.sp, foe.level);
      for (const e of evs) {
        if (e.t === 'canlearn') {
          await this.say(e.text);
          await this.learnPrompt(this.ctx.party[i], e.move);
        } else await this.say(e.text);
      }
    }
    this.renderPlates();
    // trainer sends next mon
    if (!this.wild && !this.battle.over) {
      const b = this.battle.b;
      const next = b.team.findIndex(m => m.hp > 0);
      if (next >= 0) {
        const ev = [];
        E.doSwitch(this.battle, 'b', next, ev);
        this.xpShare = new Set([this.battle.a.active]);
        this.renderMons();
        await this.playEvents(ev);
      }
    }
  }

  learnPrompt(mon, moveId) {
    return new Promise(res => {
      const entries = mon.moves.map((s, i) => ({
        l:`Forget ${MOVES[s.id].n}`,
        f: async () => {
          mon.moves[i] = { id: moveId, pp: MOVES[moveId].pp, maxPp: MOVES[moveId].pp };
          await this.say(`${mon.nick} forgot ${MOVES[s.id].n} and learned ${MOVES[moveId].n}!`);
          res();
        },
      }));
      entries.push({ l:`Give up on ${MOVES[moveId].n}`, f: async () => { await this.say(`${mon.nick} did not learn ${MOVES[moveId].n}.`); res(); } });
      this.menu(entries, `Forget a move to make room for ${MOVES[moveId].n}?`);
    });
  }

  async finish() {
    const won = this.battle.winner === 'a';
    if (this.caught) {
      // done — caller stores the mon
    } else if (this.fled) {
      // nothing
    } else if (won && this.trainer) {
      await this.say(`You defeated ${this.trainer.name}!${this.trainer.winText ? '\n' + this.trainer.winText : ''}`);
      await this.say(`You got $${this.trainer.reward} for winning!`);
    } else if (!won && !this.wild) {
      await this.say('You were defeated...');
    } else if (!won) {
      await this.say('You blacked out!');
    }
    this.root.classList.remove('active');
    this.root.innerHTML = '';
    this.onEnd({
      won, fled: this.fled, caught: this.caught,
      reward: won && this.trainer ? this.trainer.reward : 0,
    });
  }
}

function plate(mon, ally) {
  const pct = Math.max(0, Math.round(mon.hp / mon.stats.hp * 100));
  const barCls = pct > 50 ? 'ok' : pct > 20 ? 'warn' : 'bad';
  return `
    <div class="p-name">${mon.nick} <span class="p-lv">Lv${mon.level}</span>
      ${mon.status ? `<span class="p-status">${mon.status.toUpperCase()}</span>` : ''}</div>
    <div class="p-hpbar"><div class="p-hpfill ${barCls}" style="width:${pct}%"></div></div>
    ${ally ? `<div class="p-hptext">${mon.hp} / ${mon.stats.hp}</div>` : ''}`;
}
