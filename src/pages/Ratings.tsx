import styles from "./Ratings.module.scss";
import { useState } from "react";
import { Link } from "react-router-dom";
import type { Book } from "../types";
import type { ClubData as Data } from "../types";
import { Media } from "../components/Media";
import { formatDate as date } from "../lib/format";
export function Ratings({ data }: { data: Data }) {
  const [sort, setSort] = useState<"rating" | "date" | "title">("rating");
  const latestMeeting = (id: string) =>
    data.meetings
      .filter((m) => m.book_id === id && m.starts_at)
      .map((m) => m.starts_at!)
      .sort()
      .at(-1) || null;
  const alphabetical = (a: Book, b: Book) =>
    a.title.localeCompare(b.title, "ru");
  const books = [...data.books].sort((a, b) => {
    if (sort === "title") return alphabetical(a, b);
    if (sort === "rating")
      return (
        (b.final_rating ?? -1) - (a.final_rating ?? -1) || alphabetical(a, b)
      );
    const aDate = latestMeeting(a.id),
      bDate = latestMeeting(b.id);
    return aDate && bDate
      ? bDate.localeCompare(aDate) || alphabetical(a, b)
      : aDate
        ? -1
        : bDate
          ? 1
          : alphabetical(a, b);
  });
  return (
    <section>
      <p className={styles["eyebrow"]}>Выбор клуба</p>
      <div className={styles["ratings-heading"]}>
        <div>
          <h1 className={styles["page-title"]}>Рейтинг книг</h1>
          <p className={styles["subtitle"]}>
            Итоговые оценки после голосования в Telegram
          </p>
        </div>
        <label>
          Сортировка
          <select
            value={sort}
            onChange={(e) =>
              setSort(e.target.value as "rating" | "date" | "title")
            }
          >
            <option value="rating">По оценке</option>
            <option value="date">По дате встречи</option>
            <option value="title">По алфавиту</option>
          </select>
        </label>
      </div>
      {books.length ? (
        <div className={styles["list"]}>
          {books.map((b, i) => (
            <Link
              className={[styles["row"], styles["rating-row"]].join(" ")}
              key={b.id}
              to={`/books/${b.slug}`}
            >
              <span className={styles["number"]}>
                {sort === "rating" && b.final_rating !== null ? i + 1 : "—"}
              </span>
              <Media path={b.cover_path} alt="" className={styles["thumb"]} />
              <div>
                <strong>{b.title}</strong>
                <p>{b.author}</p>
                {sort === "date" && (
                  <small>Встреча: {date(latestMeeting(b.id))}</small>
                )}
              </div>
              <span className={styles["score"]}>
                {b.final_rating === null
                  ? "Нет оценки"
                  : `★ ${Number(b.final_rating).toLocaleString("ru-RU")}`}
              </span>
              <span>›</span>
            </Link>
          ))}
        </div>
      ) : (
        <p className={styles["notice"]}>Книг пока нет.</p>
      )}
    </section>
  );
}
