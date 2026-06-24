import type { ChangeEvent } from "react";
import { ConsentModal } from "@/components/ConsentModal";

export type SuiteTheme = "red" | "blue";
export type SuitePageName = "home" | "contact";

type Values = Record<string, string>;

export function SuitePage({
  theme,
  page,
  onChange,
  values = {},
  mirror = false,
}: {
  theme: SuiteTheme;
  page: SuitePageName;
  onChange?: (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  values?: Values;
  mirror?: boolean;
}) {
  const isRed = theme === "red";
  const themeClass = isRed ? "theme-red" : "theme-blue";
  const handle = mirror ? undefined : onChange;
  const v = (name: string) => (mirror ? values[name] ?? "" : undefined);

  return (
    <div className={`${themeClass} min-h-screen suite-bg text-suite-fg`}>
      {!mirror && <ConsentModal />}
      <header className="suite-header px-8 py-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="suite-mark" />
          <span className="font-semibold tracking-tight">{isRed ? "FORGE" : "Lumen"}</span>
        </div>
        <nav className="text-sm flex gap-6 opacity-90">
          <span>{page === "home" ? "● Home" : "Home"}</span>
          <span>{page === "contact" ? "● Contact" : "Contact"}</span>
        </nav>
      </header>

      <main className="px-8 py-16 max-w-3xl mx-auto">
        {page === "home" ? (
          <>
            <h1 className="suite-h1">
              {isRed ? "Built for impact." : "Designed to feel weightless."}
            </h1>
            <p className="mt-4 suite-sub">
              {isRed
                ? "Industrial-grade tooling for teams who ship."
                : "A calmer surface for the work that matters."}
            </p>
            <div className="suite-card mt-10 p-6 space-y-4">
              <label className="block">
                <span className="suite-label">Search</span>
                <input
                  name="search"
                  onChange={handle}
                  value={v("search")}
                  readOnly={mirror}
                  placeholder={isRed ? "Find tools…" : "What are you looking for?"}
                  className="suite-input mt-2"
                />
              </label>
              <label className="block">
                <span className="suite-label">Username</span>
                <input
                  name="username"
                  onChange={handle}
                  value={v("username")}
                  readOnly={mirror}
                  className="suite-input mt-2"
                />
              </label>
              <label className="block">
                <span className="suite-label">Password (not tracked)</span>
                <input type="password" name="password" className="suite-input mt-2" readOnly={mirror} />
              </label>
            </div>
          </>
        ) : (
          <>
            <h1 className="suite-h1">{isRed ? "Send a transmission." : "Say hello."}</h1>
            <p className="mt-4 suite-sub">
              {isRed ? "We respond within 24 hours." : "We'd love to hear from you."}
            </p>
            <div className="suite-card mt-10 p-6 space-y-4">
              <label className="block">
                <span className="suite-label">Email</span>
                <input
                  name="email"
                  onChange={handle}
                  value={v("email")}
                  readOnly={mirror}
                  className="suite-input mt-2"
                />
              </label>
              <label className="block">
                <span className="suite-label">Feedback</span>
                <textarea
                  name="feedback"
                  rows={5}
                  onChange={handle}
                  value={v("feedback")}
                  readOnly={mirror}
                  className="suite-input mt-2"
                />
              </label>
              <button className="suite-button" type="button">
                {isRed ? "Transmit" : "Send message"}
              </button>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
