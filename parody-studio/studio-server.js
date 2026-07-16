#!/usr/bin/env node
'use strict';
/*
 * studio-server.js — tiny localhost-only web UI server for Parody Studio.
 *
 * Usage:  node studio-server.js [port]     (default port 3117)
 * Then open http://127.0.0.1:3117 in a browser.
 *
 * Endpoints:
 *   GET  /        -> ui.html
 *   GET  /sfx     -> JSON list of sound names available in ./sfx/
 *   POST /render  -> body = project JSON; spawns render.js and streams
 *                    its output back as plain text (progress + result)
 *
 * Local files only. Binds 127.0.0.1 — never exposed to the network.
 */

const http = require('http');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');

const PORT = parseInt(process.argv[2] || '3117', 10);
const SFX_DIR = path.join(__dirname, 'sfx');

function listSfx() {
  try {
    return fs.readdirSync(SFX_DIR)
      .filter((f) => f.endsWith('.wav'))
      .map((f) => f.replace(/\.wav$/, ''))
      .sort();
  } catch {
    return [];
  }
}

function readBody(req, limit = 1024 * 1024) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (c) => {
      size += c.length;
      if (size > limit) { reject(new Error('body too large')); req.destroy(); return; }
      chunks.push(c);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');

  if (req.method === 'GET' && (url.pathname === '/' || url.pathname === '/ui.html')) {
    try {
      const html = fs.readFileSync(path.join(__dirname, 'ui.html'));
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(html);
    } catch {
      res.writeHead(500).end('ui.html not found next to studio-server.js');
    }
    return;
  }

  if (req.method === 'GET' && url.pathname === '/sfx') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(listSfx()));
    return;
  }

  if (req.method === 'POST' && url.pathname === '/render') {
    let project;
    try {
      project = JSON.parse(await readBody(req));
    } catch (e) {
      res.writeHead(400, { 'Content-Type': 'text/plain' });
      res.end(`bad request: ${e.message}\n`);
      return;
    }

    // Write the project to a temp file and hand it to render.js, which does
    // all real validation. Paths in a UI-built project are absolute (the UI
    // has no working directory to be relative to).
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'parody-ui-'));
    const projFile = path.join(tmp, 'project.json');
    fs.writeFileSync(projFile, JSON.stringify(project, null, 2));

    res.writeHead(200, {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-cache',
      'X-Content-Type-Options': 'nosniff',
    });

    const child = spawn(process.execPath, [path.join(__dirname, 'render.js'), projFile]);
    child.stdout.on('data', (d) => res.write(d));
    child.stderr.on('data', (d) => res.write(d));
    child.on('close', (code) => {
      res.end(code === 0 ? '\n[render finished ok]\n' : `\n[render FAILED, exit code ${code}]\n`);
      try { fs.rmSync(tmp, { recursive: true, force: true }); } catch {}
    });
    req.on('close', () => { try { child.kill('SIGKILL'); } catch {} });
    return;
  }

  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('not found\n');
});

// 127.0.0.1 only: this is a local tool, not a web service.
server.listen(PORT, '127.0.0.1', () => {
  console.log(`Parody Studio UI: http://127.0.0.1:${PORT}`);
});
