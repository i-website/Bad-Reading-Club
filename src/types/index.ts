export interface Book {
  id: string;
  slug: string;
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
export interface Settings {
  id: number;
  name: string;
  description: string;
  links: { label: string; url: string }[];
}
export type ClubData = {
  books: Book[];
  meetings: Meeting[];
  settings: Settings | null;
};
