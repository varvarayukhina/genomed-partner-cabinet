import { html, Icon } from '../ui.js';
import { useStore, counters, TODAY } from '../store.js';
import { startOrder } from '../flow.js';
import { fromIso, fmtDate, plural, shortName, addWorkdays } from '../logic.js';
import { OrdersTable, retakePrefill } from './orders.js';

const DAY = new Intl.DateTimeFormat('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' });

export function Home() {
  const s = useStore();
  const c = counters(s);
  const saved = s.orders.filter((o) => o.status === 'saved');
  const drafts = s.orders.filter((o) => o.status === 'draft');
  const retakes = s.orders.filter((o) => o.status === 'retake' && !o.retake.resolvedBy);
  const nextCall = s.couriers.filter((x) => x.status === 'planned').sort((a, b) => a.date.localeCompare(b.date))[0];
  const fd = s.formDraft;
  const daysLeft = (iso) => Math.round((fromIso(iso) - fromIso(TODAY)) / 864e5);
  const when = (iso) =>
    iso === TODAY ? 'сегодня' : iso === addWorkdays(TODAY, 1) && daysLeft(iso) === 1 ? 'завтра' : fmtDate(iso);

  const tasks = [
    ...retakes.map((o) => ({
      kind: 'Перезабор',
      tone: 'stop',
      title: html`<a href=${`#/orders/${o.id}`}>${o.id}</a>, ${shortName(o.patient)}: ${o.retake.reason.toLowerCase()}`,
      text: `Оформить до ${fmtDate(o.retake.deadline)} (осталось ${daysLeft(o.retake.deadline)} ${plural(daysLeft(o.retake.deadline), 'день', 'дня', 'дней')})`,
      action: html`<button class="btn btn--primary btn--sm" onClick=${() => startOrder(retakePrefill(o))}>
        Оформить перезабор
      </button>`,
    })),
    saved.length && {
      kind: 'Не отправлены',
      tone: 'warn',
      title: `${saved.length} ${plural(saved.length, 'заказ ждёт', 'заказа ждут', 'заказов ждут')} вызова курьера`,
      text: saved.map((o) => `${o.id} ${shortName(o.patient)}`).join(', '),
      action: html`<a class="btn btn--primary btn--sm" href=${`#/delivery?orders=${saved.map((o) => o.id).join(',')}`}
        >Вызвать курьера</a
      >`,
    },
    nextCall && {
      kind: 'Курьер',
      tone: 'blue',
      title: `Приедет ${when(nextCall.date)}, ${nextCall.slot}`,
      text: `Заберёт ${nextCall.orderIds.length} ${plural(nextCall.orderIds.length, 'заказ', 'заказа', 'заказов')}${nextCall.consumablesId ? ' и привезёт расходные материалы' : ''}`,
      action: html`<a class="btn btn--line btn--sm" href="#/delivery">Открыть заявку</a>`,
    },
    c.newResults && {
      kind: 'Заключения',
      tone: 'ok',
      title: `${c.newResults} ${plural(c.newResults, 'новое заключение', 'новых заключения', 'новых заключений')}`,
      text: 'Ещё не скачаны',
      action: html`<a class="btn btn--line btn--sm" href="#/results">Скачать</a>`,
    },
    (fd?.codes.length || fd?.patient.last) && {
      kind: 'Не дооформлен',
      tone: 'blue',
      title: `Новый заказ: ${fd.patient.last || 'пациент не указан'}, ${fd.codes.length} ${plural(fd.codes.length, 'исследование', 'исследования', 'исследований')}`,
      text: 'Сохраняется автоматически',
      action: html`<a class="btn btn--line btn--sm" href="#/new">Продолжить</a>`,
    },
    drafts.length && {
      kind: 'Черновики',
      tone: 'blue',
      title: drafts.map((o) => `${o.id} ${shortName(o.patient)}`).join(', '),
      text: 'Не отправлены в лабораторию',
      action: html`<a class="btn btn--line btn--sm" href=${`#/new?edit=${drafts[0].id}`}>Продолжить</a>`,
    },
  ].filter(Boolean);

  return html`<div class="page">
    <div class="page__head">
      <div>
        <h1>Кабинет партнёра</h1>
        <p class="page__sub">${s.clinic.name}, ${DAY.format(fromIso(TODAY))}</p>
      </div>
      <div class="page__actions">
        <a class="btn btn--line" href="#/delivery"><${Icon} name="truck" />Вызвать курьера</a>
        <a class="btn btn--primary only-narrow" href="#/new"><${Icon} name="circle-plus" />Новый заказ</a>
      </div>
    </div>

    <section aria-labelledby="todo-h">
      <div class="section__head"><h2 id="todo-h">Что сделать</h2></div>
      <div class="card tasks">
        ${tasks.length === 0
          ? html`<div class="task">
              <span class="task__kind task__kind--ok">Всё в порядке</span
              ><span class="task__text">Неотправленных заказов, перезаборов и новых заключений нет.</span><span></span>
            </div>`
          : tasks.map(
              (t) =>
                html`<div class="task">
                  <span class=${`task__kind task__kind--${t.tone}`}>${t.kind}</span>
                  <div>
                    <div class="task__title">${t.title}</div>
                    <div class="task__text">${t.text}</div>
                  </div>
                  <div>${t.action}</div>
                </div>`,
            )}
      </div>
    </section>

    <section class="section" aria-labelledby="last-h">
      <div class="section__head">
        <h2 id="last-h">Последние заказы</h2>
        <a class="linkmore" href="#/orders">Все заказы <${Icon} name="chevron-right" /></a>
      </div>
      <${OrdersTable}
        rows=${[...s.orders]
          .sort((a, b) => b.createdAt.slice(0, 10).localeCompare(a.createdAt.slice(0, 10)) || b.num - a.num)
          .slice(0, 8)}
      />
    </section>
  </div>`;
}
