-- ============================================================================
-- ASCENT v2 — Roles-as-data, day-based journey, gates, metrics
-- Makes the onboarding checklist (Day −10 → Day 60) the canonical catalog.
-- Re-runnable AFTER 0001–0005. Reseeds stages/tasks (cascades agent_tasks —
-- do NOT run against a project with live onboarding agents without a plan).
-- ============================================================================

-- ---------- ROLES AS DATA ----------
-- Tasks point at roles, people are assigned to roles. Hiring a Director of
-- Operations later = one row change, every queue/verification reroutes.
create table if not exists team_roles (
  key         text primary key,          -- 'broker','sales_manager','operations',...
  title       text not null,
  sort_order  int  not null default 0
);

create table if not exists role_assignments (
  role_key    text not null references team_roles(key) on delete cascade,
  person_name text not null,
  email       text,
  profile_id  uuid references profiles(id) on delete set null,  -- linked at first login by email
  primary key (role_key, person_name)
);

insert into team_roles (key, title, sort_order) values
  ('broker',        'Broker',              0),
  ('sales_manager', 'Sales Manager',       1),
  ('operations',    'Operations',          2),
  ('transactions',  'Transaction Manager', 3),
  ('marketing',     'Marketing',           4)
on conflict (key) do nothing;

insert into role_assignments (role_key, person_name, email) values
  ('broker',        'Noah McBride',    'noah@themcbrideteam.com'),
  ('sales_manager', 'Tiffany Ferrell', 'tferrell@themcbrideteam.com'),
  ('operations',    'Taylor Gabriel',  'bookkeeping@c21magnolia.com'),
  ('transactions',  'Riley Hunter',    'riley@themcbrideteam.com'),
  ('marketing',     'Whitney',         null)
on conflict do nothing;

-- Link an admin login to their role rows by email (runs on demand).
create or replace function link_role_profiles() returns void
language sql security definer set search_path = public as $$
  update role_assignments ra set profile_id = p.id
  from profiles p where lower(p.email) = lower(ra.email) and ra.profile_id is null;
$$;

-- ---------- DAY-BASED JOURNEY COLUMNS ----------
alter table stages add column if not exists day_from int;
alter table stages add column if not exists day_to   int;
alter table stages add column if not exists note     text;
alter table stages add column if not exists gate_key text;   -- gate at the end of this phase

alter table tasks add column if not exists owner_role text;  -- references team_roles.key or 'agent'
alter table tasks add column if not exists due_day    int;   -- relative to Day 1 = start_date
alter table tasks add column if not exists links      jsonb; -- [{"l":"label","u":"url"}]
alter table tasks add column if not exists recurring  boolean not null default false;

-- ---------- GATE CLEARANCES (sign-offs are attributed) ----------
create table if not exists agent_gates (
  agent_id   uuid not null references agents(id) on delete cascade,
  gate_key   text not null,               -- 'g0','g8','g30','g60'
  cleared_at timestamptz not null default now(),
  cleared_by uuid references profiles(id),
  note       text,
  primary key (agent_id, gate_key)
);

-- ---------- METRIC EVENTS (append-only; agent taps + future FUB sync) ----------
create table if not exists metric_events (
  id         uuid primary key default gen_random_uuid(),
  agent_id   uuid not null references agents(id) on delete cascade,
  key        text not null,               -- 'conversation','preview','shadow','note','hour_of_power','pending','closing'
  delta      int  not null default 1,
  source     text not null default 'manual',  -- 'manual' | 'fub_sync'
  created_at timestamptz not null default now()
);
create index if not exists metric_events_agent_key on metric_events (agent_id, key, created_at);

create or replace view agent_metric_totals as
select agent_id, key,
       sum(delta)                                                        as total,
       sum(delta) filter (where created_at > now() - interval '7 days')  as last_7d
from metric_events group by agent_id, key;

-- ---------- COACHING NOTES ----------
create table if not exists agent_notes (
  id         uuid primary key default gen_random_uuid(),
  agent_id   uuid not null references agents(id) on delete cascade,
  author_id  uuid references profiles(id),
  body       text not null,
  created_at timestamptz not null default now()
);

