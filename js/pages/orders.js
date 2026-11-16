// Мои заказы, карточка заказа, перезаборы, заключения.
import { useState, useMemo, useEffect } from '../vendor/preact-htm.js';
import { html, Icon, StatusChip, Chip, MenuButton, Dialog, toast, Pager, Empty, Field, download, timeOf, go } from '../ui.js';
import { useStore, findOrder, testByCode, cancelOrder, requestRawData, markResultsSeen, declineRetake, cancelCourier, TODAY } from '../store.js';
import { CATALOG, TUBES, RAW_DATA } from '../data.js';
import {
  STATUS, fmtDate, fullName, shortName, ageYears, plural, money, priceOf, editLock, canCallCourier, canCancel, canPrint,
  rawDataEligible, resultStatus, matchOrder, toCsv, addDays, fromIso, bundledIn, aggregateTubes, addTest,
} from '../logic.js';
import { startOrder } from '../flow.js';
import { printDocs, needsIds } from '../print.js';

/* ---------- shared pieces ---------- */

// ТЗ п. 5: the code sits next to the test name everywhere an order is shown.
export const TestsCell = ({ order }) => html`<div class="tests">
  ${order.tests.map((t) => html`<div><span class="code">${t.code}</span><span>${testByCode(t.code)?.short}</span></div>`)}
</div>`;

const SourceTag = ({ order }) =>
  order.source === 'paper'
    ? html`<div class="src" title="Заказ поступил на бумажном бланке и зарегистрирован лабораторией"><${Icon} name="file-text" />бумажный бланк</div>`
    : order.addon ? html`<div class="src"><${Icon} name="database" />дозаказ к ${order.parentId}</div>` : null;

export const patientPrefill = (o) => ({ ...o.patient, dobText: fmtDate(o.patient.dob) });

export function retakePrefill(o) {
  let codes = [];
  for (const c of o.retake.tests) codes = addTest(codes, c, CATALOG);
  return { patient: patientPrefill(o), codes, bm: { ...o.bm }, participants: o.participants.map((p) => ({ ...p })), clinical: { ...o.clinical }, doctor: o.doctor, card: o.card || '', retakeOf: o.id };
}
const repeatPrefill = (o) => ({ patient: patientPrefill(o), codes: o.tests.map((t) => t.code).filter((c) => c !== RAW_DATA.code), bm: { ...o.bm }, participants: o.participants.map((p) => ({ ...p })), doctor: o.doctor, card: o.card || '' });

export function printOrder(o, what) {
  if (what === 'labels' && !o.tubes.length) return toast('У этого заказа нет пробирок для этикеток.', { icon: 'info' });
  printDocs(o, what === 'blank' ? ['blank', ...(needsIds(o) ? ['ids'] : [])] : [what]);
}

function downloadResults(orders) {
  markResultsSeen(orders.map((o) => o.id));
  toast(`Демо: ${orders.length > 1 ? `архив из ${orders.length} заключений` : 'PDF заключения'} скачается после подключения к лаборатории. Отмечено как просмотренное.`, { icon: 'file-down' });
}

/* ---------- dialogs opened from any page ---------- */
let openDlg = null;
export function OrderDialogs() {
  const [d, setD] = useState(null);
  openDlg = setD;
  if (!d) return null;
  const close = () => setD(null);
  if (d.type === 'cancel') return html`<${CancelDialog} order=${d.order} onClose=${close} />`;
  if (d.type === 'raw') return html`<${RawDataDialog} order=${d.order} onClose=${close} />`;
  return null;
}

function CancelDialog({ order, onClose }) {
  const [reason, setReason] = useState('');
  return html`<${Dialog} title=${`Отменить заказ ${order.id}?`} onClose=${onClose} footer=${html`
    <button class="btn btn--line" onClick=${onClose}>Не отменять</button>
    <button class="btn btn--danger" onClick=${() => { cancelOrder(order.id, reason); onClose(); toast(`Заказ ${order.id} отменён`); }}><${Icon} name="ban" />Отменить заказ</button>`}>
    <p>${fullName(order.patient)} · ${order.tests.map((t) => t.code).join(', ')}.${order.status === 'courier' ? ' Заказ уберём из заявки курьера.' : ''}</p>
    <${Field} label="Причина (необязательно)" id="cancel-reason">
      <select id="cancel-reason" class="select" value=${reason} onChange=${(e) => setReason(e.target.value)}>
        <option value="">Не указывать</option><option>Пациент отказался</option><option>Ошибка при оформлении</option><option>Оформлен повторно</option>
      </select>
    <//>
  <//>`;
}

