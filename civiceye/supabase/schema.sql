-- Run this once in Supabase: Dashboard > SQL Editor > New query > paste > Run

create table if not exists public.reports (
  id          text primary key,
  category    text not null check (category in ('road','garbage','streetlight','water','other')),
  severity    text not null default 'medium' check (severity in ('low','medium','high')),
  title       text not null,
  description text not null,
  status      text not null default 'pending' check (status in ('pending','progress','resolved')),
  image_url   text,
  lat         double precision,
  lng         double precision,
  address     text,
  ai_source   text,
  created_at  timestamptz not null default now()
);

alter table public.reports enable row level security;

-- Hackathon demo policies: anyone can read, submit and change status.
-- For production, restrict the update policy to authenticated officials.
create policy "public read"   on public.reports for select using (true);
create policy "public insert" on public.reports for insert with check (true);
create policy "public update" on public.reports for update using (true) with check (true);

-- Photo bucket (public so the dashboard can show images)
insert into storage.buckets (id, name, public) values ('report-photos', 'report-photos', true)
on conflict (id) do nothing;

create policy "public photo read"   on storage.objects for select using (bucket_id = 'report-photos');
create policy "public photo upload" on storage.objects for insert with check (bucket_id = 'report-photos');
