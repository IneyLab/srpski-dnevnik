// Сербский алфавит (азбука) в порядке кириллицы. Произношение — приблизительное, по-русски.

export interface Letter {
  cyr: string
  lat: string
  sound: string
  /** Буквы, которых нет в русской кириллице. */
  isNew?: boolean
  /** Пример (кириллица) и перевод. */
  ex: string
  exRu: string
  tip?: string
}

export const ALPHABET: Letter[] = [
  { cyr: 'Аа', lat: 'Aa', sound: '[а]', ex: 'авион', exRu: 'самолёт' },
  { cyr: 'Бб', lat: 'Bb', sound: '[б]', ex: 'брат', exRu: 'брат' },
  { cyr: 'Вв', lat: 'Vv', sound: '[в]', ex: 'вода', exRu: 'вода' },
  { cyr: 'Гг', lat: 'Gg', sound: '[г]', ex: 'град', exRu: 'город' },
  { cyr: 'Дд', lat: 'Dd', sound: '[д]', ex: 'дан', exRu: 'день' },
  {
    cyr: 'Ђђ',
    lat: 'Đđ',
    sound: 'мягкое [дь+жь]',
    isNew: true,
    ex: 'Ђердап',
    exRu: 'Джердап (ущелье на Дунае)',
    tip: 'Звонкая пара к ћ. Мягкий звук, язык прижат к нёбу, как в «дь» быстро переходящем в «жь».',
  },
  { cyr: 'Ее', lat: 'Ee', sound: '[э]', ex: 'Европа', exRu: 'Европа' },
  { cyr: 'Жж', lat: 'Žž', sound: '[ж]', ex: 'жаба', exRu: 'лягушка (не «жаба»!)' },
  { cyr: 'Зз', lat: 'Zz', sound: '[з]', ex: 'зуб', exRu: 'зуб' },
  { cyr: 'Ии', lat: 'Ii', sound: '[и]', ex: 'игра', exRu: 'игра' },
  {
    cyr: 'Јј',
    lat: 'Jj',
    sound: '[й]',
    isNew: true,
    ex: 'јабука',
    exRu: 'яблоко',
    tip: 'Заменяет русские й, я, ю, ё: ја = я, ју = ю, јо = ё.',
  },
  { cyr: 'Кк', lat: 'Kk', sound: '[к]', ex: 'кост', exRu: 'кость' },
  { cyr: 'Лл', lat: 'Ll', sound: '[л]', ex: 'лав', exRu: 'лев' },
  {
    cyr: 'Љљ',
    lat: 'Lj lj',
    sound: '[ль]',
    isNew: true,
    ex: 'љубав',
    exRu: 'любовь',
    tip: 'Одна буква = один мягкий звук. Склеена из л + ь.',
  },
  { cyr: 'Мм', lat: 'Mm', sound: '[м]', ex: 'мама', exRu: 'мама' },
  { cyr: 'Нн', lat: 'Nn', sound: '[н]', ex: 'нож', exRu: 'нож' },
  {
    cyr: 'Њњ',
    lat: 'Nj nj',
    sound: '[нь]',
    isNew: true,
    ex: 'коњ',
    exRu: 'конь',
    tip: 'Одна буква = один мягкий звук. Склеена из н + ь.',
  },
  { cyr: 'Оо', lat: 'Oo', sound: '[о]', ex: 'око', exRu: 'глаз' },
  { cyr: 'Пп', lat: 'Pp', sound: '[п]', ex: 'пас', exRu: 'собака' },
  { cyr: 'Рр', lat: 'Rr', sound: '[р]', ex: 'рука', exRu: 'рука' },
  { cyr: 'Сс', lat: 'Ss', sound: '[с]', ex: 'сунце', exRu: 'солнце' },
  { cyr: 'Тт', lat: 'Tt', sound: '[т]', ex: 'тата', exRu: 'папа' },
  {
    cyr: 'Ћћ',
    lat: 'Ćć',
    sound: 'мягкое [ч]',
    isNew: true,
    ex: 'кућа',
    exRu: 'дом',
    tip: 'Мягче русского «ч», почти «чь/ть». Твёрдая пара — ч.',
  },
  { cyr: 'Уу', lat: 'Uu', sound: '[у]', ex: 'улица', exRu: 'улица' },
  { cyr: 'Фф', lat: 'Ff', sound: '[ф]', ex: 'фосил', exRu: 'окаменелость' },
  { cyr: 'Хх', lat: 'Hh', sound: '[х]', ex: 'хлеб', exRu: 'хлеб' },
  { cyr: 'Цц', lat: 'Cc', sound: '[ц]', ex: 'цвет', exRu: 'цветок' },
  { cyr: 'Чч', lat: 'Čč', sound: 'твёрдое [ч]', ex: 'чај', exRu: 'чай', tip: 'Твёрже русского «ч». Мягкая пара — ћ.' },
  {
    cyr: 'Џџ',
    lat: 'Dž dž',
    sound: 'твёрдое [дж]',
    isNew: true,
    ex: 'џем',
    exRu: 'джем, варенье',
    tip: 'Один слитный звук, как в английском jam. Мягкая пара — ђ.',
  },
  { cyr: 'Шш', lat: 'Šš', sound: '[ш]', ex: 'шума', exRu: 'лес' },
]

export const NEW_LETTERS = ALPHABET.filter((l) => l.isNew)
