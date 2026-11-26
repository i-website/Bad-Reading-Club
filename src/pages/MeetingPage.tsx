import styles from "./MeetingPage.module.scss";
import { Link, useParams } from "react-router-dom";
import type { ClubData as Data } from "../types";
import { isUpcomingMeeting } from "../lib/format";
import { MeetingCard } from "../features/meetings/MeetingCard";

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
    <section className={styles.page}>
      <Link className={styles.back} to="/plans">
        ‹ К планам
      </Link>
      <MeetingCard book={book} meeting={meeting} detail />
    </section>
  );
}
