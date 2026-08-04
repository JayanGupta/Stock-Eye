import { db } from "@/lib/db";

const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

export type DashboardStats = {
  totalItems: number;
  totalStock: number;
  revenue: number;
  unitsSold: number;
  wastageUnits: number;
  avgPrice: number;
  stockValue: number;
};

export type MonthlyPoint = {
  month: string;
  revenue: number;
  units: number;
};

export type CategoryPoint = {
  category: string;
  itemCount: number;
  stock: number;
  revenue: number;
};

export type TopItem = {
  id: string;
  name: string;
  category: string;
  quantitySold: number;
  revenue: number;
};

export async function getDashboardStats(
  organizationId: string,
): Promise<DashboardStats> {
  const [itemAgg, wasteAgg, sales] = await Promise.all([
    db.inventoryItem.aggregate({
      where: { organizationId },
      _sum: { quantity: true },
      _avg: { unitPrice: true },
      _count: true,
    }),
    db.inventoryTransaction.aggregate({
      where: { organizationId, type: "WASTE" },
      _sum: { quantity: true },
    }),
    db.saleItem.findMany({
      where: { organizationId },
      select: { quantity: true, unitPrice: true },
    }),
  ]);

  const items = await db.inventoryItem.findMany({
    where: { organizationId },
    select: { quantity: true, unitPrice: true },
  });

  const stockValue = items.reduce(
    (acc, it) => acc + it.quantity * Number(it.unitPrice),
    0,
  );
  const revenue = sales.reduce(
    (acc, s) => acc + Number(s.unitPrice) * s.quantity,
    0,
  );
  const unitsSold = sales.reduce((acc, s) => acc + s.quantity, 0);

  return {
    totalItems: itemAgg._count,
    totalStock: itemAgg._sum.quantity ?? 0,
    revenue: Math.round(revenue * 100) / 100,
    unitsSold,
    wastageUnits: wasteAgg._sum.quantity ?? 0,
    avgPrice: Number(itemAgg._avg.unitPrice ?? 0),
    stockValue: Math.round(stockValue * 100) / 100,
  };
}

export async function getMonthlyTrend(
  organizationId: string,
  months = 12,
): Promise<MonthlyPoint[]> {
  const start = new Date();
  start.setMonth(start.getMonth() - (months - 1));
  start.setDate(1);
  start.setHours(0, 0, 0, 0);

  const sales = await db.saleItem.findMany({
    where: { organizationId, soldAt: { gte: start } },
    select: { unitPrice: true, quantity: true, soldAt: true },
  });

  const bucket = new Map<string, { revenue: number; units: number }>();
  for (const s of sales) {
    const key = `${s.soldAt.getFullYear()}-${s.soldAt.getMonth()}`;
    const b = bucket.get(key) ?? { revenue: 0, units: 0 };
    b.revenue += Number(s.unitPrice) * s.quantity;
    b.units += s.quantity;
    bucket.set(key, b);
  }

  const now = new Date();
  const points: MonthlyPoint[] = [];
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    const b = bucket.get(key) ?? { revenue: 0, units: 0 };
    points.push({
      month: MONTH_NAMES[d.getMonth()],
      revenue: Math.round(b.revenue * 100) / 100,
      units: b.units,
    });
  }
  return points;
}

export async function getCategoryBreakdown(
  organizationId: string,
): Promise<CategoryPoint[]> {
  const items = await db.inventoryItem.findMany({
    where: { organizationId },
    select: {
      category: true,
      quantity: true,
      unitPrice: true,
      sales: { select: { quantity: true, unitPrice: true } },
    },
  });

  const map = new Map<
    string,
    { itemCount: number; stock: number; revenue: number }
  >();
  for (const it of items) {
    const b = map.get(it.category) ?? { itemCount: 0, stock: 0, revenue: 0 };
    b.itemCount += 1;
    b.stock += it.quantity;
    b.revenue += it.sales.reduce(
      (acc, s) => acc + Number(s.unitPrice) * s.quantity,
      0,
    );
    map.set(it.category, b);
  }

  return [...map.entries()]
    .map(([category, b]) => ({ category, ...b }))
    .sort((a, b) => b.revenue - a.revenue);
}

export async function getTopItems(
  organizationId: string,
  limit = 6,
): Promise<TopItem[]> {
  const items = await db.inventoryItem.findMany({
    where: { organizationId },
    select: {
      id: true,
      name: true,
      category: true,
      sales: { select: { quantity: true, unitPrice: true } },
    },
  });

  const ranked = items
    .map((it) => {
      const quantitySold = it.sales.reduce((acc, s) => acc + s.quantity, 0);
      const revenue = it.sales.reduce(
        (acc, s) => acc + Number(s.unitPrice) * s.quantity,
        0,
      );
      return { id: it.id, name: it.name, category: it.category, quantitySold, revenue };
    })
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, limit);

  return ranked;
}

export async function getAtRiskItems(
  organizationId: string,
): Promise<{ id: string; name: string; category: string; quantity: number; reorderPoint: number }[]> {
  const items = await db.inventoryItem.findMany({
    where: { organizationId },
    select: { id: true, name: true, category: true, quantity: true, reorderPoint: true },
  });
  return items
    .filter((it) => it.quantity <= it.reorderPoint)
    .sort((a, b) => a.quantity - b.quantity)
    .slice(0, 6);
}

export async function getExpiringItems(
  organizationId: string,
  days = 30,
): Promise<{ id: string; name: string; category: string; quantity: number; expiryDate: Date | null }[]> {
  const horizon = new Date(Date.now() + days * 86_400_000);
  return db.inventoryItem.findMany({
    where: { organizationId, expiryDate: { not: null, lte: horizon } },
    select: { id: true, name: true, category: true, quantity: true, expiryDate: true },
    orderBy: { expiryDate: "asc" },
    take: 6,
  });
}
