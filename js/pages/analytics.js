import { useState } from '../vendor/preact-htm.js';
import { html, Icon, Chip, toast, download } from '../ui.js';
import { useStore, TODAY, testByCode } from '../store.js';
import { CATALOG, MONTHS, RETAKE_REASONS, BENCH, PGT_DEMO, PGT_AGES, history } from '../data.js';
import { money, plural, priceOf, bundledIn, toCsv } from '../logic.js';

const HISTORY = history(TODAY);
export const HISTORY_MONTHS = HISTORY.map((m) => m.ym);
export const monthName = (ym) => `${MONTHS[Number(ym.slice(5)) - 1]} ${ym.slice(0, 4)}`;
const SHORT = ['янв', 'фев', 'мар', 'апр', 'май', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];
const NBSP = ' ';
const pct = (v, d = 1) => `${(v * 100).toFixed(d).replace('.', ',')}${NBSP}%`;
const idNum = (id) => Number(id.slice(3));

// Billable lines of a real order: bundled tests are free, promo prices as on the order card.
function orderLines(o, promos) {
  const codes = o.tests.map((t) => t.code);
  const day = o.createdAt.slice(0, 10);
  return codes
    .filter((c) => !bundledIn(c, codes, CATALOG))
    .map((code) => {
      const x = testByCode(code);
      const price = x.bm.length ? priceOf(x, promos, day).price : x.price;
      return { id: o.id, date: day, code, name: x.name, price, promo: price < x.price };
    });
}

// Everything billed in a month 'YYYY-MM': demo history plus the orders in «Мои заказы».
export function monthLines(s, ym) {
  const h = HISTORY.find((m) => m.ym === ym);
  const real = s.orders.filter((o) => o.createdAt.slice(0, 7) === ym && !['draft', 'cancelled'].includes(o.status));
  const lines = [
    ...(h?.orders || []).map((o) => {
      const t = CATALOG.find((c) => c.code === o.code);
      return { ...o, name: t.name, price: t.price };
    }),
    ...real.flatMap((o) => orderLines(o, s.promos)),
  ].sort((a, b) => a.date.localeCompare(b.date) || idNum(a.id) - idNum(b.id));
  return { lines, orders: (h?.orders.length || 0) + real.length, sum: lines.reduce((a, l) => a + l.price, 0) };
}

const PERIODS = [
  [3, '3 месяца'],
  [6, '6 месяцев'],
  [12, '12 месяцев'],
];

// dir: 1 when more is better, -1 when less is better
function verdict(mine, avg, dir, tol) {
  const d = (mine - avg) * dir;
  if (d > tol) return ['ok', 'лучше среднего'];
  if (d < -tol) return ['warn', 'хуже среднего'];
  return ['neutral', 'на уровне среднего'];
}

function Seg({ id, label, value, options, onChange }) {
  return html`<span class="field__label" id=${id}>${label}</span>
    <div class="segctl" role="radiogroup" aria-labelledby=${id}>
      ${options.map(
        ([v, l]) =>
          html`<button type="button" role="radio" aria-checked=${value === v} onClick=${() => onChange(v)}>
            ${l}
          </button>`,
      )}
    </div>`;
}

function MonthChart({ months }) {
  const [hover, setHover] = useState(null);
  const max = Math.max(...months.map((m) => m.orders));
  const top = Math.ceil(max / 10) * 10;
  const last = months.length - 1;
  return html`<div class="vchart">
    <div class="vchart__plot">
      ${[top, top / 2, 0].map(
        (t) =>
          html`<div class="vchart__tick" style=${`bottom:${(t / top) * 100}%`}><span>${t}</span></div>`,
      )}
      <div class="vchart__cols" style=${`grid-template-columns:repeat(${months.length},minmax(0,1fr))`}>
        ${months.map((m, i) => {
          const h = (m.orders / top) * 100;
          const words = `${m.orders} ${plural(m.orders, 'заказ', 'заказа', 'заказов')}`;
          return html`<button
            type="button"
            class="vchart__col ${hover === i ? 'is-hover' : ''}"
            aria-label=${`${monthName(m.ym)}: ${words}, ${money(m.sum)}`}
            onMouseEnter=${() => setHover(i)}
            onMouseLeave=${() => setHover(null)}
            onFocus=${() => setHover(i)}
            onBlur=${() => setHover(null)}
          >
            <span class="vchart__bar" style=${`height:${h}%`}></span>
            ${i === last && hover !== i && html`<span class="vchart__val" style=${`bottom:${h}%`}>${m.orders}</span>`}
            ${hover === i &&
            html`<span
              class="vchart__tip ${i < 2 ? 'is-left' : i > last - 2 ? 'is-right' : ''}"
              style=${`bottom:calc(${h}% + 10px)`}
              role="tooltip"
              ><b>${words}</b><span>${monthName(m.ym)}</span><span>${money(m.sum)}</span></span
            >`}
          </button>`;
        })}
      </div>
    </div>
    <div class="vchart__x" style=${`grid-template-columns:repeat(${months.length},minmax(0,1fr))`} aria-hidden="true">
      ${months.map(
        (m, i) => html`<span>${SHORT[m.m - 1]}${i === 0 || m.m === 1 ? html`<br />${m.y}` : null}</span>`,
      )}
    </div>
  </div>`;
}

