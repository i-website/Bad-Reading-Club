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

before(async () => {
  server = await createServer({
    server: { middlewareMode: true },
    appType: "custom",
    optimizeDeps: { noDiscovery: true, include: [] },
  });
  demo = (await server.ssrLoadModule("/src/lib/demo.ts")).demoDb;
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
