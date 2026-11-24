import { useState } from "react";
import type { ClubData } from "../types";
import { RatingList } from "../features/ratings/RatingList";
import {
  combineRatings,
  getRanking,
  sortRanking,
  type RankingSort,
} from "../features/ratings/ranking";
import { useRatings } from "../features/ratings/useRatings";
import styles from "./RatingsPage.module.scss";

export function RatingsPage({ data }: { data: ClubData }) {
  const [sort, setSort] = useState<RankingSort>("rating");
  const ratings = useRatings();
  const entries = sortRanking(
    ratings.data
      ? combineRatings(data.books, ratings.data.ratings)
      : getRanking(data.books),
    sort,
  );
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
      {ratings.error && <p role="status">{ratings.error}</p>}
      <RatingList entries={entries} />
    </section>
  );
}
