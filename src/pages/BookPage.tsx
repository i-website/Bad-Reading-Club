import styles from "./BookPage.module.scss";
import { Link, useParams } from "react-router-dom";
import type { ClubData as Data } from "../types";
import { statuses } from "../types";
import { Media } from "../components/Media";
import { formatDate as date, formatPrice } from "../lib/format";
export function BookPage({ data }: { data: Data }) {
  const { slug } = useParams();
  const book = data.books.find((b) => b.slug === slug);
  if (!book)
    return (
      <section>
        <p>Книга не найдена.</p>
        <Link to="/plans">К планам</Link>
      </section>
    );
  const meetings = data.meetings.filter((m) => m.book_id === book.id);
  const photos = data.photos
    .filter((p) => meetings.some((m) => m.id === p.meeting_id))
    .sort((a, b) => a.sort_order - b.sort_order);
  return (
    <section>
      <Link className={styles["back"]} to="/plans">
        ‹ &nbsp; К планам
      </Link>
      <div className={styles["book-hero"]}>
        <Media
          path={book.cover_path}
          alt={`Обложка: ${book.title}`}
          className={styles["book-cover"]}
        />
        <div>
          <span className={styles["tag"]}>{statuses[book.status]}</span>
          <h1 className={styles["page-title"]}>{book.title}</h1>
          <p className={styles["lead"]}>{book.author}</p>
          <p className={styles["prose"]}>
            {book.description || "Описание книги пока не добавлено."}
          </p>
        </div>
        <aside>
          <h3>Встреча</h3>
          {meetings.length ? (
            meetings.map((m) => (
              <div key={m.id}>
                <p>▦ &nbsp; {date(m.starts_at)}</p>
                <p>⌾ &nbsp; {m.place || "Место уточняется"}</p>
                {m.price != null && <p>Стоимость: {formatPrice(m.price)}</p>}
                <p>{m.notes}</p>
              </div>
            ))
          ) : (
            <p>Дата и место уточняются.</p>
          )}
        </aside>
      </div>
      <div className={styles["sections"]}>
        <div>
          <h2>Фотографии со встречи</h2>
          {photos.length ? (
            <div className={styles["gallery"]}>
              {photos.map((p) => (
                <figure key={p.id}>
                  <Media
                    path={p.storage_path}
                    alt={p.caption || "Фото со встречи"}
                  />
                  {p.caption && <figcaption>{p.caption}</figcaption>}
                </figure>
              ))}
            </div>
          ) : (
            <p>Фотографий пока нет.</p>
          )}
        </div>
      </div>
    </section>
  );
}
