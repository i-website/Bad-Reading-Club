-- Every book has at least one meeting. The date and place can be filled in later.
insert into public.meetings (book_id, published)
select b.id, true from public.books b
where not exists (select 1 from public.meetings m where m.book_id = b.id);

create function public.create_book_meeting() returns trigger language plpgsql set search_path = '' as $$
begin
  insert into public.meetings (book_id, published) values (new.id, true);
  return new;
end $$;
create trigger book_initial_meeting after insert on public.books
for each row execute function public.create_book_meeting();

create function public.keep_book_meeting() returns trigger language plpgsql set search_path = '' as $$
begin
  if tg_op = 'UPDATE' and new.book_id is distinct from old.book_id then
    raise exception 'Нельзя перенести встречу на другую книгу. Создайте новую встречу.';
  end if;
  if tg_op = 'DELETE' then
    -- Serialise concurrent meeting removals for the same book.
    perform 1 from public.books where id = old.book_id for update;
    if found and not exists (select 1 from public.meetings where book_id = old.book_id and id <> old.id) then
      raise exception 'У книги должна остаться хотя бы одна встреча.';
    end if;
    return old;
  end if;
  return new;
end $$;
create trigger meeting_keep_book before delete or update of book_id on public.meetings
for each row execute function public.keep_book_meeting();
