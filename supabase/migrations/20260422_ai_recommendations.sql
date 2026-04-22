-- =============================================
-- 20260422_ai_recommendations.sql
-- AIレコメンデーションログ
-- =============================================

-- -----------------------------------------------
-- 5. ai_recommendations — レコメンデーション記録
-- -----------------------------------------------
-- "AI" はここではルールベースの自動推奨エンジンを指す。
-- システムが生成した学習アクション推奨の履歴と、
-- ユーザーが実際に従ったかを記録する。
--
-- action_type:
--   'review_srs'     → SRS に基づく復習推奨（next_review_date <= today の問題）
--   'review_weak'    → 弱点スコア上位問題の演習推奨
--   'study_subject'  → 特定科目の学習時間増加推奨
--   'take_quiz'      → クイズモードでの確認テスト推奨
--   'set_goal'       → 目標設定の見直し推奨
--   'rest'           → 休息推奨（連日高負荷学習が続いている場合）
--
-- user_action:
--   'followed'   = 推奨に従って学習した（study_sessions が記録された）
--   'dismissed'  = 無視・却下した
--   'snoozed'    = 後で対応（翌日に再表示）
-- -----------------------------------------------

create table if not exists public.ai_recommendations (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null
                  references auth.users(id) on delete cascade,

  recommended_at  timestamptz not null default now(),

  action_type     text not null
                  check (action_type in (
                    'review_srs', 'review_weak', 'study_subject',
                    'take_quiz', 'set_goal', 'rest'
                  )),

  subject         text
                  check (subject in ('securities','finance','market','ethics')),
  -- 対象科目（study_subject・take_quiz など科目固有の推奨時に設定）

  target_ids      text[] not null default '{}',
  -- 対象リスト
  -- action_type='review_srs'   → 復習対象の problem_id リスト
  -- action_type='review_weak'  → 弱点問題の problem_id リスト
  -- action_type='take_quiz'    → 対象 field 名リスト

  reason_text     text not null,
  -- 推奨理由の日本語テキスト
  -- 例: "証券分析で3日連続不正解の問題が5件あります"

  priority        int not null default 2
                  check (priority between 1 and 3),
  -- 1:高（今すぐ対応すべき） / 2:中 / 3:低（余裕があれば）

  -- ユーザーアクション追跡
  was_shown       boolean not null default false,
  -- ダッシュボードに表示されたか

  shown_at        timestamptz,
  -- 最初に表示された日時

  user_action     text
                  check (user_action in ('followed', 'dismissed', 'snoozed')),

  acted_at        timestamptz,
  -- ユーザーがアクションを取った日時

  expires_at      timestamptz,
  -- この推奨の有効期限（期限切れは表示しない）
  -- 例: recommended_at + interval '3 days'

  created_at      timestamptz not null default now()
);

-- インデックス
-- ダッシュボード用：有効な未対応推奨を高速取得
create index if not exists ai_rec_active_idx
  on public.ai_recommendations (user_id, priority asc, recommended_at desc)
  where user_action is null;

-- 推奨タイプ別分析用
create index if not exists ai_rec_type_idx
  on public.ai_recommendations (user_id, action_type, recommended_at desc);

-- コンプライアンス率計算用（従った数/全推奨数）
create index if not exists ai_rec_compliance_idx
  on public.ai_recommendations (user_id, user_action, recommended_at desc);

-- RLS
alter table public.ai_recommendations enable row level security;

create policy "ai_rec_select_own"
  on public.ai_recommendations for select
  using (auth.uid() = user_id);

create policy "ai_rec_insert_own"
  on public.ai_recommendations for insert
  with check (auth.uid() = user_id);

create policy "ai_rec_update_own"
  on public.ai_recommendations for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ライフサイクル: 対応済み60日以上前のレコードは削除可
-- アプリ側で定期実行（毎月1日など）:
-- delete from public.ai_recommendations
-- where user_id = auth.uid()
--   and user_action in ('followed', 'dismissed')
--   and acted_at < current_date - interval '60 days';
