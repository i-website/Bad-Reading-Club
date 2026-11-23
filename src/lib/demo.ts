type RecordData = Record<string, unknown>;
type Table =
  "books" | "meetings" | "meeting_photos" | "club_settings" | "admin_users";
type Database = Record<Table, RecordData[]> & { files: Record<string, string> };
const storageKey = "bad-reading-club-demo-v1";
const meetingDate = new Date(Date.now() + 14 * 86400000).toISOString();
const seed: Database = {
  books: [
    {
      id: "demo-book-1",
      slug: "east-of-eden",
      title: "К востоку от Эдема",
      author: "Джон Стейнбек",
      description:
        "История двух семей, их выбора и отношений. Книга для долгого разговора после прочтения.",
      status: "reading",
      cover_path: "demo/east.svg",
      published: true,
    },
    {
      id: "demo-book-2",
      slug: "the-trial",
      title: "Процесс",
      author: "Франц Кафка",
      description:
        "Роман о человеке, который оказывается перед лицом непостижимой судебной системы.",
      status: "planned",
      cover_path: "demo/trial.svg",
      published: true,
    },
    {
      id: "demo-book-3",
      slug: "the-great-gatsby",
      title: "Великий Гэтсби",
      author: "Фрэнсис Скотт Фицджеральд",
      description: "Роман о мечте, богатстве и иллюзиях.",
      status: "read",
      cover_path: "demo/gatsby.svg",
      published: true,
    },
  ],
  meetings: [
    {
      id: "demo-meeting-1",
      book_id: "demo-book-1",
      starts_at: meetingDate,
      place: "Кафе «Пример»",
      price: 500,
      notes: "Демонстрационная встреча: дата и место приведены для примера.",
      published: true,
    },
  ],
  meeting_photos: [],
  club_settings: [
    {
      id: 1,
      name: "BAD READING CLUB",
      description: "Читаем, обсуждаем, встречаемся.",
      links: [],
    },
  ],
  admin_users: [{ user_id: "demo-admin" }],
  files: {},
};
function read(): Database {
  let db: Database;
  try {
    const saved = localStorage.getItem(storageKey);
    db = saved ? (JSON.parse(saved) as Database) : structuredClone(seed);
  } catch {
    db = structuredClone(seed);
  }
  for (const book of db.books) {
    if (!db.meetings.some((m) => m.book_id === book.id))
      db.meetings.push({
        id: `demo-auto-${book.id}`,
        book_id: book.id,
        starts_at: null,
        place: null,
        notes: "",
        published: true,
      });
  }
  return db;
}
function write(data: Database) {
  localStorage.setItem(storageKey, JSON.stringify(data));
}
let signedIn = sessionStorage.getItem("brc-demo-session") === "true";
const listeners = new Set<() => void>();
const session = () => (signedIn ? { user: { id: "demo-admin" } } : null);
class Query implements PromiseLike<{ data: unknown; error: null }> {
  private filters: [string, unknown][] = [];
  private action: "select" | "insert" | "update" | "delete" | "upsert" =
    "select";
  private values: RecordData | RecordData[] = {};
  private orderField = "";
  constructor(private table: Table) {}
  select(_columns?: string) {
    return this;
  }
  eq(field: string, value: unknown) {
    this.filters.push([field, value]);
    return this;
  }
  order(field: string) {
    this.orderField = field;
    return this;
  }
  insert(values: RecordData | RecordData[]) {
    this.action = "insert";
    this.values = values;
    return this;
  }
  update(values: RecordData) {
    this.action = "update";
    this.values = values;
    return this;
  }
  upsert(values: RecordData) {
    this.action = "upsert";
    this.values = values;
    return this;
  }
  delete() {
    this.action = "delete";
    return this;
  }
  private execute() {
    const db = read();
    let rows = db[this.table];
    const matches = (row: RecordData) =>
      this.filters.every(([key, value]) => row[key] === value);
    if (this.action === "select") {
      rows = rows.filter(matches);
      if (this.orderField)
        rows.sort((a, b) =>
          String(a[this.orderField] ?? "").localeCompare(
            String(b[this.orderField] ?? ""),
          ),
        );
    } else if (this.action === "insert") {
      for (const value of Array.isArray(this.values)
        ? this.values
        : [this.values]) {
        const row = {
          id: crypto.randomUUID(),
          created_at: new Date().toISOString(),
          ...value,
        };
        rows.push(row);
        if (this.table === "books")
          db.meetings.push({
            id: crypto.randomUUID(),
            book_id: row.id,
            starts_at: null,
            place: null,
            notes: "",
            published: true,
          });
      }
    } else if (this.action === "update") {
      for (const row of rows.filter(matches)) Object.assign(row, this.values);
    } else if (this.action === "upsert") {
      const value = this.values as RecordData;
      const index = rows.findIndex((row) => row.id === value.id);
      if (index < 0) rows.push(value);
      else Object.assign(rows[index], value);
    } else {
      const deleted = rows.filter(matches);
      db[this.table] = rows.filter((row) => !matches(row));
      if (this.table === "books") {
        const ids = deleted.map((row) => row.id);
        const meetingIds = db.meetings
          .filter((row) => ids.includes(row.book_id))
          .map((row) => row.id);
        db.meetings = db.meetings.filter((row) => !ids.includes(row.book_id));
        db.meeting_photos = db.meeting_photos.filter(
          (row) => !meetingIds.includes(row.meeting_id),
        );
      }
      if (this.table === "meetings") {
        const ids = deleted.map((row) => row.id);
        db.meeting_photos = db.meeting_photos.filter(
          (row) => !ids.includes(row.meeting_id),
        );
      }
    }
    if (this.action !== "select") write(db);
    return { data: rows, error: null };
  }
  maybeSingle() {
    const result = this.execute();
    return Promise.resolve({ data: result.data[0] || null, error: null });
  }
  then<TResult1 = { data: unknown; error: null }, TResult2 = never>(
    onfulfilled?:
      | ((value: {
          data: unknown;
          error: null;
        }) => TResult1 | PromiseLike<TResult1>)
      | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): PromiseLike<TResult1 | TResult2> {
    return Promise.resolve(this.execute()).then(onfulfilled, onrejected);
  }
}
export const demoDb = {
  from(table: Table) {
    return new Query(table);
  },
  async rpc(
    name: string,
    args: {
      p_meeting_id: string | null;
      p_book: RecordData;
      p_meeting: RecordData;
    },
  ) {
    if (name !== "save_meeting_with_book")
      return { data: null, error: { message: "Unknown operation" } };
    const data = read();
    const meeting = args.p_meeting_id
      ? data.meetings.find((item) => item.id === args.p_meeting_id)
      : undefined;
    const book = meeting
      ? data.books.find((item) => item.id === meeting.book_id)
      : undefined;
    if (args.p_meeting_id && (!meeting || !book))
      return { data: null, error: { message: "Встреча не найдена." } };
    if (
      !args.p_book.title ||
      !args.p_book.author ||
      data.books.some(
        (item) => item.slug === args.p_book.slug && item.id !== book?.id,
      )
    ) {
      return {
        data: null,
        error: { message: "Проверьте название, автора и адрес книги." },
      };
    }
    if (book && meeting) {
      const wasPublished = book.published;
      Object.assign(book, args.p_book, {
        published: !!wasPublished || !!args.p_book.published,
      });
      Object.assign(meeting, args.p_meeting);
    } else {
      const bookId = crypto.randomUUID();
      data.books.push({ id: bookId, ...args.p_book });
      data.meetings.push({
        id: crypto.randomUUID(),
        book_id: bookId,
        ...args.p_meeting,
      });
    }
    write(data);
    return { data: null, error: null };
  },
  auth: {
    async getSession() {
      return { data: { session: session() }, error: null };
    },
    onAuthStateChange(callback: () => void) {
      listeners.add(callback);
      return {
        data: {
          subscription: {
            unsubscribe() {
              listeners.delete(callback);
            },
          },
        },
      };
    },
    async signInWithPassword() {
      signedIn = true;
      sessionStorage.setItem("brc-demo-session", "true");
      listeners.forEach((f) => f());
      return { data: { session: session() }, error: null };
    },
    async signOut() {
      signedIn = false;
      sessionStorage.removeItem("brc-demo-session");
      listeners.forEach((f) => f());
      return { error: null };
    },
  },
  storage: {
    from() {
      return {
        async upload(path: string, blob: Blob) {
          const value = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(String(reader.result));
            reader.onerror = () => reject(reader.error);
            reader.readAsDataURL(blob);
          });
          const db = read();
          db.files[path] = value;
          write(db);
          return { error: null };
        },
        async remove(paths: string[]) {
          const db = read();
          for (const path of paths) delete db.files[path];
          write(db);
          return { error: null };
        },
        async createSignedUrl(path: string) {
          const url = path.startsWith("demo/")
            ? import.meta.env.BASE_URL + path
            : read().files[path];
          return { data: url ? { signedUrl: url } : null, error: null };
        },
      };
    },
  },
};
export function resetDemo() {
  localStorage.removeItem(storageKey);
  window.location.hash = "#/";
  window.location.reload();
}