-- ---------- ADMIN-ADDED LIBRARY ITEMS (static seed lives in code) ----------
create table if not exists library_items (
  id         uuid primary key default gen_random_uuid(),
  type       text not null default 'link',   -- 'doc','link','video','book'
  title      text not null,
  descr      text,
  tags       text[] not null default '{}',
  url        text,
  body       text,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now()
);

-- ---------- RLS ----------
alter table team_roles       enable row level security;
alter table role_assignments enable row level security;
alter table agent_gates      enable row level security;
alter table metric_events    enable row level security;
alter table agent_notes      enable row level security;
alter table library_items    enable row level security;

create policy team_roles_read  on team_roles       for select using (auth.role() = 'authenticated');
create policy role_assign_read on role_assignments for select using (auth.role() = 'authenticated');
create policy team_roles_admin on team_roles       for all using (is_admin()) with check (is_admin());
create policy role_assign_admin on role_assignments for all using (is_admin()) with check (is_admin());

create policy agent_gates_read on agent_gates for select
  using (is_admin() or exists (select 1 from agents a where a.id = agent_gates.agent_id and a.profile_id = auth.uid()));
create policy agent_gates_admin on agent_gates for all using (is_admin()) with check (is_admin());

create policy metric_self on metric_events for all
  using (is_admin() or exists (select 1 from agents a where a.id = metric_events.agent_id and a.profile_id = auth.uid()))
  with check (is_admin() or exists (select 1 from agents a where a.id = metric_events.agent_id and a.profile_id = auth.uid()));

create policy notes_admin on agent_notes for all using (is_admin()) with check (is_admin());
create policy notes_agent_read on agent_notes for select
  using (is_admin() or exists (select 1 from agents a where a.id = agent_notes.agent_id and a.profile_id = auth.uid()));

create policy library_read  on library_items for select using (auth.role() = 'authenticated');
create policy library_admin on library_items for all using (is_admin()) with check (is_admin());

-- ============================================================================
-- CANONICAL CATALOG — the checklist, Day −10 → Day 60
-- ============================================================================
delete from tasks;
delete from stages;

insert into stages (key, title, sort_order, day_from, day_to, note, gate_key) values
  ('pre',    'Pre-Flight',                  0, -10, 0,  'Paperwork, licensing, systems, pre-reading. Nothing proceeds until the ICA is signed.', 'g0'),
  ('found',  'Foundation',                  1, 1,   2,  'Goals become a 90-day plan on day one. Core values, role videos, CRM standards, first role plays.', null),
  ('cert',   'Certification Sprint',        2, 3,   5,  'Buyer consults, contracts, CMAs, practice offers. Skills are certified, not assumed.', null),
  ('field',  'Field Immersion',             3, 6,   7,  'Shadows, a pond to fish, and the final push to clear every Launch Gate criterion.', 'g8'),
  ('wheels', 'Production · Training Wheels',4, 9,   10, 'Live leads with Tiffany listening in. Real production, coached in real time.', null),
  ('reinf',  'Reinforcement',               5, 11,  30, 'In production. Weekly 1:1s, first open house, the 50-conversation floor becomes habit.', 'g30'),
  ('orbit',  'Orbit — Production Ramp',     6, 31,  60, 'The checklist ends; the ramp does not. Milestones from first pending to a 24-unit pace.', 'g60');

create or replace function _sid(k text) returns uuid
language sql stable as $$ select id from stages where key = k $$;

insert into tasks
  (stage_id, key, title, description, type, owner_role, verifier, evidence, applies,
   is_hard_gate, target_count, pass_threshold, content_state, content_url, due_day, links, recurring, sort_order)
