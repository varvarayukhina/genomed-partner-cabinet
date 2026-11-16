// App shell: sidebar, top bar with global search, routing, the "replace current order?" guard.
import { render, useState, useEffect, useRef } from './vendor/preact-htm.js';
import { html, Icon, useRoute, go, useDismiss, Toasts, toast, timeOf } from './ui.js';
import { useStore, counters, markRead } from './store.js';
import { ReplaceDialog } from './flow.js';
import { CATALOG, LIBRARY, MANAGERS, SUPPORT_PHONE } from './data.js';
import { matchTest, matchOrder, fullName, norm } from './logic.js';
import { Home } from './pages/home.js';
import { Catalog } from './pages/catalog.js';
import { OrderForm } from './pages/order-form.js';
import { Orders, OrderPage, Retakes, Results, OrderDialogs } from './pages/orders.js';
import { Delivery, Supplies } from './pages/logistics.js';
import { Preanalytics, Promo, Library, Managers, Notifications, Profile } from './pages/info.js';

/* ---------- sidebar ---------- */
const NAV = [
  ['', 'house', 'Главная'],
  ['catalog', 'flask-conical', 'Каталог исследований'],
  ['orders', 'list', 'Мои заказы'],
  ['retakes', 'refresh-ccw', 'Перезаборы', 'retakes'],
  ['results', 'file-text', 'Заключения', 'newResults'],
  ['delivery', 'truck', 'Курьер'],
  ['supplies', 'package', 'Расходные материалы'],
  '-',
  ['preanalytics', 'test-tube', 'Преаналитика'],
  ['promo', 'megaphone', 'Промо и акции'],
  ['library', 'book-open', 'Библиотека'],
  '-',
  ['managers', 'users', 'Мои менеджеры'],
  ['notifications', 'bell', 'Уведомления'],
  ['profile', 'user', 'Профиль клиники'],
];
const COUNT_HINT = {
  toSend: 'не отправлены в лабораторию',
  retakes: 'ждут оформления',
  newResults: 'новых',
  unread: 'непрочитанных',
};

function Side({ section, open, onNav }) {
  const s = useStore();
  const c = counters(s);
  const m = MANAGERS[0];
  return html`<aside class="side ${open ? 'is-open' : ''}" aria-label="Меню кабинета">
    <a class="brand" href="#/" onClick=${onNav}>
      <span class="brand__logo"><img src="assets/genomed-logo.png" alt="Геномед" width="74" height="37" /></span>
      <span class="brand__text">Кабинет<span>партнёра</span></span>
    </a>
    <a class="side__cta" href="#/new" aria-current=${section === 'new' ? 'page' : undefined} onClick=${onNav}
      ><${Icon} name="circle-plus" />Новый заказ</a
    >
    <nav class="nav">
      ${NAV.map((n, i) =>
        typeof n === 'string'
          ? n.length > 1
            ? html`<div class="nav__group" key=${i}>${n.slice(1)}</div>`
            : html`<div class="nav__sep" key=${i}></div>`
          : html`<a
              key=${n[0]}
              href=${`#/${n[0]}`}
              aria-current=${section === n[0] ? 'page' : undefined}
              onClick=${onNav}
            >
              <${Icon} name=${n[1]} />${n[2]}${n[3] && c[n[3]]
                ? html`<span
                    class=${`count ${n[3] === 'retakes' ? '' : 'count--soft'}`}
                    title=${`${c[n[3]]} ${COUNT_HINT[n[3]]}`}
                    >${c[n[3]]}</span
                  >`
                : null}
            </a>`,
      )}
      <div class="nav__sep"></div>
      <a
        href="#/"
        onClick=${(e) => {
          e.preventDefault();
          toast('Это демо: вход не нужен, поэтому выход отключён.', { icon: 'info' });
        }}
        ><${Icon} name="log-out" />Выход</a
      >
    </nav>
    <div class="mgr">
      <div class="mgr__card">
        <div class="mgr__who">
          <span class="avatar" aria-hidden="true">АС</span>
          <div>
            <div class="mgr__name">${m.name}</div>
            <div class="mgr__role">Ваш менеджер</div>
          </div>
        </div>
        <div class="mgr__actions">
          <a href=${`tel:${m.phone.replace(/[^\d+]/g, '')}`}><${Icon} name="phone" />Позвонить</a>
          <a href=${`mailto:${m.email}`}><${Icon} name="send" />Написать</a>
        </div>
      </div>
    </div>
  </aside>`;
}

