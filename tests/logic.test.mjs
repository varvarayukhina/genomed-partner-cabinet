// Run: node tests/logic.test.mjs  — checks the business rules behind the wish list.
import assert from 'node:assert/strict';
import {
  maskDate,
  parseDate,
  validateDob,
  aggregateTubes,
  orderTubeGroups,
  tubeBarcodes,
  editLock,
  resultStatus,
  orderTotal,
  priceOf,
  prenatalErrors,
  courierDateError,
  maskPhone,
  toCsv,
} from '../js/logic.js';
import { CATALOG, seed } from '../js/data.js';

// #10 birth date without dots
assert.equal(maskDate('12031994'), '12.03.1994');
assert.equal(maskDate('1203'), '12.03');
assert.equal(maskDate('1.3.1994'), '01.03.1994');
assert.equal(maskDate('1994-03-12'), '12.03.1994');
assert.equal(parseDate('31.02.2020').error, 'Такой даты нет в календаре');
assert.equal(parseDate('29.02.2024').iso, '2024-02-29');
assert.equal(validateDob('01.01.2030', '2026-11-17'), 'Дата рождения в будущем');
assert.equal(validateDob('12.03.1994', '2026-11-17'), '');
assert.equal(maskPhone('89001234567'), '+7 (900) 123-45-67');

// #11 tubes come from tests: NIPT + thrombophilia = 1 Streck + 1 EDTA; two PCR tests share one EDTA tube
let t = aggregateTubes(['1724', '0402'], CATALOG);
assert.deepEqual(
  t.map((x) => [x.tube, x.qty]),
  [
    ['streck', 1],
    ['edta', 1],
  ],
);
t = aggregateTubes(['0402', '0002', '0554'], CATALOG); // pcr pool shares, ngs pool separate
assert.deepEqual(
  t.map((x) => [x.tube, x.qty]),
  [['edta', 2]],
);
t = aggregateTubes(['0005'], CATALOG, { '0005': 'buccal' }); // chosen alternative biomaterial
assert.deepEqual(
  t.map((x) => x.tube),
  ['buccal'],
);
assert.equal(aggregateTubes(['1105'], CATALOG)[0].qty, 2); // Panorama needs two tubes
const groups = orderTubeGroups(['0020'], CATALOG, {}, [{ role: 'Ребёнок', forCode: '0020' }]);
assert.deepEqual(
  groups.map((g) => g.who),
  [0, 1],
); // paternity: a tube for each participant
assert.deepEqual(
  tubeBarcodes(10253, groups).map((b) => b.code),
  ['1025301', '1025302'],
);

// #6 edit until the courier is called; paper orders read-only
assert.equal(editLock({ source: 'lkp', status: 'saved' }), '');
assert.match(editLock({ source: 'lkp', status: 'courier' }), /Курьер уже вызван/);
assert.match(editLock({ source: 'paper', status: 'saved' }), /бумажном бланке/);

// #8 results status has no "оплачен"
assert.equal(resultStatus({ tests: [{ resultAt: '2026-11-01' }, { resultAt: '' }] }).label, 'Готово 1 из 2');

// bundle: 1681 auto-added to 1724 is not charged twice
const promos = [];
assert.equal(orderTotal(['1724', '1681'], CATALOG, promos, '2026-11-17'), CATALOG.find((c) => c.code === '1724').price);
assert.equal(
  priceOf({ code: '1724', price: 1000 }, [{ codes: ['1724'], pct: 15, until: '2026-11-30' }], '2026-11-17').price,
  850,
);

// NIPT rules explained, not silent
assert.match(prenatalErrors({ weeks: 9 }).weeks, /10 недель/);
assert.match(prenatalErrors({ weeks: 12, fetuses: 'multi' }).fetuses, /многоплодной/);

// courier: before 13:00 for today, no weekends
assert.match(courierDateError('2026-11-17', '2026-11-17', 14), /до 13:00/);
assert.equal(courierDateError('2026-11-17', '2026-11-17', 10), '');
assert.match(courierDateError('2026-11-21', '2026-11-17', 10), /выходные/);

// #7 seed has both ЛКП and paper orders; #1 raw-data add-on is never a draft
const s = seed('2026-11-17');
assert.ok(s.orders.some((o) => o.source === 'paper') && s.orders.some((o) => o.source === 'lkp'));
assert.ok(s.orders.filter((o) => o.addon).every((o) => o.status !== 'draft'));
assert.ok(s.orders.every((o) => o.tubes.every((b) => /^\d{7}$/.test(b.code))));

assert.ok(toCsv([['a;b', 'c']]).startsWith('\uFEFF"a;b";c'));
console.log('logic: all checks passed');
import { addTest, removeTest } from '../js/logic.js';
assert.deepEqual(addTest([], '1724', CATALOG), ['1724', '1681']);
assert.deepEqual(removeTest(['1724', '1681', '0402'], '1724', CATALOG), ['0402']);
console.log('bundles: ok');
