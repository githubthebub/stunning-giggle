#!/usr/bin/env node
/*
 * Zero-dependency static file server for Pokémon Dream World.
 * Run with:  npm start   (or:  node server.js)
 * Then open the printed URL in your browser.
 */
'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const PORT = process.env.PORT ? Number(process.env.PORT) : 4173;
const HOST = process.env.HOST || '127.0.0.1';

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webmanifest': 'application/manifest+json',
};

function safeJoin(base, target) {
  const targetPath = path.normalize(path.join(base, target));
  if (!targetPath.startsWith(base)) return null; // path traversal guard
  return targetPath;
}

const server = http.createServer((req, res) => {
  try {
    let urlPath = decodeURIComponent((req.url || '/').split('?')[0]);
    if (urlPath === '/') urlPath = '/index.html';

    let filePath = safeJoin(ROOT, urlPath);
    if (!filePath) {
      res.writeHead(400);
      return res.end('Bad request');
    }

    const send = (fileToSend) => {
      const ext = path.extname(fileToSend).toLowerCase();
      res.writeHead(200, {
        'Content-Type': MIME[ext] || 'application/octet-stream',
        'Cache-Control': 'no-cache',
      });
      fs.createReadStream(fileToSend).pipe(res);
    };
    const notFound = () => {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('404 Not Found');
    };

    fs.stat(filePath, (err, stat) => {
      if (!err && stat.isDirectory()) {
        // Serve <dir>/index.html; redirect first so relative URLs resolve.
        if (!urlPath.endsWith('/')) {
          res.writeHead(301, { Location: urlPath + '/' });
          return res.end();
        }
        const indexPath = path.join(filePath, 'index.html');
        return fs.stat(indexPath, (err2, stat2) => {
          if (err2 || !stat2.isFile()) return notFound();
          send(indexPath);
        });
      }
      if (err || !stat.isFile()) return notFound();
      send(filePath);
    });
  } catch (e) {
    res.writeHead(500);
    res.end('Server error');
  }
});

server.listen(PORT, HOST, () => {
  console.log('\n  ✨  Pokémon Dream World is running');
  console.log(`  ➜  RPG:      http://${HOST}:${PORT}`);
  console.log(`  ➜  Card Dex: http://${HOST}:${PORT}/pokedex/`);
  console.log(`  ➜  Editor:   http://${HOST}:${PORT}/editor/\n`);
});
