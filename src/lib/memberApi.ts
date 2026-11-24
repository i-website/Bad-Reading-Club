import { demoMode } from "./supabase";
import { demoDb } from "./demo";
import { defaultAvatar, type Avatar } from "../features/avatar/AvatarEditor";
import type { Book, Meeting } from "../types";

export const DEMO_MEMBER_TOKEN = "club-demo-2026";
const storageKey = "bad-reading-club-demo-member-v1";
const legacyTokenKey = "bad-reading-club-demo-member-token";
const sessionKey = "bad-reading-club-demo-member-session";
const csrf = "demo-csrf";

type PersonalRating = { book_id: string; score: number; review: string | null };
type DemoData = {
  name: string;
  avatar: Avatar | null;
  ratings: PersonalRating[];
};
type SampleReview = {
  book_id: string;
  name: string;
  score: number;
  review: string;
  avatar: Avatar;
};

const sampleReviews: SampleReview[] = [
  {
    book_id: "club-past-27",
    name: "Анна",
    score: 10,
    review:
      "Очень смешно и при этом неожиданно точно о людях. После обсуждения захотелось перечитать любимые эпизоды.",
    avatar: { ...defaultAvatar, backHair: 4, frontHair: 3, outfit: "#288b67" },
  },
  {
    book_id: "club-past-27",
    name: "Михаил",
    score: 9,
    review:
      "Остап великолепен. Особенно понравилось, как каждая новая встреча превращается в маленькую отдельную историю.",
    avatar: {
      ...defaultAvatar,
      style: "man",
      face: 1,
      backHair: 3,
      frontHair: 2,
      outfit: "#596da2",
    },
  },
  {
    book_id: "club-past-26",
    name: "Елена",
    score: 9,
    review:
      "Тяжёлая, но очень человечная история. Долго думала о том, как семья поддерживает друг друга в дороге.",
    avatar: {
      ...defaultAvatar,
      backHair: 6,
      frontHair: 4,
      hair: "#a65b36",
      outfit: "#c96268",
    },
  },
  {
    book_id: "club-past-25",
    name: "Иван",
    score: 9,
    review:
      "Тревожная книга, после которой особенно интересно говорить о памяти, языке и свободе.",
    avatar: {
      ...defaultAvatar,
      style: "man",
      backHair: 2,
      frontHair: 4,
      outfit: "#526f65",
    },
  },
  {
    book_id: "club-past-24",
    name: "Мария",
    score: 8,
    review:
      "Семейная история затянула надолго. Герои делают непростой выбор, и на встрече мы увидели его очень по-разному.",
    avatar: { ...defaultAvatar, backHair: 7, frontHair: 2, outfit: "#956d9c" },
  },
  {
    book_id: "club-past-23",
    name: "Алексей",
    score: 9,
    review:
      "Зона получилась живой и загадочной. Понравилось, что за приключением скрываются вопросы о желаниях и ответственности.",
    avatar: {
      ...defaultAvatar,
      style: "man",
      backHair: 4,
      frontHair: 1,
      outfit: "#726047",
    },
  },
  {
    book_id: "club-past-22",
    name: "Дарья",
    score: 8,
    review:
      "Неспешная книга, которую хочется читать с карандашом. Для меня это история о поиске собственного пути.",
    avatar: { ...defaultAvatar, backHair: 5, frontHair: 5, outfit: "#b76b55" },
  },
  {
    book_id: "club-past-21",
    name: "Мария",
    score: 9,
    review:
      "Коротко и очень выразительно. Было интересно обсудить, как меняются правила на ферме.",
    avatar: { ...defaultAvatar, backHair: 7, frontHair: 2, outfit: "#956d9c" },
  },
  {
    book_id: "club-past-18",
    name: "Иван",
    score: 10,
    review:
      "Увлекательное космическое приключение с неожиданно тёплой историей дружбы.",
    avatar: {
      ...defaultAvatar,
      style: "man",
      backHair: 2,
      frontHair: 4,
      outfit: "#526f65",
    },
  },
  {
    book_id: "club-past-15",
    name: "Анна",
    score: 8,
    review:
      "Тихий и грустный роман. Атмосфера Токио и воспоминания героя остались со мной надолго.",
    avatar: { ...defaultAvatar, backHair: 4, frontHair: 3, outfit: "#288b67" },
  },
  {
    book_id: "club-past-12",
    name: "Михаил",
    score: 9,
    review:
      "Небольшая история, в которой оказалось много достоинства и упорства. Обсуждение получилось очень личным.",
    avatar: {
      ...defaultAvatar,
      style: "man",
      face: 1,
      backHair: 3,
      frontHair: 2,
      outfit: "#596da2",
    },
  },
];

