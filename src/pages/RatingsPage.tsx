import { useState } from "react";
import type { ClubData } from "../types";
import { RatingList } from "../features/ratings/RatingList";
import { getRanking, sortRanking, type RankingSort } from "../features/ratings/ranking";
import styles from "./RatingsPage.module.scss";

export function RatingsPage({ data }: { data: ClubData }) {
  const [sort, setSort] = useState<RankingSort>("rating");
  const entries = sortRanking(getRanking(data.books), sort);
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
