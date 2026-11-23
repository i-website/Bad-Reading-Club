import { useState } from "react";
import type { ClubData } from "../types";
import { RatingList } from "../features/ratings/RatingList";
import { getRanking } from "../features/ratings/ranking";
import styles from "./RatingsPage.module.scss";

type Sort = "rating" | "title";
export function RatingsPage({ data }: { data: ClubData }) {
  const [sort, setSort] = useState<Sort>("rating");
  const entries = getRanking(data.books).sort((a, b) => {
    const alphabetical = a.book.title.localeCompare(b.book.title, "ru");
    if (sort === "title") return alphabetical;
    return (b.rating ?? -1) - (a.rating ?? -1) || alphabetical;
  });
  return (
    <section>
      <p className={styles.eyebrow}>Книжный клуб</p>
      <div className={styles.heading}>
        <div>
          <h1>Рейтинг книг</h1>
        </div>
        <fieldset className={styles.sort}>
          <div className={styles.options}>
            <label>
              <input
                type="radio"
                name="rating-sort"
                value="rating"
                checked={sort === "rating"}
                onChange={() => setSort("rating")}
              />
              <span>По оценке</span>
            </label>
            <label>
              <input
                type="radio"
                name="rating-sort"
                value="title"
                checked={sort === "title"}
                onChange={() => setSort("title")}
              />
              <span>По алфавиту</span>
            </label>
          </div>
        </fieldset>
      </div>
      <RatingList entries={entries} />
    </section>
  );
}
