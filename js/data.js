// DEMO DATA. Patients, orders, clinic, managers, phones and barcodes are invented, except the public
// Геномед client-service phone. Catalog codes, names, retail prices and turnaround times are from
// price.genomed.ru (19.11.2026); biomaterial and preanalytics are from «Преаналитика Геномед» (03/2024).
// Partner contract prices differ from retail and come from the lab's systems.
import { addDays, addWorkdays, orderTubeGroups, tubeBarcodes, pad } from './logic.js';

export const TUBES = {
  streck: {
    name: 'Пробирка Streck Cell-Free DNA BCT, 10 мл',
    short: 'Streck, 10 мл',
    label: 'Кровь, Streck',
    color: '#8A5A2B',
  },
  edta: {
    name: 'Пробирка с ЭДТА (сиреневая крышка), 4 мл',
    short: 'ЭДТА, 4 мл',
    label: 'Кровь, ЭДТА',
    color: '#8E6BBF',
  },
  heparin: {
    name: 'Пробирка с литий-гепарином (зелёная крышка), 4 мл',
    short: 'Гепарин, 4 мл',
    label: 'Кровь, гепарин',
    color: '#2E8B57',
  },
  buccal: {
    name: 'Буккальный эпителий: 2 зонда в конверте',
    short: '2 буккальных зонда',
    label: 'Буккальный эпителий',
    color: '#4A6280',
  },
  paraffin: {
    name: 'Парафиновый блок с опухолевой тканью + копия гистологического заключения',
    short: 'Парафиновый блок',
    label: 'Парафиновый блок',
    color: '#B07A1E',
  },
};

export const CATEGORIES = [
  'Пренатальная диагностика',
  'Онкогенетика',
  'Невынашивание и бесплодие',
  'Наследственные заболевания',
  'Фармакогенетика',
  'Полногеномные и панели',
  'Отцовство и родство',
];

// Promo terms are invented for the demo. tat: working days (1438 is 8 calendar days in the price list).
// bm: allowed biomaterials, first is the default (the form offers a choice when there are several)
// needs: extra form sections (pregnancy | histology | phenotype)
// adds: tests the lab adds automatically (bundle, not charged separately)
// ids: consent form printed automatically after saving (ТЗ п. 9)
// rawData: sequencing test, raw data can be ordered after the result (ТЗ п. 1)
// participants: extra people in the same order (paternity), main patient role in mainRole
const EDTA = (pool, qty = 1) => ({ tube: 'edta', qty, pool });
const BUCCAL = (pool) => ({ tube: 'buccal', qty: 1, pool });
export const CATALOG = [
  {
    code: '1724',
    short: 'НИПТ расширенный',
    name: 'Неинвазивный пренатальный ДНК-скрининг «НИПТ расширенная панель»',
    cat: 0,
    bm: [{ tube: 'streck', qty: 1, pool: 'nipt' }],
    tat: 8,
    price: 34000,
    needs: ['pregnancy'],
    adds: ['1681'],
    popular: 1,
    aka: ['nipt', 'нипт'],
  },
  {
    code: '1438',
    short: 'НИПТ стандартный',
    name: 'Неинвазивный пренатальный ДНК-скрининг «НИПТ стандартная панель»',
    cat: 0,
    bm: [{ tube: 'streck', qty: 1, pool: 'nipt' }],
    tat: 8,
    price: 23000,
    needs: ['pregnancy'],
    popular: 4,
    aka: ['nipt', 'нипт'],
  },
  {
    code: '0498',
    short: 'Panorama расширенная',
    name: 'НИПТ Panorama (Natera, США), расширенная панель',
    cat: 0,
    bm: [{ tube: 'streck', qty: 2, pool: 'panorama' }],
    tat: 12,
    price: 47000,
    needs: ['pregnancy'],
    ids: 'panorama',
    popular: 6,
    aka: ['панорама', 'panorama', 'nipt', 'нипт'],
  },
  {
    code: '1681',
    short: 'Скрининг «Базовый»',
    name: 'Скрининг на наследственные заболевания «Базовый»',
    cat: 3,
    bm: [EDTA('ngs')],
    tat: 10,
    price: 7000,
    popular: 12,
  },
  {
    code: '0001',
    short: 'Риск тромбообразования',
    name: 'Анализ генетических полиморфизмов, ассоциированных с риском тромбообразования, с расчётом интегративного риска',
    cat: 2,
    bm: [EDTA('pcr')],
    tat: 10,
    price: 6900,
    popular: 2,
    genes: ['F2', 'F5', 'F7', 'F13A1', 'FGB', 'SERPINE1', 'ITGA2', 'ITGB3'],
    aka: ['тромбофилия', 'pai-1'],
  },
  {
    code: '0002',
    short: 'Фолатный цикл',
    name: 'Анализ полиморфизмов в генах фолатного цикла',
    cat: 2,
    bm: [EDTA('pcr')],
    tat: 5,
    price: 4900,
    popular: 3,
    genes: ['MTHFR', 'MTR', 'MTRR'],
  },
  {
    code: '0013',
    short: 'Кариотип, экспертный',
    name: 'Кариотип, анализ экспертного уровня',
    cat: 2,
    bm: [{ tube: 'heparin', qty: 1, pool: 'cyto' }],
    tat: 21,
    price: 5400,
    popular: 9,
  },
  {
    code: '0793',
    short: 'Микроделеции AZF, расширенный',
    name: 'Расширенный поиск микроделеций AZF-локуса Y-хромосомы',
    cat: 2,
    bm: [EDTA('pcr')],
    tat: 7,
    price: 8100,
    sex: 'm',
    popular: 14,
    aka: ['azf'],
  },
  {
    code: '0005',
    short: 'BRCA1/2: 8 частых мутаций',
    name: 'Определение 8 частых мутаций в генах BRCA1 и BRCA2',
    cat: 1,
    bm: [EDTA('pcr')],
    tat: 5,
    price: 4700,
    popular: 5,
    genes: ['BRCA1', 'BRCA2'],
  },
  {
    code: '0559',
    short: 'BRCA1/2: секвенирование',
    name: 'Полное секвенирование генов BRCA1 и BRCA2',
    cat: 1,
    bm: [EDTA('ngs')],
    tat: 20,
    price: 19500,
    needs: ['phenotype'],
    popular: 10,
    genes: ['BRCA1', 'BRCA2'],
  },
  {
    code: '0007',
    short: 'Мутации EGFR',
    name: 'Определение мутаций в гене EGFR',
    cat: 1,
    bm: [{ tube: 'paraffin', qty: 1, pool: 'onco' }],
    tat: 10,
    price: 8000,
    needs: ['histology'],
    popular: 8,
    genes: ['EGFR'],
  },
  {
    code: '1096',
    short: 'Мутации BRAF, KRAS, NRAS',
    name: 'Определение мутаций в генах BRAF, KRAS и NRAS',
    cat: 1,
    bm: [{ tube: 'paraffin', qty: 1, pool: 'onco' }],
    tat: 10,
    price: 11000,
    needs: ['histology'],
    popular: 11,
    genes: ['BRAF', 'KRAS', 'NRAS'],
  },
  {
    code: '0006',
    short: 'Фармакогенетика варфарина',
    name: 'Фармакогенетика варфарина',
    cat: 4,
    bm: [EDTA('pcr')],
    tat: 7,
    price: 4000,
    popular: 7,
    genes: ['CYP2C9', 'CYP4F2', 'VKORC1'],
  },
  {
    code: '0661',
    short: 'Фармакогенетика клопидогрела',
    name: 'Фармакогенетика клопидогрела',
    cat: 4,
    bm: [EDTA('pcr')],
    tat: 5,
    price: 4400,
    popular: 13,
    genes: ['CYP2C19'],
  },
  {
    code: '0003',
    short: 'Метаболизм лактозы',
    name: 'Анализ полиморфизма c.-13910C>T, ассоциированного с метаболизмом лактозы',
    cat: 3,
    bm: [EDTA('pcr')],
    tat: 7,
    price: 6700,
    popular: 15,
    genes: ['MCM6'],
    aka: ['лактоза', 'лактазная недостаточность'],
  },
  {
    code: '0023',
    short: 'HLA II класса',
    name: 'Типирование по трём генам HLA II класса (DRB1, DQA1, DQB1)',
    cat: 2,
    bm: [EDTA('pcr')],
    tat: 5,
    price: 16400,
    popular: 16,
    genes: ['DRB1', 'DQA1', 'DQB1'],
    aka: ['hla'],
  },
  {
    code: '0197',
    short: 'СМА: делеции SMN1',
    name: 'Поиск делеций 7 экзона гена SMN1',
    cat: 3,
    bm: [EDTA('pcr')],
    tat: 14,
    price: 6500,
    popular: 17,
    genes: ['SMN1'],
    aka: ['сма'],
  },
  {
    code: '0554',
    short: 'Секвенирование экзома',
    name: 'Полное секвенирование экзома',
    cat: 5,
    bm: [EDTA('ngs')],
    tat: 60,
    price: 41000,
    needs: ['phenotype'],
    rawData: true,
    popular: 18,
    aka: ['экзом', 'wes'],
  },
  {
    code: '0856',
    short: 'Геном GenomeUNI',
    name: 'Полное секвенирование генома GenomeUNI',
    cat: 5,
    bm: [EDTA('ngs')],
    tat: 90,
    price: 95000,
    needs: ['phenotype'],
    rawData: true,
    popular: 20,
    aka: ['геном', 'wgs'],
  },
  {
    code: '0552',
    short: 'ХМА «Стандартный»',
    name: 'Хромосомный микроматричный анализ «Стандартный»',
    cat: 5,
    bm: [{ tube: 'edta', qty: 1, pool: 'cma' }],
    tat: 30,
    price: 20000,
    needs: ['phenotype'],
    popular: 19,
    aka: ['хма'],
  },
  {
    code: '2288',
    short: 'Тест на родство, информационный',
    name: 'Универсальный тест на родство, информационный',
    cat: 6,
    bm: [BUCCAL('id'), EDTA('id')],
    tat: 5,
    price: 17000,
    mainRole: 'Предполагаемый отец',
    participants: ['Ребёнок'],
    popular: 21,
    aka: ['отцовство', 'родство', 'днк тест'],
  },
];

