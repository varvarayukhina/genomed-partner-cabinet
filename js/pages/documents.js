import { useState } from '../vendor/preact-htm.js';
import { html, Icon, Chip, Dialog, Field, toast, download } from '../ui.js';
import { useStore, TODAY } from '../store.js';
import { money, fmtDate, toCsv, pad, plural } from '../logic.js';
import { SUPPORT_PHONE } from '../data.js';
import { printNode } from '../print.js';
import { HISTORY_MONTHS, monthLines, monthName } from './analytics.js';

const CUR = TODAY.slice(0, 7);
const ALL = [...HISTORY_MONTHS, CUR]; // oldest first
const LAST_CLOSED = HISTORY_MONTHS.at(-1);
const SELLER = 'ООО «Геномед»';
const cap = (t) => t[0].toUpperCase() + t.slice(1);
const mmyy = (ym) => `${ym.slice(5)}/${ym.slice(2, 4)}`;
const lastDay = (ym) => `${ym}-${new Date(Number(ym.slice(0, 4)), Number(ym.slice(5)), 0).getDate()}`;
const periodName = (from, to) => (from === to ? monthName(from) : `${monthName(from)} — ${monthName(to)}`);
const fileTag = (s, from, to) => `${s.clinic.partnerId}-${from}${from === to ? '' : `_${to}`}`;
const docNo = (s, ym) => `${s.clinic.partnerId}-${mmyy(ym)}`;
const nextMonthDay = (ym, d) => {
  const x = new Date(Number(ym.slice(0, 4)), Number(ym.slice(5)), d);
  return `${x.getFullYear()}-${pad(x.getMonth() + 1)}-${pad(d)}`;
};

// Demo ЭДО: Геномед signs on the 3rd of the next month, the clinic on the 6th; the last closed month waits for the clinic.
const edo = (ym) => ({ gm: nextMonthDay(ym, 3), cl: ym === LAST_CLOSED ? null : nextMonthDay(ym, 6) });

function collect(s, from, to) {
  const parts = ALL.filter((ym) => ym >= from && ym <= to).map((ym) => monthLines(s, ym));
  return {
    lines: parts.flatMap((p) => p.lines),
    orders: parts.reduce((a, p) => a + p.orders, 0),
    sum: parts.reduce((a, p) => a + p.sum, 0),
  };
}

/* ---------- printed documents ---------- */

function Head({ ym, title, sub }) {
  return html`<header class="cdoc__head">
      <img src="assets/genomed-logo.png" alt="Геномед" />
      <div>${SELLER} · genomed.ru<br />Клиентский сервис 24/7: ${SUPPORT_PHONE}</div>
    </header>
    <p class="cdoc__label">Закрывающие документы · ${monthName(ym)}</p>
    <h1>${title}</h1>
    <p class="cdoc__sub">${sub}</p>`;
}

function Parties({ s, a, b }) {
  return html`<div class="cdoc__parties">
      <div><span>${a}</span><b>${SELLER}</b>Реквизиты — по договору</div>
      <div><span>${b}</span><b>${s.clinic.name}</b>ИНН ${s.clinic.inn}</div>
    </div>
    <p class="cdoc__basis">Основание: договор ${s.clinic.contract}</p>`;
}

function Signs({ s, ym, both }) {
  const e = edo(ym);
  const signed = (d) => html`<i>Подписано электронной подписью ${fmtDate(d)}</i>`;
  return html`<div class="cdoc__signs">
    <div class="is-ok"><span>Исполнитель</span><b>${SELLER}</b>${signed(e.gm)}</div>
    ${both &&
    html`<div class=${e.cl ? 'is-ok' : ''}>
      <span>Заказчик</span><b>${s.clinic.name}</b>${e.cl ? signed(e.cl) : html`<i>Ожидает подписи в ЭДО</i>`}
    </div>`}
  </div>`;
}

// same code at the same price is one line; promo prices are a separate line
function Services({ data, total }) {
  const groups = {};
  for (const l of data.lines) (groups[`${l.code}|${l.price}`] ||= { ...l, qty: 0 }).qty++;
  const rows = Object.values(groups).sort((a, b) => a.code.localeCompare(b.code) || b.price - a.price);
  return html`<table class="cdoc__t">
    <colgroup>
      <col style="width:5%" />
      <col style="width:8%" />
      <col />
      <col style="width:9%" />
      <col style="width:13%" />
      <col style="width:15%" />
    </colgroup>
    <thead>
      <tr>
        <th>№</th>
        <th>Код</th>
        <th>Услуга</th>
        <th class="r">Кол-во</th>
        <th class="r">Цена</th>
        <th class="r">Сумма</th>
      </tr>
    </thead>
    <tbody>
      ${rows.map(
        (r, i) =>
          html`<tr>
            <td>${i + 1}</td>
            <td>${r.code}</td>
            <td>${r.name}${r.promo && html`<small>цена по акции</small>`}</td>
            <td class="r">${r.qty}</td>
            <td class="r">${money(r.price)}</td>
            <td class="r">${money(r.price * r.qty)}</td>
          </tr>`,
      )}
      <tr class="cdoc__total">
        <td colspan="5">${total}</td>
        <td class="r">${money(data.sum)}</td>
      </tr>
    </tbody>
  </table>`;
}

