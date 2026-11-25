import { useEffect, useRef, type ReactNode } from "react";
import styles from "./Modal.module.scss";

let lockCount = 0;
let restoreScroll: (() => void) | null = null;

function lockPage() {
  if (lockCount++ === 0) {
    const body = document.body;
    const root = document.documentElement;
    const scrollY = window.scrollY;
    const previous = {
      position: body.style.position,
      top: body.style.top,
      width: body.style.width,
      overflow: body.style.overflow,
      rootOverflow: root.style.overflow,
    };
    body.style.position = "fixed";
    body.style.top = `-${scrollY}px`;
    body.style.width = "100%";
    body.style.overflow = "hidden";
    root.style.overflow = "hidden";
    restoreScroll = () => {
      body.style.position = previous.position;
      body.style.top = previous.top;
      body.style.width = previous.width;
      body.style.overflow = previous.overflow;
      root.style.overflow = previous.rootOverflow;
      window.scrollTo(0, scrollY);
    };
  }
  return () => {
    if (--lockCount === 0) {
      restoreScroll?.();
      restoreScroll = null;
    }
  };
}

export function Modal({
  labelledBy,
  onClose,
  busy = false,
  wide = false,
  children,
}: {
  labelledBy: string;
  onClose: () => void;
  busy?: boolean;
  wide?: boolean;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    const unlock = lockPage();
    dialog.showModal();
    return () => {
      if (dialog.open) dialog.close();
      unlock();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className={`${styles.modal} ${wide ? styles.wide : ""}`}
      aria-labelledby={labelledBy}
      onCancel={(event) => {
        event.preventDefault();
        if (!busy) onClose();
      }}
    >
      {children}
    </dialog>
  );
}
