import { requireOrgUser } from "@/lib/auth-utils";
import { getInventoryList } from "@/lib/queries/inventory";
import { PosTerminal } from "@/components/billing/pos-terminal";

export default async function BillingPage() {
  const { organizationId } = await requireOrgUser();
  const rows = await getInventoryList(organizationId);

  const items = rows.map((item) => ({
    id: item.id,
    name: item.name,
    category: item.category,
    sku: item.sku,
    quantity: item.quantity,
    unitPrice: Number(item.unitPrice),
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Billing</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Point-of-sale terminal. Select items, complete the sale, and download
          a PDF invoice.
        </p>
      </div>
      <PosTerminal items={items} />
    </div>
  );
}
