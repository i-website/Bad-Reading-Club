import styles from "./AdminForm.module.scss";
import type { FormEvent } from "react";
import { Media } from "../../components/Media";
import type { Form } from "./types";

type Props = {
  id: string;
  onNew: () => void;
  form: Form;
  busy: boolean;
  change: (name: string, value: string | boolean) => void;
  save: (event: FormEvent) => void;
  setFile: (file: File | null) => void;
};
export function AdminForm({
  id,
  onNew,
  form,
  busy,
  change,
  save,
  setFile,
}: Props) {
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
    <form className={styles["editor"]} onSubmit={save}>
      <h2>{id ? "Редактирование" : "Новая встреча"}</h2>
      {id && (
        <button type="button" className={styles["new-meeting"]} onClick={onNew}>
          Создать новую встречу
        </button>
      )}
      <>
        <h3>Книга</h3>
        {text("title", "Название", { required: true })}
        {text("author", "Автор", { required: true })}
        {text("description", "Описание", { textarea: true })}
        <label>
          Обложка{" "}
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
          />
        </label>
        {!!form.cover_path && (
          <Media
            path={String(form.cover_path)}
            alt="Текущая обложка"
            className={styles["thumb"]}
          />
        )}
      </>
      <>
        <h3>Встреча</h3>
        {text("starts_at", form.date_only ? "Дата" : "Дата и время", {
          type: form.date_only ? "date" : "datetime-local",
        })}
        {form.date_only &&
          text("meeting_time", "Время (необязательно)", { type: "time" })}
        {text("place", "Место")}
        {text("place_url", "Ссылка на место (например, 2ГИС)", {
          type: "url",
        })}
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
        {text("notes", "Примечания", { textarea: true })}
      </>
      <button disabled={busy}>{busy ? "Сохраняем…" : "Сохранить"}</button>
    </form>
  );
}
