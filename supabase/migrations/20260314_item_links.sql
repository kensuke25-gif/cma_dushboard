-- item_links: ユーザーごとの問題集・解説リンクを保存するテーブル
-- link_key の形式:
--   章の問題集 → "chapter:第I章 マクロ経済学"
--   項目の解説 → "item:1"

create table if not exists item_links (
  id          uuid default gen_random_uuid() primary key,
  user_id     uuid references auth.users not null,
  link_key    text not null,
  url         text not null,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now(),
  unique(user_id, link_key)
);

-- RLS有効化
alter table item_links enable row level security;

-- 自分のリンクのみ読み書き可能
create policy "Users can manage their own item links"
  on item_links for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
