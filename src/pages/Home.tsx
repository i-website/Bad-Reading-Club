import styles from "./Home.module.scss";
import { Link } from "react-router-dom";
import type { ClubData as Data } from "../types";
import { Media } from "../components/Media";
import { isUpcomingMeeting } from "../lib/format";
import { MeetingCard } from "../features/meetings/MeetingCard";
import { HomeWidgets } from "../features/home-widgets/HomeWidgets";
import { MeetingDetails } from "../features/meetings/MeetingDetails";
export function Home({ data }: { data: Data }) {
  const upcoming =
    data.meetings
      .filter((m) => m.starts_at && isUpcomingMeeting(m))
      .sort((a, b) => a.starts_at!.localeCompare(b.starts_at!))[0] ||
    data.meetings.find((m) => !m.starts_at && isUpcomingMeeting(m));
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
            Читаем, обсуждаем, встречаемся.
          </p>
          <div className={styles["actions"]}>
            <Link className={styles["button"]} to="/plans">
              Планы клуба
            </Link>
          </div>
        </div>
        <div>
          {book && upcoming && (
            <div className={styles.mobileEvent}>
              <MeetingCard book={book} meeting={upcoming} />
            </div>
          )}
          <div
            className={`${styles.feature} ${book && upcoming ? styles.desktopFeature : ""}`}
          >
            {book ? (
              <>
                <Media
                  path={book.cover_path}
                  alt={`Обложка: ${book.title}`}
                  className={styles["feature-cover"]}
                />
                <div>
                  <span className={styles["tag"]}>
                    {upcoming?.starts_at
                      ? "Следующая встреча"
                      : "Встреча клуба"}
                  </span>
                  <h2>{book.title}</h2>
                  <p className={styles["author"]}>{book.author}</p>
                  <div className={styles["details"]}>
                    <MeetingDetails meeting={upcoming!} showHeading={false} />
                  </div>
                  <Link
                    className={styles["button"]}
                    to={`/meetings/${upcoming!.id}`}
                  >
                    Подробнее о встрече
                  </Link>
                </div>
              </>
            ) : (
              <p>
                Книга появится здесь, когда организатор добавит её в расписание
                клуба.
              </p>
            )}
          </div>
        </div>
      </section>
      <HomeWidgets books={data.books} meetings={data.meetings} />
    </>
  );
}