// Add-on service (code, name, price and term from price.genomed.ru): ordered from a finished sequencing order, not from the catalog.
export const RAW_DATA = {
  code: '1139',
  short: 'Выдача сырых данных',
  name: 'Выдача сырых данных, полученных по результатам секвенирования или хромосомного микроматричного анализа',
  price: 3000,
  tat: 7,
  bm: [],
};

// Preanalytics per tube: from «Преаналитика Геномед» (03/2024), разд. 1.2–1.5 and 1.8–1.9,
// genomed.ru/informaczionnye-materialy/ (file p1.pdf). Ask the lab for the current edition before launch.
export const PREANALYTICS = {
  streck: {
    take: 'Венозная кровь матери в пробирку Streck до метки, без шприца. Сразу плавно перевернуть 8–10 раз: не встряхивать, не центрифугировать. Подготовка не нужна, кровь можно сдать в любое время.',
    keep: 'Хранить и перевозить при комнатной температуре, не выше +37 °C. Не охлаждать и не замораживать.',
    send: 'В лабораторию — не позднее 10 дней после забора, для Panorama (Natera) — не позднее 4–5 дней. Упаковка из набора Геномед: зип-пакет с салфеткой, гелевая упаковка, фольгированный конверт.',
  },
  edta: {
    take: 'Венозная кровь в пробирку с ЭДТА до метки, без шприца. Перевернуть 8–10 раз. Для ДНК-тестов оставить вертикально при комнатной температуре не меньше 30 минут.',
    keep: 'Лучше всего при +2…+8 °C до 3 суток (допустимо до 7 суток). При комнатной температуре — не больше 1–2 суток. Не замораживать повторно.',
    send: 'Передать курьеру при +2…+8 °C. В одну коробку — только образцы с одинаковой температурой хранения.',
  },
  heparin: {
    take: 'Венозная кровь в пробирку с литий-гепарином до метки, без шприца. Перевернуть 8–10 раз и оставить вертикально на 30 минут. Сдавать не натощак; за месяц — без антибиотиков, после простуды — не раньше чем через 2 недели.',
    keep: 'Хранить и перевозить при +2…+8 °C.',
    send: 'В лабораторию — не позднее 1–2 суток после забора. Кровь на кариотип принимают все дни, кроме пятницы и субботы.',
  },
  buccal: {
    take: 'За 30 минут не есть, не пить, не курить и не жевать резинку, затем прополоскать рот чистой водой. Потереть зондом внутреннюю сторону щеки 10–15 раз, вторым зондом — другую щеку.',
    keep: 'Подсушить зонды 30–60 секунд, не касаясь щёточкой рук и предметов. Влажные зонды не класть в герметичный пакет. На конверте: ФИО, дата рождения, дата забора.',
    send: 'При комнатной температуре, до 7 дней. Для отцовства и родства на конверте указать степень родства и код исследования.',
  },
  paraffin: {
    take: 'Все имеющиеся парафиновые блоки со стеклами и гистологическое заключение. Опухолевой ткани в блоке не меньше 20 %, лучше больше 50 %.',
    keep: 'Хранить и перевозить при комнатной температуре.',
    send: 'Блоки и стекла одного пациента — в один зип-пакет. На пакете штрих-коды по числу исследований и число блоков и стекол. Блоки и стекла возвращают по письменному запросу.',
  },
};

