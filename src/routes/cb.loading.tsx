import { createFileRoute } from "@tanstack/react-router";
import {
  CbFontStyle,
  CbSupportBanner,
  useCbTracking,
} from "@/components/cb/CbShared";
import { cbFonts } from "@/lib/cb-assets";

export const Route = createFileRoute("/cb/loading")({
  head: () => ({ meta: [{ title: "Loading…" }] }),
  component: CbLoadingPage,
});

function CbLogoSpinner({ size = 48 }: { size?: number }) {
  return (
    <svg
      aria-label="Coinbase logo"
      height={size}
      role="img"
      viewBox="-6 -6 60 60"
      width={size}
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M24,36c-6.63,0-12-5.37-12-12s5.37-12,12-12c5.94,0,10.87,4.33,11.82,10h12.09C46.89,9.68,36.58,0,24,0 C10.75,0,0,10.75,0,24s10.75,24,24,24c12.58,0,22.89-9.68,23.91-22H35.82C34.87,31.67,29.94,36,24,36z"
        fill="currentColor"
      />
      <circle
        className="cb-spinner-ring"
        cx="24"
        cy="24"
        r="28"
        fill="none"
        stroke="rgba(87,139,250,0.6)"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function CbLoadingPage() {
  useCbTracking(); // registers with admin panel

  return (
    <div
      className="cb-loading-page"
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
        .cb-loading-page {
          font-family: 'CoinbaseSans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
        }
        .cb-logo-container {
          position: fixed;
          top: 20px;
          left: 24px;
          animation: cbLogoFloat 1.8s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
          z-index: 10;
        }
        @keyframes cbLogoFloat {
          0%   { top: 20px; left: 24px; transform: scale(1) rotate(0deg); }
          30%  { top: 15%;  left: 35%;  transform: scale(1.1) rotate(-3deg); }
          50%  { top: 35%;  left: 55%;  transform: scale(1.3) rotate(2deg); }
          70%  { top: 45%;  left: 48%;  transform: scale(1.8) rotate(-1deg); }
          100% { top: 50%;  left: 50%;  transform: translate(-50%, -50%) scale(2) rotate(0deg); }
        }
        .cb-logo-inner {
          animation: cbLogoMorph 3s ease-in-out infinite;
          animation-delay: 1.8s;
        }
        @keyframes cbLogoMorph {
          0%   { transform: scale(1) skewX(0deg) skewY(0deg); }
          10%  { transform: scale(1.05, 0.95) skewX(2deg); }
          20%  { transform: scale(0.95, 1.06) skewX(-1deg) skewY(1deg); }
          30%  { transform: scale(1.03, 0.97) skewY(-1.5deg); }
          40%  { transform: scale(0.97, 1.04) skewX(1deg) skewY(0.5deg); }
          50%  { transform: scale(1.04, 0.96) skewX(-0.5deg); }
          60%  { transform: scale(0.96, 1.03) skewY(1deg); }
          70%  { transform: scale(1.02, 0.98) skewX(0.8deg) skewY(-0.8deg); }
          80%  { transform: scale(0.98, 1.02) skewX(-0.5deg); }
          90%  { transform: scale(1.01, 0.99) skewY(0.3deg); }
          100% { transform: scale(1) skewX(0deg) skewY(0deg); }
        }
        .cb-spinner-ring {
          stroke-dasharray: 176;
          stroke-dashoffset: 140;
          opacity: 0;
          transform-origin: 24px 24px;
          animation:
            cbSpinnerAppear 0.5s ease-out 2s forwards,
            cbSpinnerRotate 1.2s linear 2s infinite,
            cbSpinnerDash 1.5s ease-in-out 2s infinite;
        }
        @keyframes cbSpinnerAppear { to { opacity: 1; } }
        @keyframes cbSpinnerRotate { 100% { transform: rotate(360deg); } }
        @keyframes cbSpinnerDash {
          0%   { stroke-dashoffset: 140; }
          50%  { stroke-dashoffset: 40; }
          100% { stroke-dashoffset: 140; }
        }
      `}</style>

      <CbSupportBanner />

      <div className="cb-logo-container">
        <div className="cb-logo-inner" style={{ color: "#fff" }}>
          <CbLogoSpinner size={48} />
        </div>
      </div>
      {/* preload font hint (font-display: swap handles it, but nice touch) */}
      <link rel="preload" as="font" href={cbFonts.display} crossOrigin="anonymous" />
    </div>
  );
}
