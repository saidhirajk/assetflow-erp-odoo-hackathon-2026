import { Link, useRouterState } from "@tanstack/react-router";
import {
  Boxes, LayoutDashboard, Package, Users, Building2, Calendar,
  Wrench, ClipboardCheck, BarChart3, Bell, ScrollText, ArrowLeftRight,
} from "lucide-react";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar,
} from "@/components/ui/sidebar";
import { hasRole, useCurrentUser, type AppRole } from "@/hooks/use-current-user";

type NavItem = { title: string; url: string; icon: React.ComponentType<{ className?: string }>; roles?: AppRole[] };

const mainNav: NavItem[] = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Assets", url: "/assets", icon: Package },
  { title: "Allocations", url: "/allocations", icon: Users },
  { title: "Transfers", url: "/transfers", icon: ArrowLeftRight },
  { title: "Bookings", url: "/bookings", icon: Calendar },
  { title: "Maintenance", url: "/maintenance", icon: Wrench },
  { title: "Audits", url: "/audits", icon: ClipboardCheck, roles: ["admin","asset_manager"] },
  { title: "Reports", url: "/reports", icon: BarChart3 },
];

const adminNav: NavItem[] = [
  { title: "Organization", url: "/organization", icon: Building2, roles: ["admin"] },
  { title: "Activity Logs", url: "/logs", icon: ScrollText, roles: ["admin","asset_manager","department_head"] },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const path = useRouterState({ select: r => r.location.pathname });
  const { data: user } = useCurrentUser();

  const visible = (items: NavItem[]) =>
    items.filter(i => !i.roles || hasRole(user, ...i.roles));

  const isActive = (url: string) => path === url || path.startsWith(url + "/");

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="px-3 py-4">
        <Link to="/dashboard" className="flex items-center gap-2 text-primary">
          <Boxes className="h-5 w-5 shrink-0" />
          {!collapsed && <span className="font-semibold tracking-tight">Sampada</span>}
        </Link>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Operations</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {visible(mainNav).map(item => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton asChild isActive={isActive(item.url)}>
                    <Link to={item.url}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {visible(adminNav).length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel>Administration</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {visible(adminNav).map(item => (
                  <SidebarMenuItem key={item.url}>
                    <SidebarMenuButton asChild isActive={isActive(item.url)}>
                      <Link to={item.url}>
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={isActive("/notifications")}>
                  <Link to="/notifications"><Bell className="h-4 w-4" /><span>Notifications</span></Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
