import styles from "./State.module.scss";
export function State({ error, loading }: { error: string; loading: boolean }) {
  if (loading)
    return (
      <p className={styles["notice"]} role="status">
        Загружаем данные клуба…
      </p>
    );
  if (error)
    return (
      <p className={[styles["notice"], styles["error"]].join(" ")} role="alert">
        {error}
      </p>
    );
  return null;
}
