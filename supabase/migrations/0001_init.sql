-- ============================================================================
-- TMT Agent Onboarding — Schema
-- Paste this into the Supabase SQL Editor and run it.
-- ============================================================================

-- ---------- ENUMS ----------
create type user_role        as enum ('agent', 'admin');
create type license_status   as enum ('newly_licensed', 'transferring');
create type agent_status     as enum ('onboarding', 'leads_active', 'completed', 'paused');
create type task_type        as enum ('sign','doc','self','ack','video','admin','roleplay','ext','rep','recur','milestone');
create type evidence_type    as enum ('esign','upload','checkbox','signoff','score','counter','none');
create type verifier_kind    as enum ('self','admin','auto','none');   -- 'admin' = Noah/Tiffany sign-off
create type applies_when     as enum ('all','transferring','newly_licensed','new_agent','once_hired');
create type task_status      as enum ('locked','not_started','in_progress','submitted','verified','rejected');
create type content_status   as enum ('exists','create');

-- ---------- PROFILES (one row per login, extends auth.users) ----------
create table profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  full_name     text,
  email         text unique not null,
  role          user_role not null default 'agent',
  can_verify    boolean not null default false,   -- Noah, Tiffany
  can_provision boolean not null default false,   -- Noah, Taylor Gabriel
  created_at    timestamptz not null default now()
);

-- Helper: is the current user an admin?
create or replace function is_admin() returns boolean
language sql security definer stable set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and role = 'admin');
$$;

-- ---------- STAGES ----------
create table stages (
  id          uuid primary key default gen_random_uuid(),
  key         text unique not null,
  title       text not null,
  sort_order  int  not null
);

-- ---------- TASKS (the catalog / template) ----------
create table tasks (
  id              uuid primary key default gen_random_uuid(),
  stage_id        uuid not null references stages(id) on delete cascade,
  key             text unique not null,
  title           text not null,
  description     text,
  type            task_type not null,
  content_owner   text,                       -- display: who delivers (Tiffany, Taylor, Adriana...)
  verifier        verifier_kind not null default 'self',
  evidence        evidence_type not null default 'checkbox',
  applies         applies_when not null default 'all',
  is_hard_gate    boolean not null default false,   -- blocks lead activation
  target_count    int,                              -- rep/recurring goals (e.g. 10, 15, 5)
  pass_threshold  numeric,                          -- e.g. MaverickRE 7.0/10
  content_state   content_status not null default 'exists',
  content_url     text,                             -- loom / doc link (fill as recorded)
  recurrence      text,                             -- e.g. 'weekly'
  sort_order      int not null
);

-- ---------- AGENTS (the onboarding subject) ----------
create table agents (
  id                 uuid primary key default gen_random_uuid(),
  profile_id         uuid references profiles(id) on delete set null,  -- their login (set when they first sign in)
  full_name          text not null,
  email              text not null,
  start_date         date,
  license            license_status not null,
  license_states     text[] not null default '{}',   -- {GA}, {SC}, {GA,SC}
  is_new             boolean not null default false,  -- "if new" conditional tasks
  status             agent_status not null default 'onboarding',
  leads_activated_at timestamptz,
  created_by         uuid references profiles(id),
  created_at         timestamptz not null default now()
);

-- ---------- AGENT_TASKS (per-agent instances) ----------
create table agent_tasks (
  id             uuid primary key default gen_random_uuid(),
  agent_id       uuid not null references agents(id) on delete cascade,
  task_id        uuid not null references tasks(id) on delete cascade,
  status         task_status not null default 'not_started',
  progress_count int not null default 0,        -- for rep/recurring tasks
  evidence_url   text,
  score          numeric,
  notes          text,
  completed_at   timestamptz,
  verified_by    uuid references profiles(id),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique (agent_id, task_id)
);

-- ---------- ROLEPLAY ATTEMPTS (MaverickRE, 0-10) ----------
create table roleplay_attempts (
  id          uuid primary key default gen_random_uuid(),
  agent_id    uuid not null references agents(id) on delete cascade,
  attempt_no  int not null,
  score       numeric not null check (score >= 0 and score <= 10),
  result_url  text,                 -- uploaded MaverickRE result email
  verified_by uuid references profiles(id),
  created_at  timestamptz not null default now()
);

-- ---------- DOCUMENTS (auto-routed to bookkeeping) ----------
create table documents (
  id                uuid primary key default gen_random_uuid(),
  agent_id          uuid not null references agents(id) on delete cascade,
  doc_type          text not null,        -- 'w9','direct_deposit','voided_check','drivers_license','sponsoring_broker'
  file_url          text,
  signed            boolean not null default false,
  emailed_bookkeeping_at timestamptz,
  created_at        timestamptz not null default now()
);

