import styles from "./Layout.module.scss";
import { Link, NavLink } from "react-router-dom";
import { demoMode } from "../lib/supabase";
import { resetDemo } from "../lib/demo";
import type { Settings } from "../types";
export function Layout({
  children,
  settings,
}: {
  children: React.ReactNode;
  settings: Settings | null;
}) {
  return (
    <>
      {demoMode && (
        <div className={styles["demo-banner"]}>
          Деморежим: данные и встреча приведены для примера и хранятся только в
          этом браузере.{" "}
          <button type="button" onClick={resetDemo}>
            Сбросить демоданные
          </button>
        </div>
      )}
      <header>
        <Link to="/" className={styles["brand"]}>
          <span className={styles["mark"]}>✳</span>
          {settings?.name || "BAD READING CLUB"}
        </Link>
        <nav aria-label="Главная навигация">
          <NavLink
            to="/"
            end
            className={({ isActive }) => (isActive ? styles.active : undefined)}
          >
            Главная
          </NavLink>
          <NavLink
            to="/plans"
            className={({ isActive }) => (isActive ? styles.active : undefined)}
          >
            Планы
          </NavLink>
          <NavLink
            to="/ratings"
            className={({ isActive }) => (isActive ? styles.active : undefined)}
          >
            Рейтинг
          </NavLink>
          <NavLink
            to="/admin"
            className={({ isActive }) => (isActive ? styles.active : undefined)}
          >
            Админка
          </NavLink>
        </nav>
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
