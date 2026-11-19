// Новый заказ / редактирование. The form knows the tests: tubes, clinical sections and print docs follow from them.
import { useState, useEffect, useRef, useMemo } from '../vendor/preact-htm.js';
import { html, Icon, Field, DateField, toast, go, useDismiss, TubeDot, Empty } from '../ui.js';
import { useStore, findOrder, saveOrder, saveFormDraft, clearFormDraft, TODAY, testByCode } from '../store.js';
import { CATALOG, TUBES, PREANALYTICS, DOCTORS, CATEGORIES } from '../data.js';
import {
  fmtDate,
  fullName,
  ageYears,
  plural,
  money,
  priceOf,
  maskPhone,
  validateDob,
  aggregateTubes,
  orderTubeGroups,
  orderTotal,
  bundledIn,
  matchTest,
  editLock,
  prenatalErrors,
  addTest,
  removeTest,
  bmOf,
} from '../logic.js';
import { emptyForm } from '../flow.js';
import { printDocs, needsIds } from '../print.js';

const fromOrder = (o) => ({
  ...emptyForm(),
  patient: { ...o.patient, dobText: fmtDate(o.patient.dob) },
  codes: o.tests.map((t) => t.code),
  bm: { ...o.bm },
  participants: o.participants.map((p) => ({ ...p, dobText: fmtDate(p.dob) })),
  clinical: { ...o.clinical },
  collectedAt: o.collectedAt || TODAY,
  doctor: o.doctor,
  comment: o.comment,
  card: o.card || '',
  files: [...(o.files || [])],
  editId: o.id,
});

const sexFromMiddle = (m) => (/(вна|чна|кызы)$/i.test(m.trim()) ? 'f' : /(вич|ич|оглы)$/i.test(m.trim()) ? 'm' : '');

function validate(f) {
  const e = {};
  const p = f.patient;
  if (!p.last.trim()) e['p-last'] = 'Укажите фамилию';
  if (!p.first.trim()) e['p-first'] = 'Укажите имя';
  const dob = validateDob(p.dobText || '', TODAY);
  if (dob) e['p-dob'] = dob;
  if (!p.sex) e['p-sex'] = 'Выберите пол';
  if (!f.codes.length) e['t-search'] = 'Добавьте хотя бы одно исследование';
  if (!f.doctor?.trim()) e.doctor = 'Выберите направившего врача';
  const tests = f.codes.map((c) => CATALOG.find((t) => t.code === c));
  if (p.sex === 'm' && tests.some((t) => t.needs?.includes('pregnancy')))
    e['p-sex'] = 'НИПТ оформляется на беременную пациентку. Проверьте пол или исследование';
  const male = tests.find((t) => t.sex === 'm');
  if (p.sex === 'f' && male) e['p-sex'] = `${male.code} ${male.short} выполняется только мужчинам`;
  if (tests.some((t) => t.needs?.includes('pregnancy'))) {
    for (const [k, v] of Object.entries(prenatalErrors(f.clinical))) e[`c-${k}`] = v;
  }
  if (tests.some((t) => t.needs?.includes('histology'))) {
    if (!f.clinical.block?.trim()) e['c-block'] = 'Укажите номер блока';
    if (!f.clinical.diagnosis?.trim()) e['c-diagnosis'] = 'Укажите диагноз';
  }
  if (tests.some((t) => t.needs?.includes('phenotype'))) {
    if (f.clinical.noClinical) {
      if (!f.clinical.noClinicalReason?.trim()) e['c-noreason'] = 'Укажите причину';
    } else if (!f.clinical.phenotype?.trim())
      e['c-phenotype'] = 'Опишите клиническую картину: без неё лаборатория не сможет интерпретировать результат';
  }
  f.participants.forEach((x, i) => {
    if (!f.codes.includes(x.forCode)) return;
    if (!x.last?.trim() || !x.first?.trim()) e[`x${i}-last`] = 'Укажите фамилию и имя участника';
    const d = validateDob(x.dobText || '', TODAY);
    if (d) e[`x${i}-dob`] = d;
    if (!x.sex) e[`x${i}-sex`] = 'Выберите пол';
  });
  if (!f.collectedAt) e.collected = 'Укажите дату забора';
  else if (f.collectedAt > TODAY) e.collected = 'Дата забора не может быть в будущем';
  return e;
}

const Seg = ({ id, value, options, onChange, invalid }) =>
  html`<div
    class="segctl"
    role="radiogroup"
    id=${id}
    aria-labelledby=${`${id}-l`}
    aria-invalid=${invalid ? 'true' : undefined}
  >
    ${options.map(
      ([v, l]) =>
        html`<button type="button" role="radio" aria-checked=${value === v} onClick=${() => onChange(v)}>${l}</button>`,
    )}
  </div>`;

