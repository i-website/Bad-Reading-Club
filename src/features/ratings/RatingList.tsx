import { Link } from "react-router-dom";
import { Media } from "../../components/Media";
import type { RankedBook } from "./ranking";
import styles from "./RatingList.module.scss";
import { formatVotes } from "../../lib/format";
import { RatingValue } from "./RatingValue";

export function RatingList({ entries }: { entries: RankedBook[] }) {
  if (!entries.length)
    return <p className={styles.empty}>Рейтинг появится позже.</p>;
  return (
    <ol className={styles.ranking}>
      {entries.map(({ book, rating, votes, rank }) => (
        <li key={book.id}>
          <Link className={styles.row} to={`/books/${book.slug}`}>
            <span className={styles.position}>{rank ?? "—"}</span>
            <Media path={book.cover_path} alt="" className={styles.cover} />
            <span className={styles.book}>
              <strong>{book.title}</strong>
              <span>{book.author}</span>
            </span>
            <span className={styles.score}>
              {rating == null ? (
                "-"
              ) : (
                <>
                  <RatingValue value={rating} />
                  {votes != null && <small>{formatVotes(votes)}</small>}
                </>
              )}
            </span>
          </Link>
        </li>
      ))}
    </ol>
  );
}
