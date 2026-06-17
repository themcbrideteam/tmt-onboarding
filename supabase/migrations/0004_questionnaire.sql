-- ============================================================================
-- Team Member Questionnaire responses. Run in the Supabase SQL Editor.
-- ============================================================================
create table questionnaire_responses (
  id         uuid primary key default gen_random_uuid(),
  agent_id   uuid not null references agents(id) on delete cascade,
  answers    jsonb not null,
  created_at timestamptz not null default now()
);

alter table questionnaire_responses enable row level security;

create policy qr_access on questionnaire_responses for all
  using (is_admin() or exists (select 1 from agents a where a.id = questionnaire_responses.agent_id and a.profile_id = auth.uid()))
  with check (is_admin() or exists (select 1 from agents a where a.id = questionnaire_responses.agent_id and a.profile_id = auth.uid()));
