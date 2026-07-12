import { useQuery } from "@tanstack/react-query";
import { getCurrentUserSnapshot, type AppRole, type BackendCurrentUser } from "@/lib/backend/app-backend";

export type { AppRole };

export interface CurrentUser {
  userId: string;
  email: string;
  profile: {
    id: string;
    name: string;
    email: string;
    department_id: string | null;
    status: "active" | "inactive";
  } | null;
  roles: AppRole[];
  primaryRole: AppRole;
}

const roleRank: Record<AppRole, number> = {
  admin: 1, asset_manager: 2, department_head: 3, employee: 4,
};

async function fetchCurrentUser(): Promise<CurrentUser | null> {
  const snapshot = await getCurrentUserSnapshot();
  if (!snapshot) return null;

  const roles = [...snapshot.roles];
  if (roles.length === 0) roles.push("employee");
  const primaryRole = [...roles].sort((a, b) => roleRank[a] - roleRank[b])[0];

  return {
    userId: snapshot.userId,
    email: snapshot.email,
    profile: snapshot.profile,
    roles,
    primaryRole,
  };
}

export function useCurrentUser() {
  return useQuery({
    queryKey: ["current-user"],
    queryFn: fetchCurrentUser,
    staleTime: 30_000,
  });
}

export function hasRole(user: CurrentUser | null | undefined, ...roles: AppRole[]): boolean {
  if (!user) return false;
  return user.roles.some(r => roles.includes(r));
}
