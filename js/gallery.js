// ==========================================================================
// ИЗОБРАЖЕНИЯ КАТАЛОГА
// ==========================================================================
const IMAGE_META = Object.fromEntries([
  ['work-01-main', 1109, 1600, 555, 800],
  ['work-01-detail-01', 1200, 1600, 600, 800],
  ['work-01-detail-02', 1200, 1600, 600, 800],
  ['work-01-detail-03', 1200, 1600, 600, 800],
  ['work-01-detail-04', 1200, 1600, 600, 800],
  ['work-01-detail-05', 1200, 1600, 600, 800],
  ['work-02-main', 703, 1600, 352, 800],
  ['work-02-detail-01', 1200, 1600, 600, 800],
  ['work-02-detail-02', 1200, 1600, 600, 800],
  ['work-02-detail-03', 1200, 1600, 600, 800],
  ['work-02-detail-04', 1200, 1600, 600, 800],
  ['work-02-detail-05', 1200, 1600, 600, 800],
  ['work-03-main', 1129, 1600, 564, 800],
  ['work-03-detail-01', 1200, 1600, 600, 800],
  ['work-03-detail-02', 1200, 1600, 600, 800],
  ['work-03-detail-03', 1200, 1600, 600, 800],
  ['work-03-detail-04', 1200, 1600, 600, 800],
  ['work-03-detail-05', 1200, 1600, 600, 800],
  ['work-04-main', 1232, 1600, 616, 800],
  ['work-05-main', 1146, 1600, 573, 800],
  ['work-06-main', 1101, 1600, 550, 800],
  ['work-07-main', 1108, 1600, 554, 800],
  ['work-08-main', 1157, 1600, 578, 800],
  ['work-09-main', 1188, 1600, 594, 800],
  ['work-10-main', 1144, 1600, 572, 800],
  ['work-11-main', 1137, 1600, 568, 800],
  ['work-12-main', 1016, 1600, 508, 800],
  ['work-13-main', 1014, 1600, 507, 800],
  ['work-14-main', 1159, 1600, 579, 800],
  ['work-15-main', 1141, 1600, 570, 800],
  ['work-16-main', 1600, 1111, 800, 556],
  ['work-16-detail-01', 1600, 1163, 800, 582],
  ['work-16-detail-02', 1600, 1163, 800, 582],
  ['work-17-main', 1280, 960, 800, 600],
  ['work-17-detail-01', 1027, 1600, 513, 800],
  ['work-17-detail-02', 1023, 1600, 512, 800],
  ['work-18-main', 1600, 1003, 800, 501],
  ['work-18-detail-01', 1600, 1280, 800, 640],
  ['work-19-main', 1600, 1188, 800, 594],
  ['work-20-main', 1600, 1155, 800, 577],
  ['work-21-main', 1600, 1200, 800, 600],
  ['work-22-main', 1203, 1600, 602, 800],
  ['work-23-main', 1043, 1600, 522, 800],
  ['work-23-detail-01', 1200, 1600, 600, 800],
  ['work-23-detail-02', 1200, 1600, 600, 800],
  ['work-24-main', 1600, 1106, 800, 553],
  ['work-24-detail-01', 1600, 1200, 800, 600],
  ['work-24-detail-02', 1200, 1600, 600, 800],
  ['work-24-detail-03', 1600, 1220, 800, 610],
  ['work-25-main', 1276, 1600, 638, 800]
].map(([name, width, height, smallWidth, smallHeight]) => [
  `../catalog/${name}.webp`,
  {
    width,
    height,
    small: {
      src: `../catalog/${name}-sm.webp`,
      width: smallWidth,
      height: smallHeight
    }
  }
]));

// ==========================================================================
// СТЕНА (магазин)
// ==========================================================================
const originalWork = (number, data) => {
  const code = String(number).padStart(2, '0');
  return {
    id: `work-${code}`,
    image: `../catalog/work-${code}-main.webp`,
    kind: 'original',
    type: { ru: 'Оригинал', en: 'Original' },
    year: 2026,
    ...data
  };
};

