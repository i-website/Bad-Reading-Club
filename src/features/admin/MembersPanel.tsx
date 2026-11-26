import { useEffect, useState } from "react";
import { memberFetch } from "../../lib/memberApi";
import {
  AvatarPreview,
  normalizeAvatar,
  type Avatar,
} from "../avatar/AvatarEditor";
import styles from "./Admin.module.scss";

type Member = { id: number | string; name: string; avatar: Avatar | null };

export function MembersPanel() {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    async function loadMembers() {
      try {
        const response = await memberFetch("/api/auth.php?action=members", {
          signal: controller.signal,
        });
        const result = await response.json();
        if (!response.ok)
          throw new Error(result.error || "Не удалось загрузить участников.");
        if (!controller.signal.aborted) setMembers(result.members);
      } catch (e) {
        if (!controller.signal.aborted)
          setError(
            e instanceof Error ? e.message : "Не удалось загрузить участников.",
          );
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    void loadMembers();
    return () => controller.abort();
  }, []);
  return (
    <section className={styles.members} aria-labelledby="members-title">
      <h2 id="members-title">
        Участники{!loading && !error ? ` (${members.length})` : ""}
      </h2>
      {loading && <p>Загружаем участников…</p>}
      {error && <p role="alert">{error}</p>}
      {!loading &&
        !error &&
        (members.length ? (
          <ul className={styles["member-list"]}>
            {members.map((member) => (
              <li key={member.id} className={styles["member-card"]}>
                <div className={styles["member-avatar"]} aria-hidden="true">
                  <AvatarPreview value={normalizeAvatar(member.avatar)} />
                </div>
                <span>{member.name}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p>Участников пока нет.</p>
        ))}
    </section>
  );
}
