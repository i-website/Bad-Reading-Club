import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import styles from "./Account.module.scss";
import {
  BookOpen,
  Camera,
  Eye,
  EyeOff,
  LogOut,
  Pencil,
  Star,
} from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { Media } from "../components/Media";
import { Modal } from "../components/Modal";
import type { Book } from "../types";
import { useRatings } from "../features/ratings/useRatings";
import {
  DEMO_MEMBER_EMAIL,
  DEMO_MEMBER_PASSWORD,
  memberFetch,
} from "../lib/memberApi";
import { demoMode } from "../lib/supabase";
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
    response = await memberFetch(
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
  useEffect(() => {
    if (!isAvatar) return;
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
    <Modal labelledBy="profile-edit-title" busy={busy} onClose={onClose}>
      {content}
    </Modal>
  );
}

export function Account({ books }: { books: Book[] }) {
  const [session, setSession] = useState<Session | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const registering = searchParams.get("register") === "1";
  const [email, setEmail] = useState(demoMode ? DEMO_MEMBER_EMAIL : "");
  const [password, setPassword] = useState(
    demoMode ? DEMO_MEMBER_PASSWORD : "",
  );
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [name, setName] = useState("");
  const [avatar, setAvatar] = useState<Avatar>(defaultAvatar);
  const [edit, setEdit] = useState<"name" | "avatar" | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const ratings = useRatings();
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
    if (registering && password !== confirmPassword) {
      setError("Пароли не совпадают.");
      return;
    }
    setError("");
    setBusy(true);
    try {
      setSession(
        await request(registering ? "register" : "login", session.csrf, {
          email,
          password,
          name,
        }),
      );
      if (registering) setSearchParams({}, { replace: true });
      await ratings.refresh();
      setPassword("");
      setConfirmPassword("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось продолжить.");
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
      setPassword(demoMode ? DEMO_MEMBER_PASSWORD : "");
      await ratings.refresh();
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
    <section>
      {!session?.user && <h1>{registering ? "Регистрация" : "Войти"}</h1>}
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
            {ratings.loading && <p>Загружаем оценки…</p>}
            {ratings.error && <p role="alert">{ratings.error}</p>}
            {ratings.data && ratings.data.mine.length === 0 && (
              <p>Здесь появятся ваши оценки и отзывы о книгах.</p>
            )}
            {ratings.data && ratings.data.mine.length > 0 && (
              <ul className={styles.ratingList}>
                {ratings.data.mine.map((item) => {
                  const book = books.find((entry) => entry.id === item.book_id);
                  return book ? (
                    <li key={item.book_id}>
                      <Link
                        className={styles.ratingCard}
                        to={`/books/${book.slug}`}
                      >
                        <Media
                          path={book.cover_path}
                          alt=""
                          className={styles.ratingCover}
                        />
                        <div className={styles.ratingDetails}>
                          <strong>{book.title}</strong>
                          <span className={styles.ratingAuthor}>
                            {book.author}
                          </span>
                          {item.review && (
                            <p className={styles.reviewText}>{item.review}</p>
                          )}
                        </div>
                        <span className={styles.ratingScore}>
                          <Star size={17} aria-hidden="true" /> {item.score}{" "}
                          <span>/ 10</span>
                        </span>
                      </Link>
                    </li>
                  ) : null;
                })}
              </ul>
            )}
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
            <p>
              {registering
                ? "Создайте аккаунт участника клуба."
                : "Войдите с email и паролем."}
            </p>
            <form
              className={`${styles.form} ${styles.loginForm}`}
              onSubmit={(event) => void login(event)}
            >
              {registering && (
                <label>
                  Имя
                  <input
                    autoComplete="name"
                    required
                    maxLength={80}
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                  />
                </label>
              )}
              <label>
                Email
                <input
                  type="email"
                  autoComplete="email"
                  required
                  maxLength={254}
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                />
              </label>
              <label>
                Пароль
                <span className={styles.passwordField}>
                  <input
                    type={showPassword ? "text" : "password"}
                    autoComplete={
                      registering ? "new-password" : "current-password"
                    }
                    required
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                  />
                  <button
                    type="button"
                    className={styles.passwordToggle}
                    aria-label={
                      showPassword ? "Скрыть пароль" : "Показать пароль"
                    }
                    aria-pressed={showPassword}
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </span>
              </label>
              {registering && (
                <label>
                  Подтвердите пароль
                  <span className={styles.passwordField}>
                    <input
                      type={showConfirmation ? "text" : "password"}
                      autoComplete="new-password"
                      required
                      value={confirmPassword}
                      onChange={(event) =>
                        setConfirmPassword(event.target.value)
                      }
                    />
                    <button
                      type="button"
                      className={styles.passwordToggle}
                      aria-label={
                        showConfirmation
                          ? "Скрыть подтверждение пароля"
                          : "Показать подтверждение пароля"
                      }
                      aria-pressed={showConfirmation}
                      onClick={() => setShowConfirmation(!showConfirmation)}
                    >
                      {showConfirmation ? (
                        <EyeOff size={20} />
                      ) : (
                        <Eye size={20} />
                      )}
                    </button>
                  </span>
                </label>
              )}
              <button disabled={busy} type="submit">
                {registering ? "Зарегистрироваться" : "Войти"}
              </button>
            </form>
            <p>
              <Link
                className={styles.authLink}
                to={registering ? "/account" : "/account?register=1"}
                onClick={() => {
                  setError("");
                  setPassword("");
                  setConfirmPassword("");
                  setShowPassword(false);
                  setShowConfirmation(false);
                }}
              >
                {registering
                  ? "Уже есть аккаунт? Войти"
                  : "Ещё нет аккаунта? Зарегистрироваться"}
              </Link>
            </p>
          </>
        )
      )}
    </section>
  );
}
