// Shared UI pieces: icons, chips, popovers, dialog, toasts, date field with calendar, pager, routing.
import { html, useState, useEffect, useRef, useLayoutEffect, useReducer } from './vendor/preact-htm.js';
import { ICONS } from './icons.js';
import { STATUS, maskDate, parseDate, isoDate, fromIso, fmtDate, pad } from './logic.js';
import { TODAY } from './store.js';

export { html };

export const Icon = ({ name, label }) =>
  html`<svg class="ico" viewBox="0 0 24 24" aria-hidden=${label ? undefined : 'true'} role=${label ? 'img' : undefined} aria-label=${label} dangerouslySetInnerHTML=${{ __html: ICONS[name] || '' }}></svg>`;

export const StatusChip = ({ status }) => html`<span class="chip chip--${STATUS[status].tone}">${STATUS[status].label}</span>`;
export const Chip = ({ tone = 'neutral', children }) => html`<span class="chip chip--${tone}">${children}</span>`;
export const Count = ({ n, soft }) => (n ? html`<span class="count ${soft ? 'count--soft' : ''}" aria-label=${`${n}`}>${n}</span>` : null);

/* ---------- routing ---------- */
export function parseHash() {
  const raw = decodeURIComponent(location.hash.replace(/^#/, '') || '/');
  const [path, qs] = raw.split('?');
  return { path, parts: path.split('/').filter(Boolean), query: Object.fromEntries(new URLSearchParams(qs || '')) };
}
export function useRoute() {
  const [, force] = useReducer((x) => x + 1, 0);
  useEffect(() => {
    const f = () => force();
    addEventListener('hashchange', f);
    return () => removeEventListener('hashchange', f);
  }, []);
  return parseHash();
}
export const go = (hash) => {
  location.hash = hash;
};

/* ---------- outside click / escape ---------- */
export function useDismiss(open, close, refs) {
  useEffect(() => {
    if (!open) return;
    const onDown = (e) => {
      if (refs.some((r) => r.current && r.current.contains(e.target))) return;
      close();
    };
    const onKey = (e) => e.key === 'Escape' && close();
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);
}

/* ---------- popover menu (fixed, escapes overflow containers) ---------- */
export function MenuButton({ label, icon = 'ellipsis', items, className = 'iconbtn', text }) {
  const [pos, setPos] = useState(null);
  const btn = useRef(), menu = useRef();
  const close = () => setPos(null);
  useDismiss(!!pos, close, [btn, menu]);
  useEffect(() => {
    if (!pos) return;
    const onScroll = () => close();
    addEventListener('scroll', onScroll, true);
    addEventListener('resize', onScroll);
    menu.current?.querySelector('button:not(:disabled), a')?.focus();
    return () => {
      removeEventListener('scroll', onScroll, true);
      removeEventListener('resize', onScroll);
    };
  }, [pos]);
  const open = () => {
    const r = btn.current.getBoundingClientRect();
    const h = 46 * items.filter(Boolean).length + 16;
    const up = r.bottom + h > innerHeight - 12 && r.top > h;
    setPos({ right: Math.max(12, innerWidth - r.right), ...(up ? { bottom: innerHeight - r.top + 6 } : { top: r.bottom + 6 }) });
  };
  const onKey = (e) => {
    if (!['ArrowDown', 'ArrowUp'].includes(e.key)) return;
    e.preventDefault();
    const list = [...menu.current.querySelectorAll('button:not(:disabled), a')];
    const i = list.indexOf(document.activeElement);
    list[(i + (e.key === 'ArrowDown' ? 1 : -1) + list.length) % list.length]?.focus();
  };
  return html`
    <button ref=${btn} type="button" class=${className} aria-label=${label} aria-haspopup="menu" aria-expanded=${!!pos} onClick=${() => (pos ? close() : open())}>
      <${Icon} name=${icon} />${text}
    </button>
    ${pos &&
    html`<div class="menu" role="menu" ref=${menu} style=${pos} onKeyDown=${onKey}>
      ${items.filter(Boolean).map((it) =>
        it === '-'
          ? html`<div class="menu__sep" role="separator"></div>`
          : html`<button type="button" role="menuitem" class=${it.danger ? 'is-danger' : ''} disabled=${!!it.disabled}
                onClick=${() => { close(); it.onClick(); }}><${Icon} name=${it.icon} />${it.label}</button>
              ${it.disabled && it.note ? html`<span class="menu__note">${it.note}</span>` : null}`,
      )}
    </div>`}
  `;
}

/* ---------- dialog (native <dialog>: focus trap + Esc for free) ---------- */
export function Dialog({ title, children, onClose, footer }) {
  const ref = useRef();
  useEffect(() => {
    const d = ref.current;
    d.showModal();
    const onCancel = (e) => {
      e.preventDefault();
      onClose();
    };
    d.addEventListener('cancel', onCancel);
    return () => d.removeEventListener('cancel', onCancel);
  }, []);
  return html`<dialog class="dlg" ref=${ref} aria-labelledby="dlg-title" onClick=${(e) => e.target === ref.current && onClose()}>
    <div class="dlg__head"><h2 id="dlg-title">${title}</h2>
      <button type="button" class="iconbtn" aria-label="Закрыть" onClick=${onClose}><${Icon} name="x" /></button></div>
    <div class="dlg__body">${children}</div>
    <div class="dlg__foot">${footer}</div>
  </dialog>`;
}

/* ---------- toasts ---------- */
let toastSet = null;
let toastSeq = 0;
export function toast(text, opts = {}) {
  toastSet?.((list) => [...list.slice(-2), { id: ++toastSeq, text, ...opts }]);
}
export function Toasts() {
  const [list, setList] = useState([]);
  toastSet = setList;
  useEffect(() => {
    if (!list.length) return;
    const t = setTimeout(() => setList((l) => l.slice(1)), 5200);
    return () => clearTimeout(t);
  }, [list]);
  return html`<div class="toasts" role="status" aria-live="polite">
    ${list.map((t) => html`<div class="toast ${t.tone === 'stop' ? 'toast--stop' : ''}" key=${t.id}>
      <${Icon} name=${t.icon || 'circle-check-big'} />
      <div>${t.text}${t.link ? html` <a href=${t.link.href}>${t.link.text}</a>` : null}</div>
      <button type="button" aria-label="Скрыть уведомление" onClick=${() => setList((l) => l.filter((x) => x.id !== t.id))}><${Icon} name="x" /></button>
    </div>`)}
  </div>`;
}

/* ---------- form field wrapper ---------- */
export const Field = ({ label, req, hint, error, id, children, className = '' }) => html`
  <div class="field ${className}">
    ${label && html`<label for=${id} id=${`${id}-l`}>${label}${req && html` <span class="field__req" aria-hidden="true">*</span>`}</label>`}
    ${children}
    ${error ? html`<div class="field__err" id=${`${id}-err`}><${Icon} name="triangle-alert" />${error}</div>` : hint ? html`<div class="field__hint" id=${`${id}-hint`}>${hint}</div>` : null}
  </div>`;

/* ---------- date field: typed without dots (#10) + calendar with today marked (#12) ---------- */
const MONTHS = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
const DOW = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

export function Calendar({ value, onPick, min, max, disableWeekends, quick = true, up }) {
  const start = fromIso(value || TODAY);
  const [view, setView] = useState({ y: start.getFullYear(), m: start.getMonth() });
  const [focus, setFocus] = useState(value || TODAY);
  const grid = useRef();
  const first = new Date(view.y, view.m, 1);
  const offset = (first.getDay() + 6) % 7;
  const days = [];
  for (let i = 0; i < 42; i++) days.push(new Date(view.y, view.m, 1 - offset + i));
  const off = (iso) => (min && iso < min) || (max && iso > max) || (disableWeekends && [0, 6].includes(fromIso(iso).getDay()));
  const shift = (n) => setView(({ y, m }) => ({ y: m + n < 0 ? y - 1 : m + n > 11 ? y + 1 : y, m: (m + n + 12) % 12 }));
  useLayoutEffect(() => {
    grid.current?.querySelector(`[data-d="${focus}"]`)?.focus({ preventScroll: true });
  }, [focus, view]);
  const onKey = (e) => {
    const step = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }[e.key];
    if (!step) return;
    e.preventDefault();
    const d = fromIso(focus);
    d.setDate(d.getDate() + step);
    const iso = isoDate(d);
    if (d.getMonth() !== view.m) setView({ y: d.getFullYear(), m: d.getMonth() });
    setFocus(iso);
  };
  const yesterday = (() => { const d = fromIso(TODAY); d.setDate(d.getDate() - 1); return isoDate(d); })();
  return html`<div class="cal ${up ? 'cal--up' : ''}" role="dialog" aria-label="Выбор даты">
    <div class="cal__head">
      <button type="button" class="iconbtn" aria-label="Предыдущий месяц" onClick=${() => shift(-1)}><${Icon} name="chevron-left" /></button>
      <div class="cal__title" aria-live="polite">${MONTHS[view.m]} ${view.y}</div>
      <button type="button" class="iconbtn" aria-label="Следующий месяц" onClick=${() => shift(1)}><${Icon} name="chevron-right" /></button>
    </div>
    <div class="cal__grid" role="grid" ref=${grid} onKeyDown=${onKey}>
      ${DOW.map((d) => html`<div class="cal__dow" aria-hidden="true">${d}</div>`)}
      ${days.map((d) => {
        const iso = isoDate(d);
        const cls = ['cal__day', d.getMonth() !== view.m && 'is-out', iso === TODAY && 'is-today', iso === value && 'is-sel'].filter(Boolean).join(' ');
        return html`<button type="button" class=${cls} data-d=${iso} disabled=${off(iso)} tabindex=${iso === focus ? 0 : -1}
          aria-pressed=${iso === value} aria-current=${iso === TODAY ? 'date' : undefined}
          aria-label=${`${d.getDate()} ${MONTHS[d.getMonth()].toLowerCase()} ${d.getFullYear()}${iso === TODAY ? ', сегодня' : ''}`}
          onClick=${() => onPick(iso)}>${d.getDate()}</button>`;
      })}
    </div>
    <div class="cal__foot">
      ${quick && html`<button type="button" class="btn btn--line btn--sm" disabled=${off(TODAY)} onClick=${() => onPick(TODAY)}>Сегодня</button>
      ${!max || yesterday <= max ? html`<button type="button" class="btn btn--line btn--sm" disabled=${off(yesterday)} onClick=${() => onPick(yesterday)}>Вчера</button>` : null}`}
      <span class="cal__legend"><i></i>сегодня</span>
    </div>
  </div>`;
}

export function DateField({ id, value, onChange, error, min, max, calendar = true, disableWeekends, placeholder = 'ДД.ММ.ГГГГ', describedBy, up }) {
  const [text, setText] = useState(value ? fmtDate(value) : '');
  const [open, setOpen] = useState(false);
  const wrap = useRef();
  useDismiss(open, () => setOpen(false), [wrap]);
  useEffect(() => {
    const cur = parseDate(text).iso || '';
    if (value !== cur) setText(value ? fmtDate(value) : '');
  }, [value]);
  const onInput = (e) => {
    const masked = maskDate(e.target.value);
    setText(masked);
    const r = parseDate(masked);
    onChange(r.iso || '', masked);
  };
  return html`<div class="datef" ref=${wrap}>
    <input id=${id} class="input mono" inputmode="numeric" autocomplete="off" placeholder=${placeholder} value=${text} maxlength="10"
      aria-invalid=${error ? 'true' : undefined} aria-describedby=${error ? `${id}-err` : describedBy} onInput=${onInput}
      onKeyDown=${(e) => e.key === 'ArrowDown' && e.altKey && setOpen(true)} />
    ${calendar && html`<button type="button" class="datef__btn" aria-label="Открыть календарь" aria-expanded=${open} onClick=${() => setOpen(!open)}><${Icon} name="calendar" /></button>`}
    ${open && html`<${Calendar} value=${value} min=${min} max=${max} disableWeekends=${disableWeekends} up=${up}
      onPick=${(iso) => { setText(fmtDate(iso)); onChange(iso, fmtDate(iso)); setOpen(false); wrap.current.querySelector('input').focus(); }} />`}
  </div>`;
}

/* ---------- pager ---------- */
export function Pager({ page, pages, onPage }) {
  if (pages <= 1) return null;
  const list = [];
  for (let i = 1; i <= pages; i++) if (i === 1 || i === pages || Math.abs(i - page) <= 1) list.push(i);
  const out = [];
  list.forEach((n, i) => {
    if (i && n - list[i - 1] > 1) out.push('…');
    out.push(n);
  });
  return html`<nav class="pager" aria-label="Страницы">
    <button type="button" aria-label="Предыдущая страница" disabled=${page === 1} onClick=${() => onPage(page - 1)}><${Icon} name="chevron-left" /></button>
    ${out.map((n) => (n === '…' ? html`<button type="button" disabled aria-hidden="true">…</button>` : html`<button type="button" aria-current=${n === page ? 'page' : undefined} onClick=${() => onPage(n)}>${n}</button>`))}
    <button type="button" aria-label="Следующая страница" disabled=${page === pages} onClick=${() => onPage(page + 1)}><${Icon} name="chevron-right" /></button>
  </nav>`;
}

export const Empty = ({ icon = 'inbox', title, text, action }) => html`<div class="empty">
  <div class="empty__icon"><${Icon} name=${icon} /></div><h3>${title}</h3>${text && html`<p>${text}</p>`}${action}
</div>`;

export const TubeDot = ({ tube, tubes }) => html`<i class="tubedot" style=${{ background: tubes[tube].color }} aria-hidden="true"></i>`;

export function download(name, text, type = 'text/csv;charset=utf-8') {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = Object.assign(document.createElement('a'), { href: url, download: name });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export const timeOf = (iso) => `${iso.slice(8, 10)}.${iso.slice(5, 7)} ${iso.slice(11, 16)}`;
export const pad2 = pad;
