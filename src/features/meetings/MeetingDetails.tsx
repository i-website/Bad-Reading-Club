import { CalendarDays, MapPin } from "lucide-react";
import { PlaceLink } from "../../components/PlaceLink";
import { formatDate, formatPrice, formatWeekday } from "../../lib/format";
import type { Meeting } from "../../types";
import styles from "./MeetingDetails.module.scss";

type Props = {
  meeting: Meeting;
  showNotes?: boolean;
  showHeading?: boolean;
};

export function MeetingDetails({
  meeting,
  showNotes = false,
  showHeading = true,
}: Props) {
  const weekday = formatWeekday(meeting.starts_at);
  return (
    <div className={styles.details}>
      {showHeading && <h2 className={styles.heading}>Где и когда</h2>}
      <div className={styles.rows}>
        <div className={styles.detail}>
          <CalendarDays size={19} aria-hidden="true" />
          <div>
            {meeting.starts_at ? (
              <strong>{formatDate(meeting.starts_at)}</strong>
            ) : (
              <span className={styles.muted}>Дата уточняется</span>
            )}
            {weekday && <span className={styles.weekday}>{weekday}</span>}
          </div>
        </div>
        <div className={styles.detail}>
          <MapPin size={19} aria-hidden="true" />
          <span
            className={
              !meeting.place && !meeting.place_url ? styles.muted : undefined
            }
          >
            <PlaceLink place={meeting.place} url={meeting.place_url} />
          </span>
        </div>
        {meeting.price != null && (
          <p className={styles.note}>Стоимость: {formatPrice(meeting.price)}</p>
        )}
        {showNotes && meeting.notes && (
          <p className={styles.note}>{meeting.notes}</p>
        )}
      </div>
    </div>
  );
}
