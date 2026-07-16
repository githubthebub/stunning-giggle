#!/usr/bin/env node
// assemble.js — stitches gameplay footage + per-block voiceover + music bed
// into a finished 1280x720 YouTube-ready mp4 with burned-in captions.
//
// Usage: node video-pipeline/assemble.js video-pipeline/blocks.json out.mp4
//
// blocks.json: [
//   { "footage": "footage/01.mp4",   // background clip for this block
//     "vo": "vo/01.mp3",             // voice take (block length follows it)
//     "text": "caption text ...",    // burned captions, auto-chunked
//     "in": 0,                       // optional: seek into footage (s)
//     "speed": 1,                    // optional: fast-forward factor (montage)
//     "holdExtra": 0 }               // optional: extra seconds after VO ends
// ]
// Paths are resolved relative to the JSON file's directory.

'use strict';
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const W = 1280, H = 720, FPS = 30;
const VO_LEAD = 0.35;   // silence before each block's VO starts
const VO_TAIL = 0.45;   // breathing room after the VO ends
const MUSIC_DB = -20;   // music bed level under the VO
const CHUNK_WORDS = 4;  // caption words shown at a time

function sh(args, opts = {}) {
  return execFileSync(args[0], args.slice(1), { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], ...opts });
}
function probeDur(file) {
  return parseFloat(sh(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file]).trim());
}
function findFont() {
  const candidates = [
    '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',
    '/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf',
    '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',
  ];
  for (const f of candidates) if (fs.existsSync(f)) return f;
  throw new Error('no usable caption font found');
}
// drawtext needs :, ', \ and % escaped
function esc(t) {
  return t.replace(/\\/g, '\\\\').replace(/:/g, '\\:').replace(/'/g, "’").replace(/%/g, '\\%');
}
function chunks(text, n) {
  const words = text.split(/\s+/).filter(Boolean);
  const out = [];
  for (let i = 0; i < words.length; i += n) out.push(words.slice(i, i + n).join(' '));
  return out;
}

const [jsonPath, outPath] = process.argv.slice(2);
if (!jsonPath || !outPath) {
  console.error('usage: node assemble.js blocks.json out.mp4');
  process.exit(1);
}
const baseDir = path.dirname(path.resolve(jsonPath));
const spec = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
const blocks = spec.blocks || spec;
const music = spec.music ? path.resolve(baseDir, spec.music) : null;
const font = findFont();
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'assemble-'));

const segFiles = [], voFiles = [], durations = [];

blocks.forEach((b, i) => {
  const footage = path.resolve(baseDir, b.footage);
  const vo = path.resolve(baseDir, b.vo);
  const voDur = probeDur(vo);
  const dur = VO_LEAD + voDur + VO_TAIL + (b.holdExtra || 0);
  durations.push(dur);

  // --- video: trim/scale footage, freeze last frame if too short, captions
  const capChunks = chunks(b.text || '', CHUNK_WORDS);
  const slice = capChunks.length ? voDur / capChunks.length : 0;
  let draw = '';
  capChunks.forEach((c, k) => {
    const t0 = (VO_LEAD + k * slice).toFixed(3);
    const t1 = (k === capChunks.length - 1 ? dur : VO_LEAD + (k + 1) * slice).toFixed(3);
    draw += `,drawtext=fontfile=${font}:text='${esc(c)}'` +
      `:fontsize=44:fontcolor=white:borderw=4:bordercolor=black` +
      `:x=(w-text_w)/2:y=h-118:enable='between(t,${t0},${t1})'`;
  });
  const seg = path.join(tmp, `seg${i}.mp4`);
  const speedPre = b.speed && b.speed !== 1 ? `setpts=PTS/${b.speed},` : '';
  const vf = `${speedPre}scale=${W}:${H}:force_original_aspect_ratio=increase,crop=${W}:${H},fps=${FPS},` +
    `tpad=stop_mode=clone:stop_duration=25,trim=duration=${dur.toFixed(3)},setpts=PTS-STARTPTS${draw}`;
  sh(['ffmpeg', '-y', '-v', 'error', '-ss', String(b.in || 0), '-i', footage,
    '-vf', vf, '-an', '-c:v', 'libx264', '-preset', 'medium', '-crf', '19', seg]);
  segFiles.push(seg);

  // --- audio: pad VO into an exact block-length wav
  const voPad = path.join(tmp, `vo${i}.wav`);
  const delayMs = Math.round(VO_LEAD * 1000);
  sh(['ffmpeg', '-y', '-v', 'error', '-i', vo,
    '-af', `adelay=${delayMs}|${delayMs},apad`, '-t', dur.toFixed(3),
    '-ar', '44100', '-ac', '2', voPad]);
  voFiles.push(voPad);
  console.log(`block ${i + 1}/${blocks.length}: vo=${voDur.toFixed(2)}s block=${dur.toFixed(2)}s caps=${capChunks.length}`);
});

// --- concat video
const listFile = path.join(tmp, 'list.txt');
fs.writeFileSync(listFile, segFiles.map(f => `file '${f}'`).join('\n'));
const allVideo = path.join(tmp, 'video.mp4');
sh(['ffmpeg', '-y', '-v', 'error', '-f', 'concat', '-safe', '0', '-i', listFile, '-c', 'copy', allVideo]);

// --- concat VO track
const voList = path.join(tmp, 'volist.txt');
fs.writeFileSync(voList, voFiles.map(f => `file '${f}'`).join('\n'));
const allVo = path.join(tmp, 'vo.wav');
sh(['ffmpeg', '-y', '-v', 'error', '-f', 'concat', '-safe', '0', '-i', voList, '-c', 'copy', allVo]);

const total = durations.reduce((a, b) => a + b, 0);
console.log(`total: ${total.toFixed(2)}s`);

// --- final mux: VO + ducked music bed, fade music out at the end
const args = ['ffmpeg', '-y', '-v', 'error', '-i', allVideo, '-i', allVo];
let af;
if (music) {
  args.push('-stream_loop', '-1', '-i', music);
  af = `[2:a]volume=${MUSIC_DB}dB,atrim=duration=${total.toFixed(3)},afade=t=out:st=${(total - 2.5).toFixed(3)}:d=2.5[m];` +
    `[1:a][m]amix=inputs=2:duration=first:normalize=0[aout]`;
} else {
  af = `[1:a]anull[aout]`;
}
args.push('-filter_complex', af, '-map', '0:v', '-map', '[aout]',
  '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', '-t', total.toFixed(3), outPath);
sh(args);
console.log(`wrote ${outPath}`);
