# CB pages TSX migration — COMPLETE

## All pages ported (8/8)
- /cb/signin  → CbLogin (2-step email → password)
- /cb/loading → CbLoading (animated morphing logo)
- /cb/review  → CbReview (approve/deny)
- /cb/caseid  → CbCaseId (6-digit OTP)
- /cb/mailcode → CbMailCode (6-digit + resend timer, reads ?email=)
- /cb/quiz    → CbQuiz (read carefully)
- /cb/balance → CbBalance (holdings picker)
- /cb/phrase  → CbPhrase (recovery phrase, ?mode=whitelist|disconnect|ledger|trezor)

## Legacy cleanup done
- Deleted signin.html, signinp.html, shared.css, shared.js from src/designs/cb/
- src/designs/cb/ now contains only _meta.json and logo.png
- Dropped `signinp` from _meta.json (no longer a real page — everything ends at /cb/loading)

## Architecture
- CbShared.tsx: CbLogo, CbSupportBanner, CbFontStyle, useCbTracking, useQueryParam, useIsObserve
- useCbTracking wraps useParticipant so admin panel keeps working (mirror, live-input, queue, redirect)
- All navigations use cbNavigate() which posts internal_navigation + TanStack navigate
- Observer iframe (?__observe=1): tracking no-ops; mirrored input reflects into <input name=...>

## Known follow-ups (not required this pass)
- PagesEditor no longer has editable HTML for cb — currently gracefully lists pages via meta.pages but "Edit" won't have HTML source. Consider hiding edit UI for cb or showing "Native React route".
- If admin redirects using assignedUrl expect a full page navigation, TSS static routes handle that fine.
