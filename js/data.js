// DEMO DATA. Every name, price, code, phone and barcode here is invented for the prototype,
// except the public Геномед client-service phone. Preanalytics texts are placeholders:
// replace them from the lab's current instructions before showing to partners.
import { addDays, addWorkdays, orderTubeGroups, tubeBarcodes } from './logic.js';

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
    name: 'Пробирка с гепарином (зелёная крышка), 4 мл',
    short: 'Гепарин, 4 мл',
    label: 'Кровь, гепарин',
    color: '#2E8B57',
  },
  buccal: {
    name: 'Зонд-щёточка для буккального эпителия',
    short: 'Буккальный зонд',
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

// Codes and turnaround times marked (real) are from the current ЛКП; other codes, every price and
// the promo terms are invented for the demo.
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
    name: 'НИПТ расширенная панель: трисомии 13, 18, 21, X/Y и микроделеции',
    cat: 0,
    bm: [{ tube: 'streck', qty: 1, pool: 'nipt' }],
    tat: 8,
    price: 24900,
    needs: ['pregnancy'],
    adds: ['1681'],
    popular: 1,
    aka: ['nipt', 'нипт'],
  },
  {
    code: '1438',
    short: 'НИПТ стандартный',
    name: 'НИПТ стандартная панель: трисомии 13, 18, 21',
    cat: 0,
    bm: [{ tube: 'streck', qty: 1, pool: 'nipt' }],
    tat: 8,
    price: 14900,
    needs: ['pregnancy'],
    popular: 4,
    aka: ['nipt', 'нипт'],
  },
  {
    code: '1105',
    short: 'Panorama',
    name: 'Panorama: НИПТ с панелью микроделеций',
    cat: 0,
    bm: [{ tube: 'streck', qty: 2, pool: 'panorama' }],
    tat: 10,
    price: 39900,
    needs: ['pregnancy'],
    ids: 'panorama',
    popular: 6,
    aka: ['панорама', 'nipt', 'нипт'],
  },
  {
    code: '1681',
    short: 'Скрининг «Базовый»',
    name: 'Скрининг на наследственные заболевания «Базовый»',
    cat: 3,
    bm: [EDTA('ngs')],
    tat: 20,
    price: 9900,
    popular: 12,
  },
  {
    code: '0402',
    short: 'Тромбофилия, 12 полиморфизмов',
    name: 'Анализ генетических полиморфизмов, ассоциированных с риском тромбообразования',
    cat: 2,
    bm: [EDTA('pcr')],
    tat: 10,
    price: 6200,
    popular: 2,
    genes: ['F2', 'F5', 'F7', 'F13A1', 'FGB', 'ITGA2', 'ITGB3', 'SERPINE1', 'MTHFR', 'MTR', 'MTRR'],
    aka: ['тромбофилия'],
  },
  {
    code: '0002',
    short: 'Фолатный цикл',
    name: 'Анализ полиморфизмов в генах фолатного цикла',
    cat: 2,
    bm: [EDTA('pcr')],
    tat: 5,
    price: 2900,
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
    price: 4900,
    popular: 9,
  },
  {
    code: '0420',
    short: 'Микроделеции Y-хромосомы (AZF)',
    name: 'Микроделеции Y-хромосомы: локусы AZFa, AZFb, AZFc',
    cat: 2,
    bm: [EDTA('pcr')],
    tat: 7,
    price: 3500,
    sex: 'm',
    popular: 14,
    aka: ['azf'],
  },
  {
    code: '0005',
    short: 'BRCA1/2: 8 частых мутаций',
    name: 'Определение 8 частых мутаций в генах BRCA1 и BRCA2',
    cat: 1,
    bm: [EDTA('pcr'), BUCCAL('pcr')],
    tat: 5,
    price: 3800,
    popular: 5,
    genes: ['BRCA1', 'BRCA2'],
  },
  {
    code: '0730',
    short: 'BRCA1/2: секвенирование',
    name: 'BRCA1 и BRCA2: полное секвенирование генов (NGS)',
    cat: 1,
    bm: [EDTA('ngs')],
    tat: 21,
    price: 19900,
    needs: ['phenotype'],
    rawData: true,
    popular: 10,
    genes: ['BRCA1', 'BRCA2'],
  },
  {
    code: '0721',
    short: 'Мутации EGFR',
    name: 'Определение мутаций в гене EGFR',
    cat: 1,
    bm: [{ tube: 'paraffin', qty: 1, pool: 'onco' }],
    tat: 10,
    price: 12500,
    needs: ['histology'],
    popular: 8,
    genes: ['EGFR'],
  },
  {
    code: '0722',
    short: 'Мутации KRAS, NRAS',
    name: 'Определение мутаций в генах KRAS и NRAS',
    cat: 1,
    bm: [{ tube: 'paraffin', qty: 1, pool: 'onco' }],
    tat: 10,
    price: 14500,
    needs: ['histology'],
    popular: 11,
    genes: ['KRAS', 'NRAS'],
  },
  {
    code: '0006',
    short: 'Фармакогенетика варфарина',
    name: 'Фармакогенетика варфарина',
    cat: 4,
    bm: [EDTA('pcr'), BUCCAL('pcr')],
    tat: 7,
    price: 2900,
    popular: 7,
    genes: ['CYP2C9', 'VKORC1'],
  },
  {
    code: '0905',
    short: 'Фармакогенетика клопидогрела',
    name: 'Фармакогенетика клопидогрела',
    cat: 4,
    bm: [EDTA('pcr'), BUCCAL('pcr')],
    tat: 7,
    price: 2400,
    popular: 13,
    genes: ['CYP2C19'],
  },
  {
    code: '0910',
    short: 'Лактазная недостаточность',
    name: 'Генетический тест на лактазную недостаточность взрослого типа',
    cat: 3,
    bm: [EDTA('pcr')],
    tat: 5,
    price: 1900,
    popular: 15,
    genes: ['MCM6'],
    aka: ['лактоза'],
  },
  {
    code: '0023',
    short: 'HLA II класса',
    name: 'Типирование по трём генам HLA II класса',
    cat: 2,
    bm: [EDTA('pcr')],
    tat: 5,
    price: 5400,
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
    price: 4200,
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
    price: 54000,
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
    bm: [EDTA('ngs', 2)],
    tat: 90,
    price: 89000,
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
    price: 24000,
    needs: ['phenotype'],
    popular: 19,
    aka: ['хма'],
  },
  {
    code: '0020',
    short: 'Установление отцовства',
    name: 'Установление отцовства (отец / ребёнок)',
    cat: 6,
    bm: [BUCCAL('id'), EDTA('id')],
    tat: 7,
    price: 14900,
    mainRole: 'Предполагаемый отец',
    participants: ['Ребёнок'],
    popular: 21,
    aka: ['отцовство', 'родство', 'днк тест'],
  },
];

