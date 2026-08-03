import { db } from "@/lib/db";

export type StockStatus = "out" | "low" | "ok";

export function stockStatus(
  quantity: number,
  reorderPoint: number,
): StockStatus {
  if (quantity <= 0) return "out";
  if (quantity <= reorderPoint) return "low";
  return "ok";
}

export async function getInventoryList(
  organizationId: string,
  opts: { q?: string; category?: string } = {},
) {
  return db.inventoryItem.findMany({
    where: {
      organizationId,
      ...(opts.q
        ? { name: { contains: opts.q, mode: "insensitive" } }
        : {}),
      ...(opts.category ? { category: opts.category } : {}),
    },
    orderBy: { name: "asc" },
  });
}

export async function getInventoryCategories(organizationId: string) {
  const rows = await db.inventoryItem.findMany({
    where: { organizationId },
    distinct: ["category"],
    select: { category: true },
    orderBy: { category: "asc" },
  });
  return rows.map((r) => r.category);
}
