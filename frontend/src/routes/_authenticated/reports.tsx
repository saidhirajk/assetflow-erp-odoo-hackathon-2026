import { useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getReportUtilization, getReportMaintenanceFrequency, getReportDepartmentAllocation, getReportBookingHeatmap } from "@/lib/backend/app-backend";

export const Route = createFileRoute("/_authenticated/reports")({
  head: () => ({ meta: [{ title: "Reports - AssetFlow" }] }),
  component: ReportsPage,
});

const COLORS = ["#0ea5e9", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#14b8a6", "#f97316"];

function ReportsPage() {
  const utilQuery = useQuery({ queryKey: ["report-utilization"], queryFn: getReportUtilization });
  const maintQuery = useQuery({ queryKey: ["report-maintenance"], queryFn: getReportMaintenanceFrequency });
  const deptQuery = useQuery({ queryKey: ["report-department"], queryFn: getReportDepartmentAllocation });
  const heatmapQuery = useQuery({ queryKey: ["report-heatmap"], queryFn: getReportBookingHeatmap });

  const utilData = (utilQuery.data as any[]) ?? [];
  const maintData = (maintQuery.data as any[]) ?? [];
  const deptData = (deptQuery.data as any[]) ?? [];
  const heatmapData = (heatmapQuery.data as any[]) ?? [];

  // Heatmap processing
  const heatmapMatrix = useMemo(() => {
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const hours = Array.from({ length: 24 }, (_, i) => i);
    const matrix = days.map(day => ({ day, hours: hours.map(h => 0) }));
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
        <p className="mt-1 text-sm text-muted-foreground">Insights into asset utilization, maintenance, and allocations.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Utilization Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top 10 Most Utilized Assets</CardTitle>
            <CardDescription>Based on total allocations and bookings</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            {utilQuery.isLoading ? <div className="h-full flex items-center justify-center text-muted-foreground">Loading...</div> : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={utilData.slice(0, 10)} margin={{ top: 5, right: 20, bottom: 25, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--muted))" />
                  <XAxis dataKey="asset_name" tick={{ fontSize: 12 }} angle={-45} textAnchor="end" height={60} stroke="hsl(var(--muted-foreground))" />
                  <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                  <RechartsTooltip cursor={{ fill: 'hsl(var(--muted))' }} contentStyle={{ borderRadius: '6px', border: '1px solid hsl(var(--border))' }} />
                  <Bar dataKey="allocation_count" name="Allocations" stackId="a" fill="hsl(var(--primary))" radius={[0, 0, 4, 4]} />
                  <Bar dataKey="booking_count" name="Bookings" stackId="a" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Maintenance Frequency */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Maintenance Frequency by Category</CardTitle>
            <CardDescription>Total maintenance requests</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            {maintQuery.isLoading ? <div className="h-full flex items-center justify-center text-muted-foreground">Loading...</div> : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={maintData} margin={{ top: 5, right: 20, bottom: 25, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--muted))" />
                  <XAxis dataKey="category_name" tick={{ fontSize: 12 }} angle={-45} textAnchor="end" height={60} stroke="hsl(var(--muted-foreground))" />
                  <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                  <RechartsTooltip cursor={{ fill: 'hsl(var(--muted))' }} contentStyle={{ borderRadius: '6px', border: '1px solid hsl(var(--border))' }} />
                  <Bar dataKey="request_count" name="Total Requests" fill="#ef4444" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="high_priority_count" name="High/Critical" fill="#7f1d1d" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Department Allocation Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Department Allocations</CardTitle>
            <CardDescription>Active allocations by department</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px] flex items-center justify-center">
            {deptQuery.isLoading ? <div className="text-muted-foreground">Loading...</div> : (
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
                    {deptData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip contentStyle={{ borderRadius: '6px', border: '1px solid hsl(var(--border))' }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Booking Heatmap */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Booking Density Heatmap</CardTitle>
            <CardDescription>Reservations by day of week and hour</CardDescription>
          </CardHeader>
          <CardContent>
            {heatmapQuery.isLoading ? <div className="h-[300px] flex items-center justify-center text-muted-foreground">Loading...</div> : (
              <div className="overflow-x-auto pb-4">
                <div className="min-w-[600px]">
                  <div className="flex mb-1">
                    <div className="w-12"></div>
                    {Array.from({ length: 24 }).map((_, i) => (
                      <div key={i} className="flex-1 text-[10px] text-center text-muted-foreground">
                        {i % 4 === 0 ? `${i}h` : ''}
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
                                backgroundColor: val === 0 ? 'hsl(var(--muted)/0.3)' : `rgba(16, 185, 129, ${Math.max(0.2, intensity)})`
                              }}
                              title={`${row.day} ${h}:00 - ${val} bookings`}
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
    </div>
  );
}
