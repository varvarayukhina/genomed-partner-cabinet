import { useState } from '../vendor/preact-htm.js';
import { html, Icon, Dialog, Field, toast, download } from '../ui.js';
import { useStore, TODAY, nowStamp } from '../store.js';
import { money, fmtDate, toCsv } from '../logic.js';
import { printNode } from '../print.js';
import { HISTORY_MONTHS, monthLines, monthName } from './analytics.js';

const CUR = TODAY.slice(0, 7);
const ALL = [...HISTORY_MONTHS, CUR]; // oldest first
const LAST_CLOSED = HISTORY_MONTHS.at(-1);
const cap = (t) => t[0].toUpperCase() + t.slice(1);
const mmyy = (ym) => `${ym.slice(5)}/${ym.slice(2, 4)}`;
const lastDay = (ym) => `${ym}-${new Date(Number(ym.slice(0, 4)), Number(ym.slice(5)), 0).getDate()}`;
const periodName = (from, to) => (from === to ? monthName(from) : `${monthName(from)} — ${monthName(to)}`);
const fileTag = (s, from, to) => `${s.clinic.partnerId}-${from}${from === to ? '' : `_${to}`}`;

function collect(s, from, to) {
  const parts = ALL.filter((ym) => ym >= from && ym <= to).map((ym) => monthLines(s, ym));
  return {
    lines: parts.flatMap((p) => p.lines),
    orders: parts.reduce((a, p) => a + p.orders, 0),
    sum: parts.reduce((a, p) => a + p.sum, 0),
  };
}

function Act({ s, from, to, data }) {
  const groups = {};
  for (const l of data.lines) (groups[`${l.code}|${l.price}`] ||= { ...l, qty: 0 }).qty++;
  const rows = Object.values(groups).sort((a, b) => a.code.localeCompare(b.code) || b.price - a.price);
  return html`<section class="pdoc">
    <div class="pdoc__top">
      <div>
        <img src="assets/genomed-logo.png" alt="Геномед" />
        <div class="small">Кабинет партнёра · ${s.clinic.name} · ID ${s.clinic.partnerId}</div>
      </div>
      <div class="small" style="text-align:right">Сформировано ${fmtDate(TODAY)} ${nowStamp().slice(11)}</div>
    </div>
    <p class="small">Демо-образец. В рабочей версии акт формирует бухгалтерия Геномед по данным учётной системы.</p>
    <h1>Акт оказанных услуг № ${s.clinic.partnerId}-${mmyy(from)}${from === to ? '' : `–${mmyy(to)}`}</h1>
    <p>За период с ${fmtDate(`${from}-01`)} по ${fmtDate(lastDay(to))}</p>
    <table>
      <tbody>
        <tr>
          <th style="width:28%">Исполнитель</th>
          <td>Геномед, реквизиты по договору</td>
        </tr>
        <tr>
          <th>Заказчик</th>
          <td>${s.clinic.name}, ИНН ${s.clinic.inn}</td>
        </tr>
        <tr>
          <th>Основание</th>
          <td>Договор ${s.clinic.contract}</td>
        </tr>
      </tbody>
    </table>
    <table>
      <thead>
        <tr>
          <th>№</th>
          <th>Код</th>
          <th>Услуга</th>
          <th style="white-space:nowrap">Кол-во</th>
          <th>Цена</th>
          <th>Сумма</th>
        </tr>
      </thead>
      <tbody>
        ${rows.map(
          (r, i) =>
            html`<tr>
              <td>${i + 1}</td>
              <td>${r.code}</td>
              <td>${r.name}${r.promo ? ' (цена по акции)' : ''}</td>
              <td>${r.qty}</td>
              <td>${money(r.price)}</td>
              <td>${money(r.price * r.qty)}</td>
            </tr>`,
        )}
      </tbody>
    </table>
    <p><b>Итого: ${money(data.sum)}</b>. Заказов: ${data.orders}, услуг: ${data.lines.length}.</p>
    <p>Услуги оказаны в полном объёме. Заказчик претензий по объёму, качеству и срокам оказания услуг не имеет.</p>
    <div class="sign">
      <div>Исполнитель</div>
      <div>Заказчик</div>
    </div>
  </section>`;
}

function MonthSelect({ id, value, onChange }) {
  return html`<select id=${id} class="select" value=${value} onChange=${(e) => onChange(e.target.value)}>
    ${ALL.map(
      (ym) => html`<option value=${ym}>${cap(monthName(ym))}${ym === CUR ? ' (месяц идёт)' : ''}</option>`,
    )}
  </select>`;
}

