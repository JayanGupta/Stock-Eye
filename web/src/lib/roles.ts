import type { Role } from "@/generated/prisma/enums";

const ROLE_RANK: Record<Role, number> = {
  OWNER: 4,
  ADMIN: 3,
  MANAGER: 2,
  VIEWER: 1,
};

/** True if `role` is at least as privileged as `required`. */
export function hasRole(role: Role, required: Role): boolean {
  return ROLE_RANK[role] >= ROLE_RANK[required];
}

/** All roles that rank at or above the given role. */
export function rolesAtLeast(required: Role): Role[] {
  return (Object.keys(ROLE_RANK) as Role[]).filter((r) => ROLE_RANK[r] >= ROLE_RANK[required]);
}

export const OWNER = "OWNER" as const;
export const ADMIN = "ADMIN" as const;
export const MANAGER = "MANAGER" as const;
export const VIEWER = "VIEWER" as const;
