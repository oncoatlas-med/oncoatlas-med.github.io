const DATA=window.ONCO_CARDS||[];
const $=s=>document.querySelector(s);const allNodes=s=>[...document.querySelectorAll(s)];
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const state={page:'home',card:null,stage:'I',group:'Все',treatmentTab:'drugs'};
const groups=['Все',...new Set(DATA.map(c=>c.group))];
const sources=[['NCCN','https://www.nccn.org/guidelines/category_1'],['ESMO','https://www.esmo.org/guidelines'],['ASCO','https://www.asco.org/practice-patients/guidelines'],['Минздрав РФ','https://cr.minzdrav.gov.ru/'],['NCI PDQ','https://www.cancer.gov/publications/pdq'],['МКБ‑10 ВОЗ','https://icd.who.int/browse10/2019/en'],['UICC TNM','https://www.uicc.org/resources/tnm']];
function view(page, id) {
  const hash = '#' + page + (id ? '/' + id : '');
  if (location.hash !== hash) location.hash = hash;
  else window.scrollTo(0, 0);
}

function start() {
  let path = '';
  try { path = decodeURIComponent(location.hash.slice(1)); } catch { /* Invalid deep link. */ }
  const [page, id, section, key] = path.split('/');
  const pages = ['home', 'catalog', 'card', 'tnm', 'calculators', 'scales', 'markers', 'regimens', 'surgery', 'sources', 'favorites', 'about', 'admin'];
  state.page = pages.includes(page) ? page : 'home';
  if (state.page === 'card' && state.card !== id) {
    state.stage = (CARD_STAGES[id] ?? STAGES)[0];
    state.treatmentTab = 'drugs';
  }
  state.card = state.page === 'card' ? id : null;
  state.surgerySection = state.page === 'surgery' ? id : undefined;
  state.surgeryOrigin = state.page === 'surgery' ? section : undefined;
  state.surgeryStage = state.page === 'surgery' ? key : undefined;
  state.regimenSection = state.page === 'regimens' ? id : undefined;
  state.staging = state.page === 'tnm' ? id : undefined;
  state.marker = state.page === 'markers' && /^\d+$/.test(id ?? '') ? Number(id) : -1;
  let target;
  if (state.page === 'regimens' && id === 'complications') state.complication = section;
  if (['calculators', 'scales'].includes(state.page) && /^[a-z0-9-]+$/.test(id ?? '')) target = '#' + state.page + '-' + id;
  if (state.page === 'card' && DATA.some(card => card.id === id)) {
    if (section === 'molecular') target = '#molecular';
    else if (section === 'staging') target = '#card-staging';
    else if ((CARD_STAGES[id] ?? STAGES).includes(section)) {
      state.stage = section;
      state.treatmentTab = key === 'surgery' ? 'surgery' : 'drugs';
      if (regimensFor(id, section).some(protocol => regimenKey(protocol) === key)) target = '#regimen-' + key;
    }
  }
  render();
  const detail = target ? $(target) : null;
  if (detail) {
    detail.focus({preventScroll: true});
    detail.scrollIntoView({block: 'start'});
  } else window.scrollTo(0, 0);
}
window.addEventListener('hashchange',start);
const btn=(label,fn,kind='')=>`<button class="btn ${kind}" onclick="${fn}">${label}</button>`;
function shell(title,body,back='home'){return `<button class="back" onclick="view('${back}')">← ${back==='home'?'Главная':'Каталог'}</button><h1>${title}</h1>${body}`}
const TILE_ICONS = {
  catalog: '<path d="M9 3.8c2-1.5 4.5-1.2 6.2.5 1.4 1.4 3.8.7 4.8 2.5 1 1.8-.4 3.3.6 5.2 1.2 2.4-.1 5.5-2.8 6.1-2.2.5-2.9 2.7-5.4 2.6-2.1-.1-3.1-1.7-5.4-1.7-2.6 0-4.2-2.4-3.6-4.8.5-2-1.2-3.6.4-5.6C5 7.2 7.2 7.4 9 3.8Z"/><circle cx="11.5" cy="8.8" r="1.15"/><circle cx="8.3" cy="14.6" r="1.3"/><circle cx="15.2" cy="13.8" r="1.15"/>',
  tnm: '<path d="M12 22V3m-2 2 2-2 2 2M5 6v3.5c0 4 3 5.5 7 5.5s7-1.5 7-5.5V6M3 8l2-2 2 2m10 0 2-2 2 2"/>',
  calculators: '<path d="m7 13-2-1 5-8 3 2-2 3m-1-5 1-2 3 2-1 2M5 12l-1 2 2 1 1-2m7-2c4 2 5 6 2 9m-3-7c2 1 3 4 1 6M3 17h7m-4 0 2 3m9 0H8a3 3 0 0 0-3 3h15a3 3 0 0 0-3-3Z"/><circle cx="12" cy="11" r="2"/>',
  markers: '<path d="m6.5 15.5 3.8-4m3.4 0 3.8 4"/><circle cx="12" cy="9.5" r="2.6"/><circle cx="4.7" cy="17.3" r="2.5"/><circle cx="19.3" cy="17.3" r="2.5"/>',
  scales: '<path d="M6 4H5c-1 0-2 1-2 2.5C3 12 5.5 15 9 15s6-3 6-8.5C15 5 14 4 13 4h-1m-3 11v2a5 5 0 0 0 10 0v-2"/><circle cx="19" cy="12.5" r="2.5"/>',
  surgery: '<path transform="translate(12 12) scale(1.1) translate(-12 -12)" vector-effect="non-scaling-stroke" d="M9.2 14.1C8.8 13.8 8.9 13.3 9.3 12.8L17.7 3a1.6 1.6 0 0 1 2.5 2L12 14.5c-.6.7-1.2.9-1.7.5l-1.1-.9Zm0 0C7.2 16.6 4.9 19.2 3.5 21.5c2.9-.6 6.1-2.7 6.5-4.6.1-.8.3-1.4.7-1.8m3-5.2 3.9-4.6"/>',
  regimens: '<path d="M9 3h6m-5 0v6L4.4 18.3A1.8 1.8 0 0 0 6 21h12a1.8 1.8 0 0 0 1.6-2.7L14 9V3M7 14h10"/>',
  sources: '<path d="M12 6C9.5 4 6 3.5 2.5 4.5V19c3.5-1 7-.5 9.5 1.5 2.5-2 6-2.5 9.5-1.5V4.5C18 3.5 14.5 4 12 6Zm0 0v14.5"/>',
};

function tileIcon(page) {
  return `<svg class="tile-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${TILE_ICONS[page]}</svg>`;
}

function home(){const tiles=[['Карточки ЗНО',`${DATA.length} нозологий: гистология, диагностика, лечение`,'catalog'],['TNM-справочник','Краткие критерии и версии классификаций','tnm'],['Калькуляторы','BSA, Calvert, CKD-EPI 2021, RECIST','calculators'],['Онкомаркеры','Показания и ограничения','markers'],['Шкалы','ECOG, Khorana, Child–Pugh, IMDC','scales'],['Источники','Рекомендации, журналы и базы исследований','sources'],['Схемы лечения','Лекарственные схемы и осложнения терапии','regimens'],['Хирургические алгоритмы','Основы онкохирургии и тактика по нозологиям','surgery']];return `<div class="intro"><h1>ОнкоАтлас</h1><p class="muted">Краткий клинический справочник по онкологии. Свободный доступ, без регистрации.</p></div><input class="search" aria-label="Поиск по справочнику" placeholder="Опухоль, схема, маркер, осложнение…" oninput="searchHome(this.value)"><div id="quickSearch" aria-live="polite"></div><div class="tiles">${tiles.map(([n,d,p])=>`<button class="tile" onclick="view('${p}')">${tileIcon(p)}<h3>${n}</h3><p>${d}</p></button>`).join('')}</div><div class="notice">Медицинский контент — справочная редакция, <b>не прошедшая независимую клиническую экспертизу</b>. Для назначения терапии используйте актуальные руководства и инструкции. Данные пациентов на сайт не вводите.</div>`}
const SEARCH_LIBRARY = [
  ['Фундаментальный канцерогенез · триггер и фиксация мутаций', './carcinogenesis.html#damage', 'повреждение ДНК репликация репарация кодон кодоны рамка считывания'],
  ['Фундаментальный канцерогенез · драйверы, аберрации и эпигенетика', './carcinogenesis.html#drivers', 'MSI dMMR микросателлитная нестабильность MLH1 драйвер хромосомные аберрации хромотрипсис эпигенетическая перестройка хроматин метилирование'],
  ['Фундаментальный канцерогенез · клональная эволюция', './carcinogenesis.html#evolution', 'субклон гетерогенность TRACERx hallmarks'],
  ['Фундаментальный канцерогенез · инвазия и диссеминация', './carcinogenesis.html#invasion', 'интравазация выход из кровотока EMT'],
  ['Фундаментальный канцерогенез · метастатическая колонизация', './carcinogenesis.html#metastasis', 'метастазы органотропность покой ниша'],
  ['Гены-супрессоры опухолей', './carcinogenesis.html#suppressors', 'RB1 TP53 CDKN2A инактивация потеря аллеля'],
  ['Онкогены', './carcinogenesis.html#oncogenes', 'KRAS ERBB2 BCR ABL1 активация протоонкогены'],
  ['Девять признаков злокачественности', './carcinogenesis.html#hallmarks', 'hallmarks Hanahan теломеры ангиогенез пластичность'],
  ['Библиотека знаний', './learning-library.html', 'схемы и классификации'],
  ['Гистогенез и гистотипы', './learning-library.html#topic-1', 'карциномы классификация ЗНО'],
  ['Группы противоопухолевых препаратов', './learning-library.html#topic-2', 'цитотоксическая эндокринная терапия'],
  ['Молекулярные подтипы и биомаркеры', './learning-library.html#topic-3', 'биология опухоли'],
  ['Молекулярные мишени и препараты', './learning-library.html#topic-4', 'таргетная терапия'],
  ['Иммунотерапия: основные подходы', './learning-library.html#topic-5', 'иммуноонкология'],
  ['Ключевые признаки опухолей', './learning-library.html#topic-6', 'hallmarks of cancer'],
  ['Сигнальные пути канцерогенеза', './learning-library.html#topic-7', 'MAPK WNT PI3K внутриклеточные каскады'],
  ['RECIST 1.1: основы', './learning-library.html#topic-8', 'оценка ответа на лечение'],
];

const IMAGING_RADS = [
  {
    id: 'bi-rads', title: 'BI-RADS', organ: 'Молочная железа', version: 'ACR BI-RADS v2025',
    aliases: 'birads birad бирадс би радс mammography РМЖ маммография УЗИ МРТ CEM',
    cards: ['c004'],
    use: 'Стандартизированная оценка исследования молочной железы. Категория относится к результату визуализации. Тактику определяют с учётом клиники и согласованности визуализации с морфологией.',
    groups: [
      ['Признаки по методу', [
        ['Маммография и томосинтез', 'Описывают образования, кальцинаты, асимметрию и архитектурную деформацию. Для кальцинатов важны морфология и распределение.'],
        ['УЗИ', 'Оценивают форму, ориентацию, края, эхогенность, задние акустические эффекты и сопутствующие признаки.'],
        ['МРТ', 'Описывают морфологию и характер контрастирования: объёмное или немассовое усиление, а также динамику усиления по показаниям.'],
        ['Контрастная маммография (CEM)', 'Используют лексикон CEM для низкоэнергетических и рекомбинированных изображений.'],
      ]],
      ['Категории и дальнейшие действия', [
        ['0', 'Оценка не завершена. Нужны дополнительные изображения и/или сравнение с предыдущими исследованиями.'],
        ['1–2', 'Отрицательное исследование или доброкачественная находка. Плановый скрининг по возрасту и риску.'],
        ['3', 'Вероятно доброкачественная находка, риск злокачественности ≤2%. Краткосрочный контроль по протоколу соответствующего метода, часто через 6 месяцев.'],
        ['4', 'Подозрительная находка. Рекомендуется морфологическая верификация. В маммографии подкатегории 4A, 4B и 4C соответствуют диапазонам >2–10%, >10–50% и >50–<95%. Для остальных методов используйте их лексиконы.'],
        ['5', 'Вероятность злокачественности ≥95%. Требуется морфологическая верификация и оценка согласованности результатов.'],
        ['6', 'Злокачественность уже подтверждена биопсией. Дальнейшие действия определяет онкологическая тактика.'],
      ]],
    ],
    sources: [['ACR · руководство и отдельные лексиконы v2025', 'https://www.acr.org/Clinical-Resources/Clinical-Tools-and-Reference/Reporting-and-Data-Systems/BI-RADS']],
  },
  {
    id: 'ti-rads', title: 'TI-RADS', organ: 'Щитовидная железа', version: 'ACR TI-RADS',
    aliases: 'тирэдс тирадс тир адс tirads узел щитовидной железы УЗИ ТАБ',
    cards: ['c020', 'c021'],
    use: 'Балльная система для УЗИ узлов щитовидной железы до морфологической верификации. Пороги ниже относятся к ACR TI-RADS. Подозрительные шейные лимфоузлы оценивают отдельно.',
    groups: [
      ['УЗ-признаки, по которым начисляют баллы', [
        ['Состав', 'Кистозный или спонгиформный — 0; смешанный — 1; солидный или почти солидный — 2. Для типичных кистозных и спонгиформных узлов учитывайте правила остановки из атласа ACR.'],
        ['Эхогенность', 'Анэхогенный — 0; гипер- или изоэхогенный — 1; гипоэхогенный — 2; очень гипоэхогенный — 3.'],
        ['Форма', 'Выше, чем шире в поперечной плоскости — 3; иначе — 0.'],
        ['Контур', 'Ровный или нечёткий — 0; дольчатый/неровный — 2; экстратиреоидное распространение — 3.'],
        ['Эхогенные включения', 'Нет или крупный артефакт «хвост кометы» — 0; макрокальцинаты — 1; периферические кальцинаты — 2; точечные включения — 3. При сочетании учитывают все применимые типы.'],
      ]],
      ['Категории и пороги', [
        ['TR1 · 0 баллов; TR2 · 2 балла', 'Плановые ТАБ и УЗ-наблюдение по ACR TI-RADS не показаны.'],
        ['TR3 · 3 балла', 'УЗ-контроль при размере ≥1,5 см; ТАБ при ≥2,5 см.'],
        ['TR4 · 4–6 баллов', 'УЗ-контроль при размере ≥1,0 см; ТАБ при ≥1,5 см.'],
        ['TR5 · ≥7 баллов', 'УЗ-контроль при размере ≥0,5 см; ТАБ при ≥1,0 см.'],
      ]],
    ],
    sources: [['ACR · официальная таблица баллов и порогов', 'https://cs.acr.org/-/media/ACR/Files/RADS/TI-RADS/TI-RADS-Alternative-chart.pdf'], ['ACR · атлас УЗ-признаков', 'https://www.acr.org/-/media/ACR/Files/RADS/TI-RADS/ACR-TI-RADS-Atlas.pdf']],
  },
  {
    id: 'pi-rads', title: 'PI-RADS', organ: 'Предстательная железа', version: 'PI-RADS v2.1',
    aliases: 'пирадс пи радс pirads простата МРТ PSA ПСА',
    cards: ['c013'],
    use: 'Оценка вероятности клинически значимого рака простаты на МРТ. Решение о биопсии дополнительно учитывает плотность ПСА, семейный анамнез, предшествующие биопсии и клинический риск.',
    groups: [
      ['Как выбирают категорию', [
        ['Периферическая зона', 'Ведущая последовательность DWI/ADC. При оценке DWI 3 положительное раннее фокальное усиление на DCE переводит соответствующий очаг в PI-RADS 4.'],
        ['Переходная зона', 'Ведущая последовательность T2. DWI может изменить итоговую оценку в отдельных сочетаниях, предусмотренных матрицей v2.1.'],
      ]],
      ['Категории и дальнейшие действия', [
        ['1–2', 'Очень низкая или низкая вероятность клинически значимого рака. При сохраняющемся клиническом подозрении оценить необходимость биопсии.'],
        ['3', 'Неопределённая вероятность. Выбор между наблюдением и биопсией зависит от плотности ПСА и совокупного риска.'],
        ['4–5', 'Высокая или очень высокая вероятность. Обсудить прицельную биопсию и показания к дополнительному забору материала по руководству.'],
      ]],
    ],
    sources: [['ACR · PI-RADS v2.1 и матрицы по зонам', 'https://www.acr.org/-/media/ACR/Files/RADS/Pi-RADS/PIRADS-V2-1.pdf'], ['EAU · МРТ и решения о биопсии', 'https://uroweb.org/guidelines/prostatecancer/chapter/diagnostic-evaluation']],
  },
  {
    id: 'li-rads', title: 'LI-RADS', organ: 'Печень', version: 'ACR · отдельные редакции по задачам',
    aliases: 'лирадс ли радс lirads печень ГЦР цирроз гепатоцеллюлярная КТ МРТ CEUS',
    cards: ['c009'],
    use: 'Для определённых групп пациентов с высоким риском ГЦР. Перед присвоением категории проверьте критерии применимости выбранной ветки, в частности вид фонового заболевания и задачу исследования.',
    groups: [
      ['УЗ-наблюдение · v2024', [
        ['US-1', 'Отрицательное наблюдение. При достаточной визуализации стандартный интервал обычно 6 месяцев.'],
        ['US-2', 'Очаг <10 мм без уверенных доброкачественных признаков. При VIS-A/B повторное УЗИ через 3–6 месяцев по алгоритму.'],
        ['US-3', 'Подозрительный очаг ≥10 мм либо новый тромб воротной или печёночной вены. Показана диагностическая контрастная визуализация.'],
        ['VIS и АФП', 'VIS оценивает качество визуализации отдельно. При VIS-C, повышении АФП или новой динамике применять соответствующую ветку алгоритма, включая возможный переход к КТ/МРТ.'],
      ]],
      ['Диагностика нелеченых очагов · КТ/МРТ v2018', [
        ['Основные признаки', 'Размер, неободковое артериальное гиперусиление, непериферическое вымывание, усиливающаяся капсула и пороговый рост. Итог определяют по матрице комбинаций.'],
        ['LR-1 / LR-2', 'Достоверно или вероятно доброкачественный очаг. Продолжить наблюдение по индивидуальному риску.'],
        ['LR-3 / LR-4', 'Промежуточная вероятность или вероятный ГЦР. Требуются оценка динамики и обсуждение повторной визуализации либо биопсии по категории и клинической задаче.'],
        ['LR-5', 'Визуализационные критерии достоверного ГЦР при формальном выполнении требований у пациента из целевой группы. Направить на определение стадии и лечебной тактики.'],
        ['LR-M / LR-TIV / LR-NC', 'LR-M — вероятная или достоверная злокачественная опухоль, неспецифичная для ГЦР; рассмотреть морфологическую верификацию. LR-TIV — опухоль в вене, гистотип уточняют отдельно. LR-NC — исследование не позволяет присвоить категорию.'],
      ]],
      ['После лечения · CT/MRI TRA v2024', [
        ['Нелучевое лечение', 'Отдельно оцениваются жизнеспособная, нежизнеспособная, сомнительная и не поддающаяся оценке опухоль. Основу оценки составляет характер усиления в зоне лечения.'],
        ['Лучевое лечение', 'Используйте отдельный Radiation TRA. Сохраняющееся усиление без роста может соответствовать LR-TR Nonprogressing. Динамику определяют по последовательным исследованиям.'],
        ['Контрастное УЗИ', 'CEUS использует собственный диагностический протокол и отдельную ветку ответа после нелучевого лечения. Проверяйте редакцию на странице ACR.'],
      ]],
    ],
    sources: [['ACR · версии и алгоритмы LI-RADS', 'https://www.acr.org/Clinical-Resources/Clinical-Tools-and-Reference/Reporting-and-Data-Systems/LI-RADS'], ['ACR · УЗ-наблюдение v2024', 'https://www.acr.org/-/media/ACR/Files/RADS/LI-RADS/LI-RADS-US-Surveillance-v2024-Core.pdf'], ['ACR · КТ/МРТ v2018', 'https://www.acr.org/-/media/ACR/Files/RADS/LI-RADS/LI-RADS-2018-Core.pdf']],
  },
  {
    id: 'lung-rads', title: 'Lung-RADS', organ: 'Лёгкие', version: 'ACR Lung-RADS v2022',
    aliases: 'ланградс lungrads lung rads ндкт низкодозная кт скрининг рак легкого легочный узел',
    cards: ['c001', 'c002', 'c003', 'c083'],
    cardNote: 'Применяется к НДКТ в рамках скрининга.',
    use: 'Категоризация находок на низкодозной КТ в программе скрининга. Для случайно выявленных узлов вне скрининга применяются другие рекомендации. Пороги ниже приведены для солидного узла на первом скрининге и не охватывают новые, растущие, субсолидные или эндобронхиальные узлы.',
    groups: [['Категории и дальнейшие действия', [
      ['0', 'Оценка незавершена. Получить сравнение или дополнительные изображения. При вероятном инфекционно-воспалительном процессе может потребоваться НДКТ через 1–3 месяца.'],
      ['1–2', 'Отрицательное исследование либо доброкачественные находки. Например, исходный солидный узел <6 мм — категория 2 при отсутствии признаков, меняющих оценку. Обычно продолжить ежегодный скрининг.'],
      ['3', 'Вероятно доброкачественная находка, например исходный солидный узел 6–<8 мм. Обычно НДКТ через 6 месяцев.'],
      ['4A', 'Подозрительная находка, например исходный солидный узел 8–<15 мм. НДКТ через 3 месяца; ПЭТ/КТ можно обсудить при солидном компоненте ≥8 мм.'],
      ['4B / 4X', '4B — очень подозрительная находка, например исходный солидный узел ≥15 мм. 4X — очаг категории 3 или 4 с дополнительными подозрительными признаками. Дальнейшая диагностика по изображению, риску и клинической ситуации.'],
    ]]],
    sources: [['ACR · полная таблица Lung-RADS v2022', 'https://www.acr.org/-/media/ACR/Files/RADS/Lung-RADS/Lung-RADS-2022.pdf']],
  },
  {
    id: 'o-rads', title: 'O-RADS', organ: 'Яичники и придатки', version: 'УЗИ v2022 и отдельная шкала МРТ ACR',
    aliases: 'орадс о радс orads яичники придатки УЗИ МРТ IOTA',
    cards: ['c016', 'c042', 'c043'],
    use: 'Оценка риска злокачественности при образованиях яичников и придатков. УЗИ — первичная оценка. МРТ используют для уточнения по показаниям. При острой симптоматике или высоком наследственном риске маршрутизацию определяют отдельно.',
    groups: [
      ['УЗИ · O-RADS US v2022', [
        ['Признаки', 'Строение образования, число камер, контуры стенок и перегородок, солидные части, папиллярные структуры, кровоток по допплеру, асцит и перитонеальные узлы.'],
        ['0 / 1', 'Технически неполное исследование или нормальная картина соответственно. При 0 — повторная либо дополнительная визуализация по ситуации.'],
        ['2 · <1%; 3 · 1–<10%', 'Почти достоверно доброкачественная находка или низкий риск. Интервал наблюдения и необходимость экспертного УЗИ/МРТ зависят от морфологии, размера и менопаузального статуса.'],
        ['4 · 10–<50%; 5 · ≥50%', 'Промежуточный или высокий риск. При 4 требуется консультация гинеколога с привлечением онкогинеколога по алгоритму; при 5 — направление к онкогинекологу.'],
      ]],
      ['МРТ · O-RADS MRI', [
        ['Признаки', 'Оценивают содержимое, наличие усиливающейся солидной ткани, её сигнальные характеристики и динамику усиления. Перитонеальные импланты влияют на категорию.'],
        ['0 / 1 / 2', 'Неполная оценка, отсутствие образования или почти достоверно доброкачественная находка соответственно.'],
        ['3 / 4 / 5', 'Низкий, промежуточный или высокий риск соответственно. Тактику определяют по матрице МРТ, клиническому контексту и консультации профильной команды. Пороговые значения УЗ-ветки к МРТ не переносят.'],
      ]],
    ],
    sources: [['ACR · таблицы O-RADS US и MRI', 'https://www.acr.org/Clinical-Resources/Clinical-Tools-and-Reference/Reporting-and-Data-Systems/O-RADS']],
  },
  {
    id: 'vi-rads', title: 'VI-RADS', organ: 'Мочевой пузырь', version: 'Стандарт VI-RADS · мпМРТ',
    aliases: 'вирадс ви радс virads мочевой пузырь мышечная инвазия детрузор',
    cards: ['c012'],
    use: 'Оценка вероятности инвазии мышечного слоя при опухоли мочевого пузыря. При использовании МРТ для местного стадирования исследование предпочтительно проводить до ТУР. Окончательная стадия учитывает материал ТУР и морфологическую оценку мышечного слоя.',
    groups: [['Критерии и интерпретация', [
      ['Метод', 'Сопоставляют целостность мышечного слоя на T2, диффузию DWI/ADC и раннее контрастное усиление DCE. Оценивают конкретную опухоль, а не только наличие образования.'],
      ['1–2', 'Мышечная инвазия крайне маловероятна или маловероятна. Продолжить стандартное клинико-морфологическое обследование.'],
      ['3', 'Неопределённая вероятность. Уточнить по качеству исследования и результатам ТУР и морфологии.'],
      ['4–5', 'Инвазия мышечного слоя вероятна или весьма вероятна. При 5 вероятно также распространение за пределы стенки. Приоритет — полноценное стадирование и обсуждение тактики.'],
    ]]],
    sources: [['ACR · VI-RADS для клиницистов', 'https://pubmed.ncbi.nlm.nih.gov/41176432/'], ['EAU · диагностика и стадирование', 'https://uroweb.org/guidelines/muscle-invasive-and-metastatic-bladder-cancer/chapter/diagnostic-evaluation']],
  },
  {
    id: 'ni-rads', title: 'NI-RADS', organ: 'Голова и шея', version: 'ACR · КТ/ПЭТ-КТ и отдельный протокол МРТ v2025',
    aliases: 'нирадс ни радс nirads рецидив после лечения голова шея ПЭТ МРТ',
    cards: ['c019', 'c038', 'c047', 'c048', 'c049', 'c052', 'c073'],
    cardNote: 'Для наблюдения после лечения.',
    use: 'Оценка подозрения на остаточную или рецидивную опухоль после лечения рака головы и шеи. Первичную зону и шейные узлы оценивают раздельно. Используйте таблицу для выбранного метода.',
    groups: [['Категории и дальнейшие действия', [
      ['1', 'Нет подозрительных изменений. Продолжить стандартное наблюдение.'],
      ['2', 'Низкое подозрение. При поверхностной находке в зоне первичной опухоли может быть показан прямой осмотр, при глубокой находке или узловых изменениях — короткий интервал визуализации по протоколу.'],
      ['3', 'Высокое подозрение. Определить необходимость биопсии и обсудить результат с профильной командой.'],
      ['4', 'Подтверждённый рецидив или прогрессирование. Оценить распространённость и согласовать дальнейшую лечебную тактику.'],
    ]]],
    sources: [['ACR · NI-RADS и протокол МРТ v2025', 'https://www.acr.org/Clinical-Resources/Clinical-Tools-and-Reference/Reporting-and-Data-Systems/NI-RADS'], ['ACR · категории для первичной зоны и шейных узлов', 'https://www.acr.org/-/media/ACR/Files/RADS/NI-RADS/NIRADS-Primary-Site-and-Neck-Nodes-Categories-and-Management.pdf']],
  },
];

function imagingRadsRows(query = '') {
  const terms = normalizeSearch(query).split(' ').filter(Boolean);
  const matches = IMAGING_RADS.filter(system => terms.every(term =>
    normalizeSearch([system.title, system.organ, system.aliases].join(' ')).includes(term)));
  return matches.map(system => `
    <article class="panel" id="scales-${system.id}" tabindex="-1">
      <h3>${esc(system.title)} · ${esc(system.organ)}</h3>
      <p class="fine">${esc(system.version)}</p>
      <p>${esc(system.use)}</p>
      ${system.groups.map(([title, items]) => `<details class="marker-entry">
        <summary>${esc(title)}</summary><div class="marker-detail">
          ${items.map(([label, detail]) => `<p><b>${esc(label)}.</b> ${esc(detail)}</p>`).join('')}
        </div></details>`).join('')}
      <p class="fine">${system.sources.map(([label, url]) => treatmentSource(url, label)).join(' · ')}</p>
    </article>`).join('') || '<p class="muted">Система не найдена.</p>';
}

function imagingRadsPanel() {
  return `<section class="panel" id="scales-rads" tabindex="-1">
    <h2>Инструментальная диагностика · RADS</h2>
    <p>Выберите систему по органу и методу. Для присвоения категории и выбора тактики используйте полный протокол соответствующей редакции.</p>
    <label class="field">Поиск системы RADS<input type="search" id="rads-query" placeholder="Например, TI-RADS, щитовидная железа, МРТ" oninput="filterImagingRads(this.value)"></label>
    <div id="imaging-rads-results">${imagingRadsRows()}</div>
  </section>`;
}

function filterImagingRads(query) {
  $('#imaging-rads-results').innerHTML = imagingRadsRows(query);
}

function cardImagingLinks(id) {
  return IMAGING_RADS.filter(system => system.cards.includes(id)).map(system =>
    `<p><a class="btn secondary" href="#scales/${system.id}">Открыть ${system.title}</a>${system.cardNote ? ` <span class="fine">${esc(system.cardNote)}</span>` : ''}</p>`
  ).join('');
}

const SEARCH_TOOLS = [
  ['Инструментальная диагностика · RADS', '#scales/rads', 'критерии визуализация исследования'],
  ...IMAGING_RADS.map(system => [system.title, '#scales/' + system.id, system.organ + ' ' + system.aliases]),
  ['Площадь поверхности тела (Mosteller)', '#calculators/bsa', 'BSA ППТ Мостеллер'],
  ['Карбоплатин (Calvert)', '#calculators/cal', 'AUC Калверт доза'],
  ['CKD-EPI 2021', '#calculators/ckdepi', 'рСКФ СКФ креатинин'],
  ['Индекс массы тела', '#calculators/bmi', 'ИМТ BMI'],
  ['Абсолютное число нейтрофилов', '#calculators/anc', 'АЧН ANC нейтропения'],
  ['Скорректированный кальций', '#calculators/ca', 'альбумин'],
  ['QTc по Fridericia', '#calculators/qtc', 'Фридериция QT интервал'],
  ['RECIST 1.1', '#calculators/recist', 'оценка ответа таргетные очаги'],
  ['ECOG Performance Status', '#scales/ecog', 'функциональный статус'],
  ['Karnofsky', '#scales/kps', 'KPS Карновский'],
  ['Khorana', '#scales/khorana', 'Хорана риск ВТЭО тромбоз'],
  ['Child–Pugh', '#scales/child-pugh', 'Чайлд Пью печень цирроз'],
  ['IMDC', '#scales/imdc', 'метастатический рак почки'],
  ['Кумулятивная доза антрациклинов', '#calculators/anthracyclines', 'антрациклины кардиотоксичность эквивалент доксорубицина эпирубицин даунорубицин идарубицин митоксантрон'],
  ['MASCC', '#scales/mascc', 'МАССЦ фебрильная нейтропения осложнения лихорадка риск'],
  ['CISNE', '#scales/cisne', 'фебрильная нейтропения стабильная солидная опухоль лихорадка риск'],
  ['R2-ISS', '#scales/r2iss', 'множественная миелома прогноз цитогенетика ISS FISH'],
  ['ALBI', '#calculators/albi', 'альбумин билирубин функция печени гепатоцеллюлярный рак ГЦР'],
  ['Deauville / Lugano', '#scales/deauville', 'Довиль Довилль Лугано ПЭТ ПЭТ/КТ лимфома метаболический ответ'],
  ['CTCAE v6.0', '#scales/ctcae', 'критерии степени нежелательных явлений токсичность нейтропения тромбоцитопения диарея мукозит нейропатия пневмонит'],
];

const CARD_SEARCH_ALIASES = {
  "c077": "uveal melanoma меланома хориоидеи тебентафусп",
  "c078": "ампулярный рак БДС ампула Фатера ampullary",
  "c079": "рак аппендикса goblet cell appendiceal бокаловидноклеточная",
  "c080": "ПЛЦНС PCNSL лимфома мозга",
  "c081": "Burkitt BL",
  "c082": "MALT MZL мальт лимфома маргинальной зоны H pylori",
  "c083": "LCNEC ККНЭК крупноклеточная НЭК",
  "c084": "malignant peripheral nerve sheath tumor MPNST злокачественная шваннома",
  c001: 'НМРЛ NSCLC', c002: 'НМРЛ NSCLC', c003: 'МРЛ SCLC',
  c004: 'РМЖ breast cancer', c005: 'КРР CRC', c008: 'поджелудочная PDAC',
  c009: 'ГЦК HCC', c013: 'РПЖ простата', c015: 'РЭ рак тела матки',
  c017: 'РШМ', c027: 'ДВККЛ DLBCL', c029: 'ММ multiple myeloma',
  c030: 'ОМЛ AML', c031: 'ХМЛ CML', c046: 'CLL SLL',
  c050: 'ALL', c056: 'MCL',
  c069: 'IDH-mutant astrocytoma', c070: 'oligodendroglioma 1p19q',
  c071: 'lung NET pulmonary carcinoid НЭО лёгкого', c072: 'ACC рак коры надпочечника',
  c073: 'синоназальный ПКР SNSCC', c074: 'хромофобный ПКР chromophobe RCC',
  c075: 'angiosarcoma', c076: 'ВКЛ HCL hairy cell leukemia',
  c066: 'аденокистозный мукоэпидермоидный протоковый SDC', c067: 'ATC', c068: 'MCC Merkel клеток Меркеля',
};

function regimenKey(protocol) {
  let hash = 2166136261;
  for (const character of protocol.regimen) {
    hash = Math.imul(hash ^ character.codePointAt(0), 16777619);
  }
  return (hash >>> 0).toString(36);
}

function globalSearch(query) {
  const normalize = normalizeRegimenSearch;
  const terms = normalize(query).split(' ').filter(Boolean);
  if (!terms.length) return '';
  const matches = value => {
    const haystack = normalize(value);
    return terms.every(term => haystack.includes(term));
  };
  const compactQuery = markerSearchText(query);
  const sections = [
    ['Хирургические алгоритмы', [
      ...(['Хирургические алгоритмы', 'Основы онкохирургии'].filter(title => matches(title))
        .map(title => [title, '#surgery', 'Хирургия'])),
      ...SURGICAL_ALGORITHMS.filter(item => matches(item.title + ' ' + item.keywords))
        .map(item => [item.title, '#surgery/' + item.id, 'Хирургическая тактика']),
    ]],
    ['Осложнения терапии', THERAPY_COMPLICATIONS.filter(topic => matches([topic.title, topic.aliases, topic.signs].join(' ')))
      .map(topic => [topic.title, '#regimens/complications/' + topic.id, 'Признаки · срочность · первые действия'])],
    ['Калькуляторы и шкалы', SEARCH_TOOLS.filter(([title, , keywords]) => matches(title + ' ' + keywords))
      .map(([title, href]) => [title, href, href.startsWith('#scales') ? 'Клиническая шкала' : 'Калькулятор'])],
    ['Источники', SOURCE_SECTIONS.flatMap(([group, sources]) => sources.filter(([name, description]) =>
      matches([group, name, description].join(' '))).map(([name, , url]) => [name, url, group]))],
    ['Другие системы стадирования', DATA.filter(card => stagingData.other[card.id] &&
      matches([card.title, CARD_SEARCH_ALIASES[card.id], stagingData.other[card.id]].join(' ')))
      .map(card => [card.title, '#card/' + card.id, stagingData.other[card.id]])],
    ['Стадирование', stagingData.entries.filter(entry => DATA.some(card => entry.cards.includes(card.id) &&
      matches([card.title, CARD_SEARCH_ALIASES[card.id], ...card.icd10, entry.title, entry.edition].join(' '))))
      .map(entry => [entry.title, '#tnm/' + entry.id, entry.edition])],
    ['Схемы лечения', REGIMEN_INDEX
      .flatMap(row => row.contexts.filter(context => matches([row.searchText, CARD_SEARCH_ALIASES[row.card.id], context.label, ...row.lines, ...row.purposes].join(' ')))
        .map(context => [row.protocol.regimen, context.href, row.card.title + ' · ' + context.label]))],
    ['Онкомаркеры', MARKERS.filter(marker => matches([marker.name, marker.aliases, marker.context, marker.definition].join(' ')) ||
      (compactQuery.length >= 3 && markerSearchText(marker.name + ' ' + marker.aliases).includes(compactQuery)))
      .map((marker) => [marker.name, '#markers/' + MARKERS.indexOf(marker), marker.context])],
    ['Библиотека знаний', SEARCH_LIBRARY.filter(([title, , keywords]) => matches(title + ' ' + keywords))
      .map(([title, href]) => [title, href, 'Учебный материал'])],
    ['Карточки ЗНО', findCards(query.replace(/(^|\s)с(?=\d)/gi, '$1c'))
      .map(card => {
        const molecular = matches(card.molecular);
        return [card.title, '#card/' + card.id + (molecular ? '/molecular' : ''),
          molecular ? 'Молекулярные паттерны · ' + card.group : card.group];
      })],
  ];
  const link = ([title, href, context]) =>
    `<a class="item staging-result" href="${esc(href)}"><span><strong>${esc(title)}</strong><small>${esc(context)}</small></span><span aria-hidden="true">→</span></a>`;
  const groups = sections.filter(([, rows]) => rows.length).map(([label, rows]) =>
    `<section><h3>${esc(label)} · ${rows.length}</h3>${rows.slice(0, 4).map(link).join('')}
      ${rows.length > 4 ? `<details><summary>Ещё ${rows.length - 4}</summary>${rows.slice(4).map(link).join('')}</details>` : ''}</section>`);
  return '<div class="panel global-results">' + (groups.join('') || 'Ничего не найдено.') + '</div>';
}

function searchHome(query) {
  $('#quickSearch').innerHTML = globalSearch(query);
}
function catalog(){return shell('Карточки ЗНО',`<div class="catalog-tools"><input class="search" id="find" aria-label="Поиск по каталогу" placeholder="Поиск по опухоли, гистотипу, биомаркеру или препарату…" oninput="listCards()"><select id="group" aria-label="Группа опухолей" onchange="listCards()">${groups.map(g=>`<option>${esc(g)}</option>`).join('')}</select></div><p class="muted" id="count" aria-live="polite"></p><div id="cardList"></div>`)}
function listCards(){const q = $('#find').value, g = $('#group').value; const filtered = findCards(q, g);$('#count').textContent=`Найдено: ${filtered.length} из ${DATA.length}`;$('#cardList').innerHTML=filtered.map(c=>`<button class="item" onclick="view('card','${c.id}')"><span><strong>${esc(c.title)}</strong><small>${esc(c.group)} · № ${String(c.number).padStart(3,'0')}</small></span>→</button>`).join('')||'<div class="panel muted">Совпадений нет</div>'}
const favkey = 'oncoatlas_favorites_v2';
let sessionFavorites;
function favs() {
  if (sessionFavorites) return sessionFavorites;
  try {
    const saved = JSON.parse(localStorage.getItem(favkey));
    return Array.isArray(saved) ? saved : [];
  } catch {
    return [];
  }
}
function toggleFav(id) {
  const current = favs();
  sessionFavorites = current.includes(id) ? current.filter(x => x !== id) : [...current, id];
  try { localStorage.setItem(favkey, JSON.stringify(sessionFavorites)); } catch { /* Keep session favorites. */ }
  render();
  $('.actions button')?.focus();
}

const NON_TNM_CARD_INFO = {
  ...Object.fromEntries(DATA.filter(card => card.treatmentContexts).map(card => [card.id, card.treatmentContexts])),
  c025: {heading:"Глиобластома · CNS WHO grade 4",explanation:"Для глиобластомы неприменимы стадии TNM I–IV. Лечебная тактика определяется возрастом, функциональным статусом, MGMT, объёмом резекции и возможностью лучевой терапии. При впервые диагностированной опухоли приведены стандартный и укороченный курсы ХЛТ для разных групп пациентов. После максимально безопасной резекции показана оценка остатка по МРТ. При рецидиве повторная операция, реоблучение, системная или поддерживающая терапия обсуждаются индивидуально.",url:"https://www.cancer.gov/types/brain/hp/adult-brain-treatment-pdq"},
  c029: {heading:"Множественная миелома · ISS / R-ISS / R2-ISS",explanation:"ISS, R-ISS и R2-ISS — прогностические системы, не аналоги TNM I–IV. Системная терапия выбирается по критериям симптомной миеломы, трансплантационной пригодности, цитогенетике, функции почек и предшествующему лечению. При пригодности к ауто-ТГСК обсуждают индукцию с последующим сбором клеток, трансплантацией и поддержкой. При непригодности один из вариантов первой линии — DRd. CyBorD применяют при соответствующем клиническом выборе.",url:"https://www.cancer.gov/types/myeloma/hp/myeloma-treatment-pdq"},
  c030: {heading:"Острый миелоидный лейкоз · ELN / генетическая группа риска",explanation:"TNM I–IV не применяется. Оценивать генетические изменения, ELN-риск, пригодность к интенсивной индукции и ответ/MRD. Для ОПЛ требуется срочная отдельная тактика. При других вариантах ОМЛ показаны разные подходы. 7+3 относится к интенсивной индукции, азацитидин + венетоклакс — к лечению пациентов, которым интенсивная индукция не подходит.",url:"https://www.cancer.gov/types/leukemia/hp/adult-aml-treatment-pdq"},
  c031: {heading:"Хронический миелоидный лейкоз · хроническая / бластная фаза",explanation:"TNM I–IV не применяется. Терапия зависит от фазы ХМЛ, BCR::ABL1, мутационного профиля, коморбидности и ответа. По WHO 2022 выделяют хроническую и бластную фазы, ICC 2022 также выделяет фазу акселерации. По ELN 2025 контролируют BCR::ABL1 по международной шкале не реже чем каждые 3 месяца до подтверждённого большого молекулярного ответа (≤0,1%), затем при стабильном ответе обычно каждые 4–6 месяцев.",url:"https://www.cancer.gov/types/leukemia/hp/cml-treatment-pdq"},
  c045: {
    heading: "Базальноклеточный рак · риск рецидива и распространённость",
    explanation: "Тактику при локализованной базалиоме определяют риск рецидива и возможность полного удаления. При местно-распространённой или метастатической болезни оценивают возможность радикального локального лечения и показания к системной терапии.",
    url: "https://pubmed.ncbi.nlm.nih.gov/37604067/",
    contexts: [
      ["Хирургическое лечение · низкий риск", "Стандартное иссечение с гистологической оценкой краёв. Для опухоли низкого риска при стандартной оценке краёв ориентир EADO — 3–4 мм клинического отступа. Если операция противопоказана, обсуждают лучевую терапию или, при отдельных поверхностных очагах, местные методы."],
      ["Хирургическое лечение · высокий риск или рецидив", "Предпочтительна микрографически контролируемая хирургия, включая метод Мооса, особенно в анатомически критических зонах. Если она недоступна, объём иссечения и реконструкции планируют по локализации и предполагаемому субклиническому распространению."],
      ["Местно-распространённая или метастатическая болезнь", "Консилиум оценивает возможность радикальной операции и облучения. При невозможности радикального локального лечения обсуждают системную терапию. Рутинного адъювантного системного лечения после полного иссечения локализованной базалиомы нет."],
    ],
  },
  c046: {
    heading: "ХЛЛ/ЛМЛ · стадирование и активность болезни",
    explanation: "При ХЛЛ используют Rai (0–IV) или Binet (A–C). По Binet при Hb ≥100 г/л и тромбоцитах ≥100 × 10⁹/л стадия A означает менее трёх поражённых лимфоидных областей, B — три или более, C — Hb <100 г/л и/или тромбоциты <100 × 10⁹/л. При ЛМЛ анатомическое распространение описывают по Lugano. Необходимость системной терапии определяют по активности болезни и клинической ситуации.",
    url: "https://pubmed.ncbi.nlm.nih.gov/29540348/",
    contexts: [
      ["Наблюдение", "При отсутствии критериев активного заболевания — клиническое наблюдение с ОАК. Высокий молекулярный риск сам по себе не является показанием к немедленной терапии."],
      ["Когда начинать лечение", "По iwCLL достаточно одного критерия активной болезни: нарастающая анемия или тромбоцитопения из-за костномозговой недостаточности, массивная (селезёнка ≥6 см ниже рёберной дуги или узел ≥10 см), прогрессирующая или симптомная спленомегалия/лимфаденопатия, прирост лимфоцитов ≥50% за 2 месяца или время удвоения <6 месяцев после исключения других причин, аутоиммунные цитопении с плохим ответом на глюкокортикоиды, симптомное экстранодальное поражение либо значимые симптомы болезни: потеря ≥10% массы за 6 месяцев, утомляемость с ECOG ≥2, необъяснимая лихорадка ≥38 °C в течение ≥2 недель или ночная потливость ≥1 месяца без инфекции."],
      ["Первая линия и рецидив", "Выбор между фиксированной комбинацией и непрерывным ингибитором BTK зависит от TP53/del(17p), сопутствующих болезней, риска лизиса и предпочтений пациента. При рецидиве учитывают классы препаратов, применённые ранее, и причину их отмены. Хирургия возможна для диагностической биопсии; лечебная резекция при ХЛЛ/ЛМЛ рутинно не применяется."],
    ],
  },
  c050: {
    heading: "ОЛЛ взрослых · генетика, фаза лечения и MRD",
    explanation: "TNM не применяется. Выбор терапии зависит от B-/T-линии, BCR::ABL1, возраста, коморбидности и MRD. Индукцию, консолидацию и последующие фазы проводят по единому протоколу с профилактикой поражения ЦНС.",
    url: "https://www.cancer.gov/types/leukemia/hp/adult-all-treatment-pdq",
    contexts: [
      ["Первая линия", "При Ph− ОЛЛ выбирают возраст-адаптированный протокол; у подходящих молодых взрослых возможен педиатрически ориентированный подход. При Ph+ ОЛЛ включают ИТК. Для T-ОЛЛ препараты против CD19 не применяются."],
      ["Ответ и рецидив", "MRD оценивают в опорных точках протокола. При персистирующей MRD или рецидиве обсуждают смену терапии, при B-ОЛЛ — иммунотерапию по экспрессии мишени, CAR-T и/или алло-ТГСК по показаниям."],
      ["Роль хирургии", "Хирургическое удаление опухоли не является методом лечения ОЛЛ. Алло-ТГСК оценивают по риску, ответу и пригодности к трансплантации."],
    ],
  },
  c056: {
    heading: "Мантийноклеточная лимфома · Lugano и клинические ситуации",
    explanation: "Анатомическую стадию описывают по Lugano. Выбор тактики учитывает симптомы, темп болезни, TP53, морфологию и пригодность к интенсивному лечению.",
    url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC12541557/",
    contexts: [
      ["Наблюдение или локальная терапия", "У отобранных бессимптомных пациентов с индолентным течением возможно наблюдение. При подтверждённой ограниченной стадии обсуждают локальную ЛТ и необходимость системной терапии."],
      ["Первая линия", "При необходимости лечения оценить пригодность к интенсивному режиму. У подходящих пациентов обсуждают цитарабин-содержащий подход, роль ингибитора BTK и ауто-ТГСК. Для непригодных к ауто-ТГСК приведён режим ECHO. При мутации TP53 предпочтительна оценка возможности клинического исследования."],
      ["Рецидив", "Выбор зависит от предшествующего ингибитора BTK, ответа, коморбидности и доступности. По показаниям обсуждают ковалентный или нековалентный ингибитор BTK и CAR-T. Хирургия играет прежде всего диагностическую роль."],
    ],
  }
};
const CONTEXTUAL_SURGERY = {
  "c080": "Стереотаксическая биопсия — обычный способ получения материала. Резекция не является стандартом лечения; отдельные ситуации с угрожающим повышением внутричерепного давления обсуждает команда.",
  "c081": "Операция обычно ограничена получением материала или лечением хирургических осложнений. Основой терапии служат лекарственные программы.",
  "c082": "Хирургия не входит в стандартный лечебный алгоритм; необходима только при отдельных осложнениях, требующих неотложного вмешательства.",
  c076: "Хирургическая резекция не входит в стандартную лечебную тактику. Спленэктомию рассматривают лишь в редких индивидуальных ситуациях.",
  c025: 'При операбельности оценивают максимально безопасную резекцию с сохранением функции. Если резекция небезопасна, рассматривают стереотаксическую биопсию.',
  c029: 'Резекция опухоли не является основой лечения. При переломе, угрозе нестабильности или компрессии нервных структур оценивают необходимость стабилизации или декомпрессии.',
  c030: 'Хирургическая резекция не является методом лечения ОМЛ. Аллогенная трансплантация гемопоэтических клеток относится к отдельным лечебным подходам.',
  c031: 'Хирургическая резекция не является методом лечения ХМЛ. Системная терапия зависит от фазы и ответа; при отдельных показаниях рассматривают алло-ТГСК.',
  c045: 'Выбор иссечения, микрографически контролируемой хирургии или другого подхода зависит от риска рецидива, локализации и резектабельности.',
  c046: 'Хирургическая резекция не является стандартным лечением ХЛЛ/ЛМЛ. При подозрении на трансформацию может потребоваться биопсия поражённого узла.',
  c050: 'Хирургическая резекция не применяется для лечения ОЛЛ. Алло-ТГСК рассматривают по группе риска и ответу, включая MRD.',
  c056: 'Удаление поражённого узла может быть необходимо для диагностики. Роль локальной терапии при ограниченной болезни обсуждают на консилиуме.',
};

function renderStagingOverview(overview) {
  if (!overview) return '';
  return `<section class="panel" id="card-staging" tabindex="-1"><h2>${esc(overview.title)}</h2>
    ${overview.items.map(([label, detail]) => `<p><b>${esc(label)}.</b> ${esc(detail)}</p>`).join('')}
    <p class="fine">${treatmentSource(overview.source[1], overview.source[0])}</p></section>`;
}

function renderStageSituations(situations) {
  return (situations ?? []).map(([label, detail]) =>
    `<p class="notice"><b>${esc(label)}.</b> ${esc(detail)}</p>`).join('');
}

function renderNonTnmTreatment(c) {
  const info = NON_TNM_CARD_INFO[c.id];
  const reference = treatmentSource(info.url, 'Источник по классификации и тактике');
  const contexts = (info.contexts ?? []).map(([title, detail]) =>
    `<div class="notice" style="margin:10px 0"><p><b>${esc(title)}.</b> ${esc(detail)}</p></div>`).join('');
  const surgery = STAGE_SURGERY[c.id]?.I ?? {procedure: CONTEXTUAL_SURGERY[c.id], url: info.url};
  return `<div class="panel"><h2>5. Лечение по клинической ситуации</h2>
    <p><b>${esc(info.heading)}</b></p><p>${esc(info.explanation)}</p><p class="fine">${reference}</p>
    ${contexts}${cardTakeaway(c, 'I')}${renderTreatmentTabs(renderDrugContent(c.id, 'I'), renderSurgeryContent(surgery))}</div>`;
}
function cardTakeaway(card, stage) {
  const text = (STAGE_MNEMONICS[card.id] ?? REMAINING_MNEMONICS[card.id])?.[stage] ?? card.takeaway;
  return text ? `<p class="fine"><b>Кратко для запоминания.</b> ${esc(text)}</p>` : '';
}

function card(){const c=DATA.find(x=>x.id===state.card);if(!c)return shell('Карточка не найдена','<p>Выберите нозологию в каталоге.</p>','catalog');const f=favs().includes(c.id);return shell(esc(c.title),`<div class="eyebrow">Карточка №${String(c.number).padStart(3,'0')} · ${esc(c.group)}</div><div class="actions">${btn(f?'★ В избранном':'☆ В избранное',`toggleFav('${c.id}')`)}${btn('Сохранить PDF','window.print()','secondary')}${stagingCardLink(c.id)}${c.id === 'c029' ? '<a class="btn secondary" href="#scales/r2iss">Рассчитать R2-ISS</a>' : ''}${c.id === 'c009' ? '<a class="btn secondary" href="#calculators/albi">Рассчитать ALBI</a>' : ''}${['c026','c027','c028','c056','c081'].includes(c.id) ? '<a class="btn secondary" href="#scales/deauville">Deauville / Lugano</a>' : ''}</div><div class="panel"><h2>1. Гистотип и локализация</h2><p><b>МКБ‑10:</b> ${esc((c.icd10 ?? []).join(', '))}</p>${c.icd10Note ? `<p class="fine">${esc(c.icd10Note)}</p>` : ''}<p><b>Происхождение:</b> ${esc(c.origin)}</p><p><b>Локализация:</b> ${esc(c.location)}</p></div><div class="panel"><h2 id="molecular" tabindex="-1">2. Молекулярные паттерны</h2><p>${esc(c.molecular).split('; ').join(' · ')}</p></div><div class="panel"><h2>3. Диагностика</h2><p>${esc(c.diagnostics)}</p>${cardImagingLinks(c.id)}</div><div class="panel"><h2>4. Онкомаркеры${c.markers.includes('продукция:')? ' и гормональная продукция':''}</h2><p>${esc(c.markers)}</p></div>${c.id === 'c038' ? `<div class="panel"><h2>Стадирование · AJCC 9</h2><p>Версия 9 действует с 1 января 2025 года. При использовании AJCC 8 указывайте версию рядом со стадией. IVA по AJCC 8 означала T4 или N3 при M0. В AJCC 9 при M0 эти категории входят в стадию III, а IVA и IVB относятся только к M1.</p><p>${treatmentSource('https://www.cancer.org/cancer/types/nasopharyngeal-cancer/detection-diagnosis-staging/staging.html', 'Группы стадий AJCC 9 · ACS')} · ${treatmentSource('https://www.facs.org/quality-programs/cancer-programs/education/ajcc-protocol-webinar-on-version-9-staging-system-for-nasopharynx-cancer/', 'Версия и дата вступления в силу · ACS/AJCC')}</p></div>` : ''}${c.id === 'c005' ? `<p class="fine"><a href="#card/c044">Отдельная карточка аденокарциномы прямой кишки</a></p>` : ''}${renderStagingOverview(c.stageOverview)}${NON_TNM_CARD_INFO[c.id] ? renderNonTnmTreatment(c) : `<div class="panel"><h2>5. ${esc(c.treatmentHeading ?? 'Лечение по стадиям')}${stagingData.other[c.id] === 'Lugano' ? ' · Lugano' : c.id === 'c041' ? ' · FIGO' : ''}</h2><div class="tabs">${(CARD_STAGES[c.id] ?? STAGES).map(s=>`<button class="tab ${state.stage===s?'selected':''}" data-stage="${s}" aria-pressed="${state.stage===s}" onclick="setStage('${s}')">${s}</button>`).join('')}</div>${c.stageTreatmentNote ? `<p class="fine">${esc(c.stageTreatmentNote)}</p>` : ''}
${stagingData.other[c.id] === 'Lugano' ? `<p class="fine">Распространённость определяют по Lugano. При выборе терапии дополнительно учитывают гистотип, объём поражения и факторы риска. ${treatmentSource('https://www.ncbi.nlm.nih.gov/books/NBK66038/table/CDR0000062675__176/', 'Критерии Lugano')}</p>` : ''}<p id="stageContent" aria-live="polite"><b>${state.stage}:</b> ${esc(c[state.stage])}</p>${renderStageSituations(c.stageSituations?.[state.stage])}${cardTakeaway(c, state.stage)}${stageExtras(c)}<p class="fine">${c.treatmentHeading ? 'Категории лечения приведены укрупнённо.' : 'Стадии приведены укрупнённо.'} Реальная тактика определяется гистотипом, подстадией, биомаркерами, резектабельностью, функциональным статусом и линией терапии.</p></div>`}<div class="notice"><b>Статус:</b> редакционный черновик. Независимая медицинская проверка не проведена.</div>${c.references?.length ? `<div class="sources">Источники по нозологии: ${c.references.map(([label, url]) => treatmentSource(url, label)).join(' · ')}</div>` : ''}<div class="sources">Источники для проверки: ${sources.map(([n,u])=>`<a href="${u}" target="_blank" rel="noopener">${n}</a>`).join(' · ')}</div>`,'catalog')}

// Редакционные примеры режимов. Не использовать как индивидуальные назначения.
const STAGES = ['I', 'II', 'III', 'IV'];
function stageLabel(card, stage) {
  if (card.stageLabel) return card.stageLabel + ' ' + stage;
  return STAGES.includes(stage) ? 'Стадия ' + stage : stage;
}
const CARD_STAGES = {c014: ['I', 'II', 'III'],
  ...Object.fromEntries(DATA.filter(card => card.stages).map(card => [card.id, card.stages]))};
const STAGE_PROTOCOLS={
 c016:{
 I:{regimen:"Пример адъювантной терапии эпителиального рака яичников I стадии высокого риска: паклитаксел + карбоплатин.",drugs:["Паклитаксел — 175 мг/м², в/в, день 1","Карбоплатин — AUC 5, в/в, день 1 (доза по Calvert)"],cycle:"Каждые 21 день; 4–6 циклов; при серозном гистотипе протокол eviQ рекомендует 6 циклов.",notes:"Не для всех опухолей I стадии: решение зависит от подстадии, гистотипа, степени злокачественности и полноты стадирования. Необходимы премедикация таксана и контроль функции почек.",url:"https://www.eviq.org.au/medical-oncology/gynaecological/ovarian/251-ovarian-high-risk-stage-1-adjuvant-carboplatin"},
 III:{regimen:"Пример первой линии при распространённом эпителиальном раке яичников: паклитаксел + карбоплатин.",drugs:["Паклитаксел — 175 мг/м², в/в, день 1","Карбоплатин — AUC 5–6, в/в, день 1 (по Calvert)"],cycle:"Каждые 21 день; обычно 6 циклов.",notes:"При неоадъювантной стратегии сроки интервальной циторедукции определяются консилиумом; поддерживающая терапия зависит от BRCA/HRD и иных факторов.",url:"https://www.eviq.org.au/medical-oncology/gynaecological/ovarian/252-ovarian-advanced-carboplatin-and-paclitaxel-th"},
 IV:{regimen:"Пример первой линии при распространённом эпителиальном раке яичников: паклитаксел + карбоплатин.",drugs:["Паклитаксел — 175 мг/м², в/в, день 1","Карбоплатин — AUC 5–6, в/в, день 1 (по Calvert)"],cycle:"Каждые 21 день; обычно 6 циклов.",notes:"Стратегия первичной или интервальной циторедукции и поддерживающей терапии индивидуальна; учитывать гистотип, BRCA/HRD, резектабельность и сопутствующие заболевания.",url:"https://www.eviq.org.au/medical-oncology/gynaecological/ovarian/252-ovarian-advanced-carboplatin-and-paclitaxel-th"}
 },

 c005:{
 III:{regimen:"Пример адъювантной терапии при раке ободочной кишки III стадии: модифицированный FOLFOX6 (вариант eviQ). Для рака прямой кишки алгоритм отличается.",drugs:["Оксалиплатин — 85 мг/м², в/в, день 1","Кальция фолинат — 50 мг, в/в, день 1 (вариант eviQ; дозы в других протоколах отличаются)","Фторурацил — 400 мг/м², в/в болюс, день 1","Фторурацил — 2400 мг/м², непрерывная в/в инфузия за 46 часов"],cycle:"Каждые 14 дней; в протоколе eviQ до 12 циклов, длительность адаптируется к риску и переносимости.",notes:"До фторпиримидинов — оценка дефицита DPD/вариантов DPYD по применимым стандартам; контроль нейропатии, функции органов и токсичности.",url:"https://www.eviq.org.au/medical-oncology/colorectal/adjuvant-and-neoadjuvant/637-colorectal-adjuvant-folfox6-modified-fluoro"}
 }
};
const SURGERY_DETAILS={
 c007:{procedure:"Эзофагэктомия с реконструкцией пищеводом из желудка и регионарной лимфодиссекцией у отобранных пациентов; при ранних поверхностных поражениях возможна эндоскопическая резекция по строгим критериям.",limits:"Невозможность R0, нерезектабельные метастазы, значительное местное распространение или неприемлемый кардиопульмональный риск. Для плоскоклеточного рака в ряде ситуаций альтернативой является дефинитивная химиолучевая терапия."},
 c010:{procedure:"Анатомическая резекция печени с лимфодиссекцией при внутрипечёночной холангиокарциноме; при перихилярной/дистальной — локализационно-специфические резекции с билиарной реконструкцией.",limits:"Невозможность R0, недостаточный будущий остаточный объём функциональной печени, нерезектабельное сосудистое распространение или отдалённые метастазы."},
 c012:{procedure:"При мышечно-инвазивном раке — радикальная цистэктомия с тазовой лимфодиссекцией и деривацией мочи; при немышечно-инвазивном — трансуретральная резекция с дальнейшей риск-адаптированной тактикой.",limits:"Неприемлемый операционный риск, нерезектабельность или невозможность радикального вмешательства. Органосохраняющая тримодальная терапия возможна у отобранных пациентов."},
 c013:{procedure:"Радикальная простатэктомия с тазовой лимфодиссекцией по показаниям для локализованной/отдельных местнораспространённых форм; нервосбережение при онкологической допустимости.",limits:"Неприемлемая ожидаемая польза с учётом продолжительности жизни и сопутствующих заболеваний, невозможность радикального удаления; при метастатической болезни операция не рутинный стандарт."},
 c015:{procedure:"Тотальная гистерэктомия с двусторонней сальпингоофорэктомией; оценка сторожевых лимфоузлов/лимфодиссекция по риску, гистотипу и стадии.",limits:"Неприемлемый операционный риск, нерезектабельное распространение; при отдельных низкорисковых ранних случаях возможно строго контролируемое органосохраняющее лечение."},
 c017:{procedure:"При очень ранних стадиях — конизация либо радикальная трахелэктомия у отобранных пациенток; при раннем инвазивном раке — гистерэктомия соответствующего объёма с оценкой лимфоузлов. При местнораспространённом раке обычно предпочтительна химиолучевая терапия.",limits:"Нерезектабельность, распространение за пределы критериев операции, неприемлемый риск; объём операции зависит от FIGO, размеров опухоли, LVSI и репродуктивных планов."},
 c023:{procedure:"Широкая резекция опухоли единым блоком с отрицательными краями; сохранение конечности при технической и онкологической возможности, реконструкция по показаниям.",limits:"Невозможность R0 без неприемлемого функционального ущерба, нерезектабельность, тяжёлый операционный риск; при отдельных метастазах резекция обсуждается индивидуально."},

 c004:{procedure:"Органосохраняющая резекция с адекватными краями либо мастэктомия; биопсия сторожевого лимфоузла/аксиллярная операция по показаниям; реконструкция индивидуально.",limits:"Для органосохранения: невозможность чистых краёв, диффузные злокачественные микрокальцинаты, противопоказания к необходимой ЛТ. При IV стадии операция обычно не является стандартным способом улучшения выживаемости."},
 c005:{procedure:"Ободочная кишка: онкологическая сегментарная колэктомия с регионарной лимфодиссекцией. Прямая кишка: TME либо органосохраняющая стратегия у строго отобранных пациентов.",limits:"Невозможность R0, нерезектабельные метастазы при отсутствии цели циторедукции, неприемлемый операционный риск; при метастазах возможна резекция ограниченных очагов после консилиума."},
 c006:{procedure:"Субтотальная или тотальная гастрэктомия с адекватными краями и D2-лимфодиссекцией в специализированном центре; при строго ранних поражениях — эндоскопическая резекция.",limits:"Перитонеальная диссеминация/нерезектабельные отдалённые метастазы, невозможность R0, неприемлемый операционный риск."},
 c008:{procedure:"Панкреатодуоденальная резекция при опухоли головки, дистальная панкреатэктомия при опухоли тела/хвоста, с регионарной лимфодиссекцией; оценка сосудистой резектабельности.",limits:"Нереконструируемое вовлечение критических сосудов, нерезектабельные метастазы, неприемлемый функциональный риск."},
 c011:{procedure:"Частичная нефрэктомия при технической возможности (особенно T1); радикальная нефрэктомия при соответствующих показаниях. Лимфодиссекция не рутинна при клинически отрицательных узлах.",limits:"Невозможность безопасной резекции, тяжёлый операционный риск; при метастатической болезни циторедуктивная нефрэктомия только у отобранных пациентов."},
 c016:{procedure:"Стадирование и циторедукция: удаление матки с придатками, оментэктомия, оценка брюшины и лимфоузлов по показаниям; цель при распространённом процессе — отсутствие макроскопической остаточной опухоли.",limits:"Невозможность полной циторедукции при неприемлемой морбидности, тяжёлый операционный риск; рассмотреть неоадъювантную ХТ и интервальную операцию."},
 c022:{procedure:"Широкое иссечение первичной меланомы с отступами по толщине Breslow; биопсия сторожевого узла по показаниям.",limits:"Невозможность радикального иссечения, неприемлемый риск; при IV стадии операция обычно применяется для отдельных резектабельных метастазов или симптоматического контроля."},
 c024:{procedure:"Резекция GIST единым блоком с интактной псевдокапсулой и отрицательными краями, избегая разрыва опухоли; рутинная лимфодиссекция обычно не требуется.",limits:"Нерезектабельное распространение, риск разрыва/неприемлемая морбидность, тяжёлый операционный риск; при метастазах операция строго индивидуальна."}
};

const BREAST_REGIMENS = {
  tc: {regimen:"Адъювантная TC (доцетаксел + циклофосфамид) · HER2−, при показаниях к цитотоксической терапии",drugs:["Доцетаксел — 75 мг/м² в/в, день 1","Циклофосфамид — 600 мг/м² в/в, день 1","Пэгфилграстим — 6 мг п/к, день 2 (не ранее 24 ч после ХТ)"],cycle:"Каждые 21 день, 4 цикла; до 6 при более высоком риске и противопоказаниях к антрациклинам.",notes:"Адъювантно после радикальной операции при соответствующем риске рецидива. Не для всех пациенток I стадии. Премедикация дексаметазоном, контроль нейтропении и печёночной функции.",url:"https://www.eviq.org.au/medical-oncology/breast/neoadjuvant-adjuvant/24-breast-adjuvant-tc-docetaxel-and-cyclophospham"},
  apt: {regimen:"Адъювантная APT · небольшая HER2+ опухоль, преимущественно N0",drugs:["Паклитаксел — 80 мг/м² в/в, дни 1, 8, 15 циклов 1–4","Трастузумаб — 8 мг/кг в/в, день 1 цикла 1 (нагрузочная доза)","Трастузумаб — 6 мг/кг в/в, день 1 циклов 2–17"],cycle:"Цикл 21 день. Паклитаксел — 12 еженедельных введений (4 цикла); трастузумаб — всего 17 циклов (около года).",notes:"После операции у отобранных пациенток с небольшим HER2+ РМЖ низкого риска; не заменяет более интенсивные режимы при высоком риске. Контроль ФВ ЛЖ и инфузионных реакций.",url:"https://www.eviq.org.au/medical-oncology/breast/neoadjuvant-adjuvant/153-breast-adjuvant-paclitaxel-weekly-and-trastuzu"},
  tchp: {regimen:"Неоадъювантная TCHP · HER2+ РМЖ высокого риска, операбельный/местнораспространённый",drugs:["Пертузумаб — 840 мг в/в, день 1 цикла 1; затем 420 мг в/в, день 1 циклов 2–6","Трастузумаб — 8 мг/кг в/в, день 1 цикла 1; затем 6 мг/кг в/в, день 1 циклов 2–6","Доцетаксел — 75 мг/м² в/в, день 1 каждого цикла","Карбоплатин — AUC 6 в/в, день 1 каждого цикла (доза по Calvert)","Пэгфилграстим — 6 мг п/к, день 2"],cycle:"Каждые 21 день, 6 циклов до операции. После операции продолжение анти-HER2 терапии зависит от pCR/остаточной опухоли и риска.",notes:"Выбор при HER2+ II–III стадии по размеру опухоли, N-статусу и клиническому риску; не универсально для каждой II стадии. Оценка ФВ ЛЖ, почечной функции, нейропатии, нейтропении.",url:"https://www.eviq.org.au/medical-oncology/breast/neoadjuvant-adjuvant/3736-breast-neoadjuvant-tchp-docetaxel-carboplati"},
  key1: {regimen:"KEYNOTE-522, часть 1 · неоадъювантная TNBC высокого риска",drugs:["Пембролизумаб — 200 мг в/в, день 1","Паклитаксел — 80 мг/м² в/в, дни 1, 8, 15","Карбоплатин — AUC 5 в/в, день 1 (Calvert)"],cycle:"Цикл 21 день, 4 цикла; затем обязательна следующая часть режима (AC + пембролизумаб).",notes:"Для раннего TNBC высокого риска по критериям показания; не для всех опухолей II стадии. Требуются премедикация, профилактика миелотоксичности и мониторинг иммунных нежелательных явлений.",url:"https://www.eviq.org.au/medical-oncology/breast/neoadjuvant-adjuvant/4152-breast-neoadjuvant-adjuvant-carboplatin-pacl",reference:["Дозы первой части eviQ 4153","https://www.eviq.org.au/medical-oncology/breast/neoadjuvant-adjuvant/4153-breast-neoadjuvant-carboplatin-three-weekly-p"]},
  key2: {regimen:"KEYNOTE-522, часть 2 · неоадъювантная AC + пембролизумаб",drugs:["Пембролизумаб — 200 мг в/в, день 1","Доксорубицин — 60 мг/м² в/в, день 1","Циклофосфамид — 600 мг/м² в/в, день 1","Пэгфилграстим — 6 мг п/к, день 2"],cycle:"Каждые 21 день, 4 цикла после карбоплатина/паклитаксела/пембролизумаба; затем операция.",notes:"Продолжение полного неоадъювантного режима, не самостоятельная схема для любой стадии. Контроль ФВ ЛЖ, кумулятивной антрациклиновой токсичности и irAE.",url:"https://www.eviq.org.au/medical-oncology/breast/neoadjuvant-adjuvant/4152-breast-neoadjuvant-adjuvant-carboplatin-pacl",reference:["Дозы AC eviQ 4154","https://www.eviq.org.au/p/4154"]},
  key3: {regimen:"KEYNOTE-522, послеоперационная часть · пембролизумаб",drugs:["Пембролизумаб — 200 мг в/в, день 1"],cycle:"Каждые 21 день, 9 адъювантных циклов после операции (после 8 неоадъювантных циклов с пембролизумабом).",notes:"Только как продолжение соответствующего периоперационного режима TNBC высокого риска, с учётом переносимости и иммунных осложнений.",url:"https://www.eviq.org.au/medical-oncology/breast/neoadjuvant-adjuvant/4152-breast-neoadjuvant-adjuvant-carboplatin-pacl"},
  ribo: {regimen:"Первая линия HR+/HER2− метастатического РМЖ · рибоциклиб + эндокринотерапия",drugs:["Рибоциклиб — 600 мг внутрь 1 раз/сут, дни 1–21 каждого 28-дневного цикла","Летрозол — 2,5 мг внутрь 1 раз/сут, ежедневно (пример эндокринного партнёра)"],cycle:"Цикл 28 дней; до прогрессирования или неприемлемой токсичности.",notes:"При отсутствии висцерального криза и с учётом предшествующей эндокринной терапии; у пременопаузальных пациенток требуется супрессия функции яичников. Контроль ЭКГ/QTc, ОАК, АЛТ/АСТ и взаимодействий.",url:"https://www.eviq.org.au/medical-oncology/breast/metastatic/3379-breast-metastatic-ribociclib"},
  tdxd: {regimen:"Последующие линии HER2+ метастатического РМЖ · трастузумаб дерукстекан",drugs:["Трастузумаб дерукстекан — 5,4 мг/кг в/в, день 1"],cycle:"Каждые 21 день, до прогрессирования или неприемлемой токсичности.",notes:"При соответствующей предшествующей анти-HER2 терапии и показаниях; также существуют отдельные показания для HER2-low/ultralow, которые нельзя автоматически переносить на все подтипы. Критически важен мониторинг интерстициальной болезни лёгких/пневмонита, ФВ ЛЖ и тошноты.",url:"https://www.eviq.org.au/medical-oncology/breast/metastatic/4150-breast-metastatic-trastuzumab-deruxtecan"}
};
const BREAST_TREATMENT = {
 c004: {
 I: {intro:["Системное лечение зависит от ER/PR, HER2, размера опухоли, grade, N-статуса и риска. Для части пациенток достаточно операции, ЛТ и/или эндокринотерапии; приведённые схемы не назначаются всем.","https://www.cancer.gov/types/breast/hp/breast-treatment-pdq"],regimens:[BREAST_REGIMENS.apt,BREAST_REGIMENS.tc],surgery:{procedure:"Органосохраняющая операция с отрицательными краями и последующей ЛТ либо мастэктомия по показаниям; биопсия сторожевого лимфоузла при клинически N0 с учётом критериев возможного отказа от аксиллярного вмешательства.",limits:"Выбор зависит от соотношения размеров опухоли/железы, мультицентричности, возможности R0, показаний к ЛТ и предпочтений пациентки. Воспалительный РМЖ исключает органосохраняющую тактику.",url:"https://www.cancer.gov/types/breast/hp/breast-treatment-pdq"}},
 II: {intro:["Подтип-ориентированная тактика: HR+/HER2− по риску; HER2+ с высоким риском — неоадъювантная анти-HER2 терапия; TNBC высокого риска — периоперационная химиоиммунотерапия. Схемы ниже альтернативны по биологии, а части KEYNOTE-522 последовательны.","https://www.cancer.gov/types/breast/hp/breast-treatment-pdq"],regimens:[BREAST_REGIMENS.tc,BREAST_REGIMENS.tchp,BREAST_REGIMENS.key1,BREAST_REGIMENS.key2,BREAST_REGIMENS.key3],surgery:{procedure:"После неоадъювантной терапии либо первично: органосохраняющая резекция с R0 или мастэктомия; биопсия сторожевого лимфоузла/таргетная аксиллярная диссекция либо лимфодиссекция по исходному и посттерапевтическому N-статусу.",limits:"Выбор зависит от ответа на неоадъювантное лечение, распространённости, возможности чистых краёв и необходимости ЛТ. Не выполнять автоматическую аксиллярную диссекцию всем.",url:"https://www.cancer.gov/types/breast/hp/breast-treatment-pdq"}},
 III: {intro:["Местнораспространённый РМЖ требует мультимодального подхода; при воспалительном РМЖ органосохраняющая операция не показана. Выбор неоадъювантного режима определяется биологическим подтипом.","https://www.cancer.gov/types/breast/hp/breast-treatment-pdq"],regimens:[BREAST_REGIMENS.tchp,BREAST_REGIMENS.key1,BREAST_REGIMENS.key2,BREAST_REGIMENS.key3],surgery:{procedure:"После системной терапии при достижимой резектабельности — мастэктомия или органосохраняющая операция у отобранных пациенток; оценка/лечение аксиллы с учётом исходного N-статуса и ответа. При воспалительном РМЖ обычно модифицированная радикальная мастэктомия после системной терапии.",limits:"Неоперабельность при сохраняющемся местном распространении, невозможность R0, неприемлемый операционный риск; при воспалительном РМЖ органосохраняющая операция противопоказана.",url:"https://www.cancer.gov/types/breast/hp/breast-treatment-pdq"}},
 IV: {intro:["Лечение преимущественно системное и определяется ER/PR, HER2, предшествующими линиями и состоянием пациентки. Примеры ниже относятся к разным подтипам и линиям и не являются взаимозаменяемыми.","https://www.cancer.gov/types/breast/hp/breast-treatment-pdq"],regimens:[BREAST_REGIMENS.ribo,BREAST_REGIMENS.tdxd],surgery:{procedure:"Резекция первичной опухоли или отдельных метастазов — преимущественно для контроля симптомов либо в индивидуально отобранных ситуациях после мультидисциплинарного обсуждения.",limits:"Рутинная операция на первичном очаге при de novo метастатическом РМЖ не является стандартным способом улучшения общей выживаемости. Не откладывать эффективное системное лечение ради необоснованной резекции.",url:"https://www.cancer.gov/types/breast/hp/breast-treatment-pdq"}}
 }
};


const NEXT_REGIMENS={
 folfox:{regimen:"Адъювантная mFOLFOX6 · рак ободочной кишки III стадии (и отдельные II высокого риска)",drugs:["Оксалиплатин — 85 мг/м² в/в, день 1","Кальция фолинат — 50 мг в/в болюс, день 1 (версия eviQ)","Фторурацил — 400 мг/м² в/в болюс, день 1","Фторурацил — 2400 мг/м² непрерывно в/в за 46 ч с дня 1"],cycle:"14 дней; до 12 циклов (6 месяцев), длительность индивидуализируется по риску и токсичности.",notes:"Применимо к раку ободочной кишки; рак прямой кишки имеет отдельную последовательность лечения. До фторпиримидинов оценить DPD/DPYD; контролировать нейропатию.",url:"https://www.eviq.org.au/medical-oncology/colorectal/adjuvant-and-neoadjuvant/637-colorectal-adjuvant-folfox6-modified-fluoro"},
 folfiri:{regimen:"Метастатический КРР · mFOLFIRI + бевацизумаб, при соответствующих показаниях",drugs:["Бевацизумаб — 5 мг/кг в/в, день 1","Иринотекан — 180 мг/м² в/в, день 1","Кальция фолинат — 50 мг в/в болюс, день 1 (eviQ)","Фторурацил — 400 мг/м² в/в болюс, день 1","Фторурацил — 2400 мг/м² непрерывно в/в за 46 ч с дня 1"],cycle:"Каждые 14 дней; до прогрессирования или неприемлемой токсичности.",notes:"Подбор линии и биологического препарата зависит от RAS/BRAF, MSI/MMR, локализации первичной опухоли и предшествующей терапии. Бевацизумаб: кровотечения, перфорации, АГ, заживление ран.",url:"https://www.eviq.org.au/medical-oncology/colorectal/metastatic/89-colorectal-metastatic-folfiri-modified-fluor"},
 flot:{regimen:"Периоперационная FLOT · резектабельная аденокарцинома желудка/пищеводно-желудочного перехода (cT2+ и/или cN+)",drugs:["Доцетаксел — 50 мг/м² в/в, день 1","Оксалиплатин — 85 мг/м² в/в, день 1","Кальция фолинат — 50 мг в/в болюс, день 1 (eviQ)","Фторурацил — 2600 мг/м² непрерывно в/в за 24 ч, день 1","Пэгфилграстим — 6 мг п/к, день 3 (согласно eviQ)"],cycle:"Каждые 14 дней; 4 цикла до операции и 4 после (всего 8).",notes:"При ECOG 0–2 и технической резектабельности; до фторурацила оценить DPD/DPYD, контролировать нейропатию и миелосупрессию. Не путать с FLOT + дурвалумаб.",url:"https://www.eviq.org.au/medical-oncology/upper-gastrointestinal/gastric-and-oesophageal-adjuvant-and-neoadjuvant/2038-gastric-gastroesophageal-and-oesophageal-neoa"},
 pancreasAdj:{regimen:"Адъювантная mFOLFIRINOX · после радикальной резекции протоковой аденокарциномы поджелудочной железы",drugs:["Оксалиплатин — 85 мг/м² в/в, день 1","Иринотекан — 150 мг/м² в/в, день 1","Кальция фолинат — 50 мг в/в болюс, день 1 (eviQ)","Фторурацил — 2400 мг/м² непрерывно в/в за 46 ч, день 1; БЕЗ болюса"],cycle:"Каждые 14 дней, 12 циклов (около 6 месяцев).",notes:"Для функционально сохранных пациентов после резекции; не использовать дозу иринотекана метастатического протокола без сверки. Оценить DPD/DPYD и токсичность.",url:"https://www.eviq.org.au/getmedia/7cc6e4a5-792b-4062-bfd5-737b98c3a56d/ID-3521-Pancreas-Adj-FOLFIRINOX-Protocol-and-PI.pdf.aspx"},
 hcc:{regimen:"Нерезектабельная/метастатическая ГЦК · атезолизумаб + бевацизумаб, первая линия",drugs:["Атезолизумаб — 1200 мг в/в, день 1","Бевацизумаб — 15 мг/кг в/в, день 1"],cycle:"Каждые 21 день, до прогрессирования или неприемлемой токсичности.",notes:"Прежде всего Child–Pugh A, удовлетворительный ECOG; оценка и лечение варикозных вен пищевода/желудка до бевацизумаба, оценка риска кровотечений и irAE. Стадирование ГЦК предпочтительно BCLC, не только TNM I–IV.",url:"https://www.eviq.org.au/p/3881",sourceVersion:"eviQ №3881, v.5",checkedOn:"2026-11-21",safety:"До начала нужна ЭГДС для оценки вариксов в последние 6 месяцев и коррекция выявленного риска. Избегать режима при нелеченых, кровоточащих или высокорисковых вариксах. Оценить АД, протеинурию, риск кровотечения, функцию печени, почек и щитовидной железы."}
};
const NEXT_TREATMENT={
 c005:{
 I:{intro:["При раке ободочной кишки I стадии после R0-резекции адъювантная химиотерапия обычно не показана; при раке прямой кишки возможны другие подходы.","https://www.cancer.gov/types/colorectal/hp/colon-treatment-pdq"],regimens:[],surgery:{procedure:"Онкологическая сегментарная колэктомия с регионарной лимфодиссекцией; для ранних поражений с благоприятными критериями возможна эндоскопическая резекция. Для прямой кишки — локальная резекция либо TME по критериям риска.",limits:"Невозможность R0, высокий риск операции; при эндоскопической резекции неблагоприятная гистология требует пересмотра объёма.",url:"https://www.cancer.gov/types/colorectal/hp/colon-treatment-pdq"}},
 II:{regimens:[NEXT_REGIMENS.folfox],intro:["Только при раке ободочной кишки II стадии с отдельными факторами высокого риска и после обсуждения пользы/риска; не рутинно всем.","https://www.cancer.gov/types/colorectal/hp/colon-treatment-pdq"],surgery:{procedure:"Онкологическая колэктомия с регионарными лимфоузлами; при раке прямой кишки — TME с учётом предоперационного МР-стадирования.",limits:"Оценка R0, функционального риска и анатомии; не смешивать алгоритмы ободочной и прямой кишки.",url:"https://www.cancer.gov/types/colorectal/hp/colon-treatment-pdq"}},
 III:{regimens:[NEXT_REGIMENS.folfox],surgery:{procedure:"Онкологическая резекция поражённого сегмента ободочной кишки с регионарной лимфодиссекцией; для прямой кишки — TME в составе мультимодального лечения.",limits:"Операбельность и резектабельность индивидуальны; предоперационная терапия рака прямой кишки определяется отдельно.",url:"https://www.cancer.gov/types/colorectal/hp/colon-treatment-pdq"}},
 IV:{regimens:[NEXT_REGIMENS.folfiri],surgery:{procedure:"Резекция метастазов печени/лёгких и первичной опухоли при достижимости полного удаления у отобранных пациентов; паллиативная операция при обструкции, кровотечении, перфорации.",limits:"При бессимптомной первичной опухоли и нерезектабельных метастазах рутинная резекция не стандарт.",url:"https://www.cancer.gov/types/colorectal/hp/colon-treatment-pdq"}}
 },
 c006:{
 I:{regimens:[],surgery:{procedure:"Эндоскопическая резекция при строго соответствующем риске лимфогенного метастазирования либо субтотальная/тотальная гастрэктомия с лимфодиссекцией по показаниям.",limits:"Неблагоприятная гистология, глубокая инвазия или невозможность R0 ограничивают эндоскопическую тактику.",url:"https://www.cancer.gov/types/stomach/hp/stomach-treatment-pdq"}},
 II:{regimens:[NEXT_REGIMENS.flot],surgery:{procedure:"Дистальная субтотальная или тотальная гастрэктомия с D2-лимфодиссекцией при резектабельности, обычно в составе периоперационного лечения.",limits:"Перитонеальная диссеминация, нерезектабельность, невозможность R0, тяжёлый операционный риск.",url:"https://www.cancer.gov/types/stomach/hp/stomach-treatment-pdq"}},
 III:{regimens:[NEXT_REGIMENS.flot],surgery:{procedure:"Гастрэктомия необходимого объёма с D2-лимфодиссекцией после периоперационной терапии, если достижима R0-резекция.",limits:"При нерезектабельности операция с радикальной целью не показана; стадия III неоднородна.",url:"https://www.cancer.gov/types/stomach/hp/stomach-treatment-pdq"}},
 IV:{regimens:[],surgery:{procedure:"Паллиативное вмешательство при кровотечении, непроходимости или перфорации по показаниям.",limits:"Рутинная гастрэктомия при диссеминации не заменяет системную терапию.",url:"https://www.cancer.gov/types/stomach/hp/stomach-treatment-pdq"}}
 },
 c007:{
 I:{regimens:[],surgery:{procedure:"Эндоскопическая резекция при ранней поверхностной опухоли низкого риска либо эзофагэктомия с лимфодиссекцией по показаниям.",limits:"Глубокая инвазия, лимфоваскулярная инвазия и поражение узлов ограничивают эндоскопический подход.",url:"https://www.cancer.gov/types/esophageal/hp/esophageal-treatment-pdq"}},
 II:{regimens:[NEXT_REGIMENS.flot],intro:["FLOT относится к резектабельной аденокарциноме пищевода; не переносить на плоскоклеточный гистотип.","https://www.eviq.org.au/medical-oncology/upper-gastrointestinal/gastric-and-oesophageal-adjuvant-and-neoadjuvant/2038-gastric-gastroesophageal-and-oesophageal-neoa"],surgery:{procedure:"Эзофагэктомия с регионарной лимфодиссекцией после периоперационной терапии у операбельных пациентов.",limits:"Невозможность R0, неприемлемый кардиопульмональный риск; для плоскоклеточного рака возможна дефинитивная ХЛТ.",url:"https://www.cancer.gov/types/esophageal/hp/esophageal-treatment-pdq"}},
 III:{regimens:[NEXT_REGIMENS.flot],intro:["Только резектабельная аденокарцинома пищевода, не универсально для всей III стадии.","https://www.eviq.org.au/medical-oncology/upper-gastrointestinal/gastric-and-oesophageal-adjuvant-and-neoadjuvant/2038-gastric-gastroesophageal-and-oesophageal-neoa"],surgery:{procedure:"Эзофагэктомия с лимфодиссекцией после предоперационной терапии при достижимости R0; альтернативно дефинитивная ХЛТ в соответствующих ситуациях.",limits:"Нерезектабельность, тяжёлый функциональный риск, невозможность R0.",url:"https://www.cancer.gov/types/esophageal/hp/esophageal-treatment-pdq"}},
 IV:{regimens:[],surgery:{procedure:"Эндоскопическое стентирование/паллиативные вмешательства при дисфагии или осложнениях.",limits:"Радикальная эзофагэктомия при распространённой метастатической болезни обычно не показана.",url:"https://www.cancer.gov/types/esophageal/hp/esophageal-treatment-pdq"}}
 },
 c008:{
 I:{regimens:[NEXT_REGIMENS.pancreasAdj],intro:["Адъювантная схема только после резекции и при достаточном функциональном резерве; не применяется до операции как адъювантная.","https://www.cancer.gov/types/pancreatic/hp/pancreatic-treatment-pdq"],surgery:{procedure:"Панкреатодуоденальная резекция для головки; дистальная панкреатэктомия для тела/хвоста с регионарной лимфодиссекцией.",limits:"Недостаточный функциональный резерв, невозможность R0, нерезектабельное сосудистое вовлечение.",url:"https://www.cancer.gov/types/pancreatic/hp/pancreatic-treatment-pdq"}},
 II:{regimens:[NEXT_REGIMENS.pancreasAdj],intro:["Указанный режим адъювантный, после резекции; при пограничной резектабельности обсуждается иная неоадъювантная последовательность.","https://www.cancer.gov/types/pancreatic/hp/pancreatic-treatment-pdq"],surgery:{procedure:"Панкреатодуоденальная или дистальная резекция по локализации с оценкой сосудов и регионарной лимфодиссекцией.",limits:"Невозможность R0, тяжёлый операционный риск, нереконструируемое сосудистое вовлечение.",url:"https://www.cancer.gov/types/pancreatic/hp/pancreatic-treatment-pdq"}},
 III:{regimens:[],surgery:{procedure:"Операция только у отобранных пациентов после индукционной терапии и повторной оценки резектабельности в экспертном центре.",limits:"Нереконструируемое вовлечение артерий и невозможность R0; большинство местнораспространённых случаев первично нерезектабельны.",url:"https://www.cancer.gov/types/pancreatic/hp/pancreatic-treatment-pdq"}},
 IV:{regimens:[],surgery:{procedure:"Паллиативное билиарное/дуоденальное стентирование или обходной анастомоз при обструкции.",limits:"Радикальная резекция при отдалённых метастазах не является стандартом.",url:"https://www.cancer.gov/types/pancreatic/hp/pancreatic-treatment-pdq"}}
 },
 c009:{
 I:{regimens:[],intro:["Для ГЦК выбор лечения следует BCLC, функции печени и портальной гипертензии; TNM I–IV не задаёт терапию автоматически.","https://www.cancer.gov/types/liver/hp/adult-liver-treatment-pdq"],surgery:{procedure:"Анатомическая/неанатомическая резекция при солитарном очаге и достаточном остаточном функциональном объёме печени; трансплантация при соответствующих критериях, альтернатива — абляция.",limits:"Клинически значимая портальная гипертензия, декомпенсация функции печени, недостаточный остаточный объём.",url:"https://www.cancer.gov/types/liver/hp/adult-liver-treatment-pdq"}},
 II:{regimens:[],surgery:{procedure:"Резекция или трансплантация только по BCLC, опухолевой нагрузке и функции печени; при нерезектабельной ограниченной внутрипечёночной болезни — локорегионарная терапия.",limits:"Нельзя выбирать операцию по TNM II без Child–Pugh, портальной гипертензии и BCLC.",url:"https://www.cancer.gov/types/liver/hp/adult-liver-treatment-pdq"}},
 III:{regimens:[NEXT_REGIMENS.hcc],intro:["Системный режим только при нерезектабельной/распространённой ГЦК и подходящей функции печени; при BCLC B возможны локорегионарные методы.","https://www.cancer.gov/types/liver/hp/adult-liver-treatment-pdq"],surgery:{procedure:"Резекция лишь у строго отобранных пациентов в специализированном центре; чаще рассматриваются локорегионарная или системная терапия.",limits:"Макрососудистая инвазия, недостаточный печёночный резерв, отдалённое распространение и декомпенсация ограничивают операцию.",url:"https://www.cancer.gov/types/liver/hp/adult-liver-treatment-pdq"}},
 IV:{regimens:[NEXT_REGIMENS.hcc],surgery:{procedure:"Хирургия не является рутинным лечением распространённой ГЦК; вмешательства только по отдельным симптоматическим показаниям.",limits:"Отдалённые метастазы, плохой печёночный резерв и функциональный статус.",url:"https://www.cancer.gov/types/liver/hp/adult-liver-treatment-pdq"}}
 }
};
const STAGE_MNEMONICS={
 c001:{I:"Локальное лечение: резекция / SBRT; при показаниях — таргетная адъювантная терапия.",II:"Платина + антиметаболит; по биомаркерам — таргетная / иммунотерапия.",III:"Платина + антиметаболит ± иммунопрепарат; ХЛТ → консолидация.",IV:"Платина + антиметаболит + иммунопрепарат либо таргетный препарат."},
 c002:{I:"Резекция / SBRT; системная терапия не всем.",II:"Платина + таксан либо гемцитабин ± иммунопрепарат.",III:"Платина + таксан/этопозид + ЛТ; возможна консолидация иммунопрепаратом.",IV:"Платина + таксан/гемцитабин + иммунопрепарат."},
 c003:{I:"Отобранные T1–2N0: операция → платина + этопозид.",II:"Платина + этопозид + ЛТ.",III:"Платина + этопозид + ЛТ.",IV:"Платина + этопозид + иммунопрепарат."},
 c004:{I:"HR+: эндокринотерапия; HER2+: таксан + анти-HER2; при риске — таксан + алкилирующий.",II:"HER2+: таксан + платина + двойная анти-HER2; TNBC: таксан + платина + PD-1 → антрациклин + алкилирующий.",III:"Неоадъювантно: HER2+ — таксан + платина + анти-HER2; TNBC — таксан + платина + PD-1 → антрациклин + алкилирующий.",IV:"HR+: эндокринотерапия + CDK4/6; HER2+: анти-HER2; TNBC — терапия по PD-L1/BRCA."},
 c005:{I:"Резекция; цитостатики обычно не нужны.",II:"Резекция; при высоком риске — фторпиримидин ± платина.",III:"Фторпиримидин + платина (FOLFOX/CAPOX).",IV:"Фторпиримидин + иринотекан/платина ± анти-VEGF/анти-EGFR по биомаркерам."},
 c006:{I:"Эндоскопическая резекция / гастрэктомия; ХТ не всем.",II:"Антиметаболит + платина + таксан (FLOT) → операция → FLOT.",III:"Антиметаболит + платина + таксан (FLOT) → операция → FLOT при резектабельности.",IV:"Фторпиримидин + платина ± иммунопрепарат/анти-HER2 по биомаркерам."},
 c007:{I:"Эндоскопическая резекция / эзофагэктомия.",II:"Аденокарцинома: антиметаболит + платина + таксан (FLOT); плоскоклеточный — отдельная ХЛТ.",III:"Аденокарцинома: FLOT → операция; плоскоклеточный — ХЛТ ± операция.",IV:"Платина + фторпиримидин ± иммунопрепарат по гистотипу/биомаркерам."},
 c008:{I:"Резекция → фторпиримидин + платина + иринотекан (mFOLFIRINOX) у отобранных.",II:"Резекция → фторпиримидин + платина + иринотекан (mFOLFIRINOX) у отобранных.",III:"Системная терапия (фторпиримидин + платина + иринотекан либо гемцитабин + таксан) → повторная оценка.",IV:"Фторпиримидин + платина + иринотекан либо гемцитабин + таксан."},
 c009:{I:"Резекция / трансплантация / абляция; ориентир — BCLC.",II:"Резекция / трансплантация или локорегионарное лечение по BCLC.",III:"Локорегионарное лечение либо PD-L1 + анти-VEGF при нерезектабельности.",IV:"PD-L1 + анти-VEGF либо другие системные режимы по показаниям."}
};

const REMAINING_MNEMONICS={
  "c010": {
    "I": "Резекция по локализации при R0.",
    "II": "Резекция + адъювантный фторпиримидин при показаниях.",
    "III": "При резектабельности операция; иначе гемцитабин + платина ± иммунотерапия.",
    "IV": "Гемцитабин + платина + PD-L1 при показаниях."
  },
  "c011": {
    "I": "Частичная нефрэктомия при возможности.",
    "II": "Частичная/радикальная нефрэктомия; адъювантная PD-1 при высоком риске.",
    "III": "Нефрэктомия ± адъювантная PD-1 по риску.",
    "IV": "PD-1 + CTLA-4 либо PD-1 + TKI по IMDC."
  },
  "c012": {
    "I": "ТУР мочевого пузыря ± внутрипузырная терапия.",
    "II": "ТУР/радикальная цистэктомия по мышечной инвазии.",
    "III": "Платина + гемцитабин до цистэктомии при MIBC; либо органосохраняющая ХЛТ.",
    "IV": "Антитело–лекарственный конъюгат + PD-1 либо платина + гемцитабин по показаниям."
  },
  "c013": {
    "I": "Активное наблюдение / простатэктомия / ЛТ по риску.",
    "II": "Простатэктомия либо ЛТ ± андрогендепривация.",
    "III": "ЛТ + андрогендепривация ± интенсификация по риску.",
    "IV": "Андрогендепривация + ARPI ± таксан по гормоночувствительности."
  },
  "c014": {
    "I": "Орхиэктомия → наблюдение / адъювантная терапия по гистотипу.",
    "II": "Орхиэктомия → платина + этопозид ± блеомицин по IGCCCG.",
    "III": "Платина + этопозид ± блеомицин; остаточная опухоль — отдельная тактика."
  },
  "c015": {
    "I": "Гистерэктомия + придатки; адъювантная тактика по молекулярному риску.",
    "II": "Операция ± ЛТ/платина + таксан по риску.",
    "III": "Платина + таксан ± PD-1 при соответствующем распространении.",
    "IV": "Платина + таксан + PD-1 либо гормонотерапия/таргетная по биомаркерам."
  },
  "c016": {
    "I": "Стадирование/циторедукция ± платина + таксан по риску.",
    "II": "Циторедукция + платина + таксан.",
    "III": "Циторедукция → платина + таксан ± поддержка по BRCA/HRD.",
    "IV": "Платина + таксан → поддержка по BRCA/HRD; интервальная циторедукция по показаниям."
  },
  "c017": {
    "I": "Конизация/гистерэктомия по FIGO и риску.",
    "II": "Операция либо платина + ЛТ по размеру и узлам.",
    "III": "Платина + конкурентная ЛТ + брахитерапия.",
    "IV": "Платина + таксан + PD-1/анти-VEGF по показаниям."
  },
  "c018": {
    "I": "Широкое иссечение с оценкой сторожевых узлов.",
    "II": "Радикальная локальная резекция + пахово-бедренные узлы по показаниям.",
    "III": "Операция либо ХЛТ по резектабельности.",
    "IV": "Системная терапия/паллиативная ЛТ по клинической ситуации."
  },
  "c019": {
    "I": "Резекция или ЛТ; шейные узлы по показаниям.",
    "II": "Резекция + адъювантная ЛТ/ХЛТ по факторам риска.",
    "III": "Платина + конкурентная ЛТ либо операция + адъювантная терапия.",
    "IV": "PD-1 ± платина + фторпиримидин по PD-L1 и локализации."
  },
  "c020": {
    "I": "Тиреоидэктомия/лобэктомия по риску ± радиоактивный йод.",
    "II": "Операция ± радиоактивный йод по риску.",
    "III": "Операция/радиойод при йод-авидности; TKI при радиойод-рефрактерности.",
    "IV": "При радиойод-рефрактерности TKI либо таргетная терапия по драйверу."
  },
  "c021": {
    "I": "Тотальная тиреоидэктомия + оценка центральных узлов.",
    "II": "Тиреоидэктомия + регионарная лимфодиссекция по N-статусу.",
    "III": "Операция при резектабельности; RET-ингибитор при соответствующих показаниях.",
    "IV": "RET-ингибитор при RET-мутации либо мультикиназный ингибитор."
  },
  "c022": {
    "I": "Широкое иссечение ± сторожевой узел по Breslow.",
    "II": "Широкое иссечение + стадирование узлов; адъювантная PD-1 по риску.",
    "III": "Резекция + адъювантная PD-1 или BRAF/MEK при BRAF V600.",
    "IV": "PD-1 ± CTLA-4 либо BRAF + MEK при BRAF V600."
  },
  "c023": {
    "I": "Широкая резекция R0 ± ЛТ по риску.",
    "II": "Резекция R0 ± ЛТ; ХТ выборочно по гистотипу.",
    "III": "Резекция R0 + ЛТ ± антрациклин по риску.",
    "IV": "Антрациклин ± ифосфамид либо гистотип-специфическая терапия."
  },
  "c024": {
    "I": "Резекция R0 без разрыва капсулы; иматиниб по риску.",
    "II": "Резекция R0 ± адъювантный иматиниб при чувствительной мутации.",
    "III": "Резекция/неоадъювантный иматиниб при чувствительной мутации.",
    "IV": "Иматиниб при чувствительном KIT/PDGFRA; альтернативы по мутации и линии."
  },
  "c025": {
    "I": "Максимально безопасная резекция → ЛТ + темозоломид по показаниям.",
    "II": "Максимально безопасная резекция → ЛТ + темозоломид.",
    "III": "ЛТ + темозоломид после максимально безопасной резекции.",
    "IV": "Лечение рецидива индивидуально; TNM I–IV для глиобластомы неприменима."
  },
  "c026": {
    "I": "ABVD/AVD ± ЛТ по риску и ПЭТ-ответу.",
    "II": "ABVD/AVD ± ЛТ по группе риска.",
    "III": "BV-AVD либо PD-1 + AVD по показаниям/доступности.",
    "IV": "Стадия IV: системная AVD + BV/PD-1 по показаниям; хирургия не стандарт."
  },
  "c027": {
    "I": "R-CHOP-подобная иммунохимиотерапия по риску.",
    "II": "R-CHOP либо Pola-R-CHP по IPI и доступности.",
    "III": "R-CHOP / Pola-R-CHP; ЛТ на отдельные очаги по показаниям.",
    "IV": "R-CHOP / Pola-R-CHP; хирургия не стандарт."
  },
  "c028": {
    "I": "Наблюдение либо локальная ЛТ при низкой опухолевой нагрузке.",
    "II": "Локальная ЛТ / анти-CD20 ± химиотерапия по риску.",
    "III": "Наблюдение при низкой нагрузке либо анти-CD20 + химиотерапия.",
    "IV": "Анти-CD20 + химиотерапия/леналидомид по показаниям."
  },
  "c029": {
    "I": "Стадии I–IV TNM неприменимы; выбор по SLiM-CRAB, R-ISS.",
    "II": "Индукция: ингибитор протеасомы + IMiD + дексаметазон ± anti-CD38.",
    "III": "Индукция → ауто-ТГСК у подходящих → поддержка.",
    "IV": "При рецидиве комбинации anti-CD38/IMiD/ингибиторов протеасомы и клеточная терапия."
  },
  "c030": {
    "I": "TNM I–IV неприменима; терапия по ELN-риску и молекулярным маркерам.",
    "II": "Интенсивная индукция: цитарабин + антрациклин (7+3) у подходящих.",
    "III": "Консолидация цитарабином ± алло-ТГСК по риску.",
    "IV": "При рецидиве salvage/таргетная терапия и алло-ТГСК по показаниям."
  },
  "c031": {
    "I": "TNM I–IV неприменима; TKI по BCR::ABL1 и фазе ХМЛ.",
    "II": "Хроническая фаза: ингибитор BCR::ABL1 тирозинкиназы.",
    "III": "Контроль BCR::ABL1 по IS и смена TKI по ответу.",
    "IV": "Бластный криз: TKI + острый лейкоз-подобная терапия ± алло-ТГСК."
  },
  "c032": {
    "I": "Резекция первичной NET и регионарных узлов при локализации.",
    "II": "Резекция ± аналоги соматостатина по распространённости.",
    "III": "Аналог соматостатина ± PRRT/таргетная терапия по SSTR и прогрессированию.",
    "IV": "Аналог соматостатина / PRRT / таргетная терапия по SSTR, Ki-67 и нагрузке."
  },
  "c033": {
    "I": "Резекция NET ПЖ по размеру, grade, функциональности.",
    "II": "Резекция ± наблюдение/аналоги соматостатина по риску.",
    "III": "Аналоги соматостатина / таргетная / PRRT по SSTR и Ki-67.",
    "IV": "Системная тактика по grade, SSTR, симптомам, нагрузке и предлеченности."
  },
  "c034": {
    "I": "Локальная резекция только строго поверхностных поражений.",
    "II": "Митомицин + фторпиримидин + ЛТ при инвазивном плоскоклеточном раке.",
    "III": "Митомицин + фторпиримидин + ЛТ; операция спасения при персистенции.",
    "IV": "Платина + таксан либо PD-1 по линии и показаниям."
  },
  "c035": {
    "I": "Органосохраняющее иссечение/глансэктомия ± оценка узлов.",
    "II": "Частичная пенэктомия/органосохраняющая операция + стадирование узлов.",
    "III": "При массивном или двустороннем cN2 M0 неоадъювантная ХТ обсуждается индивидуально.",
    "IV": "cN3 M0: возможна неоадъювантная ХТ. M1: системная и паллиативная тактика."
  },
  "c036": {
    "I": "Ранняя резектабельная мезотелиома: мультимодальная тактика.",
    "II": "Платина + пеметрексед ± иммунотерапия по резектабельности.",
    "III": "Платина + пеметрексед либо PD-1 + CTLA-4 по гистотипу.",
    "IV": "PD-1 + CTLA-4 либо платина + пеметрексед по показаниям."
  },
  "c037": {
    "I": "Иссечение с контролем краёв / Mohs по риску.",
    "II": "Резекция ± ЛТ при высоком риске.",
    "III": "Резекция + ЛТ по показаниям; PD-1 при нерезектабельности.",
    "IV": "PD-1 при нерезектабельной/метастатической болезни."
  },
  "c038": {
    "I": "ЛТ первичной опухоли и регионарных узлов по стадии.",
    "II": "Радикальная ЛТ; добавление цисплатина и индукционной терапии по риску.",
    "III": "M0: радикальная ХЛТ; индукция гемцитабином и цисплатином у подходящих пациентов высокого риска.",
    "IV": "Гемцитабин + платина + PD-1 по показаниям."
  }
};
const REMAINING_SURGERY={
  "c010": {
    "procedure": "Резекция печени/желчных протоков по локализации, регионарная лимфодиссекция",
    "limits": "Невозможность R0, отдалённые метастазы, недостаточный остаточный объём печени",
    "url": "https://www.cancer.gov/types/liver/hp/bile-duct-treatment-pdq"
  },
  "c011": {
    "procedure": "Частичная или радикальная нефрэктомия по размеру и расположению; циторедуктивная операция строго выборочно",
    "limits": "Невозможность безопасной резекции, неприемлемый риск; при IV стадии решение после оценки ответа и прогноза",
    "url": "https://www.cancer.gov/types/kidney/hp/kidney-treatment-pdq"
  },
  "c012": {
    "procedure": "ТУР с детрузором в препарате при NMIBC; радикальная цистэктомия с тазовой лимфодиссекцией при MIBC",
    "limits": "Местная нерезектабельность, неприемлемый риск; при метастазах цистэктомия не рутинна",
    "url": "https://www.cancer.gov/types/bladder/hp/bladder-treatment-pdq"
  },
  "c013": {
    "procedure": "Радикальная простатэктомия с оценкой тазовых лимфоузлов по риску",
    "limits": "Ожидаемая польза ограничена коморбидностью/продолжительностью жизни; при M1 не стандарт",
    "url": "https://www.cancer.gov/types/prostate/hp/prostate-treatment-pdq"
  },
  "c014": {
    "procedure": "Радикальная паховая орхиэктомия; RPLND только по гистотипу, стадии и послехимиотерапевтической ситуации",
    "limits": "Трансскротальная биопсия не стандарт; при метастатической болезни не откладывать необходимую системную терапию",
    "url": "https://www.cancer.gov/types/testicular/hp/testicular-treatment-pdq"
  },
  "c015": {
    "procedure": "Гистерэктомия с двусторонней сальпингоофорэктомией и оценкой сторожевых узлов по риску",
    "limits": "Нерезектабельность, тяжёлый операционный риск; при IV стадии циторедукция только отобранным",
    "url": "https://www.cancer.gov/types/uterine/hp/endometrial-treatment-pdq"
  },
  "c016": {
    "procedure": "Гистерэктомия с придатками, оментэктомия, стадирование/полная циторедукция",
    "limits": "Невозможность полной циторедукции с приемлемой морбидностью; интервальная операция после ХТ по показаниям",
    "url": "https://www.cancer.gov/types/ovarian/hp/ovarian-epithelial-treatment-pdq"
  },
  "c017": {
    "procedure": "Конизация, трахелэктомия или гистерэктомия соответствующего объёма по FIGO; лимфоузлы по показаниям",
    "limits": "Местнораспространённый процесс обычно лечат ХЛТ; не выполнять радикальную операцию автоматически",
    "url": "https://www.cancer.gov/types/cervical/hp/cervical-treatment-pdq"
  },
  "c018": {
    "procedure": "Радикальная локальная резекция вульвы с отрицательными краями; сторожевой узел или пахово-бедренная лимфодиссекция по показаниям",
    "limits": "Невозможность R0 без чрезмерной морбидности; при нерезектабельности ХЛТ",
    "url": "https://www.cancer.gov/types/vulvar/hp/vulvar-treatment-pdq"
  },
  "c019": {
    "procedure": "Резекция первичной опухоли с шейной лимфодиссекцией по N-статусу и локализации",
    "limits": "Невозможность R0, неприемлемая функциональная утрата; при некоторых локализациях предпочтительна органосохраняющая ХЛТ",
    "url": "https://www.cancer.gov/types/head-and-neck/hp/adult/oropharyngeal-treatment-pdq"
  },
  "c020": {
    "procedure": "Лобэктомия либо тотальная тиреоидэктомия; центральная/латеральная лимфодиссекция только по показаниям",
    "limits": "Неоправданная тотальная тиреоидэктомия при низком риске; при диссеминации операция индивидуальна",
    "url": "https://www.cancer.gov/types/thyroid/hp/thyroid-treatment-pdq"
  },
  "c021": {
    "procedure": "Тотальная тиреоидэктомия с центральной лимфодиссекцией и латеральной при поражении узлов",
    "limits": "Невозможность R0, неприемлемый риск; радиоактивный йод неэффективен при медуллярном раке",
    "url": "https://www.cancer.gov/types/thyroid/hp/thyroid-treatment-pdq"
  },
  "c022": {
    "procedure": "Широкое иссечение с отступами по Breslow; сторожевой узел по показаниям",
    "limits": "Нерезектабельность/неприемлемый риск; рутинная полная лимфодиссекция после положительного сторожевого узла не обязательна",
    "url": "https://www.cancer.gov/types/skin/hp/melanoma-treatment-pdq"
  },
  "c023": {
    "procedure": "Широкая резекция саркомы единым блоком с отрицательными краями, сохранение конечности при возможности",
    "limits": "Невозможность R0, чрезмерная функциональная потеря; при IV стадии метастазэктомия только отобранным",
    "url": "https://www.cancer.gov/types/soft-tissue-sarcoma/hp/adult-soft-tissue-treatment-pdq"
  },
  "c024": {
    "procedure": "Резекция GIST с интактной псевдокапсулой, без рутинной лимфодиссекции",
    "limits": "Риск разрыва, невозможность R0; PDGFRA D842V нечувствительна к иматинибу",
    "url": "https://www.cancer.gov/types/soft-tissue-sarcoma/hp/gist-treatment-pdq"
  },
  "c025": {
    "procedure": "Максимально безопасная резекция с нейронавигацией/картированием по показаниям либо стереотаксическая биопсия",
    "limits": "Инфильтрация функционально значимых структур, невозможность безопасного удаления; WHO grade 4 не равен IV стадии TNM",
    "url": "https://www.cancer.gov/types/brain/hp/adult-brain-treatment-pdq"
  },
  "c026": {
    "procedure": "Эксцизионная биопсия лимфоузла для диагностики; лечебная резекция не применяется",
    "limits": "Хирургическая циторедукция не стандарт; стадии Ann Arbor/Lugano, а не TNM",
    "url": "https://www.cancer.gov/types/lymphoma/hp/adult-hodgkin-treatment-pdq"
  },
  "c027": {
    "procedure": "Биопсия опухоли для морфологии/ИГХ; лечебная резекция не стандарт",
    "limits": "Циторедуктивная операция не улучшает исходы рутинно; стадии Lugano",
    "url": "https://www.cancer.gov/types/lymphoma/hp/aggressive-b-cell-lymphoma-treatment-pdq"
  },
  "c028": {
    "procedure": "Биопсия лимфоузла; хирургическое удаление не является лечебной стратегией",
    "limits": "Стадии Lugano; необходимость терапии определяется также GELF/симптомами",
    "url": "https://www.cancer.gov/types/lymphoma/hp/indolent-b-cell-lymphoma-treatment-pdq"
  },
  "c029": {
    "procedure": "Биопсия костного мозга; ортопедическая стабилизация/декомпрессия только при осложнениях",
    "limits": "Циторедуктивная операция не лечит системную миелому; TNM I–IV не использовать",
    "url": "https://www.cancer.gov/types/myeloma/hp/myeloma-treatment-pdq"
  },
  "c030": {
    "procedure": "Биопсия/аспирация костного мозга; хирургическое лечение лейкоза отсутствует",
    "limits": "Нет хирургической циторедукции; классификация по ELN, генетике и ответу, не TNM",
    "url": "https://www.cancer.gov/types/leukemia/hp/adult-aml-treatment-pdq"
  },
  "c031": {
    "procedure": "Хирургическое лечение ХМЛ не применяется",
    "limits": "Стадирование: хроническая, акселерация, бластная фазы; TNM I–IV не использовать",
    "url": "https://www.cancer.gov/types/leukemia/hp/cml-treatment-pdq"
  },
  "c032": {
    "procedure": "Резекция сегмента тонкой кишки с мезентериальными лимфоузлами; оценка мультифокальности",
    "limits": "Невозможность безопасной резекции при сосудистом вовлечении мезентерия; при метастазах индивидуальная циторедукция",
    "url": "https://www.cancer.gov/types/gi-carcinoid-tumors/hp/gi-carcinoid-treatment-pdq"
  },
  "c033": {
    "procedure": "Энуклеация или анатомическая резекция поджелудочной железы с оценкой лимфоузлов по риску",
    "limits": "Невозможность R0, функциональный риск; NET G3 и NEC имеют разные схемы",
    "url": "https://www.cancer.gov/types/pancreatic/hp/pnet-treatment-pdq"
  },
  "c034": {
    "procedure": "Хирургия ограничена локальным иссечением ранних поверхностных очагов или спасительной брюшно-промежностной экстирпацией после неудачи ХЛТ",
    "limits": "Рутинная первичная экстирпация при локализованном инвазивном раке не стандарт",
    "url": "https://www.cancer.gov/types/anal/hp/anal-treatment-pdq"
  },
  "c035": {
    "procedure": "Органосохраняющая резекция или пенэктомия по T; динамическая биопсия сторожевых узлов/паховая лимфодиссекция по N",
    "limits": "Невозможность R0, нерезектабельные пахово-тазовые узлы, тяжёлый риск",
    "url": "https://www.cancer.gov/types/penile/hp/penile-treatment-pdq"
  },
  "c036": {
    "procedure": "Плеврэктомия/декортикация только у строго отобранных пациентов экспертного центра",
    "limits": "Экстраплевральная пневмонэктомия не рутинный стандарт; при распространении операция не показана",
    "url": "https://www.cancer.gov/types/mesothelioma/hp/mesothelioma-treatment-pdq"
  },
  "c037": {
    "procedure": "Широкое иссечение с гистологическим контролем краёв либо микрографическая хирургия Mohs",
    "limits": "Невозможность R0 без значимого ущерба; при нерезектабельности системная PD-1",
    "url": "https://www.cancer.gov/types/skin/hp/skin-treatment-pdq"
  },
  "c038": {
    "procedure": "Диагностическая биопсия; лечебная резекция первичной опухоли не стандарт",
    "limits": "Основное лечение — ЛТ/ХЛТ; операция возможна как спасительная при локальном рецидиве",
    "url": "https://www.cancer.gov/types/head-and-neck/hp/adult/nasopharyngeal-treatment-pdq"
  }
};

const BILIARY_ADJUVANT_CAPECITABINE = {
 regimen:"BILCAP — адъювантный капецитабин после макроскопически полной резекции холангиокарциномы (R0/R1)",
 drugs:["Капецитабин — 1250 мг/м² внутрь 2 раза в сутки, дни 1–14; принимать в течение 30 минут после еды"],
 cycle:"Каждые 21 день, 8 циклов (около 6 месяцев); начинать после восстановления от операции.",
 notes:"Для резецированного рака желчных путей, в том числе II стадии, при ECOG 0–1 и удовлетворительном восстановлении. В BILCAP включались R0 и R1. До начала проверить DPD/DPYD по применимому стандарту; контролировать ОАК, функцию почек и печени, диарею, мукозит и ладонно-подошвенный синдром. При сниженной функции почек требуется коррекция или выбор альтернативы. При R1 внепечёночной холангиокарциноме отдельно обсуждать химиолучевую терапию.",
 url:"https://www.eviq.org.au/medical-oncology/upper-gastrointestinal/pancreas-and-biliary/3385-biliary-and-gallbladder-adjuvant-capecitabine"
};
const VERIFIED_REGIMENS_2026 = {
 biliaryInduction:{regimen:"TOPAZ-1: первая линия нерезектабельной/метастатической холангиокарциномы — индукция",drugs:["Дурвалумаб — 1500 мг в/в, день 1","Гемцитабин — 1000 мг/м² в/в, дни 1 и 8","Цисплатин — 25 мг/м² в/в, дни 1 и 8"],cycle:"Каждые 21 день; максимум 8 циклов, затем поддержка дурвалумабом отдельно.",notes:"ECOG 0–1; не для ампулярной карциномы. В протоколе eviQ исключён клиренс креатинина <50 мл/мин. Контроль ОАК, функции почек, слуха, нейропатии, инфекций желчных путей и иммуноопосредованной токсичности.",url:"https://www.eviq.org.au/medical-oncology/upper-gastrointestinal/pancreas-and-biliary/4301-biliary-and-gallbladder-advanced-cisplatin-g"},
 biliaryMaintenance:{regimen:"TOPAZ-1: поддержка после 8 циклов индукции",drugs:["Дурвалумаб — 1500 мг в/в, день 1"],cycle:"Каждые 28 дней; до прогрессирования или неприемлемой токсичности.",notes:"Только после индукционной части режима; не самостоятельная первая линия. Мониторинг иммуноопосредованных нежелательных явлений.",url:"https://www.eviq.org.au/medical-oncology/upper-gastrointestinal/pancreas-and-biliary/4301-biliary-and-gallbladder-advanced-cisplatin-g"},
 evPembro:{regimen:"EV-302: первая линия местнораспространённого нерезектабельного/метастатического уротелиального рака",drugs:["Энфортумаб ведотин — 1,25 мг/кг в/в, дни 1 и 8 (максимум 125 мг на введение)","Пембролизумаб — 200 мг в/в, день 1"],cycle:"Каждые 21 день; до прогрессирования/неприемлемой токсичности. Пембролизумаб — максимум 35 циклов, энфортумаб ведотин — без фиксированного максимума циклов.",notes:"Ранее нелеченый местнораспространённый/метастатический уротелиальный рак, ECOG 0–2. Исключения eviQ: нейропатия ≥2 степени, неконтролируемый диабет, активный кератит/язвы роговицы. Контроль тяжёлых кожных реакций, гликемии и irAE.",url:"https://www.eviq.org.au/medical-oncology/urogenital/bladder-and-urothelial/4427-bladder-urothelial-locally-advanced-or-metast"}
};
const VERIFIED_TREATMENT_2026={
 c010:{I:{intro:["Адъювантная терапия после макроскопически полной резекции обсуждается по послеоперационному риску, а не только TNM.","https://www.eviq.org.au/medical-oncology/upper-gastrointestinal/pancreas-and-biliary/3385-biliary-and-gallbladder-adjuvant-capecitabine"],regimens:[BILIARY_ADJUVANT_CAPECITABINE]},II:{intro:["После R0/R1-резекции холангиокарциномы: адъювантный капецитабин; при нерезектабельной II стадии этот послеоперационный режим неприменим.","https://www.eviq.org.au/medical-oncology/upper-gastrointestinal/pancreas-and-biliary/3385-biliary-and-gallbladder-adjuvant-capecitabine"],regimens:[BILIARY_ADJUVANT_CAPECITABINE]},III:{intro:["Только нерезектабельный местнораспространённый процесс при подходящем ECOG; при резектабельной III стадии первична хирургическая оценка.","https://www.eviq.org.au/medical-oncology/upper-gastrointestinal/pancreas-and-biliary/4301-biliary-and-gallbladder-advanced-cisplatin-g"],regimens:[VERIFIED_REGIMENS_2026.biliaryInduction,VERIFIED_REGIMENS_2026.biliaryMaintenance]},IV:{regimens:[VERIFIED_REGIMENS_2026.biliaryInduction,VERIFIED_REGIMENS_2026.biliaryMaintenance]}},
 c012:{IV:{intro:["Только нерезектабельный местнораспространённый или метастатический уротелиальный рак, ранее не получавший системную терапию по поводу распространённого заболевания.","https://www.eviq.org.au/medical-oncology/urogenital/bladder-and-urothelial/4427-bladder-urothelial-locally-advanced-or-metast"],regimens:[VERIFIED_REGIMENS_2026.evPembro]}}
};

const AUDITED_10_REGIMENS={
  "c013": {
    "IV": [
      {
        "regimen": "Доцетаксел + преднизолон — метастатический кастрационно-резистентный РПЖ",
        "drugs": [
          "Доцетаксел 75 мг/м² в/в, день 1",
          "Преднизолон 10 мг внутрь ежедневно, дни 1–21 (либо 5 мг дважды/сут)"
        ],
        "cycle": "21 день, до прогрессирования или неприемлемой токсичности, не более 10 циклов.",
        "notes": "Только mCRPC при продолжении андрогендепривации; при гормоночувствительном заболевании преднизолон не обязателен, используется другой алгоритм. Премедикация дексаметазоном, контроль нейтропении, нейропатии, функции печени.",
        "url": "https://www.eviq.org.au/medical-oncology/urogenital/prostate/249-prostate-metastatic-docetaxel-three-weekly-and"
      }
    ]
  },
  "c014": {
    "I": [
      {
        "regimen": "Адъювантная BEP — несеминомная герминогенная опухоль яичка I стадии при показаниях",
        "drugs": [
          "Блеомицин 30 000 МЕ в/в или в/м, дни 1, 8, 15",
          "Этопозид 100 мг/м² в/в, дни 1–5",
          "Цисплатин 20 мг/м² в/в, дни 1–5",
          "Пэгфилграстим 6 мг п/к, день 6 — по показаниям"
        ],
        "cycle": "При выборе адъювантной ХТ EAU рекомендует 1 цикл. В протоколе eviQ указано 1 или 2 цикла. Для данной карточки основной вариант — 1 цикл.",
        "notes": "При клинической I стадии несеминомы после орхиэктомии, если выбрана адъювантная ХТ. Ключевые факторы — лимфоваскулярная инвазия и возможность активного наблюдения. До лечения обсудить сохранение фертильности, оценить почки, лёгкие и слух.",
        "reference": [
          "EAU, тактика при герминогенных опухолях",
          "https://uroweb.org/guidelines/testicular-cancer/chapter/disease-management"
        ],
        "url": "https://www.eviq.org.au/medical-oncology/urogenital/testicular/319-testicular-germ-cell-non-seminoma-adjuvant-bep"
      }
    ],
    "II": [
      {
        "regimen": "BEP — метастатическая герминогенная опухоль яичка по группе прогноза IGCCCG",
        "drugs": [
          "Блеомицин 30 000 МЕ в/в или в/м, дни 1, 8, 15",
          "Этопозид 100 мг/м² в/в, дни 1–5",
          "Цисплатин 20 мг/м² в/в, дни 1–5",
          "Пэгфилграстим 6 мг п/к, день 6 — по показаниям"
        ],
        "cycle": "21 день; 3 цикла при благоприятном прогнозе, 4 при промежуточном/неблагоприятном.",
        "notes": "Количество циклов определяется IGCCCG, не номером TNM. Блеомицин противопоказан/нежелателен при отдельных лёгочных рисках; оценить альтернативу EP/VIP.",
        "url": "https://www.eviq.org.au/medical-oncology/urogenital/testicular/320-testicular-germ-cell-metastatic-bep-bleomycin"
      }
    ],
    "III": [
      {
        "regimen": "BEP — метастатическая герминогенная опухоль яичка по группе прогноза IGCCCG",
        "drugs": [
          "Блеомицин 30 000 МЕ в/в или в/м, дни 1, 8, 15",
          "Этопозид 100 мг/м² в/в, дни 1–5",
          "Цисплатин 20 мг/м² в/в, дни 1–5",
          "Пэгфилграстим 6 мг п/к, день 6 — по показаниям"
        ],
        "cycle": "21 день; 3 цикла при благоприятном прогнозе, 4 при промежуточном/неблагоприятном.",
        "notes": "Количество циклов определяется IGCCCG, не номером TNM. Блеомицин противопоказан/нежелателен при отдельных лёгочных рисках; оценить альтернативу EP/VIP.",
        "url": "https://www.eviq.org.au/medical-oncology/urogenital/testicular/320-testicular-germ-cell-metastatic-bep-bleomycin"
      }
    ]
  },
  "c015": {
    "III": [
      {
        "regimen": "Паклитаксел + карбоплатин — распространённый или рецидивный рак эндометрия",
        "drugs": [
          "Паклитаксел 175 мг/м² в/в, день 1",
          "Карбоплатин AUC 5 в/в, день 1 (формула Calvert)"
        ],
        "cycle": "21 день; обычно 6 циклов, до прогрессирования/неприемлемой токсичности.",
        "notes": "FIGO III–IV при соответствующих показаниях или рецидив; выбор добавления иммунопрепарата по MMR и показаниям рассматривается отдельно. ECOG 0–2, премедикация таксана, контроль нейропатии/миелосупрессии.",
        "url": "https://www.eviq.org.au/medical-oncology/gynaecological/endometrial/708-endometrial-recurrent-or-metastatic-carboplati"
      }
    ],
    "IV": [
      {
        "regimen": "Паклитаксел + карбоплатин — распространённый или рецидивный рак эндометрия",
        "drugs": [
          "Паклитаксел 175 мг/м² в/в, день 1",
          "Карбоплатин AUC 5 в/в, день 1 (формула Calvert)"
        ],
        "cycle": "21 день; обычно 6 циклов, до прогрессирования/неприемлемой токсичности.",
        "notes": "FIGO III–IV при соответствующих показаниях или рецидив; выбор добавления иммунопрепарата по MMR и показаниям рассматривается отдельно. ECOG 0–2, премедикация таксана, контроль нейропатии/миелосупрессии.",
        "url": "https://www.eviq.org.au/medical-oncology/gynaecological/endometrial/708-endometrial-recurrent-or-metastatic-carboplati"
      }
    ]
  },
  "c017": {
    "II": [
      {
        "regimen": "Конкурентная химиолучевая терапия: цисплатин еженедельно — местнораспространённый плоскоклеточный РШМ",
        "drugs": [
          "Цисплатин 40 мг/м² в/в, день 1 каждого 7-дневного цикла, до сеанса ЛТ"
        ],
        "cycle": "7 дней, обычно 5–6 циклов на фоне наружной ЛТ с обязательной брахитерапией по показаниям.",
        "notes": "Для местнораспространённого плоскоклеточного рака; не автоматически для всех II стадий. Оценка функции почек, гидратация, антиэметики, контроль слуха и нейропатии.",
        "url": "https://www.eviq.org.au/medical-oncology/gynaecological/cervical/336-cervical-locally-advanced-scc-cisplatin-weekl"
      }
    ],
    "III": [
      {
        "regimen": "Конкурентная химиолучевая терапия: цисплатин еженедельно — местнораспространённый плоскоклеточный РШМ",
        "drugs": [
          "Цисплатин 40 мг/м² в/в, день 1 каждого 7-дневного цикла, до сеанса ЛТ"
        ],
        "cycle": "7 дней, обычно 5–6 циклов на фоне наружной ЛТ с обязательной брахитерапией по показаниям.",
        "notes": "Для местнораспространённого плоскоклеточного рака; не автоматически для всех II стадий. Оценка функции почек, гидратация, антиэметики, контроль слуха и нейропатии.",
        "url": "https://www.eviq.org.au/medical-oncology/gynaecological/cervical/336-cervical-locally-advanced-scc-cisplatin-weekl"
      }
    ]
  },
  "c018": {
    "III": [
      {
        "regimen": "Цисплатин еженедельно с лучевой терапией — местнораспространённый плоскоклеточный рак вульвы",
        "drugs": [
          "Цисплатин 40 мг/м² в/в, день 1 каждого 7-дневного цикла, перед ЛТ"
        ],
        "cycle": "7 дней, обычно 5–6 циклов в период лучевой терапии.",
        "notes": "При нерезектабельном процессе или выбранной органосохраняющей ХЛТ; доказательная база ограничена. При eGFR 30–44 мл/мин/1,73 м² eviQ рекомендует избегать цисплатина.",
        "url": "https://www.eviq.org.au/medical-oncology/gynaecological/vulval/1529-vulval-scc-locally-advanced-cisplatin-weekly"
      }
    ]
  },
  "c019": {
    "III": [
      {
        "regimen": "Дефинитивная ХЛТ: цисплатин каждые 3 недели — местнораспространённый ПРГШ",
        "drugs": [
          "Цисплатин 100 мг/м² в/в, день 1 каждого 21-дневного цикла, одновременно с ЛТ"
        ],
        "cycle": "21 день, 3 цикла на фоне радикальной ЛТ.",
        "notes": "Только при выборе дефинитивной ХЛТ и достаточной функции почек/слуха; не смешивать с послеоперационным режимом или режимом для носоглотки.",
        "url": "https://www.eviq.org.au/medical-oncology/head-and-neck/definitive-chemoradiation/291-head-and-neck-scc-locally-advanced-definitive"
      }
    ]
  },
  "c020": {
    "III": [
      {
        "regimen": "Ленватиниб — прогрессирующий радиойод-рефрактерный дифференцированный РЩЖ",
        "drugs": [
          "Ленватиниб 24 мг внутрь 1 раз в сутки, ежедневно"
        ],
        "cycle": "Непрерывно до прогрессирования или неприемлемой токсичности.",
        "notes": "Только прогрессирующий радиойод-рефрактерный местнораспространённый/метастатический дифференцированный рак; оценить альтернативную таргетную терапию по драйверу. Контроль АД, протеинурии, функции щитовидной железы и риска кровотечений.",
        "url": "https://www.eviq.org.au/getmedia/ecd789f3-c66b-4ffe-a738-5d5d10c4f490/ID-1919-Thyroid-locally-advanced-or-metastatic-leNVAtinib-protocol-and-PI.pdf.aspx"
      }
    ],
    "IV": [
      {
        "regimen": "Ленватиниб — прогрессирующий радиойод-рефрактерный дифференцированный РЩЖ",
        "drugs": [
          "Ленватиниб 24 мг внутрь 1 раз в сутки, ежедневно"
        ],
        "cycle": "Непрерывно до прогрессирования или неприемлемой токсичности.",
        "notes": "Только прогрессирующий радиойод-рефрактерный местнораспространённый/метастатический дифференцированный рак; оценить альтернативную таргетную терапию по драйверу. Контроль АД, протеинурии, функции щитовидной железы и риска кровотечений.",
        "url": "https://www.eviq.org.au/getmedia/ecd789f3-c66b-4ffe-a738-5d5d10c4f490/ID-1919-Thyroid-locally-advanced-or-metastatic-leNVAtinib-protocol-and-PI.pdf.aspx"
      }
    ]
  },
  "c022": {
    "IV": [
      {
        "regimen": "Ипилимумаб + ниволумаб — индукция при нерезектабельной/метастатической меланоме",
        "drugs": [
          "Ниволумаб 1 мг/кг в/в, день 1",
          "Ипилимумаб 3 мг/кг в/в, день 1"
        ],
        "cycle": "21 день, 4 цикла; затем отдельная поддерживающая терапия ниволумабом.",
        "notes": "Высокий риск иммуноопосредованной токсичности; рассмотреть альтернативное соотношение доз по показаниям. Не заменять этим адъювантный режим при резецированной III стадии.",
        "url": "https://www.eviq.org.au/medical-oncology/skin/melanoma-metastatic/1694-melanoma-metastatic-ipilimumab-and-nivolumab"
      },
      {
        "regimen": "Ниволумаб — поддержка после 4 циклов ипилимумаба + ниволумаба",
        "drugs": [
          "Ниволумаб 480 мг в/в, день 1"
        ],
        "cycle": "28 дней; до прогрессирования или неприемлемой токсичности; возможно прекращение после 2 лет по клинической оценке.",
        "notes": "Начать через 6 недель после последнего введения индукции при 4-недельном графике. Мониторинг irAE.",
        "url": "https://www.eviq.org.au/getmedia/2be59fa1-f1e4-4177-a01d-2a69e04e0b23/ID-3677-Metastatic-nivolumab-maintenance-flat-dosing-following-ipilimumab-and-nivolumab-protocol-and-PI.pdf.aspx"
      }
    ]
  }
};
const SECOND_PASS_REGIMENS={
 c016:{II:[{regimen:"Паклитаксел + карбоплатин — эпителиальный рак яичников II стадии после хирургического стадирования/циторедукции",drugs:["Паклитаксел — 175 мг/м² в/в, день 1","Карбоплатин — AUC 5 в/в, день 1 (доза по формуле Calvert; AUC 6 возможна при сохранном функциональном статусе)"],cycle:"Каждые 21 день; обычно 6 циклов.",notes:"При эпителиальном раке яичников II стадии с показаниями к адъювантной химиотерапии. Контроль функции почек, ОАК, нейропатии; премедикация паклитаксела. Поддерживающая терапия определяется отдельно по BRCA/HRD и клиническим показаниям.",url:"https://www.eviq.org.au/medical-oncology/gynaecological/ovarian/252-ovarian-advanced-carboplatin-and-paclitaxel-th"}]},
 c021:{III:[{regimen:"Селперкатиниб — нерезектабельный распространённый RET-мутированный медуллярный рак щитовидной железы, требующий системной терапии",drugs:["При массе тела ≥50 кг: селперкатиниб — 160 мг внутрь 2 раза в сутки","При массе тела <50 кг: селперкатиниб — 120 мг внутрь 2 раза в сутки"],cycle:"Непрерывно, до прогрессирования или неприемлемой токсичности.",notes:"Только при подтверждённой RET-мутации и необходимости системного лечения; III стадия сама по себе не показание. Перед лечением и в динамике: АЛТ/АСТ, АД, ЭКГ/QTc и электролиты; оценить взаимодействия препаратов.",url:"https://www.fda.gov/drugs/cancer-approvals/fda-approves-selpercatinib-medullary-thyroid-cancer-ret-mutation"}],IV:[{regimen:"Селперкатиниб — распространённый/метастатический RET-мутированный медуллярный рак щитовидной железы",drugs:["При массе тела ≥50 кг: селперкатиниб — 160 мг внутрь 2 раза в сутки","При массе тела <50 кг: селперкатиниб — 120 мг внутрь 2 раза в сутки"],cycle:"Непрерывно, до прогрессирования или неприемлемой токсичности.",notes:"RET-мутация обязательна; лечение при прогрессирующем/симптомном заболевании, требующем системной терапии, не при стабильном бессимптомном течении автоматически. Контроль АЛТ/АСТ, АД, QTc, лекарственных взаимодействий.",url:"https://www.fda.gov/drugs/cancer-approvals/fda-approves-selpercatinib-medullary-thyroid-cancer-ret-mutation"}]}
};
const THIRD_PASS_REGIMENS={
  "c017": {
    "IV": [
      {
        "regimen": "KEYNOTE-826 — индукция, персистирующий/рецидивный/метастатический рак шейки матки",
        "drugs": [
          "Пембролизумаб — 200 мг в/в, день 1",
          "Бевацизумаб — 15 мг/кг в/в, день 1",
          "Паклитаксел — 175 мг/м² в/в, день 1",
          "Карбоплатин — AUC 5 в/в, день 1 (Calvert)"
        ],
        "cycle": "Каждые 21 день; 6 циклов индукции, затем отдельная поддержка.",
        "notes": "Первая линия заболевания, не подлежащего радикальному лечению; ECOG 0–1; для пембролизумаба учитывать PD-L1 CPS (при CPS <1 польза не определена). Бевацизумаб не применять при значимом риске свищей, перфорации, кровотечений; контролировать АД, функцию почек, нейропатию и irAE.",
        "url": "https://www.eviq.org.au/medical-oncology/gynaecological/cervical/4169-cervical-recurrent-or-metastatic-carboplatin"
      },
      {
        "regimen": "KEYNOTE-826 — поддержка после 6 циклов индукции",
        "drugs": [
          "Пембролизумаб — 200 мг в/в, день 1",
          "Бевацизумаб — 15 мг/кг в/в, день 1"
        ],
        "cycle": "Каждые 21 день; до прогрессирования/неприемлемой токсичности, пембролизумаб максимум 35 циклов суммарно с индукцией.",
        "notes": "Продолжение после индукции у подходящих пациенток; бевацизумаб не обязателен при противопоказаниях и не должен автоматически назначаться всем. Следить за irAE, протеинурией, АД и риском свищей.",
        "url": "https://www.eviq.org.au/medical-oncology/gynaecological/cervical/4169-cervical-recurrent-or-metastatic-carboplatin"
      }
    ]
  },
  "c019": {
    "IV": [
      {
        "regimen": "KEYNOTE-048 — индукция, первая линия рецидивного/метастатического плоскоклеточного рака головы и шеи",
        "drugs": [
          "Пембролизумаб — 200 мг в/в, день 1",
          "Карбоплатин — AUC 5 в/в, день 1 (Calvert)",
          "Фторурацил — 4000 мг/м² в/в непрерывно за 96 часов, начиная в день 1 (1000 мг/м²/сут × 4 суток)"
        ],
        "cycle": "Каждые 21 день; 6 циклов, затем отдельная поддержка пембролизумабом.",
        "notes": "Первая линия рецидивного/метастатического плоскоклеточного рака головы и шеи при ECOG 0–1; рецидив более чем через 6 месяцев после предшествующей платины. До фторурацила оценить DPD/DPYD; необходим центральный венозный доступ и контроль irAE.",
        "url": "https://www.eviq.org.au/medical-oncology/head-and-neck/recurrent-or-metastatic/3982-head-and-neck-scc-recurrent-or-metastatic-car"
      },
      {
        "regimen": "KEYNOTE-048 — поддержка после 6 циклов",
        "drugs": [
          "Пембролизумаб — 200 мг в/в, день 1"
        ],
        "cycle": "Каждые 21 день, максимум 35 циклов суммарно с индукцией; альтернативно с цикла 7 — 400 мг каждые 42 дня.",
        "notes": "Только продолжение начатого режима у пациентов с клинической пользой, до прогрессирования или неприемлемой токсичности.",
        "url": "https://www.eviq.org.au/medical-oncology/head-and-neck/recurrent-or-metastatic/3982-head-and-neck-scc-recurrent-or-metastatic-car"
      }
    ]
  }
};
const FOURTH_PASS_REGIMENS={
  "c023": {
    "III": [
      {
        "regimen": "Доксорубицин — первая линия нерезектабельной/метастатической саркомы мягких тканей",
        "drugs": [
          "Доксорубицин — 75 мг/м² в/в, день 1",
          "Пэгфилграстим — 6 мг подкожно, день 2 (по протоколу eviQ, не ранее 24 ч после ХТ)"
        ],
        "cycle": "Каждые 21 день; до прогрессирования/неприемлемой токсичности, не более 6 циклов.",
        "notes": "Для взрослых с нерезектабельной/метастатической саркомой мягких тканей, когда показана антрациклиновая терапия. Не универсально для всех гистотипов; перед лечением оценить ФВ ЛЖ, кумулятивную дозу антрациклинов и функции органов.",
        "url": "https://www.eviq.org.au/medical-oncology/sarcoma/soft-tissue-sarcoma/1554-soft-tissue-sarcoma-locally-advanced-or-metas"
      }
    ],
    "IV": [
      {
        "regimen": "Доксорубицин — первая линия нерезектабельной/метастатической саркомы мягких тканей",
        "drugs": [
          "Доксорубицин — 75 мг/м² в/в, день 1",
          "Пэгфилграстим — 6 мг подкожно, день 2 (по протоколу eviQ, не ранее 24 ч после ХТ)"
        ],
        "cycle": "Каждые 21 день; до прогрессирования/неприемлемой токсичности, не более 6 циклов.",
        "notes": "Для взрослых с нерезектабельной/метастатической саркомой мягких тканей, когда показана антрациклиновая терапия. Не универсально для всех гистотипов; перед лечением оценить ФВ ЛЖ, кумулятивную дозу антрациклинов и функции органов.",
        "url": "https://www.eviq.org.au/medical-oncology/sarcoma/soft-tissue-sarcoma/1554-soft-tissue-sarcoma-locally-advanced-or-metas"
      }
    ]
  },
  "c024": {
    "I": [
      {
        "regimen": "Адъювантный иматиниб — GIST высокого риска после R0/R1-резекции с чувствительной мутацией",
        "drugs": [
          "Иматиниб — 400 мг внутрь 1 раз в сутки ежедневно, с пищей"
        ],
        "cycle": "Непрерывно 3 года (36 месяцев) при высоком риске рецидива и чувствительном молекулярном профиле.",
        "notes": "Только при высоком риске и чувствительных KIT/PDGFRA-вариантах. PDGFRA D842V резистентна; обязательна молекулярная характеристика. Не назначать всем пациентам I–III стадии автоматически.",
        "url": "https://www.eviq.org.au/medical-oncology/upper-gastrointestinal/gastrointestinal-stromal-cell-tumours/1222-gastrointestinal-stromal-cell-tumour-gist-a"
      }
    ],
    "II": [
      {
        "regimen": "Адъювантный иматиниб — GIST высокого риска после R0/R1-резекции с чувствительной мутацией",
        "drugs": [
          "Иматиниб — 400 мг внутрь 1 раз в сутки ежедневно, с пищей"
        ],
        "cycle": "Непрерывно 3 года (36 месяцев) при высоком риске рецидива и чувствительном молекулярном профиле.",
        "notes": "Только при высоком риске и чувствительных KIT/PDGFRA-вариантах. PDGFRA D842V резистентна; обязательна молекулярная характеристика. Не назначать всем пациентам I–III стадии автоматически.",
        "url": "https://www.eviq.org.au/medical-oncology/upper-gastrointestinal/gastrointestinal-stromal-cell-tumours/1222-gastrointestinal-stromal-cell-tumour-gist-a"
      }
    ],
    "III": [
      {
        "regimen": "Адъювантный иматиниб — GIST высокого риска после R0/R1-резекции с чувствительной мутацией",
        "drugs": [
          "Иматиниб — 400 мг внутрь 1 раз в сутки ежедневно, с пищей"
        ],
        "cycle": "Непрерывно 3 года (36 месяцев) при высоком риске рецидива и чувствительном молекулярном профиле.",
        "notes": "Только при высоком риске и чувствительных KIT/PDGFRA-вариантах. PDGFRA D842V резистентна; обязательна молекулярная характеристика. Не назначать всем пациентам I–III стадии автоматически.",
        "url": "https://www.eviq.org.au/medical-oncology/upper-gastrointestinal/gastrointestinal-stromal-cell-tumours/1222-gastrointestinal-stromal-cell-tumour-gist-a"
      }
    ],
    "IV": [
      {
        "regimen": "Иматиниб — первая линия нерезектабельной/метастатической GIST с чувствительной мутацией",
        "drugs": [
          "Иматиниб — 400 мг внутрь 1 раз в сутки ежедневно, с пищей"
        ],
        "cycle": "Непрерывно до прогрессирования или неприемлемой токсичности.",
        "notes": "Подтвердить чувствительный KIT/PDGFRA генотип. При KIT exon 9 могут требоваться другие дозы; PDGFRA D842V требует иной таргетной стратегии. Не прекращать эффективный иматиниб произвольно.",
        "url": "https://www.eviq.org.au/medical-oncology/upper-gastrointestinal/gastrointestinal-stromal-cell-tumours/330-gastrointestinal-stromal-cell-tumour-gist-me"
      }
    ]
  },
  "c026": {
    "I": [
      {
        "regimen": "ABVD — ранняя классическая лимфома Ходжкина (Lugano I–II), PET-адаптированная терапия",
        "drugs": [
          "Доксорубицин — 25 мг/м² в/в, дни 1 и 15",
          "Блеомицин — 10 000 МЕ/м² в/в, дни 1 и 15",
          "Винбластин — 6 мг/м² в/в, дни 1 и 15",
          "Дакарбазин — 375 мг/м² в/в, дни 1 и 15"
        ],
        "cycle": "Каждые 28 дней; обычно 2–4 цикла с оценкой ПЭТ-ответа и показаний к ISRT.",
        "notes": "Стадии Ann Arbor/Lugano, не TNM. Выбор числа циклов и ЛТ зависит от благоприятной/неблагоприятной группы и ПЭТ; оценить лёгочную и сердечную токсичность.",
        "url": "https://www.eviq.org.au/haematology/lymphoma/hodgkin-lymphoma/57-early-stage-abvd-doxorubicin-bleomycin-vinblas"
      }
    ],
    "II": [
      {
        "regimen": "ABVD — ранняя классическая лимфома Ходжкина (Lugano I–II), PET-адаптированная терапия",
        "drugs": [
          "Доксорубицин — 25 мг/м² в/в, дни 1 и 15",
          "Блеомицин — 10 000 МЕ/м² в/в, дни 1 и 15",
          "Винбластин — 6 мг/м² в/в, дни 1 и 15",
          "Дакарбазин — 375 мг/м² в/в, дни 1 и 15"
        ],
        "cycle": "Каждые 28 дней; обычно 2–4 цикла с оценкой ПЭТ-ответа и показаний к ISRT.",
        "notes": "Стадии Ann Arbor/Lugano, не TNM. Выбор числа циклов и ЛТ зависит от благоприятной/неблагоприятной группы и ПЭТ; оценить лёгочную и сердечную токсичность.",
        "url": "https://www.eviq.org.au/haematology/lymphoma/hodgkin-lymphoma/57-early-stage-abvd-doxorubicin-bleomycin-vinblas"
      }
    ],
    "III": [
      {
        "regimen": "ABVD — распространённая классическая лимфома Ходжкина (Lugano III–IV), PET-адаптированная терапия",
        "drugs": [
          "Доксорубицин — 25 мг/м² в/в, дни 1 и 15",
          "Блеомицин — 10 000 МЕ/м² в/в, дни 1 и 15",
          "Винбластин — 6 мг/м² в/в, дни 1 и 15",
          "Дакарбазин — 375 мг/м² в/в, дни 1 и 15"
        ],
        "cycle": "Каждые 28 дней, обычно 6 циклов; по результатам ПЭТ-2 возможна отмена блеомицина и переход на AVD.",
        "notes": "ABVD — допустимый режим, но не единственный современный вариант первой линии. Выбор BV-AVD/PD-1+AVD по доступности и показаниям. Стадирование Ann Arbor/Lugano.",
        "url": "https://www.eviq.org.au/haematology/lymphoma/hodgkin-lymphoma/56-advanced-stage-abvd-doxorubicin-bleomycin-vinb"
      }
    ],
    "IV": [
      {
        "regimen": "ABVD — распространённая классическая лимфома Ходжкина (Lugano III–IV), PET-адаптированная терапия",
        "drugs": [
          "Доксорубицин — 25 мг/м² в/в, дни 1 и 15",
          "Блеомицин — 10 000 МЕ/м² в/в, дни 1 и 15",
          "Винбластин — 6 мг/м² в/в, дни 1 и 15",
          "Дакарбазин — 375 мг/м² в/в, дни 1 и 15"
        ],
        "cycle": "Каждые 28 дней, обычно 6 циклов; по результатам ПЭТ-2 возможна отмена блеомицина и переход на AVD.",
        "notes": "ABVD — допустимый режим, но не единственный современный вариант первой линии. Выбор BV-AVD/PD-1+AVD по доступности и показаниям. Стадирование Ann Arbor/Lugano.",
        "url": "https://www.eviq.org.au/haematology/lymphoma/hodgkin-lymphoma/56-advanced-stage-abvd-doxorubicin-bleomycin-vinb"
      }
    ]
  }
};
const FIFTH_PASS_REGIMENS={
  "c027": {
    "I": [
      {
        "regimen": "R-CHOP-21 — первая линия CD20+ диффузной B-крупноклеточной лимфомы",
        "drugs": [
          "Ритуксимаб — 375 мг/м² в/в, день 1",
          "Циклофосфамид — 750 мг/м² в/в, день 1",
          "Доксорубицин — 50 мг/м² в/в, день 1",
          "Винкристин — 1,4 мг/м² в/в, день 1 (максимум 2 мг)",
          "Преднизолон — 100 мг внутрь 1 раз/сут, дни 1–5"
        ],
        "cycle": "Каждые 21 день; обычно 6 циклов (протокол допускает 6–8); у отдельных молодых пациентов с благоприятным прогнозом — 4 цикла R-CHOP + 2 введения ритуксимаба.",
        "notes": "Впервые диагностированная CD20+ ДВККЛ, стадии Lugano I–IV; выбор по IPI, bulky-статусу, возрасту и риску. Не единственная современная первая линия: Pola-R-CHP при определённых показаниях. Перед анти-CD20 оценить HBV; контроль ФВ ЛЖ, нейропатии и синдрома лизиса.",
        "url": "https://www.eviq.org.au/haematology/lymphoma/other-b-cell-lymphoma/70-r-chop21-rituximab-cyclophosphamide-doxorubici"
      }
    ],
    "II": [
      {
        "regimen": "R-CHOP-21 — первая линия CD20+ диффузной B-крупноклеточной лимфомы",
        "drugs": [
          "Ритуксимаб — 375 мг/м² в/в, день 1",
          "Циклофосфамид — 750 мг/м² в/в, день 1",
          "Доксорубицин — 50 мг/м² в/в, день 1",
          "Винкристин — 1,4 мг/м² в/в, день 1 (максимум 2 мг)",
          "Преднизолон — 100 мг внутрь 1 раз/сут, дни 1–5"
        ],
        "cycle": "Каждые 21 день; обычно 6 циклов (протокол допускает 6–8); у отдельных молодых пациентов с благоприятным прогнозом — 4 цикла R-CHOP + 2 введения ритуксимаба.",
        "notes": "Впервые диагностированная CD20+ ДВККЛ, стадии Lugano I–IV; выбор по IPI, bulky-статусу, возрасту и риску. Не единственная современная первая линия: Pola-R-CHP при определённых показаниях. Перед анти-CD20 оценить HBV; контроль ФВ ЛЖ, нейропатии и синдрома лизиса.",
        "url": "https://www.eviq.org.au/haematology/lymphoma/other-b-cell-lymphoma/70-r-chop21-rituximab-cyclophosphamide-doxorubici"
      }
    ],
    "III": [
      {
        "regimen": "R-CHOP-21 — первая линия CD20+ диффузной B-крупноклеточной лимфомы",
        "drugs": [
          "Ритуксимаб — 375 мг/м² в/в, день 1",
          "Циклофосфамид — 750 мг/м² в/в, день 1",
          "Доксорубицин — 50 мг/м² в/в, день 1",
          "Винкристин — 1,4 мг/м² в/в, день 1 (максимум 2 мг)",
          "Преднизолон — 100 мг внутрь 1 раз/сут, дни 1–5"
        ],
        "cycle": "Каждые 21 день; обычно 6 циклов (протокол допускает 6–8); у отдельных молодых пациентов с благоприятным прогнозом — 4 цикла R-CHOP + 2 введения ритуксимаба.",
        "notes": "Впервые диагностированная CD20+ ДВККЛ, стадии Lugano I–IV; выбор по IPI, bulky-статусу, возрасту и риску. Не единственная современная первая линия: Pola-R-CHP при определённых показаниях. Перед анти-CD20 оценить HBV; контроль ФВ ЛЖ, нейропатии и синдрома лизиса.",
        "url": "https://www.eviq.org.au/haematology/lymphoma/other-b-cell-lymphoma/70-r-chop21-rituximab-cyclophosphamide-doxorubici"
      }
    ],
    "IV": [
      {
        "regimen": "R-CHOP-21 — первая линия CD20+ диффузной B-крупноклеточной лимфомы",
        "drugs": [
          "Ритуксимаб — 375 мг/м² в/в, день 1",
          "Циклофосфамид — 750 мг/м² в/в, день 1",
          "Доксорубицин — 50 мг/м² в/в, день 1",
          "Винкристин — 1,4 мг/м² в/в, день 1 (максимум 2 мг)",
          "Преднизолон — 100 мг внутрь 1 раз/сут, дни 1–5"
        ],
        "cycle": "Каждые 21 день; обычно 6 циклов (протокол допускает 6–8); у отдельных молодых пациентов с благоприятным прогнозом — 4 цикла R-CHOP + 2 введения ритуксимаба.",
        "notes": "Впервые диагностированная CD20+ ДВККЛ, стадии Lugano I–IV; выбор по IPI, bulky-статусу, возрасту и риску. Не единственная современная первая линия: Pola-R-CHP при определённых показаниях. Перед анти-CD20 оценить HBV; контроль ФВ ЛЖ, нейропатии и синдрома лизиса.",
        "url": "https://www.eviq.org.au/haematology/lymphoma/other-b-cell-lymphoma/70-r-chop21-rituximab-cyclophosphamide-doxorubici"
      }
    ]
  },
  "c028": {
    "II": [
      {
        "regimen": "BR — бендамустин + ритуксимаб при фолликулярной лимфоме с показаниями к системному лечению",
        "drugs": [
          "Ритуксимаб — 375 мг/м² в/в, день 1",
          "Бендамустин — 90 мг/м² в/в, дни 1 и 2"
        ],
        "cycle": "Каждые 28 дней; 6 циклов, если нет прогрессирования или неприемлемой токсичности.",
        "notes": "Для CD20+ фолликулярной лимфомы, требующей системной терапии по симптомам/опухолевой нагрузке; не показано автоматически при бессимптомной малой нагрузке или локальной I стадии, где может быть предпочтительна ЛТ. Перед ритуксимабом HBV-скрининг; профилактика инфекций и мониторинг цитопений.",
        "url": "https://www.eviq.org.au/haematology/lymphoma/3794-lymphoma-bendamustine-and-rituximab"
      }
    ],
    "III": [
      {
        "regimen": "BR — бендамустин + ритуксимаб при фолликулярной лимфоме с показаниями к системному лечению",
        "drugs": [
          "Ритуксимаб — 375 мг/м² в/в, день 1",
          "Бендамустин — 90 мг/м² в/в, дни 1 и 2"
        ],
        "cycle": "Каждые 28 дней; 6 циклов, если нет прогрессирования или неприемлемой токсичности.",
        "notes": "Для CD20+ фолликулярной лимфомы, требующей системной терапии по симптомам/опухолевой нагрузке; не показано автоматически при бессимптомной малой нагрузке или локальной I стадии, где может быть предпочтительна ЛТ. Перед ритуксимабом HBV-скрининг; профилактика инфекций и мониторинг цитопений.",
        "url": "https://www.eviq.org.au/haematology/lymphoma/3794-lymphoma-bendamustine-and-rituximab"
      }
    ],
    "IV": [
      {
        "regimen": "BR — бендамустин + ритуксимаб при фолликулярной лимфоме с показаниями к системному лечению",
        "drugs": [
          "Ритуксимаб — 375 мг/м² в/в, день 1",
          "Бендамустин — 90 мг/м² в/в, дни 1 и 2"
        ],
        "cycle": "Каждые 28 дней; 6 циклов, если нет прогрессирования или неприемлемой токсичности.",
        "notes": "Для CD20+ фолликулярной лимфомы, требующей системной терапии по симптомам/опухолевой нагрузке; не показано автоматически при бессимптомной малой нагрузке или локальной I стадии, где может быть предпочтительна ЛТ. Перед ритуксимабом HBV-скрининг; профилактика инфекций и мониторинг цитопений.",
        "url": "https://www.eviq.org.au/haematology/lymphoma/3794-lymphoma-bendamustine-and-rituximab"
      }
    ]
  }
};
const GBM_GRADE4_REGIMENS=[
  {
    "regimen": "Глиобластома, CNS WHO grade 4 — конкурентная ХЛТ (этап 1, режим Stupp)",
    "drugs": [
      "Темозоломид — 75 мг/м² внутрь 1 раз в сутки ежедневно, дни 1–42, включая выходные",
      "Лучевая терапия — 60 Гр за 30 фракций в течение 6 недель"
    ],
    "cycle": "Один курс конкурентной ХЛТ продолжительностью 42 дня (в исследовании допускалось до 49 дней); затем перерыв около 4 недель и адъювантный этап.",
    "notes": "Впервые диагностированная глиобластома после максимально безопасной резекции/биопсии при подходящем функциональном статусе. CNS WHO grade 4 не означает IV стадию TNM. Во время конкурентной фазы необходима профилактика Pneumocystis jirovecii, мониторинг ОАК и лимфопении.",
    "url": "https://www.eviq.org.au/medical-oncology/neurological/glioma/365-glioblastoma-temozolomide-chemoradiation-part"
  },
  {
    "regimen": "Глиобластома, CNS WHO grade 4 — адъювантный темозоломид после ХЛТ (этап 2)",
    "drugs": [
      "Цикл 1: темозоломид — 150 мг/м² внутрь 1 раз/сут, дни 1–5",
      "Циклы 2–6: темозоломид — 200 мг/м² внутрь 1 раз/сут, дни 1–5, только при переносимости предыдущего цикла"
    ],
    "cycle": "Каждые 28 дней, стандартно 6 циклов; продление до 12 возможно по индивидуальному решению, без установленного преимущества выживаемости.",
    "notes": "Начать приблизительно через 4 недели после завершения конкурентной ХЛТ. Контроль ОАК, печёночной функции и токсичности; оценить MGMT и клинические альтернативы.",
    "url": "https://www.eviq.org.au/getmedia/50ef2f99-cd09-4bdd-b8de-9feb8f40f985/ID-366-Glioblastoma-temozolomide-following-chemoradiation-part-2-protocol-and-PI.pdf.aspx"
  }
];
const SIXTH_PASS_HEMATOLOGY={
  "c030": [
    {
      "regimen": "ОМЛ — индукция «7+3» (цитарабин + даунорубицин), интенсивная терапия",
      "drugs": [
        "Цитарабин — 100 мг/м²/сут непрерывно в/в в течение 24 часов, дни 1–7",
        "Даунорубицин — 60 мг/м² в/в, дни 1–3"
      ],
      "cycle": "Один индукционный курс; возможен второй курс при отсутствии ремиссии по результатам оценки костного мозга.",
      "notes": "Для взрослых пациентов с впервые диагностированным ОМЛ, которым показана интенсивная индукция. Не для ОПЛ; при FLT3-мутации, AML-MR/терапия-ассоциированном ОМЛ и других молекулярных ситуациях режим может отличаться. Профилактика синдрома лизиса, инфекций; центральный венозный доступ, оценка ФВ ЛЖ. TNM I–IV к ОМЛ неприменима.",
      "url": "https://www.eviq.org.au/haematology/leukaemias/acute-myeloid-leukaemia/2043-induction-7-3-cytarabine-and-daunorubicin"
    }
  ],
  "c031": [
    {
      "regimen": "ХМЛ, хроническая фаза — иматиниб, первая линия при соответствующем выборе TKI",
      "drugs": [
        "Иматиниб — 400 мг внутрь 1 раз в сутки ежедневно, с пищей"
      ],
      "cycle": "Непрерывно до прогрессирования, неприемлемой токсичности или решения о контролируемой отмене при выполнении строгих критериев устойчивого глубокого молекулярного ответа.",
      "notes": "Только хроническая фаза Ph+/BCR::ABL1+ ХМЛ. При акселерации/бластном кризе требуется иной режим. Контроль BCR::ABL1 по международной шкале, ОАК, функции печени и лекарственных взаимодействий. TNM I–IV неприменима.",
      "url": "https://www.eviq.org.au/haematology/leukaemias/chronic-myeloid-leukaemia/362-chronic-myeloid-leukaemia-imatinib"
    }
  ]
};
const SEVENTH_PASS_REGIMENS={
  "c034": {
    "II": [
      {
        "regimen": "Радикальная ХЛТ анального плоскоклеточного рака: митомицин + инфузионный фторурацил (ACT II)",
        "drugs": [
          "Митомицин — 12 мг/м² в/в в день 1, максимум 20 мг",
          "Фторурацил — 4000 мг/м² в/в непрерывно за 96 часов (1000 мг/м²/сут), начало инфузий в дни 1 и 29"
        ],
        "cycle": "Один курс с конкурентной ЛТ. Митомицин однократно. Две инфузии фторурацила с интервалом 28 дней.",
        "notes": "Радикальный режим при локализованном плоскоклеточном раке анального канала, когда показана ХЛТ. До начала оценить DPD/DPYD, ОАК, функцию почек и печени. Полный дефицит DPD исключает фторурацил. eviQ выделяет гиперчувствительность к митомицину, нарушения свёртывания или кровоточивость и тромбоциты менее 100 × 10⁹/л как ограничения для применения митомицина. При выраженной иммуносупрессии ASCO предлагает рассмотреть цисплатин + 5-ФУ при сохранной функции почек, отсутствии значимой нейропатии и нарушения слуха.",
        "url": "https://www.eviq.org.au/p/82",
        "reference": [
          "ASCO, руководство по анальному раку, 2024",
          "https://ascopubs.org/doi/abs/10.1200/JCO-24-02120"
        ],
        "sourceVersion": "eviQ №82, v.8",
        "checkedOn": "2026-11-21"
      },
      {
        "regimen": "Анальный плоскоклеточный рак — радикальная ХЛТ: митомицин + капецитабин",
        "drugs": [
          "Митомицин — 12 мг/м² в/в, день 1 (максимум 20 мг)",
          "Капецитабин — 825 мг/м² внутрь дважды в сутки только в дни лучевой терапии (понедельник–пятница)"
        ],
        "cycle": "Один курс с конкурентной ЛТ. Митомицин однократно. Капецитабин до последнего дня ЛТ включительно, только в дни облучения.",
        "notes": "ASCO допускает капецитабин как пероральную альтернативу 5-ФУ. eviQ отмечает ограниченность сравнительных данных и предлагает рассматривать этот вариант, если непрерывная инфузия 5-ФУ неприемлема. До начала оценить DPD/DPYD, ОАК, почечную и печёночную функцию. Контролировать диарею, кожную и гематологическую токсичность.",
        "url": "https://www.eviq.org.au/p/1959",
        "sourceVersion": "eviQ №1959, v.6",
        "checkedOn": "2026-11-21"
      }
    ],
    "III": [
      {
        "regimen": "Радикальная ХЛТ анального плоскоклеточного рака: митомицин + инфузионный фторурацил (ACT II)",
        "drugs": [
          "Митомицин — 12 мг/м² в/в в день 1, максимум 20 мг",
          "Фторурацил — 4000 мг/м² в/в непрерывно за 96 часов (1000 мг/м²/сут), начало инфузий в дни 1 и 29"
        ],
        "cycle": "Один курс с конкурентной ЛТ. Митомицин однократно. Две инфузии фторурацила с интервалом 28 дней.",
        "notes": "Радикальный режим при локализованном плоскоклеточном раке анального канала, когда показана ХЛТ. До начала оценить DPD/DPYD, ОАК, функцию почек и печени. Полный дефицит DPD исключает фторурацил. eviQ выделяет гиперчувствительность к митомицину, нарушения свёртывания или кровоточивость и тромбоциты менее 100 × 10⁹/л как ограничения для применения митомицина. При выраженной иммуносупрессии ASCO предлагает рассмотреть цисплатин + 5-ФУ при сохранной функции почек, отсутствии значимой нейропатии и нарушения слуха.",
        "url": "https://www.eviq.org.au/p/82",
        "reference": [
          "ASCO, руководство по анальному раку, 2024",
          "https://ascopubs.org/doi/abs/10.1200/JCO-24-02120"
        ],
        "sourceVersion": "eviQ №82, v.8",
        "checkedOn": "2026-11-21"
      },
      {
        "regimen": "Анальный плоскоклеточный рак — радикальная ХЛТ: митомицин + капецитабин",
        "drugs": [
          "Митомицин — 12 мг/м² в/в, день 1 (максимум 20 мг)",
          "Капецитабин — 825 мг/м² внутрь дважды в сутки только в дни лучевой терапии"
        ],
        "cycle": "Один курс с конкурентной ЛТ. Митомицин однократно. Капецитабин до последнего дня ЛТ включительно, только в дни облучения.",
        "notes": "ASCO допускает капецитабин как пероральную альтернативу 5-ФУ. eviQ отмечает ограниченность сравнительных данных и предлагает рассматривать этот вариант, если непрерывная инфузия 5-ФУ неприемлема. До начала оценить DPD/DPYD, ОАК, почечную и печёночную функцию. Контролировать диарею, кожную и гематологическую токсичность.",
        "url": "https://www.eviq.org.au/p/1959",
        "sourceVersion": "eviQ №1959, v.6",
        "checkedOn": "2026-11-21"
      }
    ],
    "I": [
      {
        "regimen": "Радикальная ХЛТ анального плоскоклеточного рака: митомицин + инфузионный фторурацил (ACT II)",
        "drugs": [
          "Митомицин — 12 мг/м² в/в в день 1, максимум 20 мг",
          "Фторурацил — 4000 мг/м² в/в непрерывно за 96 часов (1000 мг/м²/сут), начало инфузий в дни 1 и 29"
        ],
        "cycle": "Один курс с конкурентной ЛТ. Митомицин однократно. Две инфузии фторурацила с интервалом 28 дней.",
        "notes": "Радикальный режим при локализованном плоскоклеточном раке анального канала, когда показана ХЛТ. До начала оценить DPD/DPYD, ОАК, функцию почек и печени. Полный дефицит DPD исключает фторурацил. eviQ выделяет гиперчувствительность к митомицину, нарушения свёртывания или кровоточивость и тромбоциты менее 100 × 10⁹/л как ограничения для применения митомицина. При выраженной иммуносупрессии ASCO предлагает рассмотреть цисплатин + 5-ФУ при сохранной функции почек, отсутствии значимой нейропатии и нарушения слуха.",
        "url": "https://www.eviq.org.au/p/82",
        "reference": [
          "ASCO, руководство по анальному раку, 2024",
          "https://ascopubs.org/doi/abs/10.1200/JCO-24-02120"
        ],
        "sourceVersion": "eviQ №82, v.8",
        "checkedOn": "2026-11-21"
      }
    ]
  },
  "c036": {
    "IV": [
      {
        "regimen": "Мезотелиома плевры — цисплатин + пеметрексед, первая линия при соответствующем выборе",
        "drugs": [
          "Пеметрексед — 500 мг/м² в/в, день 1",
          "Цисплатин — 75 мг/м² в/в, день 1"
        ],
        "cycle": "Каждые 21 день; обычно до 6 циклов.",
        "notes": "Для нерезектабельной/метастатической мезотелиомы при выборе платинового дублета; иммунотерапевтические режимы также являются стандартными вариантами. Обязательны фолиевая кислота и витамин B12 до пеметрекседа, премедикация дексаметазоном, гидратация и контроль функции почек.",
        "url": "https://www.eviq.org.au/p/229"
      }
    ]
  },
  "c037": {
    "III": [
      {
        "regimen": "Цемиплимаб — нерезектабельный местнораспространённый плоскоклеточный рак кожи",
        "drugs": [
          "Цемиплимаб — 350 мг в/в, день 1"
        ],
        "cycle": "Каждые 21 день до прогрессирования, неприемлемой токсичности или до 24 месяцев по инструкции FDA.",
        "notes": "При местнораспространённом или метастатическом плоскоклеточном раке кожи у взрослых, если радикальная операция или ЛТ не подходят. FDA, раздел 4: абсолютных противопоказаний не перечислено. Трансплантация органов и алло-ТГСК требуют отдельной оценки риска. До начала и периодически контролировать печёночные ферменты, креатинин, функцию щитовидной железы. При иммуноопосредованных явлениях руководствоваться правилами приостановки или отмены в инструкции.",
        "url": "https://www.accessdata.fda.gov/drugsatfda_docs/label/2025/761097s032lbl.pdf"
      }
    ],
    "IV": [
      {
        "regimen": "Цемиплимаб — метастатический плоскоклеточный рак кожи",
        "drugs": [
          "Цемиплимаб — 350 мг в/в, день 1"
        ],
        "cycle": "Каждые 21 день до прогрессирования, неприемлемой токсичности или до 24 месяцев по инструкции FDA.",
        "notes": "При местнораспространённом или метастатическом плоскоклеточном раке кожи у взрослых, если радикальная операция или ЛТ не подходят. FDA, раздел 4: абсолютных противопоказаний не перечислено. Трансплантация органов и алло-ТГСК требуют отдельной оценки риска. До начала и периодически контролировать печёночные ферменты, креатинин, функцию щитовидной железы. При иммуноопосредованных явлениях руководствоваться правилами приостановки или отмены в инструкции.",
        "url": "https://www.accessdata.fda.gov/drugsatfda_docs/label/2025/761097s032lbl.pdf"
      }
    ]
  }
};
const EIGHTH_PASS_REGIMENS={
  "c029": {
    "all": [
      {
        "regimen": "CyBorD — миелома, системная терапия при соответствующих показаниях",
        "drugs": [
          "Циклофосфамид — 300 мг/м² внутрь, дни 1, 8, 15, 22",
          "Бортезомиб — 1,3 мг/м² подкожно, дни 1, 8, 15, 22",
          "Дексаметазон — 40 мг внутрь, дни 1, 8, 15, 22"
        ],
        "cycle": "28 дней; 4 или более циклов в зависимости от ответа и пригодности к трансплантации. У пожилых/хрупких пациентов возможны адаптация графика и снижение доз.",
        "notes": "Миелома стадируется по ISS/R-ISS/R2-ISS, не TNM. CyBorD — один из вариантов, не универсальный предпочтительный стандарт для всех пациентов; выбор зависит от трансплантационной пригодности, почечной функции, цитогенетического риска и доступности анти-CD38. У пациентов старше 75 лет eviQ рекомендует рассмотреть стартовую дозу дексаметазона 20 мг/нед.; у хрупких пациентов возможна модификация цикла. Необходима противовирусная профилактика при бортезомибе.",
        "url": "https://www.eviq.org.au/haematology/multiple-myeloma/1562-mm-cybord-cyclophosphamide-bortezomib-dexame"
      }
    ]
  },
  "c032": {
    "III": [
      {
        "regimen": "Октреотид LAR — системная терапия распространённой высокодифференцированной NET тонкой кишки",
        "drugs": [
          "Октреотид LAR — 30 мг внутримышечно, день 1"
        ],
        "cycle": "Каждые 28 дней; до прогрессирования, неприемлемой токсичности или изменения лечебной стратегии.",
        "notes": "При нерезектабельной/метастатической высокодифференцированной midgut-NET и показаниях к системному лечению; особенно при SSTR-позитивности. При карциноидном синдроме возможен короткодействующий октреотид для прорывных симптомов. Учитывать Ki-67, SSTR-визуализацию, функциональность, опухолевую нагрузку; у отдельных бессимптомных пациентов допустимо наблюдение. При прогрессировании рассматривать PRRT и другие опции. Не переносить на плохо дифференцированную NEC G3.",
        "url": "https://www.eviq.org.au/medical-oncology/upper-gastrointestinal/neuroendocrine/706-neuroendocrine-advanced-octreotide",
        "reference": [
          "ASCO: системная терапия GEP-NET",
          "https://ascopubs.org/doi/full/10.1200/JCO.23.01529"
        ],
        "sourceVersion": "eviQ №706",
        "checkedOn": "2026-11-21",
        "safety": "Контролировать гликемию и симптомы дисфункции щитовидной железы. При длительном применении учитывать риск холелитиаза. При прорывных симптомах карциноидного синдрома обсуждать короткодействующий октреотид."
      }
    ],
    "IV": [
      {
        "regimen": "Октреотид LAR — системная терапия распространённой высокодифференцированной NET тонкой кишки",
        "drugs": [
          "Октреотид LAR — 30 мг внутримышечно, день 1"
        ],
        "cycle": "Каждые 28 дней; до прогрессирования, неприемлемой токсичности или изменения лечебной стратегии.",
        "notes": "При нерезектабельной/метастатической высокодифференцированной midgut-NET и показаниях к системному лечению; особенно при SSTR-позитивности. При карциноидном синдроме возможен короткодействующий октреотид для прорывных симптомов. Учитывать Ki-67, SSTR-визуализацию, функциональность, опухолевую нагрузку; у отдельных бессимптомных пациентов допустимо наблюдение. При прогрессировании рассматривать PRRT и другие опции. Не переносить на плохо дифференцированную NEC G3.",
        "url": "https://www.eviq.org.au/medical-oncology/upper-gastrointestinal/neuroendocrine/706-neuroendocrine-advanced-octreotide",
        "reference": [
          "ASCO: системная терапия GEP-NET",
          "https://ascopubs.org/doi/full/10.1200/JCO.23.01529"
        ],
        "sourceVersion": "eviQ №706",
        "checkedOn": "2026-11-21",
        "safety": "Контролировать гликемию и симптомы дисфункции щитовидной железы. При длительном применении учитывать риск холелитиаза. При прорывных симптомах карциноидного синдрома обсуждать короткодействующий октреотид."
      }
    ]
  },
  "c033": {
    "III": [
      {
        "regimen": "CAPTEM — отдельные случаи нерезектабельной или метастатической высокодифференцированной NET поджелудочной железы",
        "drugs": [
          "Капецитабин — 750 мг/м² внутрь 2 раза/сут, дни 1–14 (максимум 2500 мг/сут согласно eviQ)",
          "Темозоломид — 100 мг/м² внутрь 2 раза/сут, дни 10–14 (альтернатива: 200 мг/м² однократно в сутки)"
        ],
        "cycle": "Каждые 28 дней, до прогрессирования или неприемлемой токсичности.",
        "notes": "При G1–G2 большой объём опухоли или симптомы от опухолевой нагрузки могут обосновывать CAPTEM в первой линии. При прогрессировании после SSA CAPTEM входит в число вариантов. При резектабельной III стадии режим не является рутинной периоперационной терапией. До капецитабина оценить DPD/DPYD. Контролировать ОАК, почечную и печёночную функцию. Нужна противорвотная профилактика в дни темозоломида.",
        "url": "https://www.eviq.org.au/medical-oncology/upper-gastrointestinal/neuroendocrine/1784-neuroendocrine-advanced-capecitabine-and-temo",
        "reference": [
          "ASCO, руководство по GEP-NET, 2023",
          "https://pubmed.ncbi.nlm.nih.gov/37774329/"
        ],
        "sourceVersion": "eviQ №1784, v.6",
        "checkedOn": "2026-11-21"
      }
    ],
    "IV": [
      {
        "regimen": "CAPTEM — отдельные случаи нерезектабельной или метастатической высокодифференцированной NET поджелудочной железы",
        "drugs": [
          "Капецитабин — 750 мг/м² внутрь 2 раза/сут, дни 1–14 (максимум 2500 мг/сут согласно eviQ)",
          "Темозоломид — 100 мг/м² внутрь 2 раза/сут, дни 10–14 (альтернатива: 200 мг/м² однократно в сутки)"
        ],
        "cycle": "Каждые 28 дней, до прогрессирования или неприемлемой токсичности.",
        "notes": "При G1–G2 большой объём опухоли или симптомы от опухолевой нагрузки могут обосновывать CAPTEM в первой линии. При прогрессировании после SSA CAPTEM входит в число вариантов. При резектабельной III стадии режим не является рутинной периоперационной терапией. До капецитабина оценить DPD/DPYD. Контролировать ОАК, почечную и печёночную функцию. Нужна противорвотная профилактика в дни темозоломида.",
        "url": "https://www.eviq.org.au/medical-oncology/upper-gastrointestinal/neuroendocrine/1784-neuroendocrine-advanced-capecitabine-and-temo",
        "reference": [
          "ASCO, руководство по GEP-NET, 2023",
          "https://pubmed.ncbi.nlm.nih.gov/37774329/"
        ],
        "sourceVersion": "eviQ №1784, v.6",
        "checkedOn": "2026-11-21"
      }
    ]
  },
  "c038": {
    "III": [
      {
        "regimen": "Индукционная ХТ цисплатин + гемцитабин — местнораспространённый рак носоглотки",
        "drugs": [
          "Гемцитабин — 1000 мг/м² в/в, дни 1 и 8",
          "Цисплатин — 80 мг/м² в/в, день 1"
        ],
        "cycle": "Каждые 21 день, 3 цикла; затем конкурентная химиолучевая терапия по отдельному протоколу.",
        "notes": "Для отобранных пациентов с нерезектабельным/местнораспространённым неороговевающим раком носоглотки III–IVA по AJCC 8, ECOG 0–1, согласно eviQ №3674. При применении AJCC 9 оценивать исходные категории T/N и риск, поскольку границы стадий изменились. Это только индукция; конкурентную химиолучевую терапию начинают через 21–28 дней от дня 1 последнего индукционного цикла. Мониторинг функции почек, слуха, ОАК; при eGFR 30–44 мл/мин/1,73 м² избегать цисплатина. До начала лечения рекомендованы стоматологическая оценка и консультации по питанию и глотанию.",
        "url": "https://www.eviq.org.au/p/3674"
      }
    ],
    "IV": [
      {
        "regimen": "Цисплатин + гемцитабин — рецидивный/метастатический рак носоглотки",
        "drugs": [
          "Гемцитабин — 1000 мг/м² в/в, дни 1 и 8",
          "Цисплатин — 80 мг/м² в/в, день 1 (допустимо разделить: 40 мг/м² в дни 1 и 8 по eviQ №1384)"
        ],
        "cycle": "Каждые 21 день, 4–6 циклов.",
        "notes": "Первая линия при рецидивном/метастатическом заболевании, когда торипалимаб недоступен или не подходит. eviQ указывает ECOG 0–2. Требуются высокоэметогенная профилактика, гидратация, контроль ОАК, почечной функции, электролитов и слуха.",
        "url": "https://www.eviq.org.au/p/1384"
      }
    ]
  }
};
const NINTH_PASS_REGIMENS={
  "c035": {
    "III": [
      {
        "regimen": "TIP — неоадъювантная химиотерапия при плоскоклеточном раке полового члена с массивным регионарным поражением M0 (cN3; отдельные cN2)",
        "drugs": [
          "Паклитаксел — 175 мг/м² в/в, день 1",
          "Ифосфамид — 1200 мг/м² в/в, дни 1–3",
          "Цисплатин — 25 мг/м² в/в, дни 1–3",
          "Месна — 400 мг/м² в/в перед ифосфамидом и через 4 и 8 часов после окончания его инфузии, дни 1–3",
          "Пэгфилграстим — 6 мг подкожно, день 4 (не ранее 24 часов после ХТ)"
        ],
        "cycle": "Каждые 21 день; 4 цикла, затем рестадирование и решение о лимфодиссекции/резекции.",
        "notes": "Применять преимущественно при cN3 (фиксированные паховые узлы/тазовые лимфоузлы), у отобранных пациентов с массивным cN2; не всем пациентам III–IV стадии. Для M1 решение о системной терапии индивидуальное. Обязательны гидратация, уропротекция месной, контроль ОАК, eGFR, слуха и нейротоксичности. При eGFR 30–44 мл/мин/1,73 м² eviQ рекомендует избегать цисплатина.",
        "url": "https://www.eviq.org.au/medical-oncology/urogenital/penile/4430-penile-cancer-paclitaxel-ifosfamide-cisplatin"
      }
    ],
    "IV": [
      {
        "regimen": "TIP — неоадъювантная химиотерапия при плоскоклеточном раке полового члена с массивным регионарным поражением M0 (cN3; отдельные cN2)",
        "drugs": [
          "Паклитаксел — 175 мг/м² в/в, день 1",
          "Ифосфамид — 1200 мг/м² в/в, дни 1–3",
          "Цисплатин — 25 мг/м² в/в, дни 1–3",
          "Месна — 400 мг/м² в/в перед ифосфамидом и через 4 и 8 часов после окончания его инфузии, дни 1–3",
          "Пэгфилграстим — 6 мг подкожно, день 4 (не ранее 24 часов после ХТ)"
        ],
        "cycle": "Каждые 21 день; 4 цикла, затем рестадирование и решение о лимфодиссекции/резекции.",
        "notes": "Применять преимущественно при cN3 (фиксированные паховые узлы/тазовые лимфоузлы), у отобранных пациентов с массивным cN2; не всем пациентам III–IV стадии. Для M1 решение о системной терапии индивидуальное. Обязательны гидратация, уропротекция месной, контроль ОАК, eGFR, слуха и нейротоксичности. При eGFR 30–44 мл/мин/1,73 м² eviQ рекомендует избегать цисплатина.",
        "url": "https://www.eviq.org.au/medical-oncology/urogenital/penile/4430-penile-cancer-paclitaxel-ifosfamide-cisplatin"
      }
    ]
  }
};
const LUNG_REGIMENS = {
  osimertinibAdjuvant: {
    regimen: "Осимертиниб после полной резекции · EGFR del19 или L858R",
    drugs: ["Осимертиниб — 80 мг внутрь 1 раз в сутки"],
    cycle: "Ежедневно до 3 лет, рецидива или неприемлемой токсичности.",
    notes: "При показаниях к адъювантной химиотерапии её проводят до осимертиниба. В ADAURA использовали AJCC 7. Оценить риск пневмонита, удлинения QTc и кардиомиопатии.",
    url: "https://www.accessdata.fda.gov/drugsatfda_docs/label/2026/208065s035s036lbl.pdf"
  },
  alectinibAdjuvant: {
    regimen: "Алектиниб после резекции · ALK-положительный НМРЛ",
    drugs: ["Алектиниб — 600 мг внутрь 2 раза в сутки с пищей"],
    cycle: "Ежедневно до 2 лет, рецидива или неприемлемой токсичности.",
    notes: "В инструкции FDA критерии — опухоль ≥4 см или поражение регионарных узлов. В ALINA алектиниб сравнивали с платиновым дублетом. Контролировать печёночные показатели, ЧСС, КФК и симптомы пневмонита.",
    url: "https://www.accessdata.fda.gov/drugsatfda_docs/label/2026/208434s017lbl.pdf"
  },
  nivolumabPemetrexedNeoadjuvant: {
    regimen: "Неоадъювантный режим CheckMate 816 · ниволумаб + цисплатин + пеметрексед",
    drugs: ["Ниволумаб — 360 мг, в/в, день 1","Пеметрексед — 500 мг/м², в/в, день 1","Цисплатин — 75 мг/м², в/в, день 1"],
    cycle: "Цикл 21 день, 3 цикла до резекции.",
    notes: "Резектабельный НМРЛ с опухолью ≥4 см или поражением регионарных узлов по инструкции FDA. В CheckMate 816 исключали опухоли с известными активирующими EGFR-мутациями или ALK-перестройками. До начала оценить аутоиммунные заболевания, трансплантационный анамнез, иммуносупрессию и риск иммунных нежелательных явлений. Оценить функцию почек, слух и нейропатию. Требуются гидратация и противорвотная профилактика. Для пеметрекседа требуются фолиевая кислота, витамин B₁₂ и премедикация дексаметазоном. При клиренсе креатинина <45 мл/мин препарат не вводят.",
    url: "https://www.eviq.org.au/medical-oncology/respiratory/non-small-cell-lung-cancer-adjuvant-neoadjuvant/4314-nsclc-neoadjuvant-cisplatin-pemetrexed-and-ni",
    reference: ["Инструкция к ниволумабу","https://www.accessdata.fda.gov/drugsatfda_docs/label/2026/125554s138lbl.pdf"]
  },
  nivolumabPemetrexedPerioperative: {
    regimen: "Периоперационный ниволумаб · CheckMate 77T (неплоскоклеточный НМРЛ)",
    drugs: ["Ниволумаб — 360 мг, в/в, день 1","Пеметрексед — 500 мг/м², в/в, день 1","Цисплатин — 75 мг/м², в/в, день 1"],
    cycle: "До операции — каждые 21 день, до 4 циклов. После операции — ниволумаб 480 мг в/в каждые 28 дней, до 13 циклов, рецидива или неприемлемой токсичности.",
    notes: "При резектабельной опухоли ≥4 см или поражении узлов, без известных EGFR-мутаций и ALK-перестроек. Один из дублетов CheckMate 77T. Проверить функцию почек, провести гидратацию, назначить фолиевую кислоту, B₁₂ и премедикацию. Оценить риск иммунных осложнений, включая пневмонит, и сопутствующую иммуносупрессию.",
    url: "https://www.accessdata.fda.gov/drugsatfda_docs/label/2026/125554s138lbl.pdf"
  },
  pemetrexedAdjuvant: {
    regimen: "Адъювантная химиотерапия · цисплатин + пеметрексед",
    drugs: ["Пеметрексед — 500 мг/м², в/в, день 1","Цисплатин — 75 мг/м², в/в, день 1"],
    cycle: "Цикл 21 день, 4 цикла.",
    notes: "После полной резекции неплоскоклеточного НМРЛ при показаниях к адъювантной химиотерапии. Оценить функцию почек, слух и нейропатию. Требуются гидратация и противорвотная профилактика. Для пеметрекседа требуются фолиевая кислота, витамин B₁₂ и премедикация дексаметазоном. При клиренсе креатинина <45 мл/мин препарат не вводят.",
    url: "https://www.eviq.org.au/medical-oncology/respiratory/non-small-cell-lung-cancer-adjuvant-neoadjuvant/3802-nsclc-adjuvant-cisplatin-and-pemetrexed",
    reference: ["Инструкция к пеметрекседу","https://www.accessdata.fda.gov/drugsatfda_docs/label/2025/214657s006lbl.pdf"]
  },
  pembrolizumabAdjuvant: {
    regimen: "Адъювантный пембролизумаб · KEYNOTE-091",
    drugs: ["Пембролизумаб — 200 мг, в/в, день 1"],
    cycle: "Цикл 21 день, до 1 года, рецидива или неприемлемой токсичности.",
    notes: "После полной резекции и платиносодержащей адъювантной химиотерапии при соответствующих стадии и регистрации. В инструкции FDA — IB (T2a ≥4 см), II или IIIA по критериям исследования. KEYNOTE-091 не изучал продолжение ранее начатой неоадъювантной иммунотерапии. Оценить риск иммунных осложнений, включая пневмонит, и сопутствующую иммуносупрессию.",
    url: "https://www.fda.gov/drugs/cancer-approvals/fda-approves-pembrolizumab-adjuvant-treatment-non-small-cell-lung-cancer"
  },
  carboplatinPaclitaxelChemoradiation: {
    regimen: "Дефинитивная конкурентная ХЛТ · карбоплатин + паклитаксел",
    drugs: ["Паклитаксел — 45 мг/м², в/в, день 1","Карбоплатин — AUC 2, в/в, день 1"],
    cycle: "Цикл 7 дней, 6 введений одновременно с торакальной ЛТ.",
    notes: "Вариант для нерезектабельного местнораспространённого НМРЛ при достаточном функциональном резерве. Оценить показатели крови, функцию почек, нейропатию и риск пневмонита. Премедикация паклитаксела по протоколу.",
    url: "https://www.eviq.org.au/medical-oncology/respiratory/non-small-cell-lung-cancer-advanced-metastatic/1436-nsclc-locally-advanced-definitive-carboplatin"
  },
  osimertinibConsolidation: {
    regimen: "Осимертиниб после дефинитивной ХЛТ · LAURA",
    drugs: ["Осимертиниб — 80 мг внутрь 1 раз в сутки"],
    cycle: "Непрерывный ежедневный приём до прогрессирования или неприемлемой токсичности.",
    notes: "Нерезектабельная III стадия, EGFR del19 или L858R, отсутствие прогрессирования во время или после конкурентной либо последовательной платиносодержащей ХЛТ. Контролировать пневмонит, QTc и риск кардиомиопатии. В LAURA осимертиниб назначали без дурвалумаба.",
    url: "https://www.accessdata.fda.gov/drugsatfda_docs/label/2026/208065s035s036lbl.pdf"
  },
  durvalumabNsclcConsolidation: {
    regimen: "Консолидация дурвалумабом · PACIFIC",
    drugs: ["Дурвалумаб — 1500 мг, в/в, день 1"],
    cycle: "Цикл 28 дней, до 12 месяцев, прогрессирования или неприемлемой токсичности.",
    notes: "При массе тела ≥30 кг, нерезектабельной III стадии и отсутствии прогрессирования после конкурентной платиносодержащей ХЛТ. В ЕС по этому показанию требуется PD-L1 ≥1% на опухолевых клетках. Оценить постлучевой пневмонит и иммунные риски.",
    url: "https://dailymed.nlm.nih.gov/dailymed/getFile.cfm?name=IMFINZI&setid=8baba4ea-2855-42fa-9bd9-5a7548d4cec3",
    reference: ["Критерий PD-L1 в ЕС","https://www.ema.europa.eu/en/documents/assessment-report/imfinzi-epar-public-assessment-report_en.pdf"]
  },
  pembrolizumabPemetrexedMetastatic: {
    regimen: "Первая линия · пембролизумаб + пеметрексед + карбоплатин (KEYNOTE-189)",
    drugs: ["Пембролизумаб — 200 мг, в/в, день 1","Пеметрексед — 500 мг/м², в/в, день 1","Карбоплатин — AUC 5, в/в, день 1"],
    cycle: "Цикл 21 день, 4 цикла индукции. Далее пембролизумаб и пеметрексед в тех же дозах каждые 21 день. Пембролизумаб — до 35 циклов суммарно, пеметрексед — до прогрессирования или неприемлемой токсичности.",
    notes: "Первая линия метастатического неплоскоклеточного НМРЛ без драйвера, для которого показана таргетная терапия. Применимость комбинации не зависит от значения PD-L1. Для пеметрекседа требуются фолиевая кислота, витамин B₁₂ и премедикация дексаметазоном. При клиренсе креатинина <45 мл/мин препарат не вводят. До начала оценить аутоиммунные заболевания, трансплантационный анамнез, иммуносупрессию и риск иммунных нежелательных явлений.",
    url: "https://www.eviq.org.au/medical-oncology/respiratory/non-small-cell-lung-cancer-advanced-metastatic/3510-nsclc-metastatic-carboplatin-pemetrexed-and-p",
    reference: ["Инструкция к пеметрекседу","https://www.accessdata.fda.gov/drugsatfda_docs/label/2025/214657s006lbl.pdf"]
  },
  pembrolizumabMonotherapy: {
    regimen: "Первая линия · пембролизумаб в монорежиме (KEYNOTE-024)",
    drugs: ["Пембролизумаб — 200 мг, в/в, день 1"],
    cycle: "Цикл 21 день, до 35 циклов, прогрессирования или неприемлемой токсичности.",
    notes: "Метастатический НМРЛ с PD-L1 TPS ≥50% при отсутствии драйвера, для которого показана таргетная терапия. До начала оценить аутоиммунные заболевания, трансплантационный анамнез, иммуносупрессию и риск иммунных нежелательных явлений.",
    url: "https://ascopubs.org/doi/10.1200/JCO.21.00174"
  },
  osimertinibMetastatic: {
    regimen: "Первая линия · осимертиниб при EGFR del19 или L858R",
    drugs: ["Осимертиниб — 80 мг внутрь 1 раз в сутки"],
    cycle: "Непрерывный ежедневный приём до прогрессирования или неприемлемой токсичности.",
    notes: "При подтверждённом варианте EGFR. Оценить взаимодействия, риск пневмонита, удлинения QTc и кардиомиопатии.",
    url: "https://www.accessdata.fda.gov/drugsatfda_docs/label/2026/208065s035s036lbl.pdf"
  },
  alectinibMetastatic: {
    regimen: "Один из вариантов при ALK-положительном НМРЛ · алектиниб",
    drugs: ["Алектиниб — 600 мг внутрь 2 раза в сутки с пищей"],
    cycle: "Непрерывный ежедневный приём до прогрессирования или неприемлемой токсичности.",
    notes: "Контролировать печёночные показатели, ЧСС, КФК и симптомы пневмонита.",
    url: "https://www.accessdata.fda.gov/drugsatfda_docs/label/2026/208434s017lbl.pdf"
  },
  entrectinibMetastatic: {
    regimen: "Один из вариантов при ROS1-положительном НМРЛ · энтректиниб",
    drugs: ["Энтректиниб — 600 мг внутрь 1 раз в сутки"],
    cycle: "Непрерывный ежедневный приём до прогрессирования или неприемлемой токсичности.",
    notes: "Подтвердить перестройку ROS1. Оценить риск сердечной недостаточности, удлинения QTc и взаимодействия через CYP3A.",
    url: "https://dailymed.nlm.nih.gov/dailymed/getFile.cfm?setid=c7c71b0c-2549-4495-86b6-c2807fa54908&type=pdf"
  },
  selpercatinibMetastatic: {
    regimen: "Таргетная терапия при слиянии RET · селперкатиниб",
    drugs: ["Селперкатиниб внутрь: 160 мг 2 раза в сутки при массе ≥50 кг, 120 мг 2 раза в сутки при массе <50 кг"],
    cycle: "Непрерывный ежедневный приём до прогрессирования или неприемлемой токсичности.",
    notes: "Подтвердить слияние RET. Контролировать АД, печёночные показатели и QTc. Проверить лекарственные взаимодействия.",
    url: "https://www.accessdata.fda.gov/drugsatfda_docs/label/2026/218160s007lbl.pdf"
  },
  capmatinibMetastatic: {
    regimen: "Таргетная терапия при пропуске экзона 14 MET · капматиниб",
    drugs: ["Капматиниб — 400 мг внутрь 2 раза в сутки"],
    cycle: "Непрерывный ежедневный приём до прогрессирования или неприемлемой токсичности.",
    notes: "Подтвердить MET exon 14 skipping. Контролировать отёки, печёночные показатели и признаки пневмонита.",
    url: "https://www.dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?audience=professional&setid=455892c3-d144-4ba8-9ab4-79cabff9876d"
  },
  nivolumabPaclitaxelNeoadjuvant: {
    regimen: "Неоадъювантный режим CheckMate 816 · ниволумаб + карбоплатин + паклитаксел",
    drugs: ["Ниволумаб — 360 мг, в/в, день 1","Паклитаксел — 200 мг/м², в/в, день 1","Карбоплатин — AUC 6, в/в, день 1"],
    cycle: "Цикл 21 день, 3 цикла до резекции.",
    notes: "Резектабельный НМРЛ с опухолью ≥4 см или поражением регионарных узлов по инструкции FDA. В CheckMate 816 исключали опухоли с известными активирующими EGFR-мутациями или ALK-перестройками. До начала оценить аутоиммунные заболевания, трансплантационный анамнез, иммуносупрессию и риск иммунных нежелательных явлений. Премедикация паклитаксела и расчёт карбоплатина по функции почек.",
    url: "https://www.eviq.org.au/medical-oncology/respiratory/non-small-cell-lung-cancer-adjuvant-neoadjuvant/4318-nsclc-neoadjuvant-carboplatin-paclitaxel-and",
    reference: ["Инструкция к ниволумабу","https://www.accessdata.fda.gov/drugsatfda_docs/label/2026/125554s138lbl.pdf"]
  },
  nivolumabPaclitaxelPerioperative: {
    regimen: "Периоперационный ниволумаб · CheckMate 77T (плоскоклеточный НМРЛ)",
    drugs: ["Ниволумаб — 360 мг, в/в, день 1","Паклитаксел — 200 мг/м², в/в, день 1","Карбоплатин — AUC 6, в/в, день 1"],
    cycle: "До операции — каждые 21 день, до 4 циклов. После операции — ниволумаб 480 мг в/в каждые 28 дней, до 13 циклов, рецидива или неприемлемой токсичности.",
    notes: "При резектабельной опухоли ≥4 см или поражении узлов, без известных EGFR-мутаций и ALK-перестроек. Один из дублетов CheckMate 77T. Оценить функцию почек и нейропатию, провести премедикацию паклитаксела. Оценить риск иммунных осложнений, включая пневмонит, и сопутствующую иммуносупрессию.",
    url: "https://www.accessdata.fda.gov/drugsatfda_docs/label/2026/125554s138lbl.pdf"
  },
  vinorelbineAdjuvant: {
    regimen: "Адъювантная химиотерапия · цисплатин + винорелбин",
    drugs: ["Цисплатин — 80 мг/м², в/в, день 1","Винорелбин — 25 мг/м², в/в, дни 1 и 8"],
    cycle: "Цикл 21 день, 4 цикла.",
    notes: "Вариант eviQ после полной резекции при показаниях к адъювантной химиотерапии. Оценить функцию почек, слух и нейропатию. Требуются гидратация и противорвотная профилактика. Проверять показатели крови перед введениями. В этой схеме винорелбин вводят в/в, интратекальное введение смертельно.",
    url: "https://www.eviq.org.au/medical-oncology/respiratory/non-small-cell-lung-cancer-adjuvant-neoadjuvant/237-nsclc-adjuvant-cisplatin-and-vinorelbine"
  },
  pembrolizumabPaclitaxelMetastatic: {
    regimen: "Первая линия · пембролизумаб + паклитаксел + карбоплатин (KEYNOTE-407)",
    drugs: ["Пембролизумаб — 200 мг, в/в, день 1","Паклитаксел — 200 мг/м², в/в, день 1","Карбоплатин — AUC 6, в/в, день 1"],
    cycle: "Цикл 21 день, 4 цикла индукции. Далее пембролизумаб 200 мг в/в каждые 21 день, до 35 циклов суммарно, прогрессирования или неприемлемой токсичности.",
    notes: "Первая линия метастатического плоскоклеточного НМРЛ независимо от уровня PD-L1 при применимости химиоиммунотерапии. Контроль показателей крови, функции почек и нейропатии. Премедикация паклитаксела по протоколу. До начала оценить аутоиммунные заболевания, трансплантационный анамнез, иммуносупрессию и риск иммунных нежелательных явлений.",
    url: "https://www.eviq.org.au/medical-oncology/respiratory/non-small-cell-lung-cancer-advanced-metastatic/3502-nsclc-metastatic-carboplatin-paclitaxel-and-p"
  },
  etoposideAdjuvant: {
    regimen: "Адъювантная терапия после резекции МРЛ · цисплатин + этопозид",
    drugs: ["Цисплатин — 75 мг/м², в/в, день 1","Этопозид — 100 мг/м², в/в, дни 1–3"],
    cycle: "Цикл 21 день, 4 цикла.",
    notes: "После полной резекции локализованного МРЛ. При неожиданном pN2 или R1/R2 обсуждают добавление торакальной ЛТ к химиотерапии. Оценить функцию почек, слух и нейропатию. Требуются гидратация и противорвотная профилактика. Контроль показателей крови.",
    url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC10425483/",
    reference: ["Рекомендации ESMO","https://pubmed.ncbi.nlm.nih.gov/33864941/"]
  },
  etoposideChemoradiation: {
    regimen: "Ограниченная стадия МРЛ · цисплатин + этопозид одновременно с торакальной ЛТ",
    drugs: ["Цисплатин — 80 мг/м², в/в, день 1","Этопозид — 100 мг/м², в/в, дни 1–3"],
    cycle: "Цикл 21 день, 4 цикла.",
    notes: "Вариант eviQ, если объём болезни можно безопасно охватить полем облучения и пациент переносит конкурентную ХЛТ. ЛТ предпочтительно начинают с первого или второго цикла. Оценить функцию почек, слух и нейропатию. Требуются гидратация и противорвотная профилактика. При непригодности цисплатина обсуждают карбоплатин по отдельному протоколу.",
    url: "https://www.eviq.org.au/getmedia/567a230a-f7fe-4b72-afb0-7a6288af5375/ID-375-Respiratory-Small-Cell-Lung-Cancer-limited-disease-Cisplatin-Etoposide-protocol-and-PI.pdf.aspx",
    reference: ["Рекомендации ESMO","https://pubmed.ncbi.nlm.nih.gov/33864941/"]
  },
  durvalumabSclcConsolidation: {
    regimen: "Консолидация дурвалумабом · ADRIATIC",
    drugs: ["Дурвалумаб — 1500 мг, в/в, день 1"],
    cycle: "Цикл 28 дней, до 24 месяцев, прогрессирования или неприемлемой токсичности.",
    notes: "При массе тела ≥30 кг и отсутствии прогрессирования после конкурентной платиносодержащей ХЛТ ограниченного МРЛ. В исследовании стартовали в пределах 42 дней после ХЛТ. Из ADRIATIC исключали пациентов с медицински операбельной I–II стадией. Оценить пневмонит и иммунные риски.",
    url: "https://dailymed.nlm.nih.gov/dailymed/getFile.cfm?name=IMFINZI&setid=8baba4ea-2855-42fa-9bd9-5a7548d4cec3"
  },
  atezolizumabSclcInduction: {
    regimen: "Первая линия распространённого МРЛ · атезолизумаб + карбоплатин + этопозид (IMpower133)",
    drugs: ["Атезолизумаб — 1200 мг, в/в, день 1","Карбоплатин — AUC 5, в/в, день 1","Этопозид — 100 мг/м², в/в, дни 1–3"],
    cycle: "Цикл 21 день, 4 цикла индукции. Далее атезолизумаб 1200 мг в/в каждые 21 день до прогрессирования или неприемлемой токсичности.",
    notes: "Контроль показателей крови и функции почек для расчёта карбоплатина. До начала оценить аутоиммунные заболевания, трансплантационный анамнез, иммуносупрессию и риск иммунных нежелательных явлений.",
    url: "https://www.accessdata.fda.gov/drugsatfda_docs/label/2026/761034s065lbl.pdf"
  },
  durvalumabSclcInduction: {
    regimen: "Первая линия распространённого МРЛ · дурвалумаб + карбоплатин + этопозид (CASPIAN)",
    drugs: ["Дурвалумаб — 1500 мг, в/в, день 1","Карбоплатин — AUC 5, в/в, день 1","Этопозид — 100 мг/м², в/в, дни 1–3"],
    cycle: "Цикл 21 день, 4 цикла индукции. Далее дурвалумаб 1500 мг в/в каждые 28 дней до прогрессирования или неприемлемой токсичности.",
    notes: "Дозы дурвалумаба указаны для массы тела ≥30 кг. Контроль показателей крови и функции почек. До начала оценить аутоиммунные заболевания, трансплантационный анамнез, иммуносупрессию и риск иммунных нежелательных явлений.",
    url: "https://www.eviq.org.au/medical-oncology/respiratory/small-cell-lung-cancer/3921-sclc-extensive-disease-carboplatin-etoposide",
    reference: ["Инструкция к дурвалумабу","https://dailymed.nlm.nih.gov/dailymed/getFile.cfm?name=IMFINZI&setid=8baba4ea-2855-42fa-9bd9-5a7548d4cec3"]
  },
  lurbinectedinMaintenance: {
    regimen: "Поддерживающая терапия после индукции атезолизумабом · лурбинектедин + атезолизумаб (IMforte)",
    drugs: ["Атезолизумаб — 1200 мг, в/в, день 1","Лурбинектедин — 3,2 мг/м², в/в, день 1"],
    cycle: "Цикл 21 день до прогрессирования или неприемлемой токсичности.",
    notes: "Вариант после индукции атезолизумабом, карбоплатином и этопозидом при отсутствии прогрессирования. Инструкция предусматривает первичную профилактику Г-КСФ при комбинации. Оценить миелосупрессию, функцию печени и взаимодействия CYP3A.",
    url: "https://www.accessdata.fda.gov/drugsatfda_docs/label/2026/213702s012lbl.pdf"
  },
  tarlatamabAfterPlatinum: {
    regimen: "После прогрессирования на платине или после неё · тарлатамаб",
    drugs: ["Тарлатамаб — 1 мг в/в в день 1 первого цикла, затем 10 мг в/в в дни 8 и 15","Со второго цикла — тарлатамаб 10 мг в/в в дни 1 и 15"],
    cycle: "Цикл 28 дней. Продолжать до прогрессирования или неприемлемой токсичности.",
    notes: "Для распространённого МРЛ после платиносодержащей терапии. Риск синдрома высвобождения цитокинов и нейротоксичности (ICANS). Введение только в условиях, где можно вести эти осложнения. Премедикация, наблюдение после инфузий, контроль в дни 2 и 9 первого цикла и возобновление после перерывов — по действующей инструкции.",
    url: "https://www.accessdata.fda.gov/drugsatfda_docs/label/2026/761344s002lbl.pdf"
  }
};

const locallyAdvancedNsclcSurgery = {
  procedure: "В составе мультимодального лечения у отобранных пациентов. Оценить резектабельность на торакальном консилиуме и подтвердить статус средостения инвазивным стадированием по показаниям. Предпочтительна лобэктомия с систематической оценкой корневых и медиастинальных узлов при достижимой R0-резекции. При подходящей опухоли верхней борозды возможна резекция единым блоком с вовлечённой грудной стенкой после индукционной ХЛТ.",
  limits: "N3 или массивное многостанционное N2 обычно исключают плановую радикальную операцию. Если для R0 необходима пневмонэктомия, ожидаемая польза и периоперационный риск требуют отдельной оценки. Оценить прогнозируемые послеоперационные ОФВ₁ и DLCO, сердечно-сосудистый риск и переносимость планируемого объёма. Невозможность R0 или неприемлемый кардиопульмональный риск исключают плановую радикальную резекцию.",
  url: "https://pubmed.ncbi.nlm.nih.gov/34936470/"
};

const oligometastaticNsclcSurgery = {
  procedure: "Резекция первичного очага или отдельного метастаза может обсуждаться при строго отобранном олигометастатическом процессе. Консилиум оценивает возможность радикального локального лечения всех известных очагов и его последовательность с системной терапией.",
  limits: "При диссеминированном процессе радикальная резекция первичной опухоли рутинно не показана. Для олигометастатической тактики необходимы безопасное воздействие на все выбранные очаги и приемлемый функциональный риск.",
  url: "https://www.astro.org/provider-resources/guidelines/clinical-practice-guidelines/oligometastatic-nsclc"
};

const earlySclcSurgery = {
  procedure: "Лобэктомия с систематической диссекцией корневых и медиастинальных узлов допустима у строго отобранных cT1–2N0M0 после исключения отдалённых метастазов и инвазивного стадирования средостения. После R0-резекции показана адъювантная химиотерапия.",
  limits: "Клинически подтверждённое поражение регионарных узлов, отдалённые метастазы, невозможность R0 или неприемлемый кардиопульмональный риск исключают стандартную операцию в этой ситуации. При неожиданном pN2 или положительных краях обсуждают добавление торакальной ЛТ.",
  url: "https://pubmed.ncbi.nlm.nih.gov/33864941/"
};

const LUNG_TREATMENT = {
  c001: {
    I: {
      intro: ["После полной резекции IA адъювантная системная терапия рутинно не показана. Для отдельных IB тактика зависит от размера, статуса резекции и молекулярного профиля. Критерии исследований по более ранним редакциям TNM сверяйте по T/N и размеру опухоли. В ADAURA изучали стадию IB–IIIA по AJCC 7.","https://www.cancer.gov/types/lung/hp/non-small-cell-lung-treatment-pdq"],
      regimens: [
        LUNG_REGIMENS.osimertinibAdjuvant,
        LUNG_REGIMENS.alectinibAdjuvant,
        LUNG_REGIMENS.nivolumabPemetrexedNeoadjuvant,
        LUNG_REGIMENS.nivolumabPemetrexedPerioperative
      ],
      surgery: {
        procedure: "Анатомическая лобэктомия с систематической оценкой корневых и медиастинальных лимфоузлов. Анатомическая сегментэктомия возможна у отобранных пациентов с периферической опухолью до 2 см, подтверждённым N0 и достижимым отрицательным краем.",
        limits: "Оценить прогнозируемые послеоперационные ОФВ₁ и DLCO, сердечно-сосудистый риск и переносимость планируемого объёма. Невозможность R0 или неприемлемый кардиопульмональный риск исключают плановую радикальную резекцию. При медицинской неоперабельности рассматривают стереотаксическую ЛТ.",
        url: "https://www.cancer.gov/types/lung/hp/non-small-cell-lung-treatment-pdq"
      }
    },
    II: {
      intro: ["Неоадъювантный и периоперационный режимы с ниволумабом изучались отдельно. После первичной операции адъювантный выбор зависит от pTNM, молекулярных данных и предшествующего лечения.","https://www.cancer.gov/types/lung/hp/non-small-cell-lung-treatment-pdq"],
      regimens: [
        LUNG_REGIMENS.nivolumabPemetrexedNeoadjuvant,
        LUNG_REGIMENS.nivolumabPemetrexedPerioperative,
        LUNG_REGIMENS.pemetrexedAdjuvant,
        LUNG_REGIMENS.pembrolizumabAdjuvant,
        LUNG_REGIMENS.osimertinibAdjuvant,
        LUNG_REGIMENS.alectinibAdjuvant
      ],
      surgery: {
        procedure: "Анатомическая лобэктомия с систематической оценкой корневых и медиастинальных узлов. При вовлечении грудной стенки и достижимой R0-резекции возможна резекция единым блоком. При центральном распространении объём зависит от анатомии и функционального резерва.",
        limits: "Оценить прогнозируемые послеоперационные ОФВ₁ и DLCO, сердечно-сосудистый риск и переносимость планируемого объёма. Невозможность R0 или неприемлемый кардиопульмональный риск исключают плановую радикальную резекцию.",
        url: "https://www.cancer.gov/types/lung/hp/non-small-cell-lung-treatment-pdq"
      }
    },
    III: {
      intro: ["При резектабельной III стадии последовательность системного лечения и операции определяет консилиум. При нерезектабельной III стадии выбор консолидации после ХЛТ зависит в том числе от EGFR. Неоадъювантный и периоперационный режимы с ниволумабом изучались отдельно.","https://www.cancer.gov/types/lung/hp/non-small-cell-lung-treatment-pdq"],
      regimens: [
        LUNG_REGIMENS.nivolumabPemetrexedNeoadjuvant,
        LUNG_REGIMENS.nivolumabPemetrexedPerioperative,
        LUNG_REGIMENS.pemetrexedAdjuvant,
        LUNG_REGIMENS.pembrolizumabAdjuvant,
        LUNG_REGIMENS.osimertinibAdjuvant,
        LUNG_REGIMENS.alectinibAdjuvant,
        LUNG_REGIMENS.carboplatinPaclitaxelChemoradiation,
        LUNG_REGIMENS.osimertinibConsolidation,
        LUNG_REGIMENS.durvalumabNsclcConsolidation
      ],
      surgery: locallyAdvancedNsclcSurgery
    },
    IV: {
      intro: ["Приведены отдельные проверенные варианты первой линии. До её выбора оцените полный молекулярный профиль, PD-L1, клиническое состояние и доступность лечения. Другие таргетируемые варианты и последующие линии будут добавлены после сверки протоколов.","https://www.cancer.gov/types/lung/hp/non-small-cell-lung-treatment-pdq"],
      regimens: [
        LUNG_REGIMENS.pembrolizumabPemetrexedMetastatic,
        LUNG_REGIMENS.pembrolizumabMonotherapy,
        LUNG_REGIMENS.osimertinibMetastatic,
        LUNG_REGIMENS.alectinibMetastatic,
        LUNG_REGIMENS.entrectinibMetastatic,
        LUNG_REGIMENS.selpercatinibMetastatic,
        LUNG_REGIMENS.capmatinibMetastatic
      ],
      surgery: oligometastaticNsclcSurgery
    }
  },
  c002: {
    I: {
      intro: ["После полной резекции IA адъювантная системная терапия рутинно не показана. При IB тактику определяют размер, факторы риска и критерии конкретного режима. Если пациент неоперабелен, обсудите стереотаксическую ЛТ.","https://www.cancer.gov/types/lung/hp/non-small-cell-lung-treatment-pdq"],
      regimens: [
        LUNG_REGIMENS.nivolumabPaclitaxelNeoadjuvant,
        LUNG_REGIMENS.nivolumabPaclitaxelPerioperative
      ],
      surgery: {
        procedure: "Анатомическая лобэктомия с систематической оценкой корневых и медиастинальных лимфоузлов. При центральной опухоли бронхопластическая лобэктомия позволяет сохранить паренхиму, если достижимы отрицательные края. При небольшом периферическом N0-очаге возможна сегментэктомия по общим критериям НМРЛ.",
        limits: "Оценить прогнозируемые послеоперационные ОФВ₁ и DLCO, сердечно-сосудистый риск и переносимость планируемого объёма. Невозможность R0 или неприемлемый кардиопульмональный риск исключают плановую радикальную резекцию. При медицинской неоперабельности обсуждают радикальную ЛТ с учётом центральной локализации.",
        url: "https://www.cancer.gov/types/lung/hp/non-small-cell-lung-treatment-pdq"
      }
    },
    II: {
      intro: ["Неоадъювантный и периоперационный режимы с ниволумабом изучались отдельно. После первичной операции адъювантный выбор зависит от pTNM, молекулярных данных и предшествующего лечения.","https://www.cancer.gov/types/lung/hp/non-small-cell-lung-treatment-pdq"],
      regimens: [
        LUNG_REGIMENS.nivolumabPaclitaxelNeoadjuvant,
        LUNG_REGIMENS.nivolumabPaclitaxelPerioperative,
        LUNG_REGIMENS.vinorelbineAdjuvant,
        LUNG_REGIMENS.pembrolizumabAdjuvant
      ],
      surgery: {
        procedure: "Лобэктомия или бронхопластическая лобэктомия с систематической оценкой корневых и медиастинальных узлов. Пневмонэктомия допустима, если меньший объём не обеспечивает R0 и ожидаемый послеоперационный резерв достаточен.",
        limits: "Оценить прогнозируемые послеоперационные ОФВ₁ и DLCO, сердечно-сосудистый риск и переносимость планируемого объёма. Невозможность R0 или неприемлемый кардиопульмональный риск исключают плановую радикальную резекцию.",
        url: "https://www.cancer.gov/types/lung/hp/non-small-cell-lung-treatment-pdq"
      }
    },
    III: {
      intro: ["Резектабельность определяет междисциплинарный консилиум после стадирования средостения. При нерезектабельной III стадии оценивают возможность дефинитивной конкурентной ХЛТ. Неоадъювантный и периоперационный режимы с ниволумабом изучались отдельно.","https://www.cancer.gov/types/lung/hp/non-small-cell-lung-treatment-pdq"],
      regimens: [
        LUNG_REGIMENS.nivolumabPaclitaxelNeoadjuvant,
        LUNG_REGIMENS.nivolumabPaclitaxelPerioperative,
        LUNG_REGIMENS.vinorelbineAdjuvant,
        LUNG_REGIMENS.pembrolizumabAdjuvant,
        LUNG_REGIMENS.carboplatinPaclitaxelChemoradiation,
        LUNG_REGIMENS.durvalumabNsclcConsolidation
      ],
      surgery: locallyAdvancedNsclcSurgery
    },
    IV: {
      intro: ["Приведены отдельные варианты первой линии. Оцените PD-L1 и показания к молекулярному тестированию. При обнаружении драйвера, для которого показана таргетная терапия, сверяйте порядок лечения по рекомендациям.","https://www.cancer.gov/types/lung/hp/non-small-cell-lung-treatment-pdq"],
      regimens: [
        LUNG_REGIMENS.pembrolizumabPaclitaxelMetastatic,
        LUNG_REGIMENS.pembrolizumabMonotherapy
      ],
      surgery: oligometastaticNsclcSurgery
    }
  },
  c003: {
    I: {
      intro: ["Цифра TNM не заменяет деление на ограниченную и распространённую болезнь. Оцените возможность безопасно включить все очаги в объём радикального облучения.","https://www.cancer.gov/types/lung/hp/small-cell-lung-treatment-pdq"],
      regimens: [
        LUNG_REGIMENS.etoposideAdjuvant,
        LUNG_REGIMENS.etoposideChemoradiation,
        LUNG_REGIMENS.durvalumabSclcConsolidation
      ],
      surgery: earlySclcSurgery
    },
    II: {
      intro: ["Цифра TNM не заменяет деление на ограниченную и распространённую болезнь. Оцените возможность безопасно включить все очаги в объём радикального облучения.","https://www.cancer.gov/types/lung/hp/small-cell-lung-treatment-pdq"],
      regimens: [
        LUNG_REGIMENS.etoposideAdjuvant,
        LUNG_REGIMENS.etoposideChemoradiation,
        LUNG_REGIMENS.durvalumabSclcConsolidation
      ],
      surgery: earlySclcSurgery
    },
    III: {
      intro: ["Цифра TNM не заменяет деление на ограниченную и распространённую болезнь. Оцените возможность безопасно включить все очаги в объём радикального облучения.","https://www.cancer.gov/types/lung/hp/small-cell-lung-treatment-pdq"],
      regimens: [
        LUNG_REGIMENS.etoposideChemoradiation,
        LUNG_REGIMENS.durvalumabSclcConsolidation
      ],
      surgery: {
        procedure: "Плановая резекция при III стадии МРЛ рутинно не применяется. При ограниченной болезни основа радикальной тактики — конкурентная химиолучевая терапия при переносимости.",
        limits: "Узловое распространение или местная распространённость за пределами отбора cT1–2N0M0 исключают стандартную хирургическую тактику.",
        url: "https://www.cancer.gov/types/lung/hp/small-cell-lung-treatment-pdq"
      }
    },
    IV: {
      regimens: [
        LUNG_REGIMENS.atezolizumabSclcInduction,
        LUNG_REGIMENS.durvalumabSclcInduction,
        LUNG_REGIMENS.lurbinectedinMaintenance,
        LUNG_REGIMENS.tarlatamabAfterPlatinum
      ],
      surgery: {
        procedure: "Радикальная резекция первичной опухоли при распространённом МРЛ рутинно не применяется. Инвазивные вмешательства могут потребоваться для контроля отдельных осложнений.",
        limits: "Отдалённая диссеминация определяет приоритет системной терапии. Объём симптоматической помощи зависит от осложнения и функционального статуса.",
        url: "https://www.cancer.gov/types/lung/hp/small-cell-lung-treatment-pdq"
      }
    }
  }
};

function treatmentSource(url, label) {
  return `<a href="${esc(url)}" target="_blank" rel="noopener noreferrer">${esc(label)} ↗</a>`;
}

function renderRegimen(protocol) {
  return `<article class="notice treatment-regimen" id="regimen-${regimenKey(protocol)}" tabindex="-1" style="margin:10px 0">
    <p><strong>${esc(protocol.regimen)}</strong></p>
    <p><b>Препараты и дозы</b></p>
    <ul>${protocol.drugs.map(drug => `<li>${esc(drug)}</li>`).join('')}</ul>
    <p><b>Интервал и длительность.</b> ${esc(protocol.cycle)}</p>
    <p><b>Условия применения.</b> ${esc(protocol.notes)}</p>
    ${protocol.contraindications ? `<p><b>Абсолютные противопоказания по указанной инструкции.</b> ${esc(protocol.contraindications)}</p>` : ''}
    ${protocol.safety ? `<p><b>Сопроводительная терапия и мониторинг.</b> ${esc(protocol.safety)}</p>` : ''}
    ${protocol.reviewScope ? `<p class="fine">${esc(protocol.reviewScope)} ${protocol.reviewSources.map(([label, url]) => treatmentSource(url, label)).join(' · ')}</p>` : ''}
    <p class="fine">${treatmentSource(protocol.url, protocol.sourceVersion || 'Источник схемы')}${protocol.reference ? ` · ${treatmentSource(protocol.reference[1], protocol.reference[0])}` : ''}${protocol.checkedOn ? ` · Сверено ${esc(protocol.checkedOn.split('-').reverse().join('.'))}` : ''}</p>
  </article>`;
}

function treatmentFor(id, stage) {
  return (LUNG_TREATMENT[id] ?? BREAST_TREATMENT[id] ?? NEXT_TREATMENT[id] ?? VERIFIED_TREATMENT_2026[id])?.[stage];
}

const ADDITIONAL_REGIMENS = window.ONCO_REGIMENS || {};

function regimensFor(id, stage) {
  const additional = ADDITIONAL_REGIMENS[id]?.all ?? ADDITIONAL_REGIMENS[id]?.[stage] ??
    (['c026', 'c027'].includes(id) && stage === 'IV' ? ADDITIONAL_REGIMENS[id].III : []);
  const base = baseRegimensFor(id, stage);
  if (id === 'c025' || id === 'c030' || id === 'c031') return [...base, ...additional];
  if (['c047', 'c048', 'c049', 'c052'].includes(id) && stage === 'IV') return [...additional, ...baseRegimensFor('c019', 'IV')];
  if (id === 'c038' && stage === 'IV') return [additional[0], ...base, additional[1]];
  return [...additional, ...base];
}

function baseRegimensFor(id, stage) {
  if (id === 'c025') return GBM_GRADE4_REGIMENS;
  const existing = STAGE_PROTOCOLS[id]?.[stage];
  return EIGHTH_PASS_REGIMENS[id]?.all ?? SIXTH_PASS_HEMATOLOGY[id] ??
    treatmentFor(id, stage)?.regimens ?? NINTH_PASS_REGIMENS[id]?.[stage] ??
    EIGHTH_PASS_REGIMENS[id]?.[stage] ?? SEVENTH_PASS_REGIMENS[id]?.[stage] ??
    FIFTH_PASS_REGIMENS[id]?.[stage] ?? FOURTH_PASS_REGIMENS[id]?.[stage] ??
    THIRD_PASS_REGIMENS[id]?.[stage] ?? SECOND_PASS_REGIMENS[id]?.[stage] ??
    AUDITED_10_REGIMENS[id]?.[stage] ?? (existing ? [existing] : []);
}

function normalizeSearch(value) {
  return value.toLowerCase().normalize('NFKC').replaceAll('ё', 'е')
    .replace(/[‐‑‒–—−]/g, '-').replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
}

function normalizeRegimenSearch(value) {
  return normalizeSearch(value.replace(/(^|\s)с(?=\d)/gi, '$1c'))
    .replace(/прям(?:ая|ой|ую) кишк(?:а|и|у)/g, 'прямая кишка')
    .replace(/рака (почки|легкого|желудка)/g, 'рак $1');
}

const REGIMEN_LINES = [
  ['Первая линия', /первая линия|первой линии|1 линия|1 й линии/],
  ['Вторая линия', /вторая линия|второй линии|2 линия|2 й линии/],
  ['Последующие линии', /последующ\p{L}* лини|треть\p{L}* лини|3 я линия|3 й линии/u],
];
const REGIMEN_PURPOSES = [
  ['Неоадъювантная', /неоадъювант|предоперацион/],
  ['Адъювантная', /(?:^| )адъювант|послеоперацион/],
  ['Периоперационная', /периоперацион/],
  ['Дефинитивная химиолучевая', /дефинитивн\p{L}* (?:хлт|химиолуч)|радикальн\p{L}* (?:хлт|химиолуч)/u],
  ['Поддерживающая', /поддерживающ|поддержка/],
  ['Индукция', /индукци/],
  ['Консолидация', /консолидаци/],
  ['Паллиативная', /паллиатив/],
];

function labelsFromTitle(title, rules) {
  return rules.filter(([, pattern]) => pattern.test(title)).map(([label]) => label);
}

function buildRegimenIndex() {
  const rows = new Map();
  for (const card of DATA) {
    const contextual = Boolean(NON_TNM_CARD_INFO[card.id]);
    for (const stage of contextual ? ['I'] : CARD_STAGES[card.id] ?? STAGES) {
      for (const protocol of regimensFor(card.id, stage)) {
        const key = card.id + ':' + JSON.stringify(protocol);
        const drugText = normalizeRegimenSearch([protocol.regimen, ...protocol.drugs].join(' '));
        if (!rows.has(key)) {
          const title = normalizeRegimenSearch(protocol.regimen);
          rows.set(key, {
            card, protocol, drugText, contexts: [],
            searchText: [drugText, card.title, card.id, CARD_SEARCH_ALIASES[card.id], ...(card.icd10 ?? [])].join(' '),
            lines: labelsFromTitle(title, REGIMEN_LINES),
            purposes: labelsFromTitle(title, REGIMEN_PURPOSES),
          });
        }
        rows.get(key).contexts.push({
          label: contextual ? 'Клиническая ситуация' : stageLabel(card, stage),
          href: '#card/' + card.id + '/' + stage + '/' + regimenKey(protocol),
        });
      }
    }
  }
  return [...rows.values()];
}

const REGIMEN_INDEX = buildRegimenIndex();

function regimenResults(query, cardId, line, purpose) {
  const terms = normalizeRegimenSearch(query).split(' ').filter(Boolean);
  return REGIMEN_INDEX.filter(row =>
    (!cardId || row.card.id === cardId) &&
    (!line || (line === 'unspecified' ? !row.lines.length : row.lines.includes(line))) &&
    (!purpose || (purpose === 'unspecified' ? !row.purposes.length : row.purposes.includes(purpose))) &&
    terms.every(term => normalizeRegimenSearch([row.searchText, ...row.contexts.map(context => context.label)].join(' ')).includes(term)));
}

function regimenOptionList(rules) {
  return rules.map(([label]) => `<option>${esc(label)}</option>`).join('') +
    '<option value="unspecified">Не указано в названии</option>';
}

const THERAPY_COMPLICATIONS = [
  {
    id: 'febrile-neutropenia',
    aliases: 'ФН лихорадка при нейтропении нейтропеническая лихорадка',
    title: 'Фебрильная нейтропения',
    signs: 'После миелосупрессивной терапии: температура во рту ≥38,3 °C однократно или ≥38,0 °C в течение часа при абсолютном числе нейтрофилов <0,5 × 10⁹/л либо ожидаемом снижении ниже этого уровня в ближайшие 48 часов.',
    urgent: 'Лихорадка после химиотерапии с подозрением на нейтропению требует немедленной очной оценки. При гипотензии, спутанности сознания или дыхательной недостаточности активируют протокол сепсиса.',
    steps: [
      'Оценить жизненные показатели, время последнего цикла и возможный очаг. Выполнить общий анализ крови с лейкоформулой и взять посевы крови, если это не задержит лечение.',
      'При подозрении на фебрильную нейтропению начать эмпирическую антибактериальную терапию в течение часа от триажа. Выбор препарата определяют тяжесть, локальная резистентность и протокол центра.',
      'При высоком риске требуется стационар. Амбулаторное ведение рассматривают только после очной оценки риска, клинической стабильности и возможности быстрого повторного обращения.',
    ],
    sources: [['ASCO/IDSA · лихорадка и нейтропения', 'https://www.idsociety.org/practice-guideline/fever-and-neutropenia-in-adults-with-cancer/']],
  },
  {
    id: 'infusion-reaction',
    aliases: 'гиперчувствительность анафилактический шок',
    title: 'Инфузионная реакция и анафилаксия',
    signs: 'Во время или вскоре после инфузии возможны приливы, зуд, крапивница, озноб, одышка, свистящее дыхание и падение давления. Анафилаксия возможна без кожных проявлений.',
    urgent: 'При стридоре, бронхоспазме, гипотензии или коллапсе немедленно вызвать реанимационную команду. При подозрении на анафилаксию препарат первой линии — адреналин внутримышечно по протоколу.',
    steps: [
      'Остановить инфузию, оценить проходимость дыхательных путей, дыхание и кровообращение. Контролировать давление, пульс и сатурацию; сохранить венозный доступ для неотложной терапии.',
      'При анафилаксии действовать по реанимационному алгоритму. Антигистаминные препараты не заменяют адреналин и не должны задерживать его введение.',
      'Зафиксировать препарат, время начала, проявления и ответ на меры. Возможность повторного введения зависит от тяжести, инструкции и оценки профильной команды.',
    ],
    sources: [
      ['eviQ · реакции гиперчувствительности', 'https://www.eviq.org.au/clinical-resources/side-effect-and-toxicity-management/immunological/1831-hypersensitivity-reaction'],
      ['Resuscitation Council UK · анафилаксия', 'https://www.resus.org.uk/library/additional-guidance/guidance-anaphylaxis/emergency-treatment-anaphylactic-reactions'],
    ],
  },
  {
    id: 'extravasation',
    aliases: 'везикант инфильтрация SLAP',
    title: 'Экстравазация противоопухолевого препарата',
    signs: 'Боль, жжение, отёк или изменение цвета кожи возле доступа, подтекание, сопротивление при введении или потеря обратного тока крови.',
    urgent: 'При подозрении сразу остановить введение и вызвать помощь. При экстравазации везиканта или подозрении на повреждение центрального доступа срочно согласовать дальнейшие действия с профильной командой.',
    steps: [
      'Оставить доступ на месте для осторожной аспирации остатка препарата. Не промывать систему и не давить на область экстравазации.',
      'Уточнить препарат, концентрацию и предполагаемый объём. Оценить и документировать границы поражения. Компресс, антидот и время удаления доступа выбирают по препарату и протоколу учреждения.',
      'Назначить сроки повторной оценки. При нарастании боли, появлении пузырей или признаках некроза требуется срочный осмотр.',
    ],
    sources: [
      ['ONS/ASCO · алгоритм для взрослых', 'https://www.ons.org/sites/default/files/2025-09/ons-asco-algorithm-on-antineoplastic-extravasation_09.2025.pdf'],
      ['eviQ · клиническая процедура', 'https://www.eviq.org.au/clinical-resources/extravasation/4156-extravasation-management-clinical-procedure'],
    ],
  },
  {
    id: 'immune-toxicity',
    aliases: 'ирНЯ irAE иммунная токсичность иммунотерапия пневмонит миокардит колит',
    title: 'Иммунозависимые нежелательные явления',
    signs: 'На фоне ингибиторов контрольных точек или после их отмены возможны новые кашель и одышка, диарея, сыпь, желтуха, выраженная слабость или неврологические симптомы.',
    urgent: 'Боль в груди, аритмия, синкопе, гипоксемия, выраженная мышечная слабость или признаки надпочечникового криза требуют неотложной оценки. Возможный миокардит оценивают срочно даже при слабо выраженных симптомах.',
    steps: [
      'Уточнить препарат, дату последнего введения и динамику симптомов. Оценить жизненные показатели и тяжесть по CTCAE; при клинически значимой либо потенциально опасной токсичности приостановить следующее введение до оценки.',
      'Обследовать по предполагаемому органу. При одышке — сатурация и оценка показаний к КТ; при подозрении на миокардит — ЭКГ, тропонин и срочная консультация; при значимой диарее — оценка обезвоживания и исключение инфекции.',
      'Тактика зависит от органа и тяжести. Решения о глюкокортикоидах, другой иммуносупрессии и возобновлении лечения сверяют с органоспецифическим алгоритмом.',
    ],
    sources: [
      ['SITC · органоспецифические алгоритмы', 'https://pmc.ncbi.nlm.nih.gov/articles/PMC8237720/'],
      ['ASCO · руководство по иммунной токсичности', 'https://ascopubs.org/doi/10.1200/JCO.21.01440'],
    ],
  },
];

function therapyComplicationsPage() {
  return shell('Осложнения лекарственной терапии', `
    <p><a class="back" href="#regimens">← Указатель лекарственных схем</a></p>
    <p class="muted">Первичная оценка осложнений противоопухолевой терапии у взрослых. Для лечения используйте полный протокол учреждения.</p>
    <p><a class="btn secondary" href="#scales/ctcae">Степени токсичности · CTCAE v6.0</a></p>
    ${THERAPY_COMPLICATIONS.map(topic => `<details class="marker-entry"${state.complication === topic.id ? ' open' : ''}>
      <summary>${esc(topic.title)}</summary>
      <div class="marker-detail">
        <p><b>Когда заподозрить.</b> ${esc(topic.signs)}</p>
        <div class="notice"><b>Срочность.</b> ${esc(topic.urgent)}</div>
        ${topic.id === 'febrile-neutropenia' ? `<p><a href="#scales/mascc">MASCC</a> · <a href="#scales/cisne">CISNE</a></p>` : ''}
        <h3>Первые действия</h3>
        <ol>${topic.steps.map(step => `<li>${esc(step)}</li>`).join('')}</ol>
        <p class="fine">${topic.sources.map(([label, url]) => treatmentSource(url, label)).join(' · ')}</p>
      </div>
    </details>`).join('')}`);
}

function regimenIndexPage() {
  if (state.regimenSection === 'complications') return therapyComplicationsPage();
  const cards = [...new Map(REGIMEN_INDEX.map(({card}) => [card.id, card])).values()]
    .sort((a, b) => a.title.localeCompare(b.title, 'ru'));
  return shell('Указатель лекарственных схем', `
    <p class="muted">Поиск по названию схемы, препарату или опухоли. Ссылки открывают дозировки и условия применения в карточке ЗНО.</p>
    <div class="actions"><a class="btn secondary" href="#regimens/complications">Справочник по осложнениям</a></div>
    <input id="regimenQuery" class="search" type="search" aria-label="Поиск лекарственной схемы" placeholder="Например, FOLFOX, пембролизумаб или C64" oninput="filterRegimenIndex()">
    <div class="regimen-filters">
      <label class="field">Нозология<select id="regimenCard" onchange="filterRegimenIndex()"><option value="">Все нозологии</option>${cards.map(card => `<option value="${esc(card.id)}">${esc(card.title)}</option>`).join('')}</select></label>
      <label class="field">Линия<select id="regimenLine" onchange="filterRegimenIndex()"><option value="">Все линии</option>${regimenOptionList(REGIMEN_LINES)}</select></label>
      <label class="field">Цель или этап<select id="regimenPurpose" onchange="filterRegimenIndex()"><option value="">Все цели и этапы</option>${regimenOptionList(REGIMEN_PURPOSES)}</select></label>
    </div>
    <p class="fine">Фильтры «Линия» и «Цель или этап» используют обозначения из названия схемы. Показания уточняйте в карточке.</p>
    <p id="regimenCount" class="muted" role="status"></p>
    <div id="regimenResults"></div>`);
}

function filterRegimenIndex() {
  const rows = regimenResults($('#regimenQuery').value, $('#regimenCard').value,
    $('#regimenLine').value, $('#regimenPurpose').value);
  $('#regimenCount').textContent = 'Найдено: ' + rows.length;
  $('#regimenResults').innerHTML = rows.map(row => `<article class="panel regimen-result">
    <h3>${esc(row.protocol.regimen)}</h3>
    <p class="muted">${esc([row.card.title, ...row.lines, ...row.purposes].join(' · '))}</p>
    <div class="actions">${row.contexts.map(context =>
      `<a class="btn secondary" href="${esc(context.href)}">${esc(context.label)}</a>`).join('')}</div>
  </article>`).join('') || '<p class="panel muted">Схемы не найдены.</p>';
}

const searchIndex = new Map(DATA.map(c => {
  const regimens = (CARD_STAGES[c.id] ?? STAGES).flatMap(stage => regimensFor(c.id, stage));
  const drugNames = regimens.flatMap(protocol => [protocol.regimen, ...protocol.drugs]);
  const text = [c.title, c.id, CARD_SEARCH_ALIASES[c.id], c.group, c.origin, c.location, c.molecular, c.markers, ...(c.icd10 ?? []), ...drugNames].join(' ');
  return [c.id, normalizeRegimenSearch(text)];
}));

function findCards(query, group = 'Все') {
  const terms = normalizeRegimenSearch(query).split(' ').filter(Boolean);
  return DATA.filter(c => (group === 'Все' || c.group === group) &&
    terms.every(term => searchIndex.get(c.id).includes(term)));
}

const STAGE_DRUG_NOTES = {
  "c077": {
    "I": [
      "Лечение в офтальмоонкологическом центре. При установленном диагнозе подобрать органосохраняющую ЛТ или локальное вмешательство по локализации и размеру.",
      "https://www.cancer.gov/types/eye/hp/intraocular-melanoma-treatment-pdq"
    ],
    "II": [
      "Оценить брахитерапию или протонную терапию. При большой опухоли и невозможности органосохранения обсуждать энуклеацию.",
      "https://www.cancer.gov/types/eye/hp/intraocular-melanoma-treatment-pdq"
    ],
    "III": [
      "Выбор между облучением и энуклеацией по размеру, экстрасклеральному распространению, состоянию глаза и возможности локального контроля. Адъювантный системный стандарт после локального лечения не установлен.",
      "https://www.cancer.gov/types/eye/hp/intraocular-melanoma-treatment-pdq"
    ],
    "IV": [
      "При M1 оценить печёночную нагрузку, HLA-A*02:01 и пригодность к системной терапии. При соответствующем HLA и показаниях рассмотреть тебентафусп. При преимущественном поражении печени обсудить регионарные методы или исследование.",
      "https://www.cancer.gov/types/eye/hp/intraocular-melanoma-treatment-pdq"
    ]
  },
  "c078": {
    "I": [
      "Панкреатодуоденальная резекция при операбельности. После R0 соотнести риск рецидива и пользу адъювантной терапии.",
      "https://pubmed.ncbi.nlm.nih.gov/37433437/"
    ],
    "II": [
      "Радикальная резекция при технической возможности, затем обсуждение адъювантного лечения с учётом гистотипа, краёв и pN.",
      "https://pubmed.ncbi.nlm.nih.gov/37433437/"
    ],
    "III": [
      "При резектабельности — операция и обсуждение адъювантного лечения. Режим выбирают по гистотипу и риску, учитывая ограниченность прямых сравнений.",
      "https://pubmed.ncbi.nlm.nih.gov/37433437/"
    ],
    "IV": [
      "При метастатической болезни — системное лечение по гистотипу, функциональному статусу и биомаркерам; восстановить билиарный отток по показаниям.",
      "https://pubmed.ncbi.nlm.nih.gov/37433437/"
    ]
  },
  "c079": {
    "I": [
      "При инвазивной аденокарциноме без перитонеального распространения рассмотреть завершение онкологической резекции с оценкой узлов; объём уточняют по факторам риска.",
      "https://acsjournals.onlinelibrary.wiley.com/doi/10.1002/cncr.35867"
    ],
    "II": [
      "После резекции оценить pT, края, степень дифференцировки и число узлов. Адъювантная терапия индивидуальна.",
      "https://acsjournals.onlinelibrary.wiley.com/doi/10.1002/cncr.35867"
    ],
    "III": [
      "После R0 при узловом поражении обсуждают адъювантный фторпиримидин с оксалиплатином, учитывая ограниченность прямых данных.",
      "https://acsjournals.onlinelibrary.wiley.com/doi/10.1002/cncr.35867"
    ],
    "IV": [
      "Перитонеальное распространение оценить в специализированном центре для обсуждения циторедукции и HIPEC. При высоком grade, нерезектабельности или внебрюшинных очагах оценить системную терапию.",
      "https://acsjournals.onlinelibrary.wiley.com/doi/10.1002/cncr.35867"
    ]
  },
  "c083": {
    "I": [
      "При операбельной болезни — анатомическая резекция и оценка узлов. Пользу адъювантной терапии обсуждают по подстадии и риску.",
      "https://pmc.ncbi.nlm.nih.gov/articles/PMC13263797/"
    ],
    "II": [
      "При резектабельности — операция и обсуждение адъювантной платиновой ХТ с учётом ограниченности доказательств.",
      "https://pmc.ncbi.nlm.nih.gov/articles/PMC13263797/"
    ],
    "III": [
      "Сначала оценить резектабельность и узловую нагрузку. При нерезектабельности консилиум определяет роль ХЛТ и последовательность лечения.",
      "https://pmc.ncbi.nlm.nih.gov/articles/PMC13263797/"
    ],
    "IV": [
      "Платина с этопозидом — один из вариантов. Схему обсуждают с учётом экспертной морфологии, состояния пациента и ограниченности сравнительных данных.",
      "https://pmc.ncbi.nlm.nih.gov/articles/PMC13263797/"
    ]
  },
  "c084": {
    "Локализованная": [
      "Резекция с отрицательными краями при достижимой R0. Периоперационную ЛТ обсуждают по риску и анатомии.",
      "https://www.cancer.gov/types/soft-tissue-sarcoma/hp/adult-soft-tissue-treatment-pdq"
    ],
    "Местнораспространённая": [
      "В саркомном центре рассмотреть мультимодальную тактику и повторную оценку резектабельности. Системную терапию обсуждают индивидуально.",
      "https://www.cancer.gov/types/soft-tissue-sarcoma/hp/adult-soft-tissue-treatment-pdq"
    ],
    "Метастатическая": [
      "У подходящих пациентов обсуждают антрациклин-содержащую терапию; цель лечения, темп прогрессирования и пригодность определяют выбор монотерапии или комбинации.",
      "https://www.cancer.gov/types/soft-tissue-sarcoma/hp/adult-soft-tissue-treatment-pdq"
    ]
  },
  "c069": {
    "2": [
      "После операции при показаниях к немедленной терапии — ЛТ с последующим PCV или темозоломидом. Если ЛТ и ХТ можно отложить, обсудить наблюдение либо ворасидениб у подходящих пациентов.",
      "https://ascopubs.org/doi/10.1200/JCO-25-00250"
    ],
    "3": [
      "После максимально безопасной резекции — ЛТ с последующим адъювантным темозоломидом (CATNON).",
      "https://ascopubs.org/doi/10.1200/JCO-25-00250"
    ],
    "4": [
      "После операции обсудить ЛТ и темозоломид. Выбор между подходом для IDH-мутантной астроцитомы grade 3 и химиолучевым подходом для глиобластомы индивидуален, поскольку прямые сравнительные данные ограничены.",
      "https://ascopubs.org/doi/10.1200/JCO-25-00250"
    ]
  },
  "c070": {
    "2": [
      "При необходимости адъювантной терапии — ЛТ с последующим PCV. Если ЛТ и ХТ можно отложить, обсудить наблюдение либо ворасидениб.",
      "https://ascopubs.org/doi/10.1200/JCO-25-00250"
    ],
    "3": [
      "ЛТ в сочетании с PCV. Темозоломид может быть альтернативой при неприемлемой токсичности PCV, сравнительная доказательная база слабее.",
      "https://ascopubs.org/doi/10.1200/JCO-25-00250"
    ]
  },
  "c071": {
    "I": [
      "Резекция с оценкой регионарных узлов при операбельности. Рутинной адъювантной системной терапии после R0 нет.",
      "https://doi.org/10.1111/jne.70174"
    ],
    "II": [
      "Резекция с оценкой узлов. После R0 стандартного адъювантного лекарственного режима нет.",
      "https://doi.org/10.1111/jne.70174"
    ],
    "III": [
      "При резектабельности обсудить операцию. При атипичном карциноиде с высоким риском послеоперационную терапию обсуждают индивидуально. При нерезектабельности тактика зависит от симптомов, темпа роста и распространённости.",
      "https://doi.org/10.1111/jne.70174"
    ],
    "IV": [
      "При прогрессировании учесть функцию опухоли, рецепторы соматостатина и темп роста. Возможны аналоги соматостатина, эверолимус, радиолигандная терапия или ХТ у отобранных пациентов.",
      "https://doi.org/10.1111/jne.70174"
    ]
  },
  "c072": {
    "I": [
      "Радикальная резекция. После R0 при низком риске обычно наблюдение; адъювантную тактику определяют по гистологии и риску.",
      "https://academic.oup.com/ejendo/article/179/4/G1/6655445"
    ],
    "II": [
      "Радикальная резекция. Митотан обсуждают при высоком риске рецидива, например при Ki-67 >10% или неполной микроскопической резекции.",
      "https://academic.oup.com/ejendo/article/179/4/G1/6655445"
    ],
    "III": [
      "Оценить возможность R0. После резекции при высоком риске обсуждают митотан; лучевую терапию рассматривают индивидуально.",
      "https://academic.oup.com/ejendo/article/179/4/G1/6655445"
    ],
    "IV": [
      "При распространённой прогрессирующей болезни у подходящих пациентов — EDP с митотаном. При менее агрессивной ограниченной болезни возможна монотерапия митотаном или индивидуальная локальная стратегия.",
      "https://academic.oup.com/ejendo/article/179/4/G1/6655445"
    ]
  },
  "c073": {
    "I": [
      "Резекция при достижимых отрицательных краях; послеоперационную ЛТ можно опустить у части пациентов с pT1 низкого риска.",
      "https://pmc.ncbi.nlm.nih.gov/articles/PMC11889493/"
    ],
    "II": [
      "Резекция при достижимых отрицательных краях. Послеоперационная ЛТ индивидуально по факторам риска.",
      "https://pmc.ncbi.nlm.nih.gov/articles/PMC11889493/"
    ],
    "III": [
      "Резекция с послеоперационной ЛТ при резектабельности. При высоком риске обсуждают совместную системную терапию; при нерезектабельности — дефинитивную ЛТ или ХЛТ.",
      "https://pmc.ncbi.nlm.nih.gov/articles/PMC11889493/"
    ],
    "IV": [
      "При M0 разделить резектабельные и нерезектабельные варианты; при отдельных опухолях обсуждают индукционную ХТ. При M1 или нерезектабельном рецидиве системная и симптоматическая тактика по результатам консилиума.",
      "https://pmc.ncbi.nlm.nih.gov/articles/PMC11889493/"
    ]
  },
  "c074": {
    "I": [
      "Резекция почки, если технически возможна. После полной резекции — наблюдение по риску.",
      "https://uroweb.org/guidelines/renal-cell-carcinoma/chapter/disease-management"
    ],
    "II": [
      "Нефрэктомия или органосохраняющая операция у отобранных пациентов. Рутинный адъювантный лекарственный режим для чистого хромофобного ПКР не установлен.",
      "https://uroweb.org/guidelines/renal-cell-carcinoma/chapter/disease-management"
    ],
    "III": [
      "Резекция при технической возможности; при опухолевом тромбе тактика в экспертном центре. После операции — наблюдение по риску или исследование.",
      "https://uroweb.org/guidelines/renal-cell-carcinoma/chapter/disease-management"
    ],
    "IV": [
      "При T4M0 индивидуально оценить резектабельность. При M1 предпочтительно исследование; возможные системные варианты обсуждают по данным для несветлоклеточного ПКР и доступности.",
      "https://uroweb.org/guidelines/renal-cell-carcinoma/chapter/disease-management"
    ]
  },
  "c075": {
    "Локализованная": [
      "При достижимой полной резекции — операция. Периоперационную ЛТ и системную терапию обсуждают с учётом локализации, риска и ранее полученной ЛТ.",
      "https://www.cancer.gov/types/soft-tissue-sarcoma/hp/adult-soft-tissue-treatment-pdq"
    ],
    "Местнораспространённая": [
      "Повторно оценить резектабельность в саркомном центре. При нерезектабельности возможен еженедельный паклитаксел, в том числе как часть стратегии с последующей повторной оценкой.",
      "https://www.cancer.gov/types/soft-tissue-sarcoma/hp/adult-soft-tissue-treatment-pdq"
    ],
    "Метастатическая": [
      "Паклитаксел или антрациклиновый подход по локализации, предшествующей терапии и состоянию пациента. Оценить возможность клинического исследования.",
      "https://www.cancer.gov/types/soft-tissue-sarcoma/hp/adult-soft-tissue-treatment-pdq"
    ]
  },
  "c066": {
    "I": [
      "Рутинная периоперационная лекарственная терапия не установлена.",
      "https://pmc.ncbi.nlm.nih.gov/articles/PMC9808465/"
    ],
    "II": [
      "Рутинное добавление химиотерапии к послеоперационной ЛТ не установлено.",
      "https://pmc.ncbi.nlm.nih.gov/articles/PMC9808465/"
    ],
    "III": [
      "При локальном M0 стандартом остаётся локальная тактика. При нерезектабельной прогрессирующей болезни, для которой радикальная ЛТ неприменима, возможны режимы по мишени, приведённые на вкладке IV.",
      "https://pmc.ncbi.nlm.nih.gov/articles/PMC9808465/"
    ]
  },
  "c067": {},
  "c068": {
    "I": [
      "Рутинная адъювантная системная терапия не установлена.",
      "https://pmc.ncbi.nlm.nih.gov/articles/PMC11145756/"
    ],
    "II": [
      "Рутинная адъювантная системная терапия не установлена.",
      "https://pmc.ncbi.nlm.nih.gov/articles/PMC11145756/"
    ],
    "III": [
      "Рутинная адъювантная системная терапия после локального лечения не установлена; при рецидивном местнораспространённом процессе см. показания к пембролизумабу.",
      "https://pmc.ncbi.nlm.nih.gov/articles/PMC11145756/"
    ]
  },
  "c057": {
    "I": [
      "При полностью удалённой низкозлокачественной форме рутинная ХТ не показана.",
      "https://pmc.ncbi.nlm.nih.gov/articles/PMC11723950/"
    ]
  },
  "c059": {
    "I": [
      "Для конвенциональной низкозлокачественной формы рутинной ХТ нет.",
      "https://pmc.ncbi.nlm.nih.gov/articles/PMC11723950/"
    ],
    "II": [
      "При конвенциональной форме рутинной ХТ нет. При мезенхимальной и отдельных дедифференцированных формах системную тактику обсуждают по гистотипу.",
      "https://pmc.ncbi.nlm.nih.gov/articles/PMC11723950/"
    ],
    "III": [
      "Выбор системного лечения зависит от подтипа. Единой дозовой схемы для хондросарком нет.",
      "https://pmc.ncbi.nlm.nih.gov/articles/PMC11723950/"
    ],
    "IV": [
      "Конвенциональная хондросаркома обычно малочувствительна к стандартной цитотоксической ХТ; при других подтипах оценивают отдельные режимы.",
      "https://pmc.ncbi.nlm.nih.gov/articles/PMC11723950/"
    ]
  },
  "c061": {
    "I": [
      "Рутинная системная терапия при низком риске после полного удаления не показана.",
      "https://pmc.ncbi.nlm.nih.gov/articles/PMC12523295/"
    ],
    "II": [
      "Периоперационную ХТ оценивают индивидуально по гистотипу, локализации и риску.",
      "https://pmc.ncbi.nlm.nih.gov/articles/PMC12523295/"
    ],
    "III": [
      "Периоперационную ХТ обсуждают для отдельных пациентов. Схемы при нерезектабельной или метастатической болезни приведены на вкладке IV.",
      "https://pmc.ncbi.nlm.nih.gov/articles/PMC12523295/"
    ]
  },
  "c062": {
    "I": [
      "Рутинная системная терапия при низком риске после полного удаления не показана.",
      "https://pmc.ncbi.nlm.nih.gov/articles/PMC12523295/"
    ],
    "II": [
      "Периоперационную ХТ оценивают индивидуально по гистотипу, локализации и риску.",
      "https://pmc.ncbi.nlm.nih.gov/articles/PMC12523295/"
    ],
    "III": [
      "Периоперационную ХТ обсуждают для отдельных пациентов. Схемы при нерезектабельной или метастатической болезни приведены на вкладке IV.",
      "https://pmc.ncbi.nlm.nih.gov/articles/PMC12523295/"
    ]
  },
  "c063": {
    "I": [
      "Рутинная системная терапия при низком риске после полного удаления не показана.",
      "https://pmc.ncbi.nlm.nih.gov/articles/PMC12523295/"
    ],
    "II": [
      "Периоперационную ХТ оценивают индивидуально по гистотипу, локализации и риску.",
      "https://pmc.ncbi.nlm.nih.gov/articles/PMC12523295/"
    ],
    "III": [
      "Периоперационную ХТ обсуждают для отдельных пациентов. Схемы при нерезектабельной или метастатической болезни приведены на вкладке IV.",
      "https://pmc.ncbi.nlm.nih.gov/articles/PMC12523295/"
    ]
  },
  "c060": {
    "I": [
      "Для обычной хордомы стандартной цитотоксической схемы нет. Системные варианты обсуждают в экспертном центре при прогрессировании.",
      "https://pmc.ncbi.nlm.nih.gov/articles/PMC11723950/"
    ]
  },
  "c064": {
    "I": [
      "При R0 рутинная адъювантная химиотерапия не показана.",
      "https://pmc.ncbi.nlm.nih.gov/articles/PMC8817662/"
    ],
    "II": [
      "Химиотерапия после R0 рутинно не показана. Лучевую терапию оценивают отдельно по краям и риску.",
      "https://pmc.ncbi.nlm.nih.gov/articles/PMC8817662/"
    ]
  },
  "c065": {
    "I": [
      "После R0 системная терапия рутинно не назначается.",
      "https://pmc.ncbi.nlm.nih.gov/articles/PMC8817662/"
    ],
    "II": [
      "Решение об адъювантном лечении зависит от краёв, стадии и консилиума; универсального адъювантного режима нет.",
      "https://pmc.ncbi.nlm.nih.gov/articles/PMC8817662/"
    ]
  },
  c052: {
    I: ["При малом объёме заболевания лечение локальное.", "https://www.cancer.gov/types/head-and-neck/hp/adult/hypopharyngeal-treatment-pdq"],
    II: ["Лекарственное лечение обсуждают при отдельных показаниях к ХЛТ или по факторам риска после операции.", "https://www.cancer.gov/types/head-and-neck/hp/adult/hypopharyngeal-treatment-pdq"],
  },
  c054: {
    I: ["После радикального удаления стадии I обычно показано наблюдение.", "https://www.cancer.gov/types/small-intestine/hp/small-intestine-treatment-pdq"],
  },
  c055: {
    I: ["После полной резекции чистого папиллярного ПКР адъювантный системный режим рутинно не установлен.", "https://uroweb.org/guidelines/renal-cell-carcinoma/chapter/disease-management"],
    II: ["После полной резекции чистого папиллярного ПКР адъювантный системный режим рутинно не установлен.", "https://uroweb.org/guidelines/renal-cell-carcinoma/chapter/disease-management"],
    III: ["После полной резекции чистого папиллярного ПКР адъювантный системный режим рутинно не установлен.", "https://uroweb.org/guidelines/renal-cell-carcinoma/chapter/disease-management"],
  },
  c047: {
    I: ["При ранней опухоли основное лечение локальное. Рутинная системная терапия не показана.", "https://www.ncbi.nlm.nih.gov/books/NBK65821/"],
    II: ["Основное лечение хирургическое. После операции показания к ЛТ или ХЛТ определяют по окончательной патоморфологии.", "https://www.ncbi.nlm.nih.gov/books/NBK65821/"],
  },
  c048: {I: ["При малом объёме опухоли часто достаточно одного локального метода. При HPV-ассоциированной опухоли показания к цисплатину определяют по T и объёму поражения узлов, включая их размеры и число.", "https://www.cancer.gov/types/head-and-neck/hp/adult/oropharyngeal-treatment-pdq"]},
  c049: {
    I: ["Основное лечение локальное. Рутинная системная терапия не показана.", "https://www.cancer.gov/types/head-and-neck/hp/adult/laryngeal-treatment-pdq"],
    II: ["Основное лечение локальное. Необходимость адъювантной терапии после операции оценивают по патоморфологии.", "https://www.cancer.gov/types/head-and-neck/hp/adult/laryngeal-treatment-pdq"],
  },
  c051: {I: ["При подтверждённом pT1 N0 M0 адъювантная системная ХТ по POUT не показана. После операции оценить окончательную стадию и риск.", "https://pmc.ncbi.nlm.nih.gov/articles/PMC7181180/"]},
  c044: {I: ["При стадии I после радикальной резекции системная терапия обычно не показана. При неблагоприятной морфологии после локального иссечения обсуждают завершение радикальной операции.", "https://www.cancer.gov/types/colorectal/hp/rectal-treatment-pdq"]},
  c005: {I: ["После радикальной резекции рака ободочной или прямой кишки I стадии адъювантная химиотерапия обычно не показана.", "https://www.cancer.gov/types/colorectal/hp/colon-treatment-pdq"]},
  c011: {I: ["После полной резекции светлоклеточного ПКР I стадии стандартная тактика — наблюдение. Критерии адъювантного пембролизумаба начинаются с опухолей более высокого риска.", "https://uroweb.org/guidelines/renal-cell-carcinoma/chapter/disease-management"]},
  c039: {I: ["Для большинства пациенток с FIGO I лечение локальное. Рутинная системная химиотерапия после операции или лучевой терапии не установлена.", "https://www.cancer.gov/types/vaginal/hp/vaginal-treatment-pdq"]},
  c040: {
    I: ["После полной резекции лейомиосаркомы без морцелляции стандартный подход — наблюдение. Тактика при других гистотипах уточняется отдельно.", "https://pubmed.ncbi.nlm.nih.gov/39322612/"],
    II: ["После полной резекции адъювантную терапию обсуждают по гистотипу и риску. При лейомиосаркоме возможна индивидуальная оценка пользы ХТ, при LG-ESS — эндокринной терапии.", "https://pubmed.ncbi.nlm.nih.gov/39322612/"],
  },
  c043: {I: ["После полной резекции гранулёзоклеточной опухоли IA обычно выбирают наблюдение. При отдельных опухолях IC и плохо дифференцированных опухолях Сертоли–Лейдига обсуждают платиносодержащую ХТ.", "https://academic.oup.com/annonc/article/29/Supplement_4/iv1/4983953"]},
};

const STAGE_SURGERY = {
  "c077": {
    "I": {
      "procedure": "Обсудить установку офтальмоаппликатора при выборе брахитерапии. При локализованном поражении радужки возможна локальная резекция в отдельных случаях.",
      "limits": "Учитывать локализацию, зрительный потенциал и доступность лучевой техники.",
      "url": "https://www.cancer.gov/types/eye/hp/intraocular-melanoma-treatment-pdq"
    },
    "II": {
      "procedure": "Обсудить органосохраняющее облучение либо энуклеацию при невозможности локального контроля.",
      "limits": "Учитывать размеры, близость к диску зрительного нерва и возможность покрытия мишени.",
      "url": "https://www.cancer.gov/types/eye/hp/intraocular-melanoma-treatment-pdq"
    },
    "III": {
      "procedure": "Энуклеация при крупных опухолях и неприемлемых условиях для сохранения глаза; оценить экстраокулярное распространение.",
      "limits": "Решение в офтальмоонкологическом центре с учётом орбитального распространения.",
      "url": "https://www.cancer.gov/types/eye/hp/intraocular-melanoma-treatment-pdq"
    },
    "IV": {
      "procedure": "Локальный контроль глаза по симптомам и угрозе осложнений. В отдельных случаях оценить локальные методы лечения метастазов.",
      "limits": "Консилиум определяет очередность с системной терапией.",
      "url": "https://www.cancer.gov/types/eye/hp/intraocular-melanoma-treatment-pdq"
    }
  },
  "c078": {
    "I": {
      "procedure": "Панкреатодуоденальная резекция с регионарной лимфодиссекцией у пригодных пациентов.",
      "limits": "Локальное удаление не обеспечивает полноценного стадирования узлов при инвазивной опухоли.",
      "url": "https://pubmed.ncbi.nlm.nih.gov/37433437/"
    },
    "II": {
      "procedure": "Панкреатодуоденальная резекция с оценкой сосудистых отношений по КТ.",
      "limits": "Перед вмешательством скорректировать холангит и оценить нутритивный риск.",
      "url": "https://pubmed.ncbi.nlm.nih.gov/37433437/"
    },
    "III": {
      "procedure": "Рассмотреть резекцию при достижимой R0 и операбельности.",
      "limits": "N+ сам по себе не равен M1; оценить распространение и риск консилиумом.",
      "url": "https://pubmed.ncbi.nlm.nih.gov/37433437/"
    },
    "IV": {
      "procedure": "Билиарное или дуоденальное стентирование либо обходное вмешательство по симптомам.",
      "limits": "Учитывать ожидаемую пользу и сроки системной терапии.",
      "url": "https://pubmed.ncbi.nlm.nih.gov/37433437/"
    }
  },
  "c079": {
    "I": {
      "procedure": "При инвазивном гистотипе оценить показания к онкологической правосторонней гемиколэктомии.",
      "limits": "Тактика после аппендэктомии зависит от окончательной морфологии, краёв и стадии.",
      "url": "https://acsjournals.onlinelibrary.wiley.com/doi/10.1002/cncr.35867"
    },
    "II": {
      "procedure": "Рассмотреть правостороннюю гемиколэктомию с регионарным стадированием.",
      "limits": "Исключить перитонеальное распространение до завершения хирургии.",
      "url": "https://acsjournals.onlinelibrary.wiley.com/doi/10.1002/cncr.35867"
    },
    "III": {
      "procedure": "Онкологическая резекция с регионарной лимфодиссекцией, если выполнима.",
      "limits": "Узловой статус влияет на обсуждение адъювантной терапии.",
      "url": "https://acsjournals.onlinelibrary.wiley.com/doi/10.1002/cncr.35867"
    },
    "IV": {
      "procedure": "При поражении брюшины направить в центр циторедуктивной хирургии.",
      "limits": "Решение по CRS/HIPEC зависит от распределения очагов, гистологии и вероятности полной циторедукции.",
      "url": "https://acsjournals.onlinelibrary.wiley.com/doi/10.1002/cncr.35867"
    }
  },
  "c083": {
    "I": {
      "procedure": "Анатомическая резекция с системной оценкой лимфоузлов при операбельности.",
      "limits": "Объём зависит от функционального резерва и размеров опухоли.",
      "url": "https://pmc.ncbi.nlm.nih.gov/articles/PMC13263797/"
    },
    "II": {
      "procedure": "Анатомическая резекция и оценка регионарных узлов.",
      "limits": "После резекции обсудить адъювантную системную терапию.",
      "url": "https://pmc.ncbi.nlm.nih.gov/articles/PMC13263797/"
    },
    "III": {
      "procedure": "Операция для отобранных пациентов после медиастинального стадирования и решения консилиума.",
      "limits": "Учитывать возможность R0 и необходимость мультимодального лечения.",
      "url": "https://pmc.ncbi.nlm.nih.gov/articles/PMC13263797/"
    },
    "IV": {
      "procedure": "Вмешательства преимущественно для контроля симптомов или по специальному решению консилиума.",
      "limits": "Стадия M1 обычно требует приоритета системной стратегии.",
      "url": "https://pmc.ncbi.nlm.nih.gov/articles/PMC13263797/"
    }
  },
  "c084": {
    "Локализованная": {
      "procedure": "Единым блоком удалить опухоль и биопсийный тракт с целью R0.",
      "limits": "При вовлечении магистрального нерва обсудить функциональные последствия и реконструкцию.",
      "url": "https://www.cancer.gov/types/soft-tissue-sarcoma/hp/adult-soft-tissue-treatment-pdq"
    },
    "Местнораспространённая": {
      "procedure": "Обсудить возможность полной резекции после предоперационной стратегии.",
      "limits": "Учитывать анатомию сплетений, сосудов и ожидаемую функцию.",
      "url": "https://www.cancer.gov/types/soft-tissue-sarcoma/hp/adult-soft-tissue-treatment-pdq"
    },
    "Метастатическая": {
      "procedure": "Рассматривать локальное вмешательство при симптомах либо избранном ограниченном распространении.",
      "limits": "Решение зависит от системного контроля и возможности полного удаления очагов.",
      "url": "https://www.cancer.gov/types/soft-tissue-sarcoma/hp/adult-soft-tissue-treatment-pdq"
    }
  },
  "c069": {
    "2": {
      "procedure": "Максимально безопасная резекция с учётом функциональной анатомии.",
      "limits": "Если резекция сопряжена с неприемлемым риском, рассмотреть биопсию.",
      "url": "https://ascopubs.org/doi/10.1200/JCO-25-00250"
    },
    "3": {
      "procedure": "Максимально безопасная резекция; при глубокой или функционально значимой локализации рассмотреть биопсию.",
      "limits": "Функциональное картирование по показаниям.",
      "url": "https://ascopubs.org/doi/10.1200/JCO-25-00250"
    },
    "4": {
      "procedure": "Максимально безопасная резекция или биопсия с получением материала для интегрированного диагноза.",
      "limits": "При рецидиве реоперация обсуждается индивидуально.",
      "url": "https://ascopubs.org/doi/10.1200/JCO-25-00250"
    }
  },
  "c070": {
    "2": {
      "procedure": "Максимально безопасная резекция; если она небезопасна, рассмотреть биопсию.",
      "limits": "Цель операции согласовать с риском стойкого дефицита.",
      "url": "https://ascopubs.org/doi/10.1200/JCO-25-00250"
    },
    "3": {
      "procedure": "Максимально безопасная резекция или биопсия с достаточным объёмом материала.",
      "limits": "После операции оценить остаточную опухоль на МРТ и сроки адъювантной терапии.",
      "url": "https://ascopubs.org/doi/10.1200/JCO-25-00250"
    }
  },
  "c071": {
    "I": {
      "procedure": "Резекция с систематической оценкой узлов; при центральной опухоли оценить бронхопластический вариант.",
      "limits": "Объём зависит от морфологии, размеров, локализации и состояния узлов.",
      "url": "https://doi.org/10.1111/jne.70174"
    },
    "II": {
      "procedure": "Анатомическая резекция с оценкой регионарных узлов.",
      "limits": "Сохранять паренхиму, если возможны отрицательные края и адекватное стадирование.",
      "url": "https://doi.org/10.1111/jne.70174"
    },
    "III": {
      "procedure": "При достижимой полной резекции обсуждать операцию в специализированной команде.",
      "limits": "Оценить распространённость узлов и функциональный резерв.",
      "url": "https://doi.org/10.1111/jne.70174"
    },
    "IV": {
      "procedure": "Локальные вмешательства по симптомам или при ограниченном распространении после консилиума.",
      "limits": "Операция не является рутинной при диссеминированном заболевании.",
      "url": "https://doi.org/10.1111/jne.70174"
    }
  },
  "c072": {
    "I": {
      "procedure": "Адреналэктомия единым блоком с окружающей клетчаткой, без повреждения капсулы.",
      "limits": "Подход выбирают в экспертном центре по размеру и признакам инвазии.",
      "url": "https://academic.oup.com/ejendo/article/179/4/G1/6655445"
    },
    "II": {
      "procedure": "Адреналэктомия с целью R0; при подозрении на инвазию предпочтителен открытый доступ.",
      "limits": "Не допускать разрыва опухоли.",
      "url": "https://academic.oup.com/ejendo/article/179/4/G1/6655445"
    },
    "III": {
      "procedure": "Резекция единым блоком при достижимой R0; при инвазии обсудить смежные органы и сосудистый этап.",
      "limits": "При нерезектабельности оценить системную стратегию и возможность последующей операции.",
      "url": "https://academic.oup.com/ejendo/article/179/4/G1/6655445"
    },
    "IV": {
      "procedure": "Резекция первичного очага и метастазов только в отобранных ситуациях.",
      "limits": "Оценить достижимость полного удаления, темп роста и цель вмешательства.",
      "url": "https://academic.oup.com/ejendo/article/179/4/G1/6655445"
    }
  },
  "c073": {
    "I": {
      "procedure": "Эндоскопическая или открытая резекция с контролем краёв.",
      "limits": "Доступ определяется локализацией и достижимостью R0.",
      "url": "https://pmc.ncbi.nlm.nih.gov/articles/PMC11889493/"
    },
    "II": {
      "procedure": "Резекция с контролем краёв в профильном центре.",
      "limits": "Оценить костные границы, состояние орбиты и основания черепа.",
      "url": "https://pmc.ncbi.nlm.nih.gov/articles/PMC11889493/"
    },
    "III": {
      "procedure": "При резектабельности планировать удаление с учётом орбиты, основания черепа и реконструкции.",
      "limits": "Тактику в отношении шейных узлов согласовать с радиотерапевтом.",
      "url": "https://pmc.ncbi.nlm.nih.gov/articles/PMC11889493/"
    },
    "IV": {
      "procedure": "При M0 оперировать только при реалистичной полной резекции; при M1 локальное вмешательство по индивидуальной цели.",
      "limits": "Инвазия критических нейроваскулярных структур может исключить радикальную резекцию.",
      "url": "https://pmc.ncbi.nlm.nih.gov/articles/PMC11889493/"
    }
  },
  "c074": {
    "I": {
      "procedure": "Органосохраняющая резекция при технической возможности.",
      "limits": "Учитывать функцию обеих почек и сложность опухоли.",
      "url": "https://uroweb.org/guidelines/renal-cell-carcinoma/chapter/disease-management"
    },
    "II": {
      "procedure": "Радикальная нефрэктомия или резекция в отобранных случаях.",
      "limits": "При единственной почке оценить вероятность сохранения функционирующей паренхимы.",
      "url": "https://uroweb.org/guidelines/renal-cell-carcinoma/chapter/disease-management"
    },
    "III": {
      "procedure": "Нефрэктомия с удалением венозного тромба при наличии показаний.",
      "limits": "Команду и доступ выбирать по уровню тромба и распространённости.",
      "url": "https://uroweb.org/guidelines/renal-cell-carcinoma/chapter/disease-management"
    },
    "IV": {
      "procedure": "При T4M0 оценить достижимость полной резекции. Циторедуктивная нефрэктомия при M1 — индивидуально.",
      "limits": "Учитывать темп заболевания и необходимость немедленного системного лечения.",
      "url": "https://uroweb.org/guidelines/renal-cell-carcinoma/chapter/disease-management"
    }
  },
  "c075": {
    "Локализованная": {
      "procedure": "Широкое иссечение с целью R0, если анатомически возможно.",
      "limits": "При кожной форме учитывать протяжённость и мультифокальность.",
      "url": "https://www.cancer.gov/types/soft-tissue-sarcoma/hp/adult-soft-tissue-treatment-pdq"
    },
    "Местнораспространённая": {
      "procedure": "При потенциальной достижимости R0 повторно оценить операцию после предоперационной терапии.",
      "limits": "Учитывать предыдущую ЛТ, возможность реконструкции и реальный риск неполной резекции.",
      "url": "https://www.cancer.gov/types/soft-tissue-sarcoma/hp/adult-soft-tissue-treatment-pdq"
    },
    "Метастатическая": {
      "procedure": "Локальное вмешательство по симптомам, например для контроля кровотечения, у отобранных пациентов.",
      "limits": "Тактику согласовать с системным лечением.",
      "url": "https://www.cancer.gov/types/soft-tissue-sarcoma/hp/adult-soft-tissue-treatment-pdq"
    }
  },
  "c066": {
    "I": {
      "procedure": "Резекция первичного очага с объёмом по локализации; при околоушной опухоли стремятся сохранить функциональный и невовлечённый лицевой нерв.",
      "limits": "Роль лечения шеи зависит от гистотипа, grade, локализации и клинического N-статуса.",
      "url": "https://pmc.ncbi.nlm.nih.gov/articles/PMC9808465/"
    },
    "II": {
      "procedure": "Резекция с отрицательными краями. При высоком риске скрытого поражения шеи обсуждают элективное лечение.",
      "limits": "Учитывают grade, периневральную инвазию и состояние лицевого нерва.",
      "url": "https://pmc.ncbi.nlm.nih.gov/articles/PMC9808465/"
    },
    "III": {
      "procedure": "Резекция единым блоком с вовлечёнными структурами при достижимой R0; терапевтическая лимфодиссекция при cN+.",
      "limits": "При периневральном распространении оценивают ход нервов и основание черепа. Резектабельность и функцию обсуждают на консилиуме.",
      "url": "https://pmc.ncbi.nlm.nih.gov/articles/PMC9808465/"
    },
    "IV": {
      "procedure": "Локальное лечение отдельных очагов или симптомов обсуждают при ограниченном распространении.",
      "limits": "При системной диссеминации показания к вмешательству определяют индивидуально.",
      "url": "https://pmc.ncbi.nlm.nih.gov/articles/PMC9808465/"
    }
  },
  "c067": {
    "IVA": {
      "procedure": "Резекция первичной опухоли при достижимой R0/R1 с приемлемой функциональной ценой.",
      "limits": "Оценить дыхательные пути, возвратные нервы и возможность своевременно начать дополнительное лечение.",
      "url": "https://journals.sagepub.com/doi/full/10.1089/thy.2020.0944"
    },
    "IVB": {
      "procedure": "Операцию обсуждают при ожидаемой R0/R1. При BRAF V600E опухоль после ответа на таргетное лечение может стать резектабельной.",
      "limits": "Необходима переоценка сосудистого и аэродигестивного вовлечения в профильном центре.",
      "url": "https://journals.sagepub.com/doi/full/10.1089/thy.2020.0944"
    },
    "IVC": {
      "procedure": "Локальное вмешательство по клинической цели, например для контроля обструкции в отдельных ситуациях.",
      "limits": "Решение зависит от анатомии, распространённости и целей пациента.",
      "url": "https://journals.sagepub.com/doi/full/10.1089/thy.2020.0944"
    }
  },
  "c068": {
    "I": {
      "procedure": "Широкое иссечение с гистологическим контролем краёв; биопсия сторожевого узла до или одновременно с иссечением.",
      "limits": "Планировать края и реконструкцию с учётом локализации и сроков возможной ЛТ.",
      "url": "https://pmc.ncbi.nlm.nih.gov/articles/PMC11145756/"
    },
    "II": {
      "procedure": "Полное иссечение первичного очага; при cN0 рассмотреть сторожевую биопсию.",
      "limits": "При значительном функциональном ущербе обсуждают радикальное облучение.",
      "url": "https://pmc.ncbi.nlm.nih.gov/articles/PMC11145756/"
    },
    "III": {
      "procedure": "При клинически поражённых узлах оценивают лечебную лимфодиссекцию и ЛТ; при микрометастазе сторожевого узла тактику выбирают индивидуально.",
      "limits": "При нерезектабельности обсуждают ЛТ и системный подход.",
      "url": "https://pmc.ncbi.nlm.nih.gov/articles/PMC11145756/"
    },
    "IV": {
      "procedure": "Вмешательство для симптоматического или избирательного локального контроля.",
      "limits": "При диссеминации хирургия не заменяет системную тактику.",
      "url": "https://pmc.ncbi.nlm.nih.gov/articles/PMC11145756/"
    }
  },
  "c057": {
    "I": {
      "procedure": "Широкая резекция первичной опухоли и биопсийного тракта.",
      "limits": "Объём зависит от локализации и возможности получить отрицательные края.",
      "url": "https://pmc.ncbi.nlm.nih.gov/articles/PMC11723950/"
    },
    "II": {
      "procedure": "Широкая резекция с сохранением конечности, если возможен надёжный локальный контроль.",
      "limits": "Выбор реконструкции, оценка краёв и патоморфологического ответа.",
      "url": "https://pmc.ncbi.nlm.nih.gov/articles/PMC11723950/"
    },
    "III": {
      "procedure": "Единый план резекции первичной опухоли и отдельных внутрикостных очагов.",
      "limits": "Учитывают распространённость по МРТ, ожидаемые края и функцию.",
      "url": "https://pmc.ncbi.nlm.nih.gov/articles/PMC11723950/"
    },
    "IV": {
      "procedure": "Оценить резекцию первичной опухоли и метастазов, особенно лёгочных, у отобранных пациентов.",
      "limits": "Учитывают возможность полного локального контроля, ответ и функциональный резерв.",
      "url": "https://pmc.ncbi.nlm.nih.gov/articles/PMC11723950/"
    }
  },
  "c059": {
    "I": {
      "procedure": "При отдельных атипичных хрящевых опухолях конечностей возможна ограниченная хирургия. При аксиальной хондросаркоме оценивают широкую резекцию.",
      "limits": "Нужна совместная оценка визуализации и морфологии в профильном центре.",
      "url": "https://pmc.ncbi.nlm.nih.gov/articles/PMC11723950/"
    },
    "II": {
      "procedure": "Широкая резекция единым блоком.",
      "limits": "Учитывают анатомические ограничения и возможность реконструкции.",
      "url": "https://pmc.ncbi.nlm.nih.gov/articles/PMC11723950/"
    },
    "III": {
      "procedure": "Резекция всех опухолевых участков в первичной зоне с планированием реконструкции.",
      "limits": "При нерезектабельности рассматривают специализированную лучевую терапию по показаниям.",
      "url": "https://pmc.ncbi.nlm.nih.gov/articles/PMC11723950/"
    },
    "IV": {
      "procedure": "Локальное вмешательство у отдельных пациентов для контроля ограниченных очагов или симптомов.",
      "limits": "Решение зависит от распространённости и цели лечения.",
      "url": "https://pmc.ncbi.nlm.nih.gov/articles/PMC11723950/"
    }
  },
  "c061": {
    "I": {
      "procedure": "Резекция с отрицательными краями в саркомном центре.",
      "limits": "Для забрюшинной липосаркомы объём операции планируют по подтипу и анатомии. При миксоидной форме учитывают относительную радиочувствительность.",
      "url": "https://pmc.ncbi.nlm.nih.gov/articles/PMC12523295/"
    },
    "II": {
      "procedure": "Широкая резекция. По показаниям обсуждают периоперационное облучение.",
      "limits": "Для забрюшинной липосаркомы объём операции планируют по подтипу и анатомии. При миксоидной форме учитывают относительную радиочувствительность.",
      "url": "https://pmc.ncbi.nlm.nih.gov/articles/PMC12523295/"
    },
    "III": {
      "procedure": "При технической возможности — резекция с отрицательными краями и оценка роли ЛТ.",
      "limits": "Для забрюшинной липосаркомы объём операции планируют по подтипу и анатомии. При миксоидной форме учитывают относительную радиочувствительность.",
      "url": "https://pmc.ncbi.nlm.nih.gov/articles/PMC12523295/"
    },
    "IV": {
      "procedure": "Локальное вмешательство при ограниченных резектабельных очагах или для контроля симптомов.",
      "limits": "Метастазэктомия возможна у отобранных пациентов. При регионарном поражении без отдалённых очагов тактику обсуждают отдельно.",
      "url": "https://pmc.ncbi.nlm.nih.gov/articles/PMC12523295/"
    }
  },
  "c062": {
    "I": {
      "procedure": "Резекция с отрицательными краями в саркомном центре.",
      "limits": "При сосудистой первичной опухоли заранее планируют контроль магистрального сосуда и необходимость реконструкции.",
      "url": "https://pmc.ncbi.nlm.nih.gov/articles/PMC12523295/"
    },
    "II": {
      "procedure": "Широкая резекция. По показаниям обсуждают периоперационное облучение.",
      "limits": "При сосудистой первичной опухоли заранее планируют контроль магистрального сосуда и необходимость реконструкции.",
      "url": "https://pmc.ncbi.nlm.nih.gov/articles/PMC12523295/"
    },
    "III": {
      "procedure": "При технической возможности — резекция с отрицательными краями и оценка роли ЛТ.",
      "limits": "При сосудистой первичной опухоли заранее планируют контроль магистрального сосуда и необходимость реконструкции.",
      "url": "https://pmc.ncbi.nlm.nih.gov/articles/PMC12523295/"
    },
    "IV": {
      "procedure": "Локальное вмешательство при ограниченных резектабельных очагах или для контроля симптомов.",
      "limits": "Метастазэктомия возможна у отобранных пациентов. При регионарном поражении без отдалённых очагов тактику обсуждают отдельно.",
      "url": "https://pmc.ncbi.nlm.nih.gov/articles/PMC12523295/"
    }
  },
  "c063": {
    "I": {
      "procedure": "Резекция с отрицательными краями в саркомном центре.",
      "limits": "При высоком риске и химиочувствительном подтипе периоперационную химиотерапию обсуждают избирательно.",
      "url": "https://pmc.ncbi.nlm.nih.gov/articles/PMC12523295/"
    },
    "II": {
      "procedure": "Широкая резекция. По показаниям обсуждают периоперационное облучение.",
      "limits": "При высоком риске и химиочувствительном подтипе периоперационную химиотерапию обсуждают избирательно.",
      "url": "https://pmc.ncbi.nlm.nih.gov/articles/PMC12523295/"
    },
    "III": {
      "procedure": "При технической возможности — резекция с отрицательными краями и оценка роли ЛТ.",
      "limits": "При высоком риске и химиочувствительном подтипе периоперационную химиотерапию обсуждают избирательно.",
      "url": "https://pmc.ncbi.nlm.nih.gov/articles/PMC12523295/"
    },
    "IV": {
      "procedure": "Локальное вмешательство при ограниченных резектабельных очагах или для контроля симптомов.",
      "limits": "Метастазэктомия возможна у отобранных пациентов. При регионарном поражении без отдалённых очагов тактику обсуждают отдельно.",
      "url": "https://pmc.ncbi.nlm.nih.gov/articles/PMC12523295/"
    }
  },
  "c058": {
    "I": {
      "procedure": "После индукции оценивают широкую резекцию первичной опухоли с отрицательными краями. При невозможности адекватной резекции используют лучевую терапию; её послеоперационную роль определяют по краям и ответу.",
      "limits": "При метастатической болезни также оценивают локальный контроль, а при рецидиве — возможность индивидуального вмешательства.",
      "url": "https://www.cancer.gov/types/bone/hp/ewing-treatment-pdq"
    }
  },
  "c060": {
    "I": {
      "procedure": "При крестцовой или позвоночной хордоме оценивают резекцию единым блоком. При основании черепа обсуждают максимально безопасную резекцию в сочетании с высокодозной ЛТ.",
      "limits": "Оценивают неврологический риск, ожидаемые края и возможность повторного локального лечения при прогрессировании.",
      "url": "https://pmc.ncbi.nlm.nih.gov/articles/PMC11723950/"
    }
  },
  "c064": {
    "I": {
      "procedure": "Полная тимэктомия с опухолью, остатком тимуса и перитимической клетчаткой.",
      "limits": "Сохраняют целостность капсулы. Минимально инвазивный доступ допустим при соблюдении онкологических принципов. Перед операцией оценить и при необходимости стабилизировать миастению.",
      "url": "https://www.cancer.gov/types/thymus-cancer/hp/thymoma-treatment-pdq"
    },
    "II": {
      "procedure": "Полная тимэктомия с резекцией вовлечённой структуры единым блоком, если достижимы отрицательные края.",
      "limits": "Объём зависит от вовлечения перикарда, лёгкого или диафрагмального нерва. Учитывают функцию дыхания и миастению.",
      "url": "https://www.cancer.gov/types/thymus-cancer/hp/thymoma-treatment-pdq"
    },
    "III": {
      "procedure": "При ожидаемой R0 — резекция единым блоком с вовлечёнными структурами. При пограничной резектабельности — повторная оценка после индукции.",
      "limits": "Решение зависит от вовлечения сосудов и других критических структур, функционального резерва и вероятности полной резекции.",
      "url": "https://www.cancer.gov/types/thymus-cancer/hp/thymoma-treatment-pdq"
    },
    "IV": {
      "procedure": "При ограниченных плевральных или перикардиальных очагах IVA обсуждают резекцию как часть комбинированного лечения.",
      "limits": "При диффузной нерезектабельной диссеминации радикальная операция обычно неприменима. Решение принимает экспертный консилиум.",
      "url": "https://www.cancer.gov/types/thymus-cancer/hp/thymoma-treatment-pdq"
    }
  },
  "c065": {
    "I": {
      "procedure": "Полная тимэктомия с опухолью и оценкой регионарных узлов.",
      "limits": "Планируют оценку передних и глубоких узлов. Доступ выбирают с учётом достижения R0.",
      "url": "https://www.cancer.gov/types/thymus-cancer/hp/thymoma-treatment-pdq"
    },
    "II": {
      "procedure": "Резекция опухоли с тимусом и вовлечённой резектабельной структурой единым блоком, с оценкой лимфоузлов.",
      "limits": "Объём определяют по анатомии и функциональному резерву. Края резекции учитывают при выборе послеоперационного лечения.",
      "url": "https://www.cancer.gov/types/thymus-cancer/hp/thymoma-treatment-pdq"
    },
    "III": {
      "procedure": "Резекция единым блоком при ожидаемой R0. После индукции операцию обсуждают при достижимости полной резекции.",
      "limits": "Вовлечение магистральных сосудов или других критических структур требует оценки в экспертном центре.",
      "url": "https://www.cancer.gov/types/thymus-cancer/hp/thymoma-treatment-pdq"
    },
    "IV": {
      "procedure": "При отдельных вариантах IVA локальное вмешательство рассматривают в рамках комбинированной тактики.",
      "limits": "При IVB или нерезектабельной диссеминации радикальная резекция рутинно не проводится.",
      "url": "https://www.cancer.gov/types/thymus-cancer/hp/thymoma-treatment-pdq"
    }
  },
  c039: {
    I: {"procedure": "При небольшом резектабельном очаге возможна широкая локальная резекция или частичная вагинэктомия. При инвазивной опухоли объём резекции и регионарного стадирования зависит от отдела влагалища.", "limits": "При невозможности получить отрицательные края с приемлемой функциональной потерей предпочтительна радикальная лучевая терапия.", "url": "https://www.cancer.gov/types/vaginal/hp/vaginal-treatment-pdq"},
    II: {"procedure": "Операцию обсуждают в отдельных случаях при достижимости отрицательных краёв. Основной локальный подход — радикальная лучевая терапия с брахитерапией по показаниям.", "limits": "Паравагинальное распространение ограничивает возможность органосохраняющей резекции.", "url": "https://www.cancer.gov/types/vaginal/hp/vaginal-treatment-pdq"},
    III: {"procedure": "Первичная радикальная операция обычно не применяется. При изолированном центральном рецидиве после облучения возможна спасительная резекция в экспертном центре.", "limits": "Распространение на стенку таза ограничивает достижимость R0.", "url": "https://www.cancer.gov/types/vaginal/hp/vaginal-treatment-pdq"},
    IV: {"procedure": "При IVA основной локальный подход — лучевая терапия. При IVB вмешательства индивидуально используют для контроля осложнений, включая обструкцию и свищи.", "limits": "Эвисцерацию рассматривают только в отдельных случаях локализованного процесса при достижимости R0 и приемлемом риске.", "url": "https://www.cancer.gov/types/vaginal/hp/vaginal-treatment-pdq"},
  },
  c040: {
    I: {"procedure": "Тотальная гистерэктомия с извлечением матки целиком. После менопаузы обычно выполняют двустороннюю сальпингоофорэктомию. До менопаузы решение зависит от гистотипа и гормональной чувствительности.", "limits": "Избегать морцелляции и разрыва опухоли. Систематическая лимфодиссекция при клинически интактных узлах не показана. Подозрительные узлы удаляют.", "url": "https://pubmed.ncbi.nlm.nih.gov/39322612/"},
    II: {"procedure": "Тотальная гистерэктомия с удалением видимых тазовых очагов и подозрительных лимфоузлов при достижимости полной резекции.", "limits": "Объём резекции смежных органов и сохранение яичников определяют по распространённости, гистотипу и операционному риску.", "url": "https://pubmed.ncbi.nlm.nih.gov/39322612/"},
    III: {"procedure": "При резектабельности стремятся удалить всю макроскопическую опухоль. Возможны гистерэктомия, двусторонняя сальпингоофорэктомия, резекция перитонеальных очагов и поражённых органов.", "limits": "При высокой ожидаемой морбидности или невозможности полной резекции последовательность лечения определяет консилиум.", "url": "https://pubmed.ncbi.nlm.nih.gov/39322612/"},
    IV: {"procedure": "При IVA или ограниченном метастатическом процессе локальную резекцию рассматривают у отобранных пациенток, если возможно полное удаление очагов. При диссеминации операция может быть симптоматической.", "limits": "Решение зависит от резектабельности всех очагов, темпа прогрессирования, гистотипа и ожидаемой морбидности.", "url": "https://pubmed.ncbi.nlm.nih.gov/39322612/"},
  },
  c041: {
    I: {"procedure": "При локализованных PSTT и ETT основной метод — гистерэктомия с сальпингэктомией. При других формах GTN гистерэктомию обсуждают при завершённых репродуктивных планах, кровотечении или локальной резистентности.", "limits": "После операции продолжают мониторинг ХГЧ. Для PSTT/ETT вопрос адъювантной ХТ решают отдельно с учётом интервала от причинной беременности.", "url": "https://orbi.uliege.be/bitstream/2268/340461/1/2025-JCO-GTD%20GTN-Guidelines-Lok.pdf"},
    II: {"procedure": "При PSTT/ETT возможна гистерэктомия с резекцией доступных очагов и комбинированной ХТ. При других формах вмешательство обсуждают для гемостаза или при изолированном резистентном очаге.", "limits": "Гиперваскулярные влагалищные очаги могут вызвать массивное кровотечение при биопсии или резекции.", "url": "https://orbi.uliege.be/bitstream/2268/340461/1/2025-JCO-GTD%20GTN-Guidelines-Lok.pdf"},
    III: {"procedure": "При PSTT/ETT обсуждают гистерэктомию и резекцию отдельных остаточных очагов в составе комбинированного лечения. При другой GTN резекцию единичного устойчивого лёгочного очага рассматривают после системной терапии.", "limits": "Не удаляют рутинно остаточные образования в лёгких при нормальном ХГЧ после лечения химиочувствительной GTN. PSTT/ETT требуют отдельной оценки.", "url": "https://orbi.uliege.be/bitstream/2268/340461/1/2025-JCO-GTD%20GTN-Guidelines-Lok.pdf"},
    IV: {"procedure": "Вмешательства обсуждают при угрожающем кровотечении, внутричерепной гипертензии или отдельных резистентных очагах. При PSTT/ETT оценивают возможность удаления остаточной болезни после ХТ.", "limits": "Последовательность вмешательств определяет специализированный центр с учётом массивности болезни и риска кровотечения.", "url": "https://orbi.uliege.be/bitstream/2268/340461/1/2025-JCO-GTD%20GTN-Guidelines-Lok.pdf"},
  },
  c042: {
    I: {"procedure": "Односторонняя сальпингоофорэктомия с хирургическим стадированием и сохранением матки и нормального второго яичника при желании сохранить фертильность.", "limits": "Избегать разрыва опухоли. Нормальный контралатеральный яичник рутинно не биопсируют. Послеоперационная тактика зависит от гистотипа, подстадии и маркеров.", "url": "https://www.cancer.gov/types/ovarian/hp/ovarian-germ-cell-treatment-pdq"},
    II: {"procedure": "Резекция поражённого придатка и доступных тазовых очагов с сохранением матки и здорового второго яичника при онкологической допустимости.", "limits": "Объём резекции согласуют с планом платиносодержащей ХТ и риском задержки её начала.", "url": "https://www.cancer.gov/types/ovarian/hp/ovarian-germ-cell-treatment-pdq"},
    III: {"procedure": "Удаление опухоли яичника и безопасная циторедукция. После ХТ обсуждают резекцию персистирующих масс, особенно при тератомном компоненте.", "limits": "При нерезектабельности допустимо начать с ХТ после морфологического подтверждения. Решение о повторной операции учитывает динамику маркеров и визуализацию.", "url": "https://www.cancer.gov/types/ovarian/hp/ovarian-germ-cell-treatment-pdq"},
    IV: {"procedure": "Операцию согласуют с системной терапией. После ответа обсуждают удаление резектабельных остаточных образований при подозрении на зрелую тератому или жизнеспособную опухоль.", "limits": "Множественные метастазы сами по себе не требуют расширенной первичной операции. При росте маркеров сначала оценивают резистентность и варианты последующей ХТ.", "url": "https://www.cancer.gov/types/ovarian/hp/ovarian-germ-cell-treatment-pdq"},
  },
  c043: {
    I: {"procedure": "При одностороннем процессе и репродуктивных планах возможна односторонняя сальпингоофорэктомия со стадированием. В иных случаях обсуждают гистерэктомию с двусторонней сальпингоофорэктомией. Выполняют перитонеальное стадирование.", "limits": "Избегать разрыва опухоли. При нормальных узлах рутинная лимфодиссекция не требуется. При гранулёзоклеточной опухоли и сохранении матки оценивают эндометрий.", "url": "https://academic.oup.com/annonc/article/29/Supplement_4/iv1/4983953"},
    II: {"procedure": "При резектабельности удаляют опухоль и видимые тазовые очаги. У пациенток без репродуктивных планов обычно выполняют гистерэктомию с двусторонней сальпингоофорэктомией.", "limits": "Планирование зависит от подтверждённого гистотипа, остаточной опухоли и ожидаемого функционального ущерба.", "url": "https://academic.oup.com/annonc/article/29/Supplement_4/iv1/4983953"},
    III: {"procedure": "При достижимости полной макроскопической резекции рассматривают циторедукцию с удалением перитонеальных очагов и подозрительных узлов.", "limits": "Обширные резекции обсуждают в экспертном центре с учётом операционного риска и возможности системной терапии.", "url": "https://academic.oup.com/annonc/article/29/Supplement_4/iv1/4983953"},
    IV: {"procedure": "Локальную резекцию рассматривают при ограниченном резектабельном процессе или для контроля осложнений.", "limits": "При нерезектабельной диссеминации тактика преимущественно системная. При планировании операции оценивают темп роста и достижимость полной резекции.", "url": "https://academic.oup.com/annonc/article/29/Supplement_4/iv1/4983953"},
  },
  c044: {
    I: {procedure:"У отобранных пациентов с небольшим cT1N0 низкого риска — полнослойное трансанальное иссечение, в том числе TEM/TAMIS. При cT2 или неблагоприятной морфологии после иссечения — радикальная резекция с мезоректумэктомией соответствующего объёма.", limits:"Локальное иссечение не оценивает регионарные узлы. Оценить края, глубину инвазии, дифференцировку и лимфоваскулярную инвазию. При неблагоприятных признаках обсуждают завершение радикальной операции.", url:"https://www.cancer.gov/types/colorectal/hp/rectal-treatment-pdq"},
    II: {procedure:"Радикальная резекция с мезоректумэктомией в объёме по уровню опухоли. Для средней и нижней трети обычно выполняют тотальную мезоректумэктомию (TME). Срок операции согласуют с неоадъювантным лечением и повторной оценкой.", limits:"При невозможности сохранить сфинктер с отрицательными краями и приемлемой функцией рассматривают брюшно-промежностную экстирпацию.", url:"https://www.cancer.gov/types/colorectal/hp/rectal-treatment-pdq"},
    III: {procedure:"После рестадирования обычно выполняют радикальную резекцию с мезоректумэктомией. При местной инвазии возможна резекция поражённых смежных органов единым блоком, если достижима R0.", limits:"При полном клиническом ответе консилиум может предложить наблюдение с интенсивным мониторингом, если пациент согласен и доступна своевременная спасительная операция. Оценить латеральные узлы по МРТ.", url:"https://pubmed.ncbi.nlm.nih.gov/39116386/"},
    IV: {procedure:"При резектабельных или потенциально резектабельных метастазах согласовать резекцию первичной опухоли и удаление или аблацию метастазов. При обструкции, перфорации или кровотечении обсуждают диверсию или иное паллиативное вмешательство.", limits:"При нерезектабельных метастазах и бессимптомной первичной опухоли рутинную резекцию первичной опухоли обычно не проводят.", url:"https://www.cancer.gov/types/colorectal/hp/rectal-treatment-pdq"},
  },
  c047: {
    I: {"procedure": "Локальное иссечение первичной опухоли с отрицательными краями.", "limits": "Тактику для cN0 выбирают по DOI, локализации и доступности стадирования сторожевого узла.", "url": "https://www.ncbi.nlm.nih.gov/books/NBK65821/"},
    II: {"procedure": "Резекция первичной опухоли с лечением шеи по риску.", "limits": "Объём операции зависит от вовлечения языка, дна полости рта и прилежащей кости.", "url": "https://www.ncbi.nlm.nih.gov/books/NBK65821/"},
    III: {"procedure": "Резекция первичной опухоли и лимфодиссекция, при необходимости реконструкция.", "limits": "Радикальность оценивают по краям; при R1 обсуждают повторную резекцию или послеоперационную ХЛТ по показаниям.", "url": "https://www.ncbi.nlm.nih.gov/books/NBK65821/"},
    IV: {"procedure": "В резектабельных случаях возможна комбинированная резекция, включая нижнюю челюсть при её инвазии, с реконструкцией.", "limits": "Оценить возможность R0 и последствия для речи, глотания и дыхания. При M1 операция обычно симптоматическая.", "url": "https://www.ncbi.nlm.nih.gov/books/NBK65821/"},
  },
  c048: {
    I: {"procedure": "Трансоральная резекция и лечение шеи у отобранных пациентов.", "limits": "Оценить cT/cN и HPV-статус; радикальная ЛТ может быть альтернативой.", "url": "https://www.cancer.gov/types/head-and-neck/hp/adult/oropharyngeal-treatment-pdq"},
    II: {"procedure": "Трансоральная резекция с шейной лимфодиссекцией при достижимости отрицательных краёв.", "limits": "Учитывать вероятность послеоперационной ЛТ/ХЛТ и последствия для глотания.", "url": "https://www.cancer.gov/types/head-and-neck/hp/adult/oropharyngeal-treatment-pdq"},
    III: {"procedure": "Резекция у отобранных пациентов с резектабельной опухолью, если ожидаемая функция приемлема.", "limits": "При распространённой M0 болезни дефинитивная ХЛТ может быть предпочтительнее тримодальной терапии.", "url": "https://www.cancer.gov/types/head-and-neck/hp/adult/oropharyngeal-treatment-pdq"},
    IV: {"procedure": "Операция возможна у отдельных пациентов с резектабельной M0 болезнью или при локальном рецидиве.", "limits": "Уточнять cT/cN/M и используемую редакцию AJCC. При M1 локальные вмешательства определяются симптомами и консилиумом.", "url": "https://www.cancer.gov/types/head-and-neck/hp/adult/oropharyngeal-treatment-pdq"},
  },
  c049: {
    I: {"procedure": "При ранней складочной опухоли возможна трансоральная лазерная резекция.", "limits": "Обсудить ожидаемое качество голоса и альтернативу в виде радикальной ЛТ.", "url": "https://www.cancer.gov/types/head-and-neck/hp/adult/laryngeal-treatment-pdq"},
    II: {"procedure": "В отдельных случаях возможна трансоральная или открытая частичная резекция.", "limits": "Оценить распространённость, подвижность складок, глотание и план лечения шеи.", "url": "https://www.cancer.gov/types/head-and-neck/hp/adult/laryngeal-treatment-pdq"},
    III: {"procedure": "Возможна ларингэктомия с лечением шеи по показаниям, особенно при нарушенной функции органа.", "limits": "При сохранной функции и пригодности к цисплатину обсуждают дефинитивную ХЛТ.", "url": "https://www.cancer.gov/types/head-and-neck/hp/adult/laryngeal-treatment-pdq"},
    IV: {"procedure": "При резектабельном объёмном T4a — тотальная ларингэктомия с лечением шеи по распространённости.", "limits": "При M1 цель вмешательства обычно симптоматическая. После операции оценить показания к ЛТ/ХЛТ и голосовой реабилитации.", "url": "https://www.cancer.gov/types/head-and-neck/hp/adult/laryngeal-treatment-pdq"},
  },
  c051: {
    I: {"procedure": "При низком риске — эндоскопическая аблация; для отдельных дистальных опухолей возможна сегментарная резекция мочеточника.", "limits": "Требуются контрольная уретероскопия и последующее строгое наблюдение. При высоком риске рассмотреть радикальную операцию.", "url": "https://uroweb.org/guidelines/upper-urinary-tract-urothelial-cell-carcinoma/chapter/disease-management"},
    II: {"procedure": "Радикальная нефроуретерэктомия с удалением манжеты мочевого пузыря.", "limits": "До операции оценить функцию контралатеральной почки и возможное снижение СКФ после резекции.", "url": "https://uroweb.org/guidelines/upper-urinary-tract-urothelial-cell-carcinoma/chapter/disease-management"},
    III: {"procedure": "Нефроуретерэктомия с манжетой мочевого пузыря и лимфодиссекцией по анатомическому шаблону при высоком риске.", "limits": "При необходимости системной терапии обсуждают её сроки до операции с учётом пригодности к цисплатину.", "url": "https://uroweb.org/guidelines/upper-urinary-tract-urothelial-cell-carcinoma/chapter/disease-management"},
    IV: {"procedure": "При отобранных резектабельных M0 случаях операция может быть частью мультимодального лечения.", "limits": "При метастатическом процессе нефроуретерэктомию обычно рассматривают для контроля симптомов; решение консилиума.", "url": "https://uroweb.org/guidelines/upper-urinary-tract-urothelial-cell-carcinoma/chapter/disease-management"},
  },
  c052: {
    I: {"procedure": "Для небольших доступных опухолей возможна трансоральная или открытая ограниченная резекция.", "limits": "Оценить достижимость отрицательных краёв, глотание и альтернативную ЛТ.", "url": "https://www.cancer.gov/types/head-and-neck/hp/adult/hypopharyngeal-treatment-pdq"},
    II: {"procedure": "У отобранных пациентов — частичная фарингэктомия с лечением регионарных узлов по показаниям.", "limits": "При ожидаемой неприемлемой дисфагии рассмотреть нехирургический подход.", "url": "https://www.cancer.gov/types/head-and-neck/hp/adult/hypopharyngeal-treatment-pdq"},
    III: {"procedure": "При резектабельности объём варьирует от частичной резекции до ларингофарингэктомии с лимфодиссекцией.", "limits": "Оценить возможность реконструкции и риск тримодального лечения.", "url": "https://www.cancer.gov/types/head-and-neck/hp/adult/hypopharyngeal-treatment-pdq"},
    IV: {"procedure": "При резектабельной распространённой опухоли возможна тотальная ларингофарингэктомия с реконструкцией.", "limits": "При M1 вмешательство обычно направлено на устранение симптомов.", "url": "https://www.cancer.gov/types/head-and-neck/hp/adult/hypopharyngeal-treatment-pdq"},
  },
  c053: {
    I: {"procedure": "При R0 pT1a достаточна холецистэктомия. При pT1b рассмотреть завершение радикальной операции и регионарную лимфодиссекцию.", "limits": "При случайной находке сначала пересмотреть препарат и исключить распространение.", "url": "https://www.cancer.gov/types/gallbladder/hp/gallbladder-treatment-pdq"},
    II: {"procedure": "При резектабельности — удаление опухоли с прилежащей печёночной тканью и регионарная лимфодиссекция.", "limits": "Объём резекции печени определяется достижимостью R0. Резекция внепечёночного протока требуется при вовлечении или необходимости обеспечить чистый край.", "url": "https://www.cancer.gov/types/gallbladder/hp/gallbladder-treatment-pdq"},
    III: {"procedure": "У отобранных пациентов возможна расширенная резекция единым блоком на гепатобилиарном консилиуме.", "limits": "Оценить вероятность R0, сосудистую анатомию и остаточный объём печени.", "url": "https://www.cancer.gov/types/gallbladder/hp/gallbladder-treatment-pdq"},
    IV: {"procedure": "Радикальную резекцию при диссеминации рутинно не выполняют.", "limits": "Для контроля обструкции рассмотреть билиарное дренирование по показаниям.", "url": "https://www.cancer.gov/types/gallbladder/hp/gallbladder-treatment-pdq"},
  },
  c054: {
    I: {"procedure": "Сегментарная резекция тощей или подвздошной кишки с регионарными узлами. При дуоденальной опухоли объём зависит от локализации.", "limits": "При вовлечении второй части двенадцатиперстной кишки может потребоваться панкреатодуоденальная резекция.", "url": "https://www.cancer.gov/types/small-intestine/hp/small-intestine-treatment-pdq"},
    II: {"procedure": "Резекция первичной опухоли с регионарными узлами и патоморфологической оценкой краёв.", "limits": "Учитывать место опухоли, инвазию соседних структур и достаточность оценки узлов.", "url": "https://www.cancer.gov/types/small-intestine/hp/small-intestine-treatment-pdq"},
    III: {"procedure": "Радикальная резекция первичного очага и регионарных лимфоузлов при резектабельности.", "limits": "После операции оценить показания к адъювантной ХТ.", "url": "https://www.cancer.gov/types/small-intestine/hp/small-intestine-treatment-pdq"},
    IV: {"procedure": "При обструкции, кровотечении или перфорации рассмотреть симптоматическое вмешательство.", "limits": "Резекция метастазов возможна лишь у тщательно отобранных пациентов после оценки в профильном центре.", "url": "https://www.cancer.gov/types/small-intestine/hp/small-intestine-treatment-pdq"},
  },
  c055: {
    I: {"procedure": "Резекция почки предпочтительна при T1 и технической возможности.", "limits": "Оценить сложность резекции, СКФ и функцию контралатеральной почки.", "url": "https://uroweb.org/guidelines/renal-cell-carcinoma/chapter/disease-management"},
    II: {"procedure": "Радикальная нефрэктомия, если органосохраняющая операция технически небезопасна; у отобранных пациентов возможна резекция.", "limits": "Особенно важна оценка возможности сохранения нефронов при единственной почке или ХБП.", "url": "https://uroweb.org/guidelines/renal-cell-carcinoma/chapter/disease-management"},
    III: {"procedure": "Нефрэктомия с тромбэктомией при резектабельном венозном тромбе по показаниям.", "limits": "Уровень тромба и ожидаемый операционный риск определяют состав команды и объём вмешательства.", "url": "https://uroweb.org/guidelines/renal-cell-carcinoma/chapter/disease-management"},
    IV: {"procedure": "Циторедуктивную нефрэктомию или локальное лечение отдельных метастазов обсуждают индивидуально.", "limits": "Если требуется немедленная системная терапия, учитывают риск её задержки и возможность отсроченной операции.", "url": "https://uroweb.org/guidelines/renal-cell-carcinoma/chapter/disease-management"},
  },
};

function surgeryForStage(c, stage, treatment = treatmentFor(c.id, stage)) {
  const legacySurgery = stage !== 'IV' || ['c005', 'c022', 'c024'].includes(c.id);
  return STAGE_SURGERY[c.id]?.[stage] ?? treatment?.surgery ?? (REMAINING_SURGERY[c.id] && (stage !== 'IV' || ['c022','c024','c032','c033','c034','c037'].includes(c.id)) ? REMAINING_SURGERY[c.id] : undefined) ?? (legacySurgery ? SURGERY_DETAILS[c.id] : undefined);
}

function stageExtras(c, stage = state.stage) {
  const treatment = treatmentFor(c.id, stage);
  const surgery = surgeryForStage(c, stage, treatment);
  const intro = c.id === 'c009' ? [
    'Для выбора терапии дополнительно оцените BCLC 2025, функцию печени и ECOG. Допустимость локальных методов и показания к системной терапии определяет консилиум.',
    'https://www.clinicbarcelona.org/en/news/bclc-2025-guidelines-introduce-a-new-model-to-personalize-liver-cancer-treatment'
  ] : c.id === 'c012' && (stage === 'II' || stage === 'III') ? [
    'Периоперационный режим энфортумаб ведотин + пембролизумаб зарегистрирован FDA для кандидатов на цистэктомию. Число циклов зависит от пригодности к цисплатину.',
    'https://www.fda.gov/drugs/cancer-approvals/fda-approves-pembrolizumab-or-pembrolizumab-and-berahyaluronidase-alfa-pmph-each-enfortumab-vedotin'
  ] : c.id === 'c014' ? [
    'Группы стадий AJCC 8 включают I–III с учётом послеоперационной категории S. IGCCCG прогнозирует исход при распространённом процессе и определяет выбор и длительность ХТ.',
    'https://www.cancer.gov/types/testicular/hp/testicular-treatment-pdq'
  ] : c.id === 'c021' && stage === 'IV' ? [
    'FDA исключило показание пралсетиниба при RET-мутированном медуллярном раке щитовидной железы.',
    'https://www.accessdata.fda.gov/drugsatfda_docs/appletter/2023/213721Orig1s014ltr.pdf'
  ] : c.id === 'c041' ? [
    'Анатомическая стадия указана по FIGO 2026. Схему выбирают с учётом балла риска и гистотипа. Для PSTT и ETT используют отдельные прогностические критерии.',
    'https://pmc.ncbi.nlm.nih.gov/articles/PMC13505264/'
  ] : c.id === 'c028' && (stage === 'III' || stage === 'IV') ? [
    'FDA отозвало одобрение таземетостата в июне 2026 года после выявления повышенного риска вторичных гематологических злокачественных опухолей. Регуляторный статус вне США уточняется отдельно.',
    'https://www.fda.gov/drugs/cancer-approvals/withdrawn-cancer-accelerated-approvals'
  ] : treatment?.intro;
  return renderTreatmentTabs(renderDrugContent(c.id, stage, intro), renderSurgeryContent(surgery));
}

function renderDrugContent(id, stage, intro) {
  const regimens = regimensFor(id, stage);
  const drugNote = STAGE_DRUG_NOTES[id]?.[stage];
  return `${intro ? `<p>${esc(intro[0])} ${treatmentSource(intro[1], 'Источник')}</p>` : ''}
    ${regimens.length
      ? `<p class="fine">Опубликованные режимы для клинической сверки. Применимость и регистрация зависят от показания и страны.</p>${regimens.map(renderRegimen).join('')}`
      : `<div class="notice" style="margin:10px 0">${drugNote ? `${esc(drugNote[0])} ${treatmentSource(drugNote[1], 'Источник')}` : 'Дозовый протокол для этой ситуации в карточке отсутствует. См. описание лечебной тактики и источники.'}</div>`}`;
}

function renderSurgeryContent(surgery) {
  const algorithm = SURGICAL_ALGORITHMS.find(item => item.cards.includes(state.card));
  const algorithmLink = algorithm ? '#surgery/' + algorithm.id + '/' + state.card + '/' + state.stage : null;
  return `<div class="notice" style="margin:10px 0">
    ${surgery?.procedure ? `<p>${esc(surgery.procedure)}</p>
      ${surgery.limits ? `<p><b>Ограничения и противопоказания.</b> ${esc(surgery.limits)}</p>` : ''}`
      : '<p>Для этой стадии в карточке нет отдельного хирургического алгоритма. Решение зависит от нозологии, резектабельности и цели лечения.</p>'}
    ${surgery?.url ? `<p class="fine">${treatmentSource(surgery.url, 'Источник хирургической тактики')}</p>` : ''}
    ${algorithmLink ? `<p><a class="btn secondary" href="${esc(algorithmLink)}">Подробный хирургический алгоритм</a></p>` : ''}
  </div>`;
}

function renderTreatmentTabs(drugContent, surgeryContent) {
  const drugsSelected = state.treatmentTab === 'drugs';
  return `<div class="stage-extras">
    <div class="tabs" style="margin:14px 0 10px">
      <button class="tab ${drugsSelected ? 'selected' : ''}" data-treatment="drugs" aria-pressed="${drugsSelected}" onclick="setTreatmentTab('drugs')">Препараты · дозировки · курсы</button>
      <button class="tab ${drugsSelected ? '' : 'selected'}" data-treatment="surgery" aria-pressed="${!drugsSelected}" onclick="setTreatmentTab('surgery')">Хирургическое лечение</button>
    </div>
    <div class="treatment-content ${drugsSelected ? '' : 'print-only'}">${drugContent}</div>
    <div class="treatment-content ${drugsSelected ? 'print-only' : ''}">${surgeryContent}</div>
  </div>`;
}

function setTreatmentTab(t) {
  if (!['drugs', 'surgery'].includes(t)) return;
  state.treatmentTab = t;
  render();
  $(`[data-treatment="${t}"]`)?.focus({preventScroll: true});
}

function setStage(s) {
  if (!(CARD_STAGES[state.card] ?? STAGES).includes(s)) return;
  state.stage = s;
  render();
  $(`[data-stage="${s}"]`)?.focus({preventScroll: true});
}
const stagingData = window.ONCO_STAGING ?? {entries: [], other: {}};
const stagingEntries = new Map(stagingData.entries.map(entry => [entry.id, entry]));
const stagingByCard = new Map(DATA.map(card => [
  card.id, stagingData.entries.filter(entry => entry.cards.includes(card.id)),
]));
const stagingCards = DATA.filter(card => stagingByCard.get(card.id).length);
const stagingNames = new Map(stagingCards.map(card => [card.id, normalizeSearch([
  card.title, card.group, ...(card.icd10 ?? []),
  ...stagingByCard.get(card.id).map(entry => entry.title),
].join(' '))]));

function stagingCardLink(id) {
  const entries = stagingByCard.get(id);
  if (entries?.length) return `<a class="btn secondary" href="#tnm/${esc(entries.length === 1 ? entries[0].id : id)}">Открыть стадирование</a>`;
  const card = DATA.find(item => item.id === id);
  return card?.stageOverview ? `<a class="btn secondary" href="#card/${esc(id)}/staging">Открыть стадирование</a>` : '';
}

function stagingResults(query = '', group = 'Все') {
  const terms = normalizeSearch(query.replace(/(^|\s)с(?=\d)/gi, '$1c')).split(' ').filter(Boolean);
  const cards = stagingCards.filter(card =>
    (group === 'Все' || card.group === group) &&
    terms.every(term => stagingNames.get(card.id).includes(term)));
  if (!cards.length) return '<p class="panel muted" role="status">Ничего не найдено.</p>';
  return cards.map(card => {
    const entries = stagingByCard.get(card.id);
    const target = entries.length === 1 ? entries[0].id : card.id;
    const editions = entries.length === 1 ? entries[0].edition : 'Две ветки по HPV-статусу';
    return `<a class="item staging-result" href="#tnm/${esc(target)}">
      <span><strong>${esc(card.title)}</strong><small>${esc(card.icd10.join(', '))} · ${esc(editions)}</small></span>
      <span aria-hidden="true">→</span>
    </a>`;
  }).join('');
}

function filterStaging() {
  $('#stagingResults').innerHTML = stagingResults($('#stagingQuery').value, $('#stagingGroup').value);
}

function stagingLinks(entries) {
  return entries.map(entry => `<a class="item staging-result" href="#tnm/${esc(entry.id)}">
    <span><strong>${esc(entry.title)}</strong><small>${esc(entry.edition)}</small></span><span aria-hidden="true">→</span>
  </a>`).join('');
}

function tnmPage() {
  const id = state.staging;
  const entry = stagingEntries.get(id);
  const back = '<a class="back staging-back" href="#tnm">← Справочник стадирования</a>';
  if (entry) {
    const blocks = [['Группы стадий', entry.groups], ['T · Первичная опухоль', entry.t],
      ['N · Регионарные лимфоузлы', entry.n], ['M · Отдалённые метастазы', entry.m], ...(entry.details ?? [])];
    return `${back}<h1>${esc(entry.title)}</h1>
      <p class="muted">${esc(entry.edition)}</p>
      ${entry.scope ? `<p>${esc(entry.scope)}</p>` : ''}
      ${entry.verification ? `<p class="fine"><b>Редакционная сверка ${esc(entry.verification.date.split('-').reverse().join('.'))}.</b> ${esc(entry.verification.scope)}</p>` : ''}
      <p><a href="${esc(entry.url)}" target="_blank" rel="noopener">Источник критериев и подробные определения ↗</a></p>
      ${(entry.references ?? []).map(([label, url]) => `<p><a href="${esc(url)}" target="_blank" rel="noopener">${esc(label)} ↗</a></p>`).join('')}
      ${blocks.map(([title, value], i) => `<details class="marker-entry"${i === 0 ? ' open' : ''}>
        <summary>${esc(title)}</summary><div class="marker-detail"><p>${esc(value)}</p></div></details>`).join('')}
      ${entry.related?.length ? stagingLinks(entry.related.map(key => stagingEntries.get(key))) : ''}
      <div class="panel staging-related"><h2>Связанные карточки ЗНО</h2>
      ${DATA.filter(card => entry.cards.includes(card.id)).map(card =>
        `<p><a href="#card/${esc(card.id)}">${esc(card.title)}</a></p>`).join('')}</div>`;
  }
  const choices = stagingByCard.get(id);
  if (choices?.length) {
    const card = DATA.find(item => item.id === id);
    return `${back}<h1>${esc(card.title)}</h1>${stagingLinks(choices)}`;
  }
  const stagingGroups = [...new Set(stagingCards.map(card => card.group))];
  return shell('TNM и FIGO', `<p class="muted">Краткий справочник стадирования. Для присвоения стадии используйте полные критерии указанной редакции. Клиническое, патологическое и постнеоадъювантное стадирование могут различаться.</p>
    <div class="catalog-tools"><input class="search" id="stagingQuery" type="search" aria-label="Поиск по стадированию" placeholder="Опухоль или код МКБ‑10…" oninput="filterStaging()">
    <select id="stagingGroup" aria-label="Группа опухолей" onchange="filterStaging()"><option>Все</option>${stagingGroups.map(group => `<option>${esc(group)}</option>`).join('')}</select></div>
    <div id="stagingResults">${stagingResults()}</div>
    <details class="marker-entry"><summary>Другие системы стадирования и оценки риска</summary>
      <div class="marker-detail">${DATA.filter(card => stagingData.other[card.id]).map(card =>
        `<p><a href="#card/${esc(card.id)}${card.stageOverview ? '/staging' : ''}">${esc(card.title)}</a> · ${esc(stagingData.other[card.id])}</p>`).join('')}</div></details>
    <p class="fine"><a href="https://www.facs.org/quality-programs/cancer-programs/american-joint-committee-on-cancer/version-9/" target="_blank" rel="noopener">Редакции AJCC</a> ·
    <a href="https://www.uicc.org/what-we-do/sharing-knowledge/tnm/publications-and-resources" target="_blank" rel="noopener">Редакции и исправления UICC</a></p>`);
}

function calcPage(){return shell('Калькуляторы',`<div class="notice">Расчёты выполняются локально в браузере, не отправляются на сервер. Это арифметические инструменты, а не автоматические назначения. Вводите обезличенные параметры.</div>
<div class="calc-grid">
${calcBox('Площадь поверхности тела (Mosteller)','bsa',[['h','Рост, см','170'],['w','Масса, кг','70']],'BSA = √(рост × масса / 3600).')}
${calcBox('Карбоплатин (Calvert)','cal',[['auc','Целевая AUC','5'],['gfr','GFR, мл/мин (абсолютная)','75']],'Доза = AUC × (GFR + 25). GFR должна быть подходящей для формулы; не подставлять индексированную eGFR без пересчёта.')}
${calcBox('CKD-EPI 2021 — рСКФ','ckdepi',[['age','Возраст, лет','60'],['scr','Креатинин, мкмоль/л (IDMS)','90'],['height','Рост, см (для абсолютной рСКФ)','170'],['weight','Масса, кг (для абсолютной рСКФ)','70']],'Расчёт для взрослых ≥18 лет: CKD-EPI 2021 без расового коэффициента. Основной результат — мл/мин/1,73 м²; при заполнении роста и массы дополнительно рассчитывается абсолютная рСКФ (мл/мин) по Mosteller. При нестабильном креатинине, саркопении и пограничных решениях оценка может быть неточной; рассмотрите цистатин C и/или измеренную СКФ. Для дозирования проверяйте инструкцию препарата: некоторые пороги основаны на CrCl по Cockcroft–Gault. Для карбоплатина предпочтительна измеренная СКФ.',[['sex','Пол','Мужской','Женский']])}
${calcBox('ALBI · функция печени','albi',[['bilirubin','Общий билирубин, мкмоль/л','20'],['albumin','Альбумин, г/л','40']],'ALBI = 0,66 × log₁₀(билирубин) − 0,085 × альбумин. Класс 1 ≤ −2,60; класс 2 > −2,60 и ≤ −1,39; класс 3 > −1,39. Оценивает резерв печени при ГЦР. Для выбора тактики дополнительно учитывают распространённость опухоли и клинические данные.',[],['Johnson и соавт. · исходная формула','https://pubmed.ncbi.nlm.nih.gov/25512453/'])}
${calcBox('Индекс массы тела','bmi',[['bh','Рост, см','170'],['bw','Масса, кг','70']],'ИМТ = кг / м².')}
${calcBox('Абсолютное число нейтрофилов','anc',[['wbc','Лейкоциты, ×10⁹/л','4.2'],['neu','Нейтрофилы, %','55'],['bands','Палочкоядерные, % (если отдельно)','0']],'ANC = WBC × (% нейтрофилов + % палочкоядерных)/100. Не прибавлять палочкоядерные дважды.')}
${calcBox('Скорректированный кальций','ca',[['cat','Общий кальций, ммоль/л','2.1'],['alb','Альбумин, г/л','32']],'Ca скорр. = Ca + 0,02 × (40 − альбумин). При тяжёлых состояниях предпочтителен ионизированный кальций.')}
${calcBox('QTc по Fridericia','qtc',[['qt','QT, мс','380'],['rr','RR, мс','850']],'QTcF = QT / ∛(RR в секундах). Оценивать с ЭКГ и клиническим контекстом.')}
${calcBox('RECIST 1.1 — ориентир','recist',[['base','Сумма таргетных очагов исходно, мм','100'],['nadir','Минимальная сумма за наблюдение, мм','100'],['current','Текущая сумма, мм','65']],'PR: снижение ≥30% от исходной; PD: рост ≥20% от надира и ≥5 мм абсолютного прироста. Новые очаги и нетаргетные изменения оцениваются отдельно.',[['newlesion','Новые очаги','Нет','Есть']])}
</div>
${anthracyclinePanel()}`)}
function calcBox(title,id,fields,note,selects=[],source){return `<div class="panel" id="calculators-${id}" tabindex="-1"><h2>${title}</h2>${fields.map(([k,label,ph])=>`<label class="field">${label}<input type="number" step="any" data-calc="${id}" id="${id}_${k}" placeholder="${ph}" oninput="calculate('${id}')"></label>`).join('')}${selects.map(([k,label,...opts])=>`<label class="field">${label}<select id="${id}_${k}" onchange="calculate('${id}')">${opts.map((v,i)=>`<option value="${i}">${v}</option>`).join('')}</select></label>`).join('')}<div class="result" id="res_${id}" role="status">Введите значения</div><p class="fine">${note}</p>${source ? `<p class="fine">${treatmentSource(source[1], source[0])}</p>` : ''}</div>`}
function calculate(id){const v=k=>{let s=$(`#${id}_${k}`)?.value;return s===''||s==null?NaN:Number(s)};const valid=(...a)=>a.every(x=>Number.isFinite(x)&&x>=0);let out='Проверьте введённые значения';const f=(x,d=2)=>x.toLocaleString('ru-RU',{maximumFractionDigits:d,minimumFractionDigits:d});if (id === 'albi') {
  const bilirubin = v('bilirubin');
  const albumin = v('albumin');
  if (valid(bilirubin, albumin) && bilirubin > 0 && albumin > 0) {
    const score = 0.66 * Math.log10(bilirubin) - 0.085 * albumin;
    const grade = score <= -2.60 ? 1 : score <= -1.39 ? 2 : 3;
    out = f(score, 3) + ' · ALBI ' + grade;
  }
}if(id==='bsa'&&valid(v('h'),v('w'))&&v('h')>0&&v('w')>0)out=f(Math.sqrt(v('h')*v('w')/3600),3)+' м²';if(id==='cal'&&valid(v('auc'),v('gfr'))&&v('auc')>0&&v('gfr')>0&&v('gfr')<=250)out=f(v('auc')*(v('gfr')+25),0)+' мг (расчёт, не назначение)';if(id==='ckdepi'&&valid(v('age'),v('scr'))&&v('age')>=18&&v('age')<=120&&v('scr')>0){const female=v('sex')===1,creat=v('scr')/88.4,k=female?0.7:0.9,alpha=female?-0.241:-0.302,ratio=creat/k;const egfr=142*Math.pow(Math.min(ratio,1),alpha)*Math.pow(Math.max(ratio,1),-1.2)*Math.pow(0.9938,v('age'))*(female?1.012:1);out=f(egfr,1)+' мл/мин/1,73 м²';if(valid(v('height'),v('weight'))&&v('height')>0&&v('weight')>0){const bsa=Math.sqrt(v('height')*v('weight')/3600);out+=' · абсолютная рСКФ '+f(egfr*bsa/1.73,1)+' мл/мин'}}if(id==='bmi'&&valid(v('bh'),v('bw'))&&v('bh')>0&&v('bw')>0)out=f(v('bw')/((v('bh')/100)**2),1)+' кг/м²';if(id==='anc'&&valid(v('wbc'),v('neu'),v('bands'))&&v('neu')+v('bands')<=100)out=f(v('wbc')*(v('neu')+v('bands'))/100,2)+' ×10⁹/л';if(id==='ca'&&valid(v('cat'),v('alb')))out=f(v('cat')+.02*(40-v('alb')),2)+' ммоль/л';if(id==='qtc'&&valid(v('qt'),v('rr'))&&v('rr')>0)out=f(v('qt')/Math.cbrt(v('rr')/1000),0)+' мс';if(id==='recist'&&valid(v('base'),v('nadir'),v('current'))&&v('base')>0&&v('nadir')>0){let p=(v('current')-v('base'))/v('base')*100,dp=(v('current')-v('nadir'))/v('nadir')*100;out=v('newlesion')===1?'Подозрение на PD: новый очаг':dp>=20&&v('current')-v('nadir')>=5?'Размерные критерии PD':p<=-30?'Размерные критерии PR':'Размерные критерии SD (если нет иных признаков PD/CR)';out+=` · Δ исходно ${f(p,1)}%`};$(`#res_${id}`).textContent=out}
const DEAUVILLE_SCORES = [
  ['1', 'Патологическое накопление отсутствует'],
  ['2', 'Накопление не выше средостения'],
  ['3', 'Накопление выше средостения, но не выше печени'],
  ['4', 'Накопление умеренно выше печени'],
  ['5', 'Накопление значительно выше печени или появились очаги, соответствующие лимфоме'],
];

function deauvillePanel() {
  return `<section class="panel" id="scales-deauville" tabindex="-1">
    <h2>Deauville / Lugano · ПЭТ/КТ</h2>
    <p>Интерпретация метаболического ответа при ФДГ-авидной лимфоме по баллу из заключения ПЭТ/КТ.</p>
    <label class="field">Момент оценки<select id="deauville-phase" onchange="updateDeauville()">
      <option value="">Выберите момент</option><option value="interim">Промежуточная ПЭТ/КТ</option><option value="end">После завершения лечения</option>
    </select></label>
    <label class="field">Балл Deauville<select id="deauville-score" onchange="updateDeauville()">
      <option value="">Выберите балл</option>
      ${DEAUVILLE_SCORES.map(([score, description]) => `<option value="${score}">${score} · ${esc(description)}</option>`).join('')}
      <option value="X">X · накопление в новых участках, вероятно не связанное с лимфомой</option>
    </select></label>
    <label class="field">Новые ФДГ-авидные очаги<select id="deauville-new" onchange="updateDeauville()">
      <option value="">Выберите результат</option><option value="no">Нет новых очагов, соответствующих лимфоме</option>
      <option value="yes">Есть новые очаги, соответствующие лимфоме</option><option value="uncertain">Причина новых очагов неясна</option>
    </select></label>
    <label class="field" id="deauville-change-field" hidden>Накопление в исходных очагах относительно базовой ПЭТ/КТ<select id="deauville-change" onchange="updateDeauville()">
      <option value="">Не указано</option><option value="lower">Снизилось</option><option value="same">Без значимой динамики</option><option value="higher">Увеличилось</option>
    </select></label>
    <div class="result" id="deauville-result" role="status">Выберите момент оценки, балл и статус новых очагов.</div>
    <p class="fine">Балл 3 оценивают по критериям конкретного протокола, особенно при исследованиях с адаптацией лечения. При сомнительной природе нового очага может потребоваться биопсия или повторное исследование. При физиологическом накоплении учитывают фон прилежащих тканей.</p>
    <p class="fine">${treatmentSource('https://pmc.ncbi.nlm.nih.gov/articles/PMC4979083/', 'Cheson и соавт. · Lugano, таблица 3')}</p>
  </section>`;
}

function updateDeauville() {
  const phase = $('#deauville-phase').value;
  const score = $('#deauville-score').value;
  const newLesions = $('#deauville-new').value;
  const compare = ['4', '5'].includes(score) && newLesions === 'no';
  $('#deauville-change-field').hidden = !compare;
  const change = $('#deauville-change').value;
  let result = 'Выберите момент оценки, балл и статус новых очагов.';
  if (phase && score && newLesions) {
    if (newLesions === 'uncertain') result = 'Причина новых очагов неясна. Требуется уточнение до классификации ответа.';
    else if (newLesions === 'yes') result = score === '5' ? 'Прогрессирование по метаболическим критериям.' : 'Новые очаги, соответствующие лимфоме, предполагают балл 5. Уточните балл в заключении.';
    else if (score === 'X') result = 'X описывает отдельную находку. Для оценки ответа выберите балл опухолевых очагов.';
    else if (!compare) result = 'Полный метаболический ответ по Lugano (балл 1–3), если остальные критерии выполнены.';
    else if (change === 'lower') result = phase === 'interim' ? 'Частичный метаболический ответ в ходе лечения.' : 'Частичный метаболический ответ с остаточной метаболически активной болезнью.';
    else if (change === 'same') result = 'Метаболического ответа нет: значимой динамики накопления нет.';
    else if (change === 'higher') result = 'Прогрессирование по метаболическим критериям.';
    else result = 'Для балла 4–5 укажите динамику накопления относительно исходной ПЭТ/КТ.';
  }
  $('#deauville-result').textContent = result;
}

const CTCAE_EVENTS = [
  ['Снижение числа нейтрофилов', 'Neutrophil count decreased', 'нейтропения АЧН ANC', [
    'АЧН от 1,0 до <1,5 × 10⁹/л.', 'АЧН от 0,5 до <1,0 × 10⁹/л.',
    'АЧН от 0,1 до <0,5 × 10⁹/л.', 'АЧН <0,1 × 10⁹/л.', null,
  ]],
  ['Фебрильная нейтропения', 'Febrile neutropenia', 'лихорадка температура инфекция ANC', [
    null, null, 'АЧН <1,0 × 10⁹/л и температура >38,3 °C однократно либо ≥38 °C в течение более часа.',
    'Угроза жизни с необходимостью срочного вмешательства.', 'Смерть, связанная с событием.',
  ]],
  ['Тромбоцитопения', 'Thrombocytopenia', 'тромбоциты platelet', [
    'Тромбоциты от 75 × 10⁹/л до нижней границы нормы (не включая её).',
    'Тромбоциты от 50 до <75 × 10⁹/л.',
    'Тромбоциты от 10 до <50 × 10⁹/л либо показана трансфузия.',
    'Тромбоциты <10 × 10⁹/л либо угроза жизни с необходимостью срочного вмешательства.', 'Смерть, связанная с событием.',
  ]],
  ['Диарея', 'Diarrhea', 'жидкий стул стома', [
    'Изменение консистенции или частоты стула.',
    'Прирост 4–6 дефекаций в сутки; умеренное увеличение отделяемого по стоме относительно исходного; ограничение инструментальных повседневных действий.',
    'Прирост ≥7 дефекаций в сутки; показана госпитализация; выраженное увеличение отделяемого по стоме; требуется внутривенное вмешательство либо ограничено самообслуживание.',
    'Угроза жизни с необходимостью срочного вмешательства.', 'Смерть, связанная с событием.',
  ]],
  ['Мукозит полости рта', 'Mucositis oral', 'стоматит язвы слизистой', [
    'Симптомов нет или они лёгкие; вмешательство не показано.',
    'Умеренная боль или язва без нарушения приёма пищи; требуется изменить рацион.',
    'Сильная боль мешает приёму пищи.',
    'Угроза жизни с необходимостью срочного вмешательства.', 'Смерть, связанная с событием.',
  ]],
  ['Периферическая сенсорная нейропатия', 'Peripheral sensory neuropathy', 'полинейропатия парестезии онемение', [
    'Лёгкие симптомы.', 'Умеренные симптомы, ограничивающие инструментальные повседневные действия.',
    'Тяжёлые симптомы, ограничивающие самообслуживание.', 'Угроза жизни с необходимостью срочного вмешательства.', null,
  ]],
  ['Пневмонит', 'Pneumonitis', 'поражение легких кашель одышка иммунотерапия', [
    'Симптомов нет; изменения выявлены клинически или при обследовании, вмешательство не показано.',
    'Есть симптомы; показано медикаментозное вмешательство, ограничены инструментальные повседневные действия.',
    'Тяжёлые симптомы; показан кислород, ограничено самообслуживание.',
    'Угрожающая жизни дыхательная недостаточность, требующая срочного вмешательства.', 'Смерть, связанная с событием.',
  ]],
];

function ctcaeRows(query = '') {
  const terms = normalizeSearch(query).split(' ').filter(Boolean);
  const events = CTCAE_EVENTS.filter(event => terms.every(term => normalizeSearch(event.slice(0, 3).join(' ')).includes(term)));
  return events.map(([title, en, , grades]) => `<details class="marker-entry"${events.length === 1 ? ' open' : ''}>
    <summary>${esc(title)}</summary><div class="marker-detail"><p class="muted">${esc(en)}</p>
    ${grades.map((grade, i) => `<p><b>Степень ${i + 1}.</b> ${esc(grade ?? 'Не предусмотрена для этого события.')}</p>`).join('')}
    </div></details>`).join('') || '<p class="muted">Событие не найдено в этой подборке.</p>';
}

function ctcaePanel() {
  return `<section class="panel" id="scales-ctcae" tabindex="-1">
    <h2>CTCAE v6.0 · степени токсичности</h2>
    <p>Семь частых событий. Краткие русскоязычные критерии для взрослых. Для детей, клинических исследований и других событий используйте полный документ и версию, указанную в протоколе.</p>
    <label class="field">Поиск события<input type="search" id="ctcae-query" placeholder="Например, АЧН или диарея" oninput="filterCtcae(this.value)"></label>
    <div id="ctcae-results" aria-live="polite">${ctcaeRows()}</div>
    <p class="fine">Инструментальные действия включают покупки, приготовление пищи и бытовые дела; самообслуживание — одевание, питание и гигиену. Степень описывает тяжесть события. Решения об обследовании, срочности и коррекции терапии определяют по клиническим рекомендациям и протоколу.</p>
    <p class="fine">${treatmentSource('https://dctd.cancer.gov/research/ctep-trials/for-sites/adverse-events/ctcae-v6.pdf', 'NCI · полный справочник CTCAE v6.0 (PDF)')} · <a href="#regimens/complications">Осложнения терапии</a></p>
  </section>`;
}

function filterCtcae(query) {
  $('#ctcae-results').innerHTML = ctcaeRows(query);
}

const ANTHRACYCLINE_EQUIVALENTS = [
  ['doxorubicin', 'Доксорубицин (обычная форма)', 1],
  ['epirubicin', 'Эпирубицин', 0.8],
  ['daunorubicin', 'Даунорубицин', 0.6],
  ['mitoxantrone', 'Митоксантрон', 10.5],
  ['idarubicin', 'Идарубицин', 5],
];

const FEBRILE_NEUTROPENIA_GUIDELINE = 'https://www.idsociety.org/practice-guideline/fever-and-neutropenia-in-adults-with-cancer/';

function scoreField(id, label, options, callback) {
  return `<label class="field">${esc(label)}<select id="${id}" onchange="${callback}()">
    <option value="">Не указано</option>
    ${options.map(([value, text]) => `<option value="${esc(value)}">${esc(text)}</option>`).join('')}
    </select></label>`;
}

function scoreBinaryFields(prefix, factors, callback) {
  return factors.map(([id, label, weight]) => scoreField(
    prefix + '-' + id, label, [[0, 'Нет'], [weight, 'Да · +' + weight.toLocaleString('ru-RU')]], callback
  )).join('');
}

function scoreNumber(id, label, callback) {
  return `<label class="field">${esc(label)}<input id="${id}" type="number" min="0" step="any" oninput="${callback}()"></label>`;
}

function readScoreNumber(id) {
  const input = $('#' + id);
  if (input.validity.badInput) return NaN;
  return input.value === '' ? null : Number(input.value);
}

function anthracyclinePanel() {
  return `<section class="panel" id="calculators-anthracyclines" tabindex="-1">
    <h2>Кумулятивная доза антрациклинов</h2>
    <p>Введите фактически полученную суммарную дозу каждого препарата за все курсы в мг/м². Оставляйте поле пустым только для препарата, который не вводился. Если прежняя доза неизвестна, сначала уточните её по выпискам.</p>
    ${ANTHRACYCLINE_EQUIVALENTS.map(([id, label, factor]) => scoreNumber('anth-' + id, label + ', мг/м² · ×' + factor.toLocaleString('ru-RU'), 'updateAnthracyclines')).join('')}
    <div class="result" id="anth-result" role="status">Введите известные суммарные дозы.</div>
    <p class="fine">Эквивалент по таблице 5 ESC 2022 относится к оценке кардиотоксичности. Коэффициенты преимущественно получены по данным переживших онкологическое заболевание в детстве. Для идарубицина коэффициент оценён по противоопухолевой активности. Для липосомальных форм калькулятор не выполняет пересчёт. Результат используют вместе с остальными факторами сердечно-сосудистого риска.</p>
    <p class="fine">${treatmentSource('https://academic.oup.com/eurheartj/article/43/41/4229/6673995', 'ESC 2022 · кардиоонкология, таблица 5')}</p>
  </section>`;
}

function updateAnthracyclines() {
  const doses = ANTHRACYCLINE_EQUIVALENTS.map(([id]) => readScoreNumber('anth-' + id));
  let result = 'Введите известные суммарные дозы.';
  if (doses.some(value => value !== null)) {
    const total = ANTHRACYCLINE_EQUIVALENTS.reduce((sum, [, , factor], i) => sum + (doses[i] ?? 0) * factor, 0);
    result = doses.some(value => value !== null && (!Number.isFinite(value) || value < 0)) || !Number.isFinite(total)
      ? 'Проверьте введённые дозы.'
      : total.toLocaleString('ru-RU', {maximumFractionDigits:2}) + ' мг/м² в эквиваленте доксорубицина.';
  }
  $('#anth-result').textContent = result;
}

const MASCC_FACTORS = [
  ['bp', 'Нет гипотензии, систолическое АД >90 мм рт. ст.', 5],
  ['copd', 'ХОБЛ отсутствует', 4],
  ['tumor', 'Солидная опухоль или гемобластоз без предшествующей грибковой инфекции', 4],
  ['dehydration', 'Нет дегидратации, требующей парентерального введения жидкости', 3],
  ['outpatient', 'Начало лихорадки вне стационара', 3],
  ['age', 'Возраст <60 лет', 2],
];

const CISNE_FACTORS = [
  ['ecog', 'ECOG ≥2', 2],
  ['copd', 'Хроническая обструктивная болезнь лёгких', 1],
  ['cardiac', 'Хроническое сердечно-сосудистое заболевание', 1],
  ['mucositis', 'Мукозит степени ≥2', 1],
  ['monocytes', 'Абсолютное число моноцитов <0,2 × 10⁹/л', 1],
  ['glucose', 'Стрессовая гипергликемия', 2],
];

function febrileNeutropeniaPanels() {
  return `<section class="panel" id="scales-mascc" tabindex="-1">
    <h2>MASCC · риск осложнений при фебрильной нейтропении</h2>
    <p class="notice">Фебрильная нейтропения требует срочной очной оценки. При клинической нестабильности ведение определяют по неотложному протоколу. Подсчёт баллов не должен задерживать начало эмпирической антибактериальной терапии.</p>
    ${scoreField('mascc-burden', 'Выраженность симптомов', [[5, 'Нет или лёгкие · +5'], [3, 'Умеренные · +3'], [0, 'Тяжёлые · 0']], 'updateMascc')}
    ${scoreBinaryFields('mascc', MASCC_FACTORS, 'updateMascc')}
    <div class="result" id="mascc-result" role="status">Ответьте на все вопросы.</div>
    <p class="fine">Порог исходной модели — 21 из 26. Даже при ≥21 балле амбулаторное ведение требует отдельной оценки инфекционного очага, длительности нейтропении, коморбидности и возможности срочного повторного обращения.</p>
    <p class="fine">${treatmentSource('https://pubmed.ncbi.nlm.nih.gov/10944139/', 'Klastersky и соавт. · MASCC')} · ${treatmentSource(FEBRILE_NEUTROPENIA_GUIDELINE, 'ASCO/IDSA · фебрильная нейтропения')}</p>
  </section>
  <section class="panel" id="scales-cisne" tabindex="-1">
    <h2>CISNE · клинически стабильная фебрильная нейтропения</h2>
    <p>Для взрослых с солидной опухолью и фебрильной нейтропенией после химиотерапии низкой или умеренной интенсивности. Применять после очной оценки стабильности и исключения тяжёлой инфекции или острой органной дисфункции.</p>
    ${scoreField('cisne-eligible', 'Все перечисленные условия применимости выполнены?', [['yes', 'Да'], ['no', 'Нет или клиническая стабильность не подтверждена']], 'updateCisne')}
    <fieldset class="score-fields" id="cisne-factors" hidden>
      <legend>Факторы риска</legend>
      ${scoreBinaryFields('cisne', CISNE_FACTORS, 'updateCisne')}
    </fieldset>
    <div class="result" id="cisne-result" role="status">Подтвердите применимость шкалы.</div>
    <p class="fine">Группы CISNE: 0 — низкая, 1–2 — промежуточная, ≥3 — высокая. Результат дополняет клиническую оценку маршрутизации.</p>
    <p class="fine">${treatmentSource('https://pubmed.ncbi.nlm.nih.gov/25559804/', 'Carmona-Bayonas и соавт. · CISNE')} · <a href="#regimens/complications/febrile-neutropenia">Фебрильная нейтропения · первые действия</a></p>
  </section>`;
}

function selectedScores(prefix, factors) {
  return factors.map(([id]) => $('#' + prefix + '-' + id).value);
}

function sumScores(values) {
  return values.reduce((sum, value) => sum + Number(value), 0);
}

function updateMascc() {
  const values = [$('#mascc-burden').value, ...selectedScores('mascc', MASCC_FACTORS)];
  if (values.includes('')) {
    $('#mascc-result').textContent = 'Недостаточно данных. Ответьте на все вопросы.';
    return;
  }
  const score = sumScores(values);
  $('#mascc-result').textContent = score + ' из 26 · ' + (score >= 21 ? 'низкий риск по MASCC' : 'высокий риск по MASCC');
}

function updateCisne() {
  const eligible = $('#cisne-eligible').value;
  $('#cisne-factors').hidden = eligible !== 'yes';
  if (eligible !== 'yes') {
    $('#cisne-result').textContent = eligible === 'no'
      ? 'CISNE неприменима. Маршрутизация по клинической оценке и неотложному протоколу.'
      : 'Подтвердите применимость шкалы.';
    return;
  }
  const values = selectedScores('cisne', CISNE_FACTORS);
  if (values.includes('')) {
    $('#cisne-result').textContent = 'Недостаточно данных. Ответьте на все вопросы.';
    return;
  }
  const score = sumScores(values);
  const risk = score === 0 ? 'низкий' : score <= 2 ? 'промежуточный' : 'высокий';
  $('#cisne-result').textContent = score + ' из 8 · ' + risk + ' риск осложнений по CISNE';
}

const R2ISS_FACTORS = [
  ['ldh', 'ЛДГ выше верхней границы нормы лаборатории', 1],
  ['del17p', 'del(17p) по FISH', 1],
  ['t414', 't(4;14) по FISH', 1],
  ['1q', 'Увеличение числа копий 1q по FISH (gain или амплификация)', 0.5],
];

function r2issPanel() {
  return `<section class="panel" id="scales-r2iss" tabindex="-1">
    <h2>R2-ISS · множественная миелома</h2>
    <p>Прогностическая группа при впервые диагностированной множественной миеломе. Используйте исходные показатели до начала терапии. Невыполненное исследование оставьте в состоянии «Не указано».</p>
    ${scoreNumber('r2iss-beta', 'β₂-микроглобулин, мг/л', 'updateR2iss')}
    ${scoreNumber('r2iss-albumin', 'Альбумин, г/л (нужен для определения ISS при β₂-микроглобулине <3,5 мг/л)', 'updateR2iss')}
    ${scoreBinaryFields('r2iss', R2ISS_FACTORS, 'updateR2iss')}
    <div class="result" id="r2iss-result" role="status">Введите исходные показатели и результаты исследований.</div>
    <p class="fine">ISS I: β₂-микроглобулин <3,5 мг/л при альбумине ≥35 г/л. ISS III: β₂-микроглобулин ≥5,5 мг/л. Остальные случаи — ISS II. В R2-ISS за ISS I, II и III начисляется 0, 1 и 1,5 балла соответственно.</p>
    <p class="fine">${treatmentSource('https://pubmed.ncbi.nlm.nih.gov/35605179/', 'D’Agostino и соавт. · R2-ISS')} · ${treatmentSource('https://pubmed.ncbi.nlm.nih.gov/15809451/', 'Greipp и соавт. · исходная ISS')} · <a href="#card/c029">Карточка миеломы</a></p>
  </section>`;
}

function updateR2iss() {
  const beta = readScoreNumber('r2iss-beta');
  const albumin = readScoreNumber('r2iss-albumin');
  const values = selectedScores('r2iss', R2ISS_FACTORS);
  const result = $('#r2iss-result');
  if ([beta, albumin].some(value => value !== null && (!Number.isFinite(value) || value <= 0))) {
    result.textContent = 'Проверьте значения β₂-микроглобулина и альбумина.';
    return;
  }
  if (beta === null || (beta < 3.5 && albumin === null) || values.includes('')) {
    result.textContent = 'Недостаточно данных для расчёта R2-ISS.';
    return;
  }
  const iss = beta >= 5.5 ? 'III' : beta < 3.5 && albumin >= 35 ? 'I' : 'II';
  const score = {I:0, II:1, III:1.5}[iss] + sumScores(values);
  const [group, risk] = score === 0 ? ['I', 'низкий'] : score <= 1 ? ['II', 'низкий промежуточный']
    : score <= 2.5 ? ['III', 'высокий промежуточный'] : ['IV', 'высокий'];
  result.textContent = 'ISS ' + iss + ' · R2-ISS ' + group + ' · ' + score.toLocaleString('ru-RU') + ' балла · ' + risk + ' риск.';
}

function scales(){return shell('Клинические шкалы',`<p><a class="btn secondary" href="#scales/rads">Инструментальная диагностика · RADS</a></p><div class="panel" id="scales-ecog" tabindex="-1"><h2>ECOG Performance Status</h2>${['0 — Полностью активен','1 — Ограничена тяжёлая активность; лёгкая работа сохранена','2 — Самообслуживание сохранено, не способен работать; активен >50% дня','3 — Ограниченное самообслуживание; в постели/кресле >50% дня','4 — Полностью обездвижен, самообслуживание невозможно','5 — Смерть'].map(s=>`<p class="scale-row">${s}</p>`).join('')}</div>
<div class="panel" id="scales-kps" tabindex="-1"><h2>Karnofsky (KPS)</h2><p>100 — без жалоб; 90 — обычная активность, минимальные симптомы; 80 — обычная активность с усилием; 70 — обслуживает себя, не способен к обычной работе; 60 — нужна периодическая помощь; 50 — значительная помощь; 40 — инвалидизирован; 30 — госпитализация показана; 20 — тяжёлое состояние; 10 — терминальное состояние; 0 — смерть.</p></div>
<div class="panel" id="scales-khorana" tabindex="-1"><h2>Khorana — риск ВТЭО при ХТ</h2><label class="field">Локализация<select id="kh_site" onchange="khorana()"><option value="0">Другие</option><option value="1">Лёгкое, лимфома, гинекологическая, мочевой пузырь, яичко</option><option value="2">Желудок или поджелудочная железа</option></select></label>${[['kh_pl','Тромбоциты ≥350 ×10⁹/л'],['kh_hb','Hb <100 г/л или ЭПО'],['kh_wbc','Лейкоциты >11 ×10⁹/л'],['kh_bmi','ИМТ ≥35 кг/м²']].map(([id,label])=>`<label class="check"><input id="${id}" type="checkbox" onchange="khorana()"> ${label}</label>`).join('')}<div class="result" id="kh_result">0 баллов — низкий риск</div><p class="fine">Шкала не заменяет оценку риска кровотечения и показаний к тромбопрофилактике.</p></div>
<div class="panel" id="scales-child-pugh" tabindex="-1"><h2>Child–Pugh</h2>${[['cp_bili','Билирубин, мкмоль/л',['<34','34–50','>50']],['cp_alb','Альбумин, г/л',['>35','28–35','<28']],['cp_inr','INR',['<1,7','1,7–2,3','>2,3']],['cp_asc','Асцит',['Нет','Лёгкий/контролируемый','Выраженный/рефрактерный']],['cp_enc','Энцефалопатия',['Нет','I–II','III–IV']]].map(([id,label,opts])=>`<label class="field">${label}<select id="${id}" onchange="child()">${opts.map((o,i)=>`<option value="${i+1}">${o}</option>`).join('')}</select></label>`).join('')}<div class="result" id="cp_result">5 баллов — класс A</div><p class="fine">Клинические категории асцита и энцефалопатии требуют врачебной оценки. Для оценки резерва печени при ГЦР также доступен <a href="#calculators/albi">калькулятор ALBI</a>.</p></div>
<div class="panel" id="scales-imdc" tabindex="-1"><h2>IMDC — метастатический рак почки</h2>${[['im_time','Время от диагноза до системной терапии <1 года'],['im_kps','Karnofsky <80%'],['im_hb','Hb ниже нижней границы нормы'],['im_ca','Скорректированный Ca выше верхней границы нормы'],['im_neu','Нейтрофилы выше верхней границы нормы'],['im_pl','Тромбоциты выше верхней границы нормы']].map(([id,label])=>`<label class="check"><input id="${id}" type="checkbox" onchange="imdc()"> ${label}</label>`).join('')}<div class="result" id="im_result">0 факторов — благоприятный риск</div></div>
${deauvillePanel()}
${ctcaePanel()}
${febrileNeutropeniaPanels()}
${r2issPanel()}
${imagingRadsPanel()}
<div class="panel" id="scales-other" tabindex="-1"><h2>Другие шкалы</h2><p><b>R-ISS:</b> необходимы β2-микроглобулин, альбумин, ЛДГ и FISH; применяйте оригинальные критерии.</p></div>`)}
function khorana(){let n=Number($('#kh_site').value)+['kh_pl','kh_hb','kh_wbc','kh_bmi'].filter(x=>$('#'+x).checked).length;$('#kh_result').textContent=n+' балл(ов) — '+(n===0?'низкий':n<=2?'промежуточный':'высокий')+' риск (исходная классификация)'}
function child(){let n=['cp_bili','cp_alb','cp_inr','cp_asc','cp_enc'].reduce((a,x)=>a+Number($('#'+x).value),0);$('#cp_result').textContent=n+' баллов — Child–Pugh '+(n<=6?'A':n<=9?'B':'C')}
function imdc(){let n=['im_time','im_kps','im_hb','im_ca','im_neu','im_pl'].filter(x=>$('#'+x).checked).length;$('#im_result').textContent=n+' факторов — '+(n===0?'благоприятный':n<=2?'промежуточный':'неблагоприятный')+' риск'}
const MARKERS = window.ONCO_MARKERS ?? [];

function markers() {
  return shell('Онкомаркеры', `<p class="muted">Лабораторные онкомаркеры и показатели мониторинга. Примеры референсов относятся к указанным методам и лабораториям. Клинические пороги применимы в описанной ситуации.</p>
    <input class="search" type="search" aria-label="Поиск онкомаркера" placeholder="Найти маркер или опухоль…" oninput="filterMarkers(this.value)">
    <div id="markerList">${markerRows(MARKERS[state.marker] ? [MARKERS[state.marker], ...MARKERS.filter(marker => marker !== MARKERS[state.marker])] : MARKERS)}</div>`);
}

function markerRows(entries) {
  if (!entries.length) return '<p class="panel muted" role="status">Маркеры не найдены.</p>';
  return entries.map(marker => `<details class="marker-entry"${MARKERS[state.marker] === marker ? ' open' : ''}>
    <summary>${esc(marker.name)}</summary>
    <div class="marker-detail">
      <p><b>Определение.</b> ${esc(marker.definition)}</p>
      <p><b>Где применяют.</b> ${esc(marker.context)}.</p>
      <p><b>Цель.</b> ${esc(marker.use)}</p>
      ${(marker.values ?? []).map(value => `<p><b>${esc(value.label)}.</b> ${esc(value.text)}
        <a class="fine" href="${esc(value.url)}" target="_blank" rel="noopener">${esc(value.source)}</a></p>`).join('')}
      <p><b>Ограничения.</b> ${esc(marker.limit)}</p>
      <a class="fine" href="${esc(marker.url)}" target="_blank" rel="noopener">Источник</a>
    </div>
  </details>`).join('');
}

function markerSearchText(value) {
  return normalizeSearch(value.normalize('NFKC').replace(/(?:ca|са)(?=[\s–—.-]*\d)/gi, 'ca '))
    .replace(/[^\p{L}\p{N}]/gu, '');
}

function filterMarkers(query) {
  const key = markerSearchText(query);
  $('#markerList').innerHTML = markerRows(MARKERS.filter(marker =>
    [marker.name, marker.aliases, marker.context, marker.definition].some(value => markerSearchText(value).includes(key))));
}
const SOURCE_SECTIONS = [
  ['Клинические рекомендации и протоколы', [
    ['Минздрав России', 'Официальный рубрикатор клинических рекомендаций РФ', 'https://cr.minzdrav.gov.ru/'],
    ['RUSSCO', 'Рекомендации Российского общества клинической онкологии', 'https://www.rosoncoweb.ru/standarts/RUSSCO/'],
    ['ESMO', 'Клинические рекомендации Европейского общества медицинской онкологии', 'https://www.esmo.org/guidelines'],
    ['ASCO', 'Клинические рекомендации Американского общества клинической онкологии', 'https://ascopubs.org/guidelines'],
    ['NCCN', 'Клинические алгоритмы по нозологиям и поддерживающей терапии', 'https://www.nccn.org/guidelines/category_1'],
    ['eviQ', 'Протоколы лечения с дозами, мониторингом и коррекцией терапии', 'https://www.eviq.org.au/medical-oncology'],
    ['NCI PDQ', 'Доказательные обзоры по диагностике и лечению опухолей', 'https://www.cancer.gov/publications/pdq'],
  ]],
  ['Базы публикаций и исследований', [
    ['PubMed', 'Поиск биомедицинских публикаций', 'https://pubmed.ncbi.nlm.nih.gov/'],
    ['Cochrane Library', 'Систематические обзоры и реестр контролируемых исследований', 'https://www.cochranelibrary.com/'],
    ['ClinicalTrials.gov', 'Реестр исследований, их статусы и опубликованные результаты', 'https://clinicaltrials.gov/'],
  ]],
  ['Научные журналы', [
    ['Journal of Clinical Oncology', 'Клинические исследования и рекомендации ASCO', 'https://ascopubs.org/journal/jco'],
    ['Annals of Oncology', 'Научный журнал ESMO', 'https://www.esmo.org/about-esmo/discover-esmo-journals/annals-of-oncology'],
    ['The Lancet Oncology', 'Клинические исследования, обзоры и комментарии', 'https://www.thelancet.com/journals/lanonc/home'],
    ['JAMA Oncology', 'Клинические исследования и обзоры в онкологии', 'https://jamanetwork.com/journals/jamaoncology'],
    ['The New England Journal of Medicine', 'Общемедицинский журнал с публикациями ключевых онкологических исследований', 'https://www.nejm.org/'],
  ]],
];

function sourcesPage() {
  return shell('Источники', SOURCE_SECTIONS.map(([title, entries]) => `
    <section class="panel source-section">
      <h2>${esc(title)}</h2>
      <ul>${entries.map(([name, description, url]) => `
        <li><a href="${esc(url)}" target="_blank" rel="noopener">${esc(name)}</a><p>${esc(description)}</p></li>
      `).join('')}</ul>
    </section>`).join(''));
}
function favorites(){let cs=DATA.filter(c=>favs().includes(c.id));return shell('Избранное',cs.length?cs.map(c=>`<button class="item" onclick="view('card','${c.id}')"><span><strong>${esc(c.title)}</strong><small>${esc(c.group)}</small></span>→</button>`).join(''):'<div class="panel muted">Пока нет избранных карточек.</div>')}
function about(){return shell('О проекте',`<div class="panel"><h2>ОнкоАтлас</h2><p>Бесплатный русскоязычный образовательный справочник для врачей. Все материалы открыты без регистрации.</p><p><b>Редакция:</b> 0.2 · 21 ноября 2026 года. <b>Статус:</b> рабочая бета-версия; клиническая экспертиза ещё не завершена.</p><p>Тексты карточек — сокращённые алгоритмы, не официальные рекомендации. Локальная регистрация лекарств и стандарты лечения различаются по странам.</p><p>Источники для редакционной проверки: ${sources.map(([n,u])=>`<a href="${u}" target="_blank">${n}</a>`).join(', ')}.</p><p><b>Конфиденциальность:</b> не вводите персональные данные пациентов. Калькуляторы выполняются в браузере. Избранное хранится локально.</p></div>`)}
function admin(){return shell('Администрирование',`<div class="panel"><h2>Публичный сайт — только чтение</h2><p>Защищённое редактирование ещё не подключено. Пароли в исходном коде отсутствуют. Вход «Икбал Р.В.» не будет реализован как небезопасная клиентская проверка.</p><p>Пока обновления выполняются заменой файлов после медицинской проверки. Для редактирования через чат потребуется подключение к репозиторию с ограниченными правами и подтверждением публикации.</p></div>`)}
const SURGICAL_BASICS = [
  ['Подтверждение диагноза и цели операции', 'До планирования уточнить морфологию, локализацию и распространённость. Если биопсия может изменить объём операции или последовательность лечения, заранее согласовать способ и доступ. Цель сформулировать явно: диагностика, радикальное удаление, локальный контроль или устранение конкретного симптома. При изменении стадии пересмотреть цель.'],
  ['Резектабельность и операбельность', 'Резектабельность оценивают по возможности удалить опухоль с онкологически приемлемыми краями и приемлемой потерей функции. Операбельность оценивают с учётом функционального статуса, органного резерва, коморбидности и возможности восстановления. На консилиуме заранее определить, какая находка на визуализации или оценке риска изменит план.'],
  ['Последовательность лечения', 'На консилиуме согласовать, показана ли первичная операция, предоперационное лечение или другая радикальная тактика. Если лечение начинают до операции, сохранить исходное стадирование и изображения, при необходимости маркировать очаг, определить метод и сроки переоценки. Прогрессию, осложнения или снижение функционального резерва обсудить до назначения даты операции.'],
  ['План операции и сохранение функции', 'Спланировать объём резекции, оценку регионарных узлов и реконструкцию. При выборе доступа учитывать возможность выполнить запланированный объём и обеспечить оценку краёв. До вмешательства обсудить с пациентом ожидаемую функцию, допустимый объём расширения, вероятность стомы или реконструкции, если они относятся к выбранной операции.'],
  ['Края резекции и неожиданные находки', 'Определить, какие края имеют значение для данной локализации и как их обозначать. При подозрении на остаточную опухоль или неожиданное распространение документировать участок и обсудить, достижим ли пересмотренный объём с приемлемым риском. Показания к срочному исследованию края, расширению или прекращению резекции зависят от нозологии и согласованной цели.'],
  ['Операционный препарат и протокол', 'Согласовать с патоморфологической службой ориентацию препарата, маркировку краёв и передачу раздельных лимфатических групп. Указать локализацию, исходную стадию, предшествующее лечение, подозрительные края и значимые находки. Документировать выполненный объём, отклонения от плана и макроскопически остаточную болезнь, если она есть.'],
  ['Послеоперационное решение', 'На консилиуме сопоставить описание операции с патоморфологией. Проверить применимые pTNM или ypTNM, края, лимфоузлы, дополнительные факторы риска и ответ на предоперационное лечение. При положительном крае локализовать его и обсудить применимость повторной резекции, лучевой или системной терапии. Учитывать послеоперационное восстановление и сроки дополнительного лечения.'],
];

const SURGICAL_ALGORITHMS = [
  {
    id: 'breast', title: 'Рак молочной железы', cards: ['c004'],
    pathway: 'Операбельна сейчас → выбрать объём резекции и тактику по аксилле. Показано предоперационное лечение → маркировать очаги, оценить ответ и повторно спланировать операцию.',
    keywords: 'РМЖ мастэктомия органосохранение сторожевой узел аксиллярная лимфодиссекция',
    video: {"title": "Органосохраняющая операция с биопсией сторожевого лимфоузла", "note": "Journal of Medical Insight · клинический случай с системой Lumicell для интраоперационной оценки остаточной опухоли.", "url": "https://jomi.com/article/227/lumpectomy-and-sentinel-lymph-node-biopsy-using-lumicell-system-for-intraoperative-detection-of-residual-cancer/video"},
    sources: [
      ['NCI PDQ · лечение рака молочной железы', 'https://www.cancer.gov/types/breast/hp/breast-treatment-pdq'],
      ['ASCO 2025 · биопсия сторожевого узла', 'https://pubmed.ncbi.nlm.nih.gov/40209128/'],
    ],
    situations: [
      ['Первичная операция при операбельном раке', 'По биопсии и визуализации оценить распространённость и ER/PR/HER2. При возможности получить отрицательные края и провести необходимую ЛТ обсудить органосохраняющую операцию. При показаниях к мастэктомии обсудить реконструкцию и возможную послеоперационную ЛТ.', 'При cN0 оценить показания к биопсии сторожевого узла. У отдельных пациенток с небольшим благоприятным HR+/HER2− раком и отрицательным УЗИ аксиллы критерии ASCO допускают её пропуск. Решение об аксиллярной диссекции зависит от числа поражённых узлов, операции и плана ЛТ.'],
      ['Операция после неоадъювантного лечения', 'До начала лечения документировать исходный объём и согласовать маркировку очага и биопсированного положительного узла. После терапии оценить возможность органосохранения и спланировать операцию с учётом исходного распространения и ответа.', 'Тактика в аксилле зависит от исходного cN и ответа; алгоритм для первичной операции нельзя автоматически переносить на состояние после неоадъювантной терапии.'],
      ["Планирование органосохранения", "На изображениях сопоставить расположение инвазивного очага, протяжённость кальцинатов и отношение объёма резекции к объёму железы. Обсудить онкопластический вариант, если он позволяет удалить запланированный объём с приемлемой формой и доступностью последующей ЛТ.", "При распространённых подозрительных кальцинатах, невозможности получить отрицательные края или противопоказаниях к необходимой ЛТ оценить мастэктомию. При непальпируемом очаге согласовать локализацию до операции."],
      ["Аксилла при первичной операции", "Перед операцией сопоставить клиническую оценку и УЗИ аксиллы. При подозрительном узле уточнить морфологию, если результат меняет последовательность терапии. Для cN0, когда стадирование меняет тактику, оценить показания к сторожевой биопсии.", "ASCO 2025 допускает пропуск сторожевой биопсии в отобранной группе: постменопауза, возраст ≥50 лет, унифокальный инвазивный протоковый рак ≤2 см, grade 1–2, HR+/HER2−, благоприятное УЗИ аксиллы, первичное органосохранение и план эндокринной терапии. Учитывать план ЛТ и влияние результата на рекомендации."],
      ["Положительный сторожевой узел", "При первичной органосохраняющей операции, одном или двух положительных сторожевых узлах и планируемой ЛТ на всю железу у подходящих пациенток рутинная аксиллярная диссекция не нужна.", "После мастэктомии решение зависит от размера опухоли, числа положительных узлов и плана регионарного облучения. Результаты для первичной операции не переносят автоматически на остаточную узловую болезнь после неоадъювантной терапии."],
      ["Края и повторное вмешательство", "Ориентировать препарат и сопоставить патологический край с операционной зоной и изображениями. При опухоли на окрашенном крае оценить возможность направленной повторной резекции или мастэктомии.", "До повторной операции уточнить, к какому компоненту относится край — инвазивному раку или DCIS — и какие критерии применимы с учётом планируемой ЛТ."],
    ],
    pathology: 'Края, размер инвазивного компонента и DCIS, число исследованных и поражённых узлов. После предоперационной терапии — остаточная инвазивная опухоль, ypTNM и ответ по применимому протоколу.',
  },
  {
    id: 'lung', title: 'Немелкоклеточный рак лёгкого', cards: ['c001', 'c002'],
    pathway: 'Ранняя периферическая опухоль → оценить функциональный резерв и объём резекции. Центральная опухоль или подозрение на поражение средостения → уточнить стадию и обсудить последовательность лечения.',
    keywords: 'НМРЛ NSCLC лобэктомия сегментэктомия резекция лёгкого медиастинальные узлы',
    video: {"title": "Однопортовая VATS-нижняя лобэктомия справа с лимфодиссекцией", "note": "CTSNet · клинический случай аденокарциномы лёгкого.", "url": "https://www.ctsnet.org/article-video/uniportal-vats-right-lower-lobectomy-and-lymphadenectomy-step-step/"},
    sources: [
      ['NCI PDQ · лечение НМРЛ', 'https://www.cancer.gov/types/lung/hp/non-small-cell-lung-treatment-pdq'],
      ['ERS/ESTS 2025 · оценка функциональной пригодности', 'https://publications.ersnet.org/lookup/pmid/41232938'],
    ],
    situations: [
      ['Ранняя периферическая опухоль', 'Подтвердить распространённость и оценить лёгочный и сердечно-сосудистый резерв. Обсудить лобэктомию; для отобранных пациентов с периферической опухолью ≤2 см и подтверждённым N0 возможна сублобарная резекция.', 'При выборе меньшего объёма проверить достаточность краёв и полноценность оценки внутригрудных узлов. При медицинской неоперабельности обсудить стереотаксическую ЛТ.'],
      ['Центральная опухоль или местнораспространённая болезнь', 'Оценить возможность полной резекции и показания к инвазивному стадированию средостения. На консилиуме определить место предоперационной терапии и критерии переоценки.', 'При центральной опухоли рассмотреть бронхопластическую резекцию, если она позволяет удалить опухоль с отрицательными краями и сохранить функционирующую паренхиму. Операцию в III стадии обсуждают избирательно.'],
      ["Функциональная подготовка", "Перед резекцией оценить спирометрию и DLCO; для предполагаемого объёма рассчитать прогнозируемые послеоперационные показатели. Учесть сердечный риск, переносимость нагрузки и сопутствующие заболевания.", "При ограниченном резерве обсудить дополнительную функциональную оценку, подготовку и пересмотр объёма. Если хирургический риск остаётся неприемлемым, оценить радикальную ЛТ."],
      ["Медиастинальные лимфоузлы", "При подозрительных узлах по КТ или ПЭТ/КТ получить морфологическое подтверждение, если оно меняет тактику. Для начальной инвазивной оценки обычно рассматривают EBUS/EUS в зависимости от доступных станций.", "Отрицательный результат оценивают с учётом качества и объёма забора и исходной вероятности N2. Необходимость дальнейшего стадирования обсуждают на мультидисциплинарном консилиуме."],
      ["Выбор объёма при малой опухоли", "Для небольшой периферической опухоли выбор между лобэктомией и сублобарной резекцией включает оценку расположения, доступного края и узлов. Данные CALGB 140503 относятся к отобранным пациентам с опухолью ≤2 см и подтверждённым отсутствием узловых метастазов.", "Если при меньшем объёме нельзя обеспечить достаточный край или выявлено узловое поражение, пересмотреть план с учётом функции лёгких и распространённости."],
      ["Что документировать после резекции", "Передать лимфоузлы с привязкой к станциям. В протоколе операции зафиксировать анатомический объём, дополнительные резекции, сомнительные края и находки вне ожидаемой зоны.", "После получения pTNM или ypTNM оценить остаточную болезнь, края, узловой статус и показания к послеоперационной терапии с учётом уже проведённого лечения и биомаркеров."],
    ],
    pathology: 'Тип и размер опухоли, хирургические края, плевральная инвазия и результаты по лимфатическим станциям. После предоперационного лечения — жизнеспособная опухоль и ypTNM.',
  },
  {
    id: 'colon', title: 'Рак ободочной кишки', cards: ['c005'],
    openVideos: [{
      title: "Лапароскопическая правосторонняя гемиколэктомия с полной мезоколической эксцизией",
      note: "Kalynovsky Minimal Access Surgery · 1 ч 02 мин · полная демонстрация вмешательства по описанию автора.",
      url: "https://www.youtube.com/watch?v=M3AMiFKFcpE",
    }],
    pathway: 'Рак в удалённом полипе → оценить полноту удаления и морфологический риск. Инвазивная резектабельная опухоль → планировать сегментарную онкологическую резекцию по локализации.',
    keywords: 'КРР гемиколэктомия колэктомия злокачественный полип ободочная кишка',
    video: {"title": "Открытая левосторонняя колэктомия с формированием колостомы", "note": "Journal of Medical Insight · клинический случай рака ободочной кишки. Колостома показана как часть вмешательства в данном случае.", "url": "https://jomi.com/article/29/open-left-colectomy-for-colon-cancer%3A-left-colon-and-sigmoid-resection-with-colostomy-formation/video"},
    sources: [
      ['NCI PDQ · лечение рака ободочной кишки', 'https://www.cancer.gov/types/colorectal/hp/colon-treatment-pdq'],
      ['ASCRS · лечение рака ободочной кишки', 'https://pubmed.ncbi.nlm.nih.gov/34775402/'],
    ],
    situations: [
      ['Ранний рак в удалённом полипе', 'Проверить, удалён ли очаг единым блоком, и оценить край, глубину инвазии, дифференцировку, сосудистую инвазию и почкование. После полноценной резекции с благоприятной морфологией возможно наблюдение.', 'При неблагоприятных признаках или невозможности надёжно оценить края обсудить онкологическую резекцию с регионарными узлами.'],
      ['Резектабельная инвазивная опухоль', 'Выбрать сегмент резекции по локализации и путям лимфооттока. План включает удаление опухоли и соответствующей брыжейки с регионарными лимфоузлами.', 'При подозрении на прорастание в соседний орган обсудить резекцию единым блоком при возможности R0. При непроходимости или перфорации первоочередная тактика зависит от стабильности и распространённости.'],
      ["Планирование объёма и локализации", "До операции уточнить точный сегмент, полноту осмотра толстой кишки и наличие синхронных очагов. При небольшом или ранее удалённом очаге согласовать эндоскопическую маркировку, если она нужна для надёжной интраоперационной локализации.", "На КТ оценить отдалённое распространение и подозрение на инвазию соседних органов. При потенциально резектабельных метастазах согласовать последовательность вмешательств со специализированной командой."],
      ["Края и регионарные узлы", "Определить объём по первичному сегменту и его регионарному лимфооттоку. При предполагаемой инвазии соседней структуры планировать возможность удаления единым блоком и заранее привлечь нужную команду.", "Зафиксировать сомнительные участки и дополнительно удалённые структуры. Для случая с числом исследованных узлов менее 12 после первичной операции обсудить дополнительную оценку препарата с патоморфологом."],
      ["Непроходимость и перфорация", "Сначала оценить стабильность пациента, наличие перитонита и угрозу сепсиса. После стабилизации выбрать между срочной резекцией и этапным подходом с учётом стороны поражения, распространённости и ресурсов центра.", "При отдельных вариантах обструкции обсуждают отводящую стому или стент как этап лечения. При перфорации приоритетом становится контроль источника инфекции. Безопасность первичного анастомоза оценивают отдельно."],
      ["Решение после патоморфологии", "Сопоставить pTNM с краями, числом узлов, перфорацией или обструкцией, сосудистой и периневральной инвазией. Для выбора послеоперационной тактики учесть MMR/MSI и восстановление после операции.", "При положительном крае уточнить его локализацию и возможность дополнительного локального вмешательства на консилиуме."],
    ],
    pathology: 'Края, pT/pN, опухолевые депозиты, сосудистая и периневральная инвазия. При первичной резекции ориентир качества стадирования — исследование не менее 12 лимфоузлов.',
  },
  {
    id: 'rectum', title: 'Рак прямой кишки', cards: ['c044'],
    pathway: 'Благоприятная cT1N0 → оценить возможность локального иссечения. Местнораспространённая опухоль → обсудить предоперационное лечение. После него → переоценить ответ и выбрать дальнейшую тактику.',
    keywords: 'КРР TME мезоректум мезоректумэктомия тотальная неоадъювантная терапия watch and wait',
    video: {"title": "Роботическая низкая передняя резекция с TME и защитной илеостомой", "note": "Journal of Medical Insight · клинический случай местнораспространённого рака прямой кишки.", "url": "https://jomi.com/article/343/robotic-low-anterior-resection-with-diverting-loop-ileostomy-for-locally-advanced-rectal-cancer/video"},
    sources: [
      ['NCI PDQ · лечение рака прямой кишки', 'https://www.cancer.gov/types/colorectal/hp/rectal-treatment-pdq'],
      ['ASCRS · дополнение по раку прямой кишки', 'https://www.ascrsu.com/ascrs/view/ASCRS-Toolkit/2851104/0/Management_of_Rectal_Cancer_2023_Supplement__2023_)'],
    ],
    situations: [
      ['Ранняя опухоль cT1N0', 'МРТ таза и эндоскопия уточняют уровень опухоли и признаки риска. Трансанальное локальное иссечение рассматривают у тщательно отобранных пациентов с благоприятной небольшой cT1N0.', 'Если после иссечения обнаружены неблагоприятные признаки, обсудить завершение лечения радикальной резекцией. Локальное иссечение не обеспечивает оценку регионарных лимфоузлов.'],
      ['Инвазивная или местнораспространённая опухоль', 'Оценить по МРТ уровень, мезоректальную фасцию, EMVI и узлы. Решить на консилиуме, нужна ли неоадъювантная терапия. При операции объём мезоректумэктомии зависит от уровня опухоли; при средней и нижней локализации обычно планируют TME.', 'Сохранение сфинктера зависит от возможности получить адекватные края и ожидаемой функции. При вовлечении сфинктерного комплекса или невозможности адекватного края обсуждают брюшно-промежностную экстирпацию.'],
      ['Переоценка после неоадъювантного лечения', 'Сопоставить пальцевое исследование, эндоскопию и МРТ. При неполном клиническом ответе и резектабельности обсуждают операцию. При полном клиническом ответе у отобранных пациентов возможна стратегия наблюдения в опытном центре.', 'До выбора наблюдения согласовать интенсивный график контроля и возможность своевременной операции при возобновлении роста.'],
      ["Что извлечь из исходной МРТ", "Зафиксировать высоту опухоли, отношение к сфинктерному аппарату и брюшинной складке, мезоректальную фасцию, EMVI и подозрительные мезоректальные или латеральные узлы. Сопоставить МРТ с эндоскопией и ректальным исследованием.", "При угрозе циркулярному краю, поражении соседних структур или значимом узловом риске обсудить предоперационное лечение и критерии повторной оценки в профильном центре."],
      ["Радикальная резекция и сохранение сфинктера", "Для средней и нижней прямой кишки обычно планируют тотальную мезоректумэктомию. Для верхней локализации объём мезоректальной резекции уточняют по анатомии. Возможность сфинктеросохранения оценивают по достижимым краям и ожидаемой функции.", "До операции обсудить риск нарушения функции, вероятность временной или постоянной стомы и её назначение. При угрозе краю или распространении за пределы стандартного объёма согласовать расширение с профильной командой."],
      ["Переоценка ответа и наблюдение", "Полный клинический ответ определяют совокупно по ректальному исследованию, эндоскопии и МРТ. У отобранных пациентов согласовать наблюдение только там, где доступны регулярный контроль и своевременная операция при возобновлении роста.", "При неоднозначном или близком к полному ответе сроки повторной оценки определяет консилиум. Подозрение на прогрессию или рост требует своевременного пересмотра тактики."],
      ["Качество препарата и дальнейшая тактика", "Оценить целостность мезоректума, циркулярный и дистальный края, узлы, депозиты и патоморфологический ответ. Сопоставить ypTNM с исходной стадией и фактически полученной терапией.", "При угрозе или вовлечении края уточнить участок по протоколу операции и обсудить дальнейшее локальное и системное лечение."],
    ],
    pathology: 'Циркулярный и дистальный края, качество мезоректального препарата, узлы и опухолевые депозиты. После предоперационного лечения — ypTNM и степень регрессии.',
  },
  {
    "id": "stomach",
    "title": "Рак желудка",
    "cards": [
      "c006"
    ],
    "keywords": "гастрэктомия резекция желудка D2 ESD",
    "pathway": "Оценить возможность эндоскопической резекции при ранней опухоли. При инвазивной резектабельной болезни определить объём операции и место периоперационного лечения.",
    "sources": [
      [
        "NCI PDQ · рак желудка",
        "https://www.cancer.gov/types/stomach/hp/stomach-treatment-pdq"
      ]
    ],
    "video": {
      "title": "Гастрэктомия с лимфодиссекцией D2",
      "note": "Операционная демонстрация D2-гастрэктомии.",
      "url": "https://www.youtube.com/watch?v=Bl91Mc4cuAY"
    },
    "situations": [
      [
        "Ранняя опухоль",
        "Сопоставить эндоскопическую картину и морфологию, включая размер, изъязвление и предполагаемую глубину. При соответствии критериям обсудить эндоскопическую диссекцию в экспертном центре.",
        "После удаления проверить единый блок, края, глубину инвазии и лимфоваскулярную инвазию. При некуративной резекции оценить необходимость гастрэктомии с узлами."
      ],
      [
        "Резектабельная инвазивная опухоль",
        "До лечения оценить распространённость. При риске перитонеального поражения обсудить стадирующую лапароскопию и цитологию смывов. Согласовать последовательность периоперационной терапии и операции.",
        "Выбирать дистальную или тотальную гастрэктомию по расположению и достижимости отрицательных краёв. В профильном центре планировать лимфодиссекцию D2, где она показана."
      ],
      [
        "Неожиданная диссеминация",
        "Если обнаружены признаки перитонеального поражения, уточнить их морфологически, когда это меняет тактику.",
        "При невозможности радикального удаления объём пересматривают. Вмешательство для контроля кровотечения или обструкции оценивают отдельно."
      ]
    ],
    "pathology": "Зафиксировать края, глубину инвазии, число исследованных и поражённых узлов и эффект предоперационного лечения. После операции проверить состояние питания и переносимость продолжения системной терапии."
  },
  {
    "id": "esophagus",
    "title": "Рак пищевода",
    "cards": [
      "c007"
    ],
    "keywords": "эзофагэктомия Ivor Lewis пищеводно желудочный переход",
    "pathway": "Определить глубину, гистотип и локализацию. При поверхностной опухоли оценить эндоскопический подход, при более глубокой — последовательность мультимодального лечения.",
    "sources": [
      [
        "NCI PDQ · рак пищевода",
        "https://www.cancer.gov/types/esophageal/hp/esophageal-treatment-pdq"
      ]
    ],
    "video": {
      "title": "Малоинвазивная эзофагэктомия по Айвору Льюису",
      "note": "CTSNet · операционная демонстрация доступа.",
      "url": "https://www.ctsnet.org/article-video/standardized-operative-approach-total-minimally-invasive-ivor-lewis-esophagectomy-hostile/"
    },
    "situations": [
      [
        "Поверхностная опухоль",
        "Эндоскопическую резекцию рассматривают для отобранных поверхностных поражений. Полученный препарат уточняет глубину, дифференцировку, края и сосудистую инвазию.",
        "При подслизистой инвазии или других неблагоприятных признаках оценить риск поражения узлов и обсудить эзофагэктомию либо альтернативную тактику."
      ],
      [
        "Резектабельная инвазивная болезнь",
        "Сопоставить локализацию, гистотип и стадию с функциональным резервом и нутритивным статусом. Выбрать предоперационную ХЛТ или периоперационную системную терапию по показаниям.",
        "Объём лимфодиссекции, уровень анастомоза и вариант реконструкции определяет профильная команда. После предоперационного этапа повторно проверить возможность R0."
      ],
      [
        "Медицинская неоперабельность или диссеминация",
        "При противопоказаниях к операции и локорегионарной болезни оценить возможность дефинитивной ХЛТ. При метастатической болезни вмешательства направляют на конкретную задачу.",
        "При дисфагии выбрать способ восстановления питания или проходимости с учётом плана лечения и рисков."
      ]
    ],
    "pathology": "Оценить проксимальный, дистальный и циркулярный края, глубину инвазии, узлы и остаточную опухоль после лечения. Сопоставить ypTNM с исходной стадией."
  },
  {
    "id": "pancreas",
    "title": "Аденокарцинома поджелудочной железы",
    "cards": [
      "c008"
    ],
    "keywords": "операция Уиппла ПДР панкреатодуоденальная резекция сосуды",
    "pathway": "По КТ панкреатического протокола определить отношение к сосудам и наличие метастазов. Тактику согласовать по категории резектабельности.",
    "sources": [
      [
        "NCI PDQ · рак поджелудочной железы",
        "https://www.cancer.gov/types/pancreatic/hp/pancreatic-treatment-pdq"
      ]
    ],
    "video": {
      "title": "Панкреатодуоденальная резекция при карциноме поджелудочной железы",
      "note": "Journal of Medical Insight · операционные кадры.",
      "url": "https://jomi.com/article/15/whipple-procedure-for-carcinoma-of-the-pancreas/video"
    },
    "situations": [
      [
        "Резектабельная опухоль",
        "Оценить функциональный и нутритивный резерв. Для опухоли головки обычно планируют панкреатодуоденальную резекцию, для тела и хвоста — дистальную резекцию по анатомии.",
        "При подозрении на отдалённое поражение уточнить его до радикальной операции. Вопрос предоперационного дренирования при желтухе решают индивидуально, особенно при холангите или задержке лечения."
      ],
      [
        "Пограничная резектабельность",
        "Получить морфологическое подтверждение перед системным лечением. После индукции повторно оценить распространённость, функциональный статус и возможность полной резекции.",
        "Если планируется венозная резекция с реконструкцией, вмешательство обсуждают с командой, имеющей соответствующий опыт."
      ],
      [
        "Нерезектабельная или метастатическая болезнь",
        "Основу тактики составляет системное и симптоматическое лечение. Повторную оценку операции после ответа проводят в специализированном центре.",
        "При билиарной или дуоденальной обструкции оценить эндоскопические и хирургические варианты с учётом ожидаемого эффекта и риска."
      ]
    ],
    "pathology": "Раздельно оценить края и поверхности по протоколу, узлы, сосудистую и периневральную инвазию и ответ на предоперационное лечение. После восстановления обсудить показания к послеоперационной терапии."
  },
  {
    "id": "kidney",
    "title": "Почечно-клеточный рак",
    "cards": [
      "c011",
      "c055"
    ],
    "keywords": "ПКР нефрэктомия резекция почки венозный тромб",
    "pathway": "При T1 оценить возможность органосохранения. При сложной анатомии, венозном тромбе или метастазах решение зависит от риска и цели вмешательства.",
    "sources": [
      [
        "EAU · лечение почечно-клеточного рака",
        "https://uroweb.org/guidelines/renal-cell-carcinoma/chapter/disease-management"
      ]
    ],
    "video": {
      "title": "Роботическая резекция почки",
      "note": "Vattikuti Foundation · операция по поводу малого солидного образования. Гистологический подтип в описании видео не указан.",
      "url": "https://www.youtube.com/watch?v=gdg7EhsKki8"
    },
    "situations": [
      [
        "Локализованная опухоль",
        "Оценить КТ или МРТ, функцию обеих почек, размер и отношение опухоли к воротам и чашечно-лоханочной системе. При T1 предпочтительна резекция почки, когда она технически выполнима.",
        "При малом образовании и высокой коморбидности обсудить наблюдение или абляцию у отобранных пациентов. Биопсия может помочь, если меняет тактику."
      ],
      [
        "Органосохранение затруднено",
        "При крупных или анатомически сложных опухолях сопоставить ожидаемую сохранность функции и хирургический риск с возможностью полной резекции.",
        "При единственной почке или ХБП особенно важна оценка возможности сохранения нефронов и риска послеоперационной почечной недостаточности."
      ],
      [
        "Венозный тромб или метастазы",
        "Уточнить верхнюю границу тромба и возможную инвазию стенки. При планировании тромбэктомии состав команды определяется уровнем распространения.",
        "При метастазах решение о циторедуктивной нефрэктомии зависит от прогноза, симптомов и необходимости немедленной системной терапии."
      ]
    ],
    "pathology": "Указать гистотип, размер, grade где применимо, инвазию синуса, жировой клетчатки и вен, края и pTNM. После органосохраняющей операции оценить функцию почек."
  },
  {
    "id": "prostate",
    openVideos: [{
      title: "Робот-ассистированная радикальная простатэктомия с расширенной тазовой лимфодиссекцией",
      note: "Bruno Benigno · 2 ч 22 мин · запись без монтажа по описанию автора. Комментарии на португальском языке.",
      url: "https://www.youtube.com/watch?v=uLixCk2_Syg",
    }],
    "title": "Рак предстательной железы",
    "cards": [
      "c013"
    ],
    "keywords": "РПЖ простатэктомия RARP лимфодиссекция PSA",
    "pathway": "Определить группу риска и пригодность к радикальному лечению. Обсудить наблюдение, операцию или лучевую терапию в зависимости от клинической ситуации.",
    "sources": [
      [
        "EAU · лечение рака предстательной железы",
        "https://uroweb.org/guidelines/prostate-cancer/chapter/treatment"
      ]
    ],
    "video": {
      "title": "Робот-ассистированная радикальная простатэктомия",
      "note": "Vattikuti Foundation · демонстрация клинического случая на системе Versius.",
      "url": "https://www.youtube.com/watch?v=toDWThY48Z0"
    },
    "situations": [
      [
        "Локализованная болезнь",
        "Данные PSA, МРТ, биопсии и ISUP используют для оценки риска. У подходящих пациентов низкого риска обсуждают активное наблюдение; при выборе радикального лечения сравнивают хирургический и лучевой варианты.",
        "Учитывать ожидаемую продолжительность жизни, сопутствующие болезни, предпочтения и влияние на функцию мочеиспускания и эректильную функцию."
      ],
      [
        "План радикальной простатэктомии",
        "Определить вероятность экстрапростатического распространения по каждой стороне. Сохранение сосудисто-нервных пучков обсуждают при низком риске вовлечения соответствующей стороны.",
        "Необходимость оценки тазовых узлов определяют по риску и применимой номограмме. При показаниях объём лимфодиссекции планируют заранее."
      ],
      [
        "Высокий риск",
        "У отобранных пациентов операция возможна как часть комбинированной тактики. До лечения объяснить вероятность послеоперационной лучевой или системной терапии.",
        "При отдалённой диссеминации радикальную простатэктомию рутинно не используют."
      ]
    ],
    "pathology": "Зафиксировать ISUP, экстрапростатическое распространение, семенные пузырьки, края и узлы. После операции оценить динамику PSA и показания к ранней спасительной терапии."
  },
  {
    "id": "bladder",
    "title": "Уротелиальный рак мочевого пузыря",
    "cards": [
      "c012"
    ],
    "keywords": "ТУР мочевого пузыря цистэктомия илеальный кондуит",
    "pathway": "Начать с качественной ТУР и морфологии. При мышечной инвазии обсудить радикальную цистэктомию или органосохраняющую тримодальную терапию у подходящих пациентов.",
    "sources": [
      [
        "EAU · мышечно-инвазивный рак мочевого пузыря",
        "https://uroweb.org/guidelines/muscle-invasive-and-metastatic-bladder-cancer"
      ]
    ],
    "video": {
      "title": "Робот-ассистированная радикальная цистэктомия и деривация мочи",
      "note": "Публикация с операционным видео, включает илеальный кондуит и ортотопический резервуар.",
      "url": "https://www.sciencedirect.com/science/article/pii/S2590089725000490"
    },
    "situations": [
      [
        "Немышечно-инвазивная опухоль",
        "Планировать резекцию и забор материала, достаточного для оценки глубины. Сопоставить морфологию с полнотой удаления и наличием детрузора в образце.",
        "При T1 и других установленных показаниях обсуждают повторную ТУР. При очень высоком риске или соответствующей неудаче БЦЖ оценить раннюю цистэктомию."
      ],
      [
        "Мышечно-инвазивная резектабельная болезнь",
        "При выборе цистэктомии обсудить периоперационное системное лечение и тазовую лимфодиссекцию. Вид отведения мочи выбирают до операции с учётом функции почек, состояния уретры и возможностей ухода.",
        "Органосохраняющая ХЛТ после максимальной ТУР возможна у отобранных пациентов при доступности строгого наблюдения и спасительной операции."
      ],
      [
        "Рецидив после органосохранения",
        "При подозрении на рецидив подтвердить его морфологически и повторно оценить распространённость.",
        "При инвазивном локальном рецидиве обсудить спасительную цистэктомию, если она резектабельна и пациент переносит операцию."
      ]
    ],
    "pathology": "Указать мышечную инвазию, сопутствующую CIS, экстраорганное распространение, края и узлы. После цистэктомии сопоставить pTNM или ypTNM с предшествующим лечением."
  },
  {
    "id": "endometrium",
    "title": "Рак эндометрия",
    "cards": [
      "c015"
    ],
    "keywords": "гистерэктомия сторожевой узел ICG эндометрий FIGO",
    "pathway": "Оценить морфологический и молекулярный риск, распространённость и пригодность к операции. Согласовать объём вмешательства и оценку узлов.",
    "sources": [
      [
        "ESGO–ESTRO–ESP · рекомендации 2025",
        "https://pubmed.ncbi.nlm.nih.gov/40744042/"
      ]
    ],
    "video": {
      "title": "Картирование сторожевого узла при раке эндометрия",
      "note": "Операционная демонстрация одного этапа хирургического стадирования.",
      "url": "https://www.youtube.com/watch?v=yQXH2oxADS0"
    },
    "situations": [
      [
        "Предположительно локализованная болезнь",
        "Стандартный объём обычно включает тотальную гистерэктомию и двустороннюю сальпингоофорэктомию. При подходящих условиях выбирают малоинвазивный доступ.",
        "У отдельных молодых пациенток обсуждают сохранение яичников или фертильности по строгим критериям в экспертном центре. Это разные стратегии с разными требованиями к отбору."
      ],
      [
        "Стадирование лимфоузлов",
        "Показания к картированию сторожевых узлов определяют по риску и выбранному протоколу. Сторожевые узлы маркируют и передают для ультрастадирования.",
        "При отсутствии картирования с одной стороны дальнейшую оценку узлов определяют по риску и алгоритму центра. Подозрительный узел оценивают независимо от картирования."
      ],
      [
        "Предполагаемое внеорганное распространение",
        "При распространённой болезни оценить объём необходимой резекции и вероятность макроскопически полного удаления.",
        "При низкой вероятности полной резекции или чрезмерной морбидности обсудить системное или лучевое лечение и возможность переоценки."
      ]
    ],
    "pathology": "Фиксируют гистотип, grade, глубину миометриальной инвазии, LVSI, распространение на шейку и за пределы матки, статус узлов и молекулярный класс при наличии."
  },
  {
    "id": "ovary",
    "title": "Эпителиальный рак яичников",
    "cards": [
      "c016"
    ],
    "keywords": "циторедукция стадирование яичник интервальная операция R0",
    "pathway": "При подозрении на раннюю форму планировать полноценное стадирование. При распространённой болезни оценить возможность полной циторедукции и выбрать первичную или интервальную операцию.",
    "sources": [
      [
        "ASCO 2025 · предоперационная терапия рака яичников",
        "https://pubmed.ncbi.nlm.nih.gov/39841949/"
      ]
    ],
    "video": {
      "title": "Циторедукция в верхнем этаже брюшной полости",
      "note": "IGCS Surgical Film Library · клиническая демонстрация при высокозлокачественной карциноме. Доступ может зависеть от аккаунта.",
      "url": "https://edu360.igcs.org/AssetListing/Surgical-Film-Library-12733/Radical-Upper-Abdominal-Debulking-Surgery-For-High-Grade-Ovarian-Carcinoma-25753"
    },
    "situations": [
      [
        "Подозрение на раннюю болезнь",
        "Планировать удаление образования без разрыва при возможности, получить перитонеальные смывы и оценить брюшную полость, сальник и лимфоузлы по гистотипу и протоколу.",
        "При запросе сохранения фертильности возможность органосохранения оценивают по гистотипу, стадии и полноте стадирования."
      ],
      [
        "Первичная циторедукция",
        "При распространённой болезни оценить распределение очагов, функциональный статус и вероятность полного макроскопического удаления с приемлемым риском. При необходимости уточнить резектабельность лапароскопически.",
        "При низкой вероятности полной резекции или высоком периоперационном риске предпочтение может быть отдано предоперационной химиотерапии."
      ],
      [
        "Интервальная операция",
        "Перед предоперационной терапией требуется морфологическое подтверждение. При ответе или стабильной болезни повторно оценить возможность полного удаления и обсудить сроки операции после начальных циклов.",
        "При прогрессировании на индукции проверить диагноз и пересмотреть тактику на консилиуме."
      ]
    ],
    "pathology": "Документировать очаги и размер остаточной болезни в протоколе операции. В морфологии оценить гистотип, распространение и ответ после неоадъювантной терапии."
  },
  {
    "id": "thyroid",
    "title": "Дифференцированный рак щитовидной железы",
    "cards": [
      "c020"
    ],
    "keywords": "ДРЩЖ лобэктомия тиреоидэктомия папиллярный рак центральная лимфодиссекция",
    "pathway": "Оценить размер, экстраорганное распространение и узлы. Выбрать наблюдение, лобэктомию или тотальную тиреоидэктомию по клиническому риску.",
    "sources": [
      [
        "ATA 2025 · дифференцированный рак",
        "https://pmc.ncbi.nlm.nih.gov/articles/PMC13090833/"
      ]
    ],
    "video": {
      "title": "Тотальная тиреоидэктомия и центральная лимфодиссекция",
      "note": "Journal of Medical Insight · случай папиллярного рака. Такой объём определяется показаниями конкретного случая.",
      "url": "https://jomi.com/article/462/open-total-thyroidectomy-and-central-neck-dissection-for-papillary-thyroid-cancer-in-the-setting-of-hashimotos-thyroiditis/video"
    },
    "situations": [
      [
        "Ограниченная опухоль низкого риска",
        "Выполнить УЗИ щитовидной железы и шейных узлов. Для отдельных малых папиллярных опухолей возможно наблюдение; при выборе операции объём определяют по размеру, распространённости и риску.",
        "При односторонней ограниченной опухоли низкого риска лобэктомия может быть достаточной. До операции обсуждают вероятность завершения тиреоидэктомии по морфологии."
      ],
      [
        "Распространённая опухоль или клиническое поражение узлов",
        "При высокой опухолевой нагрузке, макроскопической инвазии или клинических метастазах уточнить объём тиреоидэктомии и терапевтической диссекции поражённых компартментов.",
        "Оценить голос и функцию возвратных нервов по показаниям. Учитывать риск гипопаратиреоза и функциональные последствия повторной операции."
      ],
      [
        "Решение после лобэктомии",
        "Сопоставить морфологию с исходной оценкой и риском рецидива. Завершение тиреоидэктомии обсуждают, если оно влияет на удаление остаточной опухоли, доступность радиойода или последующее наблюдение.",
        "Сам факт выявления дифференцированного рака после лобэктомии не определяет объём дальнейшего вмешательства."
      ]
    ],
    "pathology": "Учитывать размер, многоочаговость, края, сосудистую инвазию, экстраорганное распространение и характеристику метастазов в узлах. Определить риск рецидива отдельно от анатомической стадии."
  },
  {
    "id": "melanoma",
    "title": "Меланома кожи",
    "cards": [
      "c022"
    ],
    "keywords": "Бреслоу широкое иссечение меланома сторожевой узел",
    "pathway": "После диагностической биопсии оценить Бреслоу и изъязвление. Спланировать широкое иссечение и решить вопрос о сторожевой биопсии.",
    "sources": [
      [
        "NCI PDQ · меланома кожи",
        "https://www.cancer.gov/types/skin/hp/melanoma-treatment-pdq"
      ]
    ],
    "video": {
      "title": "Широкое иссечение меланомы спины со сторожевой биопсией",
      "note": "Journal of Medical Insight · клинический случай меланомы промежуточной толщины.",
      "url": "https://jomi.com/article/337/wide-local-excision-of-an-intermediate-thickness-back-melanoma-with-a-sentinel-lymph-node-biopsy-of-left-axillary-lymph-nodes/video"
    },
    "situations": [
      [
        "Диагностическая биопсия и расширенное иссечение",
        "Если анатомия позволяет, получить полнослойный препарат диагностической эксцизии с узкими краями. После морфологии выбрать окончательные края по толщине и локализации.",
        "При сложной локализации или необходимости реконструкции согласовать план с профильной командой и учесть возможность оценки краёв."
      ],
      [
        "Клинически интактные узлы",
        "Показания к сторожевой биопсии зависят от Бреслоу, изъязвления и других факторов риска. При планируемой процедуре согласовать её с окончательным иссечением.",
        "При положительном сторожевом узле обсудить наблюдение за бассейном и системную тактику. Завершающую диссекцию не назначают автоматически."
      ],
      [
        "Клинически выраженное поражение узлов",
        "Подтвердить поражение и оценить отдалённое распространение. При резектабельной макроскопической болезни определить место системного лечения до операции и объём локального контроля.",
        "При нерезектабельной или метастатической болезни локальную операцию выбирают по цели, например при симптомах или отдельных контролируемых очагах."
      ]
    ],
    "pathology": "Указать толщину Бреслоу, изъязвление, края, микросателлиты и узловой статус. При метастазе в сторожевом узле зафиксировать объём поражения по протоколу."
  },
];

const SURGICAL_CARD_NOTES = [
  ["c077", "Сопоставить размеры опухоли и зрительный прогноз с возможностью органосохранения.", "При наличии материала указать тип опухоли, размеры, вовлечение цилиарного тела и экстрасклеральный рост; данные генетического риска оформлять отдельно.", "26.11.2026"],
  ["c078", "Определить орган происхождения до выбора операции и адъювантной схемы.", "Зафиксировать подтип, pT/pN, края, инвазию и количество исследованных узлов.", "26.11.2026"],
  ["c079", "До выбора объёма резекции уточнить признаки поражения брюшины и окончательную морфологию.", "Указать гистотип, grade, глубину инвазии, края, узлы и клеточность перитонеального муцина.", "26.11.2026"],
  ["c083", "Перед резекцией уточнить морфологию, состояние узлов и дыхательный резерв.", "Указать опухолевую морфологию, нейроэндокринные маркеры, pTNM, края и узлы.", "26.11.2026"],
  ["c084", "Биопсию и операцию планирует саркомная команда с учётом траектории нерва.", "Указать grade по применимости, размеры, края, отношение к нерву и ответ на предоперационную терапию.", "26.11.2026"],
  ["c069", "Оценить функциональный риск и получить материал для интегрированного диагноза.", "Указать IDH, ATRX, статус 1p/19q по показаниям, CDKN2A/B и признаки, определяющие CNS WHO grade.", "25.11.2026"],
  ["c070", "Планировать вмешательство по отношению опухоли к функциональным зонам.", "Подтвердить IDH и коделецию 1p/19q. Указать CNS WHO grade.", "25.11.2026"],
  ["c071", "Определить возможность R0 и паренхимосберегающей операции.", "Указать митозы на 2 мм², некроз, гистотип, края, узлы и pTNM.", "25.11.2026"],
  ["c072", "Планировать резекцию в экспертном центре с эндокринной оценкой.", "Зафиксировать края, Ki-67, морфологические критерии злокачественности, инвазию и ENSAT.", "25.11.2026"],
  ["c073", "Сопоставить эндоскопию, КТ и МРТ для оценки достижимости отрицательных краёв.", "Описать подлокализацию, гистотип, края, кость, периневральную инвазию и узлы.", "25.11.2026"],
  ["c074", "Планировать объём операции по распространённости, функции почек и анатомии.", "Указать гистотип, саркоматоидный компонент, инвазию, края и pTNM. Стандартный WHO/ISUP grade для хромофобного ПКР не применяют.", "25.11.2026"],
  ["c075", "Определить протяжённость поражения и вероятность R0 в саркомном центре.", "Описать локализацию, размеры и мультифокальность, края и ответ на предоперационную терапию по применимым критериям.", "25.11.2026"],
  ["c003", "Операцию обсуждают только у тщательно отобранных cT1–2N0M0 после полноценного стадирования средостения. При выявлении узлов или более распространённой болезни переходят к нехирургическому алгоритму.", "Оценить края и узлы по станциям, отдельно отметить неожиданное pN+. После резекции обсудить необходимость адъювантной системной терапии и лучевой тактики."],
  ["c009", "Сначала оценить функцию печени, клинически значимую портальную гипертензию, остаточный объём и возможность трансплантации. При ранней болезни сопоставить резекцию, абляцию и трансплантацию.", "Число и размер очагов, сосудистая инвазия, края и фон печени. После резекции или трансплантации план наблюдения зависит также от функции печени и риска рецидива."],
  ["c010", "Развести внутрипечёночную, перихилярную и дистальную локализации. При крупных резекциях печени оценить будущий остаток, а при обструкции согласовать необходимость и цель билиарного дренирования.", "Края желчных протоков и печени по анатомии, узлы, сосудистая и периневральная инвазия. Для адъювантного решения уточнить локализацию и статус R."],
  ["c014", "Основной первичный объём — паховая орхиэктомия. До вмешательства уточнить маркеры и обсудить фертильность. Забрюшинное вмешательство оценивать отдельно по гистотипу, маркерам и остаточным массам.", "Компоненты герминогенной опухоли, лимфоваскулярная инвазия, распространение и край канатика; после операции сопоставить динамику АФП, β-ХГЧ и ЛДГ."],
  ["c017", "При ранней болезни оценить возможность органосохранения и необходимость стадирования узлов. Если прогнозируется потребность и в радикальной операции, и в ХЛТ, обсудить первичную лучевую стратегию.", "Размер, глубина инвазии, LVSI, края, параметрии и узлы. Результаты определяют необходимость послеоперационного лечения."],
  ["c018", "Оценить возможность полного локального удаления с сохранением функции. Решение о сторожевой биопсии зависит от размера, однофокусности и статуса паховых узлов. При сложной анатомии обсудить ХЛТ.", "Глубина инвазии, размеры, края, число узлов, размер метастаза и экстракапсулярное распространение. Отдельно оценить паховые бассейны."],
  ["c019", "Это общая карточка. Сначала уточнить первичную локализацию, для ротоглотки — HPV-статус, а затем выбрать профильный алгоритм. Резекция и объём шейной операции зависят от анатомии и ожидаемой функции.", "Края, периневральная и сосудистая инвазия, статус узлов и ENE. Состав отчёта уточнить по первичной локализации."],
  ["c021", "До плановой операции оценить кальцитонин, РЭА, шейные узлы и RET. При наследственном риске исключить феохромоцитому до тиреоидэктомии. Объём диссекции зависит от распространённости.", "Размер, многоочаговость, края, экстраорганное распространение и узлы по компартментам. После операции сопоставить кальцитонин и РЭА с исходными значениями."],
  ["c023", "Планировать биопсийный тракт вместе с будущей резекцией. Оценить МРТ, гистотип, grade и отношение к критическим структурам. Согласовать время ЛТ, объём резекции и реконструкцию.", "Подтип, размер, FNCLCC grade если применим, ближайший край и эффект предоперационного лечения. Уточнить анатомический барьер у ближайшего края."],
  ["c024", "Ключевая задача — полное удаление без разрыва. Если первичная операция повлечёт большую потерю функции, оценить мутацию и возможность уменьшения опухоли иматинибом при чувствительном генотипе.", "Размер, локализация, митотическая активность, края и факт разрыва. Риск после предоперационной терапии оценивают с учётом исходных данных."],
  ["c025", "Цель — максимально безопасная резекция. При глубоком очаге или недопустимом функциональном риске обсудить биопсию. При рецидиве оценить возможность реоперации по симптомам, локализации и целям лечения.", "Интегрированный диагноз ВОЗ и доступные молекулярные маркеры, включая IDH и MGMT. Остаточный объём оценивают по ранней послеоперационной МРТ."],
  ["c029", "Хирургия при миеломе направлена на осложнения, прежде всего нестабильность, патологический перелом или компрессию нервных структур. При новом неврологическом дефиците требуется срочная оценка.", "Для стабилизации морфологический блок применим только при заборе материала. Документировать неврологический статус, стабильность и план координации системного и лучевого лечения."],
  ["c032", "Оценить первичные очаги, мезентериальную массу, сосуды и печёночные метастазы. Объём резекции определяют по возможности сохранить кровоснабжение и достаточную длину кишки.", "Число первичных очагов, глубина инвазии, дифференцировка, Ki-67, края, узлы и мезентериальные депозиты. Отдельно описать остаточные очаги."],
  ["c033", "Учитывать функциональную активность, размер, расположение относительно протока и grade. Для малых нефункционирующих опухолей низкого риска в отдельных случаях обсуждают наблюдение.", "Дифференцировка, митозы, Ki-67, сосудистая инвазия, края и узлы. После резекции оценить работу поджелудочной железы и симптомы гормональной секреции."],
  ["c034", "Для большинства опухолей анального канала первична ХЛТ. Локальное иссечение рассматривают лишь для отдельных поверхностных очагов или строго отобранных опухолей перианальной кожи. Спасительная операция требует подтверждения остаточной или рецидивной болезни.", "Края, поражение соседних органов, узлы и остаточная жизнеспособная опухоль после ХЛТ. Ранний неполный регресс сам по себе не равен персистенции."],
  ["c035", "Объём операции выбирают по глубине и локализации с учётом сохранения функции. План лечения паховых лимфоузлов определяется cN и риском скрытого поражения.", "Края, глубина, grade, лимфоваскулярная и периневральная инвазия. Для узлов — сторона, число, размер метастаза и ENE."],
  ["c036", "Хирургическую циторедукцию обсуждают только у строго отобранных пациентов в экспертном центре. Анатомическая резектабельность сама по себе недостаточна. При выпоте отдельно оценить симптоматическое вмешательство.", "Уточнить гистотип, узловой статус, объём фактически удалённой и остаточной болезни. После паллиативной процедуры оценить контроль выпота и симптомов."],
  ["c037", "До операции оценить риск рецидива, локализацию, глубину и признаки периневральной инвазии. Для отдельных опухолей высокого риска предпочтителен полный контроль краёв.", "Глубина, grade, периневральная инвазия, края и узлы при их удалении. При неблагоприятных признаках обсудить послеоперационную ЛТ."],
  ["c038", "Первичное лечение преимущественно лучевое или химиолучевое. Операцию обсуждают главным образом при подтверждённом изолированном рецидиве или остаточном узловом поражении после лечения.", "Подтвердить жизнеспособную опухоль, указать края и узлы. Учитывать предшествующее облучение при выборе дальнейшего локального контроля."],
  ["c039", "Операция возможна при небольших локализованных опухолях у тщательно отобранных пациенток. Оценить анатомию, вероятность отрицательных краёв и функциональную цену по сравнению с лучевым лечением.", "Размер, глубина, края и узлы при их оценке. При вовлечении краёв обсудить варианты дополнительного локального лечения."],
  ["c040", "При подозрении на маточную саркому планировать удаление без фрагментации. Объём зависит от гистотипа и распространённости; решение о придатках и узлах принимают отдельно.", "Уточнить гистотип, инвазию, края и целостность препарата. Зафиксировать факт фрагментации и сопоставить морфологию с операционными находками."],
  ["c041", "При PSTT или ETT, ограниченных маткой, операция часто является ключевым этапом. Для других форм операция имеет избирательную роль при кровотечении или резистентном очаге.", "Подтвердить подтип в экспертном центре, оценить глубину и сосудистую инвазию. Дальнейший контроль ХГЧ и лечение зависят от формы и распространённости."],
  ["c042", "Обсудить сохранение фертильности при допустимом онкологическом риске. Сохранённый контралатеральный яичник оценивают визуально. При распространении согласовать роль операции и платиносодержащего лечения.", "Компоненты опухоли, состояние капсулы и поверхность, смывы и распространённость. Сопоставить с послеоперационной динамикой гистотип-специфичных маркеров."],
  ["c043", "Выбрать органосохраняющую или стандартную операцию по гистотипу, стадии и репродуктивным планам. При гранулёзоклеточной опухоли по показаниям оценить эндометрий.", "Подтип, целостность капсулы и факт разрыва, стадия и внеяичниковые очаги. Для позднего рецидива предусмотреть соответствующее длительное наблюдение."],
  ["c045", "При низком риске возможно стандартное иссечение. При рецидиве, критической зоне или высоком риске оценить микрографически контролируемое удаление. При сложном дефекте согласовать реконструкцию.", "Указать подтип и статус краёв. При агрессивном росте или периневральной инвазии обсудить дальнейший контроль и лечебные варианты."],
  ["c047", "Оценить глубину инвазии, распространение на кость и функцию. Спланировать резекцию, реконструкцию и тактику по шее, даже если узлы клинически не поражены.", "Глубина инвазии, края, кость, периневральная и сосудистая инвазия, узлы и ENE определяют послеоперационный риск."],
  ["c048", "Перед выбором операции оценить HPV-статус, доступность трансоральной резекции, узлы и ожидаемую функцию глотания. Сопоставить с первичной ЛТ или ХЛТ.", "Края, узлы, ENE и морфология. Не переносить критерии исследовательской деинтенсификации на всех HPV-положительных пациентов."],
  ["c049", "При ранней опухоли сопоставить трансоральную резекцию и ЛТ. При распространённой болезни отличать анатомическую возможность сохранить гортань от ожидаемой функции.", "Зафиксировать края, инвазию хряща и экстраларингеальное распространение, узлы и ENE. После ларингэктомии обеспечить план голосовой реабилитации."],
  ["c051", "Разделить низкий и высокий риск. При низком риске оценить органосохранение и возможность строгого наблюдения. При высоком риске обычно обсуждают радикальную нефроуретерэктомию с удалением манжеты пузыря.", "Локализация, grade, глубина инвазии, края, сопутствующая CIS и узлы. После операции оценить функцию почек перед выбором системной терапии."],
  ["c052", "Оценить резектабельность, функцию гортани и пищевой тракт. Сопоставить органосохраняющую стратегию с операцией, реконструкцией и послеоперационным лечением.", "Края, инвазия хрящей или соседних структур, узлы и ENE. План реабилитации глотания и речи зависит от выполненного объёма."],
  ["c053", "При случайной находке после холецистэктомии пересмотреть морфологию и распространённость, чтобы решить вопрос о повторной резекции. Объём зависит от глубины и возможности R0.", "Глубина T, сторона стенки, край пузырного протока и узлы. При повторной операции оценить остаточную болезнь в ложе и узлах."],
  ["c054", "Объём определяется сегментом: тощая и подвздошная кишка обычно требуют сегментарной резекции с узлами, а при дуоденальной опухоли важна связь с ампулой и поджелудочной железой.", "Указать первичную локализацию, края, глубину, число узлов и MMR/MSI по показаниям. Не смешивать дуоденальный и ампулярный первичные очаги."],
  ["c057", "Для высокозлокачественной остеосаркомы запланировать резекцию в составе системной программы. По МРТ оценить внутрикостные очаги, биопсийный тракт и возможность сохранения функции.", "Края, остаточная жизнеспособная опухоль и лечебный патоморфоз. Оценить необходимость дальнейшего контроля первичной зоны и лёгких."],
  ["c058", "Локальный контроль планируют до индукции. После системной терапии сопоставить резекцию, ЛТ или их сочетание по ожидаемым краям, локализации и функциональному ущербу.", "Оценить края, жизнеспособную опухоль и эффект индукции. Эти данные обсуждают вместе с показаниями к послеоперационной ЛТ."],
  ["c059", "Перед операцией сопоставить морфологию с изображениями. Отличать атипичную хрящевую опухоль конечности от аксиальной опухоли и агрессивных подтипов. Объём зависит от grade и анатомии.", "Указать подтип, grade и края. При дедифференцировке отдельно описать агрессивный компонент."],
  ["c060", "Тактика различается для основания черепа, позвоночника и крестца. Оценить возможность удаления, неврологический ущерб и высокодозную ЛТ в экспертном центре.", "Указать подтип и края при их оценимости. План контроля учитывать фрагментарность резекции и остаточный объём по визуализации."],
  ["c061", "Для забрюшинной опухоли определить границы и гистотип до выбора объёма. Для конечности оценить возможность сохранения функции, реконструкции и роль ЛТ, особенно при миксоидной форме.", "Указать подтип, дедифференцированный компонент, края и эффект терапии. Сопоставить зоны риска с анатомией забрюшинного препарата."],
  ["c062", "При забрюшинном или сосудистом происхождении заранее определить отношения к магистральным сосудам и необходимость реконструкции. Вмешательства при метастазах рассматривают избирательно.", "Указать анатомическое происхождение, grade, края и сосудистое вовлечение. Отдельно фиксировать терапевтический эффект при проведённом лечении."],
  ["c063", "Спланировать широкое удаление с учётом МРТ, биопсийного тракта и функционального риска. При глубокой или крупной опухоли обсудить периоперационную терапию и реконструкцию.", "Указать размер, grade, края и эффект терапии. Диагноз при необходимости верифицировать с учётом SS18::SSX."],
  ["c064", "При ожидаемой полной резекции планировать тимэктомию. До операции оценить миастению, а при пограничной резектабельности определить место индукции.", "Тип ВОЗ, края, вовлечённые структуры и узлы. Учитывать целостность опухоли и применимую редакцию TNM."],
  ["c065", "Цель — полная резекция с оценкой передних и глубоких регионарных узлов. Если R0 сомнительна, после биопсии решить вопрос об индукции и переоценке.", "Гистотип, инвазия соседних структур, края и узлы по группам. Обсудить послеоперационную ЛТ и системную тактику по риску."],
  ["c066", "Оценить гистотип, grade, шейные узлы и периневральное распространение. Объём резекции и лечения шеи зависит от локализации. При околоушной опухоли планировать тактику в отношении лицевого нерва.", "Края, периневральная инвазия, grade и узлы. Для распространённой болезни учесть показания к исследованию AR, HER2 и слияний NTRK."],
  ["c067", "Угроза дыхательным путям требует срочной оценки. Резекция уместна при возможности R0/R1 с приемлемыми последствиями. При BRAF V600E и исходной нерезектабельности возможна переоценка после системного лечения.", "Подтвердить морфологию и молекулярный профиль, описать края и вовлечённые структуры. Согласовать сроки дальнейшего лечения без необоснованной задержки."],
  ["c068", "При локализованной болезни согласовать иссечение, сторожевую биопсию и возможную ЛТ. При клиническом поражении узлов рассмотреть лечение бассейна по распространённости.", "Размер, края, лимфоваскулярная инвазия и узловой статус с указанием метода его оценки. Обсудить показания к послеоперационной ЛТ."],
];

const SURGICAL_VIDEO_SUPPLEMENTS = {
  c077: {"title": "Установка аппликатора при иридоцилиарной меланоме", "note": "Операционные видеоприложения к открытой статье. Показаны этапы установки переднего аппликатора.", "url": "https://pmc.ncbi.nlm.nih.gov/articles/PMC11232867/"},
  c078: {"title": "Открытая панкреатодуоденальная резекция", "note": "Stanford Surgery · разбор открытой операции при аденокарциноме ампулы. Включены визуализация, операционные этапы и послеоперационная морфология.", "url": "https://www.youtube.com/watch?v=DHhTFR9iOls"},
  c079: {"title": "Лапароскопическая правосторонняя гемиколэктомия", "note": "Полная демонстрация техники по описанию автора. Не подтверждено, что показан случай рака аппендикса. Объём вмешательства определяется по морфологии и распространённости.", "url": "https://www.youtube.com/watch?v=M3AMiFKFcpE"},
  c083: {"title": "VATS-лобэктомия с лимфодиссекцией", "note": "CTSNet · учебная демонстрация техники при аденокарциноме лёгкого. Показания при LCNEC определяются отдельно.", "url": "https://www.ctsnet.org/article-video/uniportal-vats-right-lower-lobectomy-and-lymphadenectomy-step-step/"},
  c084: {"title": "Радикальная резекция злокачественной опухоли оболочек периферического нерва", "note": "AAOS Orthopaedic Video Theater · операционная демонстрация. Площадка может потребовать вход или подписку.", "url": "https://www.aaos.org/videos/video-detail-page/?id=25568__Videos"},
  c037: {
    title: 'Иссечение плоскоклеточного рака кожи предплечья и кожная пластика',
    note: 'Journal of Medical Insight · клинический случай с пластикой расщеплённым кожным трансплантатом. Полная запись может требовать подписку.',
    url: 'https://jomi.com/article/290.16/squamous-cell-carcinoma-excision-from-right-forearm-with-split-thickness-skin-graft-from-the-thigh/video',
  },
  c003: {"title": "Лобэктомия с лимфодиссекцией: пример техники", "note": "CTSNet · в опубликованном случае аденокарцинома. Демонстрирует технику анатомической резекции, применимость операции при МРЛ оценивают отдельно.", "url": "https://www.ctsnet.org/article-video/uniportal-vats-right-lower-lobectomy-and-lymphadenectomy-step-step/"},
  c021: {"title": "Тиреоидэктомия с центральной шейной диссекцией", "note": "YouTube · демонстрация техники. Гистотип сверяйте с описанием случая.", "url": "https://www.youtube.com/watch?v=M4UDc2jUYmE"},
  c032: {"title": "Мезентериальная диссекция при НЭО тонкой кишки", "note": "YouTube · короткий операционный фрагмент, демонстрирующий этап мезентериальной диссекции.", "url": "https://www.youtube.com/watch?v=d5UtlD2UMC4"},
  c043: {"title": "Роботическое рестадирование при гранулёзоклеточной опухоли яичника", "note": "Клинический случай с видео по ссылке издателя. Доступ к записи зависит от площадки.", "url": "https://pubmed.ncbi.nlm.nih.gov/40212140/"},
  c069: {"title": "Резекция астроцитомы левой лобной доли при краниотомии с пробуждением", "note": "Operative Neurosurgery · клинический случай с операционным видео. Переход к записи через статью издателя.", "url": "https://pubmed.ncbi.nlm.nih.gov/38953629/"},
  c070: {"title": "Резекция олигодендроглиомы через височно-теменной доступ", "note": "YouTube · операционная демонстрация. Молекулярные критерии опухоли и применимость доступа оценивают по данным конкретного случая.", "url": "https://www.youtube.com/watch?v=Mq8c55Xum8k"},
  c071: {"title": "Бронхопластическая резекция правого главного бронха при карциноиде", "note": "CTSNet · паренхимосберегающий вариант при центральной локализации.", "url": "https://www.ctsnet.org/article-video/right-main-bronchus-sleeve-resection/"},
  c072: {"title": "Лапароскопическая резекция локального рецидива адренокортикального рака", "note": "YouTube · клинический случай рецидива у ворот почки и магистральных сосудов. Доступ и тактика первичной операции оцениваются отдельно.", "url": "https://www.youtube.com/watch?v=8CYBoqGm5z4"},
  c073: {"title": "Комбинированная резекция синоназального ПКР", "note": "Operative Neurosurgery · операционное видео транскраниального и эндоскопического эндоназального этапов.", "url": "https://pmc.ncbi.nlm.nih.gov/articles/PMC9440979/"},
  c074: {"title": "Робот-ассистированная резекция опухоли почки", "note": "Urology NSW · короткая демонстрация органосохраняющей операции. Гистологический подтип в описании отсутствует.", "url": "https://www.youtube.com/watch?v=pawYxbKgfdQ"},
  c075: {"title": "Операционная демонстрация при ангиосаркоме молочной железы", "note": "YouTube · учебная запись с операционными кадрами. Объём хирургии относится к представленному случаю.", "url": "https://www.youtube.com/watch?v=C0mxheI0VmE"},
  c023: {
    title: 'Широкая резекция светлоклеточной саркомы сухожилия надколенника',
    note: 'AAOS Orthopaedic Video Theater · клинический пример резекции с реконструкцией. Показан конкретный гистотип и анатомическая локализация. Доступ может требовать авторизации.',
    url: 'https://www.aaos.org/videos/video-detail-page/?id=26965__Videos',
  },
  c042: {
    title: 'Стадирующая лапаротомия при крупной дисгерминоме яичника',
    note: 'Swarnim Raj Adhikari, MD · запись операции из отделения акушерства и гинекологии Institute of Medicine. Объём конкретного вмешательства не следует переносить на ситуации, в которых возможно сохранить фертильность.',
    url: 'https://www.youtube.com/watch?v=pOkLjdgNXdQ',
  },
  c052: {
    title: 'Тотальная ларингофарингэктомия',
    note: 'Doh Young Lee, MD, PhD · демонстрация техники вмешательства. Гистология и первичная локализация в описании записи не указаны.',
    url: 'https://www.youtube.com/watch?v=cSN-rSLgbps',
  },

  c010: {
    title: "Роботическая резекция при перихилярной холангиокарциноме",
    note: "Intelligent Surgery · видеостатья с резекцией печени и реконструкцией желчных путей в конкретном случае.",
    url: "https://www.sciencedirect.com/science/article/pii/S2666676623000078",
  },
  c014: {
    title: "Радикальная паховая орхиэктомия",
    note: "Nicholas Farber, MD · запись правосторонней орхиэктомии при раке яичка.",
    url: "https://www.youtube.com/watch?v=-UgvcRIuXmk",
  },
  c017: {
    title: "Радикальная гистерэктомия при раке шейки матки",
    note: "Journal of Minimally Invasive Gynecology · видеостатья о vNOTES. Это демонстрация изучаемого доступа, применимость определяют по клиническим рекомендациям.",
    url: "https://www.sciencedirect.com/science/article/pii/S1553465024001730",
  },
  c018: {
    title: "Иссечение опухоли вульвы и биопсия сторожевого узла",
    note: "International Journal of Gynecological Cancer · видеостатья о картировании и реконструкции V–Y. Видео ищите в публикации.",
    url: "https://ijgc.bmj.com/content/ijgc/31/2/300",
  },
  c019: {
    title: "Шейная лимфодиссекция медиально-латеральным доступом",
    note: "Head & Neck · описание хирургической техники со ссылкой на операционное видео. Показан регионарный этап.",
    url: "https://doi.org/10.1002/hed.28105",
  },
  c024: {
    title: "Лапароскопическая клиновидная резекция желудка при GIST",
    note: "SAGES Video Library · клинический случай крупной гастроинтестинальной стромальной опухоли.",
    url: "https://www.sages.org/video/v276-laparoscopic-gastric-wedge-resection-for-a-massive-gist/",
  },
  c033: {
    title: 'Роботическая энуклеация инсулином головки поджелудочной железы',
    note: 'Annals of Surgical Oncology · операционное видео у клинической публикации. Решение зависит от отношения опухоли к главному протоку и онкологического риска.',
    url: 'https://pubmed.ncbi.nlm.nih.gov/38017126/',
  },
  c034: {
    title: "Роботическая брюшно-промежностная экстирпация",
    note: "Colorectal Disease · видеоприложение к случаю местнораспространённого плоскоклеточного рака анального канала. Объём отражает конкретный случай.",
    url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC11701453/",
  },
  c035: {
    title: "Частичная пенэктомия при раке полового члена",
    note: "Bodyline Hospitals · короткий операционный фрагмент.",
    url: "https://www.youtube.com/watch?v=rm6bSkNR9Gw",
  },
  c036: {
    title: "Расширенная плеврэктомия с декортикацией",
    note: "CTSNet · демонстрация вмешательства при мезотелиоме плевры. Показания к циторедукции определяют отдельно по современным рекомендациям.",
    url: "https://www.ctsnet.org/article-video/laser-assisted-extended-pleurectomy-decortication-malignant-pleural-mesothelioma/",
  },
  c038: {
    title: "Эндоскопическая назофарингэктомия при рецидиве",
    note: "Visualized Cancer Medicine · видео спасительной резекции и реконструкции, Video 1.",
    url: "https://vcm.edpsciences.org/10.1051/vcm/2021001#V1",
  },
  c039: {
    title: "Радикальная гистерэктомия с вагинэктомией при первичном раке влагалища",
    note: "Видеопубликация о хирургии у отобранной пациентки. Из записи PubMed можно перейти к издателю.",
    url: "https://pubmed.ncbi.nlm.nih.gov/26825828/",
  },
  c047: {
    title: "Трансоральное удаление плоскоклеточного рака языка",
    note: "Видеопубликация о ранней опухоли подвижной части языка. Из записи PubMed можно перейти к издателю.",
    url: "https://pubmed.ncbi.nlm.nih.gov/34148818/",
  },
  c048: {
    title: "Роботическая латеральная орофарингэктомия",
    note: "Toronto Video Atlas of Surgery · учебная операционная запись о трансоральной резекции.",
    url: "https://pie.med.utoronto.ca/TVASurg/project/tors-radical-tonsillectomy/",
  },
  c049: {
    title: "Тотальная ларингэктомия при раке гортани",
    note: "Операционное дополнение к главе Open Access Atlas of Otolaryngology, Head and Neck Surgery.",
    url: "https://www.youtube.com/watch?v=NsXqkJOKnpQ",
  },
  c051: {
    title: "Лапароскопическая нефроуретерэктомия с манжетой мочевого пузыря",
    note: "Операционная запись при уротелиальной карциноме верхнего отдела мочеточника.",
    url: "https://www.youtube.com/watch?v=67szTirQvf4",
  },
  c053: {
    title: "Радикальная холецистэктомия при раке желчного пузыря",
    note: "Tata Memorial Centre · показана операция с резекцией сегментов IVb/V печени.",
    url: "https://www.youtube.com/watch?v=ZHQ96SCR1fw",
  },
  c057: {
    title: "Органосохраняющая резекция при остеосаркоме",
    note: "James C. Wittig, MD · клинический случай остеосаркомы дистального отдела бедра с отдельным опухолевым очагом в большеберцовой кости.",
    url: "https://www.youtube.com/watch?v=fFL4k8kCAf8",
  },
  c058: {
    title: "Радикальная резекция проксимального отдела бедренной кости при саркоме Юинга",
    note: "AAOS Orthopaedic Video Theater · доступ может требовать авторизации.",
    url: "https://www.aaos.org/videos/video-detail-page/?cc=OVT&id=25464__Videos",
  },
  c059: {
    title: "Резекция проксимального отдела бедренной кости при хондросаркоме",
    note: "James C. Wittig, MD · операционная демонстрация органосохраняющей резекции и протезирования.",
    url: "https://www.youtube.com/watch?v=SYVRGXWcB7A",
  },
  c060: {
    title: "Эндоскопическая эндоназальная резекция хордомы ската",
    note: "Neurosurgical Focus: Video · видеопубликация. Из записи PubMed можно перейти к издателю.",
    url: "https://pubmed.ncbi.nlm.nih.gov/36284779/",
  },
  c061: {
    title: "Роботическая резекция забрюшинного липоматозного образования",
    note: "SAGES Video Library · запись при подозрении на липосаркому. Диагноз в подписи отражает предоперационное подозрение.",
    url: "https://www.sages.org/video/v267-robot-assisted-resection-of-a-retroperitoneal-lipomatous-mass/",
  },
  c062: {
    title: "Резекция нижней полой вены при сосудистой саркоме",
    note: "Journal of Visceral Surgery · видеопубликация о лейомиосаркоме. Из записи PubMed можно перейти к издателю.",
    url: "https://pubmed.ncbi.nlm.nih.gov/27618703/",
  },
  c063: {
    title: "Резекция синовиальной саркомы сердца с аутотрансплантацией",
    note: "JTCVS Techniques · редкая локализация и специальный объём. Операционное видео в приложении к статье.",
    url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC9735421/",
  },
  c065: {
    title: "Роботическая резекция карциномы тимуса с тимэктомией",
    note: "CTSNet · клинический случай с резекцией перикарда.",
    url: "https://www.ctsnet.org/article-video/robotic-excision-thymic-carcinoma-along-thymectomy-and-excision-pericardium/",
  },
  c054: {
    title: "Лапароскопическая резекция проксимальной тощей кишки",
    note: "Laparoscopic Surgery · видеоприложение к клиническому случаю аденокарциномы.",
    url: "https://ls.amegroups.org/article/view/7294/html",
  },
  c009: {
    title: 'Роботическая резекция печени',
    note: 'Journal of Medical Insight · операция при образовании с подозрением на ГЦК. Описание видео отражает исходный клинический диагноз.',
    url: 'https://jomi.com/article/485/robotic-hepatectomy-for-a-segment-vvi-suspected-hcc-lesion-with-cholecystectomy-and-evaluation-by-ultrasound-and-excisional-biopsy-of-a-segment-ivb-lesion/video',
  },
  c025: {
    title: 'Удаление глиобластомы с картированием коры',
    note: 'MicroNeuroSurgeryOrg · клинический случай резекции в области моторной коры с пробуждением.',
    url: 'https://www.youtube.com/watch?v=xDCB7v9xC9Q',
  },
  c045: {
    title: 'Реконструкция нижнего века после операции Мооса',
    note: 'Journal of Medical Insight · показана реконструкция после удаления базальноклеточной карциномы, а не сам этап удаления.',
    url: 'https://jomi.com/article/513/lower-eyelid-full-thickness-lid-margin-repair-for-8-mm-defect-following-mohs-surgery-for-basal-cell-carcinoma/video',
  },
  c064: {
    title: 'Робот-ассистированная тимэктомия',
    note: 'CTSNet · клинический случай тимомы B1 по послеоперационной морфологии.',
    url: 'https://www.ctsnet.org/article-video/vessel-sealer-assisted-robotic-thymectomy/',
  },
  c066: {
    title: 'Субтотальная паротидэктомия и шейная лимфодиссекция',
    note: 'Journal of Medical Insight · клинический случай мукоэпидермоидной карциномы околоушной железы.',
    url: 'https://jomi.com/article/516/subtotal-parotidectomy-and-unilateral-lateral-neck-dissection-levels-ii-iii-and-iv-for-right-parotid-mucoepidermoid-carcinoma-involving-the-deep-and-superficial-lobes-and-extending-into-parapharyngeal-space/video',
  },
};

const SURGICAL_SITUATION_OVERRIDES = {
  c025: [
    ['Первичное лечение', 'Оценить объём безопасной резекции по МРТ и отношению к функциональным структурам. Картирование обсуждают по локализации.', 'При неприемлемом функциональном риске получить материал биопсией, если диагноз изменит тактику.'],
    ['Рецидив', 'Подтвердить вероятное прогрессирование, сопоставив МРТ с временем лучевой терапии и клиникой. Рассмотреть реоперацию для локального контроля, симптомов или получения материала.', 'Взвесить функциональный риск, предшествующие вмешательства и последующие варианты лечения.'],
  ],
  c029: [
    ['Нестабильность или патологический перелом', 'Совместно с ортопедом или спинальным хирургом оценить стабилизацию либо фиксацию. Определить ограничения нагрузки и обезболивание.', 'Согласовать очередность с лучевой и системной терапией.'],
    ['Подозрение на компрессию нервных структур', 'При неврологическом дефиците срочно организовать визуализацию и мультидисциплинарную оценку.', 'Нестабильность и механическая компрессия могут повлиять на выбор декомпрессии или стабилизации.'],
  ],
  c036: [
    ['Рассмотрение циторедукции', 'Операцию обсуждают в профильном центре только при благоприятных характеристиках, включая избранные ранние эпителиоидные опухоли T1–T3N0.', 'По ASCO анатомическая резектабельность сама по себе не является показанием; учитывать морбидность и данные MARS 2.'],
    ['Симптоматический выпот', 'Обсудить плевродез или постоянный плевральный катетер при соответствующих условиях.', 'Учитывать расправление лёгкого, прогноз и предпочтения пациента.'],
  ],
  c038: [
    ['Первичная опухоль', 'Первичный локальный контроль обычно обеспечивают лучевой или химиолучевой терапией по распространённости.', 'Резекция первичной опухоли не входит в рутинный первичный алгоритм.'],
    ['Изолированный остаточный очаг или рецидив', 'Подтвердить жизнеспособную опухоль и исключить отдалённое распространение. В экспертном центре сопоставить спасительную резекцию и повторное облучение.', 'При изолированном остаточном или рецидивном поражении шейных узлов можно обсуждать шейную диссекцию.'],
  ],
};

function supplementalSurgerySituations(card) {
  if (SURGICAL_SITUATION_OVERRIDES[card.id]) return SURGICAL_SITUATION_OVERRIDES[card.id];
  const context = NON_TNM_CARD_INFO[card.id];
  if (context) return context.contexts.map(([title, detail]) => [title, detail]);
  return (CARD_STAGES[card.id] ?? STAGES).map(stage => {
    const surgery = surgeryForStage(card, stage);
    return [stageLabel(card, stage), surgery?.procedure ?? card[stage], surgery?.limits];
  });
}

function supplementalSurgerySources(card) {
  const context = NON_TNM_CARD_INFO[card.id];
  const urls = context ? [context.url] : (CARD_STAGES[card.id] ?? STAGES)
    .map(stage => surgeryForStage(card, stage)?.url ?? stagingByCard.get(card.id)?.[0]?.url);
  if (card.id === 'c036') urls.unshift('https://pubmed.ncbi.nlm.nih.gov/39778125/');
  if (card.id === 'c025') urls.unshift('https://pmc.ncbi.nlm.nih.gov/articles/PMC12908567/');
  return [...new Set(urls.filter(Boolean))].map((url, index) =>
    [index === 0 ? 'Источник хирургической тактики' : 'Дополнительный источник ' + (index + 1), url]);
}

for (const [id, pathway, pathology, reviewDate] of SURGICAL_CARD_NOTES) {
  const card = DATA.find(item => item.id === id);
  if (!card) continue;
  SURGICAL_ALGORITHMS.push({
    id, title: card.title, cards: [id], keywords: [card.group, card.id, CARD_SEARCH_ALIASES[card.id], ...card.icd10].join(' '),
    pathway, pathology, reviewDate, situations: supplementalSurgerySituations(card), sources: supplementalSurgerySources(card),
    video: SURGICAL_VIDEO_SUPPLEMENTS[id],
  });
}

const videosRequiringSignIn = new Set([
  "https://www.youtube.com/watch?v=DHhTFR9iOls",
  "https://www.youtube.com/watch?v=Mq8c55Xum8k",
  "https://www.youtube.com/watch?v=-UgvcRIuXmk",
  "https://www.youtube.com/watch?v=8CYBoqGm5z4",
  "https://www.youtube.com/watch?v=M4UDc2jUYmE",
  "https://www.youtube.com/watch?v=NsXqkJOKnpQ",
  "https://www.youtube.com/watch?v=SYVRGXWcB7A",
  "https://www.youtube.com/watch?v=ZHQ96SCR1fw",
  "https://www.youtube.com/watch?v=cSN-rSLgbps",
  "https://www.youtube.com/watch?v=fFL4k8kCAf8",
  "https://www.youtube.com/watch?v=gdg7EhsKki8",
  "https://www.youtube.com/watch?v=rm6bSkNR9Gw",
  "https://www.youtube.com/watch?v=toDWThY48Z0",
  "https://www.youtube.com/watch?v=xDCB7v9xC9Q",
  "https://www.youtube.com/watch?v=yQXH2oxADS0"
]);

function surgeryPage() {
  const algorithm = SURGICAL_ALGORITHMS.find(item => item.id === state.surgerySection);
  if (algorithm) {
    const returnCard = algorithm.cards.includes(state.surgeryOrigin) ? state.surgeryOrigin : null;
    const stage = (CARD_STAGES[returnCard] ?? STAGES).includes(state.surgeryStage) ? state.surgeryStage : (CARD_STAGES[returnCard] ?? STAGES)[0];
    const links = algorithm.cards.map(id => {
      const card = DATA.find(item => item.id === id);
      const href = '#card/' + id + '/' + (id === returnCard ? stage : (CARD_STAGES[id] ?? STAGES)[0]) + '/surgery';
      return '<a class="btn secondary" href="' + esc(href) + '">' + esc(card.title) + '</a>';
    }).join('');
    return shell(esc(algorithm.title), `
      <p><a class="back" href="#surgery">← Хирургические алгоритмы</a></p>
      <div class="panel"><h2>Выберите клиническую ситуацию</h2>
        <p>${esc(algorithm.pathway)}</p>
        ${algorithm.situations.map(([title, plan, decision]) => `<details class="marker-entry">
          <summary>${esc(title)}</summary><div class="marker-detail">
          <p><b>План вмешательства.</b> ${esc(plan)}</p>
          ${decision ? `<p><b>Что меняет тактику.</b> ${esc(decision)}</p>` : ''}</div></details>`).join('')}
        <h2>${algorithm.id === 'c029' ? 'Послеоперационная оценка' : 'Послеоперационная морфология'}</h2><p>${esc(algorithm.pathology)}</p>
        ${algorithm.video ? `<h2>Операционное видео</h2>
          <p>${treatmentSource(algorithm.video.url, algorithm.video.title + ' ↗')}</p>
          <p>${esc(algorithm.video.note)}</p>
          <p class="fine">${videosRequiringSignIn.has(algorithm.video.url) ? 'YouTube запрашивал вход для подтверждения возраста при проверке.' : 'Длительность и доступность записи зависят от условий площадки.'}</p>` : '<p class="fine">Операционное видео: подходящая запись пока не подтверждена.</p>'}
        ${algorithm.openVideos?.length ? `<h2>Полные записи без подписки</h2>
          ${algorithm.openVideos.map(video => `<p>${treatmentSource(video.url, video.title + ' ↗')}</p>
            <p>${esc(video.note)}</p>`).join('')}` : ''}
        <p class="fine">Дата редакции ${esc(algorithm.reviewDate ?? '24.11.2026')}. Независимая медицинская рецензия не проведена.</p>
        <p class="fine">${algorithm.sources.map(([label, url]) => treatmentSource(url, label)).join(' · ')}</p>
        <div class="actions">${links}${stagingCardLink(returnCard ?? algorithm.cards[0])}</div>
      </div>`);
  }
  const surgeryGroups = new Map();
  for (const item of SURGICAL_ALGORITHMS) {
    const group = DATA.find(card => card.id === item.cards[0]).group;
    if (!surgeryGroups.has(group)) surgeryGroups.set(group, []);
    surgeryGroups.get(group).push(item);
  }
  return shell('Хирургические алгоритмы', `
    <section class="panel"><h2>Основы онкохирургии</h2>
      ${SURGICAL_BASICS.map(([title, text]) => `<details class="marker-entry"><summary>${esc(title)}</summary>
        <div class="marker-detail"><p>${esc(text)}</p></div></details>`).join('')}
      <p class="fine">${treatmentSource('https://www.cap.org/protocols-and-guidelines/cancer-protocols/current-cancer-protocols/', 'CAP · протоколы исследования операционного материала')}</p>
    </section>
    <section class="panel"><h2>Алгоритмы по нозологиям</h2>
      ${[...surgeryGroups].sort(([a], [b]) => a.localeCompare(b, 'ru')).map(([group, items]) =>
        `<details class="marker-entry"><summary>${esc(group)} · ${items.length}</summary><div class="marker-detail">
          ${items.sort((a, b) => a.title.localeCompare(b.title, 'ru')).map(item =>
            `<a class="item" href="#surgery/${esc(item.id)}"><strong>${esc(item.title)}</strong><span aria-hidden="true">→</span></a>`).join('')}
        </div></details>`).join('')}
    </section>`);
}

function render(){const pages={home,catalog,card,tnm:tnmPage,calculators:calcPage,scales,markers,regimens:regimenIndexPage,surgery:surgeryPage,sources:sourcesPage,favorites,about,admin};$('#app').innerHTML=(pages[state.page]||home)();allNodes('[data-nav]').forEach(x=>x.classList.toggle('active',x.dataset.nav===state.page));if(state.page==='catalog')listCards();if(state.page==='regimens' && state.regimenSection!=='complications')filterRegimenIndex()}
window.view=view;window.toggleFav=toggleFav;window.setStage=setStage;window.searchHome=searchHome;window.filterRegimenIndex=filterRegimenIndex;window.listCards=listCards;window.filterStaging=filterStaging;window.calculate=calculate;window.updateDeauville=updateDeauville;window.updateAnthracyclines=updateAnthracyclines;window.updateMascc=updateMascc;window.updateCisne=updateCisne;window.updateR2iss=updateR2iss;window.filterImagingRads=filterImagingRads;window.filterCtcae=filterCtcae;window.khorana=khorana;window.child=child;window.imdc=imdc;window.filterMarkers=filterMarkers;
start();
