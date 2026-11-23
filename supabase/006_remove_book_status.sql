begin;
alter table public.books drop column if exists status;

-- Creating a meeting and its book, or editing both, is one transaction.
create or replace function public.save_meeting_with_book(p_meeting_id uuid, p_book jsonb, p_meeting jsonb)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
  v_book_id uuid;
  v_meeting_id uuid;
begin
  if not public.is_admin() then
    raise exception 'Admin access required';
  end if;
  if p_meeting_id is null then
    insert into public.books(slug, title, author, description, cover_path, published)
    values (p_book->>'slug', p_book->>'title', p_book->>'author', coalesce(p_book->>'description', ''),
      p_book->>'cover_path', coalesce((p_book->>'published')::boolean, false))
    returning id into v_book_id;
    select id into strict v_meeting_id from public.meetings where book_id = v_book_id;
  else
    select book_id, id into strict v_book_id, v_meeting_id from public.meetings where id = p_meeting_id for update;
    update public.books set slug = p_book->>'slug', title = p_book->>'title', author = p_book->>'author',
      description = coalesce(p_book->>'description', ''),
      cover_path = p_book->>'cover_path', published = published or coalesce((p_book->>'published')::boolean, false)
    where id = v_book_id;
  end if;
  update public.meetings set starts_at = (p_meeting->>'starts_at')::timestamptz,
    place = p_meeting->>'place', price = (p_meeting->>'price')::numeric,
    notes = coalesce(p_meeting->>'notes', ''), published = coalesce((p_meeting->>'published')::boolean, false)
  where id = v_meeting_id;
  return jsonb_build_object('book_id', v_book_id, 'meeting_id', v_meeting_id);
end $$;
revoke all on function public.save_meeting_with_book(uuid, jsonb, jsonb) from public;
grant execute on function public.save_meeting_with_book(uuid, jsonb, jsonb) to authenticated;

commit;
