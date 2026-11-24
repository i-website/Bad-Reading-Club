import styles from "./MeetingPage.module.scss";
import { Link, useParams } from "react-router-dom";
import type { ClubData as Data } from "../types";
import { Media } from "../components/Media";
import { isUpcomingMeeting } from "../lib/format";
import { MeetingDetails } from "../features/meetings/MeetingDetails";
export function MeetingPage({ data }: { data: Data }) {
  const { id } = useParams();
  const meeting = data.meetings.find((item) => item.id === id);
  const book = data.books.find((item) => item.id === meeting?.book_id);
  if (!meeting || !book || !isUpcomingMeeting(meeting))
    return (
      <section>
        <p>
          {meeting && !isUpcomingMeeting(meeting)
            ? "Эта встреча уже прошла."
            : "Встреча не найдена."}
        </p>
        <Link className={styles.back} to="/plans">
          К планам
        </Link>
      </section>
    );
  return (
    <section>
      <Link className={styles["back"]} to="/plans">
        ‹ К планам
      </Link>
      <div className={styles["book-hero"]}>
        <Link
          className={styles["cover-link"]}
          to={`/books/${book.slug}`}
          state={{ fromMeeting: meeting.id }}
          aria-label={`О книге «${book.title}»`}
        >
          <Media
            path={book.cover_path}
            alt={`Обложка: ${book.title}`}
            className={styles["book-cover"]}
          />
        </Link>
        <div>
          <h1 className={styles["page-title"]}>{book.title}</h1>
          <p className={styles["lead"]}>{book.author}</p>
          <Link
            className={styles["book-link"]}
            to={`/books/${book.slug}`}
            state={{ fromMeeting: meeting.id }}
          >
            Подробнее о книге →
          </Link>
        </div>
        <aside>
          <MeetingDetails meeting={meeting} showNotes />
        </aside>
      </div>
    </section>
  );
}
