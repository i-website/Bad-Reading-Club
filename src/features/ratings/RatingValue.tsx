import { ratingTone } from "./ratingTone";
import { Star } from "lucide-react";
import styles from "./RatingValue.module.scss";

export function RatingValue({ value }: { value: number }) {
  return (
    <span
      className={`${styles.value} ${styles[ratingTone(value)]}`}
      aria-label={`Оценка ${value} из 10`}
    >
      <Star size={20} aria-hidden="true" />
      {value.toLocaleString("ru-RU", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}
    </span>
  );
}
