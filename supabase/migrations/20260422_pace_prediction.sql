-- =============================================
-- 20260422_pace_prediction.sql
-- 目標達成ペース予測キャッシュ
-- =============================================

-- -----------------------------------------------
-- 4. pace_predictions — ペース予測スナップショット
-- -----------------------------------------------
-- フロントエンドで計算し、1日1回（または目標変更時）に
-- UPSERT するキャッシュテーブル。1ユーザー1行。
-- 重い時系列計算を毎回クライアントで行わないための記録層。
--
-- 計算に使うデータソース:
--   - user_goals (exam_date, exam_total_hours)
--   - study_sessions (過去14日間の実績分数)
--   - problem_srs (科目別 ease_factor 平均 → 習熟速度の指標)
-- -----------------------------------------------

create table if not exists public.pace_predictions (
  user_id                  uuid primary key
                           references auth.users(id) on delete cascade,

  calculated_at            timestamptz not null default now(),

  -- 全体進捗
  total_studied_hours      numeric(8,2) not null default 0,
  -- 累計実績学習時間（時間単位）

  remaining_hours_needed   numeric(8,2) not null default 0,
  -- 試験日までに残り必要な学習時間

  current_daily_avg_min    numeric(6,2) not null default 0,
  -- 過去14日間の1日平均学習時間（分）

  projected_completion_date date,
  -- 現在ペースで exam_total_hours に到達する予測日
  -- null = 目標達成済み または ペース超過（間に合う）

  is_on_track              boolean not null default true,
  -- 現在ペースで試験日までに exam_total_hours を達成できるか

  days_until_exam          int,
  -- 計算時点での試験日までの日数

  -- 科目別残り必要学習時間（JSONB）
  -- 例: {"securities": 45.5, "finance": 32.0, "market": 28.5, "ethics": 10.0}
  subject_remaining_hours  jsonb not null default '{}',

  -- 科目別の現在正答率（直近30問ベース、0-100）
  -- 例: {"securities": 68, "finance": 72, "market": 55, "ethics": 90}
  subject_accuracy_pct     jsonb not null default '{}',

  -- 弱点上位3件（problem_id のリスト）
  top_weak_problem_ids     text[] not null default '{}',

  -- 推奨1日学習時間（分）
  recommended_daily_min    int,
  -- = ceil(remaining_hours_needed * 60 / days_until_exam)
  -- days_until_exam <= 0 の場合は null

  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now()
);

-- updated_at 自動更新トリガー（001_problems.sql の set_updated_at() を再利用）
create trigger pace_predictions_updated_at
  before update on public.pace_predictions
  for each row execute function public.set_updated_at();

-- RLS
alter table public.pace_predictions enable row level security;

create policy "pace_select_own"
  on public.pace_predictions for select
  using (auth.uid() = user_id);

create policy "pace_insert_own"
  on public.pace_predictions for insert
  with check (auth.uid() = user_id);

create policy "pace_update_own"
  on public.pace_predictions for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
