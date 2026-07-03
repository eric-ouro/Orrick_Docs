begin;

create extension if not exists pgcrypto with schema extensions;

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text,
  source_metadata jsonb not null default '{}'::jsonb,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.project_members (
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null default 'editor' check (role in ('owner', 'editor', 'viewer')),
  added_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  primary key (project_id, user_id)
);

create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  title text not null,
  document_type text not null default 'other' check (document_type in ('term_sheet', 'memo', 'source', 'other')),
  source_label text,
  source_url text,
  original_filename text,
  storage_path text,
  extracted_metadata jsonb not null default '{}'::jsonb,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.document_sections (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  document_id uuid not null references public.documents(id) on delete cascade,
  stable_key text not null,
  section_order integer not null default 0,
  title text not null,
  body text,
  group_title text,
  is_group boolean not null default false,
  section_kind text not null default 'section',
  source_ref jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (document_id, stable_key)
);

create table if not exists public.issues (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  stable_key text not null,
  issue_type text not null check (issue_type in ('decision', 'drafting-change', 'question', 'checklist', 'supporting-document')),
  initial_status text not null default 'open' check (initial_status in ('open', 'in-progress', 'drafted', 'follow-up', 'resolved')),
  priority text not null default 'medium' check (priority in ('high', 'medium', 'low')),
  category text,
  title text not null,
  prompt text,
  details text,
  provisional_answer text,
  source_label text,
  tags jsonb not null default '[]'::jsonb,
  sort_order integer not null default 0,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id, stable_key)
);

create table if not exists public.issue_sections (
  project_id uuid not null references public.projects(id) on delete cascade,
  issue_id uuid not null references public.issues(id) on delete cascade,
  section_id uuid not null references public.document_sections(id) on delete cascade,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  primary key (issue_id, section_id)
);

create table if not exists public.issue_states (
  issue_id uuid primary key references public.issues(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  status text not null default 'open' check (status in ('open', 'in-progress', 'drafted', 'follow-up', 'resolved')),
  owner_user_id uuid references public.profiles(id),
  owner_note text,
  answer text,
  proposed_change text,
  follow_up boolean not null default false,
  follow_up_notes text,
  resolved_at timestamptz,
  updated_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.issue_events (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  issue_id uuid not null references public.issues(id) on delete cascade,
  actor_id uuid references public.profiles(id),
  event_type text not null,
  before_state jsonb,
  after_state jsonb,
  changes jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists documents_project_idx on public.documents(project_id);
create index if not exists document_sections_project_idx on public.document_sections(project_id);
create index if not exists issues_project_idx on public.issues(project_id);
create index if not exists issue_sections_project_idx on public.issue_sections(project_id);
create index if not exists issue_states_project_idx on public.issue_states(project_id);
create index if not exists issue_events_issue_idx on public.issue_events(issue_id, created_at desc);
create index if not exists project_members_user_idx on public.project_members(user_id);

create or replace function public.is_project_member(p_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.project_members pm
    where pm.project_id = p_project_id
      and pm.user_id = auth.uid()
  );
$$;

create or replace function public.can_edit_project(p_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.project_members pm
    where pm.project_id = p_project_id
      and pm.user_id = auth.uid()
      and pm.role in ('owner', 'editor')
  );
$$;

create or replace function public.can_manage_project(p_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.project_members pm
    where pm.project_id = p_project_id
      and pm.user_id = auth.uid()
      and pm.role = 'owner'
  );
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, display_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1))
  )
  on conflict (id) do update
  set email = excluded.email,
      updated_at = now();
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create or replace function public.add_project_owner_membership()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.created_by is not null then
    insert into public.project_members (project_id, user_id, role, added_by)
    values (new.id, new.created_by, 'owner', new.created_by)
    on conflict (project_id, user_id) do nothing;
  end if;
  return new;
end;
$$;

drop trigger if exists add_project_owner_membership on public.projects;
create trigger add_project_owner_membership
after insert on public.projects
for each row execute function public.add_project_owner_membership();

create or replace function public.create_initial_issue_state()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.issue_states (issue_id, project_id, status, updated_by)
  values (new.id, new.project_id, new.initial_status, new.created_by)
  on conflict (issue_id) do nothing;
  return new;
end;
$$;

