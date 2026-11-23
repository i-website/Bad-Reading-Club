import { createClient } from '@supabase/supabase-js'
const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined
export const configured = Boolean(url && key)
export const db = createClient(url || 'https://example.supabase.co', key || 'missing-key')
export const fileUrl = (path:string|null) => path ? db.storage.from('club-media').getPublicUrl(path).data.publicUrl : ''
export function message(error:unknown) { return error instanceof Error ? error.message : typeof error === 'object' && error && 'message' in error ? String(error.message) : 'Не удалось выполнить запрос. Проверьте подключение и попробуйте снова.' }
export async function upload(file:File, folder:'covers'|'photos') {
 if (!['image/jpeg','image/png','image/webp'].includes(file.type) || file.size > 10*1024*1024) throw new Error('Выберите JPEG, PNG или WebP размером до 10 МБ.')
 const image = await createImageBitmap(file); const scale = Math.min(1, 1800 / Math.max(image.width, image.height)); const canvas = document.createElement('canvas'); canvas.width=Math.round(image.width*scale); canvas.height=Math.round(image.height*scale); canvas.getContext('2d')!.drawImage(image,0,0,canvas.width,canvas.height); image.close()
 const blob = await new Promise<Blob>((resolve,reject)=>canvas.toBlob(b=>b ? resolve(b) : reject(new Error('Не удалось обработать изображение')), 'image/webp', .85))
 const path = `${folder}/${crypto.randomUUID()}.webp`; const {error} = await db.storage.from('club-media').upload(path, blob, {contentType:'image/webp'}); if(error) throw error; return path
}
export async function removeFiles(paths:(string|null|undefined)[]) { const files=paths.filter((p):p is string=>Boolean(p)); if(files.length){ const {error}=await db.storage.from('club-media').remove(files); if(error) throw error } }
