import { useId, type ReactNode } from "react";
import { Modal } from "./Modal";
import styles from "./ConfirmDialog.module.scss";

export function ConfirmDialog({
  title,
  children,
  busy,
  error,
  confirmLabel,
  busyLabel,
  onCancel,
  onConfirm,
}: {
  title: string;
  children: ReactNode;
  busy: boolean;
  error: string;
  confirmLabel: string;
  busyLabel: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const titleId = useId();
  return (
    <Modal labelledBy={titleId} busy={busy} onClose={onCancel}>
      <h2 id={titleId}>{title}</h2>
      {children}
      {error && <p role="alert">{error}</p>}
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
          {busy ? busyLabel : confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
