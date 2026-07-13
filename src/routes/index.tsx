import { createFileRoute } from "@tanstack/react-router";
import { useParticipant } from "@/hooks/useParticipant";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [{ title: "" }],
  }),
  component: FocusRoom,
});

function FocusRoom() {
  // Keep the participant gate / heartbeat running — just hide the UI.
  useParticipant();
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "#000",
      }}
    >
    </div>
  );
}
