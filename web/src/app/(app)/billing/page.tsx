import { requireRole } from "@/lib/auth-utils";
import { MANAGER } from "@/lib/roles";
import { db } from "@/lib/db";
import { PosClient } from "@/components/billing/pos-client";

export const dynamic = "force-dynamic";

export default async function BillingPage() {
  const { organizationId } = await requireRole(MANAGER);

  const items = await db.inventoryItem.findMany({
    where: { organizationId },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      sku: true,
      category: true,
      quantity: true,
      unitPrice: true,
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Billing terminal</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Point-of-sale checkout with automatic inventory write-back and PDF invoices.
        </p>
      </div>
      <PosClient items={items} />
    </div>
  );
}
