// seed-данные «Мастера Дубны» — общий файл для webapp и сервера.
// В браузере: window.seedData(). На сервере: require('./seed.js')().
(function () {
  const pad = n => String(n).padStart(2, '0');
  const dkey = i => { const d = new Date(); d.setDate(d.getDate() + i); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
  const ts = (k, hm) => new Date(k + 'T' + hm + ':00').getTime();
  const now = () => Date.now();

  function seedData() {
    const DAYS = []; for (let i = 0; i < 14; i++) DAYS.push({ k: dkey(i), i });
    const days = spec => Object.fromEntries(DAYS.map(d => [d.k, spec[d.i] || { on: false }]));
    return {
      masters: [
        { id: 'm1', code: '1024', name: 'Анна Соколова', spec: 'Маникюр', phone: '+7 916 111-11-11', tg: '@anna_nails',
          tz: 'Europe/Moscow', horizon: 6, ttlH: 3, ttlM: 0, step: 30, cancelH: 12,
          days: days([{on:true,from:'10:00',to:'18:00'},{on:true,from:'10:00',to:'18:00',brk:[{f:'13:00',t:'14:00'}]},{on:true,from:'10:00',to:'18:00'},{on:true,from:'10:00',to:'16:00'},{on:false},{on:true,from:'10:00',to:'18:00'},{on:true,from:'10:00',to:'18:00'},{on:false},{on:false},{on:false}]) },
        { id: 'm2', code: '2048', name: 'Игорь Ветров', spec: 'Барбер', phone: '+7 916 222-22-22', tg: '@igor_cut',
          tz: 'Europe/Moscow', horizon: 4, ttlH: 6, ttlM: 0, step: 60, cancelH: 24,
          days: days([{on:false},{on:true,from:'12:00',to:'20:00'},{on:true,from:'12:00',to:'20:00'},{on:true,from:'12:00',to:'20:00'},{on:false},{on:false},{on:true,from:'12:00',to:'20:00'},{on:true,from:'12:00',to:'20:00'},{on:false},{on:false}]) },
        { id: 'm3', code: '4096', name: 'Мария Лебедева', spec: 'Массаж', phone: '+7 916 333-33-33', tg: '@maria_massage',
          tz: 'Europe/Moscow', horizon: 8, ttlH: 1, ttlM: 30, step: 30, cancelH: 0,
          days: days([{on:true,from:'09:00',to:'14:00'},{on:false},{on:true,from:'09:00',to:'14:00'},{on:true,from:'09:00',to:'14:00'},{on:false},{on:false},{on:false},{on:true,from:'09:00',to:'14:00'},{on:false},{on:false}]) },
        { id: 'm4', code: '8192', name: 'Валентин', spec: 'Бармен', phone: '', tg: '@Doub1eVV',
          tz: 'Europe/Moscow', horizon: 7, ttlH: 2, ttlM: 0, step: 30, cancelH: 12,
          days: days([{on:true,from:'14:00',to:'22:00'},{on:true,from:'14:00',to:'22:00'},{on:true,from:'14:00',to:'22:00',brk:[{f:'18:00',t:'18:30'}]},{on:false},{on:false},{on:true,from:'14:00',to:'22:00'},{on:false},{on:false},{on:false},{on:false}]) },
      ],
      clients: [
        { id: 'c1', name: 'Валентин', phone: '+7 900 100-20-30', tg: '@Doub1eVV', rem: { r30: true, r60: true, r1440: false } },
        { id: 'c2', name: 'Ольга Смирнова', phone: '+7 900 200-30-40', tg: '@olga_s', rem: { r30: false, r60: true, r1440: true } },
        { id: 'c3', name: 'Дмитрий Ким', phone: '+7 900 300-40-50', tg: '@dmitry_k', rem: { r30: true, r60: false, r1440: true } },
      ],
      links: [
        { id: 'l1', c: 'c1', m: 'm1', st: 'ok' }, { id: 'l2', c: 'c1', m: 'm3', st: 'ok' }, { id: 'l3', c: 'c1', m: 'm2', st: 'wait' },
        { id: 'l4', c: 'c2', m: 'm1', st: 'ok' }, { id: 'l5', c: 'c2', m: 'm2', st: 'ok' },
        { id: 'l6', c: 'c3', m: 'm2', st: 'ok' }, { id: 'l7', c: 'c3', m: 'm3', st: 'wait' },
      ],
      reqs: [
        { id: 'r1', c: 'c2', m: 'm1', date: dkey(1), svc: 'Маникюр с покрытием', wish: 'в первой половине дня', st: 'ok' },
        { id: 'r2', c: 'c1', m: 'm1', date: dkey(2), svc: 'Гель-лак, френч', wish: 'до обеда', st: 'ok' },
        { id: 'r3', c: 'c2', m: 'm1', date: dkey(3), svc: 'Коррекция', wish: '', st: 'ok' },
        { id: 'r4', c: 'c3', m: 'm2', date: dkey(2), svc: 'Стрижка + борода', wish: '', st: 'ok' },
        { id: 'r5', c: 'c2', m: 'm2', date: dkey(3), svc: 'Стрижка', wish: 'после 16:00', st: 'ok' },
        { id: 'r6', c: 'c1', m: 'm3', date: dkey(3), svc: 'Массаж спины', wish: 'утром', st: 'ok' },
        { id: 'r7', c: 'c1', m: 'm1', date: dkey(1), svc: 'Наращивание, нужна консультация по длине', wish: 'после 14:00', st: 'offered' },
        { id: 'r8', c: 'c2', m: 'm1', date: dkey(1), svc: 'Педикюр', wish: 'до 16:00', st: 'wait' },
        { id: 'r9', c: 'c3', m: 'm2', date: dkey(2), svc: 'Стрижка под машинку', wish: '', st: 'wait' },
      ],
      offs: [
        { id: 'o1', r: 'r1', start: ts(dkey(1), '12:00'), dur: 90, until: 0, st: 'ok' },
        { id: 'o2', r: 'r2', start: ts(dkey(2), '11:00'), dur: 60, until: 0, st: 'ok' },
        { id: 'o3', r: 'r3', start: ts(dkey(3), '15:00'), dur: 60, until: 0, st: 'ok' },
        { id: 'o4', r: 'r4', start: ts(dkey(2), '13:00'), dur: 60, until: 0, st: 'ok' },
        { id: 'o5', r: 'r5', start: ts(dkey(3), '17:00'), dur: 60, until: 0, st: 'ok' },
        { id: 'o6', r: 'r6', start: ts(dkey(3), '10:00'), dur: 60, until: 0, st: 'ok' },
        { id: 'o7', r: 'r7', start: ts(dkey(1), '14:00'), dur: 60, until: now() + 3 * 3600e3, st: 'res' },
        { id: 'o8', r: 'r7', start: ts(dkey(1), '16:30'), dur: 60, until: now() + 3 * 3600e3, st: 'res' },
      ],
      notes: [
        { to: 'c1', text: 'Анна Соколова предложила время на завтра — выберите!', ts: now() - 3600e3, seen: false },
        { to: 'm1', text: 'Новый запрос от Ольги Смирновой на завтра', ts: now() - 1800e3, seen: false },
      ],
      seq: 100,
    };
  }

  if (typeof module !== 'undefined') module.exports = seedData;
  else window.seedData = seedData;
})();
