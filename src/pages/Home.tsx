import styles from "./Home.module.scss";
import { Link } from "react-router-dom";
import type { ClubData as Data } from "../types";
import { Media } from "../components/Media";
import { formatDate as date, formatPrice } from "../lib/format";
import { HomeWidgets } from "../features/home-widgets/HomeWidgets";
import { PlaceLink } from "../components/PlaceLink";
export function Home({ data }: { data: Data }) {
  const upcoming =
    data.meetings
      .filter(
        (m) => m.starts_at && new Date(m.starts_at).getTime() >= Date.now(),
      )
      .sort((a, b) => a.starts_at!.localeCompare(b.starts_at!))[0] ||
    data.meetings.find((m) => !m.starts_at);
  const book = data.books.find((b) => b.id === upcoming?.book_id);
  return (
    <>
      <section className={styles["hero"]}>
        <div className={styles["intro"]}>
          <p className={styles["eyebrow"]}>Книжный клуб</p>
          <h1>
            BAD
            <br />
            READING
            <br />
            CLUB
          </h1>
          <p className={styles["lead"]}>
            {data.settings?.description || "Читаем, обсуждаем, встречаемся."}
          </p>
          <div className={styles["actions"]}>
            <Link className={styles["button"]} to="/plans">
              Планы клуба
            </Link>
          </div>
        </div>
        <div className={styles["feature"]}>
          {book ? (
            <>
              <Media
                path={book.cover_path}
                alt={`Обложка: ${book.title}`}
                className={styles["feature-cover"]}
              />
              <div>
                <span className={styles["tag"]}>
                  {upcoming?.starts_at ? "Следующая встреча" : "Встреча клуба"}
                </span>
                <h2>{book.title}</h2>
                <p>{book.author}</p>
                <div className={styles["details"]}>
                  <p>
                    <span>▦</span> {date(upcoming?.starts_at || null)}
                  </p>
                  <p>
                    <span>⌾</span>{" "}
                    <PlaceLink
                      place={upcoming?.place}
                      url={upcoming?.place_url}
                    />
                  </p>
                  {upcoming?.price != null && (
                    <p>
                      <span>₽</span> {formatPrice(upcoming.price)}
                    </p>
                  )}
                  <p>
                    <span>▤</span> Обсуждаем книгу
                  </p>
                </div>
                <Link className={styles["button"]} to={`/books/${book.slug}`}>
                  Подробнее о книге
                </Link>
              </div>
            </>
          ) : (
            <p>
              Книга появится здесь, когда организатор добавит её в планы клуба.
            </p>
          )}
        </div>
      </section>
      <HomeWidgets books={data.books} meetings={data.meetings} />
    </>
  );
}
