-- Attach bundled covers to matching books that do not already have a cover.
with covers(title, author, cover_path) as (values
  ('Вино из одуванчиков', 'Рэй Брэдбери', 'book-covers/club-past-1.jpg'),
  ('Желтая стрела', 'Виктор Пелевин', 'book-covers/club-past-2.jpg'),
  ('Вечера на хуторе близ Диканьки', 'Н. В. Гоголь', 'book-covers/club-past-3.jpg'),
  ('Маленькие женщины', 'Луиза Мэй Олкот', 'book-covers/club-past-4.jpg'),
  ('Если все кошки в мире исчезнут', 'Гэнки Кавамура', 'book-covers/club-past-5.jpg'),
  ('Блеск и нищета куртизанок', 'О. Бальзак', 'book-covers/club-past-6.jpg'),
  ('Снега Килиманджаро', 'Э. Хэмингуэй', 'book-covers/club-past-7.jpg'),
  ('Игрок', 'Ф. М. Достоевский', 'book-covers/club-past-8.jpg'),
  ('Бойня №5', 'Курт Воннегут', 'book-covers/club-past-9.jpg'),
  ('Бойцовский клуб', 'Чак Паланик', 'book-covers/club-past-10.jpg'),
  ('Степной волк', 'Герман Гессе', 'book-covers/club-past-11.jpg'),
  ('Старик и море', 'Э. Хэмингуэй', 'book-covers/club-past-12.jpg'),
  ('Мартин Иден', 'Джек Лондон', 'book-covers/club-past-13.jpg'),
  ('Невыносимая легкость бытия', 'Милан Кундера', 'book-covers/club-past-14.jpg'),
  ('Норвежский лес', 'Харуки Мураками', 'book-covers/club-past-15.jpg'),
  ('Герой нашего времени', 'М. Ю. Лермонтов', 'book-covers/club-past-16.jpg'),
  ('Униженные и оскорбленные', 'Ф. М. Достоевский', 'book-covers/club-past-17.jpg'),
  ('Проект Аве Мария', 'Энди Вейер', 'book-covers/club-past-18.jpg'),
  ('Скорбь Сатаны', 'Мария Коррели', 'book-covers/club-past-19.jpg'),
  ('Триумфальная арка', 'Эрих Мария Ремарк', 'book-covers/club-past-20.jpg'),
  ('Скотный двор', 'Джордж Оруэлл', 'book-covers/club-past-21.jpg'),
  ('Сиддхартха', 'Герман Гессе', 'book-covers/club-past-22.jpg'),
  ('Пикник на обочине', 'А/Б Стругацкие', 'book-covers/club-past-23.jpg'),
  ('Поющие в терновнике', 'Колин Маккалоу', 'book-covers/club-past-24.jpg'),
  ('1984', 'Джордж Оруэлл', 'book-covers/club-past-25.jpg'),
  ('Гроздья гнева', 'Д. Стейнбек', 'book-covers/club-past-26.jpg'),
  ('12 стульев', 'И. Ильф, Е. Петров', 'book-covers/club-past-27.jpg'),
  ('Белый Клык', 'Джек Лондон', 'book-covers/winter-white-fang.jpg'),
  ('К востоку от Эдема', 'Джон Стейнбек', 'book-covers/demo-book-1.jpg'),
  ('Дым', 'Иван Тургенев', 'book-covers/winter-smoke.jpg'),
  ('Сто лет одиночества', 'Габриэль Гарсиа Маркес', 'book-covers/winter-one-hundred-years.jpg')
)
update public.books as book
set cover_path = covers.cover_path
from covers
where book.cover_path is null
  and lower(trim(book.title)) = lower(trim(covers.title))
  and lower(trim(book.author)) = lower(trim(covers.author));
