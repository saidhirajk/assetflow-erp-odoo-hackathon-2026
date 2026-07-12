import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { cancelBooking, createBooking, listBookableAssets, listBookings } from "@/lib/backend/app-backend";
import { useCurrentUser, hasRole } from "@/hooks/use-current-user";

export const Route = createFileRoute("/_authenticated/bookings")({
  head: () => ({ meta: [{ title: "Bookings - Sampada" }] }),
  component: BookingsPage,
});

function BookingsPage() {
  const qc = useQueryClient();
  const { data: user } = useCurrentUser();
  const isAdminOrMgr = hasRole(user, "admin", "asset_manager");

  const [form, setForm] = useState({ asset_id: "", start_time: "", end_time: "", purpose: "" });
  const [conflict, setConflict] = useState<Record<string, unknown> | null>(null);

  // Reschedule state
  const [rescheduleOpen, setRescheduleOpen] = useState<string | null>(null);
  const [rescheduleForm, setRescheduleForm] = useState({ start_time: "", end_time: "" });

  const assetsQuery = useQuery({ queryKey: ["bookable-assets"], queryFn: listBookableAssets });
  const bookingsQuery = useQuery({ queryKey: ["bookings"], queryFn: listBookings });

  const selectedAssetBookings = useMemo(
    () => (bookingsQuery.data ?? []).filter((booking) => !form.asset_id || booking.asset_id === form.asset_id),
    [bookingsQuery.data, form.asset_id],
  );

  const activeBookings = selectedAssetBookings.filter((b) => b.status === "upcoming" || b.status === "ongoing");
  const pastBookings = selectedAssetBookings.filter((b) => b.status === "completed" || b.status === "cancelled");

  const createMutation = useMutation({
    mutationFn: async () =>
      createBooking({
        asset_id: form.asset_id,
        start_time: new Date(form.start_time).toISOString(),
        end_time: new Date(form.end_time).toISOString(),
        purpose: form.purpose.trim(),
      }),
    onSuccess: async (result) => {
      if (result.ok === false) {
        setConflict(result);
        toast.error("Booking overlaps with an existing slot");
        return;
      }
      toast.success("Booking confirmed");
      setConflict(null);
      setForm({ asset_id: "", start_time: "", end_time: "", purpose: "" });
      await invalidateBookings(qc);
    },
  });

  const cancelMutation = useMutation({
    mutationFn: cancelBooking,
    onSuccess: async () => {
      toast.success("Booking cancelled");
      await invalidateBookings(qc);
    },
  });

  const rescheduleMutation = useMutation({
    mutationFn: async (params: { id: string; asset_id: string; purpose: string }) => {
      await cancelBooking(params.id);
      const res = await createBooking({
        asset_id: params.asset_id,
        purpose: params.purpose,
        start_time: new Date(rescheduleForm.start_time).toISOString(),
        end_time: new Date(rescheduleForm.end_time).toISOString(),
      });
      if (res.ok === false) throw new Error("Slot unavailable");
      return res;
    },
    onSuccess: async () => {
      toast.success("Booking rescheduled");
      setRescheduleOpen(null);
      await invalidateBookings(qc);
    },
    onError: () => {
      toast.error("Failed to reschedule. The slot might be taken.");
    },
  });

  const canSubmit = form.asset_id && form.start_time && form.end_time && new Date(form.end_time) > new Date(form.start_time);

  return (
    <div className="max-w-7xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Bookings</h1>
        <p className="mt-1 text-sm text-muted-foreground">Reserve bookable resources with server-side overlap validation.</p>
      </div>

      <div className="grid gap-4 xl:grid-cols-[420px_1fr]">
        <Card className="space-y-4 p-4">
          <div>
            <h2 className="font-medium">Book resource</h2>
            <p className="text-sm text-muted-foreground">Back-to-back slots are allowed; true overlaps are blocked by the backend.</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="booking-asset">Resource</Label>
            <Select value={form.asset_id} onValueChange={(value) => setForm((current) => ({ ...current, asset_id: value }))}>
              <SelectTrigger id="booking-asset"><SelectValue placeholder="Select bookable asset" /></SelectTrigger>
              <SelectContent>
                {(assetsQuery.data ?? []).map((asset) => (
                  <SelectItem key={asset.id} value={asset.id}>
                    {asset.asset_tag} - {asset.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="booking-start">Start</Label>
              <Input
                id="booking-start"
                type="datetime-local"
                value={form.start_time}
                onChange={(event) => setForm((current) => ({ ...current, start_time: event.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="booking-end">End</Label>
              <Input
                id="booking-end"
                type="datetime-local"
                value={form.end_time}
                onChange={(event) => setForm((current) => ({ ...current, end_time: event.target.value }))}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="booking-purpose">Purpose</Label>
            <Textarea
              id="booking-purpose"
              value={form.purpose}
              onChange={(event) => setForm((current) => ({ ...current, purpose: event.target.value }))}
              placeholder="Meeting, demo, field visit..."
            />
          </div>

          {conflict && (
            <Alert>
              <AlertTitle>Slot unavailable</AlertTitle>
              <AlertDescription>
                Conflicts with {formatDateTime(String(conflict.conflict_start_time))} to{" "}
                {formatDateTime(String(conflict.conflict_end_time))}.
              </AlertDescription>
            </Alert>
          )}

          <Button className="w-full" disabled={!canSubmit || createMutation.isPending} onClick={() => createMutation.mutate()}>
            {createMutation.isPending ? "Booking..." : "Confirm booking"}
          </Button>
        </Card>

        <Card className="space-y-4 p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="font-medium">Resource schedule</h2>
              <p className="text-sm text-muted-foreground">Use the resource selector to focus the timeline.</p>
            </div>
            <Badge variant="outline">{selectedAssetBookings.length} bookings</Badge>
          </div>

          <Tabs defaultValue="upcoming">
            <TabsList className="grid w-full grid-cols-2 lg:w-[400px]">
              <TabsTrigger value="upcoming">Upcoming & Ongoing</TabsTrigger>
              <TabsTrigger value="completed">Completed & Cancelled</TabsTrigger>
            </TabsList>
            
            <TabsContent value="upcoming" className="mt-4 space-y-3">
              {activeBookings.length ? (
                activeBookings.map((booking) => (
                  <div key={booking.id} className="grid gap-3 rounded-md border border-border/70 p-4 lg:grid-cols-[1fr_auto]">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium">{booking.asset?.name ?? "Unknown resource"}</span>
                        <Badge variant="default">{booking.status}</Badge>
                      </div>
                      <div className="mt-1 text-sm text-muted-foreground">
                        {formatDateTime(booking.start_time)} to {formatDateTime(booking.end_time)}
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        Booked by {booking.bookedBy?.name ?? "Unknown"}
                        {booking.purpose ? ` - ${booking.purpose}` : ""}
                      </div>
                    </div>
                    
                    {(isAdminOrMgr || booking.booked_by_user_id === user?.userId) && (
                      <div className="flex flex-col gap-2">
                        <Dialog open={rescheduleOpen === booking.id} onOpenChange={(open) => {
                          if (open) {
                            setRescheduleForm({
                              start_time: new Date(booking.start_time).toISOString().slice(0, 16),
                              end_time: new Date(booking.end_time).toISOString().slice(0, 16)
                            });
                            setRescheduleOpen(booking.id);
                          } else {
                            setRescheduleOpen(null);
                          }
                        }}>
                          <DialogTrigger asChild>
                            <Button variant="outline" size="sm">Reschedule</Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Reschedule Booking</DialogTitle>
                              <DialogDescription>Select a new time slot for this booking.</DialogDescription>
                            </DialogHeader>
                            <div className="grid gap-4 py-4">
                              <div className="space-y-2">
                                <Label>Start Time</Label>
                                <Input
                                  type="datetime-local"
                                  value={rescheduleForm.start_time}
                                  onChange={(e) => setRescheduleForm(prev => ({ ...prev, start_time: e.target.value }))}
                                />
                              </div>
                              <div className="space-y-2">
                                <Label>End Time</Label>
                                <Input
                                  type="datetime-local"
                                  value={rescheduleForm.end_time}
                                  onChange={(e) => setRescheduleForm(prev => ({ ...prev, end_time: e.target.value }))}
                                />
                              </div>
                            </div>
                            <DialogFooter>
                              <Button
                                onClick={() => rescheduleMutation.mutate({
                                  id: booking.id,
                                  asset_id: booking.asset_id,
                                  purpose: booking.purpose || ""
                                })}
                                disabled={rescheduleMutation.isPending || !rescheduleForm.start_time || !rescheduleForm.end_time}
                              >
                                Confirm Reschedule
                              </Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>

                        <Button variant="outline" size="sm" disabled={cancelMutation.isPending} onClick={() => cancelMutation.mutate(booking.id)}>
                          Cancel
                        </Button>
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="rounded-md border border-dashed border-border/70 p-8 text-center text-sm text-muted-foreground">
                  No upcoming bookings.
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="completed" className="mt-4 space-y-3">
              {pastBookings.length ? (
                pastBookings.map((booking) => (
                  <div key={booking.id} className="grid gap-3 rounded-md border border-border/70 p-4 lg:grid-cols-[1fr_auto] opacity-75">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium">{booking.asset?.name ?? "Unknown resource"}</span>
                        <Badge variant="secondary">{booking.status}</Badge>
                      </div>
                      <div className="mt-1 text-sm text-muted-foreground">
                        {formatDateTime(booking.start_time)} to {formatDateTime(booking.end_time)}
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        Booked by {booking.bookedBy?.name ?? "Unknown"}
                        {booking.purpose ? ` - ${booking.purpose}` : ""}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-md border border-dashed border-border/70 p-8 text-center text-sm text-muted-foreground">
                  No past bookings.
                </div>
              )}
            </TabsContent>
          </Tabs>
        </Card>
      </div>
    </div>
  );
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString([], { dateStyle: "medium", timeStyle: "short" });
}

async function invalidateBookings(qc: ReturnType<typeof useQueryClient>) {
  await Promise.all([
    qc.invalidateQueries({ queryKey: ["bookings"] }),
    qc.invalidateQueries({ queryKey: ["dashboard-overview"] }),
  ]);
}
