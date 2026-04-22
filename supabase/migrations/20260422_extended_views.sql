-- =============================================
-- 20260422_extended_views.sql
-- 拡張ビュー（既存 VIEW の強化版）
-- =============================================

-- -----------------------------------------------
-- problem_full_stats VIEW
-- 既存 problem_latest_results を拡張した統合ビュー
-- -----------------------------------------------
-- 追加フィールド（既存 problem_latest_results との差分）:
--   avg_time_sec            → 平均解答時間
--   srs_next_review_date    → 次回復習予定日（problem_srs）
--   srs_ease_factor         → SM-2 習熟度スコア
--   srs_repetitions         → 連続正解数
--   srs_interval_days       → 現在の復習間隔（日）
--   is_due_today            → 今日復習すべき問題か
--   latest_weakness_score   → 最新の弱点スコア（weakness_snapshots）
-- -----------------------------------------------

create or replace view public.problem_full_stats
  with (security_invoker = true) as
select
  pa.user_id,
  pa.problem_id,

  -- 既存 problem_latest_results と同等の集計
  (array_agg(pa.result order by pa.attempted_at desc))[1]             as latest_result,
  count(*)::int                                                         as attempt_count,
  count(*) filter (where pa.result = 'correct')::int                   as correct_count,
  count(*) filter (where pa.result = 'partial')::int                   as partial_count,
  count(*) filter (where pa.result = 'incorrect')::int                 as incorrect_count,
  max(pa.attempted_at)                                                 as last_attempted_at,

  -- 平均解答時間（time_spent_sec が null の行を除外）
  round(avg(pa.time_spent_sec) filter (
    where pa.time_spent_sec is not null
  )::numeric, 1)                                                       as avg_time_sec,

  -- SRS フィールド（LEFT JOIN: SRS 未登録の場合は null）
  srs.next_review_date                                                 as srs_next_review_date,
  srs.ease_factor                                                      as srs_ease_factor,
  srs.repetitions                                                      as srs_repetitions,
  srs.interval_days                                                    as srs_interval_days,

  -- 今日復習すべきか（SRS 未登録 または next_review_date <= 今日）
  (
    srs.user_id is null
    or srs.next_review_date <= current_date
  )                                                                    as is_due_today,

  -- 最新弱点スコア（当日スナップショット優先、なければ直近）
  ws.weakness_score                                                    as latest_weakness_score

from public.problem_attempts pa

left join public.problem_srs srs
  on  srs.user_id    = pa.user_id
  and srs.problem_id = pa.problem_id

-- 最新 1 件のスナップショットをラテラル結合で取得
left join lateral (
  select weakness_score
  from   public.weakness_snapshots ws_inner
  where  ws_inner.user_id       = pa.user_id
    and  ws_inner.aggregate_key = pa.problem_id
    and  ws_inner.granularity   = 'problem'
  order by ws_inner.snapshot_date desc
  limit 1
) ws on true

group by
  pa.user_id,
  pa.problem_id,
  srs.user_id,
  srs.problem_id,
  srs.next_review_date,
  srs.ease_factor,
  srs.repetitions,
  srs.interval_days,
  ws.weakness_score;

-- -----------------------------------------------
-- subject_weakness_ranking VIEW
-- 科目×章レベルの弱点ランキング（ダッシュボード向け）
-- -----------------------------------------------
-- 各 (user_id, aggregate_key, granularity) の最新スナップショット 1 件のみ返す。
-- granularity='problem' の場合のみ problems テーブルと JOIN して
-- chapter_name / question_no / difficulty を付加する。
-- -----------------------------------------------

create or replace view public.subject_weakness_ranking
  with (security_invoker = true) as
select
  ws.user_id,
  ws.subject,
  ws.granularity,
  ws.aggregate_key,
  ws.weakness_score,
  ws.attempt_count,
  ws.correct_count,
  ws.incorrect_count,
  ws.snapshot_date,

  -- 問題マスター情報（granularity='problem' 時のみ有効、他は null）
  p.chapter_name,
  p.section_name,
  p.question_no,
  p.difficulty

from (
  -- DISTINCT ON で各キーの最新スナップショット 1 件を取得
  select distinct on (user_id, aggregate_key, granularity)
    user_id,
    subject,
    granularity,
    aggregate_key,
    weakness_score,
    attempt_count,
    correct_count,
    incorrect_count,
    snapshot_date
  from   public.weakness_snapshots
  order by
    user_id,
    aggregate_key,
    granularity,
    snapshot_date desc
) ws

left join public.problems p
  on  ws.granularity   = 'problem'
  and p.id             = ws.aggregate_key;
