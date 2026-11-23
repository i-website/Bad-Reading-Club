begin;

-- Permit links to any HTTP(S) map or venue page.
alter table public.meetings drop constraint if exists meetings_place_url_2gis_check;
alter table public.meetings add constraint meetings_place_url_http_check
  check (place_url is null or place_url ~* '^https?://[^[:space:]/@]+([/?#][^[:space:]]*)?$');

-- Set the requested venue for all existing meetings, including drafts.
update public.meetings
set place = 'Ресторан Премьера',
    place_url = 'https://2gis.ru/irkutsk/geo/70000001077483176?inv_by=ca0ced143c694df391a6b0a8c1e146a5&inv_ts=1795455530';

commit;
