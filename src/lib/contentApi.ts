import type { Book, ClubData, Meeting } from "../types";

type AdminSession = { authenticated: boolean; csrf: string };
async function read<T>(response: Response): Promise<T> {
  const data = await response.json().catch(() => null);
  if (!response.ok || !data) throw new Error(data?.error || "Сервер недоступен. Попробуйте позже.");
  return data as T;
}
export async function adminSession(): Promise<AdminSession> {
  return read(await fetch("/api/content.php?action=session", { credentials: "same-origin", cache: "no-store" }));
}
async function post(action: string, body: object | FormData): Promise<void> {
  const { csrf } = await adminSession();
  const headers: Record<string, string> = { "X-CSRF-Token": csrf };
  if (!(body instanceof FormData)) headers["Content-Type"] = "application/json";
  const response = await fetch(`/api/content.php?action=${action}`, {
    method: "POST", credentials: "same-origin", headers,
    body: body instanceof FormData ? body : JSON.stringify(body),
  });
  await read(response);
}
export async function publicData(): Promise<ClubData> {
  return read(await fetch("/api/content.php?action=public", { credentials: "same-origin", cache: "no-store" }));
}
export async function adminData(): Promise<{ books: Book[]; meetings: Meeting[] }> {
  return read(await fetch("/api/content.php?action=admin-data", { credentials: "same-origin", cache: "no-store" }));
}
export const saveMeeting = (id: string | null, book: object, meeting: object) => post("save-meeting", { id, book, meeting });
export const deleteMeeting = (id: string) => post("delete-meeting", { id });
export async function upload(file: File): Promise<string> {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 10485760) throw new Error("Выберите JPEG, PNG или WebP размером до 10 МБ.");
  const picture = await createImageBitmap(file);
  const scale = Math.min(1, 1800 / Math.max(picture.width, picture.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(picture.width * scale); canvas.height = Math.round(picture.height * scale);
  canvas.getContext("2d")!.drawImage(picture, 0, 0, canvas.width, canvas.height);
  picture.close();
  const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob((value) => value ? resolve(value) : reject(new Error("Не удалось обработать изображение")), "image/webp", 0.85));
  const form = new FormData(); form.append("cover", blob, "cover.webp");
  const { csrf } = await adminSession();
  const result = await read<{ path: string }>(await fetch("/api/content.php?action=upload", { method: "POST", credentials: "same-origin", headers: { "X-CSRF-Token": csrf }, body: form }));
  return result.path;
}
export async function removeFiles(paths: (string | null | undefined)[]) {
  for (const path of paths) if (path?.startsWith("covers/")) await post("remove-cover", { path });
}
export function coverUrl(path: string): string {
  return /^book-covers\/[a-z0-9-]+\.jpg$/.test(path)
    ? `${import.meta.env.BASE_URL}${path}`
    : `/api/content.php?action=cover&path=${encodeURIComponent(path)}`;
}
export function message(error: unknown): string {
  return error instanceof Error ? error.message : "Не удалось выполнить запрос. Попробуйте снова.";
}
