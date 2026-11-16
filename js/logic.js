// Pure business rules of the partner cabinet. No DOM, no storage: tested by tests/logic.test.mjs.

export const STATUS = {
  draft: { label: 'Черновик', tone: 'muted' },
  saved: { label: 'Не отправлен', tone: 'neutral' },
  courier: { label: 'Ждёт курьера', tone: 'warn' },
  transit: { label: 'В пути', tone: 'warn' },
  lab: { label: 'В лаборатории', tone: 'blue' },
  partial: { label: 'Частично готов', tone: 'teal' },
  done: { label: 'Выполнен', tone: 'ok' },
  retake: { label: 'Перезабор', tone: 'stop' },
  cancelled: { label: 'Отменён', tone: 'muted' },
};

/* ---------- formatting ---------- */

const NBSP = ' ';
export const money = (n) => `${Math.round(n).toLocaleString('ru-RU').replace(/\s/g, NBSP)}${NBSP}₽`;

export function plural(n, one, few, many) {
  const m10 = n % 10,
    m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return one;
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few;
  return many;
}

export const pad = (n) => String(n).padStart(2, '0');
export const isoDate = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export function fromIso(iso) {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
  return new Date(y, m - 1, d);
}
export const fmtDate = (iso) => (iso ? `${iso.slice(8, 10)}.${iso.slice(5, 7)}.${iso.slice(0, 4)}` : '');
export const fmtTime = (iso) => (iso && iso.length > 10 ? iso.slice(11, 16) : '');
export function addDays(iso, n) {
  const d = fromIso(iso);
  d.setDate(d.getDate() + n);
  return isoDate(d);
}
export function addWorkdays(iso, n) {
  const d = fromIso(iso);
  while (n > 0) {
    d.setDate(d.getDate() + 1);
    if (d.getDay() !== 0 && d.getDay() !== 6) n--;
  }
  return isoDate(d);
}
export const shortName = (p) =>
  `${p.last || 'Без фамилии'}${p.first ? ` ${p.first[0]}.` : ''}${p.middle ? ` ${p.middle[0]}.` : ''}`;
export const fullName = (p) => [p.last, p.first, p.middle].filter(Boolean).join(' ');

/* ---------- date input without dots (ТЗ п. 10) ---------- */