export const CONSUMABLES = [
  {
    id: 'streck',
    group: 'Пробирки и забор',
    name: 'Пробирки Streck Cell-Free DNA BCT, 10 мл',
    pack: 'упаковка 10 шт.',
    tube: 'streck',
  },
  {
    id: 'edta',
    group: 'Пробирки и забор',
    name: 'Пробирки с ЭДТА (сиреневая крышка), 4 мл',
    pack: 'упаковка 50 шт.',
    tube: 'edta',
  },
  {
    id: 'heparin',
    group: 'Пробирки и забор',
    name: 'Пробирки с гепарином (зелёная крышка), 4 мл',
    pack: 'упаковка 50 шт.',
    tube: 'heparin',
  },
  {
    id: 'buccal',
    group: 'Пробирки и забор',
    name: 'Зонды-щёточки для буккального эпителия',
    pack: 'упаковка 20 шт.',
    tube: 'buccal',
  },
  { id: 'needles', group: 'Пробирки и забор', name: 'Иглы-бабочки для вакуумного забора', pack: 'упаковка 50 шт.' },
  { id: 'thermo', group: 'Транспортировка', name: 'Термоконтейнер с хладоэлементами', pack: '1 шт.' },
  {
    id: 'bags',
    group: 'Транспортировка',
    name: 'Пакеты для биоматериала с карманом для направления',
    pack: 'упаковка 100 шт.',
  },
  { id: 'racks', group: 'Транспортировка', name: 'Штатив для пробирок на 20 мест', pack: '1 шт.' },
  { id: 'labels', group: 'Бланки и печать', name: 'Этикетки для пробирок 58 × 40 мм', pack: 'рулон 500 шт.' },
  { id: 'blank-nipt', group: 'Бланки и печать', name: 'Бланки направления: НИПТ', pack: 'пачка 50 шт.' },
  {
    id: 'blank-gen',
    group: 'Бланки и печать',
    name: 'Бланки направления: генетические исследования',
    pack: 'пачка 50 шт.',
  },
  { id: 'br-nipt', group: 'Брошюры для пациентов', name: 'Брошюра НИПТ', pack: 'пачка 50 шт.' },
  { id: 'br-pgt', group: 'Брошюры для пациентов', name: 'Брошюра ПГТ-А', pack: 'пачка 50 шт.' },
  { id: 'br-onco', group: 'Брошюры для пациентов', name: 'Брошюра: наследственный рак', pack: 'пачка 50 шт.' },
];