// ТЗ п. 1: raw data add-on goes to work immediately — no draft in between.
function RawDataDialog({ order, onClose }) {
  const s = useStore();
  const [formats, setFormats] = useState(['FASTQ', 'VCF']);
  const [email, setEmail] = useState(s.clinic.email);
  const toggle = (f) => setFormats((x) => (x.includes(f) ? x.filter((y) => y !== f) : [...x, f]));
  const seqTests = order.tests.filter((t) => CATALOG.find((c) => c.code === t.code)?.rawData);
  return html`<${Dialog} title="Дозаказ сырых данных" onClose=${onClose} footer=${html`
    <button class="btn btn--line" onClick=${onClose}>Отмена</button>
    <button class="btn btn--primary" disabled=${!formats.length || !email.includes('@')} onClick=${() => {
      const a = requestRawData(order.id, formats, email);
      onClose();
      toast(html`Дозаказ ${a.id} принят в работу. Ссылку пришлём на ${email}.`, { link: { href: `#/orders/${a.id}`, text: 'Открыть' } });
    }}>Заказать за ${money(RAW_DATA.price)}</button>`}>
    <p>К заказу <b class="mono">${order.id}</b> · ${seqTests.map((t) => `${t.code} ${testByCode(t.code).short}`).join(', ')}. Новый биоматериал и курьер не нужны. Заказ сразу уходит в работу — в черновиках он не останется.</p>
    <fieldset class="field" style="border:0;padding:0;margin:0">
      <legend class="field__label">Форматы файлов</legend>
      <div class="slots">${['FASTQ', 'BAM', 'VCF'].map((f) => html`<button type="button" aria-pressed=${formats.includes(f)} onClick=${() => toggle(f)}>${f}</button>`)}</div>
    </fieldset>
    <${Field} label="E-mail для ссылки на данные" id="raw-email" req error=${email.includes('@') ? '' : 'Укажите e-mail'}>
      <input id="raw-email" class="input" type="email" value=${email} onInput=${(e) => setEmail(e.target.value)} />
    <//>
    <p class="muted">Срок — ${RAW_DATA.tat} рабочих дня. Код услуги <span class="code">${RAW_DATA.code}</span>.</p>
  <//>`;
}

export function orderMenu(o) {
  const lock = editLock(o);
  return [
    { icon: 'eye', label: 'Открыть заказ', onClick: () => go(`#/orders/${o.id}`) },
    o.source === 'lkp' && !o.addon && { icon: 'pencil', label: o.status === 'draft' ? 'Продолжить оформление' : 'Редактировать', disabled: !!lock, note: lock, onClick: () => go(`#/new?edit=${o.id}`) },
    '-',
    canPrint(o) && { icon: 'printer', label: needsIds(o) ? 'Печать бланка и ИДС' : 'Распечатать бланк заказа', onClick: () => printOrder(o, 'blank') },
    canPrint(o) && o.tubes.length > 0 && { icon: 'barcode', label: 'Штрих-коды на пробирки', onClick: () => printOrder(o, 'labels') },
    canCallCourier(o) && { icon: 'truck', label: 'Вызвать курьера', onClick: () => go(`#/delivery?orders=${o.id}`) },
    o.status === 'retake' && !o.retake.resolvedBy && { icon: 'refresh-ccw', label: 'Оформить перезабор', onClick: () => startOrder(retakePrefill(o)) },
    rawDataEligible(o, CATALOG) && { icon: 'database', label: 'Дозаказать сырые данные', onClick: () => openDlg({ type: 'raw', order: o }) },
    !o.addon && { icon: 'rotate-ccw', label: 'Повторить заказ', onClick: () => startOrder(repeatPrefill(o)) },
    canCancel(o) && '-',
    canCancel(o) && { icon: 'x', label: 'Отменить заказ', danger: true, onClick: () => openDlg({ type: 'cancel', order: o }) },
  ];
}

function ResultCell({ order }) {
  const r = resultStatus(order);
  if (r.key === 'wait') return null;
  return html`<button class="btn btn--line btn--sm" style="margin-top:6px" onClick=${() => downloadResults([order])}>
    <${Icon} name="download" />${r.key === 'partial' ? r.label : 'Скачать'}</button>`;
}

