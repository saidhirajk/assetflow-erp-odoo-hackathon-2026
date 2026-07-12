import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/coming-soon";
export const Route = createFileRoute("/_authenticated/organization")({
  component: () => <ComingSoon title="Organization setup" description="Manage departments, categories, and employee roles." />,
});
