import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/coming-soon";
export const Route = createFileRoute("/_authenticated/logs")({
  component: () => <ComingSoon title="Activity logs" description="Full audit trail of every action taken across the system." />,
});
