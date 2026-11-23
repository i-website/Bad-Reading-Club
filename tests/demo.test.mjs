import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { webcrypto } from "node:crypto";
import { createServer } from "vite";

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
let server;
let demo;
let isTwoGisUrl;

before(async () => {
  server = await createServer({
    server: { middlewareMode: true },
    appType: "custom",
    optimizeDeps: { noDiscovery: true, include: [] },
  });
  demo = (await server.ssrLoadModule("/src/lib/demo.ts")).demoDb;
  isTwoGisUrl = (await server.ssrLoadModule("/src/lib/place.ts")).isTwoGisUrl;
});
after(async () => {
  await server?.close();
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

test("2GIS links are validated and retained with the meeting", async () => {
  assert.equal(isTwoGisUrl("https://2gis.ru/irkutsk/firm/123"), true);
  assert.equal(isTwoGisUrl("https://go.2gis.com/example"), true);
  assert.equal(isTwoGisUrl("https://2gis.ru.example.com/"), false);
  assert.equal(isTwoGisUrl("javascript:alert(1)"), false);
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
