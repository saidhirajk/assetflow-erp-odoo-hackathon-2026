import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { hasRole, useCurrentUser } from "@/hooks/use-current-user";
import {
  Package, Users, Calendar, Wrench, ArrowLeftRight, AlertTriangle, Clock, CheckCircle2, ChevronRight
} from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { getDashboardOverviewCounts } from "@/lib/backend/app-backend";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — AssetFlow" }] }),
  component: Dashboard,
});

function Kpi({ label, value, icon: Icon, tone, href }: {
  label: string; value: number | string; icon: React.ComponentType<{ className?: string }>;
  tone?: "default" | "warning" | "success" | "primary";
  href?: string;
}) {
  const toneCls = tone === "warning" ? "text-amber-500 bg-amber-500/10" 
    : tone === "success" ? "text-emerald-500 bg-emerald-500/10" 
    : tone === "primary" ? "text-primary bg-primary/10"
    : "text-blue-500 bg-blue-500/10";
  
  const content = (
    <Card className={`p-5 relative overflow-hidden transition-all duration-300 hover:shadow-md hover:-translate-y-1 ${href ? 'cursor-pointer hover:border-primary/50' : ''}`}>
      <div className="flex items-start justify-between relative z-10">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</div>
          <div className="mt-3 text-3xl font-bold tabular-nums tracking-tight">{value}</div>
        </div>
        <div className={`p-2.5 rounded-xl ${toneCls}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
      {/* Decorative subtle background element */}
      <div className={`absolute -right-6 -bottom-6 w-24 h-24 rounded-full opacity-[0.03] ${toneCls.split(' ')[0]}`} />
    </Card>
  );

  if (href) {
    return <Link to={href} className="block">{content}</Link>;
  }
  return content;
}

function ActionCard({ title, description, icon: Icon, href, colorClass }: {
  title: string; description: string; icon: React.ComponentType<{ className?: string }>; href: string; colorClass: string;
}) {
  return (
    <Link to={href} className="block group h-full">
      <Card className="h-full p-6 relative overflow-hidden border-border/50 hover:border-primary/50 transition-all duration-300 hover:shadow-lg hover:-translate-y-1 bg-gradient-to-br from-background to-muted/30">
        <div className="flex items-start gap-4 relative z-10">
          <div className={`p-3 rounded-2xl ${colorClass}`}>
            <Icon className="h-6 w-6" />
          </div>
          <div className="flex-1 space-y-1">
            <div className="font-semibold flex items-center gap-2">
              {title}
              <ChevronRight className="h-4 w-4 opacity-0 -ml-2 transition-all group-hover:opacity-100 group-hover:ml-0 text-primary" />
            </div>
            <p className="text-sm text-muted-foreground leading-snug">{description}</p>
          </div>
        </div>
      </Card>
    </Link>
  );
}

function Dashboard() {
  const { data: user } = useCurrentUser();
  const isManager = hasRole(user, "admin", "asset_manager");
  const isDeptHead = hasRole(user, "department_head");
  const isEmployee = !isManager && !isDeptHead;
  const { data: stats } = useQuery({
    queryKey: ["dashboard-stats", user?.userId, user?.primaryRole],
    enabled: !!user,
    queryFn: () => getDashboardOverviewCounts(user?.userId, user?.primaryRole),
  });

  return (
    <div className="space-y-8 max-w-7xl pb-10">
      {/* Premium Hero Banner */}
      <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-primary/90 via-primary to-primary/80 text-primary-foreground p-8 sm:p-10 shadow-lg">
        {/* Glassmorphism decorative circles */}
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 rounded-full bg-white/10 blur-3xl mix-blend-overlay"></div>
        <div className="absolute bottom-0 left-0 -ml-10 -mb-10 w-40 h-40 rounded-full bg-white/10 blur-2xl mix-blend-overlay"></div>
        
        <div className="relative z-10 flex flex-col md:flex-row gap-6 justify-between md:items-end">
          <div className="space-y-2">
            <div className="inline-flex items-center rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-medium backdrop-blur-md mb-2">
              {isManager ? "Management Workspace" : isDeptHead ? "Department Workspace" : "Employee Workspace"}
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">
              Welcome back{user?.profile?.name ? `, ${user.profile.name.split(" ")[0]}` : ""}!
            </h1>
            <p className="text-primary-foreground/80 text-base max-w-xl">
              {isEmployee
                ? "View your assets, bookings and maintenance requests."
                : isDeptHead
                ? "Manage your department assets and approvals."
                : "Live view of assets, allocations, bookings and maintenance across the organization."}
            </p>
          </div>
        </div>
      </div>

      {/* Quick Actions - Role Based */}
      <div className="space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground px-1">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {isManager && (
            <ActionCard 
              title="Register Asset" 
              description="Add a new physical or digital asset to the registry." 
              icon={Package} href="/assets" 
              colorClass="bg-indigo-500/10 text-indigo-500" 
            />
          )}
          <ActionCard 
            title="Book Resource" 
            description="Reserve shared resources like rooms or vehicles." 
            icon={Calendar} href="/bookings" 
            colorClass="bg-emerald-500/10 text-emerald-500" 
          />
          <ActionCard 
            title="Raise Maintenance" 
            description="Report an issue or request repair for an asset." 
            icon={Wrench} href="/maintenance" 
            colorClass="bg-amber-500/10 text-amber-500" 
          />
          {(isManager || isDeptHead) && (
            <ActionCard 
              title="Review Transfers" 
              description="Approve or reject pending asset transfer requests." 
              icon={ArrowLeftRight} href="/transfers" 
              colorClass="bg-blue-500/10 text-blue-500" 
            />
          )}
        </div>
      </div>

      {/* Overview Stats Grid */}
      <div className="space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground px-1">
          {isEmployee ? "My Overview" : "Organization Overview"}
        </h2>
        
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {!isEmployee && (
            <Kpi label="Available" value={stats?.available ?? "—"} icon={CheckCircle2} tone="success" href="/assets" />
          )}
          <Kpi label={isEmployee ? "My Allocations" : "Allocated"} value={stats?.allocated ?? "—"} icon={Users} href="/allocations" tone="primary" />
          <Kpi label={isEmployee ? "My Maintenance" : "Maintenance"} value={stats?.maintenance ?? "—"} icon={Wrench} href="/maintenance" tone="warning" />
          <Kpi label={isEmployee ? "My Bookings" : "Active Bookings"} value={stats?.activeBookings ?? "—"} icon={Calendar} href="/bookings" />
          <Kpi label={isEmployee ? "My Transfers" : "Pending Transfers"} value={stats?.pendingTransfers ?? "—"} icon={ArrowLeftRight} href="/transfers" />
          <Kpi label={isEmployee ? "My Overdue" : "Overdue"} value={stats?.overdue ?? "—"} icon={Clock} tone="warning" href="/allocations" />
        </div>
      </div>

      {/* Warning Alert for Overdue */}
      {(stats?.overdue ?? 0) > 0 && (
        <Card className="p-5 border-amber-500/40 bg-amber-500/5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-start gap-4">
            <div className="p-2 bg-amber-500/20 rounded-full mt-0.5">
              <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-500 shrink-0" />
            </div>
            <div className="flex-1">
              <div className="font-semibold text-amber-800 dark:text-amber-400 text-base">Overdue allocations require attention</div>
              <p className="text-sm text-amber-700/80 dark:text-amber-500/80 mt-1">
                You have {stats?.overdue} allocation{(stats?.overdue ?? 0) === 1 ? "" : "s"} past the expected return date. Please check the allocations queue.
              </p>
            </div>
            <Button asChild variant="default" className="bg-amber-600 hover:bg-amber-700 text-white shadow-sm">
              <Link to="/allocations">Review Now</Link>
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