function GenDialog({ onClose, onAct, onReg }) {
  const [f, setF] = useState({ from: LAST_CLOSED, to: LAST_CLOSED, act: true, reg: true });
  const [tried, setTried] = useState(false);
  const set = (p) => setF({ ...f, ...p });
  const openMonth = f.to === CUR;
  const act = f.act && !openMonth;
  const err =
    f.from > f.to
      ? 'Начало периода позже конца. Поменяйте месяцы местами.'
      : !act && !f.reg
        ? 'Выберите хотя бы один документ.'
        : '';
  const submit = () => {
    setTried(true);
    if (err) return;
    if (f.reg) onReg(f.from, f.to);
    if (act) onAct(f.from, f.to);
    onClose();
  };
  return html`<${Dialog}
    title="Сформировать документы"
    onClose=${onClose}
    footer=${html`<button class="btn btn--line" onClick=${onClose}>Отмена</button>
      <button class="btn btn--primary" onClick=${submit}><${Icon} name="file-check" />Сформировать</button>`}
  >
    <div class="grid2">
      <${Field} label="С месяца" id="d-from"><${MonthSelect} id="d-from" value=${f.from} onChange=${(v) => set({ from: v })} /><//>
      <${Field} label="По месяц" id="d-to"><${MonthSelect} id="d-to" value=${f.to} onChange=${(v) => set({ to: v })} /><//>
    </div>
    <fieldset class="docpick">
      <legend>Документы</legend>
      <label class="switch"
        ><input type="checkbox" checked=${act} disabled=${openMonth} onChange=${(e) => set({ act: e.target.checked })} />Акт
        оказанных услуг (PDF)</label
      >
      ${openMonth &&
      html`<p class="muted">
        ${cap(monthName(CUR))} ещё идёт, акт за него будет после закрытия месяца. Реестр можно скачать уже сейчас.
      </p>`}
      <label class="switch"
        ><input type="checkbox" checked=${f.reg} onChange=${(e) => set({ reg: e.target.checked })} />Реестр исследований
        (Excel): каждое исследование отдельной строкой с номером заказа</label
      >
    </fieldset>
    ${tried && err && html`<div class="field__err" role="alert"><${Icon} name="triangle-alert" />${err}</div>`}
  <//>`;
}

export function Documents() {
  const s = useStore();
  const [dlg, setDlg] = useState(false);
  const rows = [...ALL].reverse().map((ym) => ({ ym, ...monthLines(s, ym) }));
  const printAct = (from, to) =>
    printNode(html`<${Act} s=${s} from=${from} to=${to} data=${collect(s, from, to)} />`);
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
        <p class="page__sub">Акты оказанных услуг и реестры исследований по договору ${s.clinic.contract}</p>
      </div>
      <div class="page__actions">
        <button class="btn btn--primary" onClick=${() => setDlg(true)}>
          <${Icon} name="file-check" />Сформировать документы
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
              <th>Документы</th>
            </tr>
          </thead>
          <tbody>
            ${rows.map(
              (r) =>
                html`<tr key=${r.ym}>
                  <td>
                    <b>${cap(monthName(r.ym))}</b>
                    ${r.ym === CUR && html`<div class="muted">месяц идёт, акт будет после закрытия</div>`}
                  </td>
                  <td class="num" data-l="Заказов">${r.orders}</td>
                  <td class="num" data-l="Сумма">${money(r.sum)}</td>
                  <td>
                    <div class="docbtns">
                      ${r.ym !== CUR &&
                      html`<button
                        class="btn btn--line btn--sm"
                        aria-label=${`Акт за ${monthName(r.ym)}, PDF`}
                        onClick=${() => printAct(r.ym, r.ym)}
                      >
                        <${Icon} name="file-down" />Акт
                      </button>`}
                      <button
                        class="btn btn--line btn--sm"
                        aria-label=${`Реестр за ${monthName(r.ym)}, Excel`}
                        onClick=${() => saveReg(r.ym, r.ym)}
                      >
                        <${Icon} name="file-spreadsheet" />Реестр
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
      Акт открывается в окне печати: там же его можно сохранить в PDF. Нужен акт сверки или документы в другом виде —
      напишите <a href="#/managers">менеджеру</a>.
    </p>
    ${dlg && html`<${GenDialog} onClose=${() => setDlg(false)} onAct=${printAct} onReg=${saveReg} />`}
  </div>`;
}
