-- problems テーブルの DELETE RLS ポリシーを追加
-- INSERT/UPDATE と同様に、認証済みユーザーであれば削除を許可する
create policy "problems_delete_authenticated"
  on public.problems
  for delete
  to authenticated
  using (true);
