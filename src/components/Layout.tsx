import styles from "./Layout.module.scss";
import { Link, NavLink } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import type { Settings } from "../types";
export function Layout({
  children,
  settings,
}: {
  children: React.ReactNode;
  settings: Settings | null;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [headerHidden, setHeaderHidden] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (menuOpen) {
      setHeaderHidden(false);
      return;
    }
    let lastPosition = Math.max(0, window.scrollY);
    let frame = 0;
    function onScroll() {
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        const position = Math.max(0, window.scrollY);
        const distance = position - lastPosition;
        if (position <= 20) {
          setHeaderHidden(false);
          lastPosition = position;
        } else if (Math.abs(distance) >= 8) {
          setHeaderHidden(distance > 0 && position > 90);
          lastPosition = position;
        }
      });
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [menuOpen]);

  useEffect(() => {
    if (!menuOpen) return;
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
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [menuOpen]);

  return (
    <>
      <header
        className={[styles.header, headerHidden ? styles.hidden : ""]
          .filter(Boolean)
          .join(" ")}
        onFocusCapture={() => setHeaderHidden(false)}
      >
        <Link
          to="/"
          className={styles["brand"]}
          onClick={() => setMenuOpen(false)}
        >
          <svg
            className={styles["mark"]}
            viewBox="0 0 220 140"
            aria-hidden="true"
            focusable="false"
          >
            <g fill="currentColor">
              <path d="M0 45l91 48-8 19L0 77z" />
              <path d="M46 0h33l31 64L142 0h33l-50 110H95z" />
              <path d="M220 45v32l-83 35-8-19z" />
              <path d="M72 90h76l15 22H57z" />
              <path d="M0 105h220v34H0z" />
            </g>
          </svg>
          {settings?.name || "BAD READING CLUB"}
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
          </nav>
        </div>
      </header>
      <main>{children}</main>
      <footer>
        <span>BAD READING CLUB</span>
        <span>Читаем, обсуждаем, встречаемся.</span>
        <div>
          {settings?.links?.map((l) => (
            <a key={l.url} href={l.url} target="_blank" rel="noreferrer">
              {l.label}
            </a>
          ))}
        </div>
      </footer>
    </>
  );
}
