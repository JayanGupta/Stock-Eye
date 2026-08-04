import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import type { Role } from "@/generated/prisma/enums";
import { hasRole } from "@/lib/roles";

export interface OrgContext {
  user: { id: string; name: string | null; email: string };
  organizationId: string;
  organizationName: string;
  role: Role;
}

/** Returns the authenticated user or redirects to /login. */
export async function requireUser() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  return session.user;
}

/**
 * Resolves the user's active organization membership (tenant context).
 * Falls back to the first membership when no active org is set.
 * Redirects to /onboarding when the user belongs to no organization.
 */
export async function requireOrgUser(): Promise<OrgContext> {
  const user = await requireUser();

  const userWithOrgs = await db.user.findUnique({
    where: { id: user.id },
    include: {
      memberships: true,
    },
  });

  if (!userWithOrgs || userWithOrgs.memberships.length === 0) {
    redirect("/onboarding");
  }

  const activeMembership =
    userWithOrgs.memberships.find((m) => m.organizationId === userWithOrgs.activeOrgId) ??
    userWithOrgs.memberships[0];

  if (!activeMembership) redirect("/onboarding");

  const org = await db.organization.findUnique({
    where: { id: activeMembership.organizationId },
  });

  if (!org) redirect("/onboarding");

  return {
    user: { id: user.id, name: user.name ?? null, email: user.email ?? "" },
    organizationId: org.id,
    organizationName: org.name,
    role: activeMembership.role,
  };
}

/** Guards a page/action by minimum role. */
export async function requireRole(required: Role): Promise<OrgContext> {
  const ctx = await requireOrgUser();
  if (!hasRole(ctx.role, required)) redirect("/403");
  return ctx;
}
