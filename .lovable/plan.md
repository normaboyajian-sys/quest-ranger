## Goal

Make the admin's live tooling feel real-time and operator-friendly: a tiny mirror window sized exactly like the participant's screen, draggable Redirect/Submitted/Keyboard modals, a live keyboard feed, deduped events, and click-to-copy on any white text in the interaction feed.

## 1. Live Preview window — shrink + match participant resolution

- Replace the current "scale to 90% of admin viewport" logic with: window is always proportional to the participant's actual viewport, capped to a small max (default ~360px on the long edge for desktop participants, ~220px wide for mobile/portrait).
- Pull viewport from the existing `participant_viewport` postMessage; also handle portrait/landscape and devicePixelRatio. Show the live `WxH` next to the LIVE chip so the operator can see the participant's real resolution.
- Iframe stays scaled to fit the window (`/observe/$pid` already does the scaling). Add a small "1:1 / fit" toggle for power use.

## 2. Mirror everything in the live preview

`observe.$pid.tsx` already mirrors URL, mouse cursor, clicks (ripples), scroll, and viewport. Add:

- Live text mirroring: every input change in the participant iframe posts the field selector + value (already wired for tracked fields via `__ux input`). Forward those to the observer so it overlays the current value into the matching input/textarea inside the observed iframe via a small bridge script injected through the existing `__observe=1` marker.
- Phone support: detect portrait viewports, swap the cursor SVG for a touch ring, render taps as bigger ripple discs, and use the participant's reported dpr so click coordinates land on the right spot. The window resizes to the phone's aspect ratio automatically.

## 3. Draggable Redirect / Submitted modals (replace current centered overlay)

- New `FloatingPanel` component (shared with LivePreview style): absolutely positioned, drag by header, close button, opens centered on the admin viewport on first open, remembers position while it's open, has a subtle scale-in.
- Redirect panel: same two-step flow (pick design → pick page), but after the operator confirms a redirect it resets back to step 1 (design picker) instead of closing — so they can immediately redirect again. Close button is the only way to dismiss.
- Submitted panel: same floating shell, lists submitted fields. Does not auto-close.

## 4. New Keyboard icon → live typing feed

- Add a keyboard icon to the participant card icon row (between Submitted and Revoke).
- Opens a floating panel that shows, in real time, the value of whichever input the participant is currently focused on. Header line: `field: <name/selector> · <page>`; body: the current text as a large monospace string with a blinking caret.
- Wire by extending the iframe tracker: on `focus`/`blur`/`input` on any visible text-like input or textarea, post `{__ux:true, type:'live_input', field, value, focused}`. The admin's per-participant subscription stores `{focusedField, value}` and the panel renders it. Closing the panel just stops rendering; the data keeps flowing.

## 5. Fix double interaction-feed events

- Cause: input changes fire on both `input` and `change`, and continue-button clicks fire both the `*_submitted` track and the synthesized form submit handler.
- Fix in `designStore.ts` tracker: debounce per-field input emissions (last value wins within 250ms) and only emit on `input` (drop the duplicate `change` emitter); for clicks, dedupe by `(field,value,~250ms window)` before posting.
- In `useParticipant` (the admin side that records `events`), also drop any event whose `(participantId,field,value,at within 200ms)` matches the last one — belt-and-suspenders.
- New events fade in with the existing `fade-in` animation (200ms) when they hit the feed.

## 6. Interaction feed pinned right

- Move the events column / panel inside the Participants pane to the right side of the admin grid (was inline). On desktop it becomes a fixed-width right rail (`grid grid-cols-[minmax(0,1fr)_320px]`). On smaller widths it falls back to stacked.

## 7. Click-to-copy on white text

- In the interaction feed and in the Submitted panel: every "value" span (the white text) and the participant id chip becomes a `<button class="copy-chip">` that calls `navigator.clipboard.writeText(value)` and shows a brief "Copied" pill above the chip (200ms fade-in / 800ms hold / 200ms fade-out).
- Cursor changes to copy; hover shows the full value as a tooltip.

## Technical notes

- All new floating panels share one `FloatingPanel` component (drag, close, focus-on-open, scale-in). Modal backdrop is removed entirely.
- Live keyboard feed adds one new state map in `admin.tsx`: `Map<participantId, { field, value, focused, at }>`, fed by an extra branch in the existing iframe `message` listener in `useParticipant`.
- Dedup logic is the only change to `designStore.ts`'s TRACKER_SCRIPT; no schema changes.
- `observe.$pid.tsx` gets one new effect: inject a tiny script into the observed iframe (postMessage from observer → observed iframe via the existing `__observe=1` channel) that paints `live_input` values into the matching input by `data-ux-field` / selector match. Falls back gracefully if the field can't be found.
- No new packages.
- No DB changes.

## Files touched

- `src/components/LivePreview.tsx` — shrink/match logic, dpr label, mobile mode.
- `src/components/FloatingPanel.tsx` — new.
- `src/components/KeyboardPanel.tsx` — new.
- `src/routes/_authenticated/admin.tsx` — replace modals with floating panels, add Keyboard icon, right-rail events layout, click-to-copy chips, hook up live-input state.
- `src/hooks/useParticipant.ts` — dedupe events, expose `liveInputs` map, forward live_input messages.
- `src/lib/designStore.ts` — debounce/dedupe in TRACKER_SCRIPT, emit `live_input` focus/blur/input.
- `src/routes/observe.$pid.tsx` — paint live input value into the observed iframe + phone cursor variant.
- `src/styles.css` — `.floating-panel`, `.copy-chip`, `.copied-pill`, right-rail grid, mobile preview tweaks.

Want me to build all 7 sections, or trim any? Reply "go" to build the whole plan, otherwise tell me what to drop.  
  
ALSO Make sure all the popups that open like the real time typing feed u can resize it and stuff and move it around smoothly those should be the redirect , live preview, submissions , and the new live type feed