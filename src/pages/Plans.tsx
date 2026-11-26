import styles from "./Plans.module.scss";
import { useState } from "react";
import { Link } from "react-router-dom";
import type { ClubData as Data } from "../types";
import { Media } from "../components/Media";
import { formatDate as date, isUpcomingMeeting } from "../lib/format";
import { formatPrice } from "../lib/format";
import { buildSchedule } from "../lib/schedule";
export function Plans({ data }: { data: Data }) {
  const [showPast, setShowPast] = useState(false);
  const now = Date.now();
  const { items, nextMeetingId } = buildSchedule(data, showPast, now);
  return (
    <section>
      <p className={styles["eyebrow"]}>Встречи и книги</p>
      <h1 className={styles["page-title"]}>Встречи клуба</h1>
      <button
        type="button"
        className={styles.toggle}
        aria-pressed={showPast}
        onClick={() => setShowPast((value) => !value)}
      >
        {showPast ? "Скрыть прошедшие" : "Показать прошедшие"}
      </button>
      {items.length ? (
        <div className={styles["list"]}>
          {items.map(({ b, m }) => {
            const past = !!m && !isUpcomingMeeting(m, now);
            const next = !!m && m.id === nextMeetingId;
            const className = [
              styles.row,
              past ? styles.past : styles.available,
              next ? styles.next : "",
            ]
              .filter(Boolean)
              .join(" ");
            const content = (
              <>
                <Media path={b.cover_path} alt="" className={styles["thumb"]} />
                <div className={styles.book}>
                  {next && (
                    <span className={styles.badge}>Следующая встреча</span>
                  )}
                  <strong>{b.title}</strong>
                  <p>{b.author}</p>
                </div>
                <div className={styles["row-meta"]}>
                  {!past && <span>{date(m?.starts_at || null)}</span>}
                  {m?.price != null && (
                    <small>Стоимость: {formatPrice(m.price)}</small>
                  )}
                  {past && m?.starts_at && <small>Встреча прошла</small>}
                </div>
                {!past && (
                  <span className={styles.chevron} aria-hidden="true">
                    ›
                  </span>
                )}
              </>
            );
            return past ? (
              <div className={className} key={m?.id || b.id}>
                {content}
              </div>
            ) : (
              <Link
                className={className}
                key={m?.id || b.id}
                to={m ? `/meetings/${m.id}` : `/books/${b.slug}`}
              >
                {content}
              </Link>
            );
          })}
        </div>
      ) : (
        <p className={styles["notice"]}>
          {showPast ? "Встреч пока нет." : "Предстоящих встреч пока нет."}
        </p>
      )}
    </section>
  );
}
