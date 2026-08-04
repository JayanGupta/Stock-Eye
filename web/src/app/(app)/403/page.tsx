import { ShieldAlert } from "lucide-react";
import Link from "next/link";

export default function ForbiddenPage() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
      <div className="mb-4 flex size-14 items-center justify-center rounded-2xl border border-border bg-card">
        <ShieldAlert className="size-7 text-rose-400" />
      </div>
      <h1 className="text-xl font-semibold">403 — Access denied</h1>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">
        Your role does not have permission to view this page. Contact an
        administrator if you believe this is a mistake.
      </p>
      <Link
        href="/dashboard"
        className="mt-6 text-sm font-medium text-primary hover:underline"
      >
        Back to dashboard
      </Link>
    </div>
  );
}
