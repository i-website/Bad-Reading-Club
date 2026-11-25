import styles from "./Admin.module.scss";
import scheduleStyles from "../../pages/Plans.module.scss";
import { useEffect, useState, type FormEvent } from "react";
import { Pencil, Trash2 } from "lucide-react";
import {
  db,
  configured,
  message,
  upload,
  removeFiles,
} from "../../lib/supabase";
import { type Book, type Meeting } from "../../types";
import { AdminForm } from "./AdminForm";
import { ConfirmDialog } from "../../components/ConfirmDialog";
import { Modal } from "../../components/Modal";
import { MembersPanel } from "./MembersPanel";
import { Media } from "../../components/Media";
import { isPlaceUrl } from "../../lib/place";
import {
  formatDate,
  formatPrice,
  isDateOnly,
  isUpcomingMeeting,
} from "../../lib/format";
import { buildSchedule } from "../../lib/schedule";
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
  const [deleting, setDeleting] = useState<Meeting | null>(null);
  const [deleteError, setDeleteError] = useState("");
  const [confirmingSave, setConfirmingSave] = useState(false);
  const [saveConfirmError, setSaveConfirmError] = useState("");
  const [mobileScreen, setMobileScreen] = useState<"list" | "editor">("list");
  const [editorVisited, setEditorVisited] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [desktop, setDesktop] = useState(
    () => window.matchMedia("(min-width: 801px)").matches,
  );
  useEffect(() => {
    const query = window.matchMedia("(min-width: 801px)");
    const update = () => setDesktop(query.matches);
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
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
  function showMobileScreen(screen: "list" | "editor") {
    setMobileScreen(screen);
    setEditorOpen(screen === "editor");
    if (window.matchMedia("(max-width: 800px)").matches) window.scrollTo(0, 0);
  }
  function openNewMeeting() {
    if (!editorVisited || id) newMeeting();
    setEditorVisited(true);
    showMobileScreen("editor");
  }
  function change(key: string, value: string | boolean) {
    setEditorVisited(true);
    setForm((f) => ({ ...f, [key]: value }));
  }
  function changeFile(value: File | null) {
    if (value) setEditorVisited(true);
    setFile(value);
  }
  async function login(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const { error } = await db.auth.signInWithPassword({ email, password });
    if (error) setError(message(error));
    setBusy(false);
  }
  function requestSave(e: FormEvent) {
    e.preventDefault();
    if (id) {
      setSaveConfirmError("");
      setConfirmingSave(true);
    } else {
      void save();
    }
  }
  async function save() {
    const editing = !!id;
    setBusy(true);
    setError("");
    setSaveConfirmError("");
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
      setEditorVisited(false);
      if (editing) {
        setConfirmingSave(false);
        showMobileScreen("list");
      } else if (desktop) {
        setEditorOpen(false);
      }
    } catch (e) {
      if (newPath && !saved)
        try {
          await removeFiles([newPath]);
        } catch {}
      if (editing) setSaveConfirmError(message(e));
      else setError(message(e));
    } finally {
      setBusy(false);
    }
  }
  async function remove(row: Row) {
    const lastMeeting =
      meetings.filter((m) => m.book_id === row.book_id).length === 1;
    setBusy(true);
    setError("");
    setDeleteError("");
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
      setDeleting(null);
    } catch (e) {
      setDeleteError(message(e));
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
  const publishedMeetings = meetings.filter((meeting) => meeting.published);
  const { nextMeetingId } = buildSchedule(
    {
      books: books.filter((book) => book.published),
      meetings: publishedMeetings,
      settings: null,
    },
    true,
    now,
  );
  function meetingList(rows: Row[]) {
    if (!rows.length) return <p>Встреч пока нет.</p>;
    return (
      <div className={styles["admin-list"]}>
        {rows.map((row) => {
          const book = books.find((item) => item.id === row.book_id);
          const title = book?.title || "Книга";
          const pastMeeting = !isUpcomingMeeting(row, now);
          const next = row.published && row.id === nextMeetingId;
          return (
            <div
              key={row.id}
              className={[
                scheduleStyles.row,
                styles["meeting-card"],
                pastMeeting ? scheduleStyles.past : "",
                next ? scheduleStyles.next : "",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              <Media
                path={book?.cover_path || null}
                alt=""
                className={`${scheduleStyles.thumb} ${styles["meeting-cover"]}`}
              />
              <div
                className={`${scheduleStyles.book} ${styles["meeting-info"]}`}
              >
                {next && (
                  <span className={scheduleStyles.badge}>
                    Следующая встреча
                  </span>
                )}
                <strong>{title}</strong>
                {book?.author && <p>{book.author}</p>}
                <div className={styles["meeting-date"]}>
                  {row.is_past && !row.starts_at
                    ? "Прошедшая встреча · дата не указана"
                    : formatDate(row.starts_at)}
                  {row.price != null && (
                    <small>Стоимость: {formatPrice(row.price)}</small>
                  )}
                </div>
              </div>
              <div className={styles["row-actions"]}>
                <button
                  type="button"
                  className={styles["icon-button"]}
                  aria-label={`Редактировать: ${title}`}
                  title="Редактировать"
                  onClick={() => {
                    if (!editorVisited || id !== row.id) {
                      setId(row.id);
                      setForm({
                        ...initial.meetings,
                        ...(book ? toForm(book, initial.meetings) : {}),
                        ...toForm(row, initial.meetings),
                      });
                      setFile(null);
                      setSuccess("");
                    }
                    setEditorVisited(true);
                    showMobileScreen("editor");
                  }}
                >
                  <Pencil size={20} aria-hidden="true" />
                </button>
                <button
                  type="button"
                  className={styles["icon-button"]}
                  aria-label={`Удалить: ${title}`}
                  title="Удалить"
                  disabled={busy}
                  onClick={() => {
                    setDeleteError("");
                    setDeleting(row);
                  }}
                >
                  <Trash2 size={20} aria-hidden="true" />
                </button>
              </div>
              {!row.published && (
                <button
                  type="button"
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
            </div>
          );
        })}
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
      {error && !(desktop && editorOpen) && (
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
      <div
        className={`${styles["admin-grid"]} ${mobileScreen === "editor" ? styles["show-editor"] : ""}`}
      >
        <div className={styles["meetings"]}>
          <button
            type="button"
            className={styles["create-meeting"]}
            onClick={openNewMeeting}
          >
            + Новая встреча
          </button>
          <details className={styles["group"]} open>
            <summary>Неопубликованные ({drafts.length})</summary>
            {meetingList(drafts)}
          </details>
          <details className={styles["group"]}>
            <summary>Опубликованные ({published.length})</summary>
            {meetingList(published)}
          </details>
          <details className={styles["group"]}>
            <summary>Прошедшие ({past.length})</summary>
            {meetingList(past)}
          </details>
        </div>
        <div className={styles["members-column"]}>
          <MembersPanel />
        </div>
        {!desktop && (
          <div id="meeting-form" className={styles["form"]}>
            <button
              type="button"
              className={styles["back-to-list"]}
              onClick={() => showMobileScreen("list")}
            >
              ← К списку встреч
            </button>
            <AdminForm
              id={id}
              form={form}
              busy={busy}
              change={change}
              save={requestSave}
              setFile={changeFile}
              file={file}
            />
          </div>
        )}
      </div>
      {desktop && editorOpen && (
        <Modal
          wide
          labelledBy="meeting-editor-title"
          busy={busy}
          onClose={() => showMobileScreen("list")}
        >
          <AdminForm
            id={id}
            form={form}
            busy={busy}
            change={change}
            save={requestSave}
            setFile={changeFile}
            file={file}
            onClose={() => showMobileScreen("list")}
            error={error}
          />
        </Modal>
      )}
      {publishing && (
        <ConfirmDialog
          title="Опубликовать встречу?"
          busy={busy}
          error={publishError}
          confirmLabel="Опубликовать"
          busyLabel="Публикуем…"
          onCancel={() => setPublishing(null)}
          onConfirm={() => void publishMeeting()}
        >
          <p>
            Встреча по книге «
            {books.find((book) => book.id === publishing.book_id)?.title || ""}»
            появится на сайте клуба.
          </p>
        </ConfirmDialog>
      )}
      {deleting && (
        <ConfirmDialog
          title="Удалить встречу?"
          busy={busy}
          error={deleteError}
          confirmLabel="Удалить"
          busyLabel="Удаляем…"
          onCancel={() => setDeleting(null)}
          onConfirm={() => void remove(deleting)}
        >
          <p>
            {meetings.filter((meeting) => meeting.book_id === deleting.book_id)
              .length === 1
              ? "Встреча и связанная с ней книга будут удалены. Это действие нельзя отменить."
              : "Встреча будет удалена. Это действие нельзя отменить."}
          </p>
        </ConfirmDialog>
      )}
      {confirmingSave && (
        <ConfirmDialog
          title="Сохранить изменения?"
          busy={busy}
          error={saveConfirmError}
          confirmLabel="Сохранить"
          busyLabel="Сохраняем…"
          onCancel={() => setConfirmingSave(false)}
          onConfirm={() => void save()}
        >
          <p>Изменения встречи и книги будут сохранены.</p>
        </ConfirmDialog>
      )}
    </section>
  );
}