drop trigger if exists create_initial_issue_state on public.issues;
create trigger create_initial_issue_state
after insert on public.issues
for each row execute function public.create_initial_issue_state();

create or replace function public.jsonb_diff(old_state jsonb, new_state jsonb)
returns jsonb
language sql
immutable
as $$
  select coalesce(
    jsonb_object_agg(key, jsonb_build_object('old', old_state -> key, 'new', new_state -> key)),
    '{}'::jsonb
  )
  from (
    select key
    from jsonb_object_keys(coalesce(old_state, '{}'::jsonb) || coalesce(new_state, '{}'::jsonb)) as keys(key)
  ) s
  where (old_state -> key) is distinct from (new_state -> key);
$$;

create or replace function public.log_issue_state_event()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_old jsonb;
  v_new jsonb;
  v_changes jsonb;
begin
  v_old := case when tg_op = 'UPDATE' then to_jsonb(old) else null end;
  v_new := to_jsonb(new);
  v_changes := public.jsonb_diff(coalesce(v_old, '{}'::jsonb), v_new);

  insert into public.issue_events (
    project_id,
    issue_id,
    actor_id,
    event_type,
    before_state,
    after_state,
    changes
  )
  values (
    new.project_id,
    new.issue_id,
    coalesce(new.updated_by, auth.uid()),
    lower(tg_op),
    v_old,
    v_new,
    v_changes
  );

  return new;
end;
$$;

drop trigger if exists log_issue_state_event on public.issue_states;
create trigger log_issue_state_event
after insert or update on public.issue_states
for each row execute function public.log_issue_state_event();

drop trigger if exists touch_profiles_updated_at on public.profiles;
create trigger touch_profiles_updated_at before update on public.profiles
for each row execute function public.touch_updated_at();

drop trigger if exists touch_projects_updated_at on public.projects;
create trigger touch_projects_updated_at before update on public.projects
for each row execute function public.touch_updated_at();

drop trigger if exists touch_documents_updated_at on public.documents;
create trigger touch_documents_updated_at before update on public.documents
for each row execute function public.touch_updated_at();

drop trigger if exists touch_document_sections_updated_at on public.document_sections;
create trigger touch_document_sections_updated_at before update on public.document_sections
for each row execute function public.touch_updated_at();

drop trigger if exists touch_issues_updated_at on public.issues;
create trigger touch_issues_updated_at before update on public.issues
for each row execute function public.touch_updated_at();

drop trigger if exists touch_issue_states_updated_at on public.issue_states;
create trigger touch_issue_states_updated_at before update on public.issue_states
for each row execute function public.touch_updated_at();

alter table public.profiles enable row level security;
alter table public.projects enable row level security;
alter table public.project_members enable row level security;
alter table public.documents enable row level security;
alter table public.document_sections enable row level security;
alter table public.issues enable row level security;
alter table public.issue_sections enable row level security;
alter table public.issue_states enable row level security;
alter table public.issue_events enable row level security;

drop policy if exists profiles_select_authenticated on public.profiles;
create policy profiles_select_authenticated on public.profiles
for select to authenticated using (true);

drop policy if exists profiles_insert_own on public.profiles;
create policy profiles_insert_own on public.profiles
for insert to authenticated with check (id = auth.uid());

drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles
for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists projects_select_members on public.projects;
create policy projects_select_members on public.projects
for select to authenticated using (public.is_project_member(id));

drop policy if exists projects_insert_own on public.projects;
create policy projects_insert_own on public.projects
for insert to authenticated with check (created_by = auth.uid());

drop policy if exists projects_update_editors on public.projects;
create policy projects_update_editors on public.projects
for update to authenticated using (public.can_edit_project(id)) with check (public.can_edit_project(id));

drop policy if exists project_members_select_members on public.project_members;
create policy project_members_select_members on public.project_members
for select to authenticated using (user_id = auth.uid() or public.is_project_member(project_id));

drop policy if exists project_members_insert_owners on public.project_members;
create policy project_members_insert_owners on public.project_members
for insert to authenticated with check (public.can_manage_project(project_id));

drop policy if exists project_members_update_owners on public.project_members;
create policy project_members_update_owners on public.project_members
for update to authenticated using (public.can_manage_project(project_id)) with check (public.can_manage_project(project_id));

