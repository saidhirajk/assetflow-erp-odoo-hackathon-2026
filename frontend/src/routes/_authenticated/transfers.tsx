import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/coming-soon";
export const Route = createFileRoute("/_authenticated/transfers")({
  component: () => <ComingSoon title="Transfers" description="Request and approve asset transfers between employees and departments." />,
});
