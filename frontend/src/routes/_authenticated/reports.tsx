import { useCallback, useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell,
} from "recharts";
import { Download } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  getReportUtilization,
  getReportMaintenanceFrequency,
  getReportDepartmentAllocation,
  getReportBookingHeatmap,
  getReportNearingRetirement,
} from "@/lib/backend/app-backend";

export const Route = createFileRoute("/_authenticated/reports")({
  head: () => ({ meta: [{ title: "Reports - AssetFlow" }] }),
  component: ReportsPage,
});

const COLORS = ["#0ea5e9", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#14b8a6", "#f97316"];

// ── CSV helpers ─────────────────────────────────────────────────
function exportCsv(filename: string, rows: Record<string, unknown>[]) {
  if (!rows.length) return;
  const keys = Object.keys(rows[0]);
  const lines = [
    keys.join(","),
    ...rows.map((r) =>
      keys.map((k) => JSON.stringify(r[k] ?? "")).join(",")
    ),
  ];
  const blob = new Blob([lines.join("\n")], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function ExportButton({ data, filename }: { data: unknown[]; filename: string }) {
  const handleClick = useCallback(() => {
    exportCsv(filename, data as Record<string, unknown>[]);
  }, [data, filename]);

  return (
    <Button variant="outline" size="sm" onClick={handleClick} disabled={!data.length} id={`export-${filename}`}>
      <Download className="mr-1.5 h-3.5 w-3.5" />
      Export CSV
    </Button>
  );
}

// ── Main page ────────────────────────────────────────────────────
function ReportsPage() {
  const utilQuery = useQuery({ queryKey: ["report-utilization"], queryFn: getReportUtilization });
  const maintQuery = useQuery({ queryKey: ["report-maintenance"], queryFn: getReportMaintenanceFrequency });
  const deptQuery = useQuery({ queryKey: ["report-department"], queryFn: getReportDepartmentAllocation });
  const heatmapQuery = useQuery({ queryKey: ["report-heatmap"], queryFn: getReportBookingHeatmap });
  const retirementQuery = useQuery({ queryKey: ["report-retirement"], queryFn: () => getReportNearingRetirement(5) });

  const utilData = (utilQuery.data as any[]) ?? [];
  const maintData = (maintQuery.data as any[]) ?? [];
  const deptData = (deptQuery.data as any[]) ?? [];
  const heatmapData = (heatmapQuery.data as any[]) ?? [];
  const retirementData = (retirementQuery.data as any[]) ?? [];

  // Heatmap processing
  const heatmapMatrix = useMemo(() => {
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const hours = Array.from({ length: 24 }, (_, i) => i);
    const matrix = days.map((day) => ({ day, hours: hours.map(() => 0) }));
    let max = 0;
    heatmapData.forEach((row: any) => {
      const d = row.day_of_week;
      const h = row.hour_of_day;
      const c = Number(row.booking_count);
      if (matrix[d]) matrix[d].hours[h] = c;
      if (c > max) max = c;
    });
    return { matrix, max };
  }, [heatmapData]);

  return (
    <div className="max-w-7xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Reports & Analytics</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Insights into asset utilization, maintenance, department allocations, and lifecycle.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* ── Utilization Chart ── */}
        <Card>
          <CardHeader className="flex flex-row items-start justify-between gap-2">
            <div>
              <CardTitle className="text-base">Top 10 Most Utilized Assets</CardTitle>
              <CardDescription>Based on total allocations and bookings</CardDescription>
            </div>
            <ExportButton data={utilData} filename="utilization.csv" />
          </CardHeader>
          <CardContent className="h-[300px]">
            {utilQuery.isLoading ? (
              <div className="h-full flex items-center justify-center text-muted-foreground">Loading...</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={utilData.slice(0, 10)} margin={{ top: 5, right: 20, bottom: 25, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--muted))" />
                  <XAxis dataKey="asset_name" tick={{ fontSize: 12 }} angle={-45} textAnchor="end" height={60} stroke="hsl(var(--muted-foreground))" />
                  <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                  <RechartsTooltip cursor={{ fill: "hsl(var(--muted))" }} contentStyle={{ borderRadius: "6px", border: "1px solid hsl(var(--border))" }} />
                  <Bar dataKey="allocation_count" name="Allocations" stackId="a" fill="hsl(var(--primary))" radius={[0, 0, 4, 4]} />
                  <Bar dataKey="booking_count" name="Bookings" stackId="a" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* ── Maintenance Frequency ── */}
        <Card>
          <CardHeader className="flex flex-row items-start justify-between gap-2">
            <div>
              <CardTitle className="text-base">Maintenance Frequency by Category</CardTitle>
              <CardDescription>Total maintenance requests</CardDescription>
            </div>
            <ExportButton data={maintData} filename="maintenance_frequency.csv" />
          </CardHeader>
          <CardContent className="h-[300px]">
            {maintQuery.isLoading ? (
              <div className="h-full flex items-center justify-center text-muted-foreground">Loading...</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={maintData} margin={{ top: 5, right: 20, bottom: 25, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--muted))" />
                  <XAxis dataKey="category_name" tick={{ fontSize: 12 }} angle={-45} textAnchor="end" height={60} stroke="hsl(var(--muted-foreground))" />
                  <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                  <RechartsTooltip cursor={{ fill: "hsl(var(--muted))" }} contentStyle={{ borderRadius: "6px", border: "1px solid hsl(var(--border))" }} />
                  <Bar dataKey="request_count" name="Total Requests" fill="#ef4444" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="high_priority_count" name="High/Critical" fill="#7f1d1d" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* ── Department Allocation Pie ── */}
        <Card>
          <CardHeader className="flex flex-row items-start justify-between gap-2">
            <div>
              <CardTitle className="text-base">Department Allocations</CardTitle>
              <CardDescription>Active allocations by department</CardDescription>
            </div>
            <ExportButton data={deptData} filename="department_allocations.csv" />
          </CardHeader>
          <CardContent className="h-[300px] flex items-center justify-center">
            {deptQuery.isLoading ? (
              <div className="text-muted-foreground">Loading...</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={deptData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="active_allocation_count"
                    nameKey="department_name"
                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                    labelLine={true}
                  >
                    {deptData.map((_entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip contentStyle={{ borderRadius: "6px", border: "1px solid hsl(var(--border))" }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* ── Booking Heatmap ── */}
        <Card>
          <CardHeader className="flex flex-row items-start justify-between gap-2">
            <div>
              <CardTitle className="text-base">Booking Density Heatmap</CardTitle>
              <CardDescription>Reservations by day of week and hour</CardDescription>
            </div>
            <ExportButton data={heatmapData} filename="booking_heatmap.csv" />
          </CardHeader>
          <CardContent>
            {heatmapQuery.isLoading ? (
              <div className="h-[200px] flex items-center justify-center text-muted-foreground">Loading...</div>
            ) : (
              <div className="overflow-x-auto pb-4">
                <div className="min-w-[600px]">
                  <div className="flex mb-1">
                    <div className="w-12" />
                    {Array.from({ length: 24 }).map((_, i) => (
                      <div key={i} className="flex-1 text-[10px] text-center text-muted-foreground">
                        {i % 4 === 0 ? `${i}h` : ""}
                      </div>
                    ))}
                  </div>
                  <div className="space-y-1">
                    {heatmapMatrix.matrix.map((row, i) => (
                      <div key={i} className="flex items-center gap-1">
                        <div className="w-12 text-xs font-medium text-muted-foreground">{row.day}</div>
                        {row.hours.map((val, h) => {
                          const intensity = heatmapMatrix.max > 0 ? val / heatmapMatrix.max : 0;
                          return (
                            <div
                              key={h}
                              className="flex-1 aspect-square rounded-sm transition-colors duration-200"
                              style={{
                                backgroundColor:
                                  val === 0
                                    ? "hsl(var(--muted)/0.3)"
                                    : `rgba(16, 185, 129, ${Math.max(0.2, intensity)})`,
                              }}
                              title={`${row.day} ${h}:00 — ${val} bookings`}
                            />
                          );
                        })}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Nearing Retirement ── (full width) */}
      <Card className="border-amber-500/30 bg-amber-500/5">
        <CardHeader className="flex flex-row items-start justify-between gap-2">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <span>Nearing Retirement</span>
              <Badge variant="outline" className="border-amber-500/50 text-amber-600 text-xs font-normal">
                ≥ 5 years in service
              </Badge>
            </CardTitle>
            <CardDescription>Assets that may need replacement soon</CardDescription>
          </div>
          <ExportButton data={retirementData} filename="nearing_retirement.csv" />
        </CardHeader>
        <CardContent>
          {retirementQuery.isLoading ? (
            <div className="py-8 text-center text-muted-foreground text-sm">Loading...</div>
          ) : retirementData.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground text-sm border border-dashed rounded-md">
              No assets nearing retirement.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground text-xs uppercase tracking-wide">
                    <th className="pb-2 pr-4 font-medium">Tag</th>
                    <th className="pb-2 pr-4 font-medium">Asset</th>
                    <th className="pb-2 pr-4 font-medium">Category</th>
                    <th className="pb-2 pr-4 font-medium">Department</th>
                    <th className="pb-2 pr-4 font-medium">Acquired</th>
                    <th className="pb-2 pr-4 font-medium">Age</th>
                    <th className="pb-2 pr-4 font-medium">Condition</th>
                    <th className="pb-2 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {retirementData.map((row: any) => (
                    <tr key={row.id} className="hover:bg-muted/30 transition-colors">
                      <td className="py-2 pr-4 font-mono text-xs text-muted-foreground">{row.asset_tag}</td>
                      <td className="py-2 pr-4 font-medium">{row.name}</td>
                      <td className="py-2 pr-4 text-muted-foreground">{row.category_name ?? "—"}</td>
                      <td className="py-2 pr-4 text-muted-foreground">{row.department_name ?? "—"}</td>
                      <td className="py-2 pr-4 text-muted-foreground">{row.acquisition_date}</td>
                      <td className="py-2 pr-4">
                        <Badge variant="outline" className="border-amber-500/50 text-amber-600">
                          {row.age_years}y
                        </Badge>
                      </td>
                      <td className="py-2 pr-4 capitalize text-muted-foreground">{row.condition}</td>
                      <td className="py-2 capitalize text-muted-foreground">{row.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