values
-- ==================== PRE-FLIGHT (Day −10 → 0) ====================
(_sid('pre'),'ica','Sign ICA + restrictive covenants','Blocker — nothing proceeds unsigned.','sign','agent','auto','esign','all',true,null,null,'exists',null,-8,null,false,0),
(_sid('pre'),'performance','Team Performance Standards Policy','Production, service, and accountability standards — a condition of receiving team leads.','sign','agent','auto','esign','all',true,null,null,'exists',null,-7,null,false,1),
(_sid('pre'),'w9','W-9','Complete and e-sign. Auto-routed to bookkeeping.','sign','agent','auto','esign','all',true,null,null,'exists',null,-7,null,false,2),
(_sid('pre'),'direct_deposit','Direct deposit form','Complete and e-sign. Auto-routed to bookkeeping.','sign','agent','auto','esign','all',true,null,null,'exists',null,-7,null,false,3),
(_sid('pre'),'voided_check','Voided check','Upload. Auto-routed to bookkeeping.','doc','agent','auto','upload','all',true,null,null,'exists',null,-7,null,false,4),
(_sid('pre'),'drivers_license','Driver''s license','Upload. Auto-routed to bookkeeping.','doc','agent','auto','upload','all',true,null,null,'exists',null,-7,null,false,5),
(_sid('pre'),'questionnaire','Team member questionnaire','We want to know ALL about you, but not in a creepy way.','self','agent','self','checkbox','all',false,null,null,'exists',null,-3,null,false,6),
(_sid('pre'),'welcome_email','Send Welcome to the Team email',null,'admin','broker','admin','signoff','all',false,null,null,'exists',null,-7,null,false,7),
(_sid('pre'),'grec','GREC license transfer','ata.grec.state.ga.us → add/transfer agent by license number, sign change application as broker.','admin','broker','admin','signoff','all',true,null,null,'exists','https://ata.grec.state.ga.us',-5,null,false,8),
(_sid('pre'),'license_transfer','Transfer license on LLR',null,'doc','agent','admin','upload','transferring',true,null,null,'exists',null,-6,null,false,9),
(_sid('pre'),'sponsoring_broker','Sponsoring broker form','For newly licensed agents.','sign','agent','admin','esign','newly_licensed',true,null,null,'create',null,-6,null,false,10),
(_sid('pre'),'rga','RGA membership — transfer or join','Existing members: transfer form signed by Noah + former broker → jsummers@augustarealtors.com. New members: new member form. Email Lauren Guillebeau to pay dues + schedule orientation.','self','agent','self','checkbox','all',false,null,null,'exists',null,-5,null,false,11),
(_sid('pre'),'ylopo_reg','Submit Ylopo registration form','Agent website profile.','admin','broker','admin','signoff','all',false,null,null,'exists','https://ylopo.formstack.com/forms/agent_profile_page_questionnaire',-5,'[{"l":"Ylopo form","u":"https://ylopo.formstack.com/forms/agent_profile_page_questionnaire"}]'::jsonb,false,12),
(_sid('pre'),'tmt_email','Create Gmail + email signature','first initial + last name @themcbrideteam.com.','admin','operations','admin','signoff','all',true,null,null,'exists',null,-6,null,false,13),
(_sid('pre'),'add_fub','Add to Follow Up Boss',null,'admin','operations','admin','signoff','all',true,null,null,'exists',null,-5,null,false,14),
(_sid('pre'),'add_slack','Add to Slack','Plus Slack installed on the agent''s phone.','admin','operations','admin','signoff','all',true,null,null,'exists',null,-5,null,false,15),
(_sid('pre'),'add_dotloop','Add to Dotloop',null,'admin','operations','admin','signoff','all',true,null,null,'exists',null,-5,null,false,16),
(_sid('pre'),'mls_hive','MLS (HIVE) access',null,'admin','operations','admin','signoff','all',false,null,null,'exists',null,-5,null,false,17),
(_sid('pre'),'gdrive_folder','Google Drive folder + calendar sharing','Agent folder created; calendar shared with the admin team.','admin','operations','admin','signoff','all',false,null,null,'exists',null,-5,null,false,18),
(_sid('pre'),'headshot_schedule','Schedule branded headshot session','Navy, creme, light gold.','admin','operations','admin','signoff','all',false,null,null,'exists',null,-6,null,false,19),
(_sid('pre'),'headshot_bio','Submit bio + attend headshot session',null,'doc','agent','auto','upload','all',false,null,null,'exists',null,-4,null,false,20),
(_sid('pre'),'nar_ethics','NAR Code of Ethics + Fairhaven simulation','Upload the completion certificates.','self','agent','self','upload','all',true,null,null,'exists','https://fairhaven.realtor',-4,null,false,21),
(_sid('pre'),'read_ewts','Read Exactly What to Say, chapters 1–8','The phrases feed weekly 1:1 role plays — read for use, not completion.','self','agent','self','checkbox','all',true,null,null,'exists',null,-2,null,false,22),
(_sid('pre'),'db_jogger','Complete + submit database memory jogger','Every name you know. This becomes your sphere in FUB on Day 2.','self','agent','self','checkbox','all',true,null,null,'exists',null,-3,null,false,23),
(_sid('pre'),'swag_bag','Prepare swag bag',null,'admin','operations','admin','signoff','all',false,null,null,'exists',null,-2,null,false,24),
(_sid('pre'),'workspace_ready','Workspace ready for Day 1','Laptop, printer, scanner access, back door code, Supra eKey configured with the board on the agent''s iPhone.','admin','operations','admin','signoff','all',false,null,null,'exists',null,-1,null,false,25),
(_sid('pre'),'business_cards','Order business cards, signs, riders','Once headshot is received.','admin','marketing','admin','signoff','all',false,null,null,'exists',null,-2,null,false,26),
(_sid('pre'),'zillow_team','Zillow team page + Premier Agent roster','Create agent Zillow profile if new; roster via team invite.','admin','marketing','admin','signoff','all',false,null,null,'exists',null,-3,'[{"l":"Flex team invite","u":"https://www.zillow.com/onboarding/flex/team-lead/landing"},{"l":"Premier Agent setup","u":"https://www.loom.com/share/81f19e3c7e784116a7cfd97f1f7678b1"}]'::jsonb,false,27),
(_sid('pre'),'opcity_mvip','Add to Opcity / Realtor.com MVIP',null,'admin','marketing','admin','signoff','all',false,null,null,'exists',null,-3,null,false,28),
(_sid('pre'),'social_announcement','Prep social media announcement','For the McBride Team page — posts on launch day.','admin','marketing','admin','signoff','all',false,null,null,'exists',null,-1,null,false,29),
(_sid('pre'),'profiles_prep','Prep realtor.com + Google Business updates',null,'admin','marketing','admin','signoff','all',false,null,null,'exists',null,-1,null,false,30),
(_sid('pre'),'approve_start','Approve start date','Only when Gate 0 is complete. Not complete = start date moves.','milestone','broker','admin','signoff','all',false,null,null,'exists',null,0,null,false,31),
-- ==================== FOUNDATION (Days 1–2) ====================
(_sid('found'),'goals_session','Goals session → 90-day business plan','Short and long-term goals converted into a written 90-day plan, on the spot. Day 1 AM.','admin','broker','admin','signoff','all',false,null,null,'exists',null,1,null,false,0),
(_sid('found'),'core_values','Core values + vision','Relentless Growth · Excellence in Execution · Ownership & Accountability · Innovation & Adaptability · Legacy Through Service. "Guiding you home."','video','agent','self','checkbox','all',false,null,null,'exists','https://www.loom.com/share/3a988f376a0f45e1ac4d92e63ae7ee9a',1,'[{"l":"Core values","u":"https://www.loom.com/share/3a988f376a0f45e1ac4d92e63ae7ee9a"},{"l":"Vision for TMT","u":"https://www.loom.com/share/080af4b88f6345138d8df3a55e814607"}]'::jsonb,false,1),
(_sid('found'),'welcome_fasttrack','Welcome to The McBride Team — Fast Track','Start here on Day 1.','video','agent','self','checkbox','all',false,null,null,'exists','https://www.loom.com/share/3bc97297c79342cd988947af80ae6d63',1,null,false,2),
(_sid('found'),'team_roles','Team roles & responsibilities','Riley (transactions) · Taylor (bookkeeping) · Tiffany (sales) · Whitney (marketing). Day 1 PM.','video','agent','self','checkbox','all',false,null,null,'exists','https://www.loom.com/share/b1c8e53a87d04ce893b56928f476ce47',1,null,false,3),
(_sid('found'),'setup_1on1','Set weekly 1:1 cadence','Book discussion built in — 3 phrases role-played per session.','admin','sales_manager','admin','signoff','all',false,null,null,'exists',null,1,null,false,4),
(_sid('found'),'swag_deliver','Deliver swag bag + confirm workspace','Laptop, printer, scanner, door code all confirmed working.','admin','operations','admin','signoff','all',false,null,null,'exists',null,1,null,false,5),
(_sid('found'),'advertising_guidelines','Advertising guidelines video + fair housing recap','GREC compliance.','ack','agent','self','checkbox','all',false,null,null,'create',null,1,null,false,6),
(_sid('found'),'tech_stack','Overview of the tech stack','The core tools you''ll use day to day.','video','agent','self','checkbox','all',false,null,null,'exists','https://www.loom.com/share/df630df8b0c14c598c0bfc4f090dc713',1,null,false,7),
(_sid('found'),'fub_howwedo','Follow Up Boss 101','Team stages, ponds, conventions.','video','agent','self','checkbox','all',false,null,null,'exists','https://www.loom.com/share/8a5266a1ea3e462090a291882f800371',2,null,false,8),
(_sid('found'),'fub_setup','Set up your Follow Up Boss account','Login, profile, notifications, mobile app.','video','agent','self','checkbox','all',true,null,null,'exists','https://www.loom.com/share/e5cfc1761bca411898dc31b2c9fa99cc',2,null,false,9),
(_sid('found'),'fub_daily','The best morning workflow','Smart lists, action plans, logging, tasks.','video','agent','self','checkbox','all',false,null,null,'exists','https://www.loom.com/share/8d008261cdc54051aaaea4e886b8ba06',2,null,false,10),
(_sid('found'),'advanced_fub','Advanced FUB training','Team CRM standards; finalize FUB setup with Tiffany.','admin','sales_manager','admin','signoff','all',false,null,null,'exists',null,2,null,false,11),
(_sid('found'),'assign_roleplays','Assign first 3 MaverickRE role plays',null,'admin','sales_manager','admin','signoff','all',false,null,null,'exists',null,2,null,false,12),
(_sid('found'),'db_jogger_fub','Upload memory jogger to FUB + begin sphere calls','Sphere loaded is a Launch Gate criterion — conversation attempts count from here.','self','agent','self','checkbox','all',true,null,null,'exists',null,2,null,false,13),
-- ==================== CERTIFICATION SPRINT (Days 3–5) ====================
(_sid('cert'),'buyer_consult_training','Buyer consultation training','Includes the buyer brokerage agreement. With Noah.','admin','broker','admin','signoff','all',false,null,null,'exists',null,3,null,false,0),
(_sid('cert'),'mock_consult','Mock buyer consult certification','Pass/fail sign-off with Noah. A fail means a named gap and a re-run.','admin','broker','admin','signoff','all',true,null,null,'exists',null,5,null,false,1),
(_sid('cert'),'cma_training','CMA training — offer pricing strategy','Framed as pricing offers to win, not just listing prep.','admin','sales_manager','admin','signoff','all',false,null,null,'exists',null,3,null,false,2),
(_sid('cert'),'mls_class','Schedule MLS / Flex intro class',null,'admin','sales_manager','admin','signoff','all',false,null,null,'exists',null,4,null,false,3),
(_sid('cert'),'maverick_roleplay','MaverickRE role plays','3 daily — 15 total by Day 6 at an 8/10+ average. Upload the emailed result as evidence.','roleplay','agent','admin','score','all',true,15,8,'exists',null,6,null,false,4),
(_sid('cert'),'contracts_video','Contracts video + GREC working session','Purchase & sale agreement — the key fields.','video','agent','self','checkbox','all',false,null,null,'exists','https://www.loom.com/share/bca3845a4f3e4026a719e62d89532894',4,null,false,5),
(_sid('cert'),'setup_dotloop_v','Set up your Dotloop account',null,'video','agent','self','checkbox','all',false,null,null,'exists','https://www.loom.com/share/c327fbc4797c43c6bb4aaac6620a006b',4,null,false,6),
(_sid('cert'),'intro_dotloop_v','How to build an offer in Dotloop',null,'video','agent','self','checkbox','all',false,null,null,'exists','https://www.loom.com/share/c849f1d3ba3b47c8a02bfc8c9b8a8b49',4,null,false,7),
(_sid('cert'),'intro_flex','Intro to Flex',null,'self','agent','self','checkbox','all',false,null,null,'exists',null,4,null,false,8),
(_sid('cert'),'practice_offers','Write practice offers','FHA / VA / Conventional — 3 offers (experienced agents write 1). Due Day 5; Riley reviews.','rep','agent','self','counter','all',false,3,null,'exists',null,5,null,false,9),
(_sid('cert'),'practice_offers_review','Review practice offers','Doubles as the contract handoff process intro.','admin','transactions','admin','signoff','all',true,null,null,'exists',null,5,null,false,10),
(_sid('cert'),'two_zhl_lenders','Build a relationship with 2 ZHL lenders','Call through the lender list, connect with two, submit their names for confirmation.','self','agent','admin','none','all',false,2,null,'exists',null,5,null,false,11),
(_sid('cert'),'zhl_products','ZHL products + Zillow Preferred training','The 4-unit learning plan, Preferred agreement, and Premier Agent app.','self','agent','self','checkbox','all',false,null,null,'exists',null,5,'[{"l":"Learning plan","u":"https://academy.zillowgroup.com/learn/learning-plans/439/zillow-preferred-onboarding-learning-plan?generated_by=190880&hash=22ff444808bc8a71daf44de54cc7b4ea730ca4cd"},{"l":"Preferred agreement","u":"https://www.zillow.com/pbflex/agent"},{"l":"Premier Agent app","u":"https://academy.zillowgroup.com/learn/courses/850/zillow-premier-agent-connections-support-services"},{"l":"Zillow metrics","u":"https://www.loom.com/share/dd1c966700c54ed28d7666dc12afa7b2"}]'::jsonb,false,12),
(_sid('cert'),'zillow_confirm','Confirm your Zillow Premier Agent account','Notifies Noah to add you to the team on Zillow Premier.','self','agent','self','checkbox','all',false,null,null,'exists',null,5,null,false,13),
(_sid('cert'),'preview_15','Daily previews','1–2 homes daily, every day through Day 10+. 15 by launch.','rep','agent','self','counter','all',false,15,null,'exists',null,8,null,true,14),
(_sid('cert'),'monitor_scores','Monitor role play scores daily',null,'admin','sales_manager','admin','signoff','all',false,null,null,'exists',null,5,null,true,15),
-- ==================== FIELD IMMERSION (Days 6–7) + LAUNCH DAY 8 ====================
(_sid('field'),'tour_shadow','Lead home tour shadow','With Tiffany.','admin','sales_manager','admin','signoff','all',false,null,null,'exists',null,6,null,false,0),
(_sid('field'),'ride_alongs','Coordinate showing ride-alongs with top agents','Target 6–8 of the 12 total shadows here.','admin','sales_manager','admin','signoff','all',false,null,null,'exists',null,7,null,false,1),
(_sid('field'),'shadow_12','Shadow showings','6–8 during Field Immersion; 12 total by Day 15.','rep','agent','self','counter','all',false,12,null,'exists',null,15,null,false,2),
(_sid('field'),'fish_pond','Fish a pond','Work 25 nurture leads, set 1 appointment.','rep','agent','self','counter','all',false,1,null,'exists',null,7,null,false,3),
(_sid('field'),'mock_cmas','Complete 3 mock CMAs','Personal home + 2 others. Due Day 7.','rep','agent','self','counter','all',true,3,null,'exists',null,7,null,false,4),
(_sid('field'),'fub_demo','FUB workflow demonstrated live','Lead → tag → action plan → follow-up, demonstrated to Tiffany.','admin','sales_manager','admin','signoff','all',true,null,null,'exists',null,8,null,false,5),
(_sid('field'),'zhl_articulation','Articulate ZHL products correctly','Verified by Tiffany at the gate.','admin','sales_manager','admin','signoff','all',true,null,null,'exists',null,8,null,false,6),
(_sid('field'),'voicemail','Update voicemail greetings','Two greetings: your FUB number and your personal cell.','self','agent','self','checkbox','all',false,null,null,'exists',null,8,null,false,7),
(_sid('field'),'turn_on_leads','Turn on leads','Flex + Opcity/RDC + Zillow Premier. Manual flip once the Launch Gate clears.','milestone','operations','admin','signoff','all',false,null,null,'exists',null,8,null,false,8),
(_sid('field'),'profiles_live','Profiles live + announcement posted','Social branded, Google Business + realtor.com live, team announcement posted.','admin','marketing','admin','signoff','all',false,null,null,'exists',null,8,null,false,9),
-- ==================== TRAINING WHEELS (Days 9–10) ====================
(_sid('wheels'),'live_listen','Listen live on first lead calls','Real-time coaching on the agent''s first live leads.','admin','sales_manager','admin','signoff','all',false,null,null,'exists',null,9,null,false,0),
(_sid('wheels'),'reverse_shadow','Reverse shadow first 2–3 showings','Tiffany rides along; agent leads.','admin','sales_manager','admin','signoff','all',false,null,null,'exists',null,10,null,false,1),
(_sid('wheels'),'partner_speed_round','Coordinate partner speed round','Motto Mortgage (Greg Leaptrotte + Taylor) · McGuinn Homes (Nate/Rachel) · David Huguenin law firm. Three 15-min videos or one lunch. New licensees: mock closing with David Huguenin.','admin','operations','admin','signoff','all',false,null,null,'exists',null,9,null,false,2),
(_sid('wheels'),'work_live_leads','Work live leads in real time',null,'self','agent','self','checkbox','all',false,null,null,'exists',null,9,null,false,3),
(_sid('wheels'),'schedule_open_house','Schedule first open house','For the Day 10–12 weekend.','self','agent','self','checkbox','all',false,null,null,'exists',null,10,null,false,4),
-- ==================== REINFORCEMENT (Days 11–30) ====================
(_sid('reinf'),'listing_training','Listing presentation + process training','Week 3, with Noah. The 14-slide listing system, CMA slides, net sheet, intake questionnaire.','admin','broker','admin','signoff','all',false,null,null,'create',null,21,null,false,0),
(_sid('reinf'),'weekly_11s','Weekly 1:1s — book + pipeline','3 Exactly What to Say phrases role-played per session, plus pipeline review.','admin','sales_manager','admin','signoff','all',false,null,null,'exists',null,30,null,true,1),
(_sid('reinf'),'day15_audit','Day 15 activity audit','Conversations, appointments, previews, shadows — against targets.','admin','sales_manager','admin','signoff','all',false,null,null,'exists',null,15,null,false,2),
(_sid('reinf'),'host_open_house','Host first open house','Week 2.','rep','agent','self','counter','all',false,1,null,'exists',null,14,null,false,3),
(_sid('reinf'),'hours_of_power','5 hours of power / week',null,'recur','agent','self','counter','all',false,5,null,'exists',null,30,null,true,4),
(_sid('reinf'),'handwritten_notes','5 handwritten notes to sphere / week',null,'recur','agent','self','counter','all',false,5,null,'exists',null,30,null,true,5),
(_sid('reinf'),'conv_50_week','50 conversations / week minimum','The floor, not the target. Tracked in FUB.','recur','agent','self','counter','all',false,50,null,'exists',null,30,null,true,6),
(_sid('reinf'),'day30_review','Day 30 review','First pending expected — or a documented action plan, reviewed with Tiffany.','milestone','sales_manager','admin','signoff','all',false,null,null,'exists',null,30,null,false,7),
-- ==================== ORBIT (Days 31–60+) ====================
(_sid('orbit'),'first_pending','First pending contract',null,'milestone','agent','admin','signoff','all',false,1,null,'exists',null,30,null,false,0),
(_sid('orbit'),'first_closing','First closing','Day 60: first closing expected, or an escalated action plan with Noah + Tiffany.','milestone','agent','admin','signoff','all',false,1,null,'exists',null,60,null,false,1);

drop function _sid(text);
