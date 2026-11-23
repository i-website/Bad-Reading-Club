// Data transcribed from the club's table. Null means that no vote was held.
export const pastBooks = [
  {
    title: "Вино из одуванчиков",
    author: "Рэй Брэдбери",
    votes: null,
    rating: null,
  },
  {
    title: "Желтая стрела",
    author: "Виктор Пелевин",
    votes: null,
    rating: null,
  },
  {
    title: "Вечера на хуторе близ Диканьки",
    author: "Н. В. Гоголь",
    votes: null,
    rating: null,
  },
  {
    title: "Маленькие женщины",
    author: "Луиза Мэй Олкот",
    votes: null,
    rating: null,
  },
  {
    title: "Если все кошки в мире исчезнут",
    author: "Гэнки Кавамура",
    votes: 26,
    rating: 5,
  },
  {
    title: "Блеск и нищета куртизанок",
    author: "О. Бальзак",
    votes: 8,
    rating: 5.75,
  },
  {
    title: "Снега Килиманджаро",
    author: "Э. Хэмингуэй",
    votes: 16,
    rating: 6.19,
  },
  { title: "Игрок", author: "Ф. М. Достоевский", votes: 21, rating: 6.8 },
  { title: "Бойня №5", author: "Курт Воннегут", votes: 18, rating: 6.83 },
  { title: "Бойцовский клуб", author: "Чак Паланик", votes: 22, rating: 6.95 },
  { title: "Степной волк", author: "Герман Гессе", votes: 19, rating: 7.21 },
  { title: "Старик и море", author: "Э. Хэмингуэй", votes: 23, rating: 7.26 },
  { title: "Мартин Иден", author: "Джек Лондон", votes: 17, rating: 7.47 },
  {
    title: "Невыносимая легкость бытия",
    author: "Милан Кундера",
    votes: 16,
    rating: 7.68,
  },
  {
    title: "Норвежский лес",
    author: "Харуки Мураками",
    votes: 22,
    rating: 7.81,
  },
  {
    title: "Герой нашего времени",
    author: "М. Ю. Лермонтов",
    votes: 20,
    rating: 8.05,
  },
  {
    title: "Униженные и оскорбленные",
    author: "Ф. М. Достоевский",
    votes: 20,
    rating: 8.15,
  },
  { title: "Проект Аве Мария", author: "Энди Вейер", votes: 19, rating: 8.16 },
  { title: "Скорбь Сатаны", author: "Мария Коррели", votes: 15, rating: 8.2 },
  {
    title: "Триумфальная арка",
    author: "Эрих Мария Ремарк",
    votes: 20,
    rating: 8.2,
  },
  { title: "Скотный двор", author: "Джордж Оруэлл", votes: 20, rating: 8.2 },
  { title: "Сиддхартха", author: "Герман Гессе", votes: 24, rating: 8.25 },
  {
    title: "Пикник на обочине",
    author: "А/Б Стругацкие",
    votes: 24,
    rating: 8.25,
  },
  {
    title: "Поющие в терновнике",
    author: "Колин Маккалоу",
    votes: 29,
    rating: 8.31,
  },
  { title: "1984", author: "Джордж Оруэлл", votes: 20, rating: 8.4 },
  { title: "Гроздья гнева", author: "Д. Стейнбек", votes: 12, rating: 8.58 },
  {
    title: "12 стульев",
    author: "И. Ильф, Е. Петров",
    votes: 23,
    rating: 9.04,
  },
].map((book, index) => ({
  ...book,
  bookId: `club-past-${index + 1}`,
  slug: `club-book-${index + 1}`,
}));

export const winterMeetings = [
  {
    bookId: "winter-white-fang",
    slug: "white-fang",
    title: "Белый Клык",
    author: "Джек Лондон",
    date: "2026-12-13",
    description:
      "История о выживании, жестокости и доверии среди северных пейзажей.",
  },
  {
    bookId: "demo-book-1",
    slug: "east-of-eden",
    title: "К востоку от Эдема",
    author: "Джон Стейнбек",
    date: "2027-01-10",
    description:
      "Семейный роман о добре и зле, отношениях между поколениями и свободе выбора.",
  },
  {
    bookId: "winter-smoke",
    slug: "smoke-turgenev",
    title: "Дым",
    author: "Иван Тургенев",
    date: "2027-01-31",
    description:
      "Камерный роман о любви, обществе и человеческих заблуждениях.",
  },
  {
    bookId: "winter-one-hundred-years",
    slug: "one-hundred-years-of-solitude",
    title: "Сто лет одиночества",
    author: "Габриэль Гарсиа Маркес",
    date: "2027-02-21",
    description: "",
  },
];
