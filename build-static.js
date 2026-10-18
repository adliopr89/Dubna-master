// Сборка статической версии для GitHub Pages → <репо>/docs/ (корень ветки).
// Запуск: node "Мастера Дубны/build-static.js"
'use strict';
const fs = require('fs');
const path = require('path');

const SRC = path.join(__dirname, 'app', 'webapp');
const OUT = path.join(__dirname, 'docs');

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });
for (const f of fs.readdirSync(SRC)) {
  if (/\.(html|js|css|png|svg|ico)$/.test(f)) fs.copyFileSync(path.join(SRC, f), path.join(OUT, f));
}
console.log('docs/ собран:', fs.readdirSync(OUT).join(', '));