drop policy if exists project_members_delete_owners on public.project_members;
create policy project_members_delete_owners on public.project_members
for delete to authenticated using (public.can_manage_project(project_id));

drop policy if exists documents_select_members on public.documents;
create policy documents_select_members on public.documents
for select to authenticated using (public.is_project_member(project_id));

drop policy if exists documents_insert_editors on public.documents;
create policy documents_insert_editors on public.documents
for insert to authenticated with check (public.can_edit_project(project_id));

drop policy if exists documents_update_editors on public.documents;
create policy documents_update_editors on public.documents
for update to authenticated using (public.can_edit_project(project_id)) with check (public.can_edit_project(project_id));

drop policy if exists documents_delete_editors on public.documents;
create policy documents_delete_editors on public.documents
for delete to authenticated using (public.can_edit_project(project_id));

drop policy if exists document_sections_select_members on public.document_sections;
create policy document_sections_select_members on public.document_sections
for select to authenticated using (public.is_project_member(project_id));

drop policy if exists document_sections_insert_editors on public.document_sections;
create policy document_sections_insert_editors on public.document_sections
for insert to authenticated with check (public.can_edit_project(project_id));

drop policy if exists document_sections_update_editors on public.document_sections;
create policy document_sections_update_editors on public.document_sections
for update to authenticated using (public.can_edit_project(project_id)) with check (public.can_edit_project(project_id));

drop policy if exists document_sections_delete_editors on public.document_sections;
create policy document_sections_delete_editors on public.document_sections
for delete to authenticated using (public.can_edit_project(project_id));

drop policy if exists issues_select_members on public.issues;
create policy issues_select_members on public.issues
for select to authenticated using (public.is_project_member(project_id));

drop policy if exists issues_insert_editors on public.issues;
create policy issues_insert_editors on public.issues
for insert to authenticated with check (public.can_edit_project(project_id));

drop policy if exists issues_update_editors on public.issues;
create policy issues_update_editors on public.issues
for update to authenticated using (public.can_edit_project(project_id)) with check (public.can_edit_project(project_id));

drop policy if exists issues_delete_editors on public.issues;
create policy issues_delete_editors on public.issues
for delete to authenticated using (public.can_edit_project(project_id));

drop policy if exists issue_sections_select_members on public.issue_sections;
create policy issue_sections_select_members on public.issue_sections
for select to authenticated using (public.is_project_member(project_id));

drop policy if exists issue_sections_insert_editors on public.issue_sections;
create policy issue_sections_insert_editors on public.issue_sections
for insert to authenticated with check (public.can_edit_project(project_id));

drop policy if exists issue_sections_delete_editors on public.issue_sections;
create policy issue_sections_delete_editors on public.issue_sections
for delete to authenticated using (public.can_edit_project(project_id));

drop policy if exists issue_states_select_members on public.issue_states;
create policy issue_states_select_members on public.issue_states
for select to authenticated using (public.is_project_member(project_id));

drop policy if exists issue_states_insert_editors on public.issue_states;
create policy issue_states_insert_editors on public.issue_states
for insert to authenticated with check (public.can_edit_project(project_id));

drop policy if exists issue_states_update_editors on public.issue_states;
create policy issue_states_update_editors on public.issue_states
for update to authenticated using (public.can_edit_project(project_id)) with check (public.can_edit_project(project_id));

drop policy if exists issue_events_select_members on public.issue_events;
create policy issue_events_select_members on public.issue_events
for select to authenticated using (public.is_project_member(project_id));

grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on public.profiles to authenticated;
grant select, insert, update, delete on public.projects to authenticated;
grant select, insert, update, delete on public.project_members to authenticated;
grant select, insert, update, delete on public.documents to authenticated;
grant select, insert, update, delete on public.document_sections to authenticated;
grant select, insert, update, delete on public.issues to authenticated;
grant select, insert, update, delete on public.issue_sections to authenticated;
grant select, insert, update, delete on public.issue_states to authenticated;
grant select on public.issue_events to authenticated;
grant execute on function public.is_project_member(uuid) to authenticated;
grant execute on function public.can_edit_project(uuid) to authenticated;
grant execute on function public.can_manage_project(uuid) to authenticated;

commit;
