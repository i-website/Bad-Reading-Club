import { useEffect, useState } from "react";
import { ChevronDown, Users } from "lucide-react";
import { memberFetch } from "../../lib/memberApi";
import {
  AvatarPreview,
  normalizeAvatar,
  type Avatar,
} from "../avatar/AvatarEditor";
import styles from "./Admin.module.scss";

type Member = {
  id: number | string;
  name: string;
  avatar: Avatar | null;
  email: string | null;
};

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
  if (loading) return <p>Загружаем участников…</p>;
  if (error) return <p role="alert">{error}</p>;
  if (!members.length) return null;
  return (
    <section className={styles.members}>
      <div className={`${styles.groups} ${styles.membersGroups}`}>
        <details className={styles.group}>
          <summary>
            <Users size={16} aria-hidden="true" />
            <span>Участники</span>
            <span className={styles.groupCount}>
              {members.length}
            </span>
            <ChevronDown
              className={styles.groupChevron}
              size={16}
              aria-hidden="true"
            />
          </summary>
              <ul className={styles["member-list"]}>
                {members.map((member) => (
                  <li key={member.id} className={styles["member-card"]}>
                    <div className={styles["member-avatar"]} aria-hidden="true">
                      <AvatarPreview value={normalizeAvatar(member.avatar)} />
                    </div>
                    <div className={styles.memberDetails}>
                      <span>{member.name}</span>
                      <span className={styles.memberEmail}>
                        {member.email || "Email не указан"}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
        </details>
      </div>
    </section>
  );
}
