import { useEffect, useState } from "react";
import { hasConsented, setConsented } from "@/lib/orchestrator";

export function ConsentModal() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!hasConsented()) setOpen(true);
  }, []);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="max-w-lg w-full rounded-2xl border border-border bg-card p-8 shadow-2xl">
        <div className="inline-block rounded-full bg-accent px-3 py-1 text-xs font-mono uppercase tracking-widest text-accent-foreground">
          Research Notice
        </div>
        <h2 className="mt-4 text-2xl font-semibold tracking-tight text-foreground">
          Moderated UX Environment
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          Your navigation is managed by the administrator, and interaction metrics
          (excluding sensitive data) are recorded for research. Password fields
          are never captured or transmitted.
        </p>
        <button
          onClick={() => {
            setConsented();
            setOpen(false);
          }}
          className="mt-6 w-full rounded-lg bg-primary px-4 py-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          Enter Environment
        </button>
      </div>
    </div>
  );
}
