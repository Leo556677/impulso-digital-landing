-- Content Engine V2 · comment learning
-- Applied to IMPULSO DIGITAL CRM on 2026-09-19.
-- Supabase live remains source of truth; this file documents the deployed schema.

create table if not exists public.content_comments (
  id uuid primary key default gen_random_uuid(),
  negocio_id uuid not null references public.negocios(id) on delete cascade,
  publication_id uuid not null references public.content_publicaciones(id) on delete cascade,
  content_id uuid not null references public.content_piezas(id) on delete cascade,
  platform text not null check (platform in ('TIKTOK','INSTAGRAM','FACEBOOK')),
  external_comment_id text,
  parent_comment_id uuid references public.content_comments(id) on delete set null,
  comment_text text not null,
  commented_at timestamptz,
  like_count integer not null default 0 check (like_count >= 0),
  reply_count integer not null default 0 check (reply_count >= 0),
  is_creator_reply boolean not null default false,
  language text,
  source text not null default 'MANUAL',
  source_fingerprint text not null,
  redaction_status text not null default 'NOT_NEEDED'
    check (redaction_status in ('NOT_NEEDED','REDACTED','REVIEW_REQUIRED')),
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata)='object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (publication_id, source_fingerprint)
);

create table if not exists public.content_comment_analysis (
  id uuid primary key default gen_random_uuid(),
  negocio_id uuid not null references public.negocios(id) on delete cascade,
  comment_id uuid not null unique references public.content_comments(id) on delete cascade,
  publication_id uuid not null references public.content_publicaciones(id) on delete cascade,
  content_id uuid not null references public.content_piezas(id) on delete cascade,
  platform text not null check (platform in ('TIKTOK','INSTAGRAM','FACEBOOK')),
  sentiment text not null default 'NEUTRAL'
    check (sentiment in ('POSITIVE','NEUTRAL','NEGATIVE','MIXED','UNCLEAR')),
  signal_types text[] not null default '{}'::text[]
    check (signal_types <@ array['QUESTION','OBJECTION','DESIRE','FEAR','CONFUSION','LANGUAGE','RESULT','OTHER']::text[]),
  themes text[] not null default '{}'::text[],
  liked_aspects text[] not null default '{}'::text[],
  disliked_aspects text[] not null default '{}'::text[],
  question_text text,
  objection_text text,
  desire_text text,
  fear_text text,
  confusion_text text,
  language_terms text[] not null default '{}'::text[],
  response_priority text not null default 'NORMAL'
    check (response_priority in ('LOW','NORMAL','HIGH','CLINICAL_ATTENTION')),
  privacy_flags text[] not null default '{}'::text[],
  analysis_version text not null default 'COMMENT_ANALYSIS_V1',
  confidence text not null default 'MEDIUM'
    check (confidence in ('LOW','MEDIUM','HIGH')),
  rationale text,
  analyzed_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata)='object'),
  created_at timestamptz not null default now()
);

create index if not exists content_comments_negocio_idx
  on public.content_comments(negocio_id, commented_at desc nulls last);
create index if not exists content_comments_publication_idx
  on public.content_comments(publication_id, commented_at desc nulls last);
create index if not exists content_comments_content_idx
  on public.content_comments(content_id, platform, commented_at desc nulls last);
create index if not exists content_comments_parent_idx
  on public.content_comments(parent_comment_id);
create index if not exists content_comment_analysis_negocio_idx
  on public.content_comment_analysis(negocio_id, analyzed_at desc);
create index if not exists content_comment_analysis_content_idx
  on public.content_comment_analysis(content_id, platform, analyzed_at desc);
create index if not exists content_comment_analysis_publication_idx
  on public.content_comment_analysis(publication_id, analyzed_at desc);

alter table public.content_comments enable row level security;
alter table public.content_comment_analysis enable row level security;

-- RLS deployed in Supabase:
-- members can SELECT; negocio admin/owner can INSERT/UPDATE/DELETE;
-- inserts/updates validate publication/content/platform consistency.
