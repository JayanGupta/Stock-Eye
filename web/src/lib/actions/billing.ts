"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth-utils";
import { MANAGER } from "@/lib/roles";
import { mlFetch, MLServiceError } from "@/lib/ml";

const lineSchema = z.object({
  id: z.string().min(1),
  quantity: z.number().int().min(1).max(10000),
});

const saleSchema = z.object({
  customerName: z.string().trim().max(120).default("Walk-in customer"),
  items: z.array(lineSchema).min(1, "Cart is empty"),
});

export type SaleResult = {
  ok: boolean;
  error?: string;
  saleId?: string;
  total?: number;
  pdf?: { filename: string; pdfBase64: string } | null;
};

export async function createSaleAction(input: {
  customerName: string;
  items: { id: string; quantity: number }[];
}): Promise<SaleResult> {
  const { organizationId } = await requireRole(MANAGER);

  const parsed = saleSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const { customerName, items } = parsed.data;

  // Deduplicate lines while summing quantities.
  const lines = new Map<string, number>();
  for (const l of items) {
    lines.set(l.id, (lines.get(l.id) ?? 0) + l.quantity);
  }

  // Resolve items once (tenancy-scoped).
  const resolved = await db.inventoryItem.findMany({
    where: { id: { in: [...lines.keys()] }, organizationId },
  });
  if (resolved.length !== lines.size) {
    return { ok: false, error: "One or more items no longer exist" };
  }
  const byId = new Map(resolved.map((i) => [i.id, i]));

  let total = 0;
  for (const [id, qty] of lines) {
    const item = byId.get(id)!;
    if (item.quantity < qty) {
      return { ok: false, error: `Insufficient stock for ${item.name}` };
    }
    total += Number(item.unitPrice) * qty;
  }

  // Atomic ledger write-back.
  const saleId = await db.$transaction(async (tx) => {
    for (const [id, qty] of lines) {
      await tx.inventoryItem.update({
        where: { id },
        data: { quantity: { decrement: qty } },
      });
      await tx.inventoryTransaction.create({
        data: { organizationId, itemId: id, type: "SALE", quantity: qty, note: `POS sale to ${customerName}` },
      });
    }
    const first = [...lines.keys()][0];
    return `sale_${Date.now()}_${first.slice(0, 6)}`;
  });

  // Invoice generation (best-effort; the sale is already committed).
  let pdf: SaleResult["pdf"] = null;
  try {
    const res = await mlFetch("/api/billing/generate", {
      method: "POST",
      body: JSON.stringify({
        customer_name: customerName,
        items: [...lines.entries()].map(([id, qty]) => ({
          name: byId.get(id)!.name,
          sku: byId.get(id)!.sku ?? undefined,
          quantity: qty,
          price: Number(byId.get(id)!.unitPrice),
        })),
      }),
    });
    pdf = { filename: String(res.filename), pdfBase64: String(res.pdf_base64) };
  } catch (err) {
    if (err instanceof MLServiceError) {
      pdf = null;
    }
  }

  revalidatePath("/dashboard");
  revalidatePath("/inventory");
  revalidatePath("/billing");
  return { ok: true, saleId, total: Math.round(total * 100) / 100, pdf };
}