/* ---------- test picker: name, code, gene; Enter adds; scanner-friendly ---------- */
function TestPicker({ codes, onAdd, error }) {
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const wrap = useRef();
  useDismiss(open, () => setOpen(false), [wrap]);
  const list = useMemo(
    () =>
      CATALOG.filter((t) => matchTest(t, q))
        .sort((a, b) => (a.code === q.trim() ? -1 : b.code === q.trim() ? 1 : a.popular - b.popular))
        .slice(0, 8),
    [q],
  );
  const add = (t) => {
    if (!t || codes.includes(t.code)) return;
    onAdd(t.code);
    setQ('');
    setActive(0);
  };
  const onKey = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setOpen(true);
      setActive((a) => Math.min(a + 1, list.length - 1));
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      add(list[active]);
    }
    if (e.key === 'Escape') setOpen(false);
  };
  return html`<div class="picker" ref=${wrap}>
    <div class="gsearch" style="max-width:none">
      <${Icon} name="search" />
      <input
        id="t-search"
        type="search"
        role="combobox"
        aria-expanded=${open}
        aria-controls="t-list"
        aria-autocomplete="list"
        autocomplete="off"
        aria-invalid=${error ? 'true' : undefined}
        aria-describedby=${error ? 't-search-err' : 't-search-hint'}
        placeholder="Название, код или ген: НИПТ, 0001, BRCA1"
        value=${q}
        onInput=${(e) => {
          setQ(e.target.value);
          setOpen(true);
          setActive(0);
        }}
        onFocus=${() => setOpen(true)}
        onKeyDown=${onKey}
      />
    </div>
    ${open &&
    html`<div class="picker__list" id="t-list" role="listbox">
      ${list.length === 0
        ? html`<div class="sres__empty">Не нашли «${q}». Попробуйте код из бланка или название гена.</div>`
        : list.map((t, i) => {
            const inOrder = codes.includes(t.code);
            return html`<button
              type="button"
              role="option"
              class="picker__item ${i === active ? 'is-active' : ''}"
              aria-selected=${i === active}
              aria-disabled=${inOrder}
              onMouseEnter=${() => setActive(i)}
              onClick=${() => add(t)}
            >
              <span class="code">${t.code}</span>
              <span
                ><b>${t.short}</b><br /><span class="muted"
                  >${CATEGORIES[t.cat]} · ${t.bm.map((b) => TUBES[b.tube].label).join(' / ')} · ${t.tat} раб. дн.</span
                ></span
              >
              <span class="mono">${inOrder ? html`<span class="chip chip--ok">в заказе</span>` : money(t.price)}</span>
            </button>`;
          })}
    </div>`}
  </div>`;
}

/* ---------- "Что взять у пациента" (ТЗ п. 11) ---------- */
export function TakeBlock({ codes, bm, participants, compact }) {
  const [open, setOpen] = useState(null);
  const groups = orderTubeGroups(codes, CATALOG, bm, participants);
  if (!groups.length) return null;
  const whoName = (w) => (w === 0 ? 'у пациента' : `у участника «${participants[w - 1].role}»`);
  const multi = groups.some((g) => g.who > 0);
  return html`<div class="take" aria-live="polite">
    <div class="take__title"><${Icon} name="test-tube" />Что взять ${multi ? '' : 'у пациента'}</div>
    ${groups.map(
      (g, i) =>
        html`<div class="take__row">
          <span class="q">${g.qty} ×</span>
          <span
            ><${TubeDot} tube=${g.tube} tubes=${TUBES} />${compact ? TUBES[g.tube].short : TUBES[g.tube].name}${multi
              ? html` <b>${whoName(g.who)}</b>`
              : null}
            <small
              >Для:
              ${' '}${g.codes.join(', ')}${compact
                ? ''
                : html` ·${' '}<button
                      type="button"
                      class="linkish"
                      aria-expanded=${open === i}
                      onClick=${() => setOpen(open === i ? null : i)}
                    >
                      ${open === i ? 'Свернуть' : 'Как взять и хранить'}
                    </button>`}</small
            >
            ${open === i &&
            html`<div class="prean">
              <span><span class="muted">Забор:</span> ${PREANALYTICS[g.tube].take}</span
              ><span><span class="muted">Хранение:</span> ${PREANALYTICS[g.tube].keep}</span
              ><span><span class="muted">Передача:</span> ${PREANALYTICS[g.tube].send}</span>
            </div>`}
          </span>
        </div>`,
    )}
    <div class="take__note">
      Собрано из преаналитики выбранных исследований. Пробирки с одинаковым биоматериалом для одного отдела лаборатории
      объединены.
    </div>
  </div>`;
}