-- ---------- EVENTS (admin review queue + notifications) ----------
create table events (
  id          uuid primary key default gen_random_uuid(),
  agent_id    uuid references agents(id) on delete cascade,
  type        text not null,    -- 'gate_cleared','roleplay_submitted','doc_submitted','zillow_ready', etc.
  message     text not null,
  payload     jsonb,
  read_at     timestamptz,
  created_at  timestamptz not null default now()
);

-- ============================================================================
-- AUTO-INSTANTIATE: when an agent is created, build their applicable task list
-- ============================================================================
create or replace function instantiate_agent_tasks() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into agent_tasks (agent_id, task_id, status)
  select new.id, t.id, 'not_started'
  from tasks t
  where t.applies = 'all'
     or (t.applies = 'transferring'   and new.license = 'transferring')
     or (t.applies = 'newly_licensed' and new.license = 'newly_licensed')
     or (t.applies = 'new_agent'      and new.is_new = true);
     -- 'once_hired' tasks are added manually when that role exists
  return new;
end;
$$;

create trigger trg_instantiate_agent_tasks
after insert on agents
for each row execute function instantiate_agent_tasks();

-- ============================================================================
-- GATE CHECK: when a hard-gate task is verified, see if the agent cleared it
-- ============================================================================
create or replace function check_lead_gate() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  remaining int;
begin
  if new.status = 'verified' then
    select count(*) into remaining
    from agent_tasks at
    join tasks t on t.id = at.task_id
    where at.agent_id = new.agent_id
      and t.is_hard_gate = true
      and at.status <> 'verified';

    if remaining = 0 then
      -- Avoid duplicate alerts
      if not exists (select 1 from events where agent_id = new.agent_id and type = 'gate_cleared') then
        insert into events (agent_id, type, message)
        values (new.agent_id, 'gate_cleared',
                'All hard-gate items verified — ready to activate leads (Flex / Opcity / RDC / Zillow Premier).');
      end if;
    end if;
  end if;
  return new;
end;
$$;

create trigger trg_check_lead_gate
after update of status on agent_tasks
for each row execute function check_lead_gate();

-- Convenience view: gate progress per agent
create view agent_gate_status as
select a.id as agent_id, a.full_name,
       count(*) filter (where t.is_hard_gate) as gate_total,
       count(*) filter (where t.is_hard_gate and at.status = 'verified') as gate_done,
       bool_and(at.status = 'verified') filter (where t.is_hard_gate) as gate_cleared
from agents a
join agent_tasks at on at.agent_id = a.id
join tasks t on t.id = at.task_id
group by a.id, a.full_name;

-- ============================================================================
-- ROW-LEVEL SECURITY
-- ============================================================================
alter table profiles          enable row level security;
alter table agents            enable row level security;
alter table agent_tasks       enable row level security;
alter table roleplay_attempts enable row level security;
alter table documents         enable row level security;
alter table events            enable row level security;
-- stages & tasks are catalog data: readable by all authenticated users
alter table stages enable row level security;
alter table tasks  enable row level security;

-- profiles: read own or (admin) all; update own
create policy profiles_read   on profiles for select using (id = auth.uid() or is_admin());
create policy profiles_update on profiles for update using (id = auth.uid() or is_admin());

-- catalog: any authenticated user can read; only admins write
create policy stages_read on stages for select using (auth.role() = 'authenticated');
create policy tasks_read  on tasks  for select using (auth.role() = 'authenticated');
create policy stages_admin on stages for all using (is_admin()) with check (is_admin());
create policy tasks_admin  on tasks  for all using (is_admin()) with check (is_admin());

-- agents: agent reads own record; admins do everything
create policy agents_self_read on agents for select
  using (is_admin() or profile_id = auth.uid());
create policy agents_admin on agents for all using (is_admin()) with check (is_admin());

-- agent_tasks: agent reads/updates own; admins everything
create policy agent_tasks_self_read on agent_tasks for select
  using (is_admin() or exists (select 1 from agents a where a.id = agent_tasks.agent_id and a.profile_id = auth.uid()));
create policy agent_tasks_self_update on agent_tasks for update
  using (exists (select 1 from agents a where a.id = agent_tasks.agent_id and a.profile_id = auth.uid()));
create policy agent_tasks_admin on agent_tasks for all using (is_admin()) with check (is_admin());

-- roleplay / documents: agent owns own; admins everything
create policy roleplay_self on roleplay_attempts for all
  using (is_admin() or exists (select 1 from agents a where a.id = roleplay_attempts.agent_id and a.profile_id = auth.uid()))
  with check (is_admin() or exists (select 1 from agents a where a.id = roleplay_attempts.agent_id and a.profile_id = auth.uid()));
create policy documents_self on documents for all
  using (is_admin() or exists (select 1 from agents a where a.id = documents.agent_id and a.profile_id = auth.uid()))
  with check (is_admin() or exists (select 1 from agents a where a.id = documents.agent_id and a.profile_id = auth.uid()));

-- events: admins only (review queue)
create policy events_admin on events for all using (is_admin()) with check (is_admin());
