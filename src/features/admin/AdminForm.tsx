import styles from "./AdminForm.module.scss";
import { useEffect, useState, type FormEvent } from "react";
import { ImagePlus, X } from "lucide-react";
import { Media } from "../../components/Media";
import type { Form } from "./types";

type Props = {
  id: string;
  form: Form;
  busy: boolean;
  change: (name: string, value: string | boolean) => void;
  save: (event: FormEvent) => void;
  setFile: (file: File | null) => void;
  file: File | null;
  onClose?: () => void;
  error?: string;
};
export function AdminForm({
  id,
  form,
  busy,
  change,
  save,
  setFile,
  file,
  onClose,
  error,
}: Props) {
  const [preview, setPreview] = useState<{ file: File; url: string } | null>(
    null,
  );
  useEffect(() => {
    if (!file) {
      setPreview(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview({ file, url });
    return () => URL.revokeObjectURL(url);
  }, [file]);
  const text = (
    name: string,
    label: string,
    options: {
      type?: string;
      required?: boolean;
      textarea?: boolean;
      hint?: string;
    } = {},
  ) => (
    <label>
      {label}
      {options.textarea ? (
        <textarea
          value={String(form[name] || "")}
          onChange={(e) => change(name, e.target.value)}
          required={options.required}
        />
      ) : (
        <input
          type={options.type || "text"}
          value={String(form[name] || "")}
          onChange={(e) => change(name, e.target.value)}
          required={options.required}
          min={options.type === "number" ? "0" : undefined}
          max={options.type === "number" ? "5" : undefined}
          step={options.type === "number" ? "0.1" : undefined}
        />
      )}
      {options.hint && <small>{options.hint}</small>}
    </label>
  );

  return (
    <form
      className={`${styles.editor} ${onClose ? styles.modalEditor : ""}`}
      onSubmit={save}
    >
      <div className={styles.editorHeader}>
        <h2 id="meeting-editor-title">
          {id ? "Редактирование" : "Новая встреча"}
        </h2>
        {onClose && (
          <button
            type="button"
            className={styles.closeEditor}
            onClick={onClose}
            disabled={busy}
            aria-label="Закрыть редактор"
          >
            <X size={22} aria-hidden="true" />
          </button>
        )}
      </div>
      {error && (
        <p className={styles.formError} role="alert">
          {error}
        </p>
      )}
      <div className={styles["book-section"]}>
        <h3>Книга</h3>
        <div className={styles["book-fields"]}>
          <div className={styles["book-name"]}>
            {text("title", "Название", { required: true })}
            {text("author", "Автор", { required: true })}
          </div>
          <div className={styles["book-cover"]}>
            <span className={styles.coverLabel}>Обложка</span>
            <label
              className={`${styles["cover-upload"]} ${file || form.cover_path ? styles.hasCover : ""}`}
            >
              {file ? (
                preview?.file === file && (
                  <img
                    src={preview.url}
                    alt="Выбранная обложка"
                    className={styles["cover-image"]}
                  />
                )
              ) : form.cover_path ? (
                <Media
                  path={String(form.cover_path)}
                  alt="Текущая обложка"
                  className={styles["cover-image"]}
                />
              ) : (
                <>
                  <ImagePlus size={20} aria-hidden="true" />
                  <span className={styles.desktopUploadText}>Выбрать файл</span>
                  <span className={styles.mobileUploadText}>
                    Загрузить обложку
                  </span>
                </>
              )}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                aria-label={
                  file || form.cover_path
                    ? "Изменить обложку"
                    : "Загрузить обложку"
                }
                onClick={(e) => {
                  e.currentTarget.value = "";
                }}
                onChange={(e) => setFile(e.target.files?.[0] || null)}
              />
            </label>
          </div>
        </div>
        {text("description", "Описание", { textarea: true })}
      </div>
      <div className={styles["meeting-section"]}>
        <h3>Встреча</h3>
        <div className={styles["meeting-fields"]}>
          <div className={styles["date-fields"]}>
            {text("starts_at", form.date_only ? "Дата" : "Дата и время", {
              type: form.date_only ? "date" : "datetime-local",
            })}
            {form.date_only &&
              text("meeting_time", "Время (необязательно)", { type: "time" })}
          </div>
          <label>
            Стоимость, ₽ (необязательно)
            <input
              type="number"
              min="0"
              max="99999999.99"
              step="0.01"
              value={String(form.price ?? "")}
              onChange={(event) => change("price", event.target.value)}
            />
          </label>
          {text("place", "Место")}
          {text("place_url", "Ссылка на место (например, 2ГИС)", {
            type: "url",
          })}
        </div>
        {text("notes", "Примечания", { textarea: true })}
      </div>
      <div className={styles["save-actions"]}>
        <button disabled={busy}>{busy ? "Сохраняем…" : "Сохранить"}</button>
      </div>
    </form>
  );
}
