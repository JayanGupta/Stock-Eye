import { requireOrgUser } from "@/lib/auth-utils";
import { AppShell } from "@/components/layout/app-shell";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, organizationName, role } = await requireOrgUser();

  return (
    <AppShell
      orgName={organizationName}
      userName={user.name}
      userEmail={user.email}
      role={role}
    >
      {children}
    </AppShell>
  );
}