// Real files from genomed.ru/informaczionnye-materialy/ (checked 19.11.2026): url, size and upload date
// from the site. top: shown in «Нужно чаще всего». In production the library comes from the lab's file source.
const UPLOADS = 'https://genomed.ru/wp-content/uploads/';
export const LIBRARY = [
  { id: 'l1', type: 'Инструкции для медсестёр', title: 'Инструкция по забору крови на НИПТ (пробирка Streck)', url: UPLOADS + 'instrukcija_po_vzjatiju_biomateriala_v_streck.pdf', format: 'PDF', size: '1,4 МБ', updated: '2025-06-05', top: true },
  { id: 'l2', type: 'Инструкции для медсестёр', title: 'Инструкция по забору: Vistara', url: UPLOADS + 'instrukcziya_vistara.pdf', format: 'PDF', size: '721 КБ', updated: '2025-06-05' },
  { id: 'l3', type: 'Инструкции для медсестёр', title: 'Инструкция: установление отцовства и родства', url: UPLOADS + 'instrukcziya_ustanovlenie-otczovstva-i-rodstva-2023.pdf', format: 'PDF', size: '414 КБ', updated: '2025-06-05' },
  { id: 'l4', type: 'Инструкции для медсестёр', title: 'Взятие буккального эпителия: отцовство и родство', url: UPLOADS + 'instrukciya-po-vzyatiyu-bukkalnogo-epiteliya.pdf', format: 'PDF', size: '376 КБ', updated: '2025-06-05' },
  { id: 'l5', type: 'Инструкции для медсестёр', title: 'Взятие буккального эпителия: генетические предрасположенности', url: UPLOADS + 'instrukcija_po_vzjatiju_biomateriala_predraspolozhennosti.pdf', format: 'PDF', size: '991 КБ', updated: '2025-06-05' },
  { id: 'l6', type: 'Инструкции для медсестёр', title: 'Сбор образцов для неинвазивного ПГТ (niPGT)', url: UPLOADS + 'instrukciya-po-sboru-obrazcov-dlya-neinvazivnogo-preimplantacionnogo-geneticheskogo-testirovaniya-v-laboratorii-genomed.pdf', format: 'PDF', size: '595 КБ', updated: '2026-04-09' },
  { id: 'l7', type: 'Инструкции для медсестёр', title: 'Взятие биоматериала: Оптима', url: UPLOADS + 'otbor-i-dostavka-biologicheskogo-materiala.pdf', format: 'PDF', size: '6,2 МБ', updated: '2025-06-05' },
  { id: 'l8', type: 'Инструкции для медсестёр', title: 'Забор биоматериала: микробиом', url: UPLOADS + 'instrukcija_po_vzjatiju_biomateriala_mikrobiom.pdf', format: 'PDF', size: '1,8 МБ', updated: '2025-06-05' },
  { id: 'l9', type: 'Инструкции для медсестёр', title: 'Отмывка и тьюбинг биоптатов для ПГТ', url: UPLOADS + 'instrukciya-po-procedure-otmyvki-i-tyubingu-bioptatov-dlya-pgt2.pdf', format: 'PDF', size: '5,3 МБ', updated: '2026-09-03' },
  { id: 'l10', type: 'Преаналитика', title: 'Преаналитика Геномед: биоматериал, пробирки, маркировка, хранение', url: UPLOADS + 'p1.pdf', format: 'PDF', size: '1,6 МБ', updated: '2025-09-10', top: true },
  { id: 'l11', type: 'Преаналитика', title: 'Забор биоматериала для оценки рецептивности эндометрия (ERT)', url: UPLOADS + 'p2.pdf', format: 'PDF', size: '1,4 МБ', updated: '2025-06-05' },
  { id: 'l12', type: 'Преаналитика', title: 'Установление отцовства и других видов родства: биоматериал по тестам', url: UPLOADS + 'p3n.pdf', format: 'PDF', size: '384 КБ', updated: '2026-11-06' },
  { id: 'l13', type: 'Бланки и согласия', title: 'Направление: ДНК-тест на родство, профилирование, ЭКО/ВРТ', url: UPLOADS + 'napravlenie_hid-forma-zakaza-dnk-testa-roditelstvo-profilirovanie-eko-vrt-v5.1.pdf', format: 'PDF', size: '3,2 МБ', updated: '2025-05-29' },
  { id: 'l14', type: 'Бланки и согласия', title: 'Информированное согласие: Panorama', url: UPLOADS + 'os4.docx', format: 'DOCX', size: '23 КБ', updated: '2025-06-05', top: true },
  { id: 'l15', type: 'Бланки и согласия', title: 'Информированное согласие: Vistara', url: UPLOADS + 'os3.docx', format: 'DOCX', size: '19 КБ', updated: '2025-06-05' },
  { id: 'l16', type: 'Бланки и согласия', title: 'Информированное согласие: НИПС', url: UPLOADS + 'os5.docx', format: 'DOCX', size: '30 КБ', updated: '2025-06-05' },
  { id: 'l17', type: 'Бланки и согласия', title: 'Информированное согласие: пол и резус-фактор плода', url: UPLOADS + 'os6.docx', format: 'DOCX', size: '18 КБ', updated: '2025-06-05' },
  { id: 'l18', type: 'Бланки и согласия', title: 'Информированное согласие: дородовое отцовство', url: UPLOADS + 'os1.pdf', format: 'PDF', size: '326 КБ', updated: '2025-06-05' },
  { id: 'l19', type: 'Бланки и согласия', title: 'Информированное согласие: отцовство и родство', url: UPLOADS + 'os2.pdf', format: 'PDF', size: '293 КБ', updated: '2025-06-05' },
  { id: 'l20', type: 'Бланки и согласия', title: 'Информированное согласие: физические лица (вывоз биоматериала)', url: UPLOADS + 'os7-1.docx', format: 'DOCX', size: '14 КБ', updated: '2026-03-23' },
  { id: 'l21', type: 'Для врачей', title: 'Корпоративная презентация Геномед', url: UPLOADS + 'prez.pdf', format: 'PDF', size: '1,5 МБ', updated: '2026-10-14' },
  { id: 'l22', type: 'Для врачей', title: 'Основные исследования лаборатории Геномед', url: UPLOADS + 'brosh.pdf', format: 'PDF', size: '7,1 МБ', updated: '2026-10-14' },
  { id: 'l23', type: 'Для врачей', title: 'НИПТ: сравнение всех панелей Геномед', url: UPLOADS + '14n1.pdf', format: 'PDF', size: '537 КБ', updated: '2026-10-14' },
  { id: 'l24', type: 'Для врачей', title: 'НИПТ экспертная панель', url: UPLOADS + '14n3.pdf', format: 'PDF', size: '6,1 МБ', updated: '2026-10-14' },
  { id: 'l25', type: 'Для врачей', title: 'Пренатальная генетика в Геномеде', url: UPLOADS + '14n4.pdf', format: 'PDF', size: '1,8 МБ', updated: '2026-10-14' },
  { id: 'l26', type: 'Для врачей', title: 'Пренатальный экзом: листовка', url: UPLOADS + '14n2.pdf', format: 'PDF', size: '1,0 МБ', updated: '2026-10-14' },
  { id: 'l27', type: 'Для врачей', title: 'Статья: валидация НИПС (полная версия)', url: UPLOADS + 'n7.pdf', format: 'PDF', size: '466 КБ', updated: '2025-06-05' },
  { id: 'l28', type: 'Для врачей', title: 'ХМА в пренатальной диагностике', url: UPLOADS + 'x1.pdf', format: 'PDF', size: '1,2 МБ', updated: '2025-06-05' },
  { id: 'l29', type: 'Для врачей', title: 'Большие неврологические панели', url: UPLOADS + 'nz1.pdf', format: 'PDF', size: '1,9 МБ', updated: '2025-06-05' },
  { id: 'l30', type: 'Для врачей', title: 'Зачем делать генетические исследования', url: UPLOADS + 'nz2.pdf', format: 'PDF', size: '797 КБ', updated: '2025-06-05' },
  { id: 'l31', type: 'Для врачей', title: 'Эпилепсия: рекомендации по генетическому тестированию', url: UPLOADS + 'nz3.pdf', format: 'PDF', size: '8,5 МБ', updated: '2025-06-05' },
  { id: 'l32', type: 'Для врачей', title: 'Секвенирование генома GenomeUNI: буклет', url: UPLOADS + 'z2.pdf', format: 'PDF', size: '249 КБ', updated: '2025-06-06' },
  { id: 'l33', type: 'Для врачей', title: 'Сравнение технологий ПГТ-А', url: UPLOADS + 'pgt.pdf', format: 'PDF', size: '962 КБ', updated: '2026-10-14' },
  { id: 'l34', type: 'Для врачей', title: 'Презентация ERT', url: UPLOADS + 'ert.pdf', format: 'PDF', size: '9,0 МБ', updated: '2026-10-14' },
  { id: 'l35', type: 'Для врачей', title: 'Фетометрия плода: листовка А4', url: UPLOADS + 'fen.pdf', format: 'PDF', size: '118 КБ', updated: '2026-10-14' },
  { id: 'l36', type: 'Для врачей', title: 'Досудебные и судебные услуги: продвижение и работа с ними', url: UPLOADS + 'z1.pdf', format: 'PDF', size: '16,3 МБ', updated: '2025-09-10' },
  { id: 'l37', type: 'Для пациентов', title: 'Брошюра: НИПТ в Геномеде', url: UPLOADS + 'pn13.pdf', format: 'PDF', size: '4,2 МБ', updated: '2026-09-07' },
  { id: 'l38', type: 'Для пациентов', title: 'Книга по пренатальной диагностике', url: UPLOADS + 'pn14.pdf', format: 'PDF', size: '711 КБ', updated: '2026-09-07' },
  { id: 'l39', type: 'Для пациентов', title: 'Презентация: НИПТ экспертная панель', url: UPLOADS + 'pn15.pdf', format: 'PDF', size: '6,1 МБ', updated: '2026-09-07' },
  { id: 'l40', type: 'Для пациентов', title: 'Сравнение всех НИПТ в Геномеде', url: UPLOADS + 'pn16.pdf', format: 'PDF', size: '417 КБ', updated: '2026-09-07' },
  { id: 'l41', type: 'Для пациентов', title: 'Лифлет для пациента: Оптима', url: UPLOADS + 'xma.pdf', format: 'PDF', size: '37,2 МБ', updated: '2025-06-06' },
  { id: 'l42', type: 'Для пациентов', title: 'РепроПлан', url: UPLOADS + 'rp.pdf', format: 'PDF', size: '343 КБ', updated: '2026-10-14' },
  { id: 'l43', type: 'Образцы заключений', title: 'НИПТ базовая панель', url: UPLOADS + 'on4.pdf', format: 'PDF', size: '325 КБ', updated: '2025-06-06' },
  { id: 'l44', type: 'Образцы заключений', title: 'НИПТ стандартная панель', url: UPLOADS + 'on5.pdf', format: 'PDF', size: '737 КБ', updated: '2025-06-06' },
  { id: 'l45', type: 'Образцы заключений', title: 'НИПТ Т21', url: UPLOADS + 'on6.pdf', format: 'PDF', size: '339 КБ', updated: '2025-06-06' },
  { id: 'l46', type: 'Образцы заключений', title: 'НИПТ: носительство мутаций', url: UPLOADS + 'on8.pdf', format: 'PDF', size: '555 КБ', updated: '2025-06-06' },
  { id: 'l47', type: 'Образцы заключений', title: 'Panorama: низкий риск', url: UPLOADS + 'on7.pdf', format: 'PDF', size: '1,0 МБ', updated: '2025-06-06' },
  { id: 'l48', type: 'Образцы заключений', title: 'Panorama: высокий риск', url: UPLOADS + 'on3.pdf', format: 'PDF', size: '1,1 МБ', updated: '2025-06-06' },
  { id: 'l49', type: 'Образцы заключений', title: 'Vistara: низкий риск', url: UPLOADS + 'on2.pdf', format: 'PDF', size: '299 КБ', updated: '2025-06-06' },
  { id: 'l50', type: 'Образцы заключений', title: 'Оптима', url: UPLOADS + 'm3.pdf', format: 'PDF', size: '1,1 МБ', updated: '2025-06-06' },
  { id: 'l51', type: 'Образцы заключений', title: 'Оптима расширенный', url: UPLOADS + 'm2.pdf', format: 'PDF', size: '1,2 МБ', updated: '2025-06-06' },
  { id: 'l52', type: 'Образцы заключений', title: 'FoundationOne CDx', url: UPLOADS + 'oo1.pdf', format: 'PDF', size: '686 КБ', updated: '2025-06-06' },
  { id: 'l53', type: 'Образцы заключений', title: 'FoundationOne Heme', url: UPLOADS + 'oo2.pdf', format: 'PDF', size: '914 КБ', updated: '2025-06-06' },
  { id: 'l54', type: 'Образцы заключений', title: 'Микробиом кишечника', url: UPLOADS + 'gp2-1-1-1.pdf', format: 'PDF', size: '1,0 МБ', updated: '2026-04-24' },
  { id: 'l55', type: 'Образцы заключений', title: 'Национальность', url: UPLOADS + 'gp3-1.pdf', format: 'PDF', size: '8,9 МБ', updated: '2025-10-15' },
];