function PgtChart({ data, col, label }) {
  return html`<div class="hchart">
    <div class="keys">
      <span class="key"><i class="key--1"></i>Ваша клиника</span>
      <span class="key"><i class="key--2"></i>${label}</span>
    </div>
    ${PGT_AGES.map(
      (age, gi) =>
        html`<div class="hchart__row">
          <div class="hchart__label">${age}</div>
          <div class="hchart__bars">
            ${[0, col].map(
              (k, j) =>
                html`<div class="hchart__line">
                  <span class=${`hchart__bar hchart__bar--${j + 1}`} style=${`width:${data.groups[gi][k]}%`}></span
                  ><span class="hchart__val">${data.groups[gi][k]}${NBSP}%</span>
                </div>`,
            )}
          </div>
        </div>`,
    )}
  </div>`;
}

export function Analytics() {
  const s = useStore();
  const [period, setPeriod] = useState(12);
  const [cmp, setCmp] = useState('all');
  const b = BENCH[cmp];
  const col = cmp === 'all' ? 1 : 2;
  const months = HISTORY.slice(-period).map((h) => ({ ...h, ...monthLines(s, h.ym) }));
  const orders = months.reduce((a, m) => a + m.orders, 0);
  const sum = months.reduce((a, m) => a + m.sum, 0);
  const share = (f) => months.reduce((a, m) => a + m[f] * m.orders, 0) / orders;
  const range = `${monthName(months[0].ym)} — ${monthName(months.at(-1).ym)}`;

  const compare = [
    ['Перезаборы', 'доля заказов, где понадобился повторный забор', share('retakeShare'), b.retake, -1, 0.003],
    ['Заключения готовы в срок', 'доля заказов, выполненных в заявленный срок', share('onTimeShare'), b.onTime, 1, 0.01],
    ['Заказы через кабинет', 'остальные пришли на бумажных бланках', share('lkpShare'), b.lkp, 1, 0.01],
  ];

  const byCode = {};
  for (const l of months.flatMap((m) => m.lines)) {
    byCode[l.code] ||= { code: l.code, name: l.name, n: 0 };
    byCode[l.code].n++;
  }
  const mixAll = Object.values(byCode).sort((a, z) => z.n - a.n);
  const tests = mixAll.reduce((a, t) => a + t.n, 0);
  const mix = mixAll.slice(0, 6);
  const rest = mixAll.slice(6).reduce((a, t) => a + t.n, 0);

  const reasons = RETAKE_REASONS.map((r, i) => [r, months.reduce((a, m) => a + m.reasons[i], 0)])
    .filter(([, n]) => n)
    .sort((a, z) => z[1] - a[1]);
  const retakes = reasons.reduce((a, [, n]) => a + n, 0);
  const pgt = PGT_DEMO[period];

  const exportCsv = () => {
    download(
      `analitika-${s.clinic.partnerId}-${months[0].ym}-${months.at(-1).ym}.csv`,
      toCsv([
        ['Месяц', 'Заказов', 'Сумма, ₽'],
        ...months.map((m) => [monthName(m.ym), m.orders, m.sum]),
        ['Итого', orders, sum],
        [],
        ['Показатель', 'Ваша клиника, %', `${b.label}, %`],
        ...compare.map(([name, , mine, avg]) => [name, (mine * 100).toFixed(1), (avg * 100).toFixed(1)]),
        [],
        ['Код', 'Исследование', 'Количество'],
        ...mixAll.map((t) => [t.code, t.name, t.n]),
      ]),
    );
    toast('Отчёт скачан: открывается в Excel.', { icon: 'file-spreadsheet' });
  };

  return html`<div class="page">
    <div class="page__head">
      <div>
        <h1>Аналитика</h1>
        <p class="page__sub">
          Ваша клиника в сравнении с другими партнёрами Геномед. Данные других клиник обезличены: видны только средние
          значения.
        </p>
      </div>
      <div class="page__actions">
        <button class="btn btn--line" onClick=${exportCsv}><${Icon} name="download" />Скачать в Excel</button>
      </div>
    </div>

    <div class="fbar fbar--wrap">
      <${Seg} id="per-l" label="Период:" value=${period} options=${PERIODS} onChange=${setPeriod} />
      <${Seg}
        id="cmp-l"
        label="Сравнивать с:"
        value=${cmp}
        options=${Object.entries(BENCH).map(([k, v]) => [k, v.label])}
        onChange=${setCmp}
      />
    </div>
    <p class="muted">${range}, полные месяцы.</p>

    <section class="section tablewrap" aria-labelledby="cmp-h">
      <div class="card__head"><h2 id="cmp-h">Сравнение с другими клиниками</h2></div>
      <div class="tscroll">
        <table class="t t--cards">
          <thead>
            <tr>
              <th>Показатель</th>
              <th>Ваша клиника</th>
              <th>${b.label}</th>
              <th>Итог</th>
            </tr>
          </thead>
          <tbody>
            ${compare.map(([name, hint, mine, avg, dir, tol]) => {
              const [tone, word] = verdict(mine, avg, dir, tol);
              return html`<tr>
                <td>${name}<div class="muted">${hint}</div></td>
                <td class="num" data-l="Ваша клиника"><b>${pct(mine)}</b></td>
                <td class="num" data-l=${b.label}>${pct(avg)}</td>
                <td><${Chip} tone=${tone}>${word}<//></td>
              </tr>`;
            })}
          </tbody>
        </table>
      </div>
    </section>

    <section class="section card" aria-labelledby="mon-h">
      <div class="card__head">
        <h2 id="mon-h">Заказы по месяцам</h2>
      </div>
      <div class="card__pad">
        <p class="muted">Всего ${orders} ${plural(orders, 'заказ', 'заказа', 'заказов')} на ${money(sum)}</p>
        <div class="vchart__scroll"><${MonthChart} months=${months} /></div>
        <details class="vchart__table">
          <summary>Показать таблицей</summary>
          <table class="t">
            <thead>
              <tr>
                <th>Месяц</th>
                <th>Заказов</th>
                <th>Сумма</th>
              </tr>
            </thead>
            <tbody>
              ${months.map(
                (m) =>
                  html`<tr>
                    <td>${monthName(m.ym)}</td>
                    <td class="num">${m.orders}</td>
                    <td class="num">${money(m.sum)}</td>
                  </tr>`,
              )}
            </tbody>
          </table>
        </details>
      </div>
    </section>

    <div class="grid2 section">
      <section class="tablewrap" aria-labelledby="mix-h">
        <div class="card__head"><h2 id="mix-h">Что заказываете</h2></div>
        <table class="t">
          <thead>
            <tr>
              <th>Исследование</th>
              <th>Заказов</th>
              <th>Доля</th>
            </tr>
          </thead>
          <tbody>
            ${mix.map(
              (t) =>
                html`<tr>
                  <td><span class="code">${t.code}</span> ${testByCode(t.code).short}</td>
                  <td class="num">${t.n}</td>
                  <td class="num">${pct(t.n / tests, 0)}</td>
                </tr>`,
            )}
            ${rest > 0 &&
            html`<tr>
              <td>Остальные</td>
              <td class="num">${rest}</td>
              <td class="num">${pct(rest / tests, 0)}</td>
            </tr>`}
          </tbody>
        </table>
      </section>
      <section class="tablewrap" aria-labelledby="rt-h">
        <div class="card__head"><h2 id="rt-h">Причины перезаборов</h2></div>
        <table class="t">
          <thead>
            <tr>
              <th>Причина</th>
              <th>Случаев</th>
            </tr>
          </thead>
          <tbody>
            ${reasons.map(
              ([r, n]) =>
                html`<tr>
                  <td>${r}</td>
                  <td class="num">${n}</td>
                </tr>`,
            )}
          </tbody>
        </table>
        <p class="card__pad muted">
          Всего ${retakes} ${plural(retakes, 'перезабор', 'перезабора', 'перезаборов')} за период. Правила забора и
          хранения — в разделе <a href="#/preanalytics">«Преаналитика»</a>.
        </p>
      </section>
    </div>

    <section class="section card" aria-labelledby="pgt-h">
      <div class="card__head">
        <h2 id="pgt-h">ПГТ-А: эмбриологическая лаборатория</h2>
      </div>
      <div class="card__pad">
        <p class="infoline">
          <${Icon} name="info" /><span>Пример для клиник ЭКО: в демо-клинике ПГТ-А не заказывали.</span>
        </p>
        <p>
          Доля эуплоидных эмбрионов (с нормальным набором хромосом) среди исследованных, по возрасту пациентки. Циклы с
          донорскими яйцеклетками не учитываются. Исследовано эмбрионов за период: ${pgt.embryos}.
        </p>
        <${PgtChart} data=${pgt} col=${col} label=${b.label} />
        <table class="t t--cards pgt-extra">
          <thead>
            <tr>
              <th>Показатель</th>
              <th>Ваша клиника</th>
              <th>${b.label}</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Эмбрионы без результата<div class="muted">не удалось получить данные по биоптату</div></td>
              <td class="num" data-l="Ваша клиника"><b>${String(pgt.noResult[0]).replace('.', ',')}${NBSP}%</b></td>
              <td class="num" data-l=${b.label}>${String(pgt.noResult[col]).replace('.', ',')}${NBSP}%</td>
            </tr>
            <tr>
              <td>Мозаичные эмбрионы</td>
              <td class="num" data-l="Ваша клиника"><b>${pgt.mosaic[0]}${NBSP}%</b></td>
              <td class="num" data-l=${b.label}>${pgt.mosaic[col]}${NBSP}%</td>
            </tr>
          </tbody>
        </table>
        <button
          class="btn btn--line pgt-ask"
          onClick=${() =>
            toast('Запрос передан менеджеру. Подробный отчёт придёт на почту клиники.', { icon: 'send' })}
        >
          <${Icon} name="send" />Запросить подробный отчёт
        </button>
      </div>
    </section>
  </div>`;
}
