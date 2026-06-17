-- ============================================================================
-- Storage bucket for agent file uploads (private). Run in Supabase SQL Editor.
-- ============================================================================
insert into storage.buckets (id, name, public)
values ('agent-files', 'agent-files', false)
on conflict (id) do nothing;

-- Internal app: authenticated users may upload/read/update files in this bucket.
-- (Page-level access control already restricts who sees what; files are served
--  via short-lived signed URLs.)
create policy "agent_files_insert" on storage.objects
  for insert to authenticated with check (bucket_id = 'agent-files');
create policy "agent_files_select" on storage.objects
  for select to authenticated using (bucket_id = 'agent-files');
create policy "agent_files_update" on storage.objects
  for update to authenticated using (bucket_id = 'agent-files');
