import { Link } from "react-router-dom";
import styles from "./NotFound.module.scss";

export function NotFound() {
  return (
    <section className={styles.page}>
      <div className={styles.card}>
        <p className={styles.eyebrow}>Книжный клуб</p>
        <p className={styles.code} aria-label="Ошибка 404">
          404
        </p>
        <h1>Страница не найдена</h1>
        <p className={styles.description}>
          Кажется, эта страница потерялась. Вернитесь на главную, чтобы
          продолжить чтение.
        </p>
        <Link className={styles.link} to="/">
          На главную
        </Link>
      </div>
    </section>
  );
}
