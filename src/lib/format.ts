import type { Meeting } from "../types";

export const isDateOnly = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value);

function parseDate(value: string): Date {
  if (isDateOnly(value)) {
    const [year, month, day] = value.split("-").map(Number);
    return new Date(year, month - 1, day);
  }
  return new Date(value);
}

export const formatDate = (value: string | null) => {
  if (!value) return "Уточняется";
  if (isDateOnly(value)) {
    return new Intl.DateTimeFormat("ru-RU", { dateStyle: "long" }).format(
      parseDate(value),
    );
  }
  return new Intl.DateTimeFormat("ru-RU", {
    dateStyle: "long",
    timeStyle: "short",
  }).format(new Date(value));
};

export function formatWeekday(value: string | null): string | null {
  if (!value) return null;
  const weekday = new Intl.DateTimeFormat("ru-RU", { weekday: "long" }).format(
    parseDate(value),
  );
  return weekday.charAt(0).toLocaleUpperCase("ru-RU") + weekday.slice(1);
}

export function isUpcomingMeeting(meeting: Meeting, now = Date.now()): boolean {
  if (meeting.is_past) return false;
  if (!meeting.starts_at) return true;
  if (isDateOnly(meeting.starts_at)) {
    const [year, month, day] = meeting.starts_at.split("-").map(Number);
    return new Date(year, month - 1, day + 1).getTime() > now;
  }
  return new Date(meeting.starts_at).getTime() >= now;
}
export const formatPrice = (value: number) =>
  new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    maximumFractionDigits: 2,
  }).format(value);

export function formatVotes(count: number): string {
  const ending = new Intl.PluralRules("ru-RU").select(count);
  return `${count} ${ending === "one" ? "голос" : ending === "few" ? "голоса" : "голосов"}`;
}
