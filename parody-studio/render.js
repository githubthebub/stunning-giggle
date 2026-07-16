#!/usr/bin/env node
'use strict';
/*
 * render.js — renders a Parody Studio project to an .mp4 using ffmpeg.
 *
 * Usage:  node render.js project.json
 *
 * Project schema (all paths resolve relative to the project.json file):
 * {
 *   "source": "clip.mp4",          // LOCAL video file (this tool never downloads)
 *   "output": "out.mp4",
 *   "width": 1280, "height": 720,  // optional; defaults to the source size
 *   "clips": [
 *     {
 *       "start": 1.0, "end": 4.0,  // seconds in the source
 *       "speed": 1.5,              // optional, 0.25–4.0 (2 = twice as fast)
 *       "punchIn": 1.3,            // optional, 1.0–2.0 center zoom
 *       "caption": { "text": "hello", "position": "top" | "bottom" },  // optional
 *       "mute": true,              // optional: drop the clip's own audio
 *       "sfx": [                   // optional sound effects
 *         { "name": "boing", "at": 0.5, "gain": 1.2 },   // from parody-studio/sfx/
 *         { "file": "./my.wav", "at": 1.0 }              // or any local audio file
 *       ]                          // "at" is seconds from the clip's start in the
 *     }                            //  OUTPUT (i.e. after any speed change)
 *   ]
 * }
 *
 * Clips are hard-cut together in order. Output: h264 + aac, 30 fps, faststart.
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn, spawnSync } = require('child_process');

const SFX_DIR = path.join(__dirname, 'sfx');

function die(msg) {
  console.error(`error: ${msg}`);
  process.exit(1);
}

/* ------------------------------------------------------------------ */
/* Font detection: find a bold-ish TTF/OTF under /usr/share/fonts      */
/* ------------------------------------------------------------------ */

function listFonts(dir, out) {
  let entries;
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return out; }
  for (const e of entries) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) listFonts(p, out);
    else if (/\.(ttf|otf)$/i.test(e.name)) out.push(p);
  }
  return out;
}

function findFont() {
  const fonts = listFonts('/usr/share/fonts', []);
  if (fonts.length === 0) die('no .ttf/.otf fonts found under /usr/share/fonts');
  // Preference order: well-known bold sans fonts, then any non-italic bold,
  // then any sans, then whatever exists.
  const rank = (f) => {
    const b = path.basename(f);
    if (/LiberationSans-Bold\.ttf$/i.test(b)) return 0;
    if (/DejaVuSans-Bold\.ttf$/i.test(b)) return 1;
    if (/FreeSansBold\.(ttf|otf)$/i.test(b)) return 2;
    if (/bold/i.test(b) && !/italic|oblique/i.test(b)) return 3;
    if (/sans/i.test(b) && !/italic|oblique/i.test(b)) return 4;
    return 5;
  };
  fonts.sort((a, b) => rank(a) - rank(b));
  return fonts[0];
}

/* ------------------------------------------------------------------ */
/* ffprobe helpers                                                     */
/* ------------------------------------------------------------------ */

function probe(file) {
  const r = spawnSync('ffprobe', [
    '-v', 'error', '-show_entries',
    'stream=codec_type,width,height:format=duration',
    '-of', 'json', file,
  ], { encoding: 'utf8' });
  if (r.status !== 0) die(`ffprobe failed on ${file}:\n${r.stderr}`);
  const info = JSON.parse(r.stdout);
  const v = (info.streams || []).find((s) => s.codec_type === 'video');
  const a = (info.streams || []).find((s) => s.codec_type === 'audio');
  return {
    hasVideo: !!v,
    hasAudio: !!a,
    width: v ? v.width : 0,
    height: v ? v.height : 0,
    duration: parseFloat((info.format || {}).duration || '0'),
  };
}

/* ------------------------------------------------------------------ */
/* Project loading + validation                                        */
/* ------------------------------------------------------------------ */

const projectFile = process.argv[2];
if (!projectFile) die('usage: node render.js project.json');
let project;
try {
  project = JSON.parse(fs.readFileSync(projectFile, 'utf8'));
} catch (e) {
  die(`cannot read/parse ${projectFile}: ${e.message}`);
}
const projectDir = path.dirname(path.resolve(projectFile));
const rel = (p) => path.resolve(projectDir, p);

if (typeof project.source !== 'string') die('project.source is required');
if (/^[a-z][a-z0-9+.-]*:\/\//i.test(project.source)) {
  die('project.source must be a LOCAL file path — this tool does not download media');
}
const source = rel(project.source);
if (!fs.existsSync(source)) die(`source not found: ${source}`);
if (typeof project.output !== 'string') die('project.output is required');
const output = rel(project.output);
if (!Array.isArray(project.clips) || project.clips.length === 0) die('project.clips must be a non-empty array');

const src = probe(source);
if (!src.hasVideo) die(`no video stream in ${source}`);

