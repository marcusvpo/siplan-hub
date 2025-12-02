-- Create a table for public profiles
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade not null primary key,
  email text,
  full_name text,
  role text default 'user' check (role in ('admin', 'user')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.profiles enable row level security;

-- Create policies
create policy "Public profiles are viewable by everyone." on public.profiles
  for select using (true);

create policy "Users can insert their own profile." on public.profiles
  for insert with check (auth.uid() = id);

create policy "Users can update own profile." on public.profiles
  for update using (auth.uid() = id);

-- Create a trigger to automatically create a profile entry when a new user signs up via Supabase Auth
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name', coalesce(new.raw_user_meta_data->>'role', 'user'));
  return new;
end;
$$ language plpgsql security definer;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Function to allow Admins to create new users (RPC)
-- This function runs with security definer privileges to bypass RLS and create users in auth.users
create or replace function public.create_new_user(
  email text,
  password text,
  full_name text,
  role text
)
returns uuid
language plpgsql
security definer
as $$
declare
  new_user_id uuid;
begin
  -- Check if the executing user is an admin
  if not exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  ) then
    raise exception 'Only admins can create new users';
  end if;

  -- Create the user in auth.users
  -- Note: We cannot directly insert into auth.users easily from PL/PGSQL without using supabase_admin extensions or similar.
  -- However, a common pattern for "Admin creates user" without Edge Functions is to insert into a temporary table or just rely on the client-side `supabase.auth.signUp` if we didn't have "no registration" rule.
  -- Since we have "no registration", we need a way.
  
  -- ACTUALLY, the best way without Edge Functions is to use the `service_role` key on the client side (NOT RECOMMENDED for frontend) OR use an Edge Function.
  -- BUT, since I promised a Database Function approach, let's use the `supabase_functions` extension if available, or a trick.
  
  -- WAIT. Inserting into auth.users directly is restricted.
  -- The standard way to do this "Admin creates User" flow in Supabase WITHOUT Edge Functions is actually tricky.
  -- You usually NEED an Edge Function to call `supabaseAdmin.auth.admin.createUser()`.
  
  -- ALTERNATIVE: We can use `pg_net` to call the Supabase Admin API from Postgres, but that's complex.
  
  -- REVISED PLAN FOR THIS FUNCTION:
  -- Since we are in a "Frontend + Supabase" environment, the most robust way IS an Edge Function.
  -- However, if the user doesn't want to deploy Edge Functions, we are stuck.
  -- Let's try to use a "Invite" flow? No, user wants to create them.
  
  -- Let's stick to the plan but I will provide an Edge Function code as well, OR we can try to use a "Pending Users" table and a Trigger?
  -- No, let's assume we will use an Edge Function for the actual creation, OR we can just use the `supabase.auth.signUp` on the client side but that logs the current user out.
  
  -- OK, for this specific request "Admin creates user", the ONLY clean way without logging out is an Edge Function.
  -- I will write the SQL for the tables, and I will create a simple Edge Function file that the user *should* deploy.
  -- IF they can't deploy, I will provide a workaround: The admin "creates" the user by effectively signing them up, but that requires logging out.
  -- Actually, there is a trick: The Admin can call a Postgres function that inserts into a `new_users_queue` table, and a Database Webhook (if configured) or a scheduled job processes it. Too complex.
  
  -- Let's provide the `profiles` table setup first.
  -- I will add a comment about the user creation limitation.
  
  return null; -- Placeholder
end;
$$;
