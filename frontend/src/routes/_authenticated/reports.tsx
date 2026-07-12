import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { Download } from "lucide-react";
import { getReportsData, type ReportsData } from "@/lib/backend/app-backend";
import { useCurrentUser } from "@/hooks/use-current-user";

export const Route = createFileRoute("/_authenticated/reports")({
  head: () => ({ meta: [{ title: "Reports — AssetFlow" }] }),
  component: ReportsPage,
});

const COLORS = ["#3b82f6", "#22c55e", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4", "#ec4899"];

function exportCSV(data: Record<string, unknown>[], filename: string) {
  if (!data.length) return;
  const csv = [Object.keys(data[0]).join(",")].concat(data.map((r) => Object.values(r).join(","))).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function ReportsPage() {
  const { data, isLoading } = useQuery({ queryKey: ["reports"], queryFn: getReportsData });
  const { data: user } = useCurrentUser();

  if (isLoading) return <div className="space-y-4"><Skeleton className="h-20 w-full" /><Skeleton className="h-64 w-full" /><Skeleton className="h-64 w-full" /></div>;
  if (!data) return null;

  const d = data as ReportsData;
  const isEmployee = d.scope === "employee";
  const isDeptHead = d.scope === "department_head";
  const scopeLabel = isEmployee ? "Your" : isDeptHead ? "Department" : "All";

  return (
    <div className="max-w-7xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Reports & Analytics</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {isEmployee
              ? "Your asset and activity summary."
              : isDeptHead
              ? "Insights for your department."
              : "Insights across all asset modules."}
          </p>
        </div>
        {!isEmployee && (
          <Button variant="outline" size="sm" onClick={() => exportCSV(d.departmentSummary, "assetflow-report.csv")}>
            <Download className="h-4 w-4 mr-1" /> Export CSV
          </Button>
        )}
      </div>

      {/* Overall Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        {[
          { label: "Total Assets", value: d.overallStats.totalAssets },
          { label: "Allocated", value: d.overallStats.totalAllocated },
          { label: "Open Maintenance", value: d.overallStats.openMaintenance },
          { label: "Active Bookings", value: d.overallStats.activeBookings },
        ].map((s) => (
          <Card key={s.label} className="p-4 text-center">
            <div className="text-3xl font-bold">{s.value}</div>
            <div className="text-xs text-muted-foreground mt-1">{s.label}</div>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Department Summary */}
        <Card className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-medium">{isEmployee ? "Your Assets by Department" : "Department-wise Allocation"}</h2>
            {!isEmployee && (
              <Button variant="ghost" size="sm" onClick={() => exportCSV(d.departmentSummary, "dept-summary.csv")}>
                <Download className="h-3 w-3" />
              </Button>
            )}
          </div>
          {d.departmentSummary.length ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={d.departmentSummary}>
                <XAxis dataKey="department" fontSize={12} />
                <YAxis fontSize={12} />
                <Tooltip />
                <Bar dataKey="allocated" fill="#3b82f6" name="Allocated" />
                <Bar dataKey="available" fill="#22c55e" name="Available" />
              </BarChart>
            </ResponsiveContainer>
          ) : <p className="text-sm text-muted-foreground">No data</p>}
        </Card>

        {/* Category Distribution */}
        <Card className="p-4 space-y-3">
          <h2 className="font-medium">{scopeLabel} Asset Categories</h2>
          {d.categoryDistribution.length ? (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={d.categoryDistribution} dataKey="count" nameKey="category" cx="50%" cy="50%" outerRadius={80} label>
                  {d.categoryDistribution.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : <p className="text-sm text-muted-foreground">No data</p>}
        </Card>

        {/* Status Breakdown */}
        <Card className="p-4 space-y-3">
          <h2 className="font-medium">{scopeLabel} Asset Status Breakdown</h2>
          {d.statusBreakdown.length ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={d.statusBreakdown}>
                <XAxis dataKey="status" fontSize={11} />
                <YAxis fontSize={12} />
                <Tooltip />
                <Bar dataKey="count" fill="#8b5cf6">
                  {d.statusBreakdown.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : <p className="text-sm text-muted-foreground">No data</p>}
        </Card>

        {/* Maintenance Frequency */}
        <Card className="p-4 space-y-3">
          <h2 className="font-medium">{scopeLabel} Maintenance by Category</h2>
          {d.maintenanceFrequency.length ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={d.maintenanceFrequency}>
                <XAxis dataKey="category" fontSize={12} />
                <YAxis fontSize={12} />
                <Tooltip />
                <Bar dataKey="resolved" fill="#22c55e" name="Resolved" />
                <Bar dataKey="pending" fill="#f59e0b" name="Pending" />
              </BarChart>
            </ResponsiveContainer>
          ) : <p className="text-sm text-muted-foreground">No data</p>}
        </Card>
      </div>

      {/* Nearing Retirement */}
      <Card className="p-4 space-y-3">
        <h2 className="font-medium">{scopeLabel} Nearing Retirement (5+ years old)</h2>
        {d.nearingRetirement.length ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/70 text-left text-xs text-muted-foreground">
                  <th className="pb-2 font-semibold">Asset Tag</th>
                  <th className="pb-2 font-semibold">Name</th>
                  <th className="pb-2 font-semibold">Category</th>
                  <th className="pb-2 font-semibold">Condition</th>
                  <th className="pb-2 font-semibold">Acquired</th>
                </tr>
              </thead>
              <tbody>
                {d.nearingRetirement.map((a) => (
                  <tr key={a.asset_tag} className="border-b border-border/30">
                    <td className="py-2 font-mono text-xs">{a.asset_tag}</td>
                    <td className="py-2">{a.name}</td>
                    <td className="py-2 text-muted-foreground">{a.category}</td>
                    <td className="py-2"><Badge variant="outline">{a.condition}</Badge></td>
                    <td className="py-2 text-muted-foreground">{a.acquisition_date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <p className="text-sm text-muted-foreground">No assets nearing retirement.</p>}
      </Card>

      {/* Booking Heatmap */}
      <Card className="p-4 space-y-3">
        <h2 className="font-medium">{scopeLabel} Booking Heatmap (by hour of day)</h2>
        {d.bookingHeatmap.length ? (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-muted-foreground">
                  <th className="pb-2 font-semibold">Hour</th>
                  {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
                    <th key={d} className="pb-2 font-semibold text-center px-2">{d}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: 24 }, (_, h) => (
                  <tr key={h}>
                    <td className="py-1 text-muted-foreground">{String(h).padStart(2, "0")}:00</td>
                    {[0, 1, 2, 3, 4, 5, 6].map((day) => {
                      const cell = d.bookingHeatmap.find((b) => b.hour === h && b.day === day);
                      const count = cell?.count ?? 0;
                      const intensity = Math.min(count / 5, 1);
                      return (
                        <td key={day} className="text-center px-1 py-1">
                          <div
                            className="w-6 h-6 rounded flex items-center justify-center text-[10px] font-medium"
                            style={{
                              backgroundColor: count > 0
                                ? `rgba(59, 130, 246, ${0.15 + intensity * 0.85})`
                                : "transparent",
                              color: intensity > 0.5 ? "white" : undefined,
                            }}
                          >
                            {count > 0 ? count : ""}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <p className="text-sm text-muted-foreground">No booking data yet.</p>}
      </Card>
    </div>
  );
}
