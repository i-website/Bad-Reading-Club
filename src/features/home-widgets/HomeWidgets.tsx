import { Link } from "react-router-dom";
import type { Book, Meeting } from "../../types";
import { formatDate } from "../../lib/format";
import { Media } from "../../components/Media";
import styles from "./HomeWidgets.module.scss";

type Props = { books: Book[]; meetings: Meeting[] };

export function HomeWidgets({ books, meetings }: Props) {
  const now = Date.now();
  const upcoming = meetings
    .filter(
      (meeting) =>
        !meeting.starts_at || new Date(meeting.starts_at).getTime() >= now,
    )
    .filter((meeting) => books.some((book) => book.id === meeting.book_id))
    .sort((a, b) =>
      (a.starts_at || "9999").localeCompare(b.starts_at || "9999"),
    )
    .slice(0, 4);

  return (
    <section className={styles.widgets} aria-label="Книги и встречи клуба">
      <article className={styles.widget}>
        <p className={styles.eyebrow}>Книжный клуб</p>
        <h2>Рейтинг книг</h2>
        <p className={styles.empty}>Рейтинг появится позже.</p>
      </article>
      <article className={styles.widget}>
        <div className={styles.heading}>
          <div>
            <p className={styles.eyebrow}>Что читаем дальше</p>
            <h2>План встреч</h2>
          </div>
          <Link className={styles.all} to="/plans">
            Все встречи
          </Link>
        </div>
        {upcoming.length ? (
          <div className={styles.list}>
            {upcoming.map((meeting) => {
              const book = books.find((item) => item.id === meeting.book_id)!;
              return (
                <Link
                  className={styles.row}
                  to={`/books/${book.slug}`}
                  key={meeting.id}
                >
                  <Media
                    path={book.cover_path}
                    alt=""
                    className={styles.cover}
                  />
                  <span className={styles.book}>
                    <strong>{book.title}</strong>
                    <span>{book.author}</span>
                  </span>
                  <span className={styles.date}>
                    {formatDate(meeting.starts_at)}
                  </span>
                </Link>
              );
            })}
          </div>
        ) : (
          <p className={styles.empty}>
            Ближайшие встречи пока не запланированы.
          </p>
        )}
      </article>
    </section>
  );
}