// Add-on service (real code from the current ЛКП): ordered from a finished sequencing order, not from the catalog.
export const RAW_DATA = {
  code: '1139',
  short: 'Выдача сырых данных',
  name: 'Выдача сырых данных секвенирования (FASTQ, BAM, VCF)',
  price: 3000,
  tat: 3,
  bm: [],
};

// Placeholder preanalytics per tube (to be replaced from the lab's current instructions).
export const PREANALYTICS = {
  streck: {
    take: 'Венозная кровь в пробирку Streck, заполнить до метки. Сразу аккуратно перевернуть 8–10 раз.',
    keep: 'Хранить при комнатной температуре. Не замораживать и не охлаждать.',
    send: 'Передать курьеру в день забора или по графику, указанному в инструкции к пробирке.',
  },
  edta: {
    take: 'Венозная кровь в пробирку с ЭДТА, заполнить до метки, перевернуть 8–10 раз.',
    keep: 'Хранить в холодильнике при +2…+8 °C. Не замораживать.',
    send: 'Передать курьеру в термоконтейнере с хладоэлементами.',
  },
  heparin: {
    take: 'Венозная кровь в пробирку с гепарином, перевернуть 8–10 раз.',
    keep: 'Хранить при комнатной температуре. Не замораживать и не охлаждать.',
    send: 'Передать курьеру в день забора.',
  },
  buccal: {
    take: 'За час до забора не есть и не пить. Провести зондом по внутренней стороне щеки 10–15 раз.',
    keep: 'Подсушить зонд на воздухе, вложить в конверт или пробирку.',
    send: 'Передать курьеру при комнатной температуре.',
  },
  paraffin: {
    take: 'Парафиновый блок с опухолью и копия гистологического заключения.',
    keep: 'Хранить при комнатной температуре, вдали от нагрева.',
    send: 'Упаковать блок в подписанный пакет, заключение положить в отдельный файл.',
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

export const LIBRARY = [
  {
    id: 'l1',
    type: 'Бланки направлений',
    title: 'Направление: НИПТ',
    format: 'PDF, заполняемый',
    size: '220 КБ',
    updatedDays: 6,
    badge: 'updated',
    downloads: 412,
  },
  {
    id: 'l2',
    type: 'Бланки направлений',
    title: 'Направление: генетическая предрасположенность',
    format: 'PDF, заполняемый',
    size: '240 КБ',
    updatedDays: 40,
    downloads: 230,
  },
  {
    id: 'l3',
    type: 'Бланки направлений',
    title: 'Направление: онкогенетика',
    format: 'PDF, заполняемый',
    size: '260 КБ',
    updatedDays: 75,
    downloads: 120,
  },
  {
    id: 'l4',
    type: 'Документы',
    title: 'Информированное согласие: Panorama',
    format: 'PDF, A4',
    size: '180 КБ',
    updatedDays: 12,
    downloads: 310,
  },
  {
    id: 'l5',
    type: 'Документы',
    title: 'Информированное согласие на генетическое исследование',
    format: 'PDF, A4',
    size: '170 КБ',
    updatedDays: 90,
    downloads: 365,
  },
  {
    id: 'l6',
    type: 'Документы',
    title: 'Прайс-лист партнёра',
    format: 'XLSX',
    size: '64 КБ',
    updatedDays: 16,
    downloads: 290,
  },
  {
    id: 'l7',
    type: 'Брошюры для пациентов',
    title: 'Брошюра НИПТ',
    format: 'PDF, 296 × 210',
    size: '3,1 МБ',
    updatedDays: 30,
    downloads: 150,
  },
  {
    id: 'l8',
    type: 'Брошюры для пациентов',
    title: 'Брошюра ПГТ-А',
    format: 'PDF, 296 × 210',
    size: '2,8 МБ',
    updatedDays: 52,
    downloads: 88,
  },
  {
    id: 'l9',
    type: 'Брошюры для пациентов',
    title: 'Гистология и ИГХ',
    format: 'PDF, 296 × 210',
    size: '2,2 МБ',
    updatedDays: 3,
    badge: 'new',
    downloads: 21,
  },
  {
    id: 'l10',
    type: 'Памятки',
    title: 'Хранение и транспортировка биоматериала',
    format: 'PDF, A4',
    size: '410 КБ',
    updatedDays: 20,
    downloads: 205,
  },
  {
    id: 'l11',
    type: 'Памятки',
    title: 'Как подготовить пациента к забору буккального эпителия',
    format: 'PDF, A4',
    size: '300 КБ',
    updatedDays: 110,
    downloads: 64,
  },
  {
    id: 'l12',
    type: 'Презентации',
    title: 'Геномед для акушеров-гинекологов',
    format: 'PPTX, 24 слайда',
    size: '8,4 МБ',
    updatedDays: 33,
    downloads: 47,
  },
  {
    id: 'l13',
    type: 'Видео и вебинары',
    title: 'Вебинар: НИПТ в 2026 году',
    format: 'Видео, 52 мин',
    size: '',
    updatedDays: 9,
    badge: 'new',
    downloads: 96,
  },
  {
    id: 'l14',
    type: 'Логотипы и баннеры',
    title: 'Логотип Геномед и баннеры для сайта клиники',
    format: 'ZIP: SVG, PNG',
    size: '5,6 МБ',
    updatedDays: 140,
    downloads: 33,
  },
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
  [10252, 0, 16, ['1105'], 'saved', 'lkp', { clinical: N(12, 3, 61, 168) }],
  [10251, 0, 17, ['0006'], 'draft', 'lkp', {}],
  [10250, 1, 18, ['0402', '0002'], 'saved', 'lkp', {}],
  [10249, 1, 19, ['0005'], 'courier', 'lkp', { bm: { '0005': 'buccal' } }],
  [10248, 2, 0, ['1724', '1681'], 'lab', 'lkp', { clinical: N(11, 2, 58, 164) }],
  [10247, 4, 1, ['0402'], 'done', 'lkp', { ready: [0], seen: false }],
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
  [10238, 7, 4, ['0002', '0910'], 'done', 'lkp', { ready: [0, 1], seen: false }],
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
    ['0721', '0722'],
    'courier',
    'lkp',
    { clinical: { block: '24-11873/2', diagnosis: 'Аденокарцинома лёгкого' } },
  ],
  [10230, 9, 7, ['1438'], 'done', 'lkp', { ready: [0], seen: false, clinical: N(12, 1, 66, 172) }],
  [10229, 10, 8, ['1724', '1681'], 'partial', 'paper', { ready: [0], seen: true, clinical: N(10, 5, 59, 160, 'yes') }],
  [10227, 11, 9, ['0006', '0905'], 'partial', 'lkp', { ready: [0], seen: false }],
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
    ['0730'],
    'done',
    'paper',
    { ready: [0], seen: true, clinical: { phenotype: 'Рак молочной железы у матери в 42 года.' } },
  ],
  [10219, 14, 13, ['0402'], 'cancelled', 'lkp', {}],
  [10216, 18, 14, ['0005', '0006'], 'done', 'lkp', { ready: [0, 1], seen: true }],
  [10214, 19, 22, ['1724', '1681'], 'done', 'lkp', { ready: [0, 1], seen: true, clinical: N(11, 0, 62, 165) }],
  [10211, 20, 23, ['0420'], 'done', 'paper', { ready: [0], seen: true }],
  [10209, 21, 0, ['0002'], 'done', 'lkp', { ready: [0], seen: true }],
  [10205, 23, 7, ['0402', '0002'], 'done', 'lkp', { ready: [0, 1], seen: true }],
  [10202, 24, 18, ['0023'], 'done', 'lkp', { ready: [0], seen: true }],
  [10198, 27, 19, ['0197'], 'done', 'paper', { ready: [0], seen: true }],
  [
    10195,
    41,
    15,
    ['0730'],
    'done',
    'lkp',
    { ready: [0], seen: true, clinical: { phenotype: 'Рак яичников у сестры.' } },
  ],
  [10190, 30, 21, ['0910'], 'done', 'lkp', { ready: [0], seen: true }],
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
  [10176, 36, 9, ['0905'], 'done', 'lkp', { ready: [0], seen: true }],
  [
    10171,
    38,
    11,
    ['0020'],
    'done',
    'paper',
    {
      ready: [0],
      seen: true,
      participants: [
        {
          role: 'Ребёнок',
          forCode: '0020',
          last: 'Григорьев',
          first: 'Матвей',
          middle: 'Ильич',
          dob: '2021-04-14',
          sex: 'm',
        },
      ],
    },
  ],
  [10166, 40, 4, ['0402'], 'done', 'lkp', { ready: [0], seen: true }],
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
        text: 'Обновлён бланк «Направление: НИПТ». Старую версию лаборатория принимает до конца месяца',
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
        codes: ['0006', '0905'],
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
        { name: 'Сергей Гусев', role: 'Администратор', access: 'Все разделы, сверка' },
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
