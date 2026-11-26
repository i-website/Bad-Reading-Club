export interface Book {
  id: string;
  title: string;
  author: string;
  description: string;
  cover_path: string | null;
  published: boolean;
  initial_rating?: number | string;
  initial_votes?: number | string;
}
export interface Meeting {
  id: string;
  book_id: string;
  starts_at: string | null;
  place: string | null;
  place_url: string | null;
  price: number | null;
  notes: string;
  published: boolean;
  /** Historical mock meetings without an exact date. */
  is_past?: boolean;
}
export type ClubData = {
  books: Book[];
  meetings: Meeting[];
};
