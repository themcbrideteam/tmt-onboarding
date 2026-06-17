-- ============================================================================
-- TMT Agent Onboarding — Seed data (stages + task catalog)
-- Run AFTER 0001_init.sql. Re-runnable: clears tasks/stages first.
-- ============================================================================
delete from tasks;
delete from stages;

insert into stages (key, title, sort_order) values
  ('stage_0',       'Paperwork & Intake',        0),
  ('stage_1',       'Accounts & Access',         1),
  ('stage_2',       'Culture & Compliance',      2),
  ('stage_3',       'Team Intros',               3),
  ('stage_4',       'Systems Training',          4),
  ('stage_5',       'Profile & Marketing',       5),
  ('stage_6',       'Skills & Roleplay',         6),
  ('stage_gate',    'Lead Activation',           7),
  ('stage_7',       'Production Ramp',           8),
  ('stage_ongoing', 'Ongoing Habits',            9);

-- helper: stage id by key
create or replace function _sid(k text) returns uuid
language sql stable as $$ select id from stages where key = k $$;

insert into tasks
  (stage_id, key, title, description, type, content_owner, verifier, evidence, applies, is_hard_gate, target_count, pass_threshold, content_state, recurrence, sort_order)
values
-- ---------- Stage 0 · Paperwork & Intake ----------
(_sid('stage_0'),'license_active','License active','Confirm agent is active in the relevant commission (GREC / SC REC).','admin',null,'admin','signoff','all',true,null,null,'exists',null,0),
(_sid('stage_0'),'license_transfer','Transfer license','Transfer existing license to the brokerage.','doc','agent','admin','upload','transferring',false,null,null,'exists',null,1),
(_sid('stage_0'),'sponsoring_broker','Sponsoring broker form','For newly licensed agents.','sign','agent','admin','esign','newly_licensed',false,null,null,'create',null,2),
(_sid('stage_0'),'w9','W-9','Complete & e-sign. Auto-routed to bookkeeping.','sign','agent','auto','esign','all',true,null,null,'create',null,3),
(_sid('stage_0'),'direct_deposit','Direct deposit form','Complete & e-sign. Auto-routed to bookkeeping.','sign','agent','auto','esign','all',true,null,null,'create',null,4),
(_sid('stage_0'),'voided_check','Voided check','Upload. Auto-routed to bookkeeping.','doc','agent','auto','upload','all',true,null,null,'exists',null,5),
(_sid('stage_0'),'drivers_license','Driver''s license','Upload. Auto-routed to bookkeeping.','doc','agent','auto','upload','all',true,null,null,'exists',null,6),
(_sid('stage_0'),'questionnaire','Team member questionnaire',null,'self','agent','self','checkbox','all',false,null,null,'create',null,7),
(_sid('stage_0'),'headshot_bio','Headshot & bio','Set up shoot if needed.','doc','agent','auto','upload','all',false,null,null,'exists',null,8),
(_sid('stage_0'),'ylopo_reg','Ylopo registration form','For website setup.','doc','agent','admin','upload','all',false,null,null,'create',null,9),
(_sid('stage_0'),'finalize_paperwork','Finalize missing paperwork',null,'admin',null,'admin','signoff','all',false,null,null,'exists',null,10),
(_sid('stage_0'),'ica','Sign Independent Contractor Agreement','Read and e-sign your ICA.','sign','agent','auto','esign','all',false,null,null,'exists',null,11),
-- ---------- Stage 1 · Accounts & Access ----------
(_sid('stage_1'),'add_fub','Add to Follow Up Boss',null,'admin','Taylor Gabriel','admin','signoff','all',true,null,null,'exists',null,0),
(_sid('stage_1'),'mls_hive','MLS (HIVE) access',null,'admin','Taylor Gabriel','admin','signoff','all',true,null,null,'exists',null,1),
(_sid('stage_1'),'add_dotloop','Add to Dotloop',null,'admin','Taylor Gabriel','admin','signoff','all',true,null,null,'exists',null,2),
(_sid('stage_1'),'tmt_email','Set up TMT email',null,'admin','Taylor Gabriel','admin','signoff','all',true,null,null,'exists',null,3),
(_sid('stage_1'),'email_signature','Create & install email signature',null,'self','agent','self','checkbox','all',false,null,null,'create',null,4),
(_sid('stage_1'),'supra_ekey','Supra eKey + iPhone config','Configure with the board.','admin','Taylor Gabriel','admin','signoff','all',false,null,null,'exists',null,5),
(_sid('stage_1'),'back_door_code','Back door code',null,'admin','Taylor Gabriel','admin','signoff','all',false,null,null,'exists',null,6),
(_sid('stage_1'),'laptop_printer','Laptop + printer/scanner',null,'admin','Taylor Gabriel','admin','signoff','all',false,null,null,'exists',null,7),
(_sid('stage_1'),'gdrive_folder','Google Drive agent folder',null,'admin','Taylor Gabriel','admin','signoff','all',false,null,null,'exists',null,8),
(_sid('stage_1'),'add_slack','Add to Slack',null,'admin','Taylor Gabriel','admin','signoff','all',false,null,null,'exists',null,9),
(_sid('stage_1'),'slack_phone','Add Slack to phone',null,'self','agent','self','checkbox','all',false,null,null,'exists',null,10),
(_sid('stage_1'),'share_calendar','Share calendar with leadership',null,'self','agent','self','checkbox','all',false,null,null,'exists',null,11),
(_sid('stage_1'),'voicemail_fub','Voicemail greeting — FUB number',null,'self','agent','self','checkbox','all',false,null,null,'exists',null,12),
(_sid('stage_1'),'voicemail_cell','Voicemail greeting — personal cell',null,'self','agent','self','checkbox','all',false,null,null,'exists',null,13),
(_sid('stage_1'),'board_orientation','Schedule board orientation','New agents only.','ext','admin','admin','signoff','new_agent',false,null,null,'exists',null,14),
-- ---------- Stage 2 · Culture & Compliance ----------
(_sid('stage_2'),'core_values','Core values introduction','Relentless Growth · Ownership & Accountability · Innovation & Adaptability · Excellence in Execution · Legacy through Service.','video',null,'self','checkbox','all',true,null,null,'create',null,0),
(_sid('stage_2'),'nar_ethics','NAR code of ethics training',null,'self','agent','self','upload','all',false,null,null,'exists',null,1),
(_sid('stage_2'),'read_ewts','Read "Exactly What To Say"','Start before, finish week 1.','self','agent','self','checkbox','all',false,null,null,'exists',null,2),
(_sid('stage_2'),'welcome_email','Welcome to the team email',null,'admin',null,'admin','signoff','all',false,null,null,'exists',null,3),
(_sid('stage_2'),'swag_bag','Deliver swag bag','Create pre-start.','admin',null,'admin','signoff','all',false,null,null,'exists',null,4),
(_sid('stage_2'),'advertising_guidelines','Advertising guidelines',null,'ack','agent','self','checkbox','all',false,null,null,'create',null,5),
(_sid('stage_2'),'fair_housing','Fair housing',null,'ack','agent','self','checkbox','all',false,null,null,'create',null,6),
-- ---------- Stage 3 · Team Intros (Loom) ----------
(_sid('stage_3'),'intro_riley','Transaction manager role — Riley',null,'video','Riley','admin','signoff','all',false,null,null,'create',null,0),
(_sid('stage_3'),'intro_taylor','Bookkeeping — Taylor',null,'video','Taylor','admin','signoff','all',false,null,null,'create',null,1),
(_sid('stage_3'),'intro_tiffany','Sales manager — Tiffany',null,'video','Tiffany','admin','signoff','all',false,null,null,'create',null,2),
(_sid('stage_3'),'intro_adriana','Marketing — Adriana',null,'video','Adriana','admin','signoff','all',false,null,null,'create',null,3),
(_sid('stage_3'),'intro_ops','Operations director',null,'video','Ops Director','admin','signoff','once_hired',false,null,null,'create',null,4),
-- ---------- Stage 4 · Systems Training ----------
(_sid('stage_4'),'fub_setup','FUB Setup & config','Login, profile, notifications, install mobile app.','video',null,'self','checkbox','all',true,null,null,'create',null,0),
(_sid('stage_4'),'fub_daily','FUB Daily workflow','Smart lists, action plans, logging, tasks.','video',null,'self','checkbox','all',false,null,null,'create',null,1),
(_sid('stage_4'),'fub_leadmgmt','FUB Lead management','Claiming/responding, speed-to-lead.','video',null,'self','checkbox','all',false,null,null,'create',null,2),
(_sid('stage_4'),'fub_howwedo','FUB "How we do things"','Team stages, ponds, conventions.','video',null,'self','checkbox','all',false,null,null,'create',null,3),
(_sid('stage_4'),'intro_flex','Intro to Flex',null,'video',null,'self','checkbox','all',false,null,null,'create',null,4),
(_sid('stage_4'),'intro_ylopo','Intro to Ylopo',null,'video',null,'self','checkbox','all',false,null,null,'create',null,5),
(_sid('stage_4'),'intro_dotloop_v','Intro to Dotloop',null,'video',null,'self','checkbox','all',false,null,null,'create',null,6),
(_sid('stage_4'),'finalize_fub','Finalize FUB setup',null,'admin',null,'admin','signoff','all',false,null,null,'exists',null,7),
(_sid('stage_4'),'goal_planning','Goal planning meeting',null,'admin',null,'admin','signoff','all',false,null,null,'exists',null,8),
(_sid('stage_4'),'setup_1on1','Set up 1-1',null,'admin',null,'admin','signoff','all',false,null,null,'exists',null,9),
-- ---------- Stage 5 · Profile & Marketing ----------
(_sid('stage_5'),'db_jogger_send','Send database memory jogger',null,'self','agent','self','checkbox','all',false,null,null,'exists',null,0),
(_sid('stage_5'),'db_jogger_fub','Database memory jogger → upload to FUB',null,'self','agent','self','checkbox','all',false,null,null,'exists',null,1),
(_sid('stage_5'),'update_socials','Update social medias',null,'self','agent','self','checkbox','all',false,null,null,'exists',null,2),
(_sid('stage_5'),'update_realtor','Update realtor.com profile',null,'self','agent','self','checkbox','all',false,null,null,'exists',null,3),
(_sid('stage_5'),'update_gbp','Update Google Business page',null,'self','agent','self','checkbox','all',false,null,null,'exists',null,4),
(_sid('stage_5'),'social_announcement','Social media announcement',null,'admin','Adriana','admin','signoff','all',false,null,null,'exists',null,5),
(_sid('stage_5'),'business_cards','Order business cards',null,'admin',null,'admin','signoff','all',false,null,null,'exists',null,6),
(_sid('stage_5'),'signs_riders','Order signs & riders',null,'admin',null,'admin','signoff','all',false,null,null,'exists',null,7),
(_sid('stage_5'),'premier_roster','Add to Premier Agent Roster',null,'admin',null,'admin','signoff','all',false,null,null,'exists',null,8),
(_sid('stage_5'),'zillow_team','Add to team on Zillow','Set up agent Zillow page if new → triggers Premier Agent invite.','ext','admin','admin','signoff','all',false,null,null,'exists',null,9),
(_sid('stage_5'),'opcity_mvip','Add to Opcity / Realtor.com MVIP',null,'admin',null,'admin','signoff','all',false,null,null,'exists',null,10),
-- ---------- Stage 6 · Skills & Roleplay ----------
(_sid('stage_6'),'maverick_roleplay','MaverickRE roleplay','Upload emailed result. 10 calls, last 3 score >= 7/10.','roleplay','agent','admin','score','all',true,10,7,'exists',null,0),
(_sid('stage_6'),'shadow_tour','Shadow a home tour','With an agent or Tiffany. Tiffany signs off.','admin','Tiffany','admin','signoff','all',true,1,null,'exists',null,1),
(_sid('stage_6'),'script_book','Script book & best practices',null,'self','agent','self','checkbox','all',false,null,null,'create',null,2),
(_sid('stage_6'),'buyer_consult','Buyer consultation training',null,'video',null,'self','checkbox','all',false,null,null,'create',null,3),
(_sid('stage_6'),'roleplay_showing','Roleplay a showing','New agents only.','roleplay','agent','admin','signoff','new_agent',false,null,null,'create',null,4),
(_sid('stage_6'),'contracts_basic','Contracts class — basic',null,'video',null,'self','checkbox','all',false,null,null,'create',null,5),
(_sid('stage_6'),'cma_training','CMA training',null,'video',null,'self','checkbox','all',false,null,null,'create',null,6),
(_sid('stage_6'),'two_zhl_lenders','Speak with 2 ZHL lenders','Learn their products.','admin','agent','admin','signoff','all',false,2,null,'exists',null,7),
(_sid('stage_6'),'zhl_products','Zillow Home Loans products',null,'video',null,'self','checkbox','all',false,null,null,'create',null,8),
-- ---------- Stage GATE · Lead Activation ----------
(_sid('stage_gate'),'turn_on_leads','Turn on leads','Flex + Opcity/RDC + Zillow Premier Agent. Manual flip once gate is cleared.','milestone',null,'admin','signoff','all',false,null,null,'exists',null,0),
-- ---------- Stage 7 · Production Ramp ----------
(_sid('stage_7'),'weekly_pipeline','Set up weekly pipeline review',null,'admin',null,'admin','signoff','all',false,null,null,'exists',null,0),
(_sid('stage_7'),'intro_motto','Intro to Motto Mortgage','Greg Leaptrotte or Taylor Gabriel.','video','Motto','self','checkbox','all',false,null,null,'create',null,1),
(_sid('stage_7'),'intro_mcguinn','Intro to McGuinn Homes',null,'video','McGuinn','self','checkbox','all',false,null,null,'create',null,2),
(_sid('stage_7'),'intro_huguenin','Intro to David Huguenin','Set up mock closing if new.','admin','David Huguenin','admin','signoff','all',false,null,null,'create',null,3),
(_sid('stage_7'),'listing_presentation','Listing presentation training',null,'video',null,'self','checkbox','all',false,null,null,'create',null,4),
(_sid('stage_7'),'host_oh_training','How to host an open house',null,'video',null,'self','checkbox','all',false,null,null,'create',null,5),
(_sid('stage_7'),'host_open_house','Host an open house',null,'rep','agent','self','counter','all',false,1,null,'exists',null,6),
(_sid('stage_7'),'fish_pond','Fish a pond — get 1+ nurtures',null,'rep','agent','self','counter','all',false,1,null,'exists',null,7),
(_sid('stage_7'),'preview_15','Preview 15 homes',null,'rep','agent','self','counter','all',false,15,null,'exists',null,8),
(_sid('stage_7'),'shadow_12','Shadow 12 showings',null,'rep','agent','self','counter','all',false,12,null,'exists',null,9),
(_sid('stage_7'),'first_pending','Get first pending contract',null,'milestone','agent','admin','signoff','all',false,1,null,'exists',null,10),
(_sid('stage_7'),'mock_cmas','Complete 5 mock CMAs',null,'rep','agent','self','counter','all',false,5,null,'exists',null,11),
(_sid('stage_7'),'practice_offer','Write 1 practice offer for Noah',null,'admin','Noah','admin','signoff','all',false,1,null,'exists',null,12),
-- ---------- Stage Ongoing · Habits ----------
(_sid('stage_ongoing'),'hours_of_power','5 hours of power / week',null,'recur','agent','self','counter','all',false,5,null,'exists','weekly',0),
(_sid('stage_ongoing'),'handwritten_notes','5 handwritten notes to sphere / week',null,'recur','agent','self','counter','all',false,5,null,'exists','weekly',1);

-- Direct form links
update tasks set content_url = 'https://ylopo.formstack.com/forms/agent_profile_page_questionnaire' where key = 'ylopo_reg';

drop function _sid(text);
