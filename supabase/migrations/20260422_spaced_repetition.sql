-- =============================================
-- 20260422_spaced_repetition.sql
-- 間隔反復（SM-2）スケジューリングテーブル
-- =============================================

-- -----------------------------------------------
-- 1a. problem_srs — 問題演習用 SRS 状態
-- -----------------------------------------------
-- SM-2 アルゴリズム参考:
--   https://www.supermemo.com/en/blog/application-of-a-computer-to-improve-the-results-of-learning
--
-- ease_factor: 2.5 を初期値。回答品質に応じて変動。
--   correct   → quality=5
--   partial   → quality=3
--   incorrect → quality=1
--
-- SM-2 更新式:
--   if quality >= 3:
--     if repetitions == 0: interval = 1
--     elif repetitions == 1: interval = 6
--     else: interval = round(prev_interval * ease_factor)
--     repetitions += 1
--   else:
--     repetitions = 0
--     interval = 1
--   ease_factor = max(1.3, ease_factor + 0.1 - (5-quality)*(0.08+(5-quality)*0.02))
--   next_review_date = today + interval
-- -----------------------------------------------

create table if not exists public.problem_srs (
  user_id          uuid not null
                   references auth.users(id) on delete cascade,
  problem_id       text not null
                   references public.problems(id) on delete cascade,

  ease_factor      numeric(4,2) not null default 2.50,
  -- SM-2 の E-Factor。最低値 1.3 (SM-2 仕様)

  repetitions      int not null default 0,
  -- 連続して quality >= 3 だった回数（不正解でリセット）

  interval_days    int not null default 1,
  -- 次回復習までの日数

  next_review_date date not null default current_date,
  -- 次回復習予定日

  last_reviewed_at timestamptz,
  -- 最後に SRS 更新を行った日時

  primary key (user_id, problem_id)
);

-- インデックス
-- 今日復習すべき問題を高速取得（最重要クエリ用）
create index if not exists problem_srs_review_queue_idx
  on public.problem_srs (user_id, next_review_date asc)
  where next_review_date <= current_date;

create index if not exists problem_srs_user_idx
  on public.problem_srs (user_id);

-- RLS
alter table public.problem_srs enable row level security;

create policy "srs_select_own"
  on public.problem_srs for select
  using (auth.uid() = user_id);

create policy "srs_insert_own"
  on public.problem_srs for insert
  with check (auth.uid() = user_id);

create policy "srs_update_own"
  on public.problem_srs for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- -----------------------------------------------
-- 1b. quiz_srs — クイズ用 SRS 状態
-- -----------------------------------------------

create table if not exists public.quiz_srs (
  user_id          uuid not null
                   references auth.users(id) on delete cascade,
  question_id      uuid not null
                   references public.quiz_questions(id) on delete cascade,

  ease_factor      numeric(4,2) not null default 2.50,
  repetitions      int not null default 0,
  interval_days    int not null default 1,
  next_review_date date not null default current_date,
  last_reviewed_at timestamptz,

  primary key (user_id, question_id)
);

create index if not exists quiz_srs_review_queue_idx
  on public.quiz_srs (user_id, next_review_date asc)
  where next_review_date <= current_date;

create index if not exists quiz_srs_user_idx
  on public.quiz_srs (user_id);

alter table public.quiz_srs enable row level security;

create policy "quiz_srs_select_own"
  on public.quiz_srs for select
  using (auth.uid() = user_id);

create policy "quiz_srs_insert_own"
  on public.quiz_srs for insert
  with check (auth.uid() = user_id);

create policy "quiz_srs_update_own"
  on public.quiz_srs for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