function Act({ s, ym, data }) {
  return html`<section class="pdoc cdoc">
    <${Head}
      ym=${ym}
      title=${`Акт оказанных услуг № ${docNo(s, ym)}`}
      sub=${`от ${fmtDate(lastDay(ym))} · за период с ${fmtDate(`${ym}-01`)} по ${fmtDate(lastDay(ym))}`}
    />
    <${Parties} s=${s} a="Исполнитель" b="Заказчик" />
    <${Services} data=${data} total="Итого" />
    <p>
      Всего оказано услуг: ${data.lines.length} (заказов: ${data.orders}) на сумму ${money(data.sum)}. Услуги оказаны
      полностью и в срок, Заказчик претензий не имеет. Детализация — в реестре исследований к акту.
    </p>
    <${Signs} s=${s} ym=${ym} both />
  </section>`;
}

function Bill({ s, ym, data }) {
  return html`<section class="pdoc cdoc">
    <${Head} ym=${ym} title=${`Счёт на оплату № ${docNo(s, ym)}`} sub=${`от ${fmtDate(lastDay(ym))}`} />
    <${Parties} s=${s} a="Получатель" b="Плательщик" />
    <${Services} data=${data} total="К оплате" />
    <p>Оплата по акту № ${docNo(s, ym)}. Срок оплаты и банковские реквизиты — по договору.</p>
    <${Signs} s=${s} ym=${ym} />
  </section>`;
}

function Registry({ s, ym, data }) {
  return html`<section class="pdoc cdoc">
    <${Head}
      ym=${ym}
      title="Реестр исследований"
      sub=${`приложение к акту № ${docNo(s, ym)} от ${fmtDate(lastDay(ym))} · ${s.clinic.name}`}
    />
    <table class="cdoc__t">
      <colgroup>
        <col style="width:5%" />
        <col style="width:13%" />
        <col style="width:12%" />
        <col style="width:8%" />
        <col />
        <col style="width:13%" />
      </colgroup>
      <thead>
        <tr>
          <th>№</th>
          <th>Дата</th>
          <th>Заказ</th>
          <th>Код</th>
          <th>Исследование</th>
          <th class="r">Цена</th>
        </tr>
      </thead>
      <tbody>
        ${data.lines.map(
          (l, i) =>
            html`<tr>
              <td>${i + 1}</td>
              <td>${fmtDate(l.date)}</td>
              <td>${l.id}</td>
              <td>${l.code}</td>
              <td>${l.name}${l.promo && html`<small>цена по акции</small>`}</td>
              <td class="r">${money(l.price)}</td>
            </tr>`,
        )}
        <tr class="cdoc__total">
          <td colspan="5">
            Итого: ${data.lines.length} ${plural(data.lines.length, 'исследование', 'исследования', 'исследований')}
          </td>
          <td class="r">${money(data.sum)}</td>
        </tr>
      </tbody>
    </table>
  </section>`;
}

// one PDF: act, bill and registry for every closed month of the period
const Pack = ({ s, months }) =>
  months.map((ym) => {
    const data = monthLines(s, ym);
    return html`<${Act} s=${s} ym=${ym} data=${data} /><${Bill} s=${s} ym=${ym} data=${data} /><${Registry}
        s=${s}
        ym=${ym}
        data=${data}
      />`;
  });

/* ---------- page ---------- */

function MonthSelect({ id, value, onChange }) {
  return html`<select id=${id} class="select" value=${value} onChange=${(e) => onChange(e.target.value)}>
    ${ALL.map(
      (ym) => html`<option value=${ym}>${cap(monthName(ym))}${ym === CUR ? ' (месяц идёт)' : ''}</option>`,
    )}
  </select>`;
}

function GenDialog({ onClose, onPack, onReg }) {
  const [f, setF] = useState({ from: LAST_CLOSED, to: LAST_CLOSED, pack: true, reg: false });
  const [tried, setTried] = useState(false);
  const set = (p) => setF({ ...f, ...p });
  const onlyOpen = f.from === CUR;
  const pack = f.pack && !onlyOpen;
  const err =
    f.from > f.to
      ? 'Начало периода позже конца. Поменяйте месяцы местами.'
      : !pack && !f.reg
        ? 'Выберите хотя бы один вариант.'
        : '';
  const submit = () => {
    setTried(true);
    if (err) return;
    if (f.reg) onReg(f.from, f.to);
    if (pack) onPack(f.from, f.to);
    onClose();
  };
  return html`<${Dialog}
    title="Скачать документы за период"
    onClose=${onClose}
    footer=${html`<button class="btn btn--line" onClick=${onClose}>Отмена</button>
      <button class="btn btn--primary" onClick=${submit}><${Icon} name="file-down" />Скачать</button>`}
  >
    <div class="grid2">
      <${Field} label="С месяца" id="d-from"><${MonthSelect} id="d-from" value=${f.from} onChange=${(v) => set({ from: v })} /><//>
      <${Field} label="По месяц" id="d-to"><${MonthSelect} id="d-to" value=${f.to} onChange=${(v) => set({ to: v })} /><//>
    </div>
    <fieldset class="docpick">
      <legend>Что скачать</legend>
      <label class="switch"
        ><input type="checkbox" checked=${pack} disabled=${onlyOpen} onChange=${(e) => set({ pack: e.target.checked })} />Пакет
        документов одним PDF: акт, счёт и реестр за каждый месяц</label
      >
      ${f.to === CUR &&
      html`<p class="muted">
        ${cap(monthName(CUR))} ещё идёт: документов из ЭДО за него пока нет. Реестр в Excel можно скачать уже сейчас.
      </p>`}
      <label class="switch"
        ><input type="checkbox" checked=${f.reg} onChange=${(e) => set({ reg: e.target.checked })} />Реестр
        исследований в Excel одной таблицей</label
      >
    </fieldset>
    ${tried && err && html`<div class="field__err" role="alert"><${Icon} name="triangle-alert" />${err}</div>`}
  <//>`;
}

