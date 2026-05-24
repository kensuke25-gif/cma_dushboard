-- 一問一答ドリルの進捗をユーザーごとに保存（デバイス間共有用）
create table if not exists public.qa_drill_progress (
  user_id    uuid not null references auth.users(id) on delete cascade,
  qid        text not null,
  result     text not null check (result in ('ok', 'ng')),
  updated_at timestamptz not null default now(),
  primary key (user_id, qid)
);

alter table public.qa_drill_progress enable row level security;

create policy "qa_drill_progress_select_own"
  on public.qa_drill_progress for select
  using (auth.uid() = user_id);

create policy "qa_drill_progress_insert_own"
  on public.qa_drill_progress for insert
  with check (auth.uid() = user_id);

create policy "qa_drill_progress_update_own"
  on public.qa_drill_progress for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "qa_drill_progress_delete_own"
  on public.qa_drill_progress for delete
  using (auth.uid() = user_id);
