import { createFileRoute, notFound } from "@tanstack/react-router";
import { useParticipant } from "@/hooks/useParticipant";
import { useTrackedInput } from "@/hooks/useTrackedInput";
import { SuitePage, type SuiteTheme, type SuitePageName } from "@/components/SuitePage";

export const Route = createFileRoute("/view/$theme/$page")({
  head: () => ({ meta: [{ title: "Controlled Suite" }] }),
  component: SuiteView,
});

function SuiteView() {
  const { theme, page } = Route.useParams();
  if (!["red", "blue"].includes(theme) || !["home", "contact"].includes(page)) throw notFound();
  const { emitInput, approved } = useParticipant();
  const onChange = useTrackedInput(emitInput);
  if (!approved) return null;
  return <SuitePage theme={theme as SuiteTheme} page={page as SuitePageName} onChange={onChange} />;
}
