import { SidebarTrigger } from "@/components/ui/sidebar";
import { Bell, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate, Link } from "@tanstack/react-router";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { countUnreadNotifications, signOut as backendSignOut } from "@/lib/backend/app-backend";

const ROLE_LABEL: Record<string, string> = {
  admin: "Admin", asset_manager: "Asset Manager",
  department_head: "Department Head", employee: "Employee",
};

export function AppHeader() {
  const { data: user } = useCurrentUser();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data: unread = 0 } = useQuery({
    queryKey: ["notifications-unread"],
    queryFn: countUnreadNotifications,
    enabled: !!user,
    refetchInterval: 30_000,
  });

  const handleSignOut = async () => {
    await qc.cancelQueries();
    qc.clear();
    await backendSignOut();
    navigate({ to: "/auth", replace: true });
  };

  return (
    <header className="h-14 flex items-center gap-3 border-b border-border px-4 bg-background/60 backdrop-blur sticky top-0 z-30">
      <SidebarTrigger />
      <div className="flex-1" />
      <Button asChild variant="ghost" size="icon" className="relative">
        <Link to="/notifications" aria-label="Notifications">
          <Bell className="h-4 w-4" />
          {unread > 0 && (
            <span className="absolute -top-0.5 -right-0.5 h-4 min-w-4 px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-medium flex items-center justify-center">
              {unread > 99 ? "99+" : unread}
            </span>
          )}
        </Link>
      </Button>
      {user && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="gap-2">
              <div className="text-right hidden sm:block">
                <div className="text-sm font-medium leading-none">{user.profile?.name ?? user.email}</div>
                <div className="text-xs text-muted-foreground mt-1">{ROLE_LABEL[user.primaryRole]}</div>
              </div>
              <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground grid place-items-center text-xs font-semibold">
                {(user.profile?.name ?? user.email).slice(0,1).toUpperCase()}
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div className="text-sm font-medium">{user.profile?.name}</div>
              <div className="text-xs text-muted-foreground">{user.email}</div>
              <div className="mt-2"><Badge variant="secondary">{ROLE_LABEL[user.primaryRole]}</Badge></div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleSignOut}><LogOut className="h-4 w-4 mr-2" />Sign out</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </header>
  );
}
