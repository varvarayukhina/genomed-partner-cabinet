// Курьер и расходные материалы (ТЗ п. 3).
import { useState, useEffect } from '../vendor/preact-htm.js';
import { html, Icon, Field, DateField, Chip, toast, go, Empty, TubeDot } from '../ui.js';
import {
  useStore,
  callCourier,
  cancelCourier,
  orderSupplies,
  monthlyTubeUse,
  supplyById,
  findOrder,
  TODAY,
} from '../store.js';
import { CONSUMABLES, TUBES } from '../data.js';
import {
  fmtDate,
  plural,
  shortName,
  courierDateError,
  maskPhone,
  addWorkdays,
  fromIso,
  COURIER_CUTOFF,
} from '../logic.js';

const SLOTS = ['08:00–12:00', '10:00–14:00', '12:00–16:00', '14:00–18:00'];
const CALL_STATUS = { planned: ['Запланирован', 'blue'], done: ['Выполнен', 'ok'], cancelled: ['Отменён', 'muted'] };
const firstWorkday = (hour) => {
  const wd = [1, 2, 3, 4, 5].includes(fromIso(TODAY).getDay());
  return wd && hour < COURIER_CUTOFF ? TODAY : addWorkdays(TODAY, 1);
};
const when = (iso) =>
  iso === TODAY
    ? 'сегодня'
    : iso === addWorkdays(TODAY, 1) && fromIso(iso) - fromIso(TODAY) <= 864e5
      ? 'завтра'
      : fmtDate(iso);

function PlannedCall({ c }) {
  const s = useStore();
  const sup = s.supplies.find((x) => x.id === c.consumablesId);
  return html`<div class="rowi">
    <div>
      <div class="rowi__title">
        <${Icon} name="truck" />Курьер приедет ${when(c.date)},${' '}
        <span class="mono">${fmtDate(c.date)} · ${c.slot}</span> <${Chip} tone="blue">${c.id}<//>
      </div>
      <div class="rowi__text">${s.clinic.addresses[c.address]}</div>
      <div class="rowi__text">
        Заберёт:
        ${' '}${c.orderIds.length
          ? c.orderIds.map((id, i) => html`${i ? ', ' : ''}<a class="mono" href=${`#/orders/${id}`}>${id}</a>`)
          : 'заказов нет'}${c.paper ? ` + ${c.paper} бумажных направлений` : ''}${c.thermo
          ? ' · нужен термоконтейнер'
          : ''}
      </div>
      ${sup &&
      html`<div class="rowi__text">
        Привезёт расходники ${sup.id}:
        ${' '}${sup.items.map((i) => `${supplyById(i.id).name.split(',')[0]} × ${i.qty}`).join(', ')}
      </div>`}
    </div>
    <div class="rowi__act">
      ${!sup &&
      html`<a class="btn btn--line btn--sm" href=${`#/supplies?courier=${c.id}`}
        ><${Icon} name="package" />Привезти расходники</a
      >`}
      <button
        class="btn btn--danger btn--sm"
        onClick=${() => {
          cancelCourier(c.id);
          toast(`Вызов ${c.id} отменён. Заказы снова можно редактировать.`);
        }}
      >
        Отменить вызов
      </button>
    </div>
  </div>`;
}

