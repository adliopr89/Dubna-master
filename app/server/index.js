// Сервер «Мастера Дубны»: статика webapp + /api/state (JSON-хранилище) + бот.
// Запуск: node "Мастера Дубны/app/server/index.js"  →  http://127.0.0.1:8095/
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const store = require('./db');

const PORT = +(process.env.PORT || 8095);
const WEBAPP = path.join(__dirname, '..', 'webapp');
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml' };

// общее состояние (бот и webapp пишут сюда же)
let state = store.load();
const api = {
  get: () => state,
  set(s) { state = s; store.save(state); },
  mutate(fn) { fn(state); store.save(state); },
};

const server = http.createServer((req, res) => {
  const url = decodeURIComponent(req.url.split('?')[0]);

  if (url === '/api/state') {
    if (req.method === 'GET') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify(state));
    }
    if (req.method === 'PUT') {
      let body = '';
      req.on('data', c => body += c);
      return req.on('end', () => {
        try {
          const next = JSON.parse(body);
          if (!next || !Array.isArray(next.masters)) throw new Error('bad state');
          api.set(next);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end('{"ok":true}');
        } catch (e) {
          res.writeHead(400); res.end('bad json');
        }
      });
    }
  }

  if (url === '/api/reset' && req.method === 'POST') {
    api.set(require('../webapp/seed.js')());
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end('{"ok":true}');
  }

  // статика webapp
  const rel = url === '/' ? '/index.html' : url;
  const file = path.join(WEBAPP, path.normalize(rel).replace(/^([/\\])+/, ''));
  if (!file.startsWith(WEBAPP)) { res.writeHead(403); return res.end(); }
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404); return res.end('not found'); }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' });
    res.end(data);
  });
});

server.listen(PORT, () => {
  console.log(`[app] Мастера Дубны: http://127.0.0.1:${PORT}/`);
  try { require('./bot').start(api); }
  catch (e) { console.log('[bot] не запущен:', e.message); }
});
