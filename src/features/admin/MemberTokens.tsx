import { useState, type FormEvent } from "react";
import styles from "./MemberTokens.module.scss";

const adminKeyStorage = "brc-admin-key";

export function MemberTokens() {
  const [name, setName] = useState("");
  const [adminKey, setAdminKey] = useState(() => {
    try {
      return localStorage.getItem(adminKeyStorage) || "";
    } catch {
      return "";
    }
  });
  const [token, setToken] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function issue(event: FormEvent) {
    event.preventDefault();
    setError("");
    setToken("");
    setBusy(true);
    try {
      const sessionResponse = await fetch("/api/auth.php?action=session");
      if (!sessionResponse.ok) throw new Error("Сервер аккаунтов недоступен.");
      const session = await sessionResponse.json();
      const response = await fetch("/api/auth.php?action=issue", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-Token": session.csrf,
        },
        body: JSON.stringify({ name, adminKey }),
      });
      const result = await response.json();
      if (!response.ok)
        throw new Error(result.error || "Не удалось создать токен.");
      setToken(result.token);
      setName("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось создать токен.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className={styles.tokens}>
      <h2>Токены участников</h2>
      <form onSubmit={(event) => void issue(event)}>
        <label>
          Имя участника
          <input
            required
            maxLength={80}
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </label>
        <label>
          Ключ администратора
          <input
            type="password"
            autoComplete="off"
            required
            value={adminKey}
            onChange={(event) => {
              const value = event.target.value;
              setAdminKey(value);
              try {
                if (value) localStorage.setItem(adminKeyStorage, value);
                else localStorage.removeItem(adminKeyStorage);
              } catch {
                // The key remains available for this session if storage is blocked.
              }
            }}
          />
        </label>
        <button disabled={busy} type="submit">
          Создать токен
        </button>
      </form>
      {error && <p role="alert">{error}</p>}
      {token && (
        <div>
          <p>
            Передайте этот токен участнику. Он показывается только один раз.
          </p>
          <code className={styles.token}>{token}</code>
        </div>
      )}
    </div>
  );
}
