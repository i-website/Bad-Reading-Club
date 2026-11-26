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
  LogOut,
  Pencil,
  Star,
} from "lucide-react";
import { Link } from "react-router-dom";
import { Media } from "../components/Media";
import { Modal } from "../components/Modal";
import type { Book } from "../types";
import { useRatings } from "../features/ratings/useRatings";
import { memberFetch } from "../lib/memberApi";
import {
  AvatarEditor,
  AvatarPreview,
  defaultAvatar,
  normalizeAvatar,
  type Avatar,
} from "../features/avatar/AvatarEditor";

type User = {
  id: number;
  name: string;
  avatar: Avatar | null;
};

type Session = {
  user: User | null;
  csrf: string;
  needsName?: boolean;
};

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

  if (!response.ok || !data) {
    throw new Error(
      data?.error || "Сервер аккаунтов недоступен.",
    );
  }

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
      <h2
        ref={titleRef}
        id="profile-edit-title"
        tabIndex={-1}
      >
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
    <section
      className={styles.editScreen}
      aria-labelledby="profile-edit-title"
    >
      {content}
    </section>
  ) : (
    <Modal
      labelledBy="profile-edit-title"
      busy={busy}
      onClose={onClose}
    >
      {content}
    </Modal>
  );
}

export function Account({ books }: { books: Book[] }) {
  const [session, setSession] =
    useState<Session | null>(null);

  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");

  const [stage, setStage] =
    useState<"email" | "code" | "name">("email");

  const [resendAt, setResendAt] = useState(0);
  const [clock, setClock] = useState(Date.now());

  const [name, setName] = useState("");
  const [avatarStyle, setAvatarStyle] = useState<"" | "girl" | "man">("");

  const [avatar, setAvatar] =
    useState<Avatar>(defaultAvatar);

  const [edit, setEdit] =
    useState<"name" | "avatar" | null>(null);

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const ratings = useRatings();

  useEffect(() => {
    if (stage !== "code") return;

    const timer = window.setInterval(() => {
      setClock(Date.now());
    }, 1000);

    return () => window.clearInterval(timer);
  }, [stage]);

  const remaining = Math.max(
    0,
    Math.ceil((resendAt - clock) / 1000),
  );

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

  function restartLogin() {
    setStage("email");
    setCode("");
    setName("");
    setError("");
    setResendAt(0);
  }

  async function sendCode() {
    if (!session || busy) return;

    setError("");
    setBusy(true);

    const normalizedEmail = email
      .trim()
      .toLowerCase();

    try {
      await request(
        "request-code",
        session.csrf,
        {
          email: normalizedEmail,
        },
      );

      setEmail(normalizedEmail);
      setCode("");
      const now = Date.now();
      setClock(now);
      setResendAt(now + 60_000);
      setStage("code");
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Не удалось отправить код.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function login(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (!session || busy) return;

    if (stage === "email") {
      await sendCode();
      return;
    }

    if (
      stage === "code" &&
      !/^[0-9]{6}$/.test(code)
    ) {
      setError("Введите шестизначный код.");
      return;
    }

    if (stage === "name" && !name.trim()) {
      setError("Укажите ваше имя.");
      return;
    }

    setError("");
    setBusy(true);

    try {
      const result =
        stage === "code"
          ? await request(
              "verify-code",
              session.csrf,
              {
                email,
                code,
              },
            )
          : await request(
              "complete-registration",
              session.csrf,
              {
                name: name.trim(),
                avatarStyle,
              },
            );

      setSession(result);
      setCode("");

      if (result.needsName) {
        setName("");
        setStage("name");
      } else if (result.user) {
        setStage("email");
        setResendAt(0);

        await ratings.refresh();
      }
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Не удалось продолжить.",
      );
    } finally {
      setBusy(false);
    }
  }

  function openEdit(target: "name" | "avatar") {
    if (!session?.user) return;

    setName(session.user.name);
    setAvatar(
      normalizeAvatar(session.user.avatar),
    );
    setError("");
    setEdit(target);
  }

  async function saveProfile(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (!session?.user || !edit) return;

    setError("");
    setBusy(true);

    try {
      const payload = {
        name:
          edit === "name"
            ? name
            : session.user.name,

        avatar:
          edit === "avatar"
            ? normalizeAvatar(avatar)
            : normalizeAvatar(
                session.user.avatar,
              ),
      };

      setSession(
        await request(
          "profile",
          session.csrf,
          payload,
        ),
      );

      setEdit(null);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Не удалось сохранить профиль.",
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

      setEmail("");
      setCode("");
      setName("");
      setStage("email");
      setResendAt(0);

      await ratings.refresh();
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Не удалось выйти.",
      );
    } finally {
      setBusy(false);
    }
  }

  if (edit === "avatar") {
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
        onSave={(event) =>
          void saveProfile(event)
        }
      >
        <AvatarEditor
          value={avatar}
          onChange={setAvatar}
        />
      </EditScreen>
    );
  }

  return (
    <section className={!session?.user ? styles.authScreen : undefined}>
      {!session?.user && (
        <h1 className={styles.authTitle}>
          {stage === "name"
            ? "Регистрация"
            : stage === "code"
              ? "Подтверждение почты"
              : "Войти"}
        </h1>
      )}

      {loading && <p>Загружаем…</p>}

      {error && !edit && (session?.user || !session) && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}

      {session?.user ? (
        <>
          <p className={styles.breadcrumb}>
            Личный кабинет / Мой профиль
          </p>

          <div className={styles.profile}>
            <div className={styles.avatar}>
              <AvatarPreview
                value={
                  session.user.avatar ??
                  defaultAvatar
                }
              />

              <button
                type="button"
                className={styles.avatarButton}
                onClick={() => openEdit("avatar")}
                aria-label="Изменить аватарку"
              >
                <Camera
                  size={19}
                  aria-hidden="true"
                />
              </button>
            </div>

            <h1 className={styles.name}>
              {session.user.name}
            </h1>

            <p className={styles.member}>
              Участник Bad Reading Club
            </p>

            <button
              type="button"
              className={styles.editName}
              onClick={() => openEdit("name")}
            >
              <Pencil
                size={16}
                aria-hidden="true"
              />
              Изменить имя
            </button>
          </div>

          <section
            className={styles.reviews}
            aria-labelledby="my-reviews-title"
          >
            <h2 id="my-reviews-title">
              <BookOpen
                size={19}
                aria-hidden="true"
              />
              Мои оценки и отзывы
            </h2>

            {ratings.loading && (
              <p>Загружаем оценки…</p>
            )}

            {ratings.error && (
              <p role="alert">
                {ratings.error}
              </p>
            )}

            {ratings.data &&
              ratings.data.mine.length === 0 && (
                <p>
                  Здесь появятся ваши оценки и
                  отзывы о книгах.
                </p>
              )}

            {ratings.data &&
              ratings.data.mine.length > 0 && (
                <ul className={styles.ratingList}>
                  {ratings.data.mine.map(
                    (item) => {
                      const book = books.find(
                        (entry) =>
                          entry.id ===
                          item.book_id,
                      );

                      return book ? (
                        <li key={item.book_id}>
                          <Link
                            className={
                              styles.ratingCard
                            }
                            to={`/books/${book.id}`}
                          >
                            <Media
                              path={book.cover_path}
                              alt=""
                              className={
                                styles.ratingCover
                              }
                            />

                            <div
                              className={
                                styles.ratingDetails
                              }
                            >
                              <strong>
                                {book.title}
                              </strong>

                              <span
                                className={
                                  styles.ratingAuthor
                                }
                              >
                                {book.author}
                              </span>

                              {item.review && (
                                <p
                                  className={
                                    styles.reviewText
                                  }
                                >
                                  {item.review}
                                </p>
                              )}
                            </div>

                            <span
                              className={
                                styles.ratingScore
                              }
                            >
                              <Star
                                size={17}
                                aria-hidden="true"
                              />

                              {item.score}{" "}
                              <span>/ 10</span>
                            </span>
                          </Link>
                        </li>
                      ) : null;
                    },
                  )}
                </ul>
              )}
          </section>

          <button
            className={styles.logout}
            type="button"
            disabled={busy}
            onClick={() => void logout()}
          >
            <LogOut
              size={17}
              aria-hidden="true"
            />
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
              onSave={(event) =>
                void saveProfile(event)
              }
            >
              <label>
                Имя

                <input
                  autoFocus
                  autoComplete="name"
                  required
                  maxLength={80}
                  value={name}
                  onChange={(event) =>
                    setName(event.target.value)
                  }
                />
              </label>
            </EditScreen>
          )}
        </>
      ) : (
        session && (
          <>
            <p className={stage === "code" ? styles.codeIntro : undefined}>
              {stage === "email"
                ? "Войдите или зарегистрируйтесь по электронной почте."
                : stage === "code"
                  ? `Введите шестизначный код, отправленный на ${email}.`
                  : "Как к вам обращаться?"}
            </p>

            <form
              className={`${styles.form} ${styles.loginForm}`}
              onSubmit={(event) =>
                void login(event)
              }
            >
              {stage === "email" && (
                <label>
                  Электронная почта

                  <input
                    type="email"
                    aria-invalid={!!error}
                    autoComplete="email"
                    required
                    maxLength={254}
                    value={email}
                    disabled={busy}
                    onChange={(event) =>
                      setEmail(
                        event.target.value,
                      )
                    }
                  />
                  {error && <span className={styles.fieldError} role="alert">{error}</span>}
                </label>
              )}

              {stage === "code" && (
                <label>
                  <span className={styles.codeFields}>
                    {Array.from({ length: 6 }, (_, index) => (
                      <span key={index} className={styles.codeCell} aria-hidden="true">
                        {code[index] || ""}
                      </span>
                    ))}
                  <input
                    className={styles.codeInput}
                    aria-invalid={!!error}
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    pattern="[0-9]{6}"
                    required
                    autoFocus
                    maxLength={6}
                    value={code}
                    disabled={busy}
                    onChange={(event) =>
                      setCode(
                        event.target.value
                          .replace(/[^0-9]/g, "")
                          .slice(0, 6),
                      )
                    }
                  />
                  </span>

                  {error && <span className={styles.fieldError} role="alert">{error}</span>}

                  <span
                    className={styles.codeHint}
                  >
                    Код действителен 10 минут.
                  </span>
                </label>
              )}

              {stage === "name" && (<>
                <label>
                  Имя

                  <input
                    autoComplete="name"
                    aria-invalid={!!error}
                    required
                    autoFocus
                    maxLength={80}
                    value={name}
                    disabled={busy}
                    onChange={(event) =>
                      setName(
                        event.target.value,
                      )
                    }
                  />
                  {error && <span className={styles.fieldError} role="alert">{error}</span>}
                </label>
                <label>
                  Пол
                  <select required value={avatarStyle} disabled={busy}
                    onChange={(event) => setAvatarStyle(event.target.value as "" | "girl" | "man")}>
                    <option value="">Выберите пол</option>
                    <option value="girl">Женский</option>
                    <option value="man">Мужской</option>
                  </select>
                </label>
              </>)}

              <button
                disabled={busy}
                type="submit"
              >
                {busy
                  ? "Подождите…"
                  : stage === "email"
                    ? "Получить код"
                    : stage === "code"
                      ? "Продолжить"
                      : "Создать аккаунт"}
              </button>

              {stage === "code" && (
                <button
                  className={styles.secondary}
                  type="button"
                  disabled={
                    busy || remaining > 0
                  }
                  onClick={() => void sendCode()}
                >
                  {remaining > 0
                    ? `Отправить повторно через ${remaining} сек.`
                    : "Отправить код повторно"}
                </button>
              )}

              {stage !== "email" && (
                <button
                  className={styles.authBack}
                  type="button"
                  disabled={busy}
                  onClick={restartLogin}
                >
                  Изменить электронную почту
                </button>
              )}
            </form>
          </>
        )
      )}
    </section>
  );
}
