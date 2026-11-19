// Преаналитика, акции, библиотека, менеджеры, уведомления, профиль клиники.
import { useState } from '../vendor/preact-htm.js';
import { html, Icon, Chip, toast, Empty, TubeDot, timeOf } from '../ui.js';
import { useStore, markRead, setSetting, resetDemo, TODAY } from '../store.js';
import { CATALOG, TUBES, PREANALYTICS, LIBRARY, MANAGERS, SUPPORT_PHONE, CONSUMABLES } from '../data.js';
import { fmtDate, plural, matchTest, norm, addDays, fromIso } from '../logic.js';
import { addToDraft } from '../flow.js';

const DemoNote = ({ children }) => html`<div class="demo-note"><${Icon} name="info" /><span>${children}</span></div>`;

/* ---------- Преаналитика: by tube, searchable by test ---------- */
export function Preanalytics({ tube }) {
  const [q, setQ] = useState('');
  const hit = q ? CATALOG.filter((t) => matchTest(t, q)) : [];
  const tubes = Object.keys(TUBES).filter((k) => !q || hit.some((t) => t.bm.some((b) => b.tube === k)));
  return html`<div class="page">
    <div class="page__head">
      <div>
        <h1>Преаналитика</h1>
        <p class="page__sub">Введите код или название исследования, чтобы увидеть нужную пробирку.</p>
      </div>
    </div>
    <${DemoNote}
      >Тексты преаналитики в демо-версии условные. Перед запуском их заменят на действующую инструкцию лаборатории.<//
    >
    <div class="gsearch" style="max-width:560px;margin-bottom:18px">
      <${Icon} name="search" />
      <input
        type="search"
        aria-label="Найти исследование"
        placeholder="Код или название исследования"
        value=${q}
        onInput=${(e) => setQ(e.target.value)}
      />
    </div>
    ${q &&
    html`<p class="soft" style="margin-bottom:14px">
      ${hit.length
        ? hit
            .map((t) => `${t.code} ${t.short}: ${t.bm.map((b) => `${b.qty} × ${TUBES[b.tube].short}`).join(' или ')}`)
            .join(' · ')
        : 'Исследование не найдено.'}
    </p>`}
    <div class="stack">
      ${tubes.map((k) => {
        const used = CATALOG.filter((t) => t.bm.some((b) => b.tube === k));
        return html`<section class="card ${tube === k ? 'flash' : ''}" id=${`tube-${k}`} aria-labelledby=${`h-${k}`}>
          <div class="card__head">
            <h2 id=${`h-${k}`}><${TubeDot} tube=${k} tubes=${TUBES} />${TUBES[k].name}</h2>
          </div>
          <div class="card__pad stack" style="gap:10px">
            <dl class="kv">
              <dt>Забор</dt><dd>${PREANALYTICS[k].take}</dd>
              <dt>Хранение</dt><dd>${PREANALYTICS[k].keep}</dd>
              <dt>Передача</dt><dd>${PREANALYTICS[k].send}</dd>
            </dl>
            <p class="muted">Для исследований: ${used.map((t) => `${t.code} ${t.short}`).join(', ')}</p>
          </div>
        </section>`;
      })}
    </div>
  </div>`;
}

/* ---------- Промо и акции ---------- */
export function Promo() {
  const s = useStore();
  const days = (iso) => Math.round((fromIso(iso) - fromIso(TODAY)) / 864e5);
  return html`<div class="page">
    <div class="page__head">
      <div>
        <h1>Промо и акции</h1>
        <p class="page__sub">Скидки уже учтены в ценах каталога и заказа.</p>
      </div>
    </div>
    <div class="stack">
      ${s.promos.map(
        (p) =>
          html`<article class="card promo" aria-label=${p.title}>
            <div>
              <div class="promo__for">${p.for}</div>
              <h2 class="promo__title">${p.title}</h2>
              <p class="soft">${p.text}</p>
              ${p.codes.length > 0 &&
              html`<p class="muted" style="margin-top:8px">
                ${p.codes.map((c) => `${c} ${CATALOG.find((t) => t.code === c).short}`).join(', ')}
              </p>`}
              <p class="promo__until" style="margin-top:10px">
                до ${fmtDate(p.until)} · осталось ${days(p.until)} ${plural(days(p.until), 'день', 'дня', 'дней')}
              </p>
            </div>
            <div class="rowi__act" style="align-content:start">
              ${p.codes.length > 0 &&
              html`<button
                class="btn btn--primary btn--sm"
                onClick=${() => {
                  addToDraft(p.codes);
                  toast('Добавлено в заказ.', { link: { href: '#/new', text: 'Оформить' } });
                }}
              >
                <${Icon} name="circle-plus" />В заказ
              </button>`}
              <a class="btn btn--line btn--sm" href="#/library">Материалы</a>
            </div>
          </article>`,
      )}
    </div>
  </div>`;
}

