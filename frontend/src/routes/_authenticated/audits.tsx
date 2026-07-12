import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/coming-soon";
export const Route = createFileRoute("/_authenticated/audits")({
  component: () => <ComingSoon title="Audits" description="Run physical audits, mark discrepancies, and generate reports." />,
});
