-- This migration permanently removes existing reviews and book ratings.
drop table if exists public.reviews;
alter table public.books drop column if exists final_rating;
