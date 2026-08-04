"use client";

import { Menu } from "lucide-react";
import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { SidebarNav } from "@/components/layout/sidebar-nav";
import { UserMenu } from "@/components/layout/user-menu";
import type { Role } from "@/generated/prisma/enums";

export function AppShell({
  orgName,
  userName,
  userEmail,
  role,
  children,
}: {
  orgName: string;
  userName: string | null;
  userEmail: string;
  role: Role;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex min-h-screen">
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-border bg-sidebar lg:flex">
        <div className="flex-1 overflow-y-auto">
          <SidebarNav orgName={orgName} />
        </div>
        <div className="border-t border-border p-3">
          <UserMenu name={userName} email={userEmail} role={role} />
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-border bg-background/70 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60 lg:px-6">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild className="lg:hidden">
              <button
                className="rounded-md p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
                aria-label="Open navigation"
              >
                <Menu className="size-5" />
              </button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64 p-0">
              <SheetTitle className="sr-only">Navigation</SheetTitle>
              <div className="flex h-full flex-col">
                <div className="flex-1 overflow-y-auto">
                  <SidebarNav orgName={orgName} onNavigate={() => setOpen(false)} />
                </div>
                <div className="border-t border-border p-3">
                  <UserMenu name={userName} email={userEmail} role={role} />
                </div>
              </div>
            </SheetContent>
          </Sheet>

          <div className="flex flex-1 items-center justify-between">
            <span className="text-sm text-muted-foreground">{orgName}</span>
            <div className="lg:hidden">
              <UserMenu name={userName} email={userEmail} role={role} />
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-[1400px] flex-1 p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
