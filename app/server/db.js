// Хранилище «Мастера Дубны» — JSON-файл вместо БД.
// state живёт в памяти сервера и пишется в data/db.json при каждом изменении.
const fs = require('fs');
const path = require('path');
const seedData = require('../webapp/seed.js');

const DB_FILE = path.join(__dirname, '..', '..', 'data', 'db.json');

function load() {
  try {
    return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
  } catch {
    const s = seedData();
    save(s);
    console.log('[db] создан новый data/db.json из seed');
    return s;
  }
}

function save(db) {
  fs.mkdirSync(path.dirname(DB_FILE), { recursive: true });
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 1));
}

module.exports = { load, save, DB_FILE };
