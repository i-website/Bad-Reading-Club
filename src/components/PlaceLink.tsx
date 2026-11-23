import { isPlaceUrl } from "../lib/place";
import styles from "./PlaceLink.module.scss";

type Props = { place?: string | null; url?: string | null };

export function PlaceLink({ place, url }: Props) {
  const label = place || (url ? "Открыть место" : "Место уточняется");
  return url && isPlaceUrl(url) ? (
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
