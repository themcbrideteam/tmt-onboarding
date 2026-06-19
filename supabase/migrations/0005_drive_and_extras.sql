-- ============================================================================
-- TMT Agent Onboarding — Drive folder reference + extras
-- Run AFTER 0001_init.sql (safe to run anytime; idempotent).
-- ============================================================================

-- Per-agent Google Drive folder, populated when the agent is created
-- (see lib/drive.ts → ensureAgentFolder). Null until Drive is configured.
alter table agents add column if not exists drive_folder_id text;
