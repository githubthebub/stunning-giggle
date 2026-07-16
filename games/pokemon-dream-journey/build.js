#!/usr/bin/env node
/* build.js — bundles the whole game into a single self-contained HTML file
 * (dist/unova.html) for hosting as an Artifact: all CSS/JS inlined, authentic
 * sprites embedded as data URIs, and the Dream World embedded (for the
 * Entralink) via an iframe srcdoc. No external requests at runtime. */
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = __dirname;
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');

const GAME_JS = [
  'game/spritedata.js', 'game/data.js', 'game/party.js', 'game/battle.js', 'game/tiles.js',
  'game/sprites.js', 'game/maps.js', 'game/audio.js', 'game/gameui.js', 'game/save.js',
  'game/input.js', 'game/world.js', 'game/battlescene.js', 'game/menu.js', 'game/entralink.js', 'game/main.js',
];
const DREAM_JS = [
  'js/data.js', 'js/sprites.js', 'js/state.js', 'js/ui.js', 'js/audio.js', 'js/minigame.js',
  'js/dreamworld.js', 'js/garden.js', 'js/house.js', 'js/box.js', 'js/crossover.js', 'js/main.js',
];

// Sanity: no file may contain a literal </script> that would break inlining.
function guard(name, src) { if (/<\/script>/i.test(src)) throw new Error(name + ' contains </script>'); return src; }

// --- Dream World bundle (embedded via srcdoc; reads parent SPRITE_DATA) ---
const dreamStyles = read('styles.css');
const dreamScripts = DREAM_JS.map((f) => '<script>' + guard(f, read(f)) + '</script>').join('\n');
const dreamHtml =
  '<!doctype html><html lang="en"><head><meta charset="utf-8">' +
  '<meta name="viewport" content="width=device-width, initial-scale=1.0">' +
  '<style>' + dreamStyles + '</style></head><body><div id="app"></div>' +
  '<script>window.OFFLINE_SPRITES=true;</script>\n' + dreamScripts + '</body></html>';
const dreamB64 = Buffer.from(dreamHtml, 'utf8').toString('base64');

// --- Main game bundle ---
const gameCss = read('game.css');
const gameScripts = GAME_JS.map((f) => '<script>' + guard(f, read(f)) + '</script>').join('\n');

// Body DOM from index.html (strip the <script> includes and the doctype/head).
const bodyDom = `
<div id="game-root">
  <div id="hud" style="display:none">
    <span class="hud-loc">Unova</span>
    <span class="hud-badges">◇◇◇◇</span>
    <span class="hud-money">¥0</span>
  </div>
  <div id="stage"><canvas id="game-canvas"></canvas></div>
  <div id="touch-controls">
    <div class="dpad">
      <button id="btn-up" class="tc-btn tc-up" aria-label="Up">▲</button>
      <button id="btn-left" class="tc-btn tc-left" aria-label="Left">◀</button>
      <button id="btn-right" class="tc-btn tc-right" aria-label="Right">▶</button>
      <button id="btn-down" class="tc-btn tc-down" aria-label="Down">▼</button>
    </div>
    <div class="face-btns">
      <button id="btn-start" class="tc-btn tc-start" aria-label="Menu">☰</button>
      <div class="ab">
        <button id="btn-b" class="tc-btn tc-b" aria-label="B">B</button>
        <button id="btn-a" class="tc-btn tc-a" aria-label="A">A</button>
      </div>
    </div>
  </div>
</div>
<div id="game-ui"></div>`;

const out =
  '<title>Pokémon Unova — Dream Journey</title>\n' +
  '<style>' + gameCss + '</style>\n' +
  bodyDom + '\n' +
  '<script>window.OFFLINE_SPRITES=true;window.DREAMWORLD_HTML_B64="' + dreamB64 + '";</script>\n' +
  gameScripts + '\n';

fs.mkdirSync(path.join(ROOT, 'dist'), { recursive: true });
fs.writeFileSync(path.join(ROOT, 'dist/unova.html'), out);

// Also emit a full standalone doc (for opening directly / local testing).
const standalone = '<!doctype html><html lang="en"><head><meta charset="utf-8">' +
  '<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no"></head><body>' +
  out + '</body></html>';
fs.writeFileSync(path.join(ROOT, 'dist/unova.standalone.html'), standalone);

console.log('built dist/unova.html            ' + (out.length / 1024).toFixed(0) + ' KB (artifact fragment)');
console.log('built dist/unova.standalone.html ' + (standalone.length / 1024).toFixed(0) + ' KB (full doc for testing)');
