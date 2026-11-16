import { useState, useMemo } from '../vendor/preact-htm.js';
import { html, Icon, Empty, TubeDot, toast, download } from '../ui.js';
import { useStore, TODAY } from '../store.js';
import { CATALOG, CATEGORIES, TUBES, PREANALYTICS } from '../data.js';
import { matchTest, money, priceOf, plural, orderTotal, bundledIn, fullName, fmtDate, toCsv } from '../logic.js';
import { addToDraft, removeFromDraft } from '../flow.js';
import { TakeBlock } from './order-form.js';

const TAT = [['', 'Срок выполнения'], ['7', 'до 7 раб. дн.'], ['14', 'до 14 раб. дн.'], ['30', 'до 30 раб. дн.']];
const PRICE = [['', 'Цена'], ['0-5000', 'до 5 000 ₽'], ['5000-20000', '5 000 – 20 000 ₽'], ['20000-1e9', 'от 20 000 ₽']];
const SORT = [['popular', 'Сначала популярные'], ['price', 'Сначала дешевле'], ['tat', 'Сначала быстрее'], ['code', 'По коду']];

export function Catalog({ q: q0 = '' }) {
  const s = useStore();
  const [q, setQ] = useState(q0);
  const [cat, setCat] = useState(-1);
  const [f, setF] = useState({ bm: '', tat: '', price: '', sort: 'popular', promo: false });
  const [open, setOpen] = useState(null);
  const codes = s.formDraft?.codes || [];
  const reset = () => { setQ(''); setCat(-1); setF({ bm: '', tat: '', price: '', sort: 'popular', promo: false }); };
  const promoCodes = s.promos.filter((p) => p.pct && p.until >= TODAY).flatMap((p) => p.codes);

  const list = useMemo(() => {
    const [lo, hi] = f.price ? f.price.split('-').map(Number) : [0, Infinity];
    return CATALOG.filter((t) => matchTest(t, q) && (cat < 0 || t.cat === cat) && (!f.bm || t.bm.some((b) => b.tube === f.bm))
      && (!f.tat || t.tat <= Number(f.tat)) && t.price >= lo && t.price <= hi && (!f.promo || promoCodes.includes(t.code)))
      .sort((a, b) => ({ popular: a.popular - b.popular, price: a.price - b.price, tat: a.tat - b.tat, code: a.code.localeCompare(b.code) })[f.sort]);
  }, [q, cat, f]);

  const total = orderTotal(codes, CATALOG, s.promos, TODAY);
  const filtered = q || cat >= 0 || f.bm || f.tat || f.price || f.promo;
  const priceCsv = () => {
    download(`prais-${s.clinic.partnerId}-${TODAY}.csv`, toCsv([['Код', 'Исследование', 'Раздел', 'Биоматериал', 'Срок, раб. дн.', 'Цена, ₽', 'Цена по акции, ₽'],
      ...CATALOG.map((t) => { const p = priceOf(t, s.promos, TODAY); return [t.code, t.name, CATEGORIES[t.cat], t.bm.map((b) => TUBES[b.tube].label).join(' / '), t.tat, t.price, p.promo ? p.price : '']; })]));
    toast('Прайс скачан: открывается в Excel.', { icon: 'file-spreadsheet' });
  };

  return html`<div class="page">
    <div class="page__head">
      <div><h1>Каталог исследований</h1><p class="page__sub">${CATALOG.length} ${plural(CATALOG.length, 'исследование', 'исследования', 'исследований')} · цены по вашему договору</p></div>
      <div class="page__actions"><button class="btn btn--line" onClick=${priceCsv}><${Icon} name="download" />Скачать прайс</button></div>
    </div>
    <div class="csearch" role="search">
      <${Icon} name="search" />
      <input type="search" aria-label="Поиск исследований" placeholder="Название, код теста или ген: например, НИПТ, 0402, BRCA1" value=${q} onInput=${(e) => setQ(e.target.value)} />
      ${q && html`<button class="btn btn--ghost btn--sm" onClick=${() => setQ('')}>Очистить</button>`}
    </div>
    <div class="quick"><${Icon} name="history" />Часто заказываете:
      ${[...CATALOG].sort((a, b) => a.popular - b.popular).slice(0, 4).map((t) => html`<button type="button" onClick=${() => setQ(t.code)}>${t.short}</button>`)}
    </div>
    <div class="seg" role="group" aria-label="Раздел">
      <button type="button" aria-pressed=${cat < 0} onClick=${() => setCat(-1)}>Все</button>
      ${CATEGORIES.map((c, i) => html`<button type="button" aria-pressed=${cat === i} onClick=${() => setCat(i)}>${c}</button>`)}
    </div>
    <div class="fbar">
      <${Icon} name="sliders-horizontal" />
      <select class="select" aria-label="Биоматериал" value=${f.bm} onChange=${(e) => setF({ ...f, bm: e.target.value })}>
        <option value="">Биоматериал</option>${Object.entries(TUBES).map(([k, t]) => html`<option value=${k}>${t.label}</option>`)}</select>
      <select class="select" aria-label="Срок выполнения" value=${f.tat} onChange=${(e) => setF({ ...f, tat: e.target.value })}>${TAT.map(([v, l]) => html`<option value=${v}>${l}</option>`)}</select>
      <select class="select" aria-label="Цена" value=${f.price} onChange=${(e) => setF({ ...f, price: e.target.value })}>${PRICE.map(([v, l]) => html`<option value=${v}>${l}</option>`)}</select>
      <select class="select" aria-label="Сортировка" value=${f.sort} onChange=${(e) => setF({ ...f, sort: e.target.value })}>${SORT.map(([v, l]) => html`<option value=${v}>${l}</option>`)}</select>
      <label class="switch"><input type="checkbox" checked=${f.promo} onChange=${(e) => setF({ ...f, promo: e.target.checked })} />Только с акцией</label>
    </div>
    <div class="found" aria-live="polite">Найдено ${list.length} ${plural(list.length, 'исследование', 'исследования', 'исследований')}
      ${filtered && html`<button class="linkish" onClick=${reset}><${Icon} name="x" />Сбросить фильтры</button>`}</div>

    <div class="catalog">
      <div class="tlist">
        ${list.length === 0 && html`<div class="card"><${Empty} icon="search" title="Ничего не нашли" text="Проверьте код или попробуйте название гена. Полный перечень — в прайсе." action=${html`<button class="btn btn--line" onClick=${reset}>Сбросить фильтры</button>`} /></div>`}
        ${list.map((t) => {
          const inOrder = codes.includes(t.code);
          const bundle = bundledIn(t.code, codes, CATALOG);
          const pr = priceOf(t, s.promos, TODAY);
          return html`<article class="trow ${inOrder ? 'is-in' : ''}" key=${t.code} aria-label=${t.name}>
            <div>
              <div class="trow__tags"><span class="mono">Код ${t.code}</span><span class="tag">${CATEGORIES[t.cat]}</span>${pr.promo && html`<span class="tag tag--promo">Акция −${pr.promo.pct}%</span>`}</div>
              <div class="trow__name">${t.name}</div>
              <div class="trow__meta">
                <span><${TubeDot} tube=${t.bm[0].tube} tubes=${TUBES} />${t.bm.map((b) => `${TUBES[b.tube].label}${b.qty > 1 ? ` × ${b.qty}` : ''}`).join(' / ')}</span>
                <span><${Icon} name="clock" />${t.tat} раб. дн.</span>
                ${t.participants && html`<span><${Icon} name="users" />${1 + t.participants.length} участника</span>`}
                ${t.adds && html`<span><${Icon} name="layers" />+ ${t.adds.join(', ')} автоматически</span>`}
                <button class="linkish" aria-expanded=${open === t.code} onClick=${() => setOpen(open === t.code ? null : t.code)}><${Icon} name="test-tube" />Преаналитика</button>
              </div>
              ${open === t.code && html`<div class="prean">${t.bm.map((b) => html`<div><b>${TUBES[b.tube].name}${b.qty > 1 ? `, ${b.qty} шт.` : ''}.</b> ${PREANALYTICS[b.tube].take} ${PREANALYTICS[b.tube].keep}</div>`)}
                <a href=${`#/preanalytics?tube=${t.bm[0].tube}`}>Вся преаналитика</a></div>`}
            </div>
            <div class="trow__side">
              <div class="price">${pr.promo && html`<s>${money(pr.base)}</s>`}${money(pr.price)}</div>
              ${bundle ? html`<span class="chip chip--ok">В комплекте с ${bundle.code}</span>`
                : inOrder ? html`<button class="btn btn--line btn--sm" aria-pressed="true" aria-label=${`${t.short} в заказе. Убрать`} onClick=${() => removeFromDraft(t.code)}><${Icon} name="check" />В заказе</button>`
                : html`<button class="btn btn--primary btn--sm" onClick=${() => addToDraft([t.code])}><${Icon} name="circle-plus" />В заказ</button>`}
            </div>
          </article>`;
        })}
      </div>
      <aside class="card cart" aria-label="Новый заказ">
        <div class="cart__head"><h2>Новый заказ</h2>${codes.length ? html`<span class="count count--soft">${codes.length}</span>` : null}</div>
        <div class="cart__body">
          ${s.formDraft?.patient?.last && html`<div class="cart__patient"><${Icon} name="user" />${fullName(s.formDraft.patient)}${s.formDraft.patient.dob ? html`<span class="muted mono">${fmtDate(s.formDraft.patient.dob)}</span>` : null}</div>`}
          ${codes.length === 0 ? html`<p class="cart__empty">Нажмите «В заказ» у нужных исследований — пробирки и сумма посчитаются здесь.</p>`
            : html`<div class="cart__items">${codes.map((c) => {
                const t = CATALOG.find((x) => x.code === c);
                const bundle = bundledIn(c, codes, CATALOG);
                return html`<div class="citem"><span class="citem__name"><span class="code">${c}</span> ${t.short}</span>
                  <span class="citem__price">${bundle ? '—' : money(priceOf(t, s.promos, TODAY).price)}</span>
                  ${bundle ? html`<span></span>` : html`<button aria-label=${`Убрать ${t.short}`} onClick=${() => removeFromDraft(c)}><${Icon} name="x" /></button>`}</div>`;
              })}</div>
              <${TakeBlock} codes=${codes} bm=${s.formDraft.bm || {}} participants=${[]} compact />
              <div class="total"><span>Итого</span><b>${money(total)}</b></div>`}
          <a class="btn btn--primary btn--block" href="#/new" aria-disabled=${!codes.length}>Оформить заказ</a>
          <p class="muted">Бланк заказа и штрих-коды распечатаются после сохранения.</p>
        </div>
      </aside>
    </div>
    ${codes.length > 0 && html`<div class="mobilecart"><span>${codes.length} ${plural(codes.length, 'исследование', 'исследования', 'исследований')} · <b>${money(total)}</b></span><a class="btn btn--primary btn--sm" href="#/new">Оформить</a></div>`}
  </div>`;
}
