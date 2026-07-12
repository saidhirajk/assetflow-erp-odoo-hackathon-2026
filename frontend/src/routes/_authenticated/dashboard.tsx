import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { hasRole, useCurrentUser } from "@/hooks/use-current-user";
import {
  Package, Users, Calendar, Wrench, ArrowLeftRight, AlertTriangle, Clock, CheckCircle2,
} from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { getDashboardOverviewCounts } from "@/lib/backend/app-backend";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard - Sampada" }] }),
  component: Dashboard,
});

function Kpi({ label, value, icon: Icon, tone }: {
  label: string; value: number | string; icon: React.ComponentType<{ className?: string }>;
  tone?: "default" | "warning" | "success";
}) {
  const toneCls = tone === "warning" ? "text-warning" : tone === "success" ? "text-success" : "text-primary";
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
          <div className="mt-2 text-3xl font-semibold tabular-nums">{value}</div>
        </div>
        <Icon className={`h-5 w-5 ${toneCls}`} />
      </div>
    </Card>
  );
}

function Dashboard() {
  const { data: user } = useCurrentUser();
  const isManager = hasRole(user, "admin", "asset_manager");
  const isDeptHead = hasRole(user, "department_head");

  const { data: stats } = useQuery({
    queryKey: ["dashboard-stats", user?.userId, user?.primaryRole],
    enabled: !!user,
    queryFn: getDashboardOverviewCounts,
  });

  return (
    <div className="space-y-6 max-w-7xl">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Welcome{user?.profile?.name ? `, ${user.profile.name.split(" ")[0]}` : ""}
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Live view of assets, allocations, bookings, and maintenance across the organization.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <Kpi label="Available" value={stats?.available ?? "-"} icon={CheckCircle2} tone="success" />
        <Kpi label="Allocated" value={stats?.allocated ?? "-"} icon={Users} />
        <Kpi label="Maintenance" value={stats?.maintenance ?? "-"} icon={Wrench} />
        <Kpi label="Active bookings" value={stats?.activeBookings ?? "-"} icon={Calendar} />
        <Kpi label="Pending transfers" value={stats?.pendingTransfers ?? "-"} icon={ArrowLeftRight} />
        <Kpi label="Overdue" value={stats?.overdue ?? "-"} icon={Clock} tone="warning" />
      </div>

      {(stats?.overdue ?? 0) > 0 && (
        <Card className="p-4 border-warning/40 bg-warning/5">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-warning shrink-0 mt-0.5" />
            <div className="flex-1">
              <div className="font-medium">Overdue allocations need attention</div>
              <p className="text-sm text-muted-foreground mt-1">
                {stats?.overdue} allocation{(stats?.overdue ?? 0) === 1 ? "" : "s"} past expected return date.
              </p>
            </div>
            <Button asChild variant="outline" size="sm">
              <Link to="/allocations">Review</Link>
            </Button>
          </div>
        </Card>
      )}

      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3">Quick actions</h2>
        <div className="flex flex-wrap gap-2">
          {isManager && <Button asChild><Link to="/assets"><Package className="h-4 w-4 mr-2" />Register asset</Link></Button>}
          <Button asChild variant="outline"><Link to="/bookings"><Calendar className="h-4 w-4 mr-2" />Book resource</Link></Button>
          <Button asChild variant="outline"><Link to="/maintenance"><Wrench className="h-4 w-4 mr-2" />Raise maintenance</Link></Button>
          {(isManager || isDeptHead) && (
            <Button asChild variant="outline"><Link to="/transfers"><ArrowLeftRight className="h-4 w-4 mr-2" />Review transfers</Link></Button>
          )}
        </div>
      </div>
    </div>
  );
}
