export type Status = 'planned' | 'reading' | 'read'
export interface Book { id:string; slug:string; title:string; author:string; description:string; cover_path:string|null; status:Status; final_rating:number|null; published:boolean }
export interface Meeting { id:string; book_id:string; starts_at:string|null; place:string|null; notes:string; published:boolean }
export interface Review { id:string; book_id:string; author_name:string; body:string; rating:number|null; published:boolean }
export interface Photo { id:string; meeting_id:string; storage_path:string; caption:string; sort_order:number }
export interface Settings { id:number; name:string; description:string; links:{label:string;url:string}[] }
export const statuses:Record<Status,string> = {planned:'В планах',reading:'Читаем',read:'Прочитано'}
