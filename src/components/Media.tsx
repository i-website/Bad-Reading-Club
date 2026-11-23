import styles from "./Media.module.scss";
import { useEffect, useState } from "react";
import { db } from "../lib/supabase";
export function Media({
  path,
  alt,
  className = "",
}: {
  path: string | null;
  alt: string;
  className?: string;
}) {
  const [url, setUrl] = useState("");
  useEffect(() => {
    let active = true;
    setUrl("");
    if (path && /^book-covers\/[a-z0-9-]+\.jpg$/.test(path)) {
      setUrl(`${import.meta.env.BASE_URL}${path}`);
    } else if (path)
      void db.storage
        .from("club-media")
        .createSignedUrl(path, 3600)
        .then(({ data }) => {
          if (active && data) setUrl(data.signedUrl);
        });
    return () => {
      active = false;
    };
  }, [path]);
  return url ? (
    <img className={className} src={url} alt={alt} />
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