// Output size: explicit, else source size; force even numbers for yuv420p.
const even = (n) => Math.max(2, Math.floor(n / 2) * 2);
const W = even(project.width || src.width || 1280);
const H = even(project.height || src.height || 720);

// Resolve one sfx entry to an absolute file path.
function resolveSfx(entry, clipIdx) {
  if (entry.file) {
    const p = rel(entry.file);
    if (!fs.existsSync(p)) die(`clip ${clipIdx}: sfx file not found: ${p}`);
    return p;
  }
  if (entry.name) {
    const base = entry.name.endsWith('.wav') ? entry.name : `${entry.name}.wav`;
    const p = path.join(SFX_DIR, path.basename(base)); // basename: no path tricks
    if (!fs.existsSync(p)) {
      die(`clip ${clipIdx}: sfx "${entry.name}" not found in ${SFX_DIR} — run: node make-sfx.js`);
    }
    return p;
  }
  die(`clip ${clipIdx}: each sfx needs a "name" (from sfx/) or a "file" path`);
}

// Normalize clips into a flat plan.
const clips = project.clips.map((c, i) => {
  const start = Number(c.start);
  const end = Number(c.end);
  if (!(start >= 0) || !(end > start)) die(`clip ${i}: need 0 <= start < end (got ${c.start}..${c.end})`);
  if (src.duration && start >= src.duration) die(`clip ${i}: start ${start}s is past the end of the source (${src.duration.toFixed(2)}s)`);
  const speed = c.speed === undefined ? 1 : Number(c.speed);
  if (!(speed >= 0.25 && speed <= 4)) die(`clip ${i}: speed must be 0.25–4.0`);
  const punchIn = c.punchIn === undefined ? 1 : Number(c.punchIn);
  if (!(punchIn >= 1 && punchIn <= 2)) die(`clip ${i}: punchIn must be 1.0–2.0`);
  let caption = null;
  if (c.caption) {
    if (typeof c.caption.text !== 'string' || !c.caption.text.trim()) die(`clip ${i}: caption.text must be a non-empty string`);
    caption = { text: c.caption.text, position: c.caption.position === 'top' ? 'top' : 'bottom' };
  }
  const sfx = (c.sfx || []).map((s, j) => {
    const at = Number(s.at);
    if (!(at >= 0)) die(`clip ${i} sfx ${j}: "at" must be >= 0 seconds`);
    const gain = s.gain === undefined ? 1 : Number(s.gain);
    if (!(gain > 0 && gain <= 8)) die(`clip ${i} sfx ${j}: gain must be in (0, 8]`);
    return { file: resolveSfx(s, i), at, gain };
  });
  return { start, end, speed, punchIn, caption, mute: !!c.mute, sfx, dur: (end - start) / speed };
});

const totalDur = clips.reduce((s, c) => s + c.dur, 0);

/* ------------------------------------------------------------------ */
/* Build the ffmpeg filtergraph                                        */
/* ------------------------------------------------------------------ */

const fontFile = findFont();
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'parody-'));
process.on('exit', () => { try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch {} });

// atempo only accepts 0.5–2.0 per instance, so chain instances for
// bigger speed changes (e.g. 3x -> atempo=2.0,atempo=1.5).
function atempoChain(speed) {
  const parts = [];
  let s = speed;
  while (s > 2.0) { parts.push('atempo=2.0'); s /= 2; }
  while (s < 0.5) { parts.push('atempo=0.5'); s *= 2; }
  if (Math.abs(s - 1) > 1e-9) parts.push(`atempo=${s.toFixed(6)}`);
  return parts;
}

const inputs = [];   // ffmpeg -i argument groups
const graph = [];    // filtergraph chains
const fontSize = Math.round(H * 0.07);
const borderW = Math.max(2, Math.round(H / 150));

