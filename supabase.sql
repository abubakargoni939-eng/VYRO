-- VYRO LIVE v1 database
create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null,
  display_name text,
  bio text default 'Exploring people, places and stories around the world. 🌍',
  country text default '🌍',
  level int not null default 1,
  xp int not null default 0,
  followers_count int not null default 0,
  following_count int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  content text not null check (char_length(content) between 1 and 280),
  created_at timestamptz not null default now()
);

create table if not exists public.likes (
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id,user_id)
);

create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  content text not null check (char_length(content) between 1 and 500),
  created_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, username, display_name)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data->>'username',''), 'user_' || substr(replace(new.id::text,'-',''),1,8)),
    coalesce(nullif(new.raw_user_meta_data->>'username',''), 'VYRO User')
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.posts enable row level security;
alter table public.likes enable row level security;
alter table public.comments enable row level security;

drop policy if exists "profiles are public" on public.profiles;
create policy "profiles are public" on public.profiles for select using (true);
drop policy if exists "users update own profile" on public.profiles;
create policy "users update own profile" on public.profiles for update using (auth.uid()=id);

drop policy if exists "posts are public" on public.posts;
create policy "posts are public" on public.posts for select using (true);
drop policy if exists "users create own posts" on public.posts;
create policy "users create own posts" on public.posts for insert with check (auth.uid()=user_id);
drop policy if exists "users delete own posts" on public.posts;
create policy "users delete own posts" on public.posts for delete using (auth.uid()=user_id);

drop policy if exists "likes are public" on public.likes;
create policy "likes are public" on public.likes for select using (true);
drop policy if exists "users create own likes" on public.likes;
create policy "users create own likes" on public.likes for insert with check (auth.uid()=user_id);
drop policy if exists "users delete own likes" on public.likes;
create policy "users delete own likes" on public.likes for delete using (auth.uid()=user_id);

drop policy if exists "comments are public" on public.comments;
create policy "comments are public" on public.comments for select using (true);
drop policy if exists "users create own comments" on public.comments;
create policy "users create own comments" on public.comments for insert with check (auth.uid()=user_id);
drop policy if exists "users delete own comments" on public.comments;
create policy "users delete own comments" on public.comments for delete using (auth.uid()=user_id);
