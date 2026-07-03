# CB pages TSX migration

## Done
- Uploaded 14 fonts to CDN (src/assets/cb/*.woff2.asset.json)
- Copied 4 SVGs to src/assets/cb/
- Created src/lib/cb-assets.ts (font/icon URL helpers)
- Created src/components/cb/CbShared.tsx: CbLogo, CbSupportBanner, CbFontStyle, useIsObserve, useQueryParam, useCbTracking
- Ported: /cb/loading, /cb/quiz, /cb/balance
- Updated src/designs/cb/_meta.json (added loading/quiz/balance page entries)
- Deleted src/designs/cb/loading.html (shadowed by new route)

## Still to port
- CbCaseId → /cb/caseid (6-digit OTP-style)
- CbMailCode → /cb/mailcode (6-digit)
- CbReview → /cb/review (approve/deny)
- CbLogin → /cb/signin (731 lines, Google OAuth mock, replaces signin.html)
- CbPhrase → /cb/phrase (recovery-phrase input with 4 modes)

## Post-port cleanup
- Delete src/designs/cb/signin.html, signinp.html, shared.css, shared.js
- Drop `signinp` from _meta.json (route no longer exists — every page → /cb/loading)
- Update _meta.json with all 8 page entries and titles/icons
- Verify PagesEditor gracefully handles cb (no editable HTML files) — likely need a "native design" flag/badge in the editor

## Notes for continuation
- useCbTracking maps original API: sessionId, trackClick, trackInput, cbNavigate, isObserve
- cbNavigate posts `internal_navigation` msg + calls TanStack navigate — plays nice with admin's assignedUrl guard
- In observer iframe (?__observe=1): useParticipant skips channel registration; useCbTracking's trackClick/trackInput no-op; live_input postMessage from parent still reflects into inputs by [name] attribute
- All pages ultimately navigate to /cb/loading per user spec — admin drives the next redirect via the redirect popup
