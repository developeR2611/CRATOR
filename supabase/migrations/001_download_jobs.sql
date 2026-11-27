-- ==============================================================================
-- CRATOR Download Manager — Optional Supabase / PostgreSQL Job Persistence Schema
-- Run this migration if backing download job metadata with Supabase Postgres
-- alongside persistent disk storage.
-- ==============================================================================

create table if not exists public.download_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  tmdb_id text not null,
  media_type text not null check (media_type in ('movie', 'tv')),
  title text not null,
  release_year integer,
  poster_url text not null default '',
  season_number integer,
  episode_number integer,
  episode_title text,
  quality text not null,
  source_name text not null,
  filename text not null,
  relative_path text not null,
  file_size bigint not null default 0,
  downloaded_bytes bigint not null default 0,
  progress numeric(5, 2) not null default 0,
  speed bigint not null default 0,
  eta_seconds integer,
  status text not null check (
    status in ('queued', 'downloading', 'paused', 'processing', 'completed', 'failed', 'cancelled')
  ),
  engine text not null default 'aria2' check (engine in ('aria2', 'native')),
  error text,
  ffprobe_validated boolean not null default false,
  media_info jsonb,
  queue_position integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz
);

create index if not exists idx_download_jobs_user_status
  on public.download_jobs (user_id, status, created_at desc);

create index if not exists idx_download_jobs_dedupe
  on public.download_jobs (user_id, media_type, tmdb_id, season_number, episode_number, quality)
  where status in ('queued', 'downloading', 'paused', 'processing');

alter table public.download_jobs enable row level security;

create policy "Users can view own download jobs"
  on public.download_jobs for select
  using (auth.uid()::text = user_id);

create policy "Users can create own download jobs"
  on public.download_jobs for insert
  with check (auth.uid()::text = user_id);

create policy "Users can update own download jobs"
  on public.download_jobs for update
  using (auth.uid()::text = user_id)
  with check (auth.uid()::text = user_id);

create policy "Users can delete own download jobs"
  on public.download_jobs for delete
  using (auth.uid()::text = user_id);
