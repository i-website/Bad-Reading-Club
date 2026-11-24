import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { memberFetch } from "../../lib/memberApi";
import { useRatings } from "./useRatings";
import styles from "./BookRating.module.scss";

export function BookRating({
  bookId,
  onSaved,
  editing,
  onEdit,
  onCancel,
  onEligibilityChange,
}: {
  bookId: string;
  onSaved: () => Promise<void>;
  editing: boolean;
  onEdit: () => void;
  onCancel: () => void;
  onEligibilityChange: (eligible: boolean) => void;
}) {
  const { data, loading, error, rate } = useRatings();
  const [selected, setSelected] = useState("");
  const [review, setReview] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [saveError, setSaveError] = useState("");
  const [eligible, setEligible] = useState<boolean | null>(null);
  const [eligibilityError, setEligibilityError] = useState("");
  const editorRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const controller = new AbortController();
    setSelected("");
    setReview("");
    setEligible(null);
    setEligibilityError("");
    memberFetch(
      `/api/auth.php?action=rating-eligibility&bookId=${encodeURIComponent(bookId)}`,
      { signal: controller.signal },
    )
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok)
          throw new Error(result.error || "Не удалось проверить дату встречи.");
        setEligible(result.eligible === true);
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted)
          setEligibilityError(
            error instanceof Error
              ? error.message
              : "Не удалось проверить дату встречи.",
          );
      });
    return () => controller.abort();
  }, [bookId]);
  const mine = data?.mine.find((item) => item.book_id === bookId);
  useEffect(() => {
    onEligibilityChange(eligible === true);
  }, [eligible, onEligibilityChange]);
  useEffect(() => {
    if (editing && mine && eligible) {
      setSelected(String(mine.score));
      setReview(mine.review ?? "");
      setMessage("");
      editorRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [editing, mine?.score, mine?.review, eligible]);
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!eligible) return;
    setBusy(true);
    setMessage("");
    setSaveError("");
    try {
      await rate(bookId, Number(selected), review);
      await onSaved();
      setMessage("Оценка сохранена.");
      setSelected("");
    } catch (e) {
      setSaveError(
        e instanceof Error ? e.message : "Не удалось сохранить оценку.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function submitReview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!eligible || !mine || !review.trim()) return;
    setBusy(true);
    setSaveError("");
    setMessage("");
    try {
      await rate(bookId, Number(mine.score), review);
      await onSaved();
      setReview("");
    } catch (e) {
      setSaveError(
        e instanceof Error ? e.message : "Не удалось сохранить отзыв.",
      );
    } finally {
      setBusy(false);
    }
  }
  if (mine?.review && !editing) return null;
  return (
    <div className={styles.wrapper}>
      <div ref={editorRef} className={styles.rating}>
        <h2>Ваша оценка{mine && !editing ? `: ${mine.score} / 10` : ""}</h2>
        {loading && <p>Загружаем…</p>}
        {error && <p role="alert">{error}</p>}
        {eligibilityError && <p role="alert">{eligibilityError}</p>}
        {eligible === null && !eligibilityError && (
          <p>Проверяем дату встречи…</p>
        )}
        {eligible === false && (
          <p>Оценить книгу можно на следующий день после встречи.</p>
        )}
        {eligible === false && mine && (
          <p>Ваша сохранённая оценка: {mine.score} из 10.</p>
        )}
        {eligible === true && data && !data.signedIn && (
          <p>
            <Link to="/account">Войдите в аккаунт</Link>, чтобы оценить книгу.
          </p>
        )}
        {eligible === true && data?.signedIn && mine && !editing && (
          <div className={styles.savedRating}>
            <button
              type="button"
              className={styles.editReview}
              onClick={onEdit}
            >
              Изменить
            </button>
            <form
              className={styles.reviewOnly}
              onSubmit={(event) => void submitReview(event)}
            >
              <label className={styles.reviewLabel}>
                Оставить отзыв
                <textarea
                  value={review}
                  maxLength={2000}
                  onChange={(event) => setReview(event.target.value)}
                  placeholder="Поделитесь впечатлениями о книге"
                />
              </label>
              <button
                className={styles.submit}
                type="submit"
                disabled={busy || !review.trim()}
              >
                {busy ? "Сохраняем…" : "Опубликовать отзыв"}
              </button>
              {saveError && <p role="alert">{saveError}</p>}
            </form>
          </div>
        )}
        {eligible === true && data?.signedIn && (!mine || editing) && (
          <>
            <p className={styles.prompt}>
              {mine
                ? `Ваша оценка: ${mine.score} из 10. Можно её изменить.`
                : "Как вам эта книга?"}
            </p>
            <form onSubmit={(event) => void submit(event)}>
              <fieldset className={styles.scores}>
                <legend className={styles.visuallyHidden}>
                  Оценка от 1 до 10
                </legend>
                {Array.from({ length: 10 }, (_, index) => {
                  const score = String(index + 1);
                  return (
                    <label key={score} className={styles.score}>
                      <input
                        type="radio"
                        name="book-score"
                        value={score}
                        checked={
                          (selected || String(mine?.score ?? "")) === score
                        }
                        onChange={() => {
                          if (!selected) setReview(mine?.review ?? "");
                          setSelected(score);
                          setMessage("");
                        }}
                      />
                      <span>{score}</span>
                    </label>
                  );
                })}
              </fieldset>
              <div className={styles.scale}>
                <span>Не понравилась</span>
                <span>Великолепно</span>
              </div>
              {selected && (
                <label className={styles.reviewLabel}>
                  Отзыв <span>необязательно</span>
                  <textarea
                    value={review}
                    maxLength={2000}
                    onChange={(event) => setReview(event.target.value)}
                    placeholder="Поделитесь впечатлениями о книге"
                  />
                </label>
              )}
              <button
                className={styles.submit}
                type="submit"
                disabled={busy || !selected}
              >
                {busy
                  ? "Сохраняем…"
                  : mine
                    ? "Изменить оценку"
                    : "Поставить оценку"}
              </button>
              {editing && (
                <button
                  type="button"
                  className={styles.cancel}
                  disabled={busy}
                  onClick={() => {
                    setSelected("");
                    setReview("");
                    setSaveError("");
                    onCancel();
                  }}
                >
                  Отмена
                </button>
              )}
            </form>
            {saveError && <p role="alert">{saveError}</p>}
            {message && <p role="status">{message}</p>}
          </>
        )}
      </div>
    </div>
  );
}
