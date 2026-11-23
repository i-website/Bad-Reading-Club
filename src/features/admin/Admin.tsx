import styles from "./Admin.module.scss";
import { useEffect, useState, type FormEvent } from "react";
import {
  db,
  configured,
  message,
  upload,
  removeFiles,
} from "../../lib/supabase";
import { type Book, type Meeting } from "../../types";
import { AdminForm } from "./AdminForm";
import { PublishDialog } from "./PublishDialog";
import { isPlaceUrl } from "../../lib/place";
import { isDateOnly, isUpcomingMeeting } from "../../lib/format";
type Row = Meeting;
import type { Form } from "./types";
const initial: Record<"meetings", Form> = {
  meetings: {
    slug: "",
    title: "",
    author: "",
    description: "",
    cover_path: "",
    starts_at: "",
    date_only: false,
    meeting_time: "",
    place: "",
    place_url: "",
    price: "",
    notes: "",
    published: false,
  },
};
function toForm(row: Row | Book, defaults: Form): Form {
  const result: Form = {};
  for (const [key, value] of Object.entries(row)) {
    if (!(key in defaults)) continue;
    if (key === "starts_at" && typeof value === "string" && isDateOnly(value)) {
      result.starts_at = value;
      result.date_only = true;
      continue;
    }
    result[key] =
      typeof value === "boolean"
        ? value
        : value === null
          ? ""
          : key === "starts_at"
            ? new Date(
                new Date(value as string).getTime() -
                  new Date(value as string).getTimezoneOffset() * 60000,
              )
                .toISOString()
                .slice(0, 16)
            : String(value);
  }
  return result;
}
export default function Admin() {
  const [session, setSession] = useState(false);
  const [allowed, setAllowed] = useState(false);
  const [checking, setChecking] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [books, setBooks] = useState<Book[]>([]);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [form, setForm] = useState<Form>(initial.meetings);
  const [id, setId] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [publishing, setPublishing] = useState<Meeting | null>(null);
  const [publishError, setPublishError] = useState("");
  async function load() {
    const result = await Promise.all([
      db.from("books").select("*").order("created_at"),
      db.from("meetings").select("*").order("starts_at"),
    ]);
    for (const r of result) if (r.error) throw r.error;
    setBooks(result[0].data as Book[]);
    setMeetings(result[1].data as Meeting[]);
  }
  useEffect(() => {
    let alive = true;
    async function check() {
      try {
        const {
          data: { session: s },
        } = await db.auth.getSession();
        if (!alive) return;
        setSession(!!s);
        if (s) {
          const { data, error } = await db
            .from("admin_users")
            .select("user_id")
            .eq("user_id", s.user.id)
            .maybeSingle();
          if (error) throw error;
          if (alive) setAllowed(!!data);
          if (data) await load();
        }
      } catch (e) {
        if (alive) setError(message(e));
      } finally {
        if (alive) setChecking(false);
      }
    }
    if (configured) void check();
    else setChecking(false);
    const {
      data: { subscription },
    } = db.auth.onAuthStateChange(() => {
      void check();
    });
    return () => {
      alive = false;
      subscription.unsubscribe();
    };
  }, []);
  function newMeeting() {
    setId("");
    setFile(null);
    setError("");
    setSuccess("");
    setForm(initial.meetings);
  }
  function change(key: string, value: string | boolean) {
    setForm((f) => ({ ...f, [key]: value }));
  }
  async function login(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const { error } = await db.auth.signInWithPassword({ email, password });
    if (error) setError(message(error));
    setBusy(false);
  }
  async function save(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setSuccess("");
    let newPath = "";
    let saved = false;
    try {
      const placeUrl = String(form.place_url || "").trim();
      if (placeUrl && !isPlaceUrl(placeUrl)) {
        throw new Error(
          "Укажите корректную ссылку, начинающуюся с http:// или https://.",
        );
      }
      if (file) newPath = await upload(file, "covers");
      const book = {
        slug: form.slug || `book-${crypto.randomUUID()}`,
        title: form.title,
        author: form.author,
        description: form.description,
        cover_path: newPath || form.cover_path || null,
        published: !!form.published,
      };
      const meeting = {
        starts_at: form.starts_at
          ? form.date_only
            ? form.meeting_time
              ? new Date(`${form.starts_at}T${form.meeting_time}`).toISOString()
              : String(form.starts_at)
            : new Date(String(form.starts_at)).toISOString()
          : null,
        place: form.place || null,
        place_url: placeUrl || null,
        price: form.price === "" ? null : Number(form.price),
        notes: form.notes,
        published: !!form.published,
      };
      const { error } = await db.rpc("save_meeting_with_book", {
        p_meeting_id: id || null,
        p_book: book,
        p_meeting: meeting,
      });
      if (error) throw error;
      saved = true;
      if (newPath && form.cover_path)
        await removeFiles([String(form.cover_path)]);
      await load();
      setFile(null);
      setSuccess(
        "Сохранено. Изменения появятся на сайте после обновления страницы.",
      );
      setId("");
      setForm(initial.meetings);
    } catch (e) {
      if (newPath && !saved)
        try {
          await removeFiles([newPath]);
        } catch {}
      setError(message(e));
    } finally {
      setBusy(false);
    }
  }
  async function remove(row: Row) {
    const lastMeeting =
      meetings.filter((m) => m.book_id === row.book_id).length === 1;
    if (
      !confirm(
        lastMeeting
          ? "Удалить встречу и связанную с ней книгу? Это действие нельзя отменить."
          : "Удалить встречу? Это действие нельзя отменить.",
      )
    )
      return;
    setBusy(true);
    setError("");
    try {
      const paths: string[] = [];
      const cover = books.find((book) => book.id === row.book_id)?.cover_path;
      if (lastMeeting && cover) paths.push(cover);
      const { error } = lastMeeting
        ? await db.from("books").delete().eq("id", row.book_id)
        : await db.from("meetings").delete().eq("id", row.id);
      if (error) throw error;
      await removeFiles(paths);
      await load();
      setId("");
      setForm(initial.meetings);
      setSuccess("Запись удалена.");
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(false);
    }
  }
  async function publishMeeting() {
    if (!publishing) return;
    const book = books.find((item) => item.id === publishing.book_id);
    if (!book) {
      setPublishError("Книга для этой встречи не найдена.");
      return;
    }
    setBusy(true);
    setPublishError("");
    try {
      const { error } = await db.rpc("save_meeting_with_book", {
        p_meeting_id: publishing.id,
        p_book: { ...book, published: true },
        p_meeting: { ...publishing, published: true },
      });
      if (error) throw error;
      if (id === publishing.id)
        setForm((current) => ({ ...current, published: true }));
      await load();
      setPublishing(null);
      setSuccess("Встреча опубликована.");
    } catch (error) {
      setPublishError(message(error));
    } finally {
      setBusy(false);
    }
  }
  if (!configured)
    return (
      <section>
        <h1 className={styles["page-title"]}>Админка</h1>
        <p>Сначала настройте подключение к Supabase.</p>
      </section>
    );
  if (checking) return <p>Проверяем доступ…</p>;
  if (!session)
    return (
      <section className={styles["login"]}>
        <h1 className={styles["page-title"]}>Вход для организатора</h1>
        <p>Управление книгами и встречами клуба.</p>
        <form onSubmit={login}>
          <label>
            Email
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>
          <label>
            Пароль
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
          {error && (
            <p className={styles["error"]} role="alert">
              {error}
            </p>
          )}
          <button disabled={busy}>Войти</button>
        </form>
      </section>
    );
  if (!allowed)
    return (
      <section>
        <h1 className={styles["page-title"]}>Нет доступа</h1>
        <p>Этот аккаунт не назначен администратором клуба.</p>
        <button onClick={() => void db.auth.signOut()}>Выйти</button>
      </section>
    );
  const now = Date.now();
  const past = meetings.filter((meeting) => !isUpcomingMeeting(meeting, now));
  const drafts = meetings.filter(
    (meeting) => !meeting.published && isUpcomingMeeting(meeting, now),
  );
  const published = meetings.filter(
    (meeting) => meeting.published && isUpcomingMeeting(meeting, now),
  );
  function meetingList(rows: Row[]) {
    if (!rows.length) return <p>Встреч пока нет.</p>;
    return (
      <div className={styles["admin-list"]}>
        {rows.map((row) => (
          <div key={row.id}>
            <button
              className={styles["text-button"]}
              onClick={() => {
                setId(row.id);
                const book = books.find((item) => item.id === row.book_id);
                setForm({
                  ...initial.meetings,
                  ...(book ? toForm(book, initial.meetings) : {}),
                  ...toForm(row, initial.meetings),
                });
                setFile(null);
                setSuccess("");
                if (window.matchMedia("(max-width: 800px)").matches)
                  document
                    .getElementById("meeting-form")
                    ?.scrollIntoView({ behavior: "smooth", block: "start" });
              }}
            >
              {`${books.find((book) => book.id === row.book_id)?.title || "Книга"} · ${row.starts_at ? new Date(row.starts_at).toLocaleDateString("ru-RU") : row.is_past ? "дата не указана" : "дата уточняется"}`}
            </button>
            <div className={styles["row-actions"]}>
              {!row.published && (
                <button
                  className={styles["text-button"]}
                  disabled={busy}
                  onClick={() => {
                    setPublishError("");
                    setPublishing(row);
                  }}
                >
                  Опубликовать
                </button>
              )}
              <button
                className={[styles["text-button"], styles["danger"]].join(" ")}
                disabled={busy}
                onClick={() => void remove(row)}
              >
                Удалить
              </button>
            </div>
          </div>
        ))}
      </div>
    );
  }
  return (
    <section className={styles["admin"]}>
      <div className={styles["admin-header"]}>
        <div>
          <p className={styles["eyebrow"]}>Управление клубом</p>
          <h1 className={styles["page-title"]}>Админка</h1>
        </div>
        <button
          className={styles["outline"]}
          onClick={() => void db.auth.signOut()}
        >
          Выйти
        </button>
      </div>
      {error && (
        <p
          className={[styles["notice"], styles["error"]].join(" ")}
          role="alert"
        >
          {error}
        </p>
      )}
      {success && (
        <p className={styles["notice"]} role="status">
          {success}
        </p>
      )}
      <div className={styles["admin-grid"]}>
        <div className={styles["meetings"]}>
          <section className={styles["group"]} aria-labelledby="drafts-title">
            <h3 id="drafts-title">Неопубликованные ({drafts.length})</h3>
            {meetingList(drafts)}
          </section>
          <details className={styles["group"]}>
            <summary>Опубликованные ({published.length})</summary>
            {meetingList(published)}
          </details>
          <details className={styles["group"]}>
            <summary>Прошедшие ({past.length})</summary>
            {meetingList(past)}
          </details>
        </div>
        <div id="meeting-form" className={styles["form"]}>
          <AdminForm
            id={id}
            onNew={newMeeting}
            form={form}
            busy={busy}
            change={change}
            save={save}
            setFile={setFile}
          />
        </div>
      </div>
      {publishing && (
        <PublishDialog
          title={
            books.find((book) => book.id === publishing.book_id)?.title || ""
          }
          busy={busy}
          error={publishError}
          onCancel={() => setPublishing(null)}
          onConfirm={() => void publishMeeting()}
        />
      )}
    </section>
  );
}
