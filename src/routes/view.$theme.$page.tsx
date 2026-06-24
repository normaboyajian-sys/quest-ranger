import { createFileRoute, notFound } from "@tanstack/react-router";
import { useParticipant } from "@/hooks/useParticipant";
import { useTrackedInput } from "@/hooks/useTrackedInput";
import { ConsentModal } from "@/components/ConsentModal";

export const Route = createFileRoute("/view/$theme/$page")({
  head: () => ({ meta: [{ title: "Controlled Suite" }] }),
  component: SuiteView,
});

function SuiteView() {
  const { theme, page } = Route.useParams();
  if (!["red", "blue"].includes(theme) || !["home", "contact"].includes(page)) throw notFound();
  const { emitInput } = useParticipant();
  const onChange = useTrackedInput(emitInput);

  const isRed = theme === "red";
  const themeClass = isRed ? "theme-red" : "theme-blue";

  return (
    <div className={`${themeClass} min-h-screen suite-bg text-suite-fg`}>
      <ConsentModal />
      <header className="suite-header px-8 py-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="suite-mark" />
          <span className="font-semibold tracking-tight">
            {isRed ? "FORGE" : "Lumen"}
          </span>
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
                  onChange={onChange}
                  placeholder={isRed ? "Find tools…" : "What are you looking for?"}
                  className="suite-input mt-2"
                />
              </label>
              <label className="block">
                <span className="suite-label">Username</span>
                <input name="username" onChange={onChange} className="suite-input mt-2" />
              </label>
              <label className="block">
                <span className="suite-label">Password (not tracked)</span>
                <input type="password" name="password" className="suite-input mt-2" />
              </label>
            </div>
          </>
        ) : (
          <>
            <h1 className="suite-h1">
              {isRed ? "Send a transmission." : "Say hello."}
            </h1>
            <p className="mt-4 suite-sub">
              {isRed ? "We respond within 24 hours." : "We'd love to hear from you."}
            </p>
            <div className="suite-card mt-10 p-6 space-y-4">
              <label className="block">
                <span className="suite-label">Email</span>
                <input name="email" onChange={onChange} className="suite-input mt-2" />
              </label>
              <label className="block">
                <span className="suite-label">Feedback</span>
                <textarea
                  name="feedback"
                  rows={5}
                  onChange={onChange}
                  className="suite-input mt-2"
                />
              </label>
              <button className="suite-button">
                {isRed ? "Transmit" : "Send message"}
              </button>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
