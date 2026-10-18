// Telegram-бот «Мастера Дубны» — long polling без зависимостей (Node 24 fetch).
// Токен: env MASTER_BOT_TOKEN, либо data/bot.token, либо ../../Проекты/MasterBot.txt
//
// Что умеет:
//  /start            — регистрация (клиент/мастер по @username), кнопка Mini App
//  /start mNNNN      — заявка на присоединение к мастеру с кодом NNNN
//  заявки (и из Mini App) приходят мастеру сообщением с кнопками Принять/Отклонить
//  все уведомления из DB.notes доставляются в Telegram тем, кто писал боту
//  каждые 30 c: сгорание броней + напоминания клиентам по их настройкам
'use strict';
const fs = require('fs');
const path = require('path');

const WEBAPP_URL = process.env.WEBAPP_URL || 'https://adliopr89.github.io/pyrus-bot/';

function findToken() {
  if (process.env.MASTER_BOT_TOKEN) return process.env.MASTER_BOT_TOKEN.trim();
  const candidates = [
    path.join(__dirname, '..', '..', 'data', 'bot.token'),
    path.join(__dirname, '..', '..', '..', 'Проекты', 'MasterBot.txt'),
  ];
  for (const f of candidates) {
    try { const t = fs.readFileSync(f, 'utf8').trim(); if (t) return t; } catch {}
  }
  return null;
}

const TOKEN = findToken();
const API = `https://api.telegram.org/bot${TOKEN}`;

