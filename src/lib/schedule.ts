import type { Book, ClubData, Meeting } from "../types";
import { isUpcomingMeeting } from "./format";

export type ScheduleItem = { b: Book; m: Meeting | null };

export function buildSchedule(
  data: ClubData,
  showPast: boolean,
  now = Date.now(),
) {
  const items: ScheduleItem[] = data.books.flatMap<ScheduleItem>((book) => {
    const meetings = data.meetings.filter(
      (meeting) => meeting.book_id === book.id,
    );
    return meetings.length
      ? meetings.map((meeting) => ({ b: book, m: meeting }))
      : [{ b: book, m: null }];
  });
  const dateKey = (meeting: Meeting | null) => {
    if (!meeting?.starts_at)
      return meeting?.is_past
        ? Number.NEGATIVE_INFINITY
        : Number.POSITIVE_INFINITY;
    const timestamp = Date.parse(meeting.starts_at);
    return Number.isNaN(timestamp) ? Number.POSITIVE_INFINITY : timestamp;
  };
  items.sort((a, b) => {
    const aDate = dateKey(a.m),
      bDate = dateKey(b.m);
    return aDate === bDate
      ? a.b.title.localeCompare(b.b.title, "ru")
      : aDate < bDate
        ? -1
        : 1;
  });
  const next =
    items.find(({ m }) => m?.starts_at && isUpcomingMeeting(m, now))?.m ??
    items.find(({ m }) => m && !m.starts_at && isUpcomingMeeting(m, now))?.m;
  return {
    items: showPast
      ? items
      : items.filter(({ m }) => !m || isUpcomingMeeting(m, now)),
    nextMeetingId: next?.id,
  };
}
