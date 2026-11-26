import styles from "./Layout.module.scss";
import { Link, NavLink } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { BrandMark } from "./BrandMark";
import { adminSession } from "../lib/contentApi";
export function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    let active = true;
    setIsAdmin(false);
    void adminSession()
      .then((session) => {
        if (active) setIsAdmin(session.authenticated);
      })
      .catch(() => {
        if (active) setIsAdmin(false);
      });
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMenuOpen(false);
        buttonRef.current?.focus();
      }
    }
    function onPointerDown(event: PointerEvent) {
      if (!menuRef.current?.contains(event.target as Node)) setMenuOpen(false);
    }
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      active = false;
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [menuOpen]);

  return (
    <>
      <header className={styles.header}>
        <Link
          to="/"
          className={styles["brand"]}
          onClick={() => setMenuOpen(false)}
        >
          <BrandMark className={styles["mark"]} />
          BAD READING CLUB
        </Link>
        <div className={styles.menu} ref={menuRef}>
          <button
            ref={buttonRef}
            type="button"
            className={styles.menuButton}
            aria-label={menuOpen ? "Закрыть меню" : "Открыть меню"}
            aria-expanded={menuOpen}
            aria-controls="main-navigation"
            onClick={() => setMenuOpen((open) => !open)}
          >
            <span aria-hidden="true" />
            <span aria-hidden="true" />
            <span aria-hidden="true" />
          </button>
          <nav
            id="main-navigation"
            className={styles.navigation}
            aria-label="Главная навигация"
            hidden={!menuOpen}
          >
            <NavLink
              to="/account"
              onClick={() => setMenuOpen(false)}
              className={({ isActive }) =>
                isActive ? styles.active : undefined
              }
            >
              Мой аккаунт
            </NavLink>
            <NavLink
              to="/"
              end
              onClick={() => setMenuOpen(false)}
              className={({ isActive }) =>
                isActive ? styles.active : undefined
              }
            >
              Главная
            </NavLink>
            <NavLink
              to="/plans"
              onClick={() => setMenuOpen(false)}
              className={({ isActive }) =>
                isActive ? styles.active : undefined
              }
            >
              Расписание
            </NavLink>
            <NavLink
              to="/ratings"
              onClick={() => setMenuOpen(false)}
              className={({ isActive }) =>
                isActive ? styles.active : undefined
              }
            >
              Рейтинг
            </NavLink>
            {isAdmin && (
              <NavLink
                to="/admin"
                onClick={() => setMenuOpen(false)}
                className={({ isActive }) =>
                  isActive ? styles.active : undefined
                }
              >
                Админка
              </NavLink>
            )}
          </nav>
        </div>
      </header>
      <main>{children}</main>
      <footer>
        <span>BAD READING CLUB</span>
        <span>Читаем, обсуждаем, встречаемся.</span>
      </footer>
    </>
  );
}
