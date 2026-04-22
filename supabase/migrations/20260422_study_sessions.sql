-- =============================================
-- 20260422_study_sessions.sql
-- 学習セッション詳細トラッキング
-- =============================================

-- -----------------------------------------------
-- study_records に uuid 列を追加（study_sessions FK 参照用）
-- -----------------------------------------------
-- 既存 study_records の id は text 型のため、
-- UUID 参照用に別途 uuid 列を追加する。
-- 既存レコードには gen_random_uuid() が自動付与される。
-- -----------------------------------------------

alter table public.study_records
  add column if not exists uuid_id uuid default gen_random_uuid() unique;

create index if not exists study_records_uuid_idx
  on public.study_records (uuid_id);

-- -----------------------------------------------
-- 3. study_sessions — ポモドーロ連動セッション記録
-- -----------------------------------------------
-- PomodoroTimer の「ストップ → 記録する」確定時に INSERT する。
-- 既存の study_records（任意の学習メモ）とは別に、
-- ポモドーロ計測を前提とした構造化データとして分離。
--
-- source_type:
--   'pomodoro'  → PomodoroTimer 経由（timer_minutes / overtime_seconds が有効）
--   'manual'    → 手動入力（過去記録との互換用）
-- -----------------------------------------------

create table if not exists public.study_sessions (
  id                   uuid primary key default gen_random_uuid(),
  user_id              uuid not null
                       references auth.users(id) on delete cascade,

  -- 日時
  started_at           timestamptz not null,
  ended_at             timestamptz not null,

  -- ポモドーロメタデータ
  source_type          text not null default 'pomodoro'
                       check (source_type in ('pomodoro', 'manual')),

  timer_minutes        int,
  -- ポモドーロタイマーの設定時間（例: 25）。'manual'では null

  overtime_seconds     int not null default 0,
  -- 延長時間（overtimeRunning 中に経過した秒数）

  actual_minutes       int not null,
  -- 実際の学習分数 = timer_minutes + ceil(overtime_seconds/60)

  -- study_records との任意紐付け
  study_record_uuid    uuid
                       references public.study_records(uuid_id) on delete set null,
  -- 「記録する」ボタンで作成した study_records レコードへのFK

  subject              text,
  -- 直接保持することで JOIN なしに科目フィルタ可能

  -- 集中度スコア
  focus_score          int
                       check (focus_score between 1 and 100),
  -- null = 未設定（将来: ユーザーが5段階評価 → 0-100 にマッピング）

  was_completed        boolean not null default true,
  -- タイマーが0に達してから停止（オーバータイム経由）か否か
  -- false = 途中リセット（将来の途中離脱検知用）

  -- セッション中の問題演習結果（QuizModeと連携）
  problems_attempted   int not null default 0,
  problems_correct     int not null default 0,

  pomodoro_set_no      int,
  -- その日の何セット目か（pomodoroStore.sets の値）

  created_at           timestamptz not null default now()
);

-- インデックス
create index if not exists study_sessions_user_date_idx
  on public.study_sessions (user_id, started_at desc);

create index if not exists study_sessions_user_subject_idx
  on public.study_sessions (user_id, subject, started_at desc);

-- 日次集計用（ペース予測で使用）
create index if not exists study_sessions_user_day_idx
  on public.study_sessions (user_id, (started_at::date));

-- RLS
alter table public.study_sessions enable row level security;

create policy "sessions_select_own"
  on public.study_sessions for select
  using (auth.uid() = user_id);

create policy "sessions_insert_own"
  on public.study_sessions for insert
  with check (auth.uid() = user_id);

create policy "sessions_update_own"
  on public.study_sessions for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