export function Delivery({ preselect }) {
  const s = useStore();
  const hour = new Date().getHours();
  const ready = s.orders.filter((o) => o.status === 'saved');
  const [f, setF] = useState(() => ({
    address: 0,
    date: firstWorkday(hour),
    slot: SLOTS[1],
    contact: s.settings.contact,
    phone: s.settings.contactPhone,
    orderIds: preselect ? preselect.split(',').filter((id) => ready.some((o) => o.id === id)) : ready.map((o) => o.id),
    paper: 0,
    comment: '',
    supplies: false,
  }));
  const [tried, setTried] = useState(false);
  const set = (p) => setF({ ...f, ...p });
  const sel = ready.filter((o) => f.orderIds.includes(o.id));
  const cold = sel.some((o) => o.tubes.some((t) => t.tube === 'edta'));
  const slotPast = (slot) => f.date === TODAY && Number(slot.slice(0, 2)) <= hour;
  const e = {
    date: courierDateError(f.date, TODAY, hour),
    slot: !f.slot || slotPast(f.slot) ? 'Выберите время, которое ещё не прошло' : '',
    contact: f.contact.trim() ? '' : 'Укажите, кто передаст биоматериал',
    phone: f.phone.replace(/\D/g, '').length === 11 ? '' : 'Нужен телефон для курьера',
    orders: sel.length || f.paper ? '' : 'Выберите заказы или укажите бумажные направления',
  };
  const err = (k) => (tried ? e[k] : '');
  const submit = (ev) => {
    ev.preventDefault();
    if (Object.values(e).some(Boolean)) {
      setTried(true);
      return;
    }
    const c = callCourier({
      date: f.date,
      slot: f.slot,
      address: f.address,
      orderIds: f.orderIds,
      boxes: 1,
      thermo: cold,
      comment: f.comment,
      paper: f.paper,
    });
    toast(`Курьер вызван на ${fmtDate(f.date)}, ${f.slot}. Заявка ${c.id}.`);
    if (f.supplies) go(`#/supplies?courier=${c.id}`);
    else setF({ ...f, orderIds: [], paper: 0, comment: '' });
  };
  const planned = s.couriers.filter((c) => c.status === 'planned');
  return html`<div class="page">
    <div class="page__head">
      <div>
        <h1>Курьер</h1>
        <p class="page__sub">Заявки на сегодня принимаются до ${COURIER_CUTOFF}:00. В выходные курьеры не выезжают.</p>
      </div>
    </div>
    ${planned.length > 0 &&
    html`<section class="card" style="margin-bottom:20px" aria-labelledby="pl-h">
      <div class="card__head"><h2 id="pl-h">Запланированные визиты</h2></div>
      <div class="rows">${planned.map((c) => html`<${PlannedCall} c=${c} />`)}</div>
    </section>`}
    <div class="cols2">
      <form class="card" novalidate onSubmit=${submit} aria-labelledby="new-call">
        <div class="card__head"><h2 id="new-call">Новый вызов</h2></div>
        <div class="fsec">
          <div class="grid2">
            <${Field} label="Адрес отправки" req id="c-addr">
              <select
                id="c-addr"
                class="select"
                value=${f.address}
                onChange=${(ev) => set({ address: Number(ev.target.value) })}
              >
                ${s.clinic.addresses.map((a, i) => html`<option value=${i}>${a}</option>`)}
              </select>
            <//>
            <${Field}
              label="Дата"
              req
              id="c-date"
              error=${err('date') || (e.date && f.date ? e.date : '')}
              hint="Заявки на сегодня принимаются до 13:00"
            >
              <${DateField}
                id="c-date"
                value=${f.date}
                min=${TODAY}
                disableWeekends
                error=${e.date && f.date ? e.date : err('date')}
                onChange=${(iso) => set({ date: iso })}
              />
            <//>
          </div>
          <${Field} label="Время" req id="c-slot" error=${err('slot')}>
            <div class="slots" id="c-slot" role="group" aria-label="Время визита">
              ${SLOTS.map(
                (sl) =>
                  html`<button
                    type="button"
                    aria-pressed=${f.slot === sl}
                    disabled=${slotPast(sl)}
                    onClick=${() => set({ slot: sl })}
                  >
                    ${sl}
                  </button>`,
              )}
            </div>
          <//>
          <div class="grid2">
            <${Field} label="Контактное лицо" req id="c-contact" error=${err('contact')}>
              <input
                id="c-contact"
                class="input"
                value=${f.contact}
                onInput=${(ev) => set({ contact: ev.target.value })}
            /><//>
            <${Field} label="Телефон" req id="c-phone" error=${err('phone')}>
              <input
                id="c-phone"
                class="input mono"
                type="tel"
                value=${f.phone}
                onInput=${(ev) => set({ phone: maskPhone(ev.target.value) })}
            /><//>
          </div>
          <fieldset class="field" style="border:0;padding:0;margin:0">
            <legend class="field__label" style="margin-bottom:6px">Что передать курьеру</legend>
            ${ready.length === 0
              ? html`<p class="muted">Сохранённых заказов нет. Курьера можно вызвать для бумажных направлений.</p>`
              : html`<div class="pick">
                  ${ready.map(
                    (o) =>
                      html`<label>
                        <input
                          type="checkbox"
                          class="check"
                          checked=${f.orderIds.includes(o.id)}
                          onChange=${() =>
                            set({
                              orderIds: f.orderIds.includes(o.id)
                                ? f.orderIds.filter((x) => x !== o.id)
                                : [...f.orderIds, o.id],
                            })}
                        />
                        <span
                          ><span class="mono">${o.id}</span> · ${shortName(o.patient)}<br /><span class="muted"
                            >${o.tests.map((t) => t.code).join(', ')}</span
                          ></span
                        >
                        <span class="muted nowrap"
                          >${o.tubes.length} ${plural(o.tubes.length, 'пробирка', 'пробирки', 'пробирок')}</span
                        ></label
                      >`,
                  )}
                </div>`}
            <div style="display:flex;align-items:center;gap:12px;margin-top:10px;flex-wrap:wrap">
              <span>Бумажных направлений:</span>
              <div class="stepper">
                <button
                  type="button"
                  aria-label="Меньше"
                  disabled=${!f.paper}
                  onClick=${() => set({ paper: f.paper - 1 })}
                >
                  <${Icon} name="minus" />
                </button>
                <output aria-live="polite">${f.paper}</output
                ><button type="button" aria-label="Больше" onClick=${() => set({ paper: f.paper + 1 })}>
                  <${Icon} name="circle-plus" />
                </button>
              </div>
            </div>
            ${err('orders') && html`<div class="field__err"><${Icon} name="triangle-alert" />${e.orders}</div>`}
          </fieldset>
          ${cold &&
          html`<div class="infoline">
            <${Icon} name="info" /><span>В передаче есть пробирки с ЭДТА, курьер возьмёт термоконтейнер.</span>
          </div>`}
          <label class="switch"
            ><input
              type="checkbox"
              checked=${f.supplies}
              onChange=${(ev) => set({ supplies: ev.target.checked })}
            />Привезти с этим курьером расходные материалы</label
          >
          <${Field} label="Комментарий для курьера" id="c-comment">
            <input
              id="c-comment"
              class="input"
              placeholder="Например: вход со двора, позвонить за 15 минут"
              value=${f.comment}
              onInput=${(ev) => set({ comment: ev.target.value })}
          /><//>
          <button type="submit" class="btn btn--primary">
            <${Icon} name="truck" />Вызвать
            курьера${sel.length ? ` · ${sel.length} ${plural(sel.length, 'заказ', 'заказа', 'заказов')}` : ''}
          </button>
        </div>
      </form>
      <section class="card" aria-labelledby="hist-h">
        <div class="card__head"><h2 id="hist-h">История вызовов</h2></div>
        <div class="rows">
          ${s.couriers.map(
            (c) =>
              html`<div class="rowi">
                <div>
                  <div class="rowi__title">
                    <span class="mono">${c.id}</span
                    ><${Chip} tone=${CALL_STATUS[c.status][1]}>${CALL_STATUS[c.status][0]}<//>
                  </div>
                  <div class="rowi__text">
                    <span class="mono">${fmtDate(c.date)} · ${c.slot}</span> · ${c.orderIds.length}
                    ${' '}${plural(c.orderIds.length, 'заказ', 'заказа', 'заказов')}
                  </div>
                </div>
              </div>`,
          )}
        </div>
      </section>
    </div>
  </div>`;
}

