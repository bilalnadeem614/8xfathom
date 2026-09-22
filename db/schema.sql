-- Mirrors the schema already applied in Supabase. See system_patterns.md for the source of truth.

create extension if not exists "pgcrypto";

create type meeting_status as enum ('uploading', 'processing', 'ready', 'failed');

create table meetings (
    id uuid primary key default gen_random_uuid(),
    title text not null,
    date timestamptz not null,
    duration_seconds integer,
    participants jsonb not null default '[]',
    status meeting_status not null default 'uploading',
    audio_url text,
    created_at timestamptz not null default now()
);

create table transcript_segments (
    id uuid primary key default gen_random_uuid(),
    meeting_id uuid not null references meetings(id) on delete cascade,
    speaker text,
    start_time float not null,
    end_time float not null,
    text text not null
);

create table summaries (
    id uuid primary key default gen_random_uuid(),
    meeting_id uuid not null references meetings(id) on delete cascade,
    template_type text not null default 'general',
    content text not null,
    generated_at timestamptz not null default now()
);

create table action_items (
    id uuid primary key default gen_random_uuid(),
    meeting_id uuid not null references meetings(id) on delete cascade,
    owner text,
    task text not null,
    due_date date,
    source_segment_id uuid references transcript_segments(id) on delete set null
);

create table highlights (
    id uuid primary key default gen_random_uuid(),
    meeting_id uuid not null references meetings(id) on delete cascade,
    timestamp float not null,
    note text,
    created_at timestamptz not null default now()
);

create index on transcript_segments (meeting_id);
create index on summaries (meeting_id);
create index on action_items (meeting_id);
create index on highlights (meeting_id);
