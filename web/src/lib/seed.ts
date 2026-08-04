import { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import seedItems from "@/data/seed-inventory.json";

function parseDate(value: string | null): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * Seeds a fresh organization with a warehouse, catalog, 12 months of sales
 * history and wastage records — mirroring the original Stock-Eye auto-seed.
 * No-op when the organization already has inventory.
 */
export async function seedOrganizationDemoData(organizationId: string) {
  const existing = await db.inventoryItem.count({ where: { organizationId } });
  if (existing > 0) return;

  const warehouse = await db.warehouse.create({
    data: {
      organizationId,
      name: "Main Warehouse",
      location: "Headquarters",
    },
  });

  type CreatedItem = {
    id: string;
    unitPrice: Prisma.Decimal;
    quantitySold: number;
    wastage: number;
  };
  const created: CreatedItem[] = await db.$transaction(async (tx) => {
    const items: CreatedItem[] = [];
    for (let i = 0; i < seedItems.length; i++) {
      const row = seedItems[i];
      const item = await tx.inventoryItem.create({
        data: {
          organizationId,
          warehouseId: warehouse.id,
          sku: `SKU-${String(i + 1).padStart(4, "0")}`,
          name: row.name,
          category: row.category,
          quantity: row.quantity,
          unitPrice: row.unitPrice,
          reorderPoint: Math.max(5, Math.floor(row.quantitySold / 365) * 14),
          safetyStock: Math.max(2, Math.floor(row.quantitySold / 365) * 7),
          expiryDate: parseDate(row.expiryDate),
        },
      });
      items.push({
        id: item.id,
        unitPrice: item.unitPrice,
        quantitySold: row.quantitySold,
        wastage: row.wastage,
      });
    }
    return items;
  });

  const now = Date.now();
  const dayMs = 86_400_000;

  const sales: Prisma.SaleItemCreateManyInput[] = [];
  for (const { id, unitPrice, quantitySold } of created) {
    let remaining = quantitySold;
    while (remaining > 0) {
      const qty = Math.min(remaining, 1 + Math.floor(Math.random() * 4));
      remaining -= qty;
      const daysAgo = Math.floor(Math.random() * 360);
      sales.push({
        itemId: id,
        organizationId,
        quantity: qty,
        unitPrice,
        soldAt: new Date(now - daysAgo * dayMs),
      });
    }
  }
  await db.saleItem.createMany({ data: sales });

  const wasteTxs: Prisma.InventoryTransactionCreateManyInput[] = [];
  for (const { id, wastage } of created) {
    if (wastage > 0) {
      wasteTxs.push({
        itemId: id,
        organizationId,
        type: "WASTE",
        quantity: wastage,
        note: "Seeded wastage history",
      });
    }
  }
  if (wasteTxs.length > 0) {
    await db.inventoryTransaction.createMany({ data: wasteTxs });
  }
}
