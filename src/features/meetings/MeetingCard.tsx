import { Link } from "react-router-dom";
import type { Book, Meeting } from "../../types";
import { Media } from "../../components/Media";
import { PlaceLink } from "../../components/PlaceLink";
import { formatPrice, formatWeekday, isDateOnly } from "../../lib/format";
import styles from "./MeetingCard.module.scss";

export function MeetingCard({
  book,
  meeting,
  past = false,
  detail = false,
}: {
  book: Book;
  meeting?: Meeting | null;
  past?: boolean;
  detail?: boolean;
}) {
  const startsAt = meeting?.starts_at;
  const parsed = startsAt
    ? new Date(isDateOnly(startsAt) ? `${startsAt}T00:00:00` : startsAt)
    : null;
  const date = parsed && !Number.isNaN(parsed.getTime()) ? parsed : null;
  const when = (
    <>
      {date && startsAt ? (
        <>
          <strong>
            {new Intl.DateTimeFormat("ru-RU", {
              day: "2-digit",
              month: "2-digit",
            }).format(date)}
          </strong>
          <span>
            {formatWeekday(startsAt)}
            {!isDateOnly(startsAt) &&
              ` · ${new Intl.DateTimeFormat("ru-RU", { hour: "2-digit", minute: "2-digit" }).format(date)}`}
          </span>
        </>
      ) : (
        <strong>Дата уточняется</strong>
      )}
    </>
  );
  return (
    <article className={styles.card}>
      <p className={styles.label}>
        {past ? "Прошедшая встреча" : "Встреча клуба"}
      </p>
      <div className={styles.book}>
        <Media
          path={book.cover_path}
          alt={`Обложка: ${book.title}`}
          className={styles.cover}
        />
        <div>
          {detail ? <h1>{book.title}</h1> : <h3>{book.title}</h3>}
          <p>{book.author}</p>
          <Link
            className={styles.bookLink}
            to={`/books/${book.id}`}
            state={meeting ? { fromMeeting: meeting.id } : undefined}
          >
            О книге →
          </Link>
        </div>
      </div>
      <div className={styles.details}>
        {meeting && !past && !detail ? (
          <Link
            className={styles.when}
            to={`/meetings/${meeting.id}`}
            aria-label={`Подробнее о встрече: ${book.title}`}
          >
            {when}
          </Link>
        ) : (
          <div className={styles.when}>{when}</div>
        )}
        <div className={styles.place}>
          <span>Место встречи</span>
          <PlaceLink place={meeting?.place} url={meeting?.place_url} />
          {meeting?.price != null && (
            <small>Стоимость: {formatPrice(meeting.price)}</small>
          )}
        </div>
      </div>
      {detail && meeting?.notes && (
        <p className={styles.notes}>{meeting.notes}</p>
      )}
    </article>
  );
}
