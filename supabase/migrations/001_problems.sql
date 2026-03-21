-- =============================================
-- 001_problems.sql
-- 証券アナリスト2次試験 問題演習テーブル
-- =============================================

-- -----------------------------------------------
-- 1. problems テーブル（問題データ本体）
-- -----------------------------------------------
create table if not exists public.problems (
  id             text primary key,
  -- 例: "securities-ch1-001"

  subject        text not null
                 check (subject in ('securities','finance','market','ethics')),
  -- securities  = 証券分析とポートフォリオ・マネジメント
  -- finance     = 財務分析・コーポレートファイナンス
  -- market      = 市場と経済の分析・数量分析
  -- ethics      = 職業倫理・行為基準

  chapter_key    text not null,
  -- 例: "securities-ch1"（URLアンカー・グルーピングに使用）

  chapter_name   text not null,
  -- 例: "第I章 証券分析の基礎"

  section_name   text,
  -- 例: "第1節 リターンとリスク"（任意）

  question_no    text not null,
  -- 例: "練習問題1-1" / "章末問題1"

  question_type  text not null default 'descriptive'
                 check (question_type in ('descriptive')),
  -- 現在は記述式のみ（将来的に選択式を追加可能）

  points         int not null default 0,
  -- 配点

  question_text  text not null,
  -- 問題文（LaTeX記法含む可: $...$ インライン / $$...$$ ブロック）

  hint_text      text,
  -- ヒント（段階的開示用、任意）

  answer_text    text not null,
  -- 模範解答（LaTeX記法含む可）

  explanation    text not null,
  -- 初学者向け詳細解説（LaTeX記法含む可）

  related_knowledge text,
  -- 周辺知識・発展知識（任意）

  tags           text[] not null default '{}',
  -- 例: ARRAY['シャープレシオ','リスク調整済みリターン']

  difficulty     int not null default 2
                 check (difficulty in (1, 2, 3)),
  -- 1: 易しい / 2: 普通 / 3: 難しい

  source         text,
  -- 出典（例: "テキスト第3版 p.42"）

  display_order  int not null default 0,
  -- 同一chapter_key内での表示順序

  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

-- updated_at 自動更新トリガー
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger problems_updated_at
  before update on public.problems
  for each row execute function public.set_updated_at();

-- インデックス
create index if not exists problems_subject_idx
  on public.problems (subject);

create index if not exists problems_chapter_key_idx
  on public.problems (chapter_key);

create index if not exists problems_subject_chapter_order_idx
  on public.problems (subject, chapter_key, display_order);

-- RLS有効化
alter table public.problems enable row level security;

-- ポリシー: 認証済みユーザーは全問題を読める
create policy "problems_select_authenticated"
  on public.problems
  for select
  to authenticated
  using (true);

-- -----------------------------------------------
-- 2. problem_attempts テーブル（回答履歴）
-- -----------------------------------------------
create table if not exists public.problem_attempts (
  id              uuid primary key default gen_random_uuid(),

  user_id         uuid not null
                  references auth.users(id) on delete cascade,

  problem_id      text not null
                  references public.problems(id) on delete cascade,

  result          text not null
                  check (result in ('correct', 'partial', 'incorrect')),
  -- correct   = 正解 (○)
  -- partial   = 部分正解 (△)
  -- incorrect = 不正解 (✕)

  time_spent_sec  int,
  -- 解答に要した秒数（問題表示開始〜正誤ボタン押下まで）

  attempted_at    timestamptz not null default now()
);

-- インデックス
create index if not exists problem_attempts_user_id_idx
  on public.problem_attempts (user_id);

create index if not exists problem_attempts_problem_id_idx
  on public.problem_attempts (problem_id);

create index if not exists problem_attempts_user_problem_idx
  on public.problem_attempts (user_id, problem_id);

create index if not exists problem_attempts_user_attempted_at_idx
  on public.problem_attempts (user_id, attempted_at desc);

-- RLS有効化
alter table public.problem_attempts enable row level security;

-- ポリシー: 自分の回答履歴のみ参照可
create policy "attempts_select_own"
  on public.problem_attempts
  for select
  using (auth.uid() = user_id);

-- ポリシー: 自分の回答履歴のみ挿入可
create policy "attempts_insert_own"
  on public.problem_attempts
  for insert
  with check (auth.uid() = user_id);

-- -----------------------------------------------
-- 3. problem_latest_results ビュー（集計用）
-- -----------------------------------------------
-- 各ユーザー×各問題の「最新結果」と「集計値」を返すビュー
-- problemStoreのfetchStats()が参照する

create or replace view public.problem_latest_results
  with (security_invoker = true) as
select
  pa.user_id,
  pa.problem_id,

  -- 最新の回答結果（attempted_at降順の先頭）
  (
    array_agg(pa.result order by pa.attempted_at desc)
  )[1]                                    as latest_result,

  -- 総回答回数
  count(*)::int                           as attempt_count,

  -- 正解回数
  count(*) filter (
    where pa.result = 'correct'
  )::int                                  as correct_count,

  -- 部分正解回数
  count(*) filter (
    where pa.result = 'partial'
  )::int                                  as partial_count,

  -- 不正解回数
  count(*) filter (
    where pa.result = 'incorrect'
  )::int                                  as incorrect_count,

  -- 最終回答日時
  max(pa.attempted_at)                    as last_attempted_at

from public.problem_attempts pa
group by pa.user_id, pa.problem_id;

-- -----------------------------------------------
-- 4. 動作確認用クエリ（コメントアウト済み）
-- -----------------------------------------------
-- テーブル一覧確認:
-- select table_name from information_schema.tables
-- where table_schema = 'public'
-- order by table_name;

-- problems サンプル挿入テスト（確認後に削除）:
-- insert into public.problems
--   (id, subject, chapter_key, chapter_name, question_no,
--    question_text, answer_text, explanation, display_order)
-- values
--   ('test-001', 'securities', 'securities-ch1', '第I章 テスト',
--    '練習問題1-1', '問題文テスト $E(R) = R_f + \beta(R_m - R_f)$',
--    '解答テスト', '解説テスト', 1);

-- select * from public.problems;
-- delete from public.problems where id = 'test-001';