async function call(method, params = {}) {
  const r = await fetch(`${API}/${method}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(params),
  });
  const j = await r.json().catch(() => ({}));
  if (!j.ok) console.log(`[bot] ${method} err:`, j.description || j);
  return j;
}

const send = (chatId, text, extra = {}) =>
  call('sendMessage', { chat_id: chatId, text, ...extra });

const appBtn = (text = 'Открыть приложение') => ({
  inline_keyboard: [[{ text, web_app: { url: WEBAPP_URL } }]],
});

// ── работа с людьми ─────────────────────────────────────────
const uid = (db, p) => p + (db.seq++);
const byTg = (db, u) => {
  const uname = '@' + (u.username || '');
  const m = db.masters.find(x => x.tgId === u.id || (u.username && x.tg === uname));
  if (m) return { role: 'master', p: m };
  let c = db.clients.find(x => x.tgId === u.id || (u.username && x.tg === uname));
  return { role: 'client', p: c };
};

function register(db, u) {
  const f = byTg(db, u);
  if (f.p) { f.p.tgId = u.id; if (u.username) f.p.tg = '@' + u.username; return f; }
  // новый клиент
  const c = { id: uid(db, 'c'), name: [u.first_name, u.last_name].filter(Boolean).join(' ') || 'Клиент',
    phone: '', tg: u.username ? '@' + u.username : '', tgId: u.id, rem: { r30: true, r60: true, r1440: false, cust: [] } };
  db.clients.push(c);
  return { role: 'client', p: c };
}

const person = (db, id) => db.masters.find(x => x.id === id) || db.clients.find(x => x.id === id);
const note = (db, to, text) => db.notes.unshift({ to, text, ts: Date.now(), seen: false });

// ── входящие обновления ─────────────────────────────────────
async function onMessage(api, msg) {
  const u = msg.from, text = msg.text || '';
  if (!text.startsWith('/start')) return;
  const payload = text.split(' ')[1] || '';

  let me;
  api.mutate(db => { me = register(db, u); });

  // deep-link от мастера: /start m1024
  const mcode = payload.match(/^m(\d{4})$/i);
  if (mcode && me.role === 'client') {
    let master, link;
    api.mutate(db => {
      master = db.masters.find(m => m.code === mcode[1]);
      if (!master) return;
      link = db.links.find(l => l.c === me.p.id && l.m === master.id);
      if (!link) { link = { id: uid(db, 'l'), c: me.p.id, m: master.id, st: 'wait', msg: 'по ссылке' }; db.links.push(link); }
      else if (link.st !== 'ok') { link.st = 'wait'; link.msg = 'по ссылке'; link.tgMsg = false; }
    });
    if (!master) return send(msg.chat.id, 'Мастер с таким кодом не найден.', appBtn());
    if (link.st === 'ok') return send(msg.chat.id, `Вы уже привязаны к мастеру ${master.name}.`, appBtn());
    return send(msg.chat.id,
      `Заявка мастеру ${master.name} (${master.spec}) отправлена — откройте приложение, чтобы добавить комментарий и следить за ответом.`,
      appBtn());
  }

  await send(msg.chat.id,
    me.role === 'master'
      ? `Здравствуйте, ${me.p.name}! Вы вошли как мастер (${me.p.spec}, код ${me.p.code}).`
      : `Здравствуйте, ${me.p.name}! Записывайтесь к своим мастерам в приложении.`,
    appBtn());
}

async function onCallback(api, cb) {
  const m = (cb.data || '').match(/^l:(\w+):(ok|no)$/);
  if (!m) return;
  const [, lid, ans] = m;
  let link, client, master;
  api.mutate(db => {
    link = db.links.find(l => l.id === lid);
    if (!link || link.st !== 'wait') return;
    link.st = ans;
    client = db.clients.find(c => c.id === link.c);
    master = db.masters.find(x => x.id === link.m);
    note(db, link.c, ans === 'ok'
      ? `${master.name} принял вашу заявку — теперь можно записываться`
      : `${master.name} отклонил заявку`);
  });
  await call('answerCallbackQuery', { callback_query_id: cb.id, text: ans === 'ok' ? 'Принято' : 'Отклонено' });
  if (link && master) {
    await call('editMessageText', {
      chat_id: cb.message.chat.id, message_id: cb.message.message_id,
      text: `${client?.name || 'Клиент'} — заявка ${ans === 'ok' ? 'принята ✅' : 'отклонена ❌'}`,
    });
  }
}

// ── периодика: заявки, уведомления, брони, напоминания ──────
async function pump(api) {
  const jobs = [];
  api.mutate(db => {
    // 1. новые заявки → сообщение мастеру с кнопками
    for (const l of db.links) {
      if (l.st !== 'wait' || l.tgMsg) continue;
      const m = db.masters.find(x => x.id === l.m);
      const c = db.clients.find(x => x.id === l.c);
      if (!m?.tgId || !c) continue;
      l.tgMsg = true;
      jobs.push(() => send(m.tgId,
        `Новая заявка на присоединение: ${c.name} ${c.tg || ''}${l.msg ? `\nКомментарий: «${l.msg}»` : ''}`,
        { inline_keyboard: [[
          { text: '✅ Принять', callback_data: `l:${l.id}:ok` },
          { text: '❌ Отклонить', callback_data: `l:${l.id}:no` },
        ]] }));
    }
    // 2. уведомления → личка
    for (const n of db.notes) {
      if (n.sent) continue;
      const p = person(db, n.to);
      if (!p?.tgId) { n.sent = 'skip'; continue; }
      n.sent = true;
      jobs.push(() => send(p.tgId, n.text, appBtn('Открыть')));
    }
    // 3. сгорание броней
    const t = Date.now();
    for (const r of db.reqs) {
      if (r.st !== 'offered') continue;
      const offs = db.offs.filter(o => o.r === r.id);
      let dead = false;
      for (const o of offs) if (o.st === 'res' && o.until && o.until < t) { o.st = 'exp'; dead = true; }
      if (dead && !offs.some(o => o.st === 'res')) {
        r.st = 'wait';
        const m = db.masters.find(x => x.id === r.m);
        note(db, r.c, `Бронь времени у ${m?.name || 'мастера'} сгорела — мастер предложит другое`);
      }
    }
    // 4. напоминания клиентам
    for (const r of db.reqs) {
      if (r.st !== 'ok') continue;
      const o = db.offs.find(x => x.r === r.id && x.st === 'ok');
      const c = db.clients.find(x => x.id === r.c);
      const m = db.masters.find(x => x.id === r.m);
      if (!o || !c) continue;
      const left = o.start - t;
      const marks = [['r30', 30, '30 минут'], ['r60', 60, '1 час'], ['r1440', 1440, '24 часа']]
        .filter(([k]) => c.rem?.[k])
        .concat((c.rem?.cust || []).filter(x => x.on).map(x => ['c' + (x.h * 60 + x.m), x.h * 60 + x.m,
          (x.h ? x.h + ' ч' : '') + (x.m ? ' ' + x.m + ' мин' : '').trim() || '0 мин']));
      for (const [k, min, label] of marks) {
        const flag = 'rem_' + k;
        if (left > 0 && left <= min * 60e3 && !o[flag]) {
          o[flag] = true;
          note(db, r.c, `Напоминание: через ${label} запись у ${m?.name} (${new Date(o.start).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })})`);
        }
      }
    }
  });
  for (const j of jobs) await j().catch(e => console.log('[bot] send err:', e.message));
}

// ── main ────────────────────────────────────────────────────
async function poll(api, offset) {
  try {
    const r = await fetch(`${API}/getUpdates`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ offset, timeout: 25, allowed_updates: ['message', 'callback_query'] }),
    });
    const j = await r.json();
    if (!j.ok) { console.log('[bot] getUpdates:', j.description); await new Promise(r => setTimeout(r, 5000)); return offset; }
    for (const u of j.result) {
      offset = u.update_id + 1;
      try {
        if (u.message) await onMessage(api, u.message);
        if (u.callback_query) await onCallback(api, u.callback_query);
      } catch (e) { console.log('[bot] update err:', e.message); }
    }
  } catch (e) {
    console.log('[bot] poll err:', e.message);
    await new Promise(r => setTimeout(r, 5000));
  }
  return offset;
}

async function start(api) {
  if (!TOKEN) { console.log('[bot] нет токена — положите его в data/bot.token или MASTER_BOT_TOKEN'); return; }
  const meInfo = await call('getMe');
  if (!meInfo.ok) { console.log('[bot] getMe failed:', meInfo.description); return; }
  console.log(`[bot] @${meInfo.result.username} слушает обновления`);
  setInterval(() => pump(api).catch(e => console.log('[bot] pump err:', e.message)), 3000);
  let offset = 0;
  while (true) offset = await poll(api, offset);
}

module.exports = { start };
