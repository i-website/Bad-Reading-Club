import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { webcrypto } from "node:crypto";
import { createServer } from "vite";
import { existsSync, readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";

function memoryStorage() {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key),
  };
}

globalThis.localStorage = memoryStorage();
globalThis.sessionStorage = memoryStorage();
if (!globalThis.crypto) globalThis.crypto = webcrypto;
process.env.VITE_MEMBER_BACKEND = "browser";
let server;
let demo;
let isPlaceUrl;
let mockData;
let dateHelpers;
let buildSchedule;
let ratingTone;
let restoreRoute;
let sortRanking;
let combineRatings;
let memberFetch;
let bookDescriptions;

before(async () => {
  server = await createServer({
    server: { middlewareMode: true },
    appType: "custom",
    optimizeDeps: { noDiscovery: true, include: [] },
  });
  demo = (await server.ssrLoadModule("/src/lib/demo.ts")).demoDb;
  isPlaceUrl = (await server.ssrLoadModule("/src/lib/place.ts")).isPlaceUrl;
  mockData = await server.ssrLoadModule("/src/lib/mockData.ts");
  dateHelpers = await server.ssrLoadModule("/src/lib/format.ts");
  buildSchedule = (await server.ssrLoadModule("/src/lib/schedule.ts"))
    .buildSchedule;
  ratingTone = (
    await server.ssrLoadModule("/src/features/ratings/ratingTone.ts")
  ).ratingTone;
  restoreRoute = (await server.ssrLoadModule("/src/routeBootstrap.ts"))
    .restoreRoute;
  ({ sortRanking, combineRatings } = await server.ssrLoadModule(
    "/src/features/ratings/ranking.ts",
  ));
  ({ memberFetch } = await server.ssrLoadModule("/src/lib/memberApi.ts"));
  ({ bookDescriptions } = await server.ssrLoadModule(
    "/src/lib/bookDescriptions.ts",
  ));
});
after(async () => {
  await server?.close();
});

test("new votes are combined with historical book ratings by vote count", () => {
  const previous = demoBookForRating();
  const book = {
    id: previous.bookId,
    title: previous.title,
    author: previous.author,
  };
  const [result] = combineRatings(
    [book],
    [{ book_id: book.id, votes: 2, total: 18 }],
  );
  assert.equal(result.votes, previous.votes + 2);
  assert.ok(
    Math.abs(
      result.rating -
        (previous.rating * previous.votes + 18) / (previous.votes + 2),
    ) < 1e-10,
  );
});

function demoBookForRating() {
  return mockData.pastBooks.find(
    (book) => book.rating != null && book.votes > 0,
  );
}

test("the demonstration catalogue has descriptions without overwriting existing edits", async () => {
  for (const book of [...mockData.pastBooks, ...mockData.winterMeetings]) {
    assert.ok(
      bookDescriptions[book.bookId],
      `missing description: ${book.title}`,
    );
  }
  const { data: books } = await demo.from("books").select("*");
  for (const item of [...mockData.pastBooks, ...mockData.winterMeetings]) {
    assert.ok(
      books.find((book) => book.id === item.bookId)?.description,
      `missing demo description: ${item.title}`,
    );
  }
  const snapshot = localStorage.getItem("bad-reading-club-demo-v1");
  try {
    const saved = JSON.parse(snapshot);
    saved.mockDatasetVersion = 4;
    saved.books.find((book) => book.id === "club-past-1").description =
      "Моё описание";
    saved.books.find((book) => book.id === "club-past-2").description = "";
    localStorage.setItem("bad-reading-club-demo-v1", JSON.stringify(saved));
    const updated = (await demo.from("books").select("*")).data;
    assert.equal(
      updated.find((book) => book.id === "club-past-1").description,
      "Моё описание",
    );
    assert.equal(
      updated.find((book) => book.id === "club-past-2").description,
      bookDescriptions["club-past-2"],
    );
  } finally {
    localStorage.setItem("bad-reading-club-demo-v1", snapshot);
  }
});

