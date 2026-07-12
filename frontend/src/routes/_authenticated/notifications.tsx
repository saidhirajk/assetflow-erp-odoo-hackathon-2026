import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Bell } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { listNotifications, markAllNotificationsRead, markNotificationRead } from "@/lib/backend/app-backend";

export const Route = createFileRoute("/_authenticated/notifications")({
  head: () => ({ meta: [{ title: "Notifications — AssetFlow" }] }),
  component: NotificationsPage,
});

function NotificationsPage() {
  const qc = useQueryClient();
  const { data: items = [] } = useQuery({
    queryKey: ["notifications"],
    queryFn: listNotifications,
  });

  const resolveHref = (notification: { type?: string; reference_type?: string | null }) => {
    switch (notification.reference_type ?? notification.type) {
      case "asset_assigned":
      case "maintenance_approved":
      case "maintenance_rejected":
        return "/assets";
      case "booking_confirmed":
      case "booking_cancelled":
      case "booking_reminder":
        return "/bookings";
      case "transfer_requested":
      case "transfer_approved":
      case "transfer_rejected":
        return "/transfers";
      case "overdue_return":
        return "/allocations";
      case "audit_discrepancy":
        return "/audits";
      default:
        return "/notifications";
    }
  };

  const markAll = useMutation({
    mutationFn: async () => {
      const { error } = await markAllNotificationsRead();
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notifications"] });
      qc.invalidateQueries({ queryKey: ["notifications-unread"] });
      toast.success("Marked all as read");
    },
  });

  const markOne = async (id: string) => {
    await markNotificationRead(id);
    qc.invalidateQueries({ queryKey: ["notifications"] });
    qc.invalidateQueries({ queryKey: ["notifications-unread"] });
  };

  return (
    <div className="max-w-3xl space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Notifications</h1>
          <p className="text-muted-foreground text-sm mt-1">Recent activity relevant to you.</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => markAll.mutate()} disabled={markAll.isPending}>
          Mark all read
        </Button>
      </div>

      {items.length === 0 ? (
        <Card className="p-8 text-center">
          <Bell className="h-6 w-6 mx-auto text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">No notifications yet.</p>
        </Card>
      ) : (
        <div className="space-y-2">
          {items.map((n) => (
            <Card
              key={n.id}
              className={`p-4 ${n.is_read ? "opacity-70" : "border-primary/30"}`}
            >
              <div className="flex items-start gap-3">
                <div className={`h-2 w-2 rounded-full mt-2 ${n.is_read ? "bg-muted-foreground" : "bg-primary"}`} />
                <div className="flex-1">
                  <Link
                    to={resolveHref(n)}
                    className="text-sm font-medium hover:underline"
                    onClick={() => !n.is_read && markOne(n.id)}
                  >
                    {n.message}
                  </Link>
                  <div className="text-xs text-muted-foreground mt-1">
                    {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
