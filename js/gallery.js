// ==========================================================================
// СЕРИЯ РАБОТ (карусель)
// ==========================================================================
const gallery = {
  painting: [
    { image: 'catalog/work-1.png', title: 'Утро в Юрмале', year: 2024, material: 'Холст, масло', size: '60×80' },
    { image: 'catalog/work-2.png', title: 'Окно',          year: 2024, material: 'Холст, масло', size: '40×50' },
    { image: 'catalog/work-3.png', title: 'Сирень',        year: 2023, material: 'Холст, масло', size: '50×70' },
    { image: 'catalog/work-4.png', title: 'Тишина',        year: 2023, material: 'Холст, масло', size: '40×40' }
  ],
  graphics: [
    { image: 'catalog/work-5.png', title: 'Набросок I',  year: 2025, material: 'Бумага, тушь',  size: '21×30' },
    { image: 'catalog/work-6.png', title: 'Набросок II', year: 2025, material: 'Бумага, тушь',  size: '21×30' },
    { image: 'catalog/work-7.png', title: 'Профиль',     year: 2024, material: 'Бумага, уголь', size: '30×40' }
  ],
  illustration: [
    { image: 'catalog/work-8.png',  title: 'Кофейня',  year: 2025, material: 'Цифровая печать', size: 'A3' },
    { image: 'catalog/work-9.png',  title: 'Прогулка', year: 2025, material: 'Цифровая печать', size: 'A3' },
    { image: 'catalog/work-10.JPG', title: 'Двор',     year: 2024, material: 'Акварель',        size: '30×40' },
    { image: 'catalog/work-11.JPG', title: 'Вечер',    year: 2024, material: 'Акварель',        size: '30×40' }
  ]
};

// ==========================================================================
// СТЕНА (магазин)
//
// id         уникальный, по нему работает корзина
// kind       'original' | 'print' — по этому полю фильтр
// ratio      пропорция работы, '4/5', '3/4', '1/1', '16/10'.
//            Задаёт и размер картины, и размер следа от проданной
// scale      's' | 'm' | 'l' — насколько крупно работа висит на стене
// detail     кроп фрагмента для разворота (необязательно, но сильно оживляет)
// about      1–2 предложения о работе (необязательно)
// status     'sold' → вместо картины остаются гвоздь и невыгоревший след
// collection подпись у проданной: «Частная коллекция, Стамбул»
// ==========================================================================
const shop = [
  {
    id: 'orig-yurmala',
    title: 'Утро в Юрмале',
    image: 'catalog/work-1.png',
    detail: 'catalog/work-1.png',
    kind: 'original',
    type: 'Оригинал',
    ratio: '4/5',
    scale: 'l',
    year: 2024,
    material: 'Холст, масло',
    size: '60×80 см',
    price: 850,
    about: 'Писалось три недели утром, пока свет ещё холодный.'
  },
  {
    id: 'orig-window',
    title: 'Окно',
    image: 'catalog/work-2.png',
    kind: 'original',
    type: 'Оригинал',
    ratio: '4/5',
    scale: 'm',
    year: 2024,
    material: 'Холст, масло',
    size: '40×50 см',
    price: 620,
    status: 'sold',
    collection: 'Частная коллекция, Стамбул'
  },
  {
    id: 'orig-silence',
    title: 'Тишина',
    image: 'catalog/work-4.png',
    kind: 'original',
    type: 'Оригинал',
    ratio: '1/1',
    scale: 's',
    year: 2023,
    material: 'Холст, масло',
    size: '40×40 см',
    price: 480,
    status: 'sold',
    collection: 'Частная коллекция, Рига'
  },
  {
    id: 'print-yurmala-a3',
    title: 'Утро в Юрмале',
    image: 'catalog/work-1.png',
    kind: 'print',
    type: 'Принт, тираж 25',
    ratio: '4/5',
    scale: 'm',
    year: 2025,
    material: 'Giclée, хлопковая бумага',
    size: 'A3',
    price: 90
  },
  {
    id: 'print-sketch-a4',
    title: 'Набросок I',
    image: 'catalog/work-5.png',
    kind: 'print',
    type: 'Принт, тираж 50',
    ratio: '3/4',
    scale: 's',
    year: 2025,
    material: 'Giclée',
    size: 'A4',
    price: 55
  }
];