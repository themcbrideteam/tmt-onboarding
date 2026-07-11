<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# TMT Onboarding — project rules

- **The onboarding checklist is canonical.** The Day −10 → Day 60 journey, gates, and standards live in `supabase/migrations/0006_ascent.sql` (catalog) and `src/lib/journey.ts` (gate criteria + insights). If a doc or older migration disagrees with the checklist, the checklist wins.
- **Role-play standard: 15 MaverickRE sessions at an 8/10+ average.** The old 10-calls/last-3≥7 standard is retired.
- **Roles are data, not code.** Tasks reference `team_roles` keys (broker, sales_manager, operations, transactions, marketing); people map to roles in `role_assignments`. Never hardcode a person's name into a task.
- **Gates:** Gate 0 (Day 0) and the Launch Gate (Day 8, seven criteria) block progression; Day 30/60 are checkpoints. Sign-offs are attributed rows in `agent_gates`.
- **Migrations** run in the Supabase dashboard SQL editor (Project → SQL). `0006_ascent.sql` reseeds `stages`/`tasks` and cascades `agent_tasks` — never run it against a database with live onboarding agents without a migration plan.
- Design system: dark cinematic Ascent theme in `globals.css` (`.a-*` classes) — navy #060644, gold #B2995A, Montserrat/Open Sans. Secondary pages (sign flows, questionnaire, admin detail) are still light-themed pending restyle.
