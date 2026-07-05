-- Per-clause election state: bracket option choices, blank fill-ins, and an
-- accept / reject / rewrite disposition for each term-sheet clause.
begin;

create table if not exists public.clause_states (
  section_id uuid primary key references public.document_sections(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'rejected', 'rewrite')),
  -- Map of election index -> { mode: 'option' | 'custom' | 'omit', value: text }
  elections jsonb not null default '{}'::jsonb,
  rewrite_text text,
  notes text,
  updated_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists clause_states_project_idx on public.clause_states(project_id);

drop trigger if exists touch_clause_states_updated_at on public.clause_states;
create trigger touch_clause_states_updated_at before update on public.clause_states
for each row execute function public.touch_updated_at();

alter table public.clause_states enable row level security;

drop policy if exists clause_states_select_members on public.clause_states;
create policy clause_states_select_members on public.clause_states
for select to authenticated using (public.is_project_member(project_id));

drop policy if exists clause_states_insert_editors on public.clause_states;
create policy clause_states_insert_editors on public.clause_states
for insert to authenticated with check (public.can_edit_project(project_id));

drop policy if exists clause_states_update_editors on public.clause_states;
create policy clause_states_update_editors on public.clause_states
for update to authenticated using (public.can_edit_project(project_id)) with check (public.can_edit_project(project_id));

drop policy if exists clause_states_delete_editors on public.clause_states;
create policy clause_states_delete_editors on public.clause_states
for delete to authenticated using (public.can_edit_project(project_id));

grant select, insert, update, delete on public.clause_states to authenticated;

commit;