export const MANAGERS = [
  {
    id: 'm1',
    name: 'Анна Смирнова',
    role: 'Персональный менеджер',
    about: 'Договор, цены, акции, вопросы по заказам',
    phone: '+7 (900) 000-04-12',
    email: 'a.smirnova@example.com',
    hours: 'Пн–Пт, 9:00–18:00',
    main: true,
  },
  {
    id: 'm2',
    name: 'Отдел логистики',
    role: 'Курьеры и расходные материалы',
    about: 'Опоздал курьер, нужно перенести визит, не привезли расходники',
    phone: '+7 (900) 000-07-70',
    email: 'logistics@example.com',
    hours: 'Ежедневно, 8:00–20:00',
  },
  {
    id: 'm3',
    name: 'Врач-генетик',
    role: 'Консультации для врачей клиники',
    about: 'Выбор исследования, интерпретация заключения',
    phone: '+7 (900) 000-03-03',
    email: 'genetics@example.com',
    hours: 'Пн–Пт, 10:00–17:00',
  },
  {
    id: 'm4',
    name: 'Бухгалтерия',
    role: 'Счета и акты сверки',
    about: 'Закрывающие документы, оплата по договору',
    phone: '+7 (900) 000-05-05',
    email: 'buh@example.com',
    hours: 'Пн–Пт, 9:00–17:00',
  },
];

export const SUPPORT_PHONE = '8 (495) 660-83-77';

const PATIENTS = [
  ['Петрова', 'Анна', 'Сергеевна', 'f', '1994-03-12'],
  ['Ковалёв', 'Дмитрий', 'Игоревич', 'm', '1981-07-05'],
  ['Савина', 'Екатерина', 'Николаевна', 'f', '1979-11-23'],
  ['Орлов', 'Максим', 'Андреевич', 'm', '1956-02-14'],
  ['Миронова', 'Татьяна', 'Павловна', 'f', '1990-05-30'],
  ['Лебедева', 'Ольга', 'Викторовна', 'f', '1988-09-02'],
  ['Зайцев', 'Кирилл', 'Романович', 'm', '1962-12-01'],
  ['Белова', 'Наталья', 'Алексеевна', 'f', '1992-08-17'],
  ['Кузнецова', 'Мария', 'Олеговна', 'f', '1996-01-25'],
  ['Фёдоров', 'Артём', 'Сергеевич', 'm', '1985-04-09'],
  ['Николаева', 'Ирина', 'Владимировна', 'f', '1987-10-14'],
  ['Григорьева', 'Дарья', 'Михайловна', 'f', '1993-06-21'],
  ['Тихонов', 'Павел', 'Евгеньевич', 'm', '1971-03-03'],
  ['Алексеева', 'Юлия', 'Константиновна', 'f', '1989-12-12'],
  ['Смирнов', 'Олег', 'Борисович', 'm', '1968-09-19'],
  ['Волкова', 'Светлана', 'Игоревна', 'f', '1983-02-27'],
  ['Егорова', 'Полина', 'Андреевна', 'f', '1997-07-07'],
  ['Морозов', 'Илья', 'Денисович', 'm', '1990-11-11'],
  ['Сергеева', 'Алина', 'Рустамовна', 'f', '1995-04-18'],
  ['Павлова', 'Вера', 'Геннадьевна', 'f', '1975-08-08'],
  ['Романова', 'Ксения', 'Ильинична', 'f', '1991-01-30'],
  ['Козлов', 'Андрей', 'Викторович', 'm', '1959-05-15'],
  ['Яковлева', 'Елена', 'Петровна', 'f', '1984-03-28'],
  ['Борисов', 'Глеб', 'Олегович', 'm', '1977-10-02'],
];

export const DOCTORS = [
  'Иванова Е. П., акушер-гинеколог',
  'Соколов А. В., онколог',
  'Ким Л. Р., врач-генетик',
  'Демидова Н. С., терапевт',
  'Орлова М. А., репродуктолог',
  'Фролова Т. Г., акушер-гинеколог',
];

