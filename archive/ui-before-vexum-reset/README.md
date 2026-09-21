# UI preserved before the VEXUM reset

Source: laurenjxviii-art/collector at e9bc4e7cf19cabab28fab291817655f91d68827c (2026-09-21).

`frontend.zip` contains the original top-level app TSX, CSS, and manifest files before the reset. Extract into `app/` to restore those files. The original components and styles also remain in their existing source locations for reuse; the new page and layout no longer import them.

The reset changes only `app/page.tsx`, `app/layout.tsx`, and `app/manifest.ts`, adds `app/vexum-shell.css`, and adds this archive. API routes, lib files, Supabase SQL, public assets, package dependencies, build scripts, and cron configuration are preserved.

The temporary home page is a static dark shell with a VEXUM heading. Collection and account controls are intentionally absent until the new frontend is built. Authentication, password-recovery, import, collection-editing, and sync implementations remain available in source. The shell does not initialize useWorkspace, write browser storage, sign users out, seed a workspace, or migrate images. Backend cron jobs retain their existing configuration.

No database migration, database deletion, or product/image mutation is part of this reset. Existing user data remains in its original cloud or browser storage; this UI-only change does not claim to upload local-only data.

To restore the old visible UI, extract `frontend.zip` into `app/` and redeploy. The now-unused `vexum-shell.css` may remain safely in place.
