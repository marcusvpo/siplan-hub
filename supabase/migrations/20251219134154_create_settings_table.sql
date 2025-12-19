create table if not exists settings (
  key text primary key,
  value jsonb not null,
  description text,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_by uuid references auth.users(id)
);

alter table settings enable row level security;

create policy "Settings are viewable by everyone"
  on settings for select
  to authenticated
  using (true);

create policy "Settings are editable by authenticated users"
  on settings for all
  to authenticated
  using (true)
  with check (true);