/* ---------- global search: orders, patients, tests, barcodes, materials ---------- */
function GlobalSearch() {
  const s = useStore();
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const wrap = useRef(),
    input = useRef();
  useDismiss(open, () => setOpen(false), [wrap]);
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === '/' && !/input|textarea|select/i.test(document.activeElement.tagName)) {
        e.preventDefault();
        input.current.focus();
      }
    };
    addEventListener('keydown', onKey);
    return () => removeEventListener('keydown', onKey);
  }, []);
  const n = norm(q);
  const orders = n ? s.orders.filter((o) => matchOrder(o, q, CATALOG)).slice(0, 6) : [];
  const tests = n ? CATALOG.filter((t) => matchTest(t, q)).slice(0, 4) : [];
  const docs = n ? LIBRARY.filter((d) => norm(d.title).includes(n)).slice(0, 3) : [];
  const items = [
    ...orders.map((o) => ({
      href: `#/orders/${o.id}`,
      icon: 'file-text',
      main: html`<span class="mono">${o.id}</span> · ${fullName(o.patient)}`,
      side: o.tests.map((t) => t.code).join(', '),
      group: 'Заказы',
    })),
    ...tests.map((t) => ({
      href: `#/catalog?q=${encodeURIComponent(t.code)}`,
      icon: 'flask-conical',
      main: html`<span class="code">${t.code}</span> ${t.short}`,
      side: `${t.tat} раб. дн.`,
      group: 'Исследования',
    })),
    ...docs.map((d) => ({ href: '#/library', icon: 'book-open', main: d.title, side: d.format, group: 'Библиотека' })),
  ];
  const pick = (it) => {
    setOpen(false);
    setQ('');
    go(it.href);
  };
  const onKey = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, items.length - 1));
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    }
    if (e.key === 'Enter' && items[active]) pick(items[active]);
    if (e.key === 'Escape') {
      setOpen(false);
      input.current.blur();
    }
  };
  let lastGroup = '';
  return html`<div class="gsearch" ref=${wrap} role="search">
    <${Icon} name="search" />
    <input
      ref=${input}
      type="search"
      placeholder=${innerWidth < 1400 ? 'Поиск' : 'Поиск: заказ, пациент, штрихкод'}
      aria-label="Поиск по кабинету"
      aria-expanded=${open && !!n}
      aria-controls="gsearch-res"
      autocomplete="off"
      value=${q}
      onInput=${(e) => {
        setQ(e.target.value);
        setOpen(true);
        setActive(0);
      }}
      onFocus=${() => setOpen(true)}
      onKeyDown=${onKey}
    />
    ${open &&
    n &&
    html`<div class="sres" id="gsearch-res" role="listbox">
      ${items.length === 0 &&
      html`<div class="sres__empty">
        Ничего не нашли по «${q}». Номер заказа можно вводить без «ЗК-», штрихкод целиком.
      </div>`}
      ${items.map((it, i) => {
        const head = it.group !== lastGroup ? html`<div class="sres__group">${(lastGroup = it.group)}</div>` : null;
        return html`${head}<a
            href=${it.href}
            role="option"
            aria-selected=${i === active}
            class=${i === active ? 'is-active' : ''}
            onClick=${(e) => {
              e.preventDefault();
              pick(it);
            }}
            onMouseEnter=${() => setActive(i)}
          >
            <${Icon} name=${it.icon} /><span>${it.main}</span><span class="muted">${it.side}</span></a
          >`;
      })}
    </div>`}
  </div>`;
}

function Bell() {
  const s = useStore();
  const [open, setOpen] = useState(false);
  const btn = useRef(),
    box = useRef();
  useDismiss(open, () => setOpen(false), [btn, box]);
  const unread = s.notifications.filter((n) => !n.read).length;
  const ICON = {
    result: 'file-check',
    retake: 'refresh-ccw',
    courier: 'truck',
    library: 'book-open',
    promo: 'megaphone',
  };
  const r = btn.current?.getBoundingClientRect();
  return html`<button
      ref=${btn}
      class="iconbtn"
      aria-label=${`Уведомления${unread ? `: ${unread} новых` : ''}`}
      aria-expanded=${open}
      onClick=${() => setOpen(!open)}
    >
      <${Icon} name="bell" />${unread ? html`<span class="count dot" aria-hidden="true">${unread}</span>` : null}
    </button>
    ${open &&
    r &&
    html`<div
      class="menu menu--wide"
      ref=${box}
      style=${{ top: r.bottom + 8, right: Math.max(12, innerWidth - r.right - 8) }}
    >
      <div class="card__head">
        <h3>Уведомления</h3>
        ${unread
          ? html`<button class="btn btn--ghost btn--sm" onClick=${() => markRead('all')}>Прочитать все</button>`
          : null}
      </div>
      <div class="nlist">
        ${s.notifications.slice(0, 6).map(
          (n) =>
            html`<a
              class="nitem nitem--${n.type} ${n.read ? '' : 'is-unread'}"
              href=${n.link}
              onClick=${() => {
                markRead(n.id);
                setOpen(false);
              }}
            >
              <span class="nitem__icon"><${Icon} name=${ICON[n.type] || 'info'} /></span>
              <span
                ><span class="nitem__text">${n.text}</span><span class="nitem__time"> · ${timeOf(n.at)}</span></span
              ></a
            >`,
        )}
      </div>
      <div class="tfoot">
        <a class="linkmore" href="#/notifications" onClick=${() => setOpen(false)}
          >Все уведомления <${Icon} name="chevron-right"
        /></a>
      </div>
    </div>`}`;
}

