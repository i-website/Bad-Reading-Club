import { useEffect, useRef } from "react";
import styles from "./PublishDialog.module.scss";

type Props = {
  title: string;
  busy: boolean;
  error: string;
  onCancel: () => void;
  onConfirm: () => void;
};

export function PublishDialog({
  title,
  busy,
  error,
  onCancel,
  onConfirm,
}: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const element = dialog.current;
    element?.showModal();
    return () => {
      if (element?.open) element.close();
    };
  }, []);
  return (
    <dialog
      ref={dialog}
      className={styles.dialog}
      aria-labelledby="publish-title"
      onCancel={(event) => {
        event.preventDefault();
        if (!busy) onCancel();
      }}
    >
      <h2 id="publish-title">Опубликовать встречу?</h2>
      <p>Встреча по книге «{title}» появится на сайте клуба.</p>
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
      <div className={styles.actions}>
        <button
          type="button"
          className={styles.cancel}
          onClick={onCancel}
          disabled={busy}
        >
          Отмена
        </button>
        <button type="button" onClick={onConfirm} disabled={busy}>
          {busy ? "Публикуем…" : "Опубликовать"}
        </button>
      </div>
    </dialog>
  );
}