// Порядок записей в массиве определяет порядок и номера работ в Лавке.
const shop = [
  originalWork(1, {
    title: { ru: 'Рождение Венеры в советской ванной', en: 'The birth of Venus in the Soviet bathroom' },
    detail: [
      '../catalog/work-01-detail-01.webp',
      '../catalog/work-01-detail-02.webp',
      '../catalog/work-01-detail-03.webp',
      '../catalog/work-01-detail-04.webp',
      '../catalog/work-01-detail-05.webp'
    ],
    ratio: '35/50',
    scale: 'l',
    material: { ru: 'Холст, акрил', en: 'Canvas, acrylic' },
    size: { ru: '35×50 см', en: '35×50 cm' },
    price: { ru: 35000, en: 400 }
  }),
  originalWork(2, {
    title: { ru: 'Где ты, Буратино', en: 'Where are you, Pinocchio?' },
    detail: [
      '../catalog/work-02-detail-01.webp',
      '../catalog/work-02-detail-02.webp',
      '../catalog/work-02-detail-03.webp',
      '../catalog/work-02-detail-04.webp',
      '../catalog/work-02-detail-05.webp'
    ],
    ratio: '29.5/67',
    scale: 's',
    material: { ru: 'Холст, акрил', en: 'Canvas, acrylic' },
    size: { ru: '29,5×67 см', en: '29.5×67 cm' },
    price: { ru: 35000, en: 400 }
  }),
  originalWork(3, {
    title: { ru: 'Голубая комната', en: 'Blue room' },
    detail: [
      '../catalog/work-03-detail-01.webp',
      '../catalog/work-03-detail-02.webp',
      '../catalog/work-03-detail-03.webp',
      '../catalog/work-03-detail-04.webp',
      '../catalog/work-03-detail-05.webp'
    ],
    ratio: '35/49',
    scale: 'l',
    material: { ru: 'Холст, акрил', en: 'Canvas, acrylic' },
    size: { ru: '35×49 см', en: '35×49 cm' },
    price: { ru: 35000, en: 400 }
  }),
  originalWork(22, {
    title: { ru: 'Маков цвет', en: 'Poppy Bloom' },
    ratio: '30/40',
    scale: 'm',
    material: { ru: 'Холст, акрил', en: 'Canvas, acrylic' },
    size: { ru: '30×40 см', en: '30×40 cm' },
    status: 'sold',
    collection: { ru: 'Частная коллекция, Санкт-Петербург', en: 'Private collection, Saint Petersburg' }
  }),
  originalWork(23, {
    title: { ru: 'Ветреницы в вазе', en: 'Anemones in vase' },
    detail: [
      '../catalog/work-23-detail-01.webp',
      '../catalog/work-23-detail-02.webp'
    ],
    ratio: '20/30',
    scale: 's',
    material: { ru: 'Галерейный холст, акрил', en: 'Gallery-wrapped canvas, acrylic' },
    size: { ru: '20×30×5 см', en: '20×30×5 cm' },
    status: 'sold',
    collection: { ru: 'Частная коллекция, Токио', en: 'Private collection, Tokyo' }
  }),
  originalWork(4, {
    title: { ru: 'Гроза', en: 'Storm' },
    ratio: '18.5/26',
    scale: 's',
    material: { ru: 'Бумага, акрил', en: 'Paper, acrylic' },
    size: { ru: '18,5×26 см', en: '18.5×26 cm' },
    price: { ru: 8000, en: 100 }
  }),
  originalWork(5, {
    title: { ru: 'Она любила Ив Монтана', en: 'She loved Yves Montand' },
    ratio: '29.7/42',
    scale: 'm',
    material: { ru: 'Бумага, акрил', en: 'Paper, acrylic' },
    size: { ru: '29,7×42 см', en: '29.7×42 cm' },
    price: { ru: 10000, en: 100 }
  }),
  originalWork(6, {
    title: { ru: 'Белые стихи', en: 'White poems' },
    ratio: '21/29.7',
    scale: 's',
    material: { ru: 'Бумага, акрил', en: 'Paper, acrylic' },
    size: { ru: '21×29,7 см', en: '21×29.7 cm' },
    price: { ru: 8000, en: 100 }
  }),
  originalWork(25, {
    title: { ru: 'Муза устала быть Музой', en: 'The Muse Is Tired of Being a Muse' },
    ratio: '21/29.7',
    scale: 's',
    material: { ru: 'Бумага, акрил', en: 'Paper, acrylic' },
    size: { ru: '21×29,7 см', en: '21×29.7 cm' },
    status: 'sold',
    collection: { ru: 'Частная коллекция, Санкт-Петербург', en: 'Private collection, Saint Petersburg' }
  }),
  originalWork(7, {
    title: { ru: 'Её шуршащие шелка', en: 'Her rustling silks' },
    ratio: '21/29.7',
    scale: 's',
    material: { ru: 'Бумага, акрил', en: 'Paper, acrylic' },
    size: { ru: '21×29,7 см', en: '21×29.7 cm' },
    price: { ru: 7000, en: 100 }
  }),
  originalWork(8, {
    title: { ru: 'Озеро', en: 'Lake' },
    ratio: '10.5/14.8',
    scale: 's',
    material: { ru: 'Бумага, акрил', en: 'Paper, acrylic' },
    size: { ru: '10,5×14,8 см', en: '10.5×14.8 cm' },
    price: { ru: 7000, en: 100 }
  }),
  originalWork(24, {
    title: { ru: 'Август', en: 'August' },
    detail: [
      '../catalog/work-24-detail-01.webp',
      '../catalog/work-24-detail-02.webp',
      '../catalog/work-24-detail-03.webp'
    ],
    ratio: '29.7/42',
    scale: 'l',
    material: { ru: 'Бумага, акрил', en: 'Paper, acrylic' },
    size: { ru: '29,7×42 см', en: '29.7×42 cm' },
    status: 'sold',
    collection: { ru: 'Частная коллекция, Екатеринбург', en: 'Private collection, Yekaterinburg' }
  }),
  originalWork(11, {
    title: { ru: 'Жемчуг', en: 'Pearl' },
    ratio: '21/29.7',
    scale: 's',
    material: { ru: 'Бумага, акрил', en: 'Paper, acrylic' },
    size: { ru: '21×29,7 см', en: '21×29.7 cm' },
    price: { ru: 8000, en: 100 }
  }),
  originalWork(12, {
    title: { ru: 'Ещё раз про любовь', en: 'Once again about love' },
    ratio: '14.8/21',
    scale: 's',
    material: { ru: 'Бумага, акрил', en: 'Paper, acrylic' },
    size: { ru: '14,8×21 см', en: '14.8×21 cm' },
    price: { ru: 7000, en: 100 }
  }),
  originalWork(13, {
    title: { ru: 'Утренняя чашка фильтра', en: 'Morning filter cup' },
    ratio: '14.8/21',
    scale: 's',
    material: { ru: 'Бумага, акрил', en: 'Paper, acrylic' },
    size: { ru: '14,8×21 см', en: '14.8×21 cm' },
    price: { ru: 7000, en: 100 }
  }),
  originalWork(14, {
    title: { ru: 'Лето в Переделкино!', en: 'Summer in Peredelkino!' },
    ratio: '14.8/21',
    scale: 's',
    material: { ru: 'Бумага, акрил', en: 'Paper, acrylic' },
    size: { ru: '14,8×21 см', en: '14.8×21 cm' },
    price: { ru: 7000, en: 100 }
  }),
  originalWork(15, {
    title: { ru: 'Нагори', en: 'Nagori' },
    ratio: '29.7/42',
    scale: 'm',
    material: { ru: 'Бумага, акрил', en: 'Paper, acrylic' },
    size: { ru: '29,7×42 см', en: '29.7×42 cm' },
    price: { ru: 10000, en: 100 }
  }),
  originalWork(16, {
    title: { ru: 'Осторожно, хрупкое!', en: 'Careful, fragile!' },
    detail: [
      '../catalog/work-16-detail-01.webp',
      '../catalog/work-16-detail-02.webp'
    ],
    ratio: '29.7/42',
    scale: 'm',
    material: { ru: 'Бумага, акрил', en: 'Paper, acrylic' },
    size: { ru: '29,7×42 см', en: '29.7×42 cm' },
    price: { ru: 10000, en: 100 }
  }),
  originalWork(10, {
    title: { ru: 'Солнечные ветры и женщины пытаются жить', en: 'Solar winds and women are trying to live' },
    ratio: '14.8/21',
    scale: 's',
    material: { ru: 'Бумага, акрил, карандаш', en: 'Paper, acrylic, pencil' },
    size: { ru: '14,8×21 см', en: '14.8×21 cm' },
    price: { ru: 7000, en: 100 }
  }),
  originalWork(18, {
    title: { ru: 'Оленёнок', en: 'Deer' },
    detail: ['../catalog/work-18-detail-01.webp'],
    ratio: '14.8/21',
    scale: 's',
    material: { ru: 'Бумага, акрил', en: 'Paper, acrylic' },
    size: { ru: '14,8×21 см', en: '14.8×21 cm' },
    price: { ru: 7000, en: 100 }
  }),
  originalWork(19, {
    title: { ru: 'Сон', en: 'Dream' },
    ratio: '14.8/21',
    scale: 's',
    material: { ru: 'Бумага, акрил, карандаш', en: 'Paper, acrylic, pencil' },
    size: { ru: '14,8×21 см', en: '14.8×21 cm' },
    price: { ru: 7000, en: 100 }
  }),
  originalWork(20, {
    title: { ru: 'Нежность', en: 'Tenderness' },
    ratio: '21/29.7',
    scale: 's',
    material: { ru: 'Бумага, акрил', en: 'Paper, acrylic' },
    size: { ru: '21×29,7 см', en: '21×29.7 cm' },
    price: { ru: 8000, en: 100 }
  }),
  originalWork(21, {
    title: { ru: 'Летний дождь', en: 'Summer rain' },
    ratio: '14.8/21',
    scale: 's',
    material: { ru: 'Бумага, акрил', en: 'Paper, acrylic' },
    size: { ru: '14,8×21 см', en: '14.8×21 cm' },
    price: { ru: 8000, en: 100 }
  }),
  originalWork(9, {
    title: { ru: 'Весна внутри', en: 'Spring is inside' },
    ratio: '14.8/21',
    scale: 's',
    material: { ru: 'Бумага, акрил, карандаш', en: 'Paper, acrylic, pencil' },
    size: { ru: '14,8×21 см', en: '14.8×21 cm' },
    price: { ru: 7000, en: 100 }
  }),
  originalWork(17, {
    title: { ru: 'Двое', en: 'Two' },
    detail: [
      '../catalog/work-17-detail-01.webp',
      '../catalog/work-17-detail-02.webp'
    ],
    ratio: '21/29.7',
    scale: 's',
    material: { ru: 'Бумага, акрил', en: 'Paper, acrylic' },
    size: { ru: '21×29,7 см', en: '21×29.7 cm' },
    price: { ru: 10000, en: 100 }
  }),
];
