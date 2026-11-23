export interface Book {
  id: string;
  slug: string;
  title: string;
  author: string;
  description: string;
  cover_path: string | null;
  published: boolean;
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
}
export interface Photo {
  id: string;
  meeting_id: string;
  storage_path: string;
  caption: string;
  sort_order: number;
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
  photos: Photo[];
  settings: Settings | null;
};