export function OrderForm({ editId }) {
  const s = useStore();
  const editing = editId ? findOrder(editId) : null;
  const lock = editing ? editLock(editing) : '';
  const [f, setF] = useState(() =>
    editing
      ? fromOrder(editing)
      : { ...emptyForm(), ...(s.formDraft || {}), collectedAt: s.formDraft?.collectedAt || TODAY },
  );
  const [tried, setTried] = useState(false);
  const [doctorOther, setDoctorOther] = useState(() => !!f.doctor && !DOCTORS.includes(f.doctor));
  const done = useRef(false);
  const errs = validate(f);
  const err = (k) => (tried ? errs[k] : '');

  // autosave a new order so nothing is lost on a phone call or a page reload
  useEffect(() => {
    if (editing) return;
    const t = setTimeout(() => !done.current && saveFormDraft(f), 600);
    return () => clearTimeout(t);
  }, [f]);

  if (editId && !editing)
    return html`<div class="page">
      <${Empty}
        icon="search"
        title=${`Заказ ${editId} не найден`}
        action=${html`<a class="btn btn--primary" href="#/orders">К заказам</a>`}
      />
    </div>`;
  if (lock)
    return html`<div class="page">
      <h1>Редактирование ${editing.id}</h1>
      <div class="lockline" style="margin-top:16px"><${Icon} name="info" /><span>${lock}</span></div>
      <p style="margin-top:16px"><a class="btn btn--line" href=${`#/orders/${editing.id}`}>Вернуться к заказу</a></p>
    </div>`;

  const set = (patch) => setF((x) => ({ ...x, ...patch }));
  const setP = (patch) => setF((x) => ({ ...x, patient: { ...x.patient, ...patch } }));
  const setC = (patch) => setF((x) => ({ ...x, clinical: { ...x.clinical, ...patch } }));
  const tests = f.codes.map((c) => CATALOG.find((t) => t.code === c));
  const needs = new Set(tests.flatMap((t) => t.needs || []));
  const roleTest = tests.find((t) => t.participants);

  const addCode = (code) =>
    setF((x) => {
      const codes = addTest(x.codes, code, CATALOG);
      const t = CATALOG.find((c) => c.code === code);
      const participants = t.participants
        ? [
            ...x.participants.filter((p) => p.forCode !== code),
            ...t.participants.map((role) => ({
              role,
              forCode: code,
              last: '',
              first: '',
              middle: '',
              dob: '',
              dobText: '',
              sex: '',
            })),
          ]
        : x.participants;
      return { ...x, codes, participants };
    });
  const removeCode = (code) =>
    setF((x) => ({
      ...x,
      codes: removeTest(x.codes, code, CATALOG),
      participants: x.participants.filter((p) => p.forCode !== code),
    }));
  const setX = (i, patch) =>
    setF((x) => ({ ...x, participants: x.participants.map((p, j) => (j === i ? { ...p, ...patch } : p)) }));

  // patients from earlier orders: re-entering the same person is the most common repeat
  const known = useMemo(() => {
    const q = f.patient.last.trim().toLowerCase();
    if (q.length < 2 || f.patient.dob) return [];
    const m = new Map();
    for (const o of s.orders) {
      if (!o.patient.last.toLowerCase().startsWith(q) || !o.patient.dob) continue;
      const k = `${fullName(o.patient)}|${o.patient.dob}`;
      m.set(k, { p: o.patient, n: (m.get(k)?.n || 0) + 1 });
    }
    return [...m.values()].slice(0, 3);
  }, [f.patient.last, f.patient.dob]);

  const total = orderTotal(f.codes, CATALOG, s.promos, TODAY);
  const tubes = aggregateTubes(f.codes, CATALOG, f.bm);
  const ids = needsIds({ tests: f.codes.map((code) => ({ code })) });
  const autoDocs = [
    s.settings.autoBlank && 'бланк заказа',
    ids && s.settings.autoIds && 'ИДС Panorama',
    s.settings.autoLabels && 'штрих-коды',
  ].filter(Boolean);
  const age = f.patient.dob ? ageYears(f.patient.dob, TODAY) : null;
  const errList = Object.entries(errs);

  const submit = (asDraft) => {
    if (!asDraft && errList.length) {
      setTried(true);
      document.getElementById(errList[0][0])?.focus();
      return;
    }
    if (asDraft && !f.patient.last.trim() && !f.codes.length) {
      toast('Черновик пустой: добавьте пациента или исследование.', { icon: 'info' });
      return;
    }
    done.current = true;
    const o = saveOrder(f, asDraft);
    if (asDraft) {
      toast(`Черновик ${o.id} сохранён. Он виден в «Моих заказах» с фильтром «Черновики».`);
      go('#/orders?status=draft');
      return;
    }
    const docs = [
      s.settings.autoBlank && 'blank',
      needsIds(o) && s.settings.autoIds && 'ids',
      s.settings.autoLabels && 'labels',
    ].filter(Boolean);
    if (docs.length) printDocs(o, docs);
    go(`#/orders/${o.id}?created=1`);
  };

  const clear = () => {
    clearFormDraft();
    setF({ ...emptyForm(), collectedAt: TODAY });
    setTried(false);
  };

  return html`<div class="page">
    <div class="page__head">
      <div>
        ${editing &&
        html`<nav class="crumbs">
          <a href="#/orders">Мои заказы</a><${Icon} name="chevron-right" /><a
            class="mono"
            href=${`#/orders/${editing.id}`}
            >${editing.id}</a
          >
        </nav>`}
        <h1>
          ${editing
            ? editing.status === 'draft'
              ? `Черновик ${editing.id}`
              : `Редактирование ${editing.id}`
            : f.retakeOf
              ? `Перезабор по ${f.retakeOf}`
              : 'Новый заказ'}
        </h1>
        ${editing &&
        html`<p class="page__sub">
          Изменения возможны до вызова курьера. После сохранения перепечатайте бланк и штрих-коды.
        </p>`}
      </div>
    </div>
    <form
      class="formgrid"
      novalidate
      onSubmit=${(e) => {
        e.preventDefault();
        submit(false);
      }}
    >
      <div class="card">
        <section class="fsec" aria-labelledby="sec-p">
          <div class="fsec__head">
            <span class="fsec__n">1</span>
            <h2 id="sec-p">
              Пациент${roleTest
                ? html` <span class="muted" style="font-weight:600">· ${roleTest.mainRole}</span>`
                : null}
            </h2>
          </div>
          <div class="grid3">
            <${Field} label="Фамилия" req id="p-last" error=${err('p-last')}>
              <input
                id="p-last"
                class="input"
                autocomplete="off"
                value=${f.patient.last}
                aria-invalid=${err('p-last') ? 'true' : undefined}
                onInput=${(e) => setP({ last: e.target.value })}
              />
            <//>
            <${Field} label="Имя" req id="p-first" error=${err('p-first')}>
              <input
                id="p-first"
                class="input"
                autocomplete="off"
                value=${f.patient.first}
                aria-invalid=${err('p-first') ? 'true' : undefined}
                onInput=${(e) => setP({ first: e.target.value })}
              />
            <//>
            <${Field} label="Отчество" id="p-middle" hint="Если есть">
              <input
                id="p-middle"
                class="input"
                autocomplete="off"
                value=${f.patient.middle}
                onInput=${(e) =>
                  setP({ middle: e.target.value, ...(f.patient.sex ? {} : { sex: sexFromMiddle(e.target.value) }) })}
              />
            <//>
          </div>
          ${known.length > 0 &&
          html`<div class="stack" style="gap:8px">
            ${known.map(
              ({ p, n }) =>
                html`<div class="patient-hit">
                  <${Icon} name="history" /><span
                    ><b>${fullName(p)}</b> · <span class="mono">${fmtDate(p.dob)}</span> · ${n}
                    ${' '}${plural(n, 'заказ', 'заказа', 'заказов')} в клинике</span
                  >
                  <button
                    type="button"
                    class="btn btn--line btn--sm"
                    onClick=${() => setP({ ...p, dobText: fmtDate(p.dob) })}
                  >
                    Подставить
                  </button>
                </div>`,
            )}
          </div>`}
          <div class="grid4">
            <${Field}
              label="Дата рождения"
              req
              id="p-dob"
              error=${err('p-dob')}
              hint=${age !== null ? `${age} ${plural(age, 'год', 'года', 'лет')}` : 'Можно без точек: 12031994'}
            >
              <${DateField}
                id="p-dob"
                value=${f.patient.dob}
                calendar=${false}
                max=${TODAY}
                error=${err('p-dob')}
                describedBy="p-dob-hint"
                onChange=${(iso, text) => setP({ dob: iso, dobText: text })}
              />
            <//>
            <${Field} label="Пол" req id="p-sex" error=${err('p-sex')}>
              <${Seg}
                id="p-sex"
                value=${f.patient.sex}
                invalid=${err('p-sex')}
                options=${[
                  ['f', 'Женский'],
                  ['m', 'Мужской'],
                ]}
                onChange=${(v) => setP({ sex: v })}
              />
            <//>
            <${Field} label="Телефон пациента" id="p-phone" hint="Для связи по перезабору">
              <input
                id="p-phone"
                class="input mono"
                type="tel"
                inputmode="tel"
                placeholder="+7 (___) ___-__-__"
                value=${f.patient.phone}
                onInput=${(e) => setP({ phone: maskPhone(e.target.value) })}
              />
            <//>
            <${Field} label="Номер карты" id="p-card" hint="Амбулаторная карта в клинике">
              <input id="p-card" class="input mono" value=${f.card} onInput=${(e) => set({ card: e.target.value })} />
            <//>
          </div>
        </section>

        <section class="fsec" aria-labelledby="sec-t">
          <div class="fsec__head">
            <span class="fsec__n">2</span>
            <h2 id="sec-t">Исследования</h2>
            <a class="btn btn--ghost btn--sm" href="#/catalog">Открыть каталог</a>
          </div>
          <${Field}
            id="t-search"
            error=${err('t-search')}
            hint="Начните вводить название или код. Можно отсканировать штрихкод с бланка."
          >
            <${TestPicker} codes=${f.codes} onAdd=${addCode} error=${err('t-search')} />
          <//>
          <div class="quick" style="margin:0">
            Часто заказываете:
            ${[...CATALOG]
              .sort((a, b) => a.popular - b.popular)
              .slice(0, 4)
              .map(
                (t) =>
                  html`<button type="button" disabled=${f.codes.includes(t.code)} onClick=${() => addCode(t.code)}>
                    ${t.short}
                  </button>`,
              )}
          </div>
          ${f.codes.length > 0 &&
          html`<div class="seltests">
            ${tests.map((t) => {
              const bundle = bundledIn(t.code, f.codes, CATALOG);
              const pr = priceOf(t, s.promos, TODAY);
              return html`<div class="seltest" key=${t.code}>
                <span class="code">${t.code}</span>
                <div>
                  <b>${t.name}</b>
                  <div class="seltest__bm">
                    ${t.bm.length > 1
                      ? html`<label class="nowrap"
                          >Биоматериал:
                          <select
                            class="select"
                            style="display:inline-block;width:auto;min-height:36px;padding-block:4px"
                            value=${bmOf(t, f.bm).tube}
                            onChange=${(e) => set({ bm: { ...f.bm, [t.code]: e.target.value } })}
                          >
                            ${t.bm.map((b) => html`<option value=${b.tube}>${TUBES[b.tube].label}</option>`)}
                          </select></label
                        >`
                      : html`<span
                          ><${TubeDot} tube=${t.bm[0].tube} tubes=${TUBES} />${TUBES[t.bm[0].tube].label}${t.bm[0].qty >
                          1
                            ? ` × ${t.bm[0].qty}`
                            : ''}</span
                        >`}
                    <span><${Icon} name="clock" />${t.tat} раб. дн.</span>
                    ${bundle && html`<span>добавлен автоматически к ${bundle.code}</span>`}
                    ${t.ids && html`<span><${Icon} name="printer" />ИДС распечатается после сохранения</span>`}
                  </div>
                </div>
                <span class="mono seltest__price"
                  >${bundle
                    ? 'в комплекте'
                    : html`${pr.promo ? html`<s class="muted">${money(pr.base)}</s> ` : null}${money(pr.price)}`}</span
                >
                ${bundle
                  ? html`<span style="width:36px"></span>`
                  : html`<button
                      type="button"
                      class="iconbtn"
                      aria-label=${`Убрать ${t.short}`}
                      onClick=${() => removeCode(t.code)}
                    >
                      <${Icon} name="x" />
                    </button>`}
              </div>`;
            })}
          </div>`}
          ${f.participants.filter((x) => f.codes.includes(x.forCode)).length > 0 &&
          f.participants.map(
            (x, i) =>
              f.codes.includes(x.forCode) &&
              html`<div class="cond">
                <div class="cond__title"><${Icon} name="users" />Второй участник: ${x.role}</div>
                <div class="grid3">
                  <${Field} label="Фамилия и имя" req id=${`x${i}-last`} error=${err(`x${i}-last`)}>
                    <div style="display:flex;gap:8px">
                      <input
                        id=${`x${i}-last`}
                        class="input"
                        placeholder="Фамилия"
                        value=${x.last}
                        onInput=${(e) => setX(i, { last: e.target.value })}
                      />
                      <input
                        class="input"
                        aria-label="Имя участника"
                        placeholder="Имя"
                        value=${x.first}
                        onInput=${(e) => setX(i, { first: e.target.value })}
                      />
                    </div>
                  <//>
                  <${Field}
                    label="Дата рождения"
                    req
                    id=${`x${i}-dob`}
                    error=${err(`x${i}-dob`)}
                    hint="Можно без точек"
                  >
                    <${DateField}
                      id=${`x${i}-dob`}
                      value=${x.dob}
                      calendar=${false}
                      max=${TODAY}
                      error=${err(`x${i}-dob`)}
                      onChange=${(iso, text) => setX(i, { dob: iso, dobText: text })}
                    />
                  <//>
                  <${Field} label="Пол" req id=${`x${i}-sex`} error=${err(`x${i}-sex`)}>
                    <${Seg}
                      id=${`x${i}-sex`}
                      value=${x.sex}
                      options=${[
                        ['f', 'Женский'],
                        ['m', 'Мужской'],
                      ]}
                      onChange=${(v) => setX(i, { sex: v })}
                    />
                  <//>
                </div>
              </div>`,
          )}
          ${needs.has('pregnancy') &&
          html`<div class="cond">
            <div class="cond__title"><${Icon} name="stethoscope" />Данные о беременности для НИПТ</div>
            <div class="grid4">
              <${Field} label="Срок по УЗИ, нед." req id="c-weeks" error=${err('c-weeks')}>
                <input
                  id="c-weeks"
                  class="input mono"
                  inputmode="numeric"
                  value=${f.clinical.weeks ?? ''}
                  aria-invalid=${err('c-weeks') ? 'true' : undefined}
                  onInput=${(e) => setC({ weeks: e.target.value.replace(/\D/g, '').slice(0, 2) })}
                />
              <//>
              <${Field} label="Дней" id="c-days" error=${err('c-days')}>
                <input
                  id="c-days"
                  class="input mono"
                  inputmode="numeric"
                  value=${f.clinical.days ?? ''}
                  onInput=${(e) => setC({ days: e.target.value.replace(/\D/g, '').slice(0, 1) })}
                />
              <//>
              <${Field} label="Вес, кг" req id="c-weight" error=${err('c-weight')}>
                <input
                  id="c-weight"
                  class="input mono"
                  inputmode="numeric"
                  value=${f.clinical.weight ?? ''}
                  onInput=${(e) => setC({ weight: e.target.value.replace(/\D/g, '').slice(0, 3) })}
                />
              <//>
              <${Field} label="Рост, см" req id="c-height" error=${err('c-height')}>
                <input
                  id="c-height"
                  class="input mono"
                  inputmode="numeric"
                  value=${f.clinical.height ?? ''}
                  onInput=${(e) => setC({ height: e.target.value.replace(/\D/g, '').slice(0, 3) })}
                />
              <//>
            </div>
            <div class="qlist">
              ${[
                [
                  'fetuses',
                  'Беременность',
                  [
                    ['single', 'Одноплодная'],
                    ['multi', 'Многоплодная'],
                  ],
                ],
                [
                  'ivf',
                  'Тип беременности',
                  [
                    ['no', 'Естественная'],
                    ['yes', 'ЭКО'],
                  ],
                ],
                [
                  'donor',
                  'Суррогатное материнство или донорская яйцеклетка',
                  [
                    ['no', 'Нет'],
                    ['yes', 'Да'],
                  ],
                ],
                [
                  'reduction',
                  'Была редукция эмбриона',
                  [
                    ['no', 'Нет'],
                    ['yes', 'Да'],
                  ],
                ],
                [
                  'transplant',
                  'Пересадка костного мозга или стволовых клеток',
                  [
                    ['no', 'Нет'],
                    ['yes', 'Да'],
                  ],
                ],
                [
                  'sexFetus',
                  'Определить пол плода',
                  [
                    ['no', 'Нет'],
                    ['yes', 'Да'],
                  ],
                ],
              ].map(
                ([k, label, opts]) =>
                  html`<div class="qrow">
                    <span class="field__label" id=${`c-${k}-l`}
                      >${label}${k !== 'ivf' && html` <span class="field__req" aria-hidden="true">*</span>`}</span
                    >
                    <${Seg}
                      id=${`c-${k}`}
                      value=${f.clinical[k]}
                      invalid=${err(`c-${k}`)}
                      options=${opts}
                      onChange=${(v) => setC({ [k]: v })}
                    />
                    ${err(`c-${k}`) &&
                    html`<div class="field__err"><${Icon} name="triangle-alert" />${err(`c-${k}`)}</div>`}
                  </div>`,
              )}
            </div>
          </div>`}
          ${needs.has('histology') &&
          html`<div class="cond">
            <div class="cond__title"><${Icon} name="file-text" />Онкология: материал и диагноз</div>
            <div class="grid2">
              <${Field} label="Номер парафинового блока" req id="c-block" error=${err('c-block')}>
                <input
                  id="c-block"
                  class="input mono"
                  value=${f.clinical.block || ''}
                  onInput=${(e) => setC({ block: e.target.value })}
              /><//>
              <${Field} label="Диагноз по гистологическому заключению" req id="c-diagnosis" error=${err('c-diagnosis')}>
                <input
                  id="c-diagnosis"
                  class="input"
                  value=${f.clinical.diagnosis || ''}
                  onInput=${(e) => setC({ diagnosis: e.target.value })}
              /><//>
            </div>
          </div>`}
          ${needs.has('phenotype') &&
          html`<div class="cond">
            <div class="cond__title"><${Icon} name="stethoscope" />Клиническая информация для интерпретации результата</div>
            ${!f.clinical.noClinical &&
            html`<${Field} label="Диагноз, симптомы, семейный анамнез" req id="c-phenotype" error=${err('c-phenotype')}>
              <textarea
                id="c-phenotype"
                class="textarea"
                value=${f.clinical.phenotype || ''}
                onInput=${(e) => setC({ phenotype: e.target.value })}
              ></textarea>
            <//>`}
            <label class="switch"
              ><input
                type="checkbox"
                checked=${!!f.clinical.noClinical}
                onChange=${(e) => setC({ noClinical: e.target.checked })}
              />Клиническая информация не предоставляется</label
            >
            ${f.clinical.noClinical &&
            html`<${Field} label="Причина" req id="c-noreason" error=${err('c-noreason')}>
              <input
                id="c-noreason"
                class="input"
                value=${f.clinical.noClinicalReason || ''}
                onInput=${(e) => setC({ noClinicalReason: e.target.value })}
            /><//>`}
          </div>`}
        </section>

        <section class="fsec" aria-labelledby="sec-b">
          <div class="fsec__head">
            <span class="fsec__n">3</span>
            <h2 id="sec-b">Биоматериал</h2>
          </div>
          ${f.codes.length
            ? html`<${TakeBlock} codes=${f.codes} bm=${f.bm} participants=${f.participants} />`
            : html`<p class="muted">Добавьте исследования, и здесь появится список пробирок.</p>`}
          <div class="grid3">
            <${Field} label="Дата забора" req id="collected" error=${err('collected')}>
              <${DateField}
                id="collected"
                value=${f.collectedAt}
                max=${TODAY}
                error=${err('collected')}
                up
                onChange=${(iso) => set({ collectedAt: iso })}
              />
            <//>
            <${Field} label="Время забора" id="collected-time">
              <input
                id="collected-time"
                class="input mono"
                type="time"
                value=${f.collectedTime}
                onInput=${(e) => set({ collectedTime: e.target.value })}
              />
            <//>
          </div>
        </section>

        <section class="fsec" aria-labelledby="sec-d">
          <div class="fsec__head">
            <span class="fsec__n">4</span>
            <h2 id="sec-d">Врач и комментарий</h2>
          </div>
          <div class="grid2">
            <${Field}
              label="Направивший врач"
              req
              id="doctor"
              error=${err('doctor')}
              hint="Нет врача в списке — выберите «Другой врач…», менеджер добавит его."
            >
              ${doctorOther
                ? html`<div style="display:flex;gap:8px">
                    <input
                      id="doctor"
                      class="input"
                      placeholder="ФИО, специальность"
                      aria-invalid=${err('doctor') ? 'true' : undefined}
                      value=${f.doctor}
                      onInput=${(e) => set({ doctor: e.target.value })}
                    />
                    <button
                      type="button"
                      class="btn btn--ghost btn--sm"
                      onClick=${() => {
                        setDoctorOther(false);
                        set({ doctor: '' });
                      }}
                    >
                      Из списка
                    </button>
                  </div>`
                : html`<select
                    id="doctor"
                    class="select"
                    aria-invalid=${err('doctor') ? 'true' : undefined}
                    value=${f.doctor}
                    onChange=${(e) =>
                      e.target.value === '__other'
                        ? (setDoctorOther(true), set({ doctor: '' }))
                        : set({ doctor: e.target.value })}
                  >
                    <option value="">Выберите врача</option>
                    ${DOCTORS.map((d) => html`<option>${d}</option>`)}
                    <option value="__other">Другой врач…</option>
                  </select>`}
            <//>
            <${Field}
              label="Медицинские документы"
              id="files"
              hint=${f.files.length ? `Прикреплено: ${f.files.join(', ')}` : 'Выписки и заключения, PDF или фото'}
            >
              <div class="filepick">
                <input
                  id="files"
                  type="file"
                  multiple
                  accept=".pdf,image/*"
                  onChange=${(e) => set({ files: [...e.target.files].map((x) => x.name) })}
                />
                <label for="files" class="btn btn--line btn--sm"><${Icon} name="file-down" />Прикрепить файлы</label>
              </div>
            <//>
          </div>
          <${Field} label="Комментарий для лаборатории" id="comment">
            <textarea
              id="comment"
              class="textarea"
              value=${f.comment}
              onInput=${(e) => set({ comment: e.target.value })}
            ></textarea>
          <//>
        </section>
      </div>

      <aside class="card cart" aria-label="Итог заказа">
        <div class="cart__head">
          <h2>${editing ? editing.id : 'Заказ'}</h2>
          ${f.codes.length ? html`<span class="count count--soft">${f.codes.length}</span>` : null}
        </div>
        <div class="cart__body">
          <div class="cart__patient">
            <${Icon} name="user" />${f.patient.last
              ? `${fullName(f.patient)}${age !== null ? `, ${age}` : ''}`
              : html`<span class="muted">Пациент не указан</span>`}
          </div>
          ${f.codes.length === 0
            ? html`<p class="cart__empty">Исследования не выбраны.</p>`
            : html`<div class="cart__items">
                ${tests.map((t) => {
                  const bundle = bundledIn(t.code, f.codes, CATALOG);
                  return html`<div class="citem">
                    <span class="citem__name"><span class="code">${t.code}</span> ${t.short}</span
                    ><span class="citem__price">${bundle ? '—' : money(priceOf(t, s.promos, TODAY).price)}</span
                    ><span></span>
                  </div>`;
                })}
              </div>`}
          ${tubes.length > 0 &&
          html`<div class="take" style="padding:12px">
            <div class="take__title"><${Icon} name="test-tube" />Пробирки</div>
            ${orderTubeGroups(f.codes, CATALOG, f.bm, f.participants).map(
              (g) =>
                html`<div class="take__row">
                  <span class="q">${g.qty} ×</span
                  ><span><${TubeDot} tube=${g.tube} tubes=${TUBES} />${TUBES[g.tube].short}</span>
                </div>`,
            )}
          </div>`}
          <div class="total"><span>Итого</span><b>${money(total)}</b></div>
          ${ids &&
          html`<div class="infoline">
            <${Icon} name="printer" /><span>В заказе Panorama: после сохранения автоматически распечатается ИДС.</span>
          </div>`}
          ${tried &&
          errList.length > 0 &&
          html`<div class="errsum" role="alert">
            <span>Чтобы сохранить, исправьте:</span> ${errList
              .slice(0, 5)
              .map(
                ([k, v]) =>
                  html`<button type="button" onClick=${() => document.getElementById(k)?.focus()}>${v}</button>`,
              )}
            ${errList.length > 5 ? html`<span>и ещё ${errList.length - 5}</span>` : null}
          </div>`}
          <div class="savebar">
            <button type="submit" class="btn btn--primary btn--block">
              <${Icon} name="check" />${editing && editing.status !== 'draft'
                ? 'Сохранить изменения'
                : 'Сохранить заказ'}
            </button>
            ${(!editing || editing.status === 'draft') &&
            html`<button type="button" class="btn btn--line btn--block" onClick=${() => submit(true)}>
              Сохранить черновик
            </button>`}
            ${editing
              ? html`<a class="btn btn--ghost btn--block" href=${`#/orders/${editing.id}`}>Отмена</a>`
              : (f.codes.length || f.patient.last) &&
                html`<button type="button" class="btn btn--ghost btn--block" onClick=${clear}>Очистить форму</button>`}
          </div>
          <div class="muted">
            ${autoDocs.length ? `После сохранения распечатается: ${autoDocs.join(', ')}.` : 'Автопечать выключена.'}
            ${' '}<a href="#/profile">Настроить</a>
          </div>
          ${!editing &&
          s.formDraft?.savedAt &&
          html`<div class="autosave"><${Icon} name="check" />Если закрыть вкладку, введённое не пропадёт</div>`}
        </div>
      </aside>
    </form>
  </div>`;
}