test("Pages demo account, ratings, reviews and profiles work without network", async () => {
  localStorage.removeItem("bad-reading-club-demo-member-v1");
  localStorage.removeItem("bad-reading-club-demo-member-session");
  const originalFetch = globalThis.fetch;
  globalThis.fetch = () => {
    throw new Error("Demo mode must not make network requests");
  };
  const get = async (action) => {
    const response = await memberFetch(`/api/auth.php?action=${action}`);
    return { response, data: await response.json() };
  };
  const post = async (action, body) => {
    const response = await memberFetch(`/api/auth.php?action=${action}`, {
      method: "POST",
      body: JSON.stringify(body),
    });
    return { response, data: await response.json() };
  };
  try {
    assert.equal((await get("session")).data.user, null);
    assert.equal(
      (await post("login", { email: "wrong@example.com", password: "wrong" }))
        .response.status,
      401,
    );
    assert.ok(
      (await get("reviews&bookId=club-past-27")).data.reviews.length >= 2,
    );
    const login = await post("login", {
      email: "member@example.com",
      password: "club-demo-2026",
    });
    assert.equal(login.data.user.name, "Николай");
    assert.equal((await get("session")).data.user.name, "Николай");
    const saved = await post("rate", {
      bookId: "club-past-1",
      score: 8,
      review: "Тестовый отзыв",
    });
    assert.equal(saved.response.status, 200);
    const changed = await post("rate", {
      bookId: "club-past-1",
      score: 9,
      review: "Новый отзыв",
    });
    assert.equal(changed.response.status, 200);
    const mine = (await get("ratings")).data.mine.filter(
      (item) => item.book_id === "club-past-1",
    );
    assert.equal(mine.length, 1);
    assert.equal(mine[0].score, 9);
    assert.equal(
      (await get("reviews&bookId=club-past-1")).data.reviews[0].review,
      "Новый отзыв",
    );
    assert.equal(
      (await post("rate", { bookId: "unknown-book", score: 9, review: "" }))
        .response.status,
      403,
    );
    const avatar = login.data.user.avatar;
    assert.equal(
      (await post("profile", { name: "Тест", avatar })).data.user.name,
      "Тест",
    );
    await post("logout", {});
    assert.equal((await get("session")).data.user, null);
  } finally {
    globalThis.fetch = originalFetch;
    localStorage.removeItem("bad-reading-club-demo-member-v1");
    localStorage.removeItem("bad-reading-club-demo-member-session");
  }
});

test("demo registration is open and supports email login", async () => {
  const post = async (action, body) => {
    const response = await memberFetch(`/api/auth.php?action=${action}`, {
      method: "POST",
      body: JSON.stringify(body),
    });
    return { status: response.status, data: await response.json() };
  };
  localStorage.removeItem("bad-reading-club-demo-credentials");
  const account = {
    name: "Участник",
    email: "new@example.com",
    password: "password123",
  };
  assert.equal((await post("register", account)).status, 200);
  assert.equal((await post("register", account)).status, 409);
  await post("logout", {});
  assert.equal(
    (await post("login", { email: account.email, password: "wrong" })).status,
    401,
  );
  assert.equal((await post("login", account)).status, 200);
});

test("demo participant list is available only to the local administrator", async () => {
  sessionStorage.removeItem("brc-demo-session");
  let response = await memberFetch("/api/auth.php?action=members");
  assert.equal(response.status, 403);
  sessionStorage.setItem("brc-demo-session", "true");
  response = await memberFetch("/api/auth.php?action=members");
  const data = await response.json();
  assert.equal(response.status, 200);
  assert.equal(data.members.length, 1);
  assert.ok(data.members[0].name);
  assert.ok(data.members[0].avatar);
  assert.equal("email" in data.members[0], false);
  sessionStorage.removeItem("brc-demo-session");
});

