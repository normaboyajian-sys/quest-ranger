## Goal

Rework the admin dashboard into a black-styled, two-section workspace (Queue → Participants) with per-card redirect controls and an animated status dot. Add an approval gate so unapproved participants are locked to the Focus Room.

## Admin dashboard (visual)

- Pure black theme, scoped to `/admin` only (the participant `view/*` themes stay untouched). Background `#000`, panels `#0a0a0a`, hairline borders `#1a1a1a`, mono accents, subtle motion.
- Left sidebar with two tabs (vertically stacked, smooth crossfade between panes):
  1. **Queue** — participants awaiting approval.
  2. **Participants** — approved participants.
- Header shows counts for each.

## Status dot (SVG, animated gradient)

A small inline SVG circle on every participant card with an animated radial gradient that smoothly transitions between three states:

- **Green** — participant is connected and currently on a `/view/*` page (on the website).
- **Orange** — connected but sitting on `/` Focus Room (off the test website).
- **Red** — presence dropped (left). Card fades to a dimmed state and is auto-removed after ~20s.

Implemented via `<radialGradient>` with CSS-animated stop colors plus a soft pulsing `<animate>` on radius. Colors interpolate (no hard switch) using a CSS custom property + transition on stop-color.

## Queue flow

- A new participant always lands in **Queue** (not Participants), regardless of where they are.
- Participant is locked to `/` until approved: a new `approved` flag is stored in their presence payload (admin broadcasts an `approve` event with their id; participant hook stores it in `localStorage` and re-tracks presence). Any attempt to navigate to `/view/*` while not approved is blocked client-side and redirected back to `/`.
- Admin clicks **Accept** on a queue card → a **pop-up panel inside that card** animates open (height + fade, the page does NOT reload):
  - Step 1: dropdown (drop-up) to pick Design Suite (Industrial Red / Modern Blue).
  - Step 2: dropdown to pick starting Page (Home / Contact).
  - Confirm button → broadcasts `approve` + `navigate` to that participant, the card smoothly slides out of Queue and into the Participants list (Framer-style transition using CSS `@keyframes` + `transition` on transform/opacity; no router navigation).

## Participants tab

Each approved participant gets a card containing:
- Animated status dot + participant id.
- **Current page** label (e.g. `Industrial Red · Contact`) derived from their `currentUrl`.
- Inline **redirect controls on the card itself** (no shared hub): Suite selector + Page selector + "Send" button. Buttons broadcast a `navigate` targeted at that single participant id.
- Quick chips for one-click jumps: `Red/Home`, `Red/Contact`, `Blue/Home`, `Blue/Contact`.
- Small "Revoke" action to drop them back to Queue (broadcasts `revoke`, participant returns to `/`).

The shared Interaction Feed stays at the bottom of the Participants tab (filtered to approved users).

## Technical changes

Files to edit:

- `src/lib/orchestrator.ts`
  - Extend `ParticipantPresence` with `approved: boolean`.
  - Add payload types: `ApprovePayload { id }`, `RevokePayload { id }`.
  - Add `approve` / `revoke` broadcast event support in `joinChannel`.
  - Helpers: `getApproved()`, `setApproved(bool)` against `localStorage`.

- `src/hooks/useParticipant.ts`
  - Track `approved` in presence; listen for `approve` (set local flag, re-track) and `revoke` (clear flag, navigate `/`).
  - Guard: on pathname change, if not approved and path starts with `/view/`, navigate back to `/`.

- `src/routes/admin.tsx` — full rewrite to the new layout:
  - Black theme via scoped classes (no global token changes).
  - Sidebar with Queue / Participants tabs, animated pane swap (`@keyframes` fade+slide).
  - Queue card with inline accept pop-up (drop-up `<select>`s, height transition).
  - Participant card with per-card redirect controls, status dot, current-page label, revoke.
  - Tracks `lastSeen` per id to render the red "left" state for ~20s before removal.

- `src/components/StatusDot.tsx` (new)
  - SVG with `<radialGradient>` whose stop colors are driven by `data-state="on|off|left"` + CSS transition on `stop-color`; subtle `<animate>` pulse on `r`.

- `src/routes/view.$theme.$page.tsx`
  - On mount, if `!approved`, redirect to `/`.

- `src/styles.css`
  - Add `.admin-noir` scope with black palette, sidebar styles, card styles, pane crossfade keyframes, accept pop-up height/opacity transition. No changes to existing suite themes or root tokens.

No backend/schema changes — everything rides the existing Supabase Realtime channel.

## Out of scope

- No persistence of queue/approval across admin reloads beyond what presence provides (refreshing admin re-derives state from current presences; approval flag lives on the participant's localStorage so it survives their refresh).
- No changes to participant-facing themes or routes other than the approval guard.