const moreReviews: [number, string, number, string][] = [
  [
    5,
    "Елена",
    6,
    "Простая на первый взгляд история о том, что мы ценим и что готовы потерять. Наш разговор получился очень тёплым.",
  ],
  [
    6,
    "Алексей",
    7,
    "Интриги парижского света впечатлили, хотя героям не всегда хотелось сочувствовать.",
  ],
  [
    7,
    "Дарья",
    7,
    "Короткий рассказ, к которому хочется вернуться: воспоминания героя оказались интереснее самого путешествия.",
  ],
  [
    8,
    "Михаил",
    7,
    "Азарт Алексея передаётся читателю. На встрече спорили, где заканчивается любовь и начинается зависимость.",
  ],
  [
    9,
    "Иван",
    8,
    "Необычное сочетание фантастики и разговора о войне. Структура романа сначала сбивала, а потом сложилась в целое.",
  ],
  [
    10,
    "Мария",
    7,
    "Провокационная книга, которая вызвала много разных реакций. Обсуждать её оказалось не менее интересно, чем читать.",
  ],
  [
    11,
    "Елена",
    8,
    "История о внутреннем одиночестве и поиске себя. Некоторые сцены захотелось перечитать сразу после встречи.",
  ],
  [
    13,
    "Анна",
    8,
    "Было интересно следить за упорством Мартина и спорить о цене его мечты.",
  ],
  [
    14,
    "Дарья",
    8,
    "Понравилось, как личные решения героев перекликаются с большими историческими событиями.",
  ],
  [
    16,
    "Алексей",
    8,
    "Печорин одновременно отталкивает и заставляет задуматься. Формат нескольких взглядов на героя работает отлично.",
  ],
  [
    17,
    "Мария",
    8,
    "Трогательная история о гордости и сострадании. Особенно запомнились разговоры героев друг с другом.",
  ],
  [
    19,
    "Михаил",
    8,
    "Атмосферная история с любопытными вопросами о славе, искушении и ответственности.",
  ],
  [
    20,
    "Елена",
    9,
    "Очень кинематографичный Париж и непростые отношения героев. После встречи захотелось открыть и другие книги автора.",
  ],
];
sampleReviews.push(
  ...moreReviews.map(([number, name, score, review], index) => ({
    book_id: `club-past-${number}`,
    name,
    score,
    review,
    avatar: {
      ...defaultAvatar,
      style: index % 2 ? ("man" as const) : ("girl" as const),
      backHair: (index % 6) + 1,
      frontHair: (index % 5) + 1,
      outfit: ["#288b67", "#596da2", "#b76b55"][index % 3],
    },
  })),
);

