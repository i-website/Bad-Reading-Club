import { useEffect, useState } from "react";
import { Star } from "lucide-react";
import { memberFetch } from "../../lib/memberApi";
import {
  AvatarPreview,
  defaultAvatar,
  type Avatar,
} from "../avatar/AvatarEditor";
import styles from "./BookReviews.module.scss";

type Review = {
  name: string;
  avatar: Avatar | null;
  score: number | string;
  review: string;
  is_mine: boolean;
};

export function BookReviews({
  bookId,
  revision,
  canEdit,
  onEdit,
}: {
  bookId: string;
  revision: number;
  canEdit: boolean;
  onEdit: () => void;
}) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    memberFetch(
      `/api/auth.php?action=reviews&bookId=${encodeURIComponent(bookId)}`,
      {
        signal: controller.signal,
      },
    )
      .then(async (response) => {
        if (!response.ok) throw new Error("Не удалось загрузить отзывы.");
        return response.json() as Promise<{ reviews: Review[] }>;
      })
      .then((result) => setReviews(result.reviews))
      .catch((reason: unknown) => {
        if (!controller.signal.aborted)
          setError(
            reason instanceof Error
              ? reason.message
              : "Не удалось загрузить отзывы.",
          );
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [bookId, revision]);
  return (
    <section className={styles.reviews} aria-labelledby="book-reviews-title">
      <h2 id="book-reviews-title">Отзывы</h2>
      {loading && <p>Загружаем отзывы…</p>}
      {error && <p role="alert">{error}</p>}
      {!loading && !error && reviews.length === 0 && (
        <p className={styles.empty}>Отзывов пока нет.</p>
      )}
      {!loading && !error && reviews.length > 0 && (
        <ul className={styles.list}>
          {reviews.map((review, index) => (
            <li className={styles.item} key={index}>
              <div className={styles.avatar}>
                <AvatarPreview value={review.avatar ?? defaultAvatar} />
              </div>
              <div className={styles.content}>
                <div className={styles.heading}>
                  <strong>{review.name}</strong>
                  <span>
                    <Star size={16} aria-hidden="true" /> {review.score} / 10
                  </span>
                </div>
                <p>{review.review}</p>
                {review.is_mine && canEdit && (
                  <button
                    type="button"
                    className={styles.edit}
                    onClick={onEdit}
                  >
                    Редактировать
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
