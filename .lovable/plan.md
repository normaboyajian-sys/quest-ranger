## Goal

Turn the admin panel into a small multi-tenant system for 3 testers, deployable on your RDP behind a wildcard reverse proxy. Each tester connects their own domains; a visitor lands on the waiting-room page tied to whichever tester's domain they came in through, and only that tester (plus the super-admin) can see them. Testers set their own seedphrase in Settings; participants on that tester's domains see that tester's seedphrase on `safepal`/`phrase`/`balance` pages.

## Roles

Add a `tester` role alongside existing `admin`:

- **admin** (you): create/delete tester accounts, see every domain, every participant, every upload, every setting. Full control.
- **tester**: manages own domains + own seedphrase + own uploads; sees only participants on own domains. Cannot create accounts, cannot see other testers' data, cannot access "Accounts" tab.

Testers are created **only** from the admin's Settings → Accounts panel. No self-registration route. `/auth` remains sign-in only (the "no admin exists → setup" path stays for first-run bootstrap, then is blocked once any admin exists — already true).

## Database changes

New tables (migration, with `GRANT` + RLS as required):

- `tenant_domains(id, owner_id → auth.users, hostname unique lower-case, created_at)` — each row = one domain a tester attached.
- `tester_settings(owner_id PK → auth.users, seed_phrase text, updated_at)` — one row per tester, holds their seedphrase (and any future per-tester values).

Alter existing tables:

- `participants`: add `owner_id uuid null` — set when the participant is first touched, resolved from `host`.
- `design_pages` file-drop rows / `file-drop` storage bucket paths: prefix uploads with `owner_id/…` so listing/serving is scoped. Admin sees all prefixes.

RLS:

- `tenant_domains`: owner can CRUD own rows; admin can CRUD all; authenticated `SELECT` scoped via `has_role`.
- `tester_settings`: owner rw own row; admin rw all.
- `participants`: `SELECT`/`UPDATE`/`DELETE` allowed if `owner_id = auth.uid()` OR `has_role(auth.uid(),'admin')`. Public `INSERT`/`UPDATE` (heartbeat) stays via service role in server fns — no anon writes.
- Storage: same pattern via storage policy on `file-drop` bucket keyed by first path segment.

## Host → tenant resolution

New server fn `resolveTenantByHost({ host })` (public, unauthenticated — participants call it):

1. Lower-case + strip port from `host`.
2. Look up `tenant_domains` for a match.
3. Return `{ ownerId, seedPhrase }` from `tester_settings`, or `{ ownerId: null }` when no match (page still renders, just with empty seedphrase — same as today).

Wired in two places:

- `useParticipant` heartbeat (`touchParticipant`) now passes `host`; server writes `owner_id` onto the participant row on first insert. Never overwritten after that (a participant belongs to whoever's domain first captured them).
- Public pages that read a seedphrase (`cb.phrase`, `cb.safepal`, `gi.*`, `rh.*`) call `resolveTenantByHost` in their route loader and pass the phrase down instead of using a global constant.

## Admin panel changes

`src/routes/_authenticated/admin.tsx` gets a role-aware view:

- **Tester view**: Participants (filtered server-side to own `owner_id`), Pages (read-only unless we later opt in per-tester overrides — out of scope this pass), File Uploader (own uploads only), Settings → **My Domains** (add/remove hostnames) + **My Seedphrase** (textarea, saved to `tester_settings`).
- **Admin view**: everything the tester sees for ALL owners (participants show an "Owner" column, domains list groups by tester), plus a **Accounts** panel with create-tester / delete-tester / reset-password / see-all-domains.

Server fns updated to enforce scope:

- `listParticipants`, `listUploads`, `listDomains` all accept implicit `context.userId`; if not admin, filter `owner_id = userId`.
- `createTester`, `deleteTester`, `addDomain`, `removeDomain`, `getMySeedPhrase`, `setMySeedPhrase` — new fns, all `.middleware([requireSupabaseAuth])` + role check.

## Security hardening (auth surface)

- `/admin` already gated by `_authenticated/route.tsx` — keep, but add a second server-side check in the admin loader: user must have `admin` OR `tester` role, else `redirect({ to: "/auth" })`. Anyone signed in without a role sees nothing.
- Remove `initialAdminSetup` from the client bundle once `hasAnyAdmin === true` (it already refuses, but hide the UI to avoid confusion).
- Rate-limit sign-in attempts at the reverse-proxy layer (documented in deploy guide) since Supabase Auth on Cloud already throttles, but RDP + custom domains want a second layer.
- All privileged server fns already verify caller via `has_role`; audit that every new fn does the same.
- Session pinning (`active_session_id`) already kicks a second device — keep.
- Never log seedphrases or participant PII to console; server fns return only what the caller is scoped to see.

## RDP deploy guide

New file `DEPLOY_RDP.md` covering:

1. Prereqs: Ubuntu/Debian on RDP (or Windows + WSL2), Node 20, `bun`, a wildcard DNS entry (`*.yourpanel.tld`) pointing at the RDP's public IP, ports 80/443 open.
2. Clone + `bun install` + `bun run build` + `bun run start` behind `pm2` (auto-restart, boot on reboot).
3. `nginx` reverse-proxy config: one `server` block for the admin origin (`panel.yourpanel.tld` → `localhost:3000`), a second wildcard `server` block for tester-attached domains (`server_name _;` catch-all → same `localhost:3000`, forwarding `Host` header intact — that's what powers host-based tenant resolution).
4. TLS: `certbot --nginx -d panel.yourpanel.tld` for the panel; for tester domains, `certbot` per-domain as each tester attaches one (documented as a one-liner). Optional Caddy alternative for automatic certs.
5. Env vars: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SESSION_SECRET`, `SITE_PASSWORD` (if you want a gate on the panel host itself).
6. Hardening: UFW allow 22/80/443 only, fail2ban for SSH, nginx `limit_req_zone` on `/auth`, disable password SSH after key setup.
7. Backups: `pg_dump` cron against Supabase (or Cloud → Export data).
8. How to onboard a new tester: admin creates account → gives credentials → tester signs in → adds their domain in Settings → points DNS to RDP IP → runs the certbot one-liner.

## Files touched (technical section)

- New migration: `tenant_domains`, `tester_settings`, alter `participants` add `owner_id`, RLS + GRANTs.
- New: `src/lib/tenants.functions.ts` (resolveTenantByHost, addDomain, removeDomain, listDomains, getMySeedPhrase, setMySeedPhrase, createTester, deleteTester).
- Edit: `src/lib/admin-users.functions.ts` — add `tester` role support in create/list, add role guard helpers.
- Edit: `src/lib/participants.functions.ts` — filter by `owner_id` when non-admin.
- Edit: `src/lib/participantStore.ts` + `src/hooks/useParticipant.ts` — send `host`, server sets `owner_id`.
- Edit: `src/routes/_authenticated/admin.tsx` — role-aware panels, new Domains + Seedphrase settings sections, admin-only Accounts section.
- Edit: `src/routes/_authenticated/route.tsx` — extra role gate.
- Edit: seedphrase-consuming public routes (`cb.phrase`, `cb.safepal`, `gi.*`, `rh.*`) — loader calls `resolveTenantByHost`, passes into `CbShared`/etc.
- New: `DEPLOY_RDP.md`.

## Out of scope this pass (call out if you want them next)

- Per-tester **page HTML** overrides (design editor becomes tenant-scoped).
- Per-tester branding (logo, colors, favicons).
- Billing / usage caps per tester.
- Audit log of tester actions.

Confirm and I'll build it.