"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth-utils";
import { MANAGER } from "@/lib/roles";
import { mlFetch } from "@/lib/ml";

const cartItemSchema = z.object({
  itemId: z.string(),
  name: z.string(),
  sku: z.string().nullable().optional(),
  quantity: z.number().int().positive(),
  unitPrice: z.number().positive(),
});

const completeSaleSchema = z.object({
  customerName: z.string().trim().min(1, "Customer name is required"),
  items: z.array(cartItemSchema).min(1, "Cart is empty"),
});

export type SaleResult = {
  error?: string;
  total?: number;
  pdfBase64?: string;
  pdfFilename?: string;
};

export async function completeSaleAction(
  formData: FormData,
): Promise<SaleResult> {
  const { organizationId } = await requireRole(MANAGER);

  let payload;
  try {
    const raw = JSON.parse(formData.get("payload") as string);
    payload = completeSaleSchema.parse(raw);
  } catch (err) {
    const msg = err instanceof z.ZodError ? err.issues[0]?.message : "Invalid cart data";
    return { error: msg ?? "Invalid cart data" };
  }

  const { customerName, items } = payload;

  const dbItems = await db.inventoryItem.findMany({
    where: { id: { in: items.map((i) => i.itemId) }, organizationId },
    select: { id: true, quantity: true, name: true },
  });

  for (const ci of items) {
    const dbItem = dbItems.find((d) => d.id === ci.itemId);
    if (!dbItem) return { error: `Item not found: ${ci.name}` };
    if (dbItem.quantity < ci.quantity) {
      return {
        error: `Insufficient stock for "${ci.name}" (have ${dbItem.quantity}, need ${ci.quantity})`,
      };
    }
  }

  let total = 0;
  await db.$transaction(async (tx) => {
    for (const ci of items) {
      total += ci.quantity * ci.unitPrice;

      await tx.saleItem.create({
        data: {
          organizationId,
          itemId: ci.itemId,
          quantity: ci.quantity,
          unitPrice: ci.unitPrice,
        },
      });

      await tx.inventoryItem.update({
        where: { id: ci.itemId },
        data: { quantity: { decrement: ci.quantity } },
      });

      await tx.inventoryTransaction.create({
        data: {
          organizationId,
          itemId: ci.itemId,
          type: "SALE",
          quantity: ci.quantity,
          note: `Sold to ${customerName}`,
        },
      });
    }
  });
  total = Math.round(total * 100) / 100;

  revalidatePath("/inventory");
  revalidatePath("/dashboard");

  // PDF invoice via ML service (best-effort)
  let pdfBase64: string | undefined;
  let pdfFilename: string | undefined;
  try {
    const result = await mlFetch("/api/billing/generate", {
      method: "POST",
      body: JSON.stringify({
        customer_name: customerName,
        items: items.map((i) => ({
          name: i.name,
          sku: i.sku ?? null,
          quantity: i.quantity,
          price: i.unitPrice,
        })),
      }),
    });
    pdfBase64 = result.pdf_base64 as string;
    pdfFilename = result.filename as string;
  } catch {
    // ML service offline — sale succeeded, PDF skipped
  }

  return { total, pdfBase64, pdfFilename };
}