export function OrdersTable({ rows, selected, onToggle, onToggleAll, sort, onSort, filters, cards = true }) {
  const all = selected && rows.length > 0 && rows.every((o) => selected.includes(o.id));
  const SortBtn = ({ k, children }) => html`<button type="button" class=${sort?.key === k ? 'is-sorted' : ''} onClick=${() => onSort(k)} aria-label=${`${children}: сортировать`}>
    ${children}${sort?.key === k ? html`<${Icon} name=${sort.dir === 'asc' ? 'arrow-up' : 'arrow-down'} />` : null}</button>`;
  return html`<div class="tablewrap"><div class="tscroll">
    <table class="t ${cards ? 't--cards' : ''}">
      <thead><tr>
        ${selected && html`<th class="w-check"><input type="checkbox" class="check" aria-label="Выбрать все на странице" checked=${all} onChange=${() => onToggleAll(!all)} /></th>`}
        <th aria-sort=${sort?.key === 'num' ? (sort.dir === 'asc' ? 'ascending' : 'descending') : undefined}>${onSort ? html`<${SortBtn} k="num">Заказ<//>` : 'Заказ'}</th>
        <th>Пациент</th><th>Исследования</th>
        <th aria-sort=${sort?.key === 'date' ? (sort.dir === 'asc' ? 'ascending' : 'descending') : undefined}>${onSort ? html`<${SortBtn} k="date">Дата<//>` : 'Дата'}</th>
        <th>Статус</th><th class="w-act"><span class="sr">Действия</span></th>
      </tr></thead>
      <tbody>
        ${filters}
        ${rows.map((o) => html`<tr key=${o.id} class=${[o.status === 'retake' && !o.retake?.resolvedBy && 'is-stop', selected?.includes(o.id) && 'is-sel'].filter(Boolean).join(' ')}>
          ${selected && html`<td class="w-check"><input type="checkbox" class="check" aria-label=${`Выбрать ${o.id}`} checked=${selected.includes(o.id)} onChange=${() => onToggle(o.id)} /></td>`}
          <td><a class="oid" href=${`#/orders/${o.id}`}>${o.id}</a><${SourceTag} order=${o} /></td>
          <td data-l="Пациент">${shortName(o.patient)}</td>
          <td><${TestsCell} order=${o} /></td>
          <td class="num" data-l="Дата">${fmtDate(o.createdAt)}</td>
          <td><${StatusChip} status=${o.status} />${o.status === 'retake' && o.retake?.resolvedBy ? html`<div class="src">оформлен ${o.retake.resolvedBy}</div>` : null}<div><${ResultCell} order=${o} /></div></td>
          <td class="w-act"><${MenuButton} label=${`Действия с заказом ${o.id}`} items=${orderMenu(o)} /></td>
        </tr>`)}
      </tbody>
    </table>
  </div></div>`;
}

/* ---------- Мои заказы ---------- */

const SEG = [
  ['all', 'Все', () => true],
  ['draft', 'Черновики', (o) => o.status === 'draft'],
  ['saved', 'Не отправлены', (o) => o.status === 'saved'],
  ['courier', 'Ждут курьера', (o) => o.status === 'courier'],
  ['work', 'В пути и в работе', (o) => ['transit', 'lab'].includes(o.status)],
  ['ready', 'Готовы', (o) => ['done', 'partial'].includes(o.status)],
  ['retake', 'Перезабор', (o) => o.status === 'retake'],
  ['cancelled', 'Отменённые', (o) => o.status === 'cancelled'],
];
const PER = 10;

export function Orders({ status = 'all' }) {
  const s = useStore();
  const [seg, setSeg] = useState(SEG.some((x) => x[0] === status) ? status : 'all');
  const EMPTY_F = { num: '', patient: '', test: '', period: '', source: '', result: '', q: '' };
  const [f, setF] = useState(EMPTY_F);
  const [sort, setSort] = useState({ key: 'date', dir: 'desc' });
  const [page, setPage] = useState(1);
  const [sel, setSel] = useState([]);
  const setFilter = (k, v) => { setF({ ...f, [k]: v }); setPage(1); };
  useEffect(() => setPage(1), [seg]);

  const base = useMemo(() => s.orders.filter((o) => {
    if (f.num && !o.id.includes(f.num.replace(/\D/g, ''))) return false;
    if (f.q && !matchOrder(o, f.q, CATALOG)) return false;
    if (f.patient && !matchOrder({ ...o, tests: [], tubes: [] }, f.patient, CATALOG)) return false;
    if (f.test && !o.tests.some((t) => matchOrder({ ...o, id: '', num: '', patient: { last: '', first: '' }, tubes: [], tests: [t] }, f.test, CATALOG))) return false;
    if (f.period && o.createdAt.slice(0, 10) < addDays(TODAY, -Number(f.period))) return false;
    if (f.source && o.source !== f.source) return false;
    if (f.result === 'yes' && !o.tests.some((t) => t.resultAt)) return false;
    if (f.result === 'new' && (o.resultsSeen || !o.tests.some((t) => t.resultAt))) return false;
    if (f.result === 'no' && o.tests.some((t) => t.resultAt)) return false;
    return true;
  }), [s.orders, f]);
  const segFn = SEG.find((x) => x[0] === seg)[2];
  const rows = base.filter(segFn).sort((a, b) => {
    const v = sort.key === 'num' ? a.num - b.num : a.createdAt.slice(0, 10).localeCompare(b.createdAt.slice(0, 10)) || a.num - b.num;
    return sort.dir === 'asc' ? v : -v;
  });
  const pages = Math.max(1, Math.ceil(rows.length / PER));
  const view = rows.slice((page - 1) * PER, page * PER);
  const selOrders = s.orders.filter((o) => sel.includes(o.id));
  const courierable = selOrders.filter(canCallCourier);
  const printable = selOrders.filter((o) => canPrint(o) && o.tubes.length);

  const exportCsv = (list) => {
    const head = ['Номер заказа', 'Источник', 'Пациент', 'Дата рождения', 'Исследования', 'Дата', 'Статус', 'Заключение'];
    const body = list.map((o) => [o.id, o.source === 'paper' ? 'Бумажный бланк' : 'Кабинет', fullName(o.patient), fmtDate(o.patient.dob),
      o.tests.map((t) => `${t.code} ${testByCode(t.code).short}`).join(', '), fmtDate(o.createdAt), STATUS[o.status].label, resultStatus(o).label]);
    download(`zakazy-${TODAY}.csv`, toCsv([head, ...body]));
    toast(`Выгружено ${list.length} ${plural(list.length, 'заказ', 'заказа', 'заказов')}. Файл открывается в Excel.`, { icon: 'file-spreadsheet' });
  };

  const filters = html`<tr class="filters">
    <td class="w-check"></td>
    <td><input class="input" aria-label="Фильтр по номеру" placeholder="Номер" size="6" value=${f.num} onInput=${(e) => setFilter('num', e.target.value)} /></td>
    <td><input class="input" aria-label="Фильтр по пациенту" placeholder="Пациент" size="8" value=${f.patient} onInput=${(e) => setFilter('patient', e.target.value)} /></td>
    <td><input class="input" aria-label="Фильтр по исследованию" placeholder="Код, название или ген" size="10" value=${f.test} onInput=${(e) => setFilter('test', e.target.value)} /></td>
    <td><select class="select" aria-label="Период" value=${f.period} onChange=${(e) => setFilter('period', e.target.value)}>
      <option value="">Все</option><option value="0">Сегодня</option><option value="7">7 дней</option><option value="30">30 дней</option></select></td>
    <td></td>
    <td></td>
  </tr>`;

  const anyFilter = Object.values(f).some(Boolean);
  return html`<div class="page">
    <div class="page__head">
      <div><h1>Мои заказы</h1><p class="page__sub">Заказы из кабинета и с бумажных бланков</p></div>
      <div class="page__actions">
        <button class="btn btn--line" onClick=${() => exportCsv(rows)}><${Icon} name="download" />Выгрузить в Excel</button>
        <a class="btn btn--line" href="#/delivery"><${Icon} name="truck" />Вызвать курьера</a>
      </div>
    </div>
    <div class="seg" role="group" aria-label="Статус заказов">
      ${SEG.map(([k, label, fn]) => html`<button type="button" aria-pressed=${seg === k} onClick=${() => setSeg(k)}>${label}<span class="n">${base.filter(fn).length}</span></button>`)}
    </div>
    <div class="fbar" style="margin-top:0">
      <span class="field__label" id="src-l">Источник:</span>
      <div class="segctl" role="radiogroup" aria-labelledby="src-l">
        ${[['', 'Все'], ['lkp', 'Через кабинет'], ['paper', 'Бумажный бланк']].map(([v, l]) => html`<button type="button" role="radio" aria-checked=${f.source === v} onClick=${() => setFilter('source', v)}>${l}</button>`)}
      </div>
    </div>
    <div class="gsearch mfilter"><${Icon} name="search" /><input type="search" aria-label="Поиск по заказам" placeholder="Номер, пациент, код теста" value=${f.q} onInput=${(e) => setFilter('q', e.target.value)} /></div>
    <${OrdersTable} rows=${view} selected=${sel} sort=${sort} filters=${filters}
      onSort=${(key) => setSort({ key, dir: sort.key === key && sort.dir === 'desc' ? 'asc' : 'desc' })}
      onToggle=${(id) => setSel((x) => (x.includes(id) ? x.filter((y) => y !== id) : [...x, id]))}
      onToggleAll=${(on) => setSel((x) => (on ? [...new Set([...x, ...view.map((o) => o.id)])] : x.filter((id) => !view.some((o) => o.id === id))))} />
    ${rows.length === 0 && html`<div class="card"><${Empty} icon="search" title="Нет заказов по этим условиям"
      text=${anyFilter ? 'Проверьте фильтры в строке под заголовками таблицы.' : 'Здесь появятся заказы из кабинета и с бумажных бланков.'}
      action=${anyFilter ? html`<button class="btn btn--line" onClick=${() => setF(EMPTY_F)}>Сбросить фильтры</button>` : html`<a class="btn btn--primary" href="#/new">Новый заказ</a>`} /></div>`}
    <div class="tfoot" style="border:0;padding-inline:4px">
      <span class="tfoot__info">Показано ${view.length} из ${rows.length}</span>
      <${Pager} page=${page} pages=${pages} onPage=${setPage} />
    </div>
    ${sel.length > 0 && html`<div class="bulk" role="region" aria-label="Действия с выбранными">
      <b>Выбрано: ${sel.length}</b>
      <button class="btn btn--line btn--sm" disabled=${!printable.length} onClick=${() => printable.forEach((o, i) => setTimeout(() => printOrder(o, 'labels'), i * 400))}><${Icon} name="barcode" />Штрих-коды${printable.length && printable.length < sel.length ? ` (${printable.length})` : ''}</button>
      <a class="btn btn--primary btn--sm" aria-disabled=${!courierable.length} href=${courierable.length ? `#/delivery?orders=${courierable.map((o) => o.id).join(',')}` : undefined}
        title=${courierable.length ? '' : 'Курьера можно вызвать для сохранённых заказов'}><${Icon} name="truck" />Вызвать курьера${courierable.length ? ` (${courierable.length})` : ''}</a>
      <button class="btn btn--line btn--sm" onClick=${() => exportCsv(selOrders)}><${Icon} name="download" />Выгрузить</button>
      <button class="iconbtn" style="color:#fff" aria-label="Снять выделение" onClick=${() => setSel([])}><${Icon} name="x" /></button>
    </div>`}
  </div>`;
}

/* ---------- карточка заказа ---------- */

function printedOf(o, what) {
  return o.history.some((h) => h.text.startsWith('Распечатан') && h.text.includes(what));
}

export function OrderPage({ id, created }) {
  const s = useStore();
  const o = findOrder(id);
  if (!o) return html`<div class="page"><${Empty} icon="search" title=${`Заказ ${id} не найден`} action=${html`<a class="btn btn--primary" href="#/orders">К списку заказов</a>`} /></div>`;
  const lock = editLock(o);
  const call = s.couriers.find((c) => c.status === 'planned' && c.orderIds.includes(o.id));
  const p = o.patient;
  const age = p.dob ? ageYears(p.dob, TODAY) : null;
  const showSteps = o.source === 'lkp' && !o.addon && ['saved', 'courier'].includes(o.status);
  const blankDone = printedOf(o, 'бланк');
  const labelsDone = printedOf(o, 'этикетки');
  const c = o.clinical || {};
  const groupMap = new Map();
  o.tubes.forEach((t) => groupMap.set(t.who, [...(groupMap.get(t.who) || []), t]));
  const groups = [...groupMap.entries()];
  const r = resultStatus(o);

  return html`<div class="page">
    <nav class="crumbs" aria-label="Навигация"><a href="#/orders">Мои заказы</a><${Icon} name="chevron-right" /><span class="mono">${o.id}</span></nav>
    <div class="page__head">
      <div>
        <div class="ohead"><h1>${o.id}</h1><${StatusChip} status=${o.status} />
          ${o.source === 'paper' ? html`<span class="tag"><${Icon} name="file-text" />бумажный бланк</span>` : null}
          ${o.addon ? html`<span class="tag">дозаказ к <a href=${`#/orders/${o.parentId}`} class="mono">${o.parentId}</a></span>` : null}
        </div>
        <p class="page__sub">${fullName(p)} · создан ${fmtDate(o.createdAt)} в ${o.createdAt.slice(11, 16)}</p>
      </div>
      <div class="page__actions">
        ${o.source === 'lkp' && !o.addon && html`<a class="btn btn--line" aria-disabled=${!!lock} href=${lock ? undefined : `#/new?edit=${o.id}`} title=${lock}>
          <${Icon} name="pencil" />${o.status === 'draft' ? 'Продолжить оформление' : 'Редактировать'}</a>`}
        <${MenuButton} label="Другие действия" className="btn btn--line" icon="ellipsis" text="Ещё" items=${orderMenu(o).slice(2)} />
      </div>
    </div>

    ${created && html`<div class="infoline" style="margin-bottom:16px"><${Icon} name="circle-check-big" />
      <span>Заказ сохранён.${s.settings.autoBlank ? ` Бланк заказа${needsIds(o) && s.settings.autoIds ? ' и ИДС Panorama' : ''} отправлены на печать — проверьте данные вместе с пациентом.` : ''} Редактировать заказ можно до вызова курьера.</span></div>`}
    ${lock && o.source === 'lkp' && o.status === 'courier' && html`<div class="lockline" style="margin-bottom:16px"><${Icon} name="info" /><span>${lock}${call ? html` <button class="linkish" onClick=${() => { cancelCourier(call.id); toast('Вызов курьера отменён. Заказы снова можно редактировать.'); }}>Отменить вызов ${call.id}</button>` : null}</span></div>`}
    ${o.status === 'retake' && html`<div class="stopline" style="margin-bottom:16px"><${Icon} name="triangle-alert" /><div>
      <b>Нужен перезабор: ${o.retake.reason.toLowerCase()}.</b> ${o.retake.detail}
      ${o.retake.resolvedBy ? html` Оформлен заказ <a href=${`#/orders/${o.retake.resolvedBy}`} class="mono">${o.retake.resolvedBy}</a>.` : html` Оформить до ${fmtDate(o.retake.deadline)}.
      <div style="margin-top:10px;display:flex;gap:8px;flex-wrap:wrap"><button class="btn btn--primary btn--sm" onClick=${() => startOrder(retakePrefill(o))}>Оформить перезабор</button></div>`}
    </div></div>`}
    ${o.delayedTo && !o.tests.every((t) => t.resultAt) && html`<div class="infoline" style="margin-bottom:16px"><${Icon} name="clock" /><span>Срок выдачи перенесён на ${fmtDate(o.delayedTo)}: лаборатория повторно ставит анализ.</span></div>`}

    ${showSteps && html`<div class="card steps" aria-label="Что сделать дальше">
      <div class="step ${blankDone ? 'is-done' : 'is-now'}"><span class="step__n">${blankDone ? html`<${Icon} name="check" />` : 1}</span>
        <div class="step__title">Бланк заказа${needsIds(o) ? ' и ИДС' : ''}</div><div class="step__text">Проверьте ФИО, дату рождения и исследования вместе с пациентом</div>
        <button class="btn btn--line btn--sm" onClick=${() => printOrder(o, 'blank')}><${Icon} name="printer" />${blankDone ? 'Ещё раз' : 'Распечатать'}</button></div>
      <div class="step ${labelsDone ? 'is-done' : blankDone ? 'is-now' : ''}"><span class="step__n">${labelsDone ? html`<${Icon} name="check" />` : 2}</span>
        <div class="step__title">Штрих-коды на пробирки</div><div class="step__text">${o.tubes.length} ${plural(o.tubes.length, 'этикетка', 'этикетки', 'этикеток')}: по одной на каждую пробирку</div>
        <button class="btn btn--line btn--sm" onClick=${() => printOrder(o, 'labels')}><${Icon} name="barcode" />${labelsDone ? 'Ещё раз' : 'Штрих-коды'}</button></div>
      <div class="step ${o.status === 'courier' ? 'is-done' : labelsDone ? 'is-now' : ''}"><span class="step__n">${o.status === 'courier' ? html`<${Icon} name="check" />` : 3}</span>
        <div class="step__title">Курьер</div><div class="step__text">${call ? `Приедет ${fmtDate(call.date)}, ${call.slot}` : 'Вызовите, когда биоматериал взят и подписан'}</div>
        ${o.status === 'saved' ? html`<a class="btn btn--primary btn--sm" href=${`#/delivery?orders=${o.id}`}><${Icon} name="truck" />Вызвать курьера</a>` : html`<a class="btn btn--line btn--sm" href="#/delivery">Заявка ${call?.id || ''}</a>`}</div>
    </div>`}

    <div class="ogrid">
      <div class="stack">
        <section class="card" aria-labelledby="pt-h">
          <div class="card__head"><h2 id="pt-h">Пациент</h2></div>
          <dl class="kv card__pad">
            <dt>ФИО</dt><dd>${fullName(p)}</dd>
            <dt>Дата рождения</dt><dd>${p.dob ? html`<span class="mono">${fmtDate(p.dob)}</span> · ${age} ${plural(age, 'год', 'года', 'лет')}` : '—'}</dd>
            <dt>Пол</dt><dd>${{ f: 'женский', m: 'мужской' }[p.sex] || '—'}</dd>
            ${p.phone && html`<dt>Телефон</dt><dd class="mono">${p.phone}</dd>`}
            ${o.card && html`<dt>Номер карты</dt><dd class="mono">${o.card}</dd>`}
            ${o.participants?.map((x) => html`<dt>${x.role}</dt><dd>${fullName(x)} · <span class="mono">${fmtDate(x.dob)}</span></dd>`)}
            ${c.weeks !== undefined && html`<dt>Беременность</dt><dd>${c.weeks} нед. ${c.days || 0} дн. по УЗИ · одноплодная · ${c.ivf === 'yes' ? 'ЭКО' : 'естественная'} · ${c.weight} кг, ${c.height} см</dd>`}
            ${c.block && html`<dt>Парафиновый блок</dt><dd>№ ${c.block} · ${c.diagnosis}</dd>`}
            ${c.phenotype && html`<dt>Клинические данные</dt><dd>${c.phenotype}</dd>`}
            <dt>Врач</dt><dd>${o.doctor || '—'}</dd>
            ${o.comment && html`<dt>Комментарий</dt><dd>${o.comment}</dd>`}
          </dl>
        </section>
        <section class="tablewrap" aria-labelledby="ts-h">
          <div class="card__head"><h2 id="ts-h">Исследования</h2><${Chip} tone=${r.tone}>${r.label}<//></div>
          <div class="tscroll"><table class="t t--cards">
            <thead><tr><th>Код</th><th>Исследование</th><th>Цена</th><th>Заключение</th></tr></thead>
            <tbody>${o.tests.map((t) => {
              const x = testByCode(t.code);
              const bundle = bundledIn(t.code, o.tests.map((y) => y.code), CATALOG);
              return html`<tr><td><span class="code">${t.code}</span></td><td>${x.name}<div class="muted">${bundle ? `добавлен автоматически к ${bundle.code} · ` : ''}срок ${x.tat} раб. дн.</div></td>
                <td class="num" data-l="Цена">${bundle ? 'в комплекте' : money(x.bm.length ? priceOf(x, s.promos, o.createdAt.slice(0, 10)).price : x.price)}</td>
                <td>${t.resultAt ? html`<button class="btn btn--sm btn--line" onClick=${() => downloadResults([o])}><${Icon} name="download" />PDF от ${fmtDate(t.resultAt)}</button>` : html`<span class="muted">${o.status === 'cancelled' ? '—' : `ожидается${o.delayedTo ? ` к ${fmtDate(o.delayedTo)}` : ''}`}</span>`}</td></tr>`;
            })}</tbody>
          </table></div>
          ${rawDataEligible(o, CATALOG) && html`<div class="tfoot"><span class="tfoot__info">Для секвенирования доступна выдача сырых данных: FASTQ, BAM, VCF.</span>
            <button class="btn btn--line btn--sm" onClick=${() => openDlg({ type: 'raw', order: o })}><${Icon} name="database" />Дозаказать сырые данные</button></div>`}
          ${o.rawDataOrderId && html`<div class="tfoot"><span class="tfoot__info">Сырые данные дозаказаны: <a class="mono" href=${`#/orders/${o.rawDataOrderId}`}>${o.rawDataOrderId}</a></span></div>`}
        </section>
      </div>
      <div class="stack">
        ${o.tubes.length > 0 && html`<section class="card" aria-labelledby="tb-h">
          <div class="card__head"><h2 id="tb-h">Пробирки</h2>${canPrint(o) && html`<button class="btn btn--ghost btn--sm" onClick=${() => printOrder(o, 'labels')}><${Icon} name="barcode" />Штрих-коды</button>`}</div>
          <div class="card__pad tubes">
            ${groups.map(([who, list]) => html`${groups.length > 1 && html`<div class="muted">${who === 0 ? fullName(p) : `${o.participants[who - 1].role}: ${fullName(o.participants[who - 1])}`}</div>`}
              ${list.map((t) => html`<div class="tubeline"><i class="tubedot" style=${{ background: TUBES[t.tube].color }}></i><span>${TUBES[t.tube].short}</span><span class="mono">${t.code}</span></div>`)}`)}
            ${o.collectedAt && html`<div class="muted">Дата забора: <span class="mono">${fmtDate(o.collectedAt)}</span></div>`}
          </div>
        </section>`}
        <section class="card" aria-labelledby="hs-h">
          <div class="card__head"><h2 id="hs-h">Хронология</h2></div>
          <ol class="timeline card__pad">${[...o.history].reverse().map((h) => html`<li><time>${timeOf(h.at)}</time>${h.text}</li>`)}</ol>
        </section>
      </div>
    </div>
  </div>`;
}

/* ---------- Перезаборы ---------- */

export function Retakes() {
  const s = useStore();
  const list = s.orders.filter((o) => o.retake);
  const open = list.filter((o) => o.status === 'retake' && !o.retake.resolvedBy);
  const done = list.filter((o) => !open.includes(o));
  const days = (iso) => Math.round((fromIso(iso) - fromIso(TODAY)) / 864e5);
  return html`<div class="page">
    <div class="page__head"><div><h1>Перезаборы</h1><p class="page__sub">Пациент и исследования подставятся в новый заказ автоматически.</p></div></div>
    <section class="card" aria-labelledby="rt-open">
      <div class="card__head"><h2 id="rt-open">Ждут оформления</h2><span class="count">${open.length}</span></div>
      ${open.length === 0 ? html`<${Empty} icon="circle-check-big" title="Перезаборов нет" text="Если лаборатории понадобится новый образец, заказ появится здесь и в уведомлениях." />`
        : html`<div class="rows">${open.map((o) => {
            const d = days(o.retake.deadline);
            const tubes = aggregateTubes(retakePrefill(o).codes, CATALOG, o.bm);
            return html`<div class="rowi">
              <div>
                <div class="rowi__title"><a class="mono" href=${`#/orders/${o.id}`}>${o.id}</a> ${fullName(o.patient)} <${Chip} tone="stop">${o.retake.reason}<//></div>
                <div class="rowi__text">${o.retake.tests.map((c) => `${c} ${testByCode(c).short}`).join(', ')}. ${o.retake.detail}</div>
                <div class="rowi__text">Взять: ${tubes.map((t) => `${t.qty} × ${TUBES[t.tube].short}`).join(', ')} · <b class=${d <= 1 ? 'field__err' : ''} style="display:inline">оформить до ${fmtDate(o.retake.deadline)} (${d} ${plural(d, 'день', 'дня', 'дней')})</b></div>
              </div>
              <div class="rowi__act">
                <button class="btn btn--line btn--sm" onClick=${() => { declineRetake(o.id); toast(`Перезабор по ${o.id} отклонён, заказ закрыт.`); }}>Отказаться</button>
                <button class="btn btn--primary btn--sm" onClick=${() => startOrder(retakePrefill(o))}><${Icon} name="refresh-ccw" />Оформить перезабор</button>
              </div>
            </div>`;
          })}</div>`}
    </section>
    ${done.length > 0 && html`<section class="section"><div class="section__head"><h2>Оформленные и закрытые</h2></div>
      <div class="card rows">${done.map((o) => html`<div class="rowi"><div>
        <div class="rowi__title"><a class="mono" href=${`#/orders/${o.id}`}>${o.id}</a> ${shortName(o.patient)} <${Chip} tone="muted">${o.retake.reason}<//></div>
        <div class="rowi__text">${o.retake.declined ? 'Клиника отказалась от перезабора' : html`Новый заказ: <a class="mono" href=${`#/orders/${o.retake.resolvedBy}`}>${o.retake.resolvedBy}</a>`}</div>
      </div></div>`)}</div></section>`}
  </div>`;
}

/* ---------- Заключения (ТЗ п. 8: only readiness, no "оплачен") ---------- */

export function Results() {
  const s = useStore();
  const [seg, setSeg] = useState('new');
  const [q, setQ] = useState('');
  const [patient, setPatient] = useState(null);
  const [page, setPage] = useState(1);
  const live = s.orders.filter((o) => o.status !== 'cancelled' && o.status !== 'draft' && !o.addon);
  const isNew = (o) => o.tests.some((t) => t.resultAt) && !o.resultsSeen;
  const SEGS = [['new', 'Новые', isNew], ['ready', 'Готовые', (o) => o.tests.some((t) => t.resultAt)], ['wait', 'Ожидаются', (o) => !o.tests.every((t) => t.resultAt)]];
  const fn = SEGS.find((x) => x[0] === seg)[2];
  const rows = live.filter(fn)
    .filter((o) => !q || matchOrder(o, q, CATALOG))
    .filter((o) => !patient || fullName(o.patient) === patient)
    .sort((a, b) => (b.tests.map((t) => t.resultAt).sort().pop() || b.createdAt).localeCompare(a.tests.map((t) => t.resultAt).sort().pop() || a.createdAt));
  const pages = Math.max(1, Math.ceil(rows.length / PER));
  const view = rows.slice((page - 1) * PER, page * PER);
  const newOnes = live.filter(isNew);
  useEffect(() => setPage(1), [seg, q, patient]);
  return html`<div class="page">
    <div class="page__head">
      <div><h1>Заключения</h1><p class="page__sub">Нажмите на фамилию пациента, чтобы увидеть все его заключения.</p></div>
      <div class="page__actions">${newOnes.length > 0 && html`<button class="btn btn--primary" onClick=${() => downloadResults(newOnes)}><${Icon} name="download" />Скачать все новые (${newOnes.length})</button>`}</div>
    </div>
    <div class="fbar">
      <div class="seg" role="group" aria-label="Заключения" style="margin:0">${SEGS.map(([k, l, f]) => html`<button type="button" aria-pressed=${seg === k} onClick=${() => setSeg(k)}>${l}<span class="n">${live.filter(f).length}</span></button>`)}</div>
      <div class="gsearch" style="max-width:360px;margin-left:auto"><${Icon} name="search" /><input type="search" aria-label="Поиск по заключениям" placeholder="Пациент, № заказа, код" value=${q} onInput=${(e) => setQ(e.target.value)} /></div>
    </div>
    ${patient && html`<div class="infoline" style="margin-bottom:14px;align-items:center"><${Icon} name="user" /><span style="flex:1">Все заключения пациента: ${patient}</span>
      <button class="btn btn--line btn--sm" onClick=${() => downloadResults(rows.filter((o) => o.tests.some((t) => t.resultAt)))}>Скачать архивом</button>
      <button class="btn btn--ghost btn--sm" onClick=${() => setPatient(null)}><${Icon} name="x" />Сбросить</button></div>`}
    ${rows.length === 0 ? html`<div class="card"><${Empty} icon=${seg === 'new' ? 'check-check' : 'search'} title=${seg === 'new' ? 'Новых заключений нет' : 'Ничего не нашли'}
      text=${seg === 'new' ? 'Когда лаборатория выпустит заключение, оно появится здесь и в уведомлениях.' : 'Попробуйте другой запрос.'} /></div>`
      : html`<div class="tablewrap"><div class="tscroll"><table class="t t--cards">
        <thead><tr><th>Заказ</th><th>Пациент</th><th>Исследование</th><th>Готово</th><th>Статус</th><th class="w-act"><span class="sr">Действия</span></th></tr></thead>
        <tbody>${view.map((o) => {
          const r = resultStatus(o);
          return html`<tr key=${o.id}>
            <td><a class="oid" href=${`#/orders/${o.id}`}>${o.id}</a>${isNew(o) ? html`<div><${Chip} tone="blue">новое<//></div>` : null}</td>
            <td data-l="Пациент"><button class="linkish" onClick=${() => setPatient(fullName(o.patient))}>${shortName(o.patient)}</button></td>
            <td><div class="tests">${o.tests.map((t) => html`<div><span class="code">${t.code}</span><span>${testByCode(t.code).short}${t.resultAt ? null : html`<span class="muted">, ещё не готово</span>`}</span></div>`)}</div></td>
            <td class="num" data-l="Готово">${o.tests.filter((t) => t.resultAt).map((t) => fmtDate(t.resultAt)).sort().pop() || (o.delayedTo ? `к ${fmtDate(o.delayedTo)}` : '—')}</td>
            <td><${Chip} tone=${r.tone}>${r.label}<//>${o.delayedTo && r.key !== 'ready' ? html`<div class="src">срок перенесён</div>` : null}
              ${r.key !== 'wait' && html`<div><button class="btn btn--sm btn--line" style="margin-top:6px" onClick=${() => downloadResults([o])}><${Icon} name="download" />Скачать</button></div>`}</td>
            <td class="w-act"><${MenuButton} label=${`Действия с заключением ${o.id}`} items=${[
              { icon: 'eye', label: 'Открыть заказ', onClick: () => go(`#/orders/${o.id}`) },
              { icon: 'user', label: 'Все заключения пациента', onClick: () => setPatient(fullName(o.patient)) },
              rawDataEligible(o, CATALOG) && { icon: 'database', label: 'Дозаказать сырые данные', onClick: () => openDlg({ type: 'raw', order: o }) },
            ]} /></td>
          </tr>`;
        })}</tbody></table></div>
        <div class="tfoot"><span class="tfoot__info">Показано ${view.length} из ${rows.length}</span><${Pager} page=${page} pages=${pages} onPage=${setPage} /></div>
      </div>`}
  </div>`;
}
