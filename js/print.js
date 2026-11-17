// Print documents (ТЗ п. 4 бланк заказа, п. 9 ИДС for Panorama, labels / barcodes).
import { html, render, useLayoutEffect, useRef } from './vendor/preact-htm.js';
import { CATALOG, TUBES, RAW_DATA } from './data.js';
import { fmtDate, fullName, shortName, ageYears, plural, money, priceOf, bmOf, bundledIn } from './logic.js';
import { getState, TODAY, nowStamp, markPrinted } from './store.js';

const testOf = (code) => (code === RAW_DATA.code ? RAW_DATA : CATALOG.find((t) => t.code === code));

function Barcode({ value, height = 44, width = 1.6 }) {
  const ref = useRef();
  useLayoutEffect(() => {
    // JsBarcode is loaded as a classic script in index.html
    window.JsBarcode(ref.current, value, {
      format: 'CODE128',
      height,
      width,
      margin: 0,
      fontSize: 13,
      font: 'Nunito Sans',
      textMargin: 2,
    });
  }, [value]);
  return html`<svg ref=${ref} aria-label=${`Штрихкод ${value}`}></svg>`;
}

function Head({ title, order }) {
  return html`<div class="pdoc__top">
      <div>
        <img src="assets/genomed-logo.png" alt="Геномед" />
        <div class="small">Кабинет партнёра · ${getState().clinic.name} · ID ${getState().clinic.partnerId}</div>
      </div>
      <div style="text-align:right">
        <${Barcode} value=${String(order.num)} />
        <div class="small">Сформировано ${fmtDate(TODAY)} ${nowStamp().slice(11)}</div>
      </div>
    </div>
    <h1>${title}</h1>`;
}

function Blank({ order }) {
  const s = getState();
  const p = order.patient;
  const c = order.clinical || {};
  return html`<section class="pdoc">
    <${Head} title=${`Бланк заказа ${order.id}`} order=${order} />
    <p class="small">
      Проверьте данные вместе с пациентом. Ошибка в ФИО или дате рождения задерживает выдачу заключения.
    </p>
    <h2>Пациент</h2>
    <table>
      <tbody>
        <tr>
          <th style="width:32%">ФИО</th>
          <td><b>${fullName(p)}</b></td>
        </tr>
        <tr>
          <th>Дата рождения</th>
          <td>${fmtDate(p.dob)} (${ageYears(p.dob, TODAY)} ${plural(ageYears(p.dob, TODAY), 'год', 'года', 'лет')})</td>
        </tr>
        <tr>
          <th>Пол</th>
          <td>${p.sex === 'f' ? 'женский' : 'мужской'}</td>
        </tr>
        ${p.phone &&
        html`<tr>
          <th>Телефон</th>
          <td>${p.phone}</td>
        </tr>`}
        ${order.card &&
        html`<tr>
          <th>Номер карты</th>
          <td>${order.card}</td>
        </tr>`}
        ${order.participants?.map(
          (x) =>
            html`<tr>
              <th>${x.role}</th>
              <td>${fullName(x)}, ${fmtDate(x.dob)}</td>
            </tr>`,
        )}
        ${c.weeks !== undefined &&
        html`<tr>
          <th>Беременность</th>
          <td>
            ${c.weeks} нед. ${c.days || 0} дн. по УЗИ · ${c.fetuses === 'single' ? 'одноплодная' : 'многоплодная'} ·
            ${' '}${c.ivf === 'yes' ? 'ЭКО' : 'естественная'} · донорская яйцеклетка: ${c.donor === 'yes' ? 'да' : 'нет'} ·
            вес ${c.weight} кг, рост ${c.height} см · пол плода:
            ${' '}${c.sexFetus === 'yes' ? 'определить' : 'не определять'}
          </td>
        </tr>`}
        ${c.block &&
        html`<tr>
          <th>Парафиновый блок</th>
          <td>№ ${c.block}${c.diagnosis ? ` · ${c.diagnosis}` : ''}</td>
        </tr>`}
        ${c.phenotype &&
        html`<tr>
          <th>Клинические данные</th>
          <td>${c.phenotype}</td>
        </tr>`}
      </tbody>
    </table>
    <h2>Исследования</h2>
    <table>
      <thead>
        <tr>
          <th>Код</th>
          <th>Исследование</th>
          <th>Биоматериал</th>
          <th>Срок</th>
          <th>Цена</th>
        </tr>
      </thead>
      <tbody>
        ${order.tests.map((t) => {
          const x = testOf(t.code);
          const bundle = bundledIn(
            t.code,
            order.tests.map((y) => y.code),
            CATALOG,
          );
          return html`<tr>
            <td><b>${t.code}</b></td>
            <td>${x.name}${bundle ? ` (добавлен к ${bundle.code})` : ''}</td>
            <td>${x.bm.length ? TUBES[bmOf(x, order.bm).tube].label : '—'}</td>
            <td>${x.tat} р. д.</td>
            <td>
              ${bundle
                ? 'в комплекте'
                : x.bm.length
                  ? money(priceOf(x, s.promos, order.createdAt.slice(0, 10)).price)
                  : money(x.price)}
            </td>
          </tr>`;
        })}
      </tbody>
    </table>
    ${order.tubes.length > 0 &&
    html`<h2>Пробирки и штрихкоды</h2>
      <table>
        <thead>
          <tr>
            <th>Штрихкод</th>
            <th>Биоматериал</th>
            <th>Чей</th>
            <th>Дата забора</th>
          </tr>
        </thead>
        <tbody>
          ${order.tubes.map(
            (t) =>
              html`<tr>
                <td><b>${t.code}</b></td>
                <td>${TUBES[t.tube].name}</td>
                <td>${who(order, t)}</td>
                <td>${fmtDate(order.collectedAt)}</td>
              </tr>`,
          )}
        </tbody>
      </table>`}
    <h2>Направивший врач</h2>
    <p>${order.doctor || '—'}${order.comment ? ` · Комментарий: ${order.comment}` : ''}</p>
    <div class="sign">
      <div>Данные проверены, пациент</div>
      <div>Сотрудник клиники</div>
    </div>
  </section>`;
}