function read(): DemoData {
  try {
    const raw = localStorage.getItem(storageKey);
    if (raw) return JSON.parse(raw) as DemoData;
  } catch {
    /* Use the sample account if the saved demo data is unavailable. */
  }
  return {
    name: "Николай",
    avatar: {
      ...defaultAvatar,
      style: "man",
      backHair: 3,
      frontHair: 2,
      outfit: "#288b67",
    },
    ratings: [
      {
        book_id: "club-past-27",
        score: 9,
        review:
          "Яркая и смешная история — отлично подошла для обсуждения в клубе.",
      },
    ],
  };
}
function write(data: DemoData) {
  localStorage.setItem(storageKey, JSON.stringify(data));
}
function signedIn() {
  const legacyToken = localStorage.getItem(legacyTokenKey);
  if (legacyToken !== null) {
    if (legacyToken === DEMO_MEMBER_TOKEN) localStorage.setItem(sessionKey, "true");
    localStorage.removeItem(legacyTokenKey);
  }
  return localStorage.getItem(sessionKey) === "true";
}
function response(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
function clubDate(value: string): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Irkutsk",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const part = (type: string) =>
    parts.find((item) => item.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}`;
}
async function eligible(bookId: string) {
  const [bookResult, meetingResult] = await Promise.all([
    demoDb.from("books").select("*").eq("id", bookId).eq("published", true),
    demoDb
      .from("meetings")
      .select("*")
      .eq("book_id", bookId)
      .eq("published", true),
  ]);
  const books = bookResult.data as Book[];
  const meetings = meetingResult.data as Meeting[];
  const today = clubDate(new Date().toISOString());
  return (
    books.length > 0 &&
    meetings.some(
      (meeting) =>
        meeting.is_past ||
        (!!meeting.starts_at &&
          !!clubDate(meeting.starts_at) &&
          clubDate(meeting.starts_at) < today),
    )
  );
}

async function demoFetch(input: string, init?: RequestInit): Promise<Response> {
  if (init?.signal?.aborted) throw new DOMException("Aborted", "AbortError");
  const url = new URL(input, "https://demo.invalid");
  const action = url.searchParams.get("action");
  const data = read();
  const active = signedIn();
  const member = active
    ? { id: 1, name: data.name, avatar: data.avatar }
    : null;
  if (action === "session" && !init?.method)
    return response({ user: member, csrf });
  if (action === "ratings" && !init?.method)
    return response({
      // Sample comments describe historical votes, so only the demo account adds new votes.
      ratings: data.ratings.map((item) => ({
        book_id: item.book_id,
        votes: 1,
        total: item.score,
      })),
      mine: active ? data.ratings : [],
      signedIn: active,
      csrf,
    });
  if (action === "reviews" && !init?.method) {
    const bookId = url.searchParams.get("bookId");
    const own = data.ratings
      .filter((item) => item.book_id === bookId && item.review)
      .map((item) => ({
        ...item,
        name: data.name,
        avatar: data.avatar,
        is_mine: active,
      }));
    return response({
      reviews: [
        ...own,
        ...sampleReviews
          .filter((item) => item.book_id === bookId)
          .map((item) => ({ ...item, is_mine: false })),
      ],
    });
  }
  if (action === "rating-eligibility" && !init?.method)
    return response({
      eligible: await eligible(url.searchParams.get("bookId") ?? ""),
    });
  if (init?.method !== "POST")
    return response({ error: "Действие не найдено." }, 404);
  let body: Record<string, unknown>;
  try {
    body = JSON.parse(String(init.body ?? "{}")) as Record<string, unknown>;
  } catch {
    return response({ error: "Некорректный запрос." }, 400);
  }
  if (action === "login") {
    if (body.token !== DEMO_MEMBER_TOKEN)
      return response({ error: "Неверный токен." }, 401);
    localStorage.setItem(sessionKey, "true");
    return response({
      user: { id: 1, name: data.name, avatar: data.avatar },
      csrf,
    });
  }
  if (action === "logout") {
    localStorage.removeItem(sessionKey);
    localStorage.removeItem(legacyTokenKey);
    return response({ ok: true });
  }
  if (!active) return response({ error: "Войдите в аккаунт." }, 401);
  if (action === "profile") {
    const name = typeof body.name === "string" ? body.name.trim() : "";
    if (
      !name ||
      name.length > 80 ||
      !body.avatar ||
      typeof body.avatar !== "object"
    )
      return response({ error: "Проверьте имя и аватарку." }, 400);
    data.name = name;
    data.avatar = body.avatar as Avatar;
    write(data);
    return response({
      user: { id: 1, name: data.name, avatar: data.avatar },
      csrf,
    });
  }
  if (action === "rate") {
    const bookId = typeof body.bookId === "string" ? body.bookId : "";
    const score = body.score;
    if (
      !Number.isInteger(score) ||
      Number(score) < 1 ||
      Number(score) > 10 ||
      typeof body.review !== "string" ||
      body.review.length > 2000
    )
      return response({ error: "Проверьте оценку и отзыв." }, 400);
    if (!(await eligible(bookId)))
      return response(
        { error: "Оценить книгу можно на следующий день после встречи." },
        403,
      );
    const rating = {
      book_id: bookId,
      score: Number(score),
      review: body.review.trim() || null,
    };
    data.ratings = [
      rating,
      ...data.ratings.filter((item) => item.book_id !== bookId),
    ];
    write(data);
    return response({ ok: true });
  }
  return response({ error: "Действие не найдено." }, 404);
}

export function memberFetch(
  input: string,
  init?: RequestInit,
): Promise<Response> {
  return demoMode ? demoFetch(input, init) : fetch(input, init);
}
