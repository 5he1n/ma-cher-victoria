// Структура данных, которую ждёт карусель.
// Обязательны только image и title. Остальные поля собираются в подпись
// «2024 · Холст, масло · 60×80» — чего нет, то просто не выводится.

const gallery = {
  painting: [
    { image: 'catalog/work-1.png',  title: 'Утро в Юрмале', year: 2024, material: 'Холст, масло', size: '60×80' },
    { image: 'catalog/work-2.png',  title: 'Окно',          year: 2024, material: 'Холст, масло', size: '40×50' },
    { image: 'catalog/work-3.png',  title: 'Сирень',        year: 2023, material: 'Холст, масло' },
    { image: 'catalog/work-4.png',  title: 'Тишина',        year: 2023, material: 'Холст, масло' }
  ],
  graphics: [
    { image: 'catalog/work-5.png',  title: 'Набросок I',    year: 2025, material: 'Бумага, тушь' },
    { image: 'catalog/work-6.png',  title: 'Набросок II',   year: 2025, material: 'Бумага, тушь' },
    { image: 'catalog/work-7.png',  title: 'Профиль',       year: 2024, material: 'Бумага, уголь' }
  ],
  illustration: [
    { image: 'catalog/work-8.png',  title: 'Кофейня',       year: 2025, material: 'Цифровая печать' },
    { image: 'catalog/work-9.png',  title: 'Прогулка',      year: 2025, material: 'Цифровая печать' },
    { image: 'catalog/work-10.JPG', title: 'Двор',          year: 2024, material: 'Акварель' },
    { image: 'catalog/work-11.JPG', title: 'Вечер',         year: 2024, material: 'Акварель' }
  ]
};

// Для секции «Лавка» — тот же формат, отдельный массив.
const shop = [
  { image: 'catalog/work-1.png', title: 'Утро в Юрмале — принт', year: 2024, material: 'Giclée, A3', size: '90 €' },
  { image: 'catalog/work-5.png', title: 'Набросок I — оригинал', year: 2025, material: 'Бумага, тушь', size: '150 €' }
];