import type { Book } from "../../types";
import { demoBookRanking } from "../../lib/demo";
import { demoMode } from "../../lib/supabase";
import type { RatingsData } from "./useRatings";

export type RankedBook = {
  book: Book;
  rating: number | null;
  votes: number | null;
  rank: number | null;
};
export type RankingSort = "rating" | "title";

export function sortRanking(
  entries: RankedBook[],
  sort: RankingSort,
): RankedBook[] {
  return [...entries].sort((a, b) => {
    const alphabetical = a.book.title.localeCompare(b.book.title, "ru");
    if (sort === "title") return alphabetical;
    return (
      (b.rating ?? -1) - (a.rating ?? -1) ||
      (a.rank ?? Infinity) - (b.rank ?? Infinity) ||
      alphabetical
    );
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

export function combineRatings(
  books: Book[],
  ratings: RatingsData["ratings"],
): RankedBook[] {
  const baseline = getRanking(books);
  const historical = new Map(baseline.map((item) => [item.book.id, item]));
  const additional = new Map(ratings.map((item) => [item.book_id, item]));
  const entries = books.flatMap((book) => {
    const previous = historical.get(book.id);
    const incoming = additional.get(book.id);
    if (!previous && !incoming) return [];
    const oldVotes = previous?.rating != null ? (previous.votes ?? 0) : 0;
    const newVotes = incoming ? Number(incoming.votes) : 0;
    const totalVotes = oldVotes + newVotes;
    return [
      {
        book,
        rating: totalVotes
          ? ((previous?.rating ?? 0) * oldVotes +
              Number(incoming?.total ?? 0)) /
            totalVotes
          : (previous?.rating ?? null),
        votes: totalVotes || previous?.votes || null,
        rank: previous?.rank ?? null,
      },
    ];
  });
  const ranked = sortRanking(entries, "rating");
  return ranked.map((item, index) => ({
    ...item,
    rank: item.rating == null ? null : index + 1,
  }));
}
