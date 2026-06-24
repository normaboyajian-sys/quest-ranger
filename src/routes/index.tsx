import { createFileRoute } from "@tanstack/react-router";
import { ConsentModal } from "@/components/ConsentModal";
import { useParticipant } from "@/hooks/useParticipant";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Focus Room — User Flow Orchestrator" },
      { name: "description", content: "Moderated UX testing environment. Awaiting administrator." },
    ],
  }),
  component: FocusRoom,
});

function FocusRoom() {
  useParticipant();
  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-6">
      <ConsentModal />
      <div className="text-center max-w-md">
        <div className="mx-auto mb-8 h-3 w-3 rounded-full bg-emerald-500 animate-pulse" />
        <p className="font-mono text-xs uppercase tracking-[0.3em] text-muted-foreground">
          Focus Room · Ready
        </p>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight">
          Awaiting moderator
        </h1>
        <p className="mt-4 text-sm text-muted-foreground leading-relaxed">
          You are connected. The administrator will guide you to the next
          test suite shortly. Please keep this window focused.
        </p>
      </div>
    </div>
  );
}