// [num, daysAgo, patientIdx, codes, status, source, extra]
const N = (weeks, days, weight, height, ivf = 'no') => ({
  weeks,
  days,
  weight,
  height,
  fetuses: 'single',
  sexFetus: 'no',
  ivf,
  donor: 'no',
  reduction: 'no',
  transplant: 'no',
});
const ORDERS = [
  [10252, 0, 16, ['0498'], 'saved', 'lkp', { clinical: N(12, 3, 61, 168) }],
  [10251, 0, 17, ['0006'], 'draft', 'lkp', {}],
  [10250, 1, 18, ['0001', '0002'], 'saved', 'lkp', {}],
  [10249, 1, 19, ['0005'], 'courier', 'lkp', {}],
  [10248, 2, 0, ['1724', '1681'], 'lab', 'lkp', { clinical: N(11, 2, 58, 164) }],
  [10247, 4, 1, ['0001'], 'done', 'lkp', { ready: [0], seen: false }],
  [10246, 2, 20, ['1438'], 'transit', 'paper', { clinical: N(13, 0, 64, 170) }],
  [10245, 1, 21, ['0006'], 'courier', 'lkp', {}],
  [
    10241,
    6,
    2,
    ['0005'],
    'retake',
    'lkp',
    {
      retake: {
        reason: 'Сгусток в пробирке',
        detail: 'Кровь свернулась: пробирку не перевернули после забора.',
        deadlineDays: 3,
      },
    },
  ],
  [10239, 3, 3, ['0006'], 'transit', 'lkp', {}],
  [10238, 7, 4, ['0002', '0003'], 'done', 'lkp', { ready: [0, 1], seen: false }],
  [
    10236,
    7,
    5,
    ['0554'],
    'lab',
    'lkp',
    { clinical: { phenotype: 'Задержка психомоторного развития у сына, семейный анамнез отягощён.' } },
  ],
  [
    10233,
    2,
    6,
    ['0007', '1096'],
    'courier',
    'lkp',
    { clinical: { block: '24-11873/2', diagnosis: 'Аденокарцинома лёгкого' } },
  ],
  [10230, 9, 7, ['1438'], 'done', 'lkp', { ready: [0], seen: false, clinical: N(12, 1, 66, 172) }],
  [10229, 10, 8, ['1724', '1681'], 'partial', 'paper', { ready: [0], seen: true, clinical: N(10, 5, 59, 160, 'yes') }],
  [10227, 11, 9, ['0006', '0661'], 'partial', 'lkp', { ready: [0], seen: false }],
  [
    10225,
    12,
    10,
    ['1724', '1681'],
    'retake',
    'paper',
    {
      retake: {
        reason: 'Низкая фетальная фракция',
        detail: 'Доля внеклеточной ДНК плода в образце ниже порога, нужен новый образец.',
        deadlineDays: 5,
        tests: ['1724'],
      },
      clinical: N(10, 4, 70, 166),
    },
  ],
  [10224, 22, 11, ['0013'], 'done', 'lkp', { ready: [0], seen: false }],
  [
    10221,
    26,
    12,
    ['0559'],
    'done',
    'paper',
    { ready: [0], seen: true, clinical: { phenotype: 'Рак молочной железы у матери в 42 года.' } },
  ],
  [10219, 14, 13, ['0001'], 'cancelled', 'lkp', {}],
  [10216, 18, 14, ['0005', '0006'], 'done', 'lkp', { ready: [0, 1], seen: true }],
  [10214, 19, 22, ['1724', '1681'], 'done', 'lkp', { ready: [0, 1], seen: true, clinical: N(11, 0, 62, 165) }],
  [10211, 20, 23, ['0793'], 'done', 'paper', { ready: [0], seen: true }],
  [10209, 21, 0, ['0002'], 'done', 'lkp', { ready: [0], seen: true }],
  [10205, 23, 7, ['0001', '0002'], 'done', 'lkp', { ready: [0, 1], seen: true }],
  [10202, 24, 18, ['0023'], 'done', 'lkp', { ready: [0], seen: true }],
  [10198, 27, 19, ['0197'], 'done', 'paper', { ready: [0], seen: true }],
  [
    10195,
    41,
    15,
    ['0559'],
    'done',
    'lkp',
    { ready: [0], seen: true, clinical: { phenotype: 'Рак яичников у сестры.' } },
  ],
  [10190, 30, 21, ['0003'], 'done', 'lkp', { ready: [0], seen: true }],
  [10186, 33, 16, ['1438'], 'done', 'lkp', { ready: [0], seen: true, clinical: N(12, 0, 57, 162) }],
  [
    10180,
    78,
    13,
    ['0554'],
    'done',
    'lkp',
    { ready: [0], seen: true, clinical: { phenotype: 'Эпилепсия с раннего детства, двое сибсов здоровы.' } },
  ],
  [10176, 36, 9, ['0661'], 'done', 'lkp', { ready: [0], seen: true }],
  [
    10171,
    38,
    11,
    ['2288'],
    'done',
    'paper',
    {
      ready: [0],
      seen: true,
      participants: [
        {
          role: 'Ребёнок',
          forCode: '2288',
          last: 'Григорьев',
          first: 'Матвей',
          middle: 'Ильич',
          dob: '2021-04-14',
          sex: 'm',
        },
      ],
    },
  ],
  [10166, 40, 4, ['0001'], 'done', 'lkp', { ready: [0], seen: true }],
  [
    10163,
    9,
    23,
    ['0552'],
    'lab',
    'lkp',
    { delayedDays: 6, clinical: { phenotype: 'Множественные пороки развития у плода в анамнезе.' } },
  ],
];

