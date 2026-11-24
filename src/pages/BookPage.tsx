import styles from "./BookPage.module.scss";
import { Link, useLocation, useParams } from "react-router-dom";
import type { ClubData } from "../types";
import { demoMode } from "../lib/supabase";
import { demoBookRanking } from "../lib/demo";
import { Media } from "../components/Media";
import { formatVotes, isUpcomingMeeting } from "../lib/format";
import { Star } from "lucide-react";
import { useEffect, useState } from "react";
import { BookRating } from "../features/ratings/BookRating";
import { BookReviews } from "../features/ratings/BookReviews";
import { useRatings } from "../features/ratings/useRatings";
import { combineRatings } from "../features/ratings/ranking";

export function BookPage({ data }: { data: ClubData }) {
  const { slug } = useParams();
  const location = useLocation();
  const ratings = useRatings();
  const [reviewsRevision, setReviewsRevision] = useState(0);
  const [editingRating, setEditingRating] = useState(false);
  const [ratingEligible, setRatingEligible] = useState(false);
  useEffect(() => {
    setEditingRating(false);
    setRatingEligible(false);
  }, [slug]);
  const book = data.books.find((item) => item.slug === slug);
  if (!book)
    return (
      <section>
        <p>Книга не найдена.</p>
        <Link className={styles.back} to="/ratings">
          К рейтингу
        </Link>
      </section>
    );
  const baseline = demoMode
    ? demoBookRanking.find((item) => item.bookId === book.id)
    : undefined;
  const rating = ratings.data
    ? combineRatings(data.books, ratings.data.ratings).find(
        (item) => item.book.id === book.id,
      )
    : baseline;
  const meetings = data.meetings.filter(
    (meeting) => meeting.book_id === book.id && isUpcomingMeeting(meeting),
  );
  const fromMeeting = meetings.find(
    (meeting) => meeting.id === location.state?.fromMeeting,
  );
  return (
    <section>
      <Link
        className={styles.back}
        to={fromMeeting ? `/meetings/${fromMeeting.id}` : "/ratings"}
      >
        ‹ {fromMeeting ? "К встрече" : "К рейтингу"}
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
            <div className={styles.rating}>
              <p>
                <Star size={20} aria-hidden="true" />{" "}
                <strong>
                  {rating.rating.toLocaleString("ru-RU", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </strong>{" "}
                <span>/ 10</span>
              </p>
              {rating.votes != null && (
                <small>{formatVotes(rating.votes)}</small>
              )}
            </div>
          )}
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
      <div className={styles.about}>
        <h2>О книге</h2>
        <p
          className={book.description ? styles.prose : styles.emptyDescription}
        >
          {book.description || "Описание книги пока не добавлено."}
        </p>
      </div>
      <BookRating
        bookId={book.id}
        editing={editingRating}
        onEdit={() => setEditingRating(true)}
        onCancel={() => setEditingRating(false)}
        onEligibilityChange={setRatingEligible}
        onSaved={async () => {
          await ratings.refresh();
          setReviewsRevision((value) => value + 1);
          setEditingRating(false);
        }}
      />
      <BookReviews
        bookId={book.id}
        revision={reviewsRevision}
        canEdit={ratingEligible}
        onEdit={() => setEditingRating(true)}
      />
    </section>
  );
}