// Упрощение: ИДС body is a placeholder; the approved Геномед/Natera consent text goes here.
function Ids({ order }) {
  const p = order.patient;
  return html`<section class="pdoc ids">
    <${Head} title="Информированное добровольное согласие на исследование Panorama" order=${order} />
    <p class="small">
      Демо-заглушка: подставить утверждённый текст ИДС из библиотеки («Информированное согласие: Panorama»).
    </p>
    <p>
      Я, <b>${fullName(p)}</b>, дата рождения <b>${fmtDate(p.dob)}</b>, даю согласие на проведение неинвазивного
      пренатального скринингового исследования Panorama (код 1105) по заказу <b>${order.id}</b>.
    </p>
    <p>
      Мне разъяснены цель исследования, его возможности и ограничения. Я понимаю, что это скрининговое исследование и
      его результат не является диагнозом; решения по результату принимаются вместе с лечащим врачом.
    </p>
    <p>
      Я согласна на обработку моих персональных данных лабораторией Геномед в объёме, необходимом для выполнения
      исследования и выдачи заключения.
    </p>
    <div class="sign">
      <div>Подпись пациентки / дата</div>
      <div>Подпись врача, ФИО</div>
    </div>
  </section>`;
}

function Labels({ order }) {
  const thermal = getState().settings.labelFormat === 'thermal';
  return html`<section class="pdoc">
    ${!thermal && html`<h1>Этикетки на пробирки · ${order.id}</h1>`}
    <div class="labels ${thermal ? 'labels--thermal' : 'labels--a4'}">
      ${order.tubes.map(
        (t) =>
          html`<div class="label">
            <b
              >${shortName(t.who ? order.participants[t.who - 1] : order.patient)} ·
              ${fmtDate((t.who ? order.participants[t.who - 1] : order.patient).dob)}</b
            >
            <span>${order.id} · ${TUBES[t.tube].short}</span>
            <span>Забор: ${fmtDate(order.collectedAt)}</span>
            <${Barcode} value=${t.code} height=${36} width=${1.3} />
          </div>`,
      )}
    </div>
  </section>`;
}

const who = (o, t) =>
  t.who ? `${o.participants[t.who - 1].role}: ${shortName(o.participants[t.who - 1])}` : shortName(o.patient);

const DOCS = { blank: [Blank, 'бланк заказа'], ids: [Ids, 'ИДС Panorama'], labels: [Labels, 'этикетки'] };

export function printDocs(order, docs) {
  const root = document.getElementById('print-root');
  const list = docs.filter((d) => d !== 'labels' || order.tubes.length);
  if (!list.length) return;
  render(html`${list.map((d) => html`<${DOCS[d][0]} order=${order} />`)}`, root);
  markPrinted(order, list.map((d) => DOCS[d][1]).join(', '));
  addEventListener('afterprint', () => render(null, root), { once: true });
  // let the barcodes paint before the dialog snapshots the page
  requestAnimationFrame(() => setTimeout(() => window.print(), 60));
}

export const needsIds = (order) => order.tests.some((t) => testOf(t.code)?.ids === 'panorama');
