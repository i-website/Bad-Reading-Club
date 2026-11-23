import styles from "./Home.module.scss";
import { Link } from "react-router-dom";
import type { ClubData as Data } from "../types";
import { Media } from "../components/Media";
import { formatDate as date, formatPrice } from "../lib/format";
export function Home({ data }: { data: Data }) {
  const upcoming = data.meetings
    .filter((m) => m.starts_at && new Date(m.starts_at).getTime() >= Date.now())
    .sort((a, b) => a.starts_at!.localeCompare(b.starts_at!))[0];
  const book =
    data.books.find((b) => b.id === upcoming?.book_id) ||
    data.books.find((b) => b.status === "reading") ||
    data.books.find((b) => b.status === "planned");
  return (
    <>
      <section className={styles["hero"]}>
        <div>
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
            <button
              className={styles["outline"]}
              onClick={() =>
                document
                  .getElementById("about")
                  ?.scrollIntoView({ behavior: "smooth" })
              }
            >
              О клубе
            </button>
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
                  {upcoming ? "Следующая встреча" : "Сейчас читаем"}
                </span>
                <h2>{book.title}</h2>
                <p>{book.author}</p>
                <div className={styles["details"]}>
                  <p>
                    <span>▦</span> {date(upcoming?.starts_at || null)}
                  </p>
                  <p>
                    <span>⌾</span> {upcoming?.place || "Место уточняется"}
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
      <section id="about" className={styles["about"]}>
        <p className={styles["eyebrow"]}>О клубе</p>
        <h2>
          Книги становятся ближе,
          <br />
          когда есть с кем обсудить.
        </h2>
        <p>{data.settings?.description || "Читаем, обсуждаем, встречаемся."}</p>
      </section>
    </>
  );
}