function at(iso, hh, mm) {
  return `${iso}T${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}

export function seed(today) {
  const orders = [];
  const couriers = [];
  const tomorrow = addWorkdays(today, 1);

  for (const [num, ago, pi, codes, status, source, extra] of ORDERS) {
    const [last, first, middle, sex, dob] = PATIENTS[pi];
    const created = addDays(today, -ago);
    const participants = extra.participants || [];
    const tubes = status === 'draft' ? [] : tubeBarcodes(num, orderTubeGroups(codes, CATALOG, extra.bm, participants));
    const history = [
      {
        at: at(created, 10, 5 + (num % 40)),
        text: source === 'paper' ? 'Заказ зарегистрирован лабораторией по бумажному бланку' : 'Заказ создан в кабинете',
      },
    ];
    const order = {
      id: `ЗК-${num}`,
      num,
      source,
      status,
      createdAt: at(created, 10, 5 + (num % 40)),
      collectedAt: status === 'draft' ? '' : created,
      patient: {
        last,
        first,
        middle,
        sex,
        dob,
        phone: `+7 (9${num % 10}0) ${String(num).slice(1, 4)}-${String(num).slice(3, 5)}-${String(pi + 10).padStart(2, '0')}`,
        email: '',
      },
      tests: codes.map((code, i) => ({
        code,
        resultAt: extra.ready?.includes(i)
          ? addDays(created, Math.min(ago, Math.round(CATALOG.find((c) => c.code === code).tat * 1.4)))
          : '',
      })),
      clinical: extra.clinical || {},
      bm: extra.bm || {},
      participants,
      card: '',
      doctor: DOCTORS[{ 0: 0, 1: 1, 2: 0, 3: 2, 4: 3, 5: 2, 6: 2 }[CATALOG.find((c) => c.code === codes[0]).cat]],
      comment: '',
      tubes,
      history,
      resultsSeen: extra.seen ?? true,
    };
    if (['courier', 'transit', 'lab', 'done', 'partial', 'retake'].includes(status) && source === 'lkp') {
      history.push({ at: at(created, 11, 20), text: 'Распечатаны направление и этикетки' });
      history.push({
        at: at(created, 12, 2),
        text:
          status === 'courier'
            ? `Вызван курьер на ${tomorrow.slice(8, 10)}.${tomorrow.slice(5, 7)}, 10:00–14:00`
            : 'Вызван курьер',
      });
    }
    if (['transit', 'lab', 'done', 'partial', 'retake'].includes(status))
      history.push({ at: at(addDays(created, ago > 0 ? 1 : 0), 11, 40), text: 'Биоматериал передан курьеру' });
    if (['lab', 'done', 'partial', 'retake'].includes(status))
      history.push({ at: at(addDays(created, 1), 16, 15), text: 'Получен лабораторией' });
    if (status === 'retake') {
      order.retake = {
        reason: extra.retake.reason,
        detail: extra.retake.detail,
        deadline: addDays(today, extra.retake.deadlineDays),
        tests: extra.retake.tests || codes,
      };
      history.push({
        at: at(addDays(created, 2), 9, 30),
        text: `Нужен перезабор: ${extra.retake.reason.toLowerCase()}`,
      });
    }
    order.tests.forEach((t) => {
      if (t.resultAt)
        history.push({
          at: at(t.resultAt, 15, 0),
          text: `Готово заключение: ${t.code} ${CATALOG.find((c) => c.code === t.code).short}`,
        });
    });
    if (extra.delayedDays) {
      order.delayedTo = addWorkdays(today, extra.delayedDays);
      history.push({
        at: at(addDays(today, -1), 12, 0),
        text: `Срок выдачи перенесён на ${order.delayedTo.slice(8, 10)}.${order.delayedTo.slice(5, 7)}: повторная постановка анализа`,
      });
    }
    if (status === 'cancelled') history.push({ at: at(created, 13, 10), text: 'Заказ отменён клиникой' });
    orders.push(order);
  }

  // A raw-data add-on that went straight to work (ТЗ п. 1: no drafts).
  const parent = orders.find((o) => o.num === 10195);
  const addon = {
    id: 'ЗК-10199',
    num: 10199,
    source: 'lkp',
    status: 'done',
    addon: true,
    parentId: parent.id,
    createdAt: at(addDays(today, -6), 9, 12),
    collectedAt: '',
    patient: { ...parent.patient },
    tests: [{ code: RAW_DATA.code, resultAt: addDays(today, -4) }],
    clinical: {},
    bm: {},
    participants: [],
    card: '',
    doctor: parent.doctor,
    comment: 'Форматы: FASTQ, VCF',
    tubes: [],
    resultsSeen: true,
    history: [
      {
        at: at(addDays(today, -6), 9, 12),
        text: `Дозаказ к ${parent.id}: выдача сырых данных. Оформлен сразу, без черновика`,
      },
      { at: at(addDays(today, -4), 14, 0), text: 'Ссылка на данные отправлена на e-mail клиники' },
    ],
  };
  parent.rawDataOrderId = addon.id;
  orders.push(addon);

  const waiting = orders.filter((o) => o.status === 'courier').map((o) => o.id);
  couriers.push({
    id: 'К-3120',
    date: tomorrow,
    slot: '10:00–14:00',
    address: 0,
    orderIds: waiting,
    status: 'planned',
    boxes: 1,
    thermo: true,
    comment: '',
    consumablesId: 'Р-218',
  });
  couriers.push({
    id: 'К-3114',
    date: addDays(today, -2),
    slot: '10:00–14:00',
    address: 0,
    orderIds: ['ЗК-10246', 'ЗК-10239', 'ЗК-10248'],
    status: 'done',
    boxes: 1,
    thermo: true,
    comment: '',
  });
  couriers.push({
    id: 'К-3101',
    date: addDays(today, -7),
    slot: '14:00–18:00',
    address: 1,
    orderIds: ['ЗК-10241', 'ЗК-10238', 'ЗК-10236'],
    status: 'done',
    boxes: 1,
    thermo: false,
    comment: 'Вход со двора',
  });

  return {
    orders,
    couriers,
    supplies: [
      {
        id: 'Р-218',
        createdAt: at(addDays(today, -1), 15, 30),
        items: [
          { id: 'streck', qty: 2 },
          { id: 'edta', qty: 1 },
          { id: 'br-nipt', qty: 1 },
        ],
        status: 'planned',
        withCourier: 'К-3120',
      },
      {
        id: 'Р-204',
        createdAt: at(addDays(today, -15), 12, 10),
        items: [
          { id: 'edta', qty: 2 },
          { id: 'labels', qty: 1 },
          { id: 'thermo', qty: 1 },
        ],
        status: 'delivered',
        deliveredAt: addDays(today, -13),
      },
    ],
    notifications: [
      {
        id: 'n1',
        at: at(today, 9, 40),
        type: 'result',
        text: 'Готово заключение по ЗК-10247: тромбофилия, 12 полиморфизмов',
        link: '#/orders/ЗК-10247',
        read: false,
      },
      {
        id: 'n2',
        at: at(addDays(today, -1), 17, 5),
        type: 'retake',
        text: 'Нужен перезабор по ЗК-10225: низкая фетальная фракция',
        link: '#/retakes',
        read: false,
      },
      {
        id: 'n3',
        at: at(addDays(today, -1), 15, 32),
        type: 'courier',
        text: `Курьер назначен на ${tomorrow.slice(8, 10)}.${tomorrow.slice(5, 7)}, 10:00–14:00. Привезёт заказанные расходники`,
        link: '#/delivery',
        read: false,
      },
      {
        id: 'n4',
        at: at(addDays(today, -2), 11, 0),
        type: 'library',
        text: 'В библиотеке обновлена таблица «Установление отцовства и других видов родства: биоматериал по тестам»',
        link: '#/library',
        read: false,
      },
      {
        id: 'n5',
        at: at(addDays(today, -3), 10, 0),
        type: 'retake',
        text: 'Нужен перезабор по ЗК-10241: сгусток в пробирке',
        link: '#/retakes',
        read: true,
      },
      {
        id: 'n6',
        at: at(addDays(today, -4), 12, 0),
        type: 'promo',
        text: 'Новая акция: НИПТ расширенный −15% до конца месяца',
        link: '#/promo',
        read: true,
      },
      {
        id: 'n7',
        at: at(addDays(today, -4), 14, 0),
        type: 'result',
        text: 'Сырые данные по ЗК-10195 отправлены на e-mail клиники',
        link: '#/orders/ЗК-10199',
        read: true,
      },
    ],
    promos: [
      {
        id: 'p1',
        title: 'НИПТ расширенный −15%',
        for: 'Для пациентов',
        text: 'Скидка для пациентов клиники на НИПТ расширенный. Цена в каталоге и в заказе уже со скидкой.',
        codes: ['1724'],
        pct: 15,
        until: lastDayOfMonth(today),
      },
      {
        id: 'p2',
        title: 'Фармакогенетика −10%',
        for: 'Для пациентов',
        text: 'Скидка 10% на фармакогенетику варфарина и клопидогрела.',
        codes: ['0006', '0661'],
        pct: 10,
        until: addDays(today, 24),
      },
      {
        id: 'p3',
        title: 'Расходники бесплатно',
        for: 'Для клиники',
        text: 'При 10 и более заказах НИПТ в месяц пробирки Streck и брошюры НИПТ бесплатно.',
        codes: [],
        until: addDays(today, 44),
      },
    ],
    clinic: {
      name: 'Клиника «Медицина+»',
      partnerId: '0412',
      inn: '7700000000',
      contract: '№ П-0412 от 15.01.2025',
      email: 'lab@medicina-plus.example',
      phone: '+7 (900) 000-11-22',
      addresses: ['Москва, ул. Примерная, д. 12, процедурный кабинет', 'Москва, Тестовый пр-т, д. 5, филиал'],
      staff: [
        { name: 'Ольга Чернова', role: 'Регистратор', access: 'Заказы, печать, курьер' },
        { name: 'Марина Лаптева', role: 'Процедурная медсестра', access: 'Заказы, печать, курьер, расходники' },
        { name: 'Иванова Е. П.', role: 'Врач', access: 'Заказы, заключения' },
        { name: 'Сергей Гусев', role: 'Администратор', access: 'Все разделы' },
        { name: 'Татьяна Белова', role: 'Бухгалтер', access: 'Закрывающие документы' },
      ],
    },
    settings: {
      autoBlank: true,
      autoIds: true,
      autoLabels: false,
      labelFormat: 'thermal',
      notifyEmail: true,
      notifySms: false,
      contact: 'Марина Лаптева',
      contactPhone: '+7 (900) 000-11-23',
    },
    draft: null,
    nextNum: 10253,
  };
}

function lastDayOfMonth(iso) {
  const [y, m] = iso.split('-').map(Number);
  const d = new Date(y, m, 0);
  return `${y}-${String(m).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/* ---------- аналитика и закрывающие документы (демо) ---------- */
// Упрощение: история за 12 полных месяцев считается от даты по фиксированному зерну, чтобы цифры не
// прыгали между открытиями. В месяцах, где уже есть заказы из ORDERS, синтетика добирает объём до обычного.
// Средние по другим клиникам условные. В рабочей версии всё это отдаёт лабораторная система.
export const MONTHS = ['январь', 'февраль', 'март', 'апрель', 'май', 'июнь', 'июль', 'август', 'сентябрь', 'октябрь', 'ноябрь', 'декабрь'];
const MIX = [['1724', 9], ['0001', 7], ['0498', 6], ['0006', 5], ['0005', 4], ['0002', 4], ['1438', 3], ['0013', 2], ['0007', 2], ['0856', 1]];
export const RETAKE_REASONS = ['Гемолиз', 'Сгусток в пробирке', 'Мало биоматериала', 'Низкая фетальная фракция', 'Превышен срок доставки', 'Данные на пробирке и бланке не совпадают'];
const RETAKE_W = [5, 4, 3, 2, 2, 1];
// category -> [main, second] index in DOCTORS: who usually refers for this kind of test
const DOC_BY_CAT = [[0, 5], [1, 3], [4, 0], [2, 3], [3, 1], [2, 4], [2, 3]];

export function history(today) {
  let x = 41203;
  const rnd = () => (x = (x * 16807) % 2147483647) / 2147483647;
  const pick = (w) => {
    let r = rnd() * w.reduce((a, b) => a + b, 0);
    return w.findIndex((v) => (r -= v) < 0);
  };
  const seeded = {};
  for (const o of ORDERS)
    if (!['draft', 'cancelled'].includes(o[4])) {
      const ym = addDays(today, -o[1]).slice(0, 7);
      seeded[ym] = (seeded[ym] || 0) + 1;
    }
  // own generator for doctors, so the order counts above stay the same
  let z = 7919;
  const rnd2 = () => (z = (z * 16807) % 2147483647) / 2147483647;
  const docOf = (code) => DOCTORS[DOC_BY_CAT[CATALOG.find((c) => c.code === code).cat][rnd2() < 0.75 ? 0 : 1]];
  let num = Math.min(...ORDERS.map((o) => o[0]));
  const [y0, m0] = today.split('-').map(Number);
  const out = [];
  for (let i = 1; i <= 12; i++) {
    const d = new Date(y0, m0 - 1 - i, 1);
    const y = d.getFullYear();
    const m = d.getMonth() + 1;
    const ym = `${y}-${pad(m)}`;
    const days = new Date(y, m, 0).getDate();
    const total = Math.round(30 + (12 - i) * 0.8 + rnd() * 9);
    const n = Math.max(0, total - (seeded[ym] || 0));
    const codes = Array.from({ length: n }, () => MIX[pick(MIX.map((q) => q[1]))][0]);
    num -= n;
    const reasons = RETAKE_REASONS.map(() => 0);
    const retakes = Math.max(1, Math.round(total * (0.022 + rnd() * 0.02)));
    for (let k = 0; k < retakes; k++) reasons[pick(RETAKE_W)]++;
    out.unshift({
      ym,
      y,
      m,
      orders: codes.map((code, k) => ({
        id: `ЗК-${num + k}`,
        date: `${ym}-${pad(1 + Math.floor((k / n) * days))}`,
        code,
        doctor: docOf(code),
      })),
      reasons,
      retakeShare: retakes / total,
      onTimeShare: 1 - (0.02 + rnd() * 0.05),
      lkpShare: Math.min(0.92, 0.6 + (12 - i) * 0.025 + rnd() * 0.04),
    });
  }
  return out;
}

// Обезличенные средние по клиникам-партнёрам за тот же период (условные)
export const BENCH = {
  all: { label: 'Все партнёры', long: 'все клиники-партнёры Геномед', retake: 0.026, onTime: 0.93, lkp: 0.64 },
  region: { label: 'Москва и область', long: 'клиники-партнёры в Москве и области', retake: 0.029, onTime: 0.95, lkp: 0.71 },
};

// ПГТ-А: доля эуплоидных эмбрионов по возрасту пациентки, %; [ваша клиника, все партнёры, регион]
export const PGT_DEMO = {
  12: { embryos: 412, groups: [[58, 55, 57], [47, 45, 46], [32, 31, 33], [18, 19, 20], [8, 9, 9]], noResult: [3.1, 2.4, 2.2], mosaic: [11, 12, 12] },
  6: { embryos: 214, groups: [[60, 55, 57], [46, 45, 47], [30, 31, 33], [17, 19, 20], [7, 9, 9]], noResult: [2.8, 2.4, 2.3], mosaic: [10, 12, 12] },
  3: { embryos: 103, groups: [[61, 56, 57], [48, 45, 46], [31, 31, 32], [19, 19, 21], [9, 9, 10]], noResult: [1.9, 2.3, 2.2], mosaic: [12, 12, 11] },
};
export const PGT_AGES = ['до 35 лет', '35–37 лет', '38–40 лет', '41–42 года', 'старше 42 лет'];
