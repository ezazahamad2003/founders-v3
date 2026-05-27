-- Allow authenticated users to insert/update their own profile row after signup.
-- Backend service role / postgres connections bypass RLS; this is for browser clients.

drop policy if exists "profiles_self_insert" on public.profiles;
create policy "profiles_self_insert" on public.profiles
  for insert
  with check (auth.uid() = id);

drop policy if exists "profiles_self_update" on public.profiles;
create policy "profiles_self_update" on public.profiles
  for update
  using (auth.uid() = id);
