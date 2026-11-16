// The one in-progress order: catalog cart and order form share state.formDraft.
import { useState } from './vendor/preact-htm.js';
import { html, go, toast, Dialog } from './ui.js';
import { update, getState, saveOrder } from './store.js';
import { addTest, removeTest } from './logic.js';
import { CATALOG } from './data.js';

export const emptyForm = () => ({
  patient: { last: '', first: '', middle: '', dob: '', dobText: '', sex: '', phone: '', email: '' },
  codes: [],
  bm: {},
  participants: [],
  clinical: {},
  collectedAt: '',
  collectedTime: '',
  doctor: '',
  comment: '',
  card: '',
  files: [],
});
const formHasContent = (f) => f && (f.codes.length || f.patient.last || f.patient.first);

let askReplace = null;
// Start a new order from a prefill (repeat, retake, promo). Never silently drops an unfinished one.
export function startOrder(prefill, hash = '#/new') {
  const cur = getState().formDraft;
  const apply = () => {
    update((s) => (s.formDraft = { ...emptyForm(), ...prefill }));
    go(hash);
  };
  if (
    !formHasContent(cur) ||
    (JSON.stringify(cur.codes) === JSON.stringify(prefill.codes) && cur.patient.last === prefill.patient?.last)
  )
    return apply();
  askReplace({ cur, apply });
}

export function ReplaceDialog() {
  const [ask, setAsk] = useState(null);
  askReplace = setAsk;
  if (!ask) return null;
  const { cur, apply } = ask;
  const who = cur.patient.last ? `${cur.patient.last} ${cur.patient.first}`.trim() : 'без пациента';
  const close = () => setAsk(null);
  return html`<${Dialog}
    title="Есть незавершённый заказ"
    onClose=${close}
    footer=${html` <button class="btn btn--line" onClick=${close}>Вернуться к нему</button>
      <button
        class="btn btn--line"
        onClick=${() => {
          close();
          apply();
        }}
      >
        Заменить
      </button>
      <button
        class="btn btn--primary"
        onClick=${() => {
          const o = saveOrder({ ...cur, patient: { ...cur.patient } }, true);
          toast(`Незавершённый заказ сохранён как черновик ${o.id}`);
          close();
          apply();
        }}
      >
        Сохранить его в черновики
      </button>`}
  >
    <p>
      Вы оформляете заказ: ${who}, ${cur.codes.length} исследований. Сохраните его в черновики, чтобы не потерять, или
      замените новым.
    </p>
  <//>`;
}

// Add tests to the in-progress order from anywhere (catalog, promo, retake).
export function addToDraft(codes) {
  update((s) => {
    const f = s.formDraft || emptyForm();
    for (const c of codes) f.codes = addTest(f.codes, c, CATALOG);
    s.formDraft = f;
  });
}
export function removeFromDraft(code) {
  update((s) => {
    if (!s.formDraft) return;
    s.formDraft.codes = removeTest(s.formDraft.codes, code, CATALOG);
  });
}
