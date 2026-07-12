import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/coming-soon";
export const Route = createFileRoute("/_authenticated/reports")({
  component: () => <ComingSoon title="Reports & analytics" description="Utilization, maintenance frequency, department summaries, and more." />,
});
