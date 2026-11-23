import { isTwoGisUrl } from "../lib/place";
import styles from "./PlaceLink.module.scss";

type Props = { place?: string | null; url?: string | null };

export function PlaceLink({ place, url }: Props) {
  const label = place || (url ? "Открыть в 2ГИС" : "Место уточняется");
  return url && isTwoGisUrl(url) ? (
    <a
      className={styles.link}
      href={url}
      target="_blank"
      rel="noopener noreferrer"
    >
      {label}
    </a>
  ) : (
    <>{place || "Место уточняется"}</>
  );
}
