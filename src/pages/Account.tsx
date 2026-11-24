import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import styles from "./Account.module.scss";
import { BookOpen, Camera, LogOut, Pencil } from "lucide-react";
import {
  AvatarEditor,
  AvatarPreview,
  defaultAvatar,
  normalizeAvatar,
  type Avatar,
} from "../features/avatar/AvatarEditor";

type User = { id: number; name: string; avatar: Avatar | null };
type Session = { user: User | null; csrf: string };

async function request(
  action: string,
  csrf?: string,
  body?: object,
): Promise<Session> {
  let response: Response;
  try {
    response = await fetch(
      `/api/auth.php?action=${action}`,
      csrf
        ? {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-CSRF-Token": csrf,
            },
            body: JSON.stringify(body ?? {}),
            credentials: "same-origin",
          }
        : { credentials: "same-origin" },
    );
  } catch {
    throw new Error(
      "Не удалось подключиться к серверу аккаунтов. Убедитесь, что PHP-сервер запущен.",
    );
  }
  const data = await response.json().catch(() => null);
  if (!response.ok || !data)
    throw new Error(data?.error || "Сервер аккаунтов недоступен.");
  return data as Session;
}

function EditScreen({
  title,
  busy,
  error,
  onClose,
  onSave,
  children,
  isAvatar,
}: {
  title: string;
  busy: boolean;
  error: string;
  onClose: () => void;
  onSave: (event: FormEvent<HTMLFormElement>) => void;
  children: ReactNode;
  isAvatar: boolean;
}) {
  const titleRef = useRef<HTMLHeadingElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog) {
      dialog.showModal();
      return () => {
        if (dialog.open) dialog.close();
      };
    }
    const oldScroll = window.scrollY;
    window.scrollTo(0, 0);
    titleRef.current?.focus({ preventScroll: true });
    return () => {
      window.scrollTo(0, oldScroll);
    };
  }, [isAvatar]);
  const content = (
    <>
      <h2 ref={titleRef} id="profile-edit-title" tabIndex={-1}>
        {title}
      </h2>
      <form className={styles.form} onSubmit={onSave}>
        {children}
        {error && (
          <p className={styles.error} role="alert">
            {error}
          </p>
        )}
        <div className={styles.actions}>
          <button
            type="button"
            className={styles.secondary}
            onClick={onClose}
            disabled={busy}
          >
            Отмена
          </button>
          <button type="submit" disabled={busy}>
            {busy ? "Сохраняем…" : "Сохранить"}
          </button>
        </div>
      </form>
    </>
  );
  return isAvatar ? (
    <section className={styles.editScreen} aria-labelledby="profile-edit-title">
      {content}
    </section>
  ) : (
    <dialog
      ref={dialogRef}
      className={styles.nameDialog}
      aria-labelledby="profile-edit-title"
      onCancel={(event) => {
        event.preventDefault();
        if (!busy) onClose();
      }}
    >
      {content}
    </dialog>
  );
}

export function Account() {
  const [session, setSession] = useState<Session | null>(null);
  const [token, setToken] = useState("");
  const [name, setName] = useState("");
  const [avatar, setAvatar] = useState<Avatar>(defaultAvatar);
  const [edit, setEdit] = useState<"name" | "avatar" | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    let active = true;
    request("session")
      .then((value) => {
        if (active) setSession(value);
      })
      .catch((e: Error) => {
        if (active) setError(e.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);
  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session) return;
    setError("");
    setBusy(true);
    try {
      setSession(await request("login", session.csrf, { token }));
      setToken("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось войти.");
    } finally {
      setBusy(false);
    }
  }
  function openEdit(target: "name" | "avatar") {
    if (!session?.user) return;
    setName(session.user.name);
    setAvatar(normalizeAvatar(session.user.avatar));
    setError("");
    setEdit(target);
  }
  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session?.user || !edit) return;
    setError("");
    setBusy(true);
    try {
      const payload = {
        name: edit === "name" ? name : session.user.name,
        avatar:
          edit === "avatar"
            ? normalizeAvatar(avatar)
            : normalizeAvatar(session.user.avatar),
      };
      setSession(await request("profile", session.csrf, payload));
      setEdit(null);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Не удалось сохранить профиль.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function logout() {
    if (!session) return;
    setError("");
    setBusy(true);
    try {
      await request("logout", session.csrf);
      setSession(await request("session"));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось выйти.");
    } finally {
      setBusy(false);
    }
  }
  if (edit === "avatar")
    return (
      <EditScreen
        title="Изменить аватарку"
        isAvatar
        busy={busy}
        error={error}
        onClose={() => {
          setEdit(null);
          setError("");
        }}
        onSave={(event) => void saveProfile(event)}
      >
        <AvatarEditor value={avatar} onChange={setAvatar} />
      </EditScreen>
    );

  return (
    <section className={styles.account}>
      {!session?.user && <h1>Войти</h1>}
      {loading && <p>Загружаем…</p>}
      {error && !edit && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
      {session?.user ? (
        <>
          <p className={styles.breadcrumb}>Личный кабинет / Мой профиль</p>
          <div className={styles.profile}>
            <div className={styles.avatar}>
              <AvatarPreview value={session.user.avatar ?? defaultAvatar} />
              <button
                type="button"
                className={styles.avatarButton}
                onClick={() => openEdit("avatar")}
                aria-label="Изменить аватарку"
              >
                <Camera size={19} aria-hidden="true" />
              </button>
            </div>
            <h1 className={styles.name}>{session.user.name}</h1>
            <p className={styles.member}>Участник Bad Reading Club</p>
            <button
              type="button"
              className={styles.editName}
              onClick={() => openEdit("name")}
            >
              <Pencil size={16} aria-hidden="true" />
              Изменить имя
            </button>
          </div>
          <section
            className={styles.reviews}
            aria-labelledby="my-reviews-title"
          >
            <h2 id="my-reviews-title">
              <BookOpen size={19} aria-hidden="true" />
              Мои оценки и отзывы
            </h2>
            <p>Здесь появятся ваши оценки и отзывы о книгах.</p>
          </section>
          <button
            className={styles.logout}
            type="button"
            disabled={busy}
            onClick={() => void logout()}
          >
            <LogOut size={17} aria-hidden="true" />
            Выйти
          </button>
          {edit === "name" && (
            <EditScreen
              title="Изменить имя"
              isAvatar={false}
              busy={busy}
              error={error}
              onClose={() => {
                setEdit(null);
                setError("");
              }}
              onSave={(event) => void saveProfile(event)}
            >
              <label>
                Имя
                <input
                  autoFocus
                  autoComplete="name"
                  required
                  maxLength={80}
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                />
              </label>
            </EditScreen>
          )}
        </>
      ) : (
        session && (
          <>
            <p>Введите токен, который выдал администратор клуба.</p>
            <form
              className={styles.form}
              onSubmit={(event) => void login(event)}
            >
              <label>
                Токен
                <input
                  type="password"
                  autoComplete="off"
                  required
                  value={token}
                  onChange={(event) => setToken(event.target.value)}
                />
              </label>
              <button disabled={busy} type="submit">
                Войти
              </button>
            </form>
          </>
        )
      )}
    </section>
  );
}
