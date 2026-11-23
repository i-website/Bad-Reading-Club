import type { Book } from "../../types";
import { demoBookRanking } from "../../lib/demo";
import { demoMode } from "../../lib/supabase";

export type RankedBook = {
  book: Book;
  rating: number | null;
  votes: number | null;
  rank: number | null;
};
export type RankingSort = "rating" | "title";

export function sortRanking(entries: RankedBook[], sort: RankingSort): RankedBook[] {
  return [...entries].sort((a, b) => {
    const alphabetical = a.book.title.localeCompare(b.book.title, "ru");
    if (sort === "title") return alphabetical;
    return (b.rating ?? -1) - (a.rating ?? -1) || (a.rank ?? Infinity) - (b.rank ?? Infinity) || alphabetical;
  });
}

export function getRanking(books: Book[]): RankedBook[] {
  if (!demoMode) return [];
  return demoBookRanking.flatMap((item, index) => {
    const book = books.find((entry) => entry.id === item.bookId);
    return book
      ? [
          {
            book,
            rating: item.rating,
            votes: item.votes,
            rank: item.rating == null ? null : index + 1,
          },
        ]
      : [];
  });
}
