import { lazy, Suspense, useEffect, useState } from "react";
import { Route, Routes, useLocation } from "react-router-dom";
import { configured, db, message } from "../lib/supabase";
import type { ClubData as Data, Book, Meeting, Settings } from "../types";
import { Layout } from "../components/Layout";
import { State } from "../components/State";
import { Home } from "../pages/Home";
import { Plans } from "../pages/Plans";
import { BookPage } from "../pages/BookPage";
import { MeetingPage } from "../pages/MeetingPage";
import { RatingsPage } from "../pages/RatingsPage";
import { Account } from "../pages/Account";
const Admin = lazy(() => import("../features/admin/Admin"));
const blank: Data = {
  books: [],
  meetings: [],
  settings: null,
};
export default function App() {
  const location = useLocation();
  const [data, setData] = useState<Data>(blank);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    if (!configured) {
      setError(
        "Подключение к базе ещё не настроено. Укажите параметры Supabase в окружении.",
      );
      setLoading(false);
      return;
    }
    let active = true;
    async function load() {
      try {
        const results = await Promise.all([
          db.from("books").select("*").eq("published", true),
          db.from("meetings").select("*").eq("published", true),
          db.from("club_settings").select("*").maybeSingle(),
        ]);
        for (const r of results) if (r.error) throw r.error;
        if (active)
          setData({
            books: results[0].data as Book[],
            meetings: results[1].data as Meeting[],
            settings: results[2].data as Settings | null,
          });
      } catch (e) {
        if (active)
          setError(
            `Не удалось загрузить данные клуба. Проверьте соединение. ${message(e)}`,
          );
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, [location.pathname]);
  return (
    <Layout settings={data.settings}>
      <Routes>
        <Route path="/account" element={<Account />} />
        <Route
          path="/admin/*"
          element={
            <Suspense fallback={<p>Загружаем админку…</p>}>
              <Admin />
            </Suspense>
          }
        />
        <Route
          path="*"
          element={
            <>
              <State loading={loading} error={error} />
              {!loading && !error && (
                <Routes>
                  <Route path="/" element={<Home data={data} />} />
                  <Route path="/plans" element={<Plans data={data} />} />
                  <Route
                    path="/ratings"
                    element={<RatingsPage data={data} />}
                  />
                  <Route
                    path="/books/:slug"
                    element={<BookPage data={data} />}
                  />
                  <Route
                    path="/meetings/:id"
                    element={<MeetingPage data={data} />}
                  />
                  <Route path="*" element={<p>Страница не найдена.</p>} />
                </Routes>
              )}
            </>
          }
        />
      </Routes>
    </Layout>
  );
}
