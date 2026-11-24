import { useCallback, useEffect, useState } from "react";
import { memberFetch } from "../../lib/memberApi";

export type RatingsData = {
  ratings: {
    book_id: string;
    votes: number | string;
    total: number | string;
  }[];
  mine: { book_id: string; score: number | string; review: string | null }[];
  signedIn: boolean;
  csrf: string;
};

export function useRatings() {
  const [data, setData] = useState<RatingsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const refresh = useCallback(async () => {
    try {
      const response = await memberFetch("/api/auth.php?action=ratings", {
        credentials: "same-origin",
        cache: "no-store",
      });
      if (!response.ok) throw new Error();
      setData((await response.json()) as RatingsData);
      setError("");
    } catch {
      setError("Не удалось загрузить оценки. Проверьте подключение к серверу.");
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    void refresh();
  }, [refresh]);
  async function rate(bookId: string, score: number, review: string) {
    if (!data) throw new Error("Оценки пока не загрузились.");
    const response = await memberFetch("/api/auth.php?action=rate", {
      method: "POST",
      credentials: "same-origin",
      headers: {
        "Content-Type": "application/json",
        "X-CSRF-Token": data.csrf,
      },
      body: JSON.stringify({ bookId, score, review }),
    });
    const result = await response.json().catch(() => null);
    if (!response.ok)
      throw new Error(result?.error || "Не удалось сохранить оценку.");
    await refresh();
  }
  return { data, loading, error, refresh, rate };
}