// Accepts what a person types: "01021990", "1.2.1990", "01-02-1990", "1990-02-01".
// Returns the display string with dots inserted as the user types.
export function maskDate(raw) {
  const iso = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) return `${iso[3]}.${iso[2]}.${iso[1]}`;
  const sep = raw.match(/^(\d{1,2})[.\-/ ](\d{1,2})[.\-/ ](\d{2,4})$/);
  if (sep) return `${pad(sep[1])}.${pad(sep[2])}.${sep[3]}`;
  const digits = raw.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}.${digits.slice(2)}`;
  return `${digits.slice(0, 2)}.${digits.slice(2, 4)}.${digits.slice(4)}`;
}

// display "dd.mm.yyyy" -> { iso } or { error }
export function parseDate(display) {
  const m = display.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
  if (!m) return { error: display ? 'Введите дату полностью: ДД.ММ.ГГГГ' : '' };
  const [d, mo, y] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const dt = new Date(y, mo - 1, d);
  if (dt.getFullYear() !== y || dt.getMonth() !== mo - 1 || dt.getDate() !== d) {
    return { error: 'Такой даты нет в календаре' };
  }
  return { iso: isoDate(dt) };
}

export function ageYears(dobIso, todayIso) {
  const [y, m, d] = dobIso.split('-').map(Number);
  const [ty, tm, td] = todayIso.split('-').map(Number);
  return ty - y - (tm < m || (tm === m && td < d) ? 1 : 0);
}

export function validateDob(display, todayIso) {
  const r = parseDate(display);
  if (r.error !== undefined) return r.error || 'Укажите дату рождения';
  if (r.iso > todayIso) return 'Дата рождения в будущем';
  if (ageYears(r.iso, todayIso) > 120) return 'Проверьте год рождения';
  return '';
}

export const maskPhone = (raw) => {
  let d = raw.replace(/\D/g, '');
  if (d.startsWith('8')) d = '7' + d.slice(1);
  if (!d.startsWith('7')) d = '7' + d;
  d = d.slice(0, 11);
  const p = [d.slice(1, 4), d.slice(4, 7), d.slice(7, 9), d.slice(9, 11)];
  let out = '+7';
  if (p[0]) out += ` (${p[0]}`;
  if (p[0].length === 3) out += ')';
  if (p[1]) out += ` ${p[1]}`;
  if (p[2]) out += `-${p[2]}`;
  if (p[3]) out += `-${p[3]}`;
  return raw.trim() === '' ? '' : out;
};

/* ---------- preanalytics tied to tests (ТЗ п. 11) ---------- */

// Each test lists allowed biomaterials in `bm` (first = default); the form lets the user pick
// one when there are alternatives. Tests that share a tube type AND a pool (same lab department)
// share tubes: the larger qty wins. Different pools always need their own tubes.
// Упрощение: pooling rule is a demo model; real rules come from the lab LIS per test.
export const bmOf = (test, choice = {}) => test.bm.find((b) => b.tube === choice[test.code]) || test.bm[0];

export function aggregateTubes(codes, catalog, choice = {}) {
  const byKey = new Map();
  for (const code of codes) {
    const t = catalog.find((x) => x.code === code);
    if (!t) continue;
    const b = bmOf(t, choice);
    const key = `${b.tube}|${b.pool}`;
    const cur = byKey.get(key) || { tube: b.tube, qty: 0, codes: [] };
    cur.qty = Math.max(cur.qty, b.qty);
    cur.codes.push(code);
    byKey.set(key, cur);
  }
  const byTube = new Map();
  for (const g of byKey.values()) {
    const cur = byTube.get(g.tube) || { tube: g.tube, qty: 0, codes: [] };
    cur.qty += g.qty;
    cur.codes.push(...g.codes);
    byTube.set(g.tube, cur);
  }
  return [...byTube.values()];
}

// Tubes for the whole order: the patient (who 0) plus extra participants (paternity etc.).
export function orderTubeGroups(codes, catalog, choice = {}, participants = []) {
  const groups = aggregateTubes(codes, catalog, choice).map((g) => ({ ...g, who: 0 }));
  participants.forEach((p, i) => {
    const t = catalog.find((x) => x.code === p.forCode);
    if (!t || !codes.includes(p.forCode)) return;
    const b = bmOf(t, choice);
    groups.push({ tube: b.tube, qty: b.qty, codes: [p.forCode], who: i + 1 });
  });
  return groups;
}

// Barcode for each physical tube: order number + tube index (7 digits).
export function tubeBarcodes(orderNum, groups) {
  const out = [];
  let i = 1;
  for (const t of groups)
    for (let k = 0; k < t.qty; k++) out.push({ tube: t.tube, who: t.who || 0, code: `${orderNum}${pad(i++)}` });
  return out;
}

/* ---------- prices ---------- */

export function priceOf(test, promos, todayIso) {
  const p = promos.find((x) => x.codes.includes(test.code) && x.until >= todayIso && x.pct);
  return p
    ? { price: Math.round(test.price * (1 - p.pct / 100)), base: test.price, promo: p }
    : { price: test.price, base: test.price };
}

// A test auto-added by another one (`adds`) is part of that bundle and is not charged separately.
export const bundledIn = (code, codes, catalog) =>
  catalog.find((t) => codes.includes(t.code) && t.adds?.includes(code));

export function orderTotal(codes, catalog, promos, todayIso) {
  return codes.reduce((s, c) => {
    const t = catalog.find((x) => x.code === c);
    return t && !bundledIn(c, codes, catalog) ? s + priceOf(t, promos, todayIso).price : s;
  }, 0);
}

/* ---------- what the clinic may do with an order ---------- */

// ТЗ п. 6: edit after save and until the courier is called.
export function editLock(order) {
  if (order.source === 'paper') return 'Заказ поступил на бумажном бланке. Изменить его может менеджер.';
  if (order.status === 'courier') return 'Курьер уже вызван. Отмените вызов, чтобы изменить заказ.';
  if (order.status === 'cancelled') return 'Заказ отменён.';
  if (!['draft', 'saved'].includes(order.status)) return 'Биоматериал уже у лаборатории, заказ изменить нельзя.';
  return '';
}

export const canEdit = (order) => editLock(order) === '';
export const canCallCourier = (order) => order.status === 'saved' && order.tubes.length > 0;
export const canCancel = (order) => order.source === 'lkp' && ['draft', 'saved', 'courier'].includes(order.status);
export const canPrint = (order) => order.status !== 'draft' && order.status !== 'cancelled';
export const hasResults = (order) => order.tests.some((t) => t.resultAt);

export function rawDataEligible(order, catalog) {
  if (!['done', 'partial'].includes(order.status) || order.rawDataOrderId) return false;
  return order.tests.some((t) => t.resultAt && catalog.find((c) => c.code === t.code)?.rawData);
}

// Results page status (ТЗ п. 8: no "оплачен"): only readiness.
export function resultStatus(order) {
  const ready = order.tests.filter((t) => t.resultAt).length;
  if (ready === 0) return { key: 'wait', label: 'Ожидается', tone: 'neutral' };
  if (ready < order.tests.length)
    return { key: 'partial', label: `Готово ${ready} из ${order.tests.length}`, tone: 'teal' };
  return { key: 'ready', label: 'Готово', tone: 'ok' };
}

/* ---------- search ---------- */

export const norm = (s) =>
  s
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/[^a-zа-я0-9]+/g, ' ')
    .trim();

export function matchTest(test, q) {
  const n = norm(q);
  if (!n) return true;
  const hay = norm(
    `${test.code} ${test.name} ${test.short} ${(test.genes || []).join(' ')} ${(test.aka || []).join(' ')}`,
  );
  return n.split(' ').every((w) => hay.includes(w));
}

export function matchOrder(order, q, catalog) {
  const n = norm(q);
  if (!n) return true;
  const names = order.tests.map((t) => catalog.find((c) => c.code === t.code)?.short || '').join(' ');
  const codes = order.tests.map((t) => t.code).join(' ');
  const hay = norm(
    `${order.id} ${order.num} ${fullName(order.patient)} ${names} ${codes} ${order.tubes.map((t) => t.code).join(' ')}`,
  );
  return n.split(' ').every((w) => hay.includes(w));
}

/* ---------- CSV export for Excel ---------- */

export function toCsv(rows) {
  const esc = (v) => {
    const s = String(v ?? '');
    return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  // BOM + semicolons: Russian-locale Excel opens it in columns without an import dialog.
  return '\uFEFF' + rows.map((r) => r.map(esc).join(';')).join('\r\n');
}

/* ---------- NIPT form rules (taken from the current ЛКП form, shown as explanations, not silent blocks) ---------- */

export function prenatalErrors(c) {
  const e = {};
  if (c.weeks === '' || c.weeks === undefined) e.weeks = 'Укажите срок по УЗИ';
  else if (Number(c.weeks) < 10)
    e.weeks = 'НИПТ оформляется со срока 10 недель по УЗИ. Пациентку можно записать позже.';
  else if (Number(c.weeks) > 40) e.weeks = 'Проверьте срок: больше 40 недель';
  if (c.days !== '' && c.days !== undefined && (Number(c.days) < 0 || Number(c.days) > 6)) e.days = 'Дни: от 0 до 6';
  if (!c.weight) e.weight = 'Укажите вес';
  if (!c.height) e.height = 'Укажите рост';
  if (!c.fetuses) e.fetuses = 'Выберите вариант';
  else if (c.fetuses === 'multi')
    e.fetuses = 'При многоплодной беременности этот тест не оформляется. Уточните альтернативу у менеджера.';
  if (!c.reduction) e.reduction = 'Выберите вариант';
  else if (c.reduction === 'yes') e.reduction = 'После редукции эмбриона тест не оформляется.';
  if (!c.transplant) e.transplant = 'Выберите вариант';
  else if (c.transplant === 'yes')
    e.transplant = 'После пересадки костного мозга или стволовых клеток тест не оформляется.';
  if (!c.donor) e.donor = 'Выберите вариант';
  if (!c.sexFetus) e.sexFetus = 'Выберите вариант';
  return e;
}

/* ---------- courier rules (from the current ЛКП instruction) ---------- */

// Same-day pickup only when the request is made before 13:00; no weekends.
export const COURIER_CUTOFF = 13;
export function courierDateError(iso, todayIso, hourNow) {
  if (!iso) return 'Выберите дату';
  if (iso < todayIso) return 'Дата уже прошла';
  const day = fromIso(iso).getDay();
  if (day === 0 || day === 6) return 'Курьеры не выезжают в выходные';
  if (iso === todayIso && hourNow >= COURIER_CUTOFF)
    return `Заявки на сегодня принимаются до ${COURIER_CUTOFF}:00. Выберите завтрашний день`;
  return '';
}

/* ---------- bundles: the lab adds some tests automatically (1724 brings 1681) ---------- */
export function addTest(codes, code, catalog) {
  if (codes.includes(code)) return codes;
  const out = [...codes, code];
  for (const a of catalog.find((t) => t.code === code)?.adds || []) if (!out.includes(a)) out.push(a);
  return out;
}
export function removeTest(codes, code, catalog) {
  let out = codes.filter((c) => c !== code);
  for (const a of catalog.find((t) => t.code === code)?.adds || []) {
    if (!out.some((c) => catalog.find((t) => t.code === c)?.adds?.includes(a))) out = out.filter((c) => c !== a);
  }
  return out;
}
