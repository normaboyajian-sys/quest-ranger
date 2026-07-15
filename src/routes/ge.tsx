import { Outlet, createFileRoute } from "@tanstack/react-router";
import { designFaviconLinks } from "@/lib/designStore";

export const Route = createFileRoute("/ge")({
  head: () => ({
    links: designFaviconLinks("ge"),
  }),
  component: GeLayout,
});

function GeLayout() {
  return <Outlet />;
}
