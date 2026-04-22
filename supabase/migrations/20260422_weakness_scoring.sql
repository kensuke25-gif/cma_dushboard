-- =============================================
-- 20260422_weakness_scoring.sql
-- 弱点スコアリング・時系列スナップショット
-- =============================================

-- -----------------------------------------------
-- 2. weakness_snapshots — 弱点スコア時系列記録
-- -----------------------------------------------
-- 日次バッチ（またはセッション終了時）に計算した
-- 科目・章・問題レベルの弱点スコアを記録するイミュータブルテーブル。
--
-- weakness_score 計算式（フロントエンド側で算出してINSERT）:
--   base_score       = (incorrect_count * 2.0 + partial_count * 1.0) / attempt_count
--   recency_weight   = exp(-0.1 * days_since_last_attempt)
--   difficulty_factor= 1.0 + (difficulty - 2) * 0.15
--   raw_score        = base_score * recency_weight * difficulty_factor * 100
--   correction       = correct_ratio > 0.7 ? 0.5 : 1.0
--   weakness_score   = min(100, round(raw_score * correction, 1))
--
-- granularity:
--   'problem'  → aggregate_key = problem_id  (例: "securities-ch1-001")
--   'chapter'  → aggregate_key = chapter_key (例: "securities-ch1")
--   'subject'  → aggregate_key = subject key (例: "securities")
-- -----------------------------------------------

create table if not exists public.weakness_snapshots (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null
                  references auth.users(id) on delete cascade,

  snapshot_date   date not null default current_date,
  -- スナップショット取得日（日次集計のため date 精度で十分）

  granularity     text not null
                  check (granularity in ('problem', 'chapter', 'subject')),

  aggregate_key   text not null,
  -- granularity='problem'  → problem_id  例: "securities-ch1-001"
  -- granularity='chapter'  → chapter_key 例: "securities-ch1"
  -- granularity='subject'  → subject key 例: "securities"

  subject         text not null
                  check (subject in ('securities','finance','market','ethics')),
  -- 全粒度で保持（chapter/subject レベルでの科目絞り込みを高速化）

  weakness_score  numeric(5,1) not null,
  -- 0.0 〜 100.0（高いほど弱い）

  attempt_count   int not null default 0,
  correct_count   int not null default 0,
  incorrect_count int not null default 0,
  partial_count   int not null default 0,

  avg_time_sec    numeric(8,1),
  -- 平均解答時間（長いほど苦労している補助指標）

  created_at      timestamptz not null default now()
);

-- インデックス
-- 直近スナップショット取得（ダッシュボード表示用）
create index if not exists weakness_snapshots_user_date_idx
  on public.weakness_snapshots (user_id, snapshot_date desc, granularity);

-- 特定集計キーの時系列取得（トレンドグラフ用）
create index if not exists weakness_snapshots_user_key_idx
  on public.weakness_snapshots (user_id, aggregate_key, snapshot_date desc);

-- 科目内ランキング取得（弱点深刻度順ソート用）
create index if not exists weakness_snapshots_ranking_idx
  on public.weakness_snapshots (user_id, subject, granularity, snapshot_date desc, weakness_score desc);

-- RLS
alter table public.weakness_snapshots enable row level security;

create policy "weakness_snapshots_select_own"
  on public.weakness_snapshots for select
  using (auth.uid() = user_id);

create policy "weakness_snapshots_insert_own"
  on public.weakness_snapshots for insert
  with check (auth.uid() = user_id);

-- ライフサイクル: 90日以上前のスナップショットは削除可
-- アプリ側で定期的に呼び出す（毎週日曜など）:
-- delete from public.weakness_snapshots
-- where user_id = auth.uid()
--   and snapshot_date < current_date - interval '90 days';
