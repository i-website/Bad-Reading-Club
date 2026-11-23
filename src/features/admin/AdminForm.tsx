import styles from "./AdminForm.module.scss";
import type { ChangeEvent, FormEvent } from "react";
import { Media } from "../../components/Media";
import { statuses, type Photo } from "../../types";
import type { Tab, Form } from "./types";

type Props = {
  tab: Tab;
  id: string;
  form: Form;
  photos: Photo[];
  busy: boolean;
  change: (name: string, value: string | boolean) => void;
  save: (event: FormEvent) => void;
  setFile: (file: File | null) => void;
  addPhoto: (event: ChangeEvent<HTMLInputElement>) => void;
  deletePhoto: (photo: Photo) => void;
};
export function AdminForm({
  tab,
  id,
  form,
  photos,
  busy,
  change,
  save,
  setFile,
  addPhoto,
  deletePhoto,
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
      <h2>
        {tab === "settings"
          ? "Настройки"
          : id
            ? "Редактирование"
            : "Новая запись"}
      </h2>
      {tab === "meetings" && (
        <>
          <h3>Книга</h3>
          {text("title", "Название", { required: true })}
          {text("author", "Автор", { required: true })}
          <label>
            Статус
            <select
              value={String(form.status)}
              onChange={(e) => change("status", e.target.value)}
            >
              {Object.entries(statuses).map(([k, v]) => (
                <option value={k} key={k}>
                  {v}
                </option>
              ))}
            </select>
          </label>
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
      )}
      {tab === "meetings" && (
        <>
          <h3>Встреча</h3>
          {text("starts_at", "Дата и время", { type: "datetime-local" })}
          {text("place", "Место")}
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
          {id && (
            <div>
              <label>
                Добавить фотографию
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(e) => void addPhoto(e)}
                  disabled={busy}
                />
              </label>
              <div className={styles["photo-admin"]}>
                {photos
                  .filter((p) => p.meeting_id === id)
                  .map((p) => (
                    <div key={p.id}>
                      <Media
                        path={p.storage_path}
                        alt="Фото встречи"
                        className={styles["thumb"]}
                      />
                      <button
                        type="button"
                        className={[
                          styles["text-button"],
                          styles["danger"],
                        ].join(" ")}
                        onClick={() => void deletePhoto(p)}
                      >
                        Удалить фото
                      </button>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </>
      )}
      {tab === "settings" && (
        <>
          {text("name", "Название", { required: true })}
          {text("description", "Описание", { textarea: true })}
          {text("links", "Публичные ссылки", {
            textarea: true,
            hint: "По одной в строке: название | https://адрес",
          })}
        </>
      )}
      {tab !== "settings" && (
        <label className={styles["check"]}>
          <input
            type="checkbox"
            checked={!!form.published}
            onChange={(e) => change("published", e.target.checked)}
          />{" "}
          Опубликовать
        </label>
      )}
      <button disabled={busy}>{busy ? "Сохраняем…" : "Сохранить"}</button>
    </form>
  );
}
