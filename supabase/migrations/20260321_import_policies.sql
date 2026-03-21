-- =============================================
-- 20260321_import_policies.sql
-- problems テーブルの INSERT/UPDATE RLS ポリシー追加
-- import_logs テーブルの新規作成
-- =============================================

-- -----------------------------------------------
-- 1. problems テーブルに INSERT / UPDATE ポリシー追加
--    （認証済みユーザーがインポートできるようにする）
-- -----------------------------------------------
create policy "problems_insert_authenticated"
  on public.problems
  for insert
  to authenticated
  with check (true);

create policy "problems_update_authenticated"
  on public.problems
  for update
  to authenticated
  using (true)
  with check (true);

-- -----------------------------------------------
-- 2. import_logs テーブル（インポート履歴）
-- -----------------------------------------------
create table if not exists public.import_logs (
  id                uuid primary key default gen_random_uuid(),

  user_id           uuid not null
                    references auth.users(id) on delete cascade,

  file_name         text not null,
  file_type         text not null
                    check (file_type in ('json', 'csv')),

  total_count       int not null default 0,
  success_count     int not null default 0,
  error_count       int not null default 0,

  subject_breakdown jsonb not null default '{}',
  -- 例: {"securities": 10, "finance": 5}

  imported_at       timestamptz not null default now()
);

-- インデックス
create index if not exists import_logs_user_id_idx
  on public.import_logs (user_id);

create index if not exists import_logs_imported_at_idx
  on public.import_logs (imported_at desc);

-- RLS有効化
alter table public.import_logs enable row level security;

-- ポリシー: 自分のインポート履歴のみ参照可
create policy "import_logs_select_own"
  on public.import_logs
  for select
  using (auth.uid() = user_id);

-- ポリシー: 自分のインポート履歴のみ挿入可
create policy "import_logs_insert_own"
  on public.import_logs
  for insert
  with check (auth.uid() = user_id);
