-- ユーザーごとの学習目標を管理するテーブル
create table if not exists public.user_goals (
  user_id         uuid primary key references auth.users(id) on delete cascade,
  exam_date       date,
  exam_total_hours int not null default 500,
  monthly_hours   int not null default 40,
  weekly_hours    int not null default 10,
  daily_minutes   int not null default 120,
  updated_at      timestamptz not null default now()
);

alter table public.user_goals enable row level security;

create policy "goals_select_own"
  on public.user_goals for select
  using (auth.uid() = user_id);

create policy "goals_insert_own"
  on public.user_goals for insert
  with check (auth.uid() = user_id);

create policy "goals_update_own"
  on public.user_goals for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