/* ---------- Библиотека ---------- */
const LIB_TYPES = [
  'Бланки направлений',
  'Брошюры для пациентов',
  'Памятки',
  'Презентации',
  'Видео и вебинары',
  'Логотипы и баннеры',
  'Документы',
];
const docIcon = (t) =>
  ({
    'Видео и вебинары': ['video', 't-video'],
    Презентации: ['presentation', 't-pres'],
    Документы: ['file-check', 't-doc'],
    'Логотипы и баннеры': ['image', ''],
  })[t] || ['file-text', ''];

export function Library() {
  const [q, setQ] = useState('');
  const [type, setType] = useState('');
  const list = LIBRARY.filter(
    (d) => (!type || d.type === type) && (!q || norm(`${d.title} ${d.type}`).includes(norm(q))),
  );
  const top = [...LIBRARY].sort((a, b) => b.downloads - a.downloads).slice(0, 3);
  const get = (d) => toast(`Демо: «${d.title}» скачается после подключения файлов лаборатории.`, { icon: 'file-down' });
  return html`<div class="page">
    <div class="page__head">
      <div><h1>Библиотека</h1></div>
    </div>
    <div class="gsearch" style="max-width:none">
      <${Icon} name="search" /><input
        type="search"
        aria-label="Поиск по материалам"
        placeholder="Поиск по материалам"
        value=${q}
        onInput=${(e) => setQ(e.target.value)}
      />
    </div>
    <div class="seg" role="group" aria-label="Тип материала" style="margin-top:14px">
      <button type="button" aria-pressed=${!type} onClick=${() => setType('')}>Все</button>
      ${LIB_TYPES.map(
        (t) => html`<button type="button" aria-pressed=${type === t} onClick=${() => setType(t)}>${t}</button>`,
      )}
    </div>
    <div class="lib">
      <section class="card" aria-label="Материалы">
        ${list.length === 0
          ? html`<${Empty} icon="search" title="Ничего не нашли" text="Попробуйте другое слово или тип материала." />`
          : list.map((d) => {
              const [ic, cls] = docIcon(d.type);
              return html`<div class="doc">
                <span class="doc__icon ${cls}"><${Icon} name=${ic} /></span>
                <div>
                  <div class="doc__title">
                    ${d.title}${d.badge === 'new'
                      ? html`<span class="tag tag--new">Новое</span>`
                      : d.badge === 'updated'
                        ? html`<span class="tag tag--promo">Обновлено ${fmtDate(addDays(TODAY, -d.updatedDays))}</span>`
                        : null}
                  </div>
                  <div class="doc__meta">${d.type} · ${d.format}${d.size ? ` · ${d.size}` : ''}</div>
                </div>
                <div class="rowi__act">
                  <button class="btn btn--line btn--sm" onClick=${() => get(d)}>
                    <${Icon} name=${d.type === 'Видео и вебинары' ? 'play' : 'download'} />${d.type ===
                    'Видео и вебинары'
                      ? 'Смотреть'
                      : 'Скачать'}
                  </button>
                </div>
              </div>`;
            })}
      </section>
      <div class="stack">
        <section class="card card__pad printcard" aria-labelledby="print-h">
          <span class="printcard__ic" aria-hidden="true"><${Icon} name="truck" /></span>
          <h2 id="print-h">Нужны печатные брошюры?</h2>
          <p class="soft">Закажите тираж: привезёт курьер вместе с расходниками.</p>
          <ul class="printcard__list">
            ${BROCHURES.map(
              (b) => html`<li><span>${b.name}</span><span class="printcard__qty">${b.pack.replace('пачка ', '')}</span></li>`,
            )}
          </ul>
          <a class="btn btn--primary btn--block" href=${`#/supplies?add=${BROCHURES.map((b) => b.id).join(',')}`}
            >Заказать тираж</a
          >
        </section>
        <section class="card card__pad stack" style="gap:10px" aria-labelledby="top-h">
          <h3 id="top-h">Часто скачивают</h3>
          ${top.map(
            (d) =>
              html`<button class="linkish" style="justify-content:flex-start;text-align:left" onClick=${() => get(d)}>
                <${Icon} name="file-text" />${d.title}
              </button>`,
          )}
        </section>
      </div>
    </div>
  </div>`;
}

const BROCHURES = CONSUMABLES.filter((c) => c.group === 'Брошюры для пациентов');

/* ---------- Мои менеджеры ---------- */
export function Managers() {
  return html`<div class="page">
    <div class="page__head">
      <div><h1>Мои менеджеры</h1></div>
    </div>
    <div class="mgrs">
      ${MANAGERS.map(
        (m) =>
          html`<article class="card mcard">
            <div class="mcard__top">
              <span class="avatar" aria-hidden="true"
                >${m.name
                  .split(' ')
                  .map((w) => w[0])
                  .join('')
                  .slice(0, 2)}</span
              >
              <div>
                <h2 style="font-size:20px">${m.name}</h2>
                <div class="soft">${m.role}</div>
              </div>
              ${m.main ? html`<${Chip} tone="blue">ваш менеджер<//>` : null}
            </div>
            <p class="soft">${m.about}</p>
            <p class="mono">
              ${m.phone}<br /><span class="muted" style="font-family:var(--font-main)">${m.hours}</span>
            </p>
            <div class="mcard__links">
              <a class="btn btn--line btn--sm" href=${`tel:${m.phone.replace(/[^\d+]/g, '')}`}
                ><${Icon} name="phone" />Позвонить</a
              >
              <a class="btn btn--line btn--sm" href=${`mailto:${m.email}`}><${Icon} name="mail" />Написать</a>
            </div>
          </article>`,
      )}
      <article class="card mcard">
        <div class="mcard__top">
          <span class="avatar" aria-hidden="true" style="background:var(--navy)"><${Icon} name="circle-help" /></span>
          <div>
            <h2 style="font-size:20px">Клиентский сервис 24/7</h2>
            <div class="soft">Срочные вопросы в любое время</div>
          </div>
        </div>
        <p class="mono" style="font-size:20px">${SUPPORT_PHONE}</p>
        <div class="mcard__links">
          <a class="btn btn--line btn--sm" href=${`tel:${SUPPORT_PHONE.replace(/[^\d]/g, '')}`}
            ><${Icon} name="phone" />Позвонить</a
          >
        </div>
      </article>
    </div>
  </div>`;
}

/* ---------- Уведомления ---------- */
const N_TYPES = [
  ['', 'Все'],
  ['result', 'Заключения'],
  ['retake', 'Перезаборы'],
  ['courier', 'Курьер'],
  ['library', 'Библиотека'],
  ['promo', 'Акции'],
];
const N_ICON = {
  result: 'file-check',
  retake: 'refresh-ccw',
  courier: 'truck',
  library: 'book-open',
  promo: 'megaphone',
};
export function Notifications() {
  const s = useStore();
  const [type, setType] = useState('');
  const list = s.notifications.filter((n) => !type || n.type === type);
  const day = (iso) =>
    iso.slice(0, 10) === TODAY ? 'Сегодня' : iso.slice(0, 10) === addDays(TODAY, -1) ? 'Вчера' : 'Ранее';
  const unread = s.notifications.filter((n) => !n.read).length;
  let last = '';
  return html`<div class="page">
    <div class="page__head">
      <div>
        <h1>Уведомления</h1>
        <p class="page__sub">
          ${unread ? `${unread} ${plural(unread, 'непрочитанное', 'непрочитанных', 'непрочитанных')}` : 'Всё прочитано'}
        </p>
      </div>
      <div class="page__actions">
        ${unread > 0 &&
        html`<button class="btn btn--line" onClick=${() => markRead('all')}>
          <${Icon} name="check-check" />Прочитать все
        </button>`}
      </div>
    </div>
    <div class="seg" role="group" aria-label="Тип уведомлений">
      ${N_TYPES.map(
        ([k, l]) => html`<button type="button" aria-pressed=${type === k} onClick=${() => setType(k)}>${l}</button>`,
      )}
    </div>
    <section class="card">
      ${list.length === 0
        ? html`<${Empty} icon="bell" title="Уведомлений нет" />`
        : list.map((n) => {
            const d = day(n.at);
            const head =
              d !== last ? html`<div class="sres__group" style="padding:14px 16px 6px">${(last = d)}</div>` : null;
            return html`${head}<a
                class="nitem nitem--${n.type} ${n.read ? '' : 'is-unread'}"
                href=${n.link}
                onClick=${() => markRead(n.id)}
              >
                <span class="nitem__icon"><${Icon} name=${N_ICON[n.type] || 'info'} /></span>
                <span
                  ><span class="nitem__text">${n.text}</span><br /><span class="nitem__time"
                    >${timeOf(n.at)}</span
                  ></span
                ></a
              >`;
          })}
    </section>
  </div>`;
}

/* ---------- Профиль клиники ---------- */
export function Profile() {
  const s = useStore();
  const st = s.settings;
  const Toggle = ({ k, children }) =>
    html`<label class="switch"
      ><input type="checkbox" checked=${st[k]} onChange=${(e) => setSetting(k, e.target.checked)} />${children}</label
    >`;
  return html`<div class="page">
    <div class="page__head">
      <div>
        <h1>Профиль клиники</h1>
        <p class="page__sub">${s.clinic.name} · ID партнёра <span class="mono">${s.clinic.partnerId}</span></p>
      </div>
    </div>
    <div class="cols2">
      <div class="stack">
        <section class="card" aria-labelledby="pr-h">
          <div class="card__head"><h2 id="pr-h">Реквизиты</h2></div>
          <dl class="kv card__pad">
            <dt>Договор</dt>
            <dd>${s.clinic.contract}</dd>
            <dt>ИНН</dt>
            <dd class="mono">${s.clinic.inn}</dd>
            <dt>E-mail для заключений</dt>
            <dd>${s.clinic.email}</dd>
            <dt>Телефон</dt>
            <dd class="mono">${s.clinic.phone}</dd>
            ${s.clinic.addresses.map(
              (a, i) =>
                html`<dt>${i ? 'Филиал' : 'Адрес забора'}</dt>
                  <dd>${a}</dd>`,
            )}
          </dl>
        </section>
        <section class="card" aria-labelledby="st-h">
          <div class="card__head"><h2 id="st-h">Сотрудники с доступом</h2></div>
          <div class="rows">
            ${s.clinic.staff.map(
              (x) =>
                html`<div class="rowi">
                  <div>
                    <div class="rowi__title">${x.name}<${Chip} tone="neutral">${x.role}<//></div>
                    <div class="rowi__text">${x.access}</div>
                  </div>
                </div>`,
            )}
          </div>
        </section>
      </div>
      <div class="stack">
        <section class="card fsec" aria-labelledby="pp-h" style="gap:14px">
          <h2 id="pp-h">Печать после сохранения заказа</h2>
          <${Toggle} k="autoBlank">Бланк заказа с данными пациента<//>
          <${Toggle} k="autoIds">ИДС, если в заказе Panorama<//>
          <${Toggle} k="autoLabels">Штрих-коды на пробирки<//>
          <div class="field">
            <span class="field__label">Формат этикеток</span>
            <div class="segctl" role="radiogroup" aria-label="Формат этикеток">
              ${[
                ['thermal', 'Термопринтер 58 × 40'],
                ['a4', 'Лист A4'],
              ].map(
                ([v, l]) =>
                  html`<button
                    type="button"
                    role="radio"
                    aria-checked=${st.labelFormat === v}
                    onClick=${() => setSetting('labelFormat', v)}
                  >
                    ${l}
                  </button>`,
              )}
            </div>
          </div>
        </section>
        <section class="card fsec" aria-labelledby="nn-h" style="gap:14px">
          <h2 id="nn-h">Уведомления</h2>
          <${Toggle} k="notifyEmail">Письмо, когда готово заключение или нужен перезабор<//>
          <${Toggle} k="notifySms">SMS ответственному сотруднику<//>
        </section>
        <section class="card fsec" aria-labelledby="dm-h" style="gap:12px">
          <h2 id="dm-h">Демо-данные</h2>
          <p class="soft">
            Заказы, вызовы курьера и настройки хранятся только в этом браузере. Каждый день демо обновляется к свежим
            датам.
          </p>
          <button
            class="btn btn--line"
            onClick=${() => {
              resetDemo();
              toast('Демо-данные восстановлены.');
            }}
          >
            <${Icon} name="rotate-ccw" />Сбросить демо-данные
          </button>
        </section>
      </div>
    </div>
  </div>`;
}
