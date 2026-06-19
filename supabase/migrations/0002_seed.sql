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
  ('stage_zillow',  'Zillow Preferred Onboarding', 8),
  ('stage_7',       'Production Ramp',           9),
  ('stage_ongoing', 'Ongoing Habits',            10);

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
(_sid('stage_2'),'welcome_fasttrack','Welcome to The McBride Team — Fast Track','Start here. The fast-track welcome to the team.','video',null,'self','checkbox','all',false,null,null,'exists',null,0),
(_sid('stage_2'),'vision_tmt','Vision for The McBride Team',null,'video',null,'self','checkbox','all',false,null,null,'exists',null,1),
(_sid('stage_2'),'core_values','Core values for The McBride Team','Relentless Growth · Ownership & Accountability · Innovation & Adaptability · Excellence in Execution · Legacy through Service.','video',null,'self','checkbox','all',true,null,null,'exists',null,2),
(_sid('stage_2'),'nar_ethics','NAR code of ethics training',null,'self','agent','self','upload','all',false,null,null,'exists',null,3),
(_sid('stage_2'),'read_ewts','Read "Exactly What To Say"','Start before, finish week 1.','self','agent','self','checkbox','all',false,null,null,'exists',null,4),
(_sid('stage_2'),'welcome_email','Welcome to the team email',null,'admin',null,'admin','signoff','all',false,null,null,'exists',null,5),
(_sid('stage_2'),'swag_bag','Deliver swag bag','Create pre-start.','admin',null,'admin','signoff','all',false,null,null,'exists',null,6),
(_sid('stage_2'),'advertising_guidelines','Advertising guidelines',null,'ack','agent','self','checkbox','all',false,null,null,'create',null,7),
(_sid('stage_2'),'fair_housing','Fair housing',null,'ack','agent','self','checkbox','all',false,null,null,'create',null,8),
(_sid('stage_2'),'performance','Team Performance Standards Policy','Sign-on: production, service & accountability standards — a condition of receiving team leads.','sign',null,'auto','esign','all',true,null,null,'exists',null,9),
-- ---------- Stage 3 · Team Intros ----------
(_sid('stage_3'),'team_roles','Team Roles & Responsibilities','Who does what on the team and how to reach them.','video',null,'self','checkbox','all',false,null,null,'exists',null,0),
-- ---------- Stage 4 · Systems Training ----------
(_sid('stage_4'),'tech_stack','Overview of Tech Stack (CRM, Website, etc.)','The core tools you''ll use day to day — CRM, website, and more.','video',null,'self','checkbox','all',false,null,null,'exists',null,0),
(_sid('stage_4'),'fub_howwedo','Follow Up Boss 101','Team stages, ponds, conventions — how we use FUB.','video',null,'self','checkbox','all',false,null,null,'exists',null,1),
(_sid('stage_4'),'fub_setup','Setting up your Follow Up Boss account','Login, profile, notifications, install mobile app.','video',null,'self','checkbox','all',true,null,null,'exists',null,2),
(_sid('stage_4'),'fub_daily','The best morning workflow','Smart lists, action plans, logging, tasks.','video',null,'self','checkbox','all',false,null,null,'exists',null,3),
(_sid('stage_4'),'fub_leadmgmt','FUB lead management','Claiming/responding, speed-to-lead.','self','agent','self','checkbox','all',false,null,null,'exists',null,4),
(_sid('stage_4'),'setup_dotloop_v','Setting up your Dotloop account',null,'video',null,'self','checkbox','all',false,null,null,'exists',null,5),
(_sid('stage_4'),'intro_dotloop_v','How to build an offer in Dotloop',null,'video',null,'self','checkbox','all',false,null,null,'exists',null,6),
(_sid('stage_4'),'intro_ylopo','Intro to Ylopo Stars',null,'video',null,'self','checkbox','all',false,null,null,'exists',null,7),
(_sid('stage_4'),'zillow_metrics','Zillow Metrics Standards','Response-time and performance standards for Zillow leads.','video',null,'self','checkbox','all',false,null,null,'exists',null,8),
(_sid('stage_4'),'intro_flex','Intro to Flex',null,'self','agent','self','checkbox','all',false,null,null,'exists',null,9),
(_sid('stage_4'),'finalize_fub','Finalize FUB setup',null,'admin',null,'admin','signoff','all',false,null,null,'exists',null,10),
(_sid('stage_4'),'goal_planning','Goal planning meeting',null,'admin',null,'admin','signoff','all',false,null,null,'exists',null,11),
(_sid('stage_4'),'setup_1on1','Set up 1-1',null,'admin',null,'admin','signoff','all',false,null,null,'exists',null,12),
-- ---------- Stage 5 · Profile & Marketing ----------
(_sid('stage_5'),'db_jogger_send','Send database memory jogger',null,'self','agent','self','checkbox','all',false,null,null,'exists',null,0),
(_sid('stage_5'),'db_jogger_fub','Database memory jogger → upload to FUB',null,'self','agent','self','checkbox','all',false,null,null,'exists',null,1),
(_sid('stage_5'),'update_socials','Update social medias',null,'self','agent','self','checkbox','all',false,null,null,'exists',null,2),
(_sid('stage_5'),'update_realtor','Update realtor.com profile',null,'self','agent','self','checkbox','all',false,null,null,'exists',null,3),
(_sid('stage_5'),'update_gbp','Update Google Business page',null,'self','agent','self','checkbox','all',false,null,null,'exists',null,4),
(_sid('stage_5'),'social_announcement','Social media announcement',null,'admin','Adriana','admin','signoff','all',false,null,null,'exists',null,5),
(_sid('stage_5'),'business_cards','Order business cards',null,'admin',null,'admin','signoff','all',false,null,null,'exists',null,6),
(_sid('stage_5'),'signs_riders','Order signs & riders',null,'admin',null,'admin','signoff','all',false,null,null,'exists',null,7),
(_sid('stage_5'),'setup_premier','Setting up your Premier Agent account',null,'video',null,'self','checkbox','all',false,null,null,'exists',null,8),
(_sid('stage_5'),'premier_roster','Add to Premier Agent Roster',null,'admin',null,'admin','signoff','all',false,null,null,'exists',null,9),
(_sid('stage_5'),'zillow_team','Add to team on Zillow','Set up agent Zillow page if new → triggers Premier Agent invite.','ext','admin','admin','signoff','all',false,null,null,'exists',null,10),
(_sid('stage_5'),'opcity_mvip','Add to Opcity / Realtor.com MVIP',null,'admin',null,'admin','signoff','all',false,null,null,'exists',null,11),
(_sid('stage_5'),'zillow_confirm','Confirm your Zillow Premier Agent account','Once you''ve created it, this notifies Noah to add you to the team on Zillow Premier.','self','agent','self','checkbox','all',false,null,null,'exists',null,12),
-- ---------- Stage 6 · Skills & Roleplay ----------
(_sid('stage_6'),'maverick_roleplay','MaverickRE roleplay','Upload emailed result. 10 calls, last 3 score >= 7/10.','roleplay','agent','admin','score','all',true,10,7,'exists',null,0),
(_sid('stage_6'),'shadow_tour','Shadow a home tour','With an agent or Tiffany. Tiffany signs off.','admin','Tiffany','admin','signoff','all',true,1,null,'exists',null,1),
(_sid('stage_6'),'script_book','Script book & best practices',null,'self','agent','self','checkbox','all',false,null,null,'create',null,2),
(_sid('stage_6'),'buyer_consult','Buyer consultation training',null,'self','agent','self','checkbox','all',false,null,null,'exists',null,3),
(_sid('stage_6'),'roleplay_showing','Roleplay a showing','New agents only.','roleplay','agent','admin','signoff','new_agent',false,null,null,'create',null,4),
(_sid('stage_6'),'contracts_basic','Purchase & sale agreement — key fields',null,'video',null,'self','checkbox','all',false,null,null,'exists',null,5),
(_sid('stage_6'),'cma_training','CMA training',null,'self','agent','self','checkbox','all',false,null,null,'exists',null,6),
(_sid('stage_6'),'two_zhl_lenders','Build a relationship with 2 ZHL lenders','Call through the ZHL lender list and connect with two; submit their names for Noah to confirm.','self','agent','admin','none','all',false,2,null,'exists',null,7),
(_sid('stage_6'),'zhl_products','Zillow Home Loans products',null,'self','agent','self','checkbox','all',false,null,null,'exists',null,8),
-- ---------- Stage GATE · Lead Activation ----------
(_sid('stage_gate'),'turn_on_leads','Turn on leads','Flex + Opcity/RDC + Zillow Premier Agent. Manual flip once gate is cleared.','milestone',null,'admin','signoff','all',false,null,null,'exists',null,0),
-- ---------- Stage Zillow · Zillow Preferred Onboarding (after added to the team) ----------
(_sid('stage_zillow'),'invite_zillow_preferred','Invite agent to Zillow Preferred','Send the Zillow Preferred (Flex) team invite.','admin',null,'admin','signoff','all',false,null,null,'exists',null,0),
(_sid('stage_zillow'),'zillow_learning_plan','Mandatory 4-unit Zillow Preferred onboarding learning plan',null,'self','agent','self','checkbox','all',false,null,null,'exists',null,1),
(_sid('stage_zillow'),'preferred_agent_agreement','Preferred Agent Agreement (for referrals)',null,'self','agent','self','checkbox','all',false,null,null,'exists',null,2),
(_sid('stage_zillow'),'premier_agent_app','Download the Premier Agent app',null,'self','agent','self','checkbox','all',false,null,null,'exists',null,3),
-- ---------- Stage 7 · Production Ramp ----------
(_sid('stage_7'),'weekly_pipeline','Set up weekly pipeline review',null,'admin',null,'admin','signoff','all',false,null,null,'exists',null,0),
(_sid('stage_7'),'intro_motto','Intro to Motto Mortgage','Meet with Greg Leaptrotte or Taylor Gabriel.','self','agent','self','checkbox','all',false,null,null,'exists',null,1),
(_sid('stage_7'),'intro_mcguinn','Intro to McGuinn Homes',null,'self','agent','self','checkbox','all',false,null,null,'exists',null,2),
(_sid('stage_7'),'intro_huguenin','Intro to David Huguenin','Set up mock closing if new.','admin','David Huguenin','admin','signoff','all',false,null,null,'create',null,3),
(_sid('stage_7'),'listing_presentation','Listing presentation training',null,'self','agent','self','checkbox','all',false,null,null,'exists',null,4),
(_sid('stage_7'),'host_oh_training','How to host an open house',null,'self','agent','self','checkbox','all',false,null,null,'exists',null,5),
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