test("demo rating eligibility follows meetings edited in the same browser", async () => {
  const snapshot = localStorage.getItem("bad-reading-club-demo-v1");
  try {
    await demo
      .from("books")
      .insert({ id: "eligibility-test-book", title: "Test", published: true });
    const bookQuery = "rating-eligibility&bookId=eligibility-test-book";
    async function canRate() {
      const result = await memberFetch(`/api/auth.php?action=${bookQuery}`);
      return (await result.json()).eligible;
    }
    assert.equal(await canRate(), false);
    await demo
      .from("meetings")
      .update({ starts_at: "2000-01-01" })
      .eq("book_id", "eligibility-test-book");
    assert.equal(await canRate(), true);
    await demo
      .from("meetings")
      .update({ starts_at: "2100-01-01" })
      .eq("book_id", "eligibility-test-book");
    assert.equal(await canRate(), false);
  } finally {
    localStorage.setItem("bad-reading-club-demo-v1", snapshot);
  }
});

test("a new book gets a meeting and its optional price survives edits", async () => {
  await demo
    .from("books")
    .insert({ id: "test-book", title: "Test", published: true });
  let { data: meetings } = await demo
    .from("meetings")
    .select("*")
    .eq("book_id", "test-book");
  assert.equal(meetings.length, 1);
  const meeting = meetings[0];
  assert.equal(meeting.price ?? null, null);
  for (const price of [1250.5, 0, null]) {
    await demo.from("meetings").update({ price }).eq("id", meeting.id);
    ({ data: meetings } = await demo
      .from("meetings")
      .select("*")
      .eq("book_id", "test-book"));
    assert.equal(meetings[0].price, price);
  }
});

test("older saved demo data gets a meeting without losing existing content", async () => {
  const saved = JSON.parse(localStorage.getItem("bad-reading-club-demo-v1"));
  saved.meetings = saved.meetings.filter(
    (meeting) => meeting.book_id !== "test-book",
  );
  localStorage.setItem("bad-reading-club-demo-v1", JSON.stringify(saved));
  const { data } = await demo
    .from("meetings")
    .select("*")
    .eq("book_id", "test-book");
  assert.equal(data.length, 1);
  assert.equal(data[0].price ?? null, null);
});

test("one operation creates and edits a meeting together with its book", async () => {
  const book = {
    slug: "combined-test",
    title: "First title",
    author: "Author",
    description: "",
    published: true,
    cover_path: null,
  };
  const meeting = {
    starts_at: null,
    place: "Example",
    price: 0,
    notes: "",
    published: true,
  };
  assert.equal(
    (
      await demo.rpc("save_meeting_with_book", {
        p_meeting_id: null,
        p_book: book,
        p_meeting: meeting,
      })
    ).error,
    null,
  );
  const { data: books } = await demo
    .from("books")
    .select("*")
    .eq("slug", book.slug);
  assert.equal(books.length, 1);
  const { data: meetings } = await demo
    .from("meetings")
    .select("*")
    .eq("book_id", books[0].id);
  assert.equal(meetings.length, 1);
  assert.equal(meetings[0].price, 0);
  assert.equal(
    (
      await demo.rpc("save_meeting_with_book", {
        p_meeting_id: meetings[0].id,
        p_book: { ...book, title: "Changed" },
        p_meeting: { ...meeting, price: 300 },
      })
    ).error,
    null,
  );
  const updatedBook = await demo
    .from("books")
    .select("*")
    .eq("id", books[0].id)
    .maybeSingle();
  const updatedMeeting = await demo
    .from("meetings")
    .select("*")
    .eq("id", meetings[0].id)
    .maybeSingle();
  assert.equal(updatedBook.data.title, "Changed");
  assert.equal(updatedMeeting.data.price, 300);
});

test("publishing a draft makes its meeting and book public together", async () => {
  const book = {
    slug: "draft-test",
    title: "Draft",
    author: "Author",
    description: "",
    cover_path: null,
    published: false,
  };
  const meeting = {
    starts_at: null,
    place: null,
    price: null,
    notes: "",
    published: false,
  };
  await demo.rpc("save_meeting_with_book", {
    p_meeting_id: null,
    p_book: book,
    p_meeting: meeting,
  });
  const savedBook = (
    await demo.from("books").select("*").eq("slug", book.slug).maybeSingle()
  ).data;
  const savedMeeting = (
    await demo
      .from("meetings")
      .select("*")
      .eq("book_id", savedBook.id)
      .maybeSingle()
  ).data;
  assert.equal(savedBook.published, false);
  assert.equal(savedMeeting.published, false);
  const result = await demo.rpc("save_meeting_with_book", {
    p_meeting_id: savedMeeting.id,
    p_book: { ...savedBook, published: true },
    p_meeting: { ...savedMeeting, published: true },
  });
  assert.equal(result.error, null);
  assert.equal(
    (await demo.from("books").select("*").eq("id", savedBook.id).maybeSingle())
      .data.published,
    true,
  );
  assert.equal(
    (
      await demo
        .from("meetings")
        .select("*")
        .eq("id", savedMeeting.id)
        .maybeSingle()
    ).data.published,
    true,
  );
});