function Support() {
  const [open, setOpen] = useState(false);
  const btn = useRef(),
    box = useRef();
  useDismiss(open, () => setOpen(false), [btn, box]);
  const r = btn.current?.getBoundingClientRect();
  return html`<button ref=${btn} class="btn btn--ghost" aria-expanded=${open} onClick=${() => setOpen(!open)}>
      <${Icon} name="circle-help" /><span class="support-label">Поддержка</span>
    </button>
    ${open &&
    r &&
    html`<div class="menu" ref=${box} style=${{ top: r.bottom + 8, right: Math.max(12, innerWidth - r.right) }}>
      <a href=${`tel:${SUPPORT_PHONE.replace(/[^\d]/g, '')}`}
        ><${Icon} name="phone" /><span>Клиентский сервис 24/7<br /><span class="mono">${SUPPORT_PHONE}</span></span></a
      >
      <a href="#/managers" onClick=${() => setOpen(false)}><${Icon} name="users" />Менеджер, логистика, врач-генетик</a>
      <a href="#/preanalytics" onClick=${() => setOpen(false)}
        ><${Icon} name="test-tube" />Как взять и передать биоматериал</a
      >
    </div>`}`;
}

function ClinicMenu() {
  const s = useStore();
  return html`<a class="clinic" href="#/profile" aria-label="Профиль клиники">
    <span class="avatar" aria-hidden="true">М+</span>
    <span class="clinic__text"
      ><span class="clinic__name">${s.clinic.name}</span><br /><span class="clinic__id"
        >ID партнёра: <span class="mono">${s.clinic.partnerId}</span></span
      ></span
    >
  </a>`;
}

/* ---------- router ---------- */
function Page({ route }) {
  const [a, b] = route.parts;
  const q = route.query;
  switch (a || '') {
    case '':
      return html`<${Home} />`;
    case 'catalog':
      return html`<${Catalog} q=${q.q} />`;
    case 'new':
      return html`<${OrderForm} key=${q.edit || 'new'} editId=${q.edit} />`;
    case 'orders':
      return b ? html`<${OrderPage} key=${b} id=${b} created=${q.created} />` : html`<${Orders} status=${q.status} />`;
    case 'retakes':
      return html`<${Retakes} />`;
    case 'results':
      return html`<${Results} />`;
    case 'delivery':
      return html`<${Delivery} preselect=${q.orders} />`;
    case 'supplies':
      return html`<${Supplies} courier=${q.courier} />`;
    case 'preanalytics':
      return html`<${Preanalytics} tube=${q.tube} />`;
    case 'promo':
      return html`<${Promo} />`;
    case 'library':
      return html`<${Library} />`;
    case 'managers':
      return html`<${Managers} />`;
    case 'notifications':
      return html`<${Notifications} />`;
    case 'profile':
      return html`<${Profile} />`;
    default:
      return html`<div class="page">
        <h1>Страница не найдена</h1>
        <p class="page__sub"><a href="#/">На главную</a></p>
      </div>`;
  }
}

const TITLES = {
  '': 'Главная',
  catalog: 'Каталог исследований',
  new: 'Новый заказ',
  orders: 'Мои заказы',
  retakes: 'Перезаборы',
  results: 'Заключения',
  delivery: 'Курьер',
  supplies: 'Расходные материалы',
  preanalytics: 'Преаналитика',
  promo: 'Промо и акции',
  library: 'Библиотека',
  managers: 'Мои менеджеры',
  notifications: 'Уведомления',
  profile: 'Профиль клиники',
};

function App() {
  const route = useRoute();
  const [menu, setMenu] = useState(false);
  const section = route.parts[0] || '';
  const main = useRef();
  useEffect(() => {
    document.title = `${route.parts[1] || TITLES[section] || 'Кабинет'} · Кабинет партнёра Геномед`;
    scrollTo({ top: 0 });
    setMenu(false);
  }, [route.path]);
  return html`<div class="app">
      <${Side}
        section=${section === 'orders' && route.parts[1] ? 'orders' : section}
        open=${menu}
        onNav=${() => setMenu(false)}
      />
      ${menu && html`<div class="scrim" onClick=${() => setMenu(false)}></div>`}
      <div class="main">
        <header class="top">
          <button class="iconbtn burger" aria-label="Открыть меню" aria-expanded=${menu} onClick=${() => setMenu(true)}>
            <${Icon} name="menu" />
          </button>
          <${GlobalSearch} />
          <div class="top__right">
            <span class="demo-tag" title="Все пациенты, заказы и цены выдуманы">Демо-данные</span
            ><${Support} /><${Bell} /><${ClinicMenu} />
          </div>
        </header>
        <main ref=${main} id="main"><${Page} route=${route} /></main>
      </div>
    </div>
    <${Toasts} /><${ReplaceDialog} /><${OrderDialogs} />`;
}

render(html`<${App} />`, document.getElementById('root'));
