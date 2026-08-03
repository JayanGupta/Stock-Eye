"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth-utils";
import { ADMIN } from "@/lib/roles";

const createItemSchema = z.object({
  name: z.string().trim().min(1, "Item name is required"),
  category: z.string().trim().min(1, "Category is required"),
  sku: z.string().trim().optional(),
  quantity: z.coerce.number().int().min(0).default(0),
  unitPrice: z.coerce.number().min(0).default(0),
  reorderPoint: z.coerce.number().int().min(0).default(0),
  safetyStock: z.coerce.number().int().min(0).default(0),
  expiryDate: z.string().optional(),
});

export async function createItemAction(
  _prev: { error?: string },
  formData: FormData,
): Promise<{ error?: string }> {
  const { organizationId } = await requireRole(ADMIN);

  const parsed = createItemSchema.safeParse({
    name: formData.get("name"),
    category: formData.get("category"),
    sku: formData.get("sku") || undefined,
    quantity: formData.get("quantity") ?? 0,
    unitPrice: formData.get("unitPrice") ?? 0,
    reorderPoint: formData.get("reorderPoint") ?? 0,
    safetyStock: formData.get("safetyStock") ?? 0,
    expiryDate: formData.get("expiryDate") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const data = parsed.data;

  await db.$transaction(async (tx) => {
    const item = await tx.inventoryItem.create({
      data: {
        organizationId,
        name: data.name,
        category: data.category,
        sku: data.sku || null,
        quantity: data.quantity,
        unitPrice: data.unitPrice,
        reorderPoint: data.reorderPoint,
        safetyStock: data.safetyStock,
        expiryDate: data.expiryDate ? new Date(data.expiryDate) : null,
      },
    });

    if (data.quantity > 0) {
      await tx.inventoryTransaction.create({
        data: {
          organizationId,
          itemId: item.id,
          type: "RESTOCK",
          quantity: data.quantity,
          note: "Initial stock",
        },
      });
    }
  });

  revalidatePath("/inventory");
  revalidatePath("/dashboard");
  return {};
}

export async function deleteItemAction(itemId: string): Promise<{ error?: string }> {
  const { organizationId } = await requireRole(ADMIN);

  const item = await db.inventoryItem.findFirst({
    where: { id: itemId, organizationId },
  });
  if (!item) return { error: "Item not found" };

  await db.inventoryItem.delete({ where: { id: itemId } });

  revalidatePath("/inventory");
  revalidatePath("/dashboard");
  return {};
}

export async function adjustStockAction(
  itemId: string,
  quantity: number,
  type: "RESTOCK" | "WASTE" | "ADJUSTMENT" | "RETURN",
): Promise<{ error?: string }> {
  const { organizationId } = await requireRole(ADMIN);

  const item = await db.inventoryItem.findFirst({
    where: { id: itemId, organizationId },
  });
  if (!item) return { error: "Item not found" };

  const delta =
    type === "RESTOCK" || type === "RETURN" ? quantity : -Math.abs(quantity);
  const newQuantity = Math.max(0, item.quantity + delta);
  const applied = newQuantity - item.quantity;

  await db.$transaction(async (tx) => {
    await tx.inventoryItem.update({
      where: { id: itemId },
      data: { quantity: newQuantity },
    });
    await tx.inventoryTransaction.create({
      data: {
        organizationId,
        itemId,
        type,
        quantity: Math.abs(applied),
        note: "Manual adjustment",
      },
    });
  });

  revalidatePath("/inventory");
  revalidatePath("/dashboard");
  return {};
}