/* ---------- Расходные материалы ---------- */

export function Supplies({ courier: courier0, add }) {
  const s = useStore();
  // ?add=id,id from «Заказать тираж»: one pack of each already in the order
  const [qty, setQty] = useState(() => Object.fromEntries((add || '').split(',').filter(Boolean).map((id) => [id, 1])));
  useEffect(() => {
    const g = add && CONSUMABLES.find((c) => c.id === add.split(',')[0])?.group;
    // after the router's scroll-to-top on navigation
    if (g) requestAnimationFrame(() => document.getElementById(`g-${g}`)?.scrollIntoView({ block: 'start' }));
  }, [add]);
  const planned = s.couriers
    .filter((c) => c.status === 'planned' && !c.consumablesId)
    .sort((a, b) => a.date.localeCompare(b.date));
  const [via, setVia] = useState(courier0 || planned[0]?.id || 'separate');
  const [date, setDate] = useState(addWorkdays(TODAY, 2));
  const use = monthlyTubeUse(s);
  const items = Object.entries(qty)
    .filter(([, n]) => n > 0)
    .map(([id, n]) => ({ id, qty: n }));
  const groups = [...new Set(CONSUMABLES.map((c) => c.group))];
  const dateErr = via === 'separate' ? courierDateError(date, TODAY, new Date().getHours()) : '';
  const submit = () => {
    const sup = orderSupplies(items, via === 'separate' ? '' : via, via === 'separate' ? date : '');
    setQty({});
    toast(
      `Заказ расходников ${sup.id} принят. ${via === 'separate' ? `Доставка ${fmtDate(date)}.` : `Привезёт курьер ${via}.`}`,
    );
  };
  return html`<div class="page">
    <div class="page__head">
      <div><h1>Расходные материалы</h1></div>
    </div>
    <div class="cols2">
      <div class="stack">
        ${groups.map(
          (g) =>
            html`<section class="card" aria-labelledby=${`g-${g}`}>
              <div class="card__head"><h2 id=${`g-${g}`}>${g}</h2></div>
              ${CONSUMABLES.filter((c) => c.group === g).map(
                (c) =>
                  html`<div class="sup">
                    <div>
                      <div class="sup__name">
                        ${c.tube && html`<${TubeDot} tube=${c.tube} tubes=${TUBES} />`}${c.name}
                      </div>
                      <div class="sup__meta">${c.pack}</div>
                      ${c.tube && use[c.tube]
                        ? html`<div class="sup__hint">
                            За 30 дней ушло ${use[c.tube]} ${plural(use[c.tube], 'пробирка', 'пробирки', 'пробирок')} по
                            заказам кабинета
                          </div>`
                        : null}
                    </div>
                    <div class="stepper" role="group" aria-label=${`Количество: ${c.name}`}>
                      <button
                        type="button"
                        aria-label="Меньше"
                        disabled=${!qty[c.id]}
                        onClick=${() => setQty({ ...qty, [c.id]: (qty[c.id] || 0) - 1 })}
                      >
                        <${Icon} name="minus" />
                      </button>
                      <output aria-live="polite">${qty[c.id] || 0}</output>
                      <button
                        type="button"
                        aria-label="Больше"
                        onClick=${() => setQty({ ...qty, [c.id]: (qty[c.id] || 0) + 1 })}
                      >
                        <${Icon} name="circle-plus" />
                      </button>
                    </div>
                  </div>`,
              )}
            </section>`,
        )}
      </div>
      <div class="stack cart">
        <section class="card" aria-labelledby="sup-sum">
          <div class="cart__head"><h2 id="sup-sum">Заказ расходников</h2></div>
          <div class="cart__body">
            ${items.length === 0
              ? html`<p class="cart__empty">Выберите количество упаковок слева.</p>`
              : html`<div class="cart__items">
                  ${items.map(
                    (i) =>
                      html`<div class="citem">
                        <span class="citem__name">${supplyById(i.id).name}</span
                        ><span class="citem__price">× ${i.qty}</span>
                        <button aria-label="Убрать" onClick=${() => setQty({ ...qty, [i.id]: 0 })}>
                          <${Icon} name="x" />
                        </button>
                      </div>`,
                  )}
                </div>`}
            <fieldset class="field pick" style="border:0;padding:0;margin:0">
              <legend class="field__label" style="margin-bottom:6px">Доставка</legend>
              ${planned.map(
                (c) =>
                  html`<label
                    ><input
                      type="radio"
                      name="via"
                      class="check"
                      checked=${via === c.id}
                      onChange=${() => setVia(c.id)} />
                    <span>С курьером ${c.id}<br /><span class="muted mono">${fmtDate(c.date)} · ${c.slot}</span></span
                    ><span></span
                  ></label>`,
              )}
              <label
                ><input
                  type="radio"
                  name="via"
                  class="check"
                  checked=${via === 'separate'}
                  onChange=${() => setVia('separate')} /><span>Отдельной доставкой</span><span></span
              ></label>
            </fieldset>
            ${via === 'separate' &&
            html`<${Field} label="Дата доставки" id="sup-date" error=${dateErr}>
              <${DateField}
                id="sup-date"
                value=${date}
                min=${TODAY}
                disableWeekends
                error=${dateErr}
                onChange=${setDate}
            /><//>`}
            <button class="btn btn--primary btn--block" disabled=${!items.length || !!dateErr} onClick=${submit}>
              <${Icon} name="package" />Заказать
            </button>
          </div>
        </section>
        <section class="card" aria-labelledby="sup-hist">
          <div class="card__head"><h2 id="sup-hist">Мои заказы расходников</h2></div>
          ${s.supplies.length === 0
            ? html`<${Empty} title="Пока пусто" />`
            : html`<div class="rows">
                ${s.supplies.map(
                  (x) =>
                    html`<div class="rowi">
                      <div>
                        <div class="rowi__title">
                          <span class="mono">${x.id}</span
                          ><${Chip} tone=${x.status === 'delivered' ? 'ok' : 'blue'}
                            >${x.status === 'delivered'
                              ? `доставлен ${fmtDate(x.deliveredAt)}`
                              : x.withCourier
                                ? `с курьером ${x.withCourier}`
                                : `доставка ${fmtDate(x.date)}`}<//
                          >
                        </div>
                        <div class="rowi__text">
                          ${x.items.map((i) => `${supplyById(i.id).name.split(',')[0]} × ${i.qty}`).join(', ')}
                        </div>
                      </div>
                    </div>`,
                )}
              </div>`}
        </section>
      </div>
    </div>
  </div>`;
}