test("venue links are validated and retained with the meeting", async () => {
  assert.equal(isPlaceUrl("https://2gis.ru/irkutsk/firm/123"), true);
  assert.equal(isPlaceUrl("https://go.2gis.com/example"), true);
  assert.equal(isPlaceUrl("https://example.com/venue"), true);
  assert.equal(isPlaceUrl("http://example.com/venue"), true);
  assert.equal(isPlaceUrl("https://user:pass@example.com/"), false);
  assert.equal(isPlaceUrl("javascript:alert(1)"), false);
  const book = {
    slug: "place-test",
    title: "Book",
    author: "Author",
    description: "",
    cover_path: null,
    published: false,
  };
  const placeUrl = "https://2gis.ru/irkutsk/firm/123";
  await demo.rpc("save_meeting_with_book", {
    p_meeting_id: null,
    p_book: book,
    p_meeting: {
      place: "Кафе",
      place_url: placeUrl,
      starts_at: null,
      price: null,
      notes: "",
      published: false,
    },
  });
  const savedBook = (
    await demo.from("books").select("*").eq("slug", book.slug).maybeSingle()
  ).data;
  const savedMeeting = (
    await demo
      .from("meetings")
      .select("*")
      .eq("book_id", savedBook.id)
      .maybeSingle()
  ).data;
  assert.equal(savedMeeting.place_url, placeUrl);
});

test("club results and winter schedule preserve supplied data", async () => {
  assert.equal(mockData.pastBooks.length, 27);
  assert.equal(
    mockData.pastBooks.filter((book) => book.rating === null).length,
    4,
  );
  assert.deepEqual(
    mockData.winterMeetings.map((meeting) => meeting.date),
    ["2026-12-13", "2027-01-10", "2027-01-31", "2027-02-21"],
  );
  const thorns = mockData.pastBooks.find(
    (book) => book.title === "Поющие в терновнике",
  );
  assert.equal(thorns.rating, 8.31);
  assert.equal(thorns.votes, 29);
  const { data: books } = await demo.from("books").select("*");
  const { data: meetings } = await demo.from("meetings").select("*");
  assert.ok(books.some((book) => book.slug === "white-fang"));
  assert.ok(meetings.some((meeting) => meeting.starts_at === "2026-12-13"));
  assert.ok(
    meetings.some(
      (meeting) => meeting.is_past && !dateHelpers.isUpcomingMeeting(meeting),
    ),
  );
  assert.doesNotMatch(dateHelpers.formatDate("2026-12-13"), /\d{1,2}:\d{2}/);
  assert.equal(dateHelpers.formatWeekday("2026-12-13"), "Воскресенье");
  assert.equal(dateHelpers.formatWeekday(null), null);
});

test("all supplied books have bundled cover images with source records", () => {
  const sources = JSON.parse(
    readFileSync("public/book-covers/sources.json", "utf8"),
  );
  const books = [...mockData.pastBooks, ...mockData.winterMeetings];
  assert.equal(sources.length, books.length);
  for (const book of books) {
    const path = `public/book-covers/${book.bookId}.jpg`;
    assert.equal(existsSync(path), true, path);
    const image = readFileSync(path);
    assert.deepEqual([...image.subarray(0, 3)], [0xff, 0xd8, 0xff], path);
    assert.ok(sources.some((source) => source.id === book.bookId));
  }
});