function EdoStatus({ ym }) {
  if (ym === CUR) return html`<${Chip} tone="neutral">Месяц идёт<//><div class="muted">документы после закрытия</div>`;
  const e = edo(ym);
  return e.cl
    ? html`<${Chip} tone="ok">Подписаны<//><div class="muted">${fmtDate(e.cl)}</div>`
    : html`<${Chip} tone="warn">Ждут вашей подписи<//><div class="muted">в ЭДО с ${fmtDate(e.gm)}</div>`;
}

export function Documents() {
  const s = useStore();
  const [dlg, setDlg] = useState(false);
  const rows = [...ALL].reverse().map((ym) => ({ ym, ...monthLines(s, ym) }));
  const printPack = (from, to) =>
    printNode(html`<${Pack} s=${s} months=${HISTORY_MONTHS.filter((ym) => ym >= from && ym <= to)} />`);
  const saveReg = (from, to) => {
    const d = collect(s, from, to);
    download(
      `reestr-${fileTag(s, from, to)}.csv`,
      toCsv([
        ['Заказ', 'Дата заказа', 'Код', 'Исследование', 'Цена, ₽'],
        ...d.lines.map((l) => [l.id, fmtDate(l.date), l.code, l.name, l.price]),
        ['Итого', '', '', '', d.sum],
      ]),
    );
    toast(`Реестр за ${periodName(from, to)} скачан: открывается в Excel.`, { icon: 'file-spreadsheet' });
  };

  return html`<div class="page">
    <div class="page__head">
      <div>
        <h1>Закрывающие документы</h1>
        <p class="page__sub">
          Акты, счета и реестры исследований по договору ${s.clinic.contract}. Документы приходят из ЭДО после
          закрытия месяца.
        </p>
      </div>
      <div class="page__actions">
        <button class="btn btn--primary" onClick=${() => setDlg(true)}>
          <${Icon} name="file-down" />Скачать за период
        </button>
      </div>
    </div>

    <div class="tablewrap">
      <div class="tscroll">
        <table class="t t--cards">
          <thead>
            <tr>
              <th>Период</th>
              <th>Заказов</th>
              <th>Сумма</th>
              <th>ЭДО</th>
              <th>Скачать</th>
            </tr>
          </thead>
          <tbody>
            ${rows.map(
              (r) =>
                html`<tr key=${r.ym}>
                  <td><b>${cap(monthName(r.ym))}</b></td>
                  <td class="num" data-l="Заказов">${r.orders}</td>
                  <td class="num" data-l="Сумма">${money(r.sum)}</td>
                  <td><${EdoStatus} ym=${r.ym} /></td>
                  <td>
                    <div class="docbtns">
                      ${r.ym !== CUR &&
                      html`<button
                        class="btn btn--line btn--sm"
                        aria-label=${`Акт, счёт и реестр за ${monthName(r.ym)}, PDF`}
                        onClick=${() => printPack(r.ym, r.ym)}
                      >
                        <${Icon} name="file-down" />Пакет PDF
                      </button>`}
                      <button
                        class="btn btn--line btn--sm"
                        aria-label=${`Реестр за ${monthName(r.ym)}, Excel`}
                        onClick=${() => saveReg(r.ym, r.ym)}
                      >
                        <${Icon} name="file-spreadsheet" />Реестр Excel
                      </button>
                    </div>
                  </td>
                </tr>`,
            )}
          </tbody>
        </table>
      </div>
    </div>
    <p class="muted section--tight">
      Пакет PDF: акт, счёт и реестр исследований за месяц. Он открывается в окне печати, там же его можно сохранить в
      PDF. Подписать документы можно в вашей системе ЭДО. Нужен акт сверки или другой документ — напишите${' '}
      <a href="#/managers">менеджеру</a>.
    </p>
    ${dlg && html`<${GenDialog} onClose=${() => setDlg(false)} onPack=${printPack} onReg=${saveReg} />`}
  </div>`;
}
