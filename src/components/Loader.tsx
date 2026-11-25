import { BrandMark } from "./BrandMark";
import styles from "./Loader.module.scss";

export function Loader() {
  return (
    <div className={styles.loader} role="status" aria-label="Загружаем сайт">
      <div className={styles.content}>
        <BrandMark className={styles.logo} />
        <div className={styles.track} aria-hidden="true">
          <div className={styles.bar} />
        </div>
      </div>
    </div>
  );
}