test("bundled covers fill missing images without replacing custom covers", async () => {
  const saved = JSON.parse(localStorage.getItem("bad-reading-club-demo-v1"));
  saved.mockDatasetVersion = 3;
  const first = saved.books.find((book) => book.id === "club-past-1");
  const second = saved.books.find((book) => book.id === "club-past-2");
  const renamed = saved.books.find((book) => book.id === "club-past-3");
  first.cover_path = null;
  second.cover_path = "covers/custom.webp";
  renamed.cover_path = null;
  renamed.title = "Моя книга";
  localStorage.setItem("bad-reading-club-demo-v1", JSON.stringify(saved));
  const books = (await demo.from("books").select("*")).data;
  assert.equal(
    books.find((book) => book.id === first.id).cover_path,
    "book-covers/club-past-1.jpg",
  );
  assert.equal(
    books.find((book) => book.id === second.id).cover_path,
    "covers/custom.webp",
  );
  assert.equal(books.find((book) => book.id === renamed.id).cover_path, null);
});

test("past meetings are distinguished from upcoming meetings", () => {
  const meeting = { starts_at: "2026-12-13", is_past: false };
  assert.equal(
    dateHelpers.isUpcomingMeeting(
      meeting,
      new Date(2026, 11, 13, 12).getTime(),
    ),
    true,
  );
  assert.equal(
    dateHelpers.isUpcomingMeeting(meeting, new Date(2026, 11, 14).getTime()),
    false,
  );
  assert.equal(
    dateHelpers.isUpcomingMeeting({ starts_at: null, is_past: true }),
    false,
  );
  assert.equal(dateHelpers.isUpcomingMeeting({ starts_at: null }), true);
});

test("rating colors follow the thresholds", () => {
  assert.equal(ratingTone(0), "low");
  assert.equal(ratingTone(3.99), "low");
  assert.equal(ratingTone(4), "medium");
  assert.equal(ratingTone(7.99), "medium");
  assert.equal(ratingTone(8), "high");
  assert.equal(ratingTone(10), "high");
});

test("equal scores retain place order when sorting by rating", () => {
  const entries = [
    { book: { title: "А" }, rating: 8.25, rank: 6, votes: 24 },
    { book: { title: "Я" }, rating: 8.25, rank: 5, votes: 24 },
    { book: { title: "Б" }, rating: null, rank: null, votes: null },
  ];
  assert.deepEqual(
    sortRanking(entries, "rating").map((entry) => entry.rank),
    [5, 6, null],
  );
  assert.deepEqual(
    sortRanking(entries, "title").map((entry) => entry.book.title),
    ["А", "Б", "Я"],
  );
});

test("direct routes and legacy hash links restore without losing parameters", () => {
  const source = readFileSync("404.html", "utf8");
  const script = source.match(/<script>([\s\S]*?)<\/script>/)?.[1];
  assert.ok(script);
  for (const base of ["/Bad-Reading-Club/", "/"]) {
    const original = new URL(
      `${base}books/test?view=details#section`,
      "https://example.org",
    );
    let redirect;
    runInNewContext(script.replaceAll("%BASE_URL%", base), {
      location: {
        pathname: original.pathname,
        search: original.search,
        hash: original.hash,
        replace: (value) => {
          redirect = value;
        },
      },
      encodeURIComponent,
    });
    const landing = new URL(redirect, original.origin);
    let restored;
    restoreRoute(
      landing,
      {
        replaceState: (_state, _title, url) => {
          restored = url;
        },
      },
      base,
    );
    assert.equal(restored, original.pathname + original.search + original.hash);
  }
  let legacy;
  restoreRoute(
    new URL("https://example.org/Bad-Reading-Club/#/admin"),
    {
      replaceState: (_state, _title, url) => {
        legacy = url;
      },
    },
    "/Bad-Reading-Club/",
  );
  assert.equal(legacy, "/Bad-Reading-Club/admin");
  let unsafe = false;
  restoreRoute(
    new URL(
      "https://example.org/Bad-Reading-Club/?__brc_route=https%3A%2F%2Fevil.example%2F",
    ),
    {
      replaceState: () => {
        unsafe = true;
      },
    },
    "/Bad-Reading-Club/",
  );
  assert.equal(unsafe, false);
});

