import styles from "./Media.module.scss";
import { coverUrl } from "../lib/contentApi";
export function Media({
  path,
  alt,
  className = "",
}: {
  path: string | null;
  alt: string;
  className?: string;
}) {
  return path ? (
    <img className={className} src={coverUrl(path)} alt={alt} />
  ) : (
    <div
      className={`${styles["cover-placeholder"]} ${className}`}
      aria-label={alt}
    >
      <span>
        BAD
        <br />
        READING
        <br />
        CLUB
      </span>
    </div>
  );
}
