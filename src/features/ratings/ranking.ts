import type { Book } from "../../types";
import { demoBookRanking } from "../../lib/demo";
import { demoMode } from "../../lib/supabase";

export type RankedBook = {
  book: Book;
  rating: number | null;
  votes: number | null;
  rank: number | null;
};

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
