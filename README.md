# Collector

A dark universal collection manager with collections, item editing, photos, grading, manual market values, recorded price history and backups.

Run with Node.js 22+ and pnpm: pnpm install, pnpm build, pnpm start.

## Free cloud setup

Apply `supabase/004-cloud-workspace.sql`, `supabase/005-image-storage.sql`, and `supabase/006-market-jobs.sql` in the Supabase project. Workspace rows remain owner-protected; the market-jobs table is service-only for scheduled provider jobs.

Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` on the host, then redeploy. Scheduled market refreshes additionally use `SUPABASE_SERVICE_ROLE_KEY` as a **server-only** Vercel environment variable; never expose it in browser code. Set Supabase Site URL and allowed redirects to the deployed HTTPS origin.

Account & sync uses email + password. After sign-in, an empty cloud account is seeded automatically from the current device and edits autosync. This device also checks for newer cloud changes every 30 seconds and on window focus. Pending edits stay on the device. Conflicting edits require downloading a backup and loading the latest cloud version.

Images are compressed and moved into the Collector image bucket in Supabase Storage; the workspace JSON stores URLs instead of multi-megabyte inline images. Free service quotas apply. Download backups regularly.

On iPhone, open the hosted URL in Safari, then Share > Add to Home Screen. No App Store fee is needed. Native widgets are a later feature. An already open app queues edits offline; reopening offline shows a fallback page.

Market history is recorded from real provider observations or entered values, never invented. Supported optional server-side provider variables are `JUSTTCG_API_KEY`, `APIFY_TOKEN`, `PARSE_API_KEY`, and `PRICECHARTING_TOKEN`. `CRON_SECRET` and `SUPABASE_SERVICE_ROLE_KEY` enable scheduled refreshes. General collectibles use recent eBay sold comps through Apify when connected, with Parse eBay/hobbyDB fallbacks. Collector stores up to 10 matched sold comps, their average/median/range, confidence, source, and update time. Graded variants stay separate from raw items. Review manual lookup matches before applying prices.

lib/model.ts supplies the portable versioned data contract and widgetSnapshot for future mobile sync.


## Deploy this build

This package is linked to the existing Vercel `collector` project. On Windows, double-click `DEPLOY-COLLECTOR.cmd`. It deploys this exact source to Production using the Vercel CLI. Existing Vercel environment variables and domains remain attached to the project.

## Password recovery
Collector now supports Forgot password from the Account & sync panel. Recovery links request the current deployed Collector origin and open a Set new password form inside Collector. If a recovery email still opens localhost, add `https://collector-five-ecru.vercel.app/**` to Supabase Authentication > URL Configuration > Redirect URLs (and preferably set the Site URL to `https://collector-five-ecru.vercel.app`).
