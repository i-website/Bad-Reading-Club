import styles from "./Plans.module.scss";
import { Link } from "react-router-dom";
import { type Book, type Meeting } from "../types";
import type { ClubData as Data } from "../types";
import { Media } from "../components/Media";
import { formatDate as date } from "../lib/format";
import { formatPrice } from "../lib/format";
export function Plans({ data }: { data: Data }) {
  const items = data.books
    .map((b) => ({
      b,
      m: data.meetings
        .filter((m) => m.book_id === b.id)
        .sort((a, b) =>
          (a.starts_at || "9999").localeCompare(b.starts_at || "9999"),
        ),
    }))
    .flatMap<{ b: Book; m: Meeting | null }>(({ b, m }) =>
      m.length ? m.map((x) => ({ b, m: x })) : [{ b, m: null }],
    )
    .sort((a, b) =>
      (a.m?.starts_at || "9999").localeCompare(b.m?.starts_at || "9999"),
    );
  return (
    <section>
      <p className={styles["eyebrow"]}>Встречи и книги</p>
      <h1 className={styles["page-title"]}>Планы клуба</h1>
      <p className={styles["subtitle"]}>Что и когда мы читаем</p>
      {items.length ? (
        <div className={styles["list"]}>
          {items.map(({ b, m }) => (
            <Link
              className={styles["row"]}
              key={m?.id || b.id}
              to={`/books/${b.slug}`}
            >
              <Media path={b.cover_path} alt="" className={styles["thumb"]} />
              <div>
                <strong>{b.title}</strong>
                <p>{b.author}</p>
              </div>
              <div className={styles["row-meta"]}>
                <span>{date(m?.starts_at || null)}</span>
                {m?.price != null && (
                  <small>Стоимость: {formatPrice(m.price)}</small>
                )}
              </div>
              <span aria-hidden="true">›</span>
            </Link>
          ))}
        </div>
      ) : (
        <p className={styles["notice"]}>Планы пока не добавлены.</p>
      )}
    </section>
  );
}