let inputIdx = 0;
clips.forEach((clip, i) => {
  // One seeked input per clip: -ss/-t before -i is fast AND frame-accurate
  // when re-encoding (ffmpeg decodes from the prior keyframe and discards).
  inputs.push('-ss', String(clip.start), '-t', String(clip.end - clip.start), '-i', source);
  const ci = inputIdx++;

  /* ---- video chain ---- */
  const v = [`setpts=(PTS-STARTPTS)/${clip.speed}`, 'fps=30'];
  // Normalize every clip to the output canvas (letterbox if needed) so concat works.
  v.push(`scale=${W}:${H}:force_original_aspect_ratio=decrease`,
         `pad=${W}:${H}:(ow-iw)/2:(oh-ih)/2`, 'setsar=1');
  if (clip.punchIn > 1) {
    // Zoom = upscale then center-crop back to the canvas.
    v.push(`scale=trunc(iw*${clip.punchIn.toFixed(4)}):trunc(ih*${clip.punchIn.toFixed(4)})`,
           `crop=${W}:${H}`);
  }
  if (clip.caption) {
    // drawtext escaping is a minefield, so the text goes in a temp file
    // (expansion=none keeps it literal). Bold font + black outline.
    const txtFile = path.join(tmpDir, `cap-${i}.txt`);
    fs.writeFileSync(txtFile, clip.caption.text);
    const y = clip.caption.position === 'top' ? '0.05*h' : 'h-text_h-0.05*h';
    v.push(`drawtext=fontfile=${fontFile}:textfile=${txtFile}:expansion=none` +
           `:fontsize=${fontSize}:fontcolor=white:borderw=${borderW}:bordercolor=black` +
           `:x=(w-text_w)/2:y=${y}`);
  }
  v.push('format=yuv420p');
  graph.push(`[${ci}:v]${v.join(',')}[v${i}]`);

  /* ---- audio chain (clip's own sound) ---- */
  const durStr = clip.dur.toFixed(6);
  let aBase;
  if (src.hasAudio) {
    const a = ['asetpts=PTS-STARTPTS', ...atempoChain(clip.speed)];
    if (clip.mute) a.push('volume=0');           // keep timing, drop the sound
    // Pad+trim pins audio length exactly to the clip's video length.
    a.push('apad', `atrim=0:${durStr}`, 'aresample=44100',
           'aformat=sample_fmts=fltp:channel_layouts=stereo');
    aBase = `[${ci}:a]${a.join(',')}`;
  } else {
    // Source has no audio track: synthesize silence of the right length.
    aBase = `anullsrc=r=44100:cl=stereo,atrim=0:${durStr},` +
            'aformat=sample_fmts=fltp:channel_layouts=stereo';
  }

  /* ---- sfx chains + mix ---- */
  if (clip.sfx.length === 0) {
    graph.push(`${aBase}[a${i}]`);
  } else {
    graph.push(`${aBase}[a${i}base]`);
    const mixIns = [`[a${i}base]`];
    clip.sfx.forEach((s, j) => {
      inputs.push('-i', s.file);
      const si = inputIdx++;
      const delayMs = Math.round(s.at * 1000);
      graph.push(
        `[${si}:a]aformat=sample_fmts=fltp:channel_layouts=stereo,aresample=44100,` +
        `volume=${s.gain.toFixed(4)},adelay=${delayMs}:all=1[sfx${i}_${j}]`
      );
      mixIns.push(`[sfx${i}_${j}]`);
    });
    // duration=first: the clip's own (exact-length) track defines the length,
    // normalize=0 keeps levels instead of dividing by input count.
    graph.push(`${mixIns.join('')}amix=inputs=${mixIns.length}:duration=first:normalize=0,` +
               `aformat=sample_fmts=fltp:channel_layouts=stereo[a${i}]`);
  }
});

// Hard-cut everything together.
const pads = clips.map((_, i) => `[v${i}][a${i}]`).join('');
graph.push(`${pads}concat=n=${clips.length}:v=1:a=1[vout][aout]`);

// The graph goes in a file: no shell-quoting issues, no arg-length limits.
const graphFile = path.join(tmpDir, 'filtergraph.txt');
fs.writeFileSync(graphFile, graph.join(';\n'));

/* ------------------------------------------------------------------ */
/* Run ffmpeg                                                          */
/* ------------------------------------------------------------------ */

const args = [
  '-hide_banner', '-loglevel', 'warning', '-y',
  ...inputs,
  '-filter_complex_script', graphFile,
  '-map', '[vout]', '-map', '[aout]',
  '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '19', '-pix_fmt', 'yuv420p',
  '-c:a', 'aac', '-b:a', '192k', '-ar', '44100',
  '-movflags', '+faststart',
  '-progress', 'pipe:1', '-nostats',
  output,
];

console.log(`source : ${source}`);
console.log(`output : ${output}  (${W}x${H} @ 30fps, ~${totalDur.toFixed(2)}s)`);
console.log(`font   : ${fontFile}`);
console.log(`clips  : ${clips.length}, sfx: ${clips.reduce((s, c) => s + c.sfx.length, 0)}`);

const ff = spawn('ffmpeg', args, { stdio: ['ignore', 'pipe', 'pipe'] });

let stderrBuf = '';
ff.stderr.on('data', (d) => { stderrBuf = (stderrBuf + d).slice(-8000); });

// -progress writes key=value lines; out_time_us is microseconds of output.
let lastPct = -1;
ff.stdout.on('data', (d) => {
  for (const line of d.toString().split('\n')) {
    const m = line.match(/^out_time_us=(\d+)/);
    if (m && totalDur > 0) {
      const pct = Math.min(100, Math.round((Number(m[1]) / 1e6 / totalDur) * 100));
      if (pct !== lastPct) {
        lastPct = pct;
        process.stdout.write(`\rrendering: ${pct}%`);
      }
    }
  }
});

ff.on('error', (e) => die(`could not start ffmpeg: ${e.message}`));
ff.on('close', (code) => {
  process.stdout.write('\n');
  if (code !== 0) {
    console.error(stderrBuf);
    die(`ffmpeg exited with code ${code}`);
  }
  if (stderrBuf.trim()) console.error(stderrBuf.trim()); // surface warnings
  console.log(`done: ${output}`);
});