test("schedule hides past by default and preserves chronological order when shown", () => {
  const books = ["later", "old", "next", "undated"].map((id) => ({
    id,
    title: id,
  }));
  const meetings = [
    { id: "later", book_id: "later", starts_at: "2027-02-21" },
    { id: "old", book_id: "old", starts_at: "2025-01-01" },
    { id: "next", book_id: "next", starts_at: "2026-12-13" },
    { id: "undated", book_id: "undated", starts_at: null, is_past: true },
  ];
  const data = { books, meetings, settings: null };
  const now = new Date(2026, 10, 24).getTime();
  const upcoming = buildSchedule(data, false, now);
  assert.deepEqual(
    upcoming.items.map(({ m }) => m.id),
    ["next", "later"],
  );
  assert.equal(upcoming.nextMeetingId, "next");
  const all = buildSchedule(data, true, now);
  assert.deepEqual(
    all.items.map(({ m }) => m.id),
    ["undated", "old", "next", "later"],
  );
  assert.equal(all.nextMeetingId, "next");
});

test("obsolete untouched examples are removed without deleting user changes", async () => {
  const saved = JSON.parse(localStorage.getItem("bad-reading-club-demo-v1"));
  saved.mockDatasetVersion = 1;
  saved.books.push(
    {
      id: "demo-book-2",
      slug: "the-trial",
      title: "Процесс",
      author: "Франц Кафка",
      description:
        "Роман о человеке, который оказывается перед лицом непостижимой судебной системы.",
      cover_path: "demo/trial.svg",
      published: true,
    },
    {
      id: "demo-book-3",
      slug: "the-great-gatsby",
      title: "Великий Гэтсби",
      author: "Фрэнсис Скотт Фицджеральд",
      description: "Мои изменения",
      cover_path: "demo/gatsby.svg",
      published: true,
    },
  );
  saved.meetings.push({
    id: "demo-auto-demo-book-2",
    book_id: "demo-book-2",
    starts_at: null,
    place: null,
    notes: "",
    published: true,
  });
  localStorage.setItem("bad-reading-club-demo-v1", JSON.stringify(saved));
  const { data: books } = await demo.from("books").select("*");
  const { data: meetings } = await demo.from("meetings").select("*");
  assert.equal(
    books.some((book) => book.id === "demo-book-2"),
    false,
  );
  assert.equal(
    meetings.some((meeting) => meeting.book_id === "demo-book-2"),
    false,
  );
  assert.equal(
    books.find((book) => book.id === "demo-book-3")?.description,
    "Мои изменения",
  );
  assert.equal(
    books.some((book) => book.id === "test-book"),
    true,
  );
  assert.equal(
    books.some((book) => book.slug === "white-fang"),
    true,
  );
});

test("existing meetings receive the restaurant once and remain editable", async () => {
  const saved = JSON.parse(localStorage.getItem("bad-reading-club-demo-v1"));
  saved.mockDatasetVersion = 2;
  saved.meetings.push({
    id: "existing-venue",
    book_id: "test-book",
    starts_at: "2027-03-01",
    place: "Старое место",
    place_url: null,
    notes: "Заметка",
    published: false,
  });
  localStorage.setItem("bad-reading-club-demo-v1", JSON.stringify(saved));
  let { data: meetings } = await demo.from("meetings").select("*");
  assert.ok(
    meetings.every(
      (meeting) =>
        meeting.place === "Ресторан Премьера" &&
        meeting.place_url ===
          "https://2gis.ru/irkutsk/geo/70000001077483176?inv_by=ca0ced143c694df391a6b0a8c1e146a5&inv_ts=1795455530",
    ),
  );
  assert.equal(
    meetings.find((meeting) => meeting.id === "existing-venue").notes,
    "Заметка",
  );
  await demo
    .from("meetings")
    .update({ place: "Новое место" })
    .eq("id", "existing-venue");
  ({ data: meetings } = await demo
    .from("meetings")
    .select("*")
    .eq("id", "existing-venue"));
  assert.equal(meetings[0].place, "Новое место");
});
