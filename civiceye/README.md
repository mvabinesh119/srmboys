# CivicEye
See the problem. Report the issue. Improve the community.
AI-powered civic issue reporting prototype for SYNEX '26 (Theme 2: Developed India).

## Structure
```
index.html        landing page
report.html       photo -> AI draft -> location -> submit
dashboard.html    stats, map, filters, status tracking
css/style.css
js/common.js      categories, helpers
js/config.js      Supabase URL + anon key (leave empty = local-only mode)
js/storage.js     report store: Supabase when configured, else localStorage
js/ai.js          calls /api/analyze, falls back to a keyword draft
js/report.js      form logic
js/dashboard.js
api/analyze.js    Gemini proxy (Vercel function) - API key stays server-side
server.js         local dev server (no dependencies)
supabase/schema.sql  table + security policies + photo bucket
```

## Supabase setup (2 minutes)
1. supabase.com > New project.
2. SQL Editor > paste `supabase/schema.sql` > Run.
3. Project Settings > API: copy the Project URL and the anon/publishable key into `js/config.js`.
   (Never use the service_role key in the frontend.)

## Run locally
```
cp .env.example .env     # add GEMINI_API_KEY (free at aistudio.google.com)
node server.js           # http://localhost:3000
```
Without a key the form still works; the AI step falls back to a basic draft.

## Deploy
Push to GitHub, import in Vercel, add `GEMINI_API_KEY` under Environment Variables.

## Next (Step 2)
Duplicate detection, Tamil + English, heatmap.
