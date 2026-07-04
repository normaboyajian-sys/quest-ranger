import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
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

function CbLogoSpinner({ size = 72 }: { size?: number }) {
  return (
    <svg
      aria-label="Coinbase logo"
      height={size}
      role="img"
      viewBox="0 0 48 48"
      width={size}
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M24,36c-6.63,0-12-5.37-12-12s5.37-12,12-12c5.94,0,10.87,4.33,11.82,10h12.09C46.89,9.68,36.58,0,24,0 C10.75,0,0,10.75,0,24s10.75,24,24,24c12.58,0,22.89-9.68,23.91-22H35.82C34.87,31.67,29.94,36,24,36z"
        fill="currentColor"
      />
    </svg>
  );
}

function CbLoadingPage() {
  useCbTracking();
  const router = useRouter();
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    const unsub = router.subscribe("onBeforeNavigate", () => {
      setLeaving(true);
    });
    return unsub;
  }, [router]);

  return (
    <div
      className="cb-loading-page"
      style={{
        position: "relative",
        minHeight: "100vh",
        backgroundColor: "rgb(10, 11, 13)",
        color: "#fff",
        opacity: leaving ? 0 : 1,
        transition: "opacity 400ms ease",
      }}
    >
      <CbFontStyle />
      <style>{`
        .cb-loading-page {
          font-family: 'CoinbaseSans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
          animation: cbPageFadeIn 500ms ease both;
        }
        @keyframes cbPageFadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        .cb-spin {
          color: #fff;
          animation: cbSmoothSpin 1.4s linear infinite;
          transform-origin: 50% 50%;
          will-change: transform;
        }
        @keyframes cbSmoothSpin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
      `}</style>

      <CbSupportBanner />

      <div
        className="cb-spin"
        style={{
          position: "fixed",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
        }}
      >
        <CbLogoSpinner size={72} />
      </div>

      <link rel="preload" as="font" href={cbFonts.display} crossOrigin="anonymous" />
    </div>
  );
}