-- ---------- Zillow Preferred onboarding links ----------
update tasks set content_url = 'https://www.zillow.com/onboarding/flex/team-lead/landing' where key = 'invite_zillow_preferred';
update tasks set content_url = 'https://academy.zillowgroup.com/learn/learning-plans/439/zillow-preferred-onboarding-learning-plan?generated_by=190880&hash=22ff444808bc8a71daf44de54cc7b4ea730ca4cd' where key = 'zillow_learning_plan';
update tasks set content_url = 'https://www.zillow.com/pbflex/agent' where key = 'preferred_agent_agreement';
update tasks set content_url = 'https://academy.zillowgroup.com/learn/courses/850/zillow-premier-agent-connections-support-services' where key = 'premier_agent_app';

-- ---------- Loom training videos ----------
update tasks set content_url = 'https://www.loom.com/share/3bc97297c79342cd988947af80ae6d63' where key = 'welcome_fasttrack';
update tasks set content_url = 'https://www.loom.com/share/080af4b88f6345138d8df3a55e814607' where key = 'vision_tmt';
update tasks set content_url = 'https://www.loom.com/share/3a988f376a0f45e1ac4d92e63ae7ee9a' where key = 'core_values';
update tasks set content_url = 'https://www.loom.com/share/b1c8e53a87d04ce893b56928f476ce47' where key = 'team_roles';
update tasks set content_url = 'https://www.loom.com/share/df630df8b0c14c598c0bfc4f090dc713' where key = 'tech_stack';
update tasks set content_url = 'https://www.loom.com/share/8a5266a1ea3e462090a291882f800371' where key = 'fub_howwedo';
update tasks set content_url = 'https://www.loom.com/share/e5cfc1761bca411898dc31b2c9fa99cc' where key = 'fub_setup';
update tasks set content_url = 'https://www.loom.com/share/8d008261cdc54051aaaea4e886b8ba06' where key = 'fub_daily';
update tasks set content_url = 'https://www.loom.com/share/c327fbc4797c43c6bb4aaac6620a006b' where key = 'setup_dotloop_v';
update tasks set content_url = 'https://www.loom.com/share/c849f1d3ba3b47c8a02bfc8c9b8a8b49' where key = 'intro_dotloop_v';
update tasks set content_url = 'https://www.loom.com/share/035fea52e7504ee4ad35942e15191741' where key = 'intro_ylopo';
update tasks set content_url = 'https://www.loom.com/share/dd1c966700c54ed28d7666dc12afa7b2' where key = 'zillow_metrics';
update tasks set content_url = 'https://www.loom.com/share/81f19e3c7e784116a7cfd97f1f7678b1' where key = 'setup_premier';
update tasks set content_url = 'https://www.loom.com/share/bca3845a4f3e4026a719e62d89532894' where key = 'contracts_basic';

drop function _sid(text);
