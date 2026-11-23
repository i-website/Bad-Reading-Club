import { ratingTone } from "./ratingTone";
import styles from "./RatingValue.module.scss";

export function RatingValue({ value }: { value: number }) {
  return (
    <span
      className={styles[ratingTone(value)]}
      aria-label={`Оценка ${value} из 10`}
    >
      ★{" "}
      {value.toLocaleString("ru-RU", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}
    </span>
  );
}
