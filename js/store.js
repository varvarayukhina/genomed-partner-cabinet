// App state: demo data in localStorage, actions mutate it and notify subscribers.
import { useEffect, useReducer } from './vendor/preact-htm.js';
import { seed, CATALOG, RAW_DATA, CONSUMABLES } from './data.js';
import { isoDate, orderTubeGroups, tubeBarcodes, fmtDate } from './logic.js';

const KEY = 'genomed-lkp-demo-v1';
export const TODAY = isoDate(new Date());
export const nowStamp = () => {
  const d = new Date();
  return `${isoDate(d)}T${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

function load() {
  let raw = null;
  try {
    raw = localStorage.getItem(KEY);
  } catch (e) {
    console.warn('localStorage недоступен, демо работает без сохранения:', e);
  }
  if (raw) {
    try {
      const s = JSON.parse(raw);
      if (s.seededFor === TODAY) return s;
    } catch (e) {
      console.warn('Повреждённые демо-данные, пересоздаю:', e);
    }
  }
  return { ...seed(TODAY), seededFor: TODAY };
}

let state = load();
const subs = new Set();

function persist() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch (e) {
    console.warn('Не удалось сохранить демо-данные:', e);
  }
}

export const getState = () => state;
export function update(fn) {
  fn(state);
  persist();
  subs.forEach((f) => f());
}
export function useStore() {
  const [, force] = useReducer((x) => x + 1, 0);
  useEffect(() => {
    subs.add(force);
    return () => subs.delete(force);
  }, []);
  return state;
}
export function resetDemo() {
  state = { ...seed(TODAY), seededFor: TODAY };
  persist();
  subs.forEach((f) => f());
}

export const findOrder = (id) => state.orders.find((o) => o.id === id);
export const testByCode = (code) => (code === RAW_DATA.code ? RAW_DATA : CATALOG.find((t) => t.code === code));
const log = (o, text) => o.history.push({ at: nowStamp(), text });

/* ---------- counters for sidebar badges ---------- */
export function counters(s = state) {
  const live = s.orders.filter((o) => o.status !== 'cancelled');
  return {
    toSend: live.filter((o) => o.status === 'saved' || o.status === 'draft').length,
    retakes: s.orders.filter((o) => o.status === 'retake' && !o.retake?.resolvedBy).length,
    newResults: live.filter((o) => o.tests.some((t) => t.resultAt) && !o.resultsSeen).length,
    unread: s.notifications.filter((n) => !n.read).length,
  };
}

/* ---------- orders ---------- */

// form: { patient, codes, bm, participants, clinical, collectedAt, doctor, comment, card, files, editId?, retakeOf? }
const fields = (f) => ({
  patient: { ...f.patient }, clinical: { ...f.clinical }, bm: { ...f.bm }, participants: f.participants.map((x) => ({ ...x })),
  collectedAt: f.collectedAt, doctor: f.doctor, comment: f.comment, card: f.card, files: [...(f.files || [])],
});
const tubesFor = (num, f) => tubeBarcodes(num, orderTubeGroups(f.codes, CATALOG, f.bm, f.participants));
export function saveOrder(form, asDraft = false) {
  let order;
  update((s) => {
    if (form.editId) {
      order = s.orders.find((o) => o.id === form.editId);
      const before = order.tests.map((t) => t.code).join(',');
      Object.assign(order, fields(form), { tests: form.codes.map((code) => ({ code, resultAt: '' })), status: asDraft ? 'draft' : 'saved' });
      order.tubes = asDraft ? [] : tubesFor(order.num, form);
      log(order, before !== form.codes.join(',') ? 'Заказ изменён: обновлён состав исследований — перепечатайте этикетки' : 'Заказ изменён');
    } else {
      const num = s.nextNum++;
      order = {
        id: `ЗК-${num}`, num, source: 'lkp', status: asDraft ? 'draft' : 'saved', createdAt: nowStamp(),
        ...fields(form), tests: form.codes.map((code) => ({ code, resultAt: '' })), history: [], resultsSeen: true,
        tubes: asDraft ? [] : tubesFor(num, form),
      };
      log(order, asDraft ? 'Черновик сохранён' : 'Заказ создан в кабинете');
      if (form.retakeOf) {
        const old = s.orders.find((o) => o.id === form.retakeOf);
        old.retake.resolvedBy = order.id;
        order.retakeOf = old.id;
        log(old, `Оформлен перезабор: ${order.id}`);
        log(order, `Перезабор по ${old.id}`);
      }
      s.orders.unshift(order);
    }
    s.formDraft = null;
  });
  return order;
}

export function declineRetake(id) {
  update((s) => {
    const o = s.orders.find((x) => x.id === id);
    o.status = 'cancelled';
    o.retake.declined = true;
    log(o, 'Клиника отказалась от перезабора');
  });
}

export function markPrinted(order, what) {
  update(() => log(findOrder(order.id), `Распечатано: ${what}`));
}

export function cancelOrder(id, reason) {
  update((s) => {
    const o = s.orders.find((x) => x.id === id);
    if (o.status === 'courier') detachFromCourier(s, o);
    o.status = 'cancelled';
    log(o, `Заказ отменён${reason ? `: ${reason}` : ''}`);
  });
}

function detachFromCourier(s, o) {
  const c = s.couriers.find((x) => x.status === 'planned' && x.orderIds.includes(o.id));
  if (c) c.orderIds = c.orderIds.filter((x) => x !== o.id);
}

export function requestRawData(id, formats, email) {
  let addon;
  update((s) => {
    const parent = s.orders.find((o) => o.id === id);
    const num = s.nextNum++;
    addon = {
      id: `ЗК-${num}`, num, source: 'lkp', status: 'lab', addon: true, parentId: parent.id, createdAt: nowStamp(), collectedAt: '',
      patient: { ...parent.patient }, tests: [{ code: RAW_DATA.code, resultAt: '' }], clinical: {}, bm: {}, participants: [], card: '', doctor: parent.doctor,
      comment: `Форматы: ${formats.join(', ')}. Отправить на ${email}`, tubes: [], resultsSeen: true, history: [],
    };
    log(addon, `Дозаказ к ${parent.id}: выдача сырых данных — принят в работу сразу, без черновика`);
    parent.rawDataOrderId = addon.id;
    log(parent, `Дозаказаны сырые данные: ${addon.id}`);
    s.orders.unshift(addon);
  });
  return addon;
}

export function markResultsSeen(ids) {
  update((s) => s.orders.forEach((o) => ids.includes(o.id) && (o.resultsSeen = true)));
}

/* ---------- courier ---------- */

export function callCourier({ date, slot, address, orderIds, boxes, thermo, comment, supplies, paper = 0 }) {
  let call;
  update((s) => {
    const num = 3121 + s.couriers.filter((c) => c.id >= 'К-3121').length;
    call = { id: `К-${num}`, date, slot, address, orderIds, status: 'planned', boxes, thermo, comment, paper };
    s.couriers.unshift(call);
    for (const id of orderIds) {
      const o = s.orders.find((x) => x.id === id);
      o.status = 'courier';
      log(o, `Вызван курьер на ${fmtDate(date)}, ${slot}`);
    }
    if (supplies?.length) {
      const sup = addSupplies(s, supplies, call.id);
      call.consumablesId = sup.id;
    }
  });
  return call;
}

export function cancelCourier(id) {
  update((s) => {
    const c = s.couriers.find((x) => x.id === id);
    c.status = 'cancelled';
    for (const oid of c.orderIds) {
      const o = s.orders.find((x) => x.id === oid);
      if (o?.status === 'courier') {
        o.status = 'saved';
        log(o, 'Вызов курьера отменён — заказ снова можно редактировать');
      }
    }
  });
}

/* ---------- consumables ---------- */

function addSupplies(s, items, courierId, date = '') {
  const sup = { id: `Р-${219 + s.supplies.filter((x) => x.id >= 'Р-219').length}`, createdAt: nowStamp(), items, status: 'planned', withCourier: courierId || '', date };
  s.supplies.unshift(sup);
  return sup;
}

export function orderSupplies(items, courierId, date) {
  let sup;
  update((s) => {
    sup = addSupplies(s, items, courierId, date);
    if (courierId) s.couriers.find((c) => c.id === courierId).consumablesId = sup.id;
  });
  return sup;
}

// Usage hint: tubes used by the clinic's orders over the last 30 days.
export function monthlyTubeUse(s = state) {
  const from = new Date();
  from.setDate(from.getDate() - 30);
  const fromIso = isoDate(from);
  const use = {};
  for (const o of s.orders) {
    if (o.createdAt.slice(0, 10) < fromIso || o.status === 'cancelled') continue;
    for (const t of o.tubes) use[t.tube] = (use[t.tube] || 0) + 1;
  }
  return use;
}
export const supplyById = (id) => CONSUMABLES.find((c) => c.id === id);

/* ---------- notifications & settings ---------- */

export const markRead = (id) => update((s) => s.notifications.forEach((n) => (id === 'all' || n.id === id) && (n.read = true)));
export const setSetting = (k, v) => update((s) => (s.settings[k] = v));
export const saveFormDraft = (form) => update((s) => (s.formDraft = { ...form, savedAt: nowStamp() }));
export const clearFormDraft = () => update((s) => (s.formDraft = null));
