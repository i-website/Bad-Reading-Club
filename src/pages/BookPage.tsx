import styles from "./BookPage.module.scss";
import { Link, useParams } from "react-router-dom";
import type { ClubData } from "../types";
import { demoMode } from "../lib/supabase";
import { demoBookRanking } from "../lib/demo";
import { Media } from "../components/Media";
import { formatVotes, isUpcomingMeeting } from "../lib/format";
import { RatingValue } from "../features/ratings/RatingValue";

export function BookPage({ data }: { data: ClubData }) {
  const { slug } = useParams();
  const book = data.books.find((item) => item.slug === slug);
  if (!book)
    return (
      <section>
        <p>Книга не найдена.</p>
        <Link to="/ratings">К рейтингу</Link>
      </section>
    );
  const rating = demoMode
    ? demoBookRanking.find((item) => item.bookId === book.id)
    : undefined;
  const meetings = data.meetings.filter(
    (meeting) => meeting.book_id === book.id && isUpcomingMeeting(meeting),
  );
  return (
    <section>
      <Link className={styles.back} to="/ratings">
        ‹ &nbsp; К рейтингу
      </Link>
      <div className={styles["book-hero"]}>
        <Media
          path={book.cover_path}
          alt={`Обложка: ${book.title}`}
          className={styles["book-cover"]}
        />
        <div>
          <h1 className={styles["page-title"]}>{book.title}</h1>
          <p className={styles.lead}>{book.author}</p>
          {rating?.rating != null && (
            <p className={styles.rating}>
              <RatingValue value={rating.rating} />
              {rating.votes != null && ` · ${formatVotes(rating.votes)}`}
            </p>
          )}
          {rating && rating.rating == null && <p>Не голосовали</p>}
          <p className={styles.prose}>
            {book.description || "Описание книги пока не добавлено."}
          </p>
          {meetings.map((meeting) => (
            <p key={meeting.id}>
              <Link
                className={styles.meetingLink}
                to={`/meetings/${meeting.id}`}
              >
                Подробнее о встрече
              </Link>
            </p>
          ))}
        </div>
      </div>
    </section>
  );
}
