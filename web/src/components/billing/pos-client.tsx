"use client";

import { useMemo, useState, useTransition } from "react";
import { Download, Minus, Plus, Printer, Search, ShoppingCart, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { createSaleAction, type SaleResult } from "@/lib/actions/billing";

export type PosItem = {
  id: string;
  name: string;
  sku: string | null;
  category: string;
  quantity: number;
  unitPrice: { toString(): string } | number;
};

type CartLine = { id: string; quantity: number };

const money = (n: number) => `$${n.toFixed(2)}`;

export function PosClient({ items }: { items: PosItem[] }) {
  const [query, setQuery] = useState("");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [customer, setCustomer] = useState("Walk-in customer");
  const [invoice, setInvoice] = useState<SaleResult | null>(null);
  const [isPending, startTransition] = useTransition();

  const byId = useMemo(() => new Map(items.map((i) => [i.id, i])), [items]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (i) =>
        i.name.toLowerCase().includes(q) ||
        (i.sku?.toLowerCase() ?? "").includes(q) ||
        i.category.toLowerCase().includes(q),
    );
  }, [items, query]);

  const cartLines = cart
    .map((l) => ({ line: l, item: byId.get(l.id) }))
    .filter((l): l is { line: CartLine; item: PosItem } => Boolean(l.item));

  const subtotal = cartLines.reduce((acc, { line, item }) => acc + Number(item.unitPrice) * line.quantity, 0);
  const totalUnits = cartLines.reduce((acc, { line }) => acc + line.quantity, 0);

  const addToCart = (id: string) => {
    const item = byId.get(id);
    if (!item || item.quantity <= 0) {
      toast.error(`${item?.name ?? "Item"} is out of stock`);
      return;
    }
    setCart((prev) => {
      const existing = prev.find((l) => l.id === id);
      if (existing) {
        if (existing.quantity >= item.quantity) {
          toast.error(`Only ${item.quantity} in stock`);
          return prev;
        }
        return prev.map((l) => (l.id === id ? { ...l, quantity: l.quantity + 1 } : l));
      }
      return [...prev, { id, quantity: 1 }];
    });
  };

  const setQty = (id: string, qty: number) => {
    const item = byId.get(id);
    if (!item) return;
    const next = Math.max(0, Math.min(qty, item.quantity));
    setCart((prev) =>
      next === 0
        ? prev.filter((l) => l.id !== id)
        : prev.map((l) => (l.id === id ? { ...l, quantity: next } : l)),
    );
  };

  const checkout = () => {
    if (cartLines.length === 0) {
      toast.error("Cart is empty");
      return;
    }
    startTransition(async () => {
      const res = await createSaleAction({
        customerName: customer.trim() || "Walk-in customer",
        items: cart.map((l) => ({ id: l.id, quantity: l.quantity })),
      });
      if (!res.ok) {
        toast.error(res.error ?? "Sale failed");
        return;
      }
      setInvoice(res);
      setCart([]);
      setCustomer("Walk-in customer");
      toast.success(`Sale completed · ${money(res.total ?? 0)}`);
    });
  };

  const downloadPdf = () => {
    if (!invoice?.pdf) return;
    const bytes = Uint8Array.from(atob(invoice.pdf.pdfBase64), (c) => c.charCodeAt(0));
    const blob = new Blob([bytes], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = invoice.pdf.filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const printPdf = () => {
    if (!invoice?.pdf) return;
    const bytes = Uint8Array.from(atob(invoice.pdf.pdfBase64), (c) => c.charCodeAt(0));
    const blob = new Blob([bytes], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank", "noopener,noreferrer");
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  };

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <div className="lg:col-span-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Products</CardTitle>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by name, SKU or category…"
                className="pl-9"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid max-h-[540px] grid-cols-2 gap-3 overflow-y-auto pr-1 md:grid-cols-3">
              {filtered.map((item) => {
                const out = item.quantity <= 0;
                const inCart = cart.find((l) => l.id === item.id);
                return (
                  <button
                    key={item.id}
                    disabled={out}
                    onClick={() => addToCart(item.id)}
                    className={cn(
                      "flex flex-col items-start gap-1 rounded-xl border border-border p-3 text-left transition-colors",
                      out
                        ? "cursor-not-allowed opacity-40"
                        : "hover:border-primary/50 hover:bg-primary/5",
                    )}
                  >
                    <div className="flex w-full items-start justify-between gap-2">
                      <span className="line-clamp-2 text-sm font-medium">{item.name}</span>
                      {inCart && (
                        <Badge variant="secondary" className="shrink-0">
                          {inCart.quantity}
                        </Badge>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground">{item.category}</span>
                    <div className="mt-auto flex w-full items-center justify-between">
                      <span className="font-semibold">{money(Number(item.unitPrice))}</span>
                      <span className={cn("text-xs", out ? "text-destructive" : "text-muted-foreground")}>
                        {out ? "Out" : `${item.quantity} in stock`}
                      </span>
                    </div>
                  </button>
                );
              })}
              {filtered.length === 0 && (
                <p className="col-span-full py-10 text-center text-sm text-muted-foreground">
                  No products match “{query}”.
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div>
        <Card className="sticky top-20">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <ShoppingCart className="size-4" />
              Current sale
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="customer">Customer</Label>
              <Input id="customer" value={customer} onChange={(e) => setCustomer(e.target.value)} />
            </div>

            <Separator />

            <div className="max-h-64 space-y-2 overflow-y-auto pr-1">
              {cartLines.length === 0 && (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  Add products to start a sale.
                </p>
              )}
              {cartLines.map(({ line, item }) => (
                <div key={line.id} className="flex items-center gap-2 rounded-lg border border-border p-2">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{item.name}</p>
                    <p className="text-xs text-muted-foreground">{money(Number(item.unitPrice))} each</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="size-7" onClick={() => setQty(line.id, line.quantity - 1)}>
                      <Minus className="size-3.5" />
                    </Button>
                    <span className="w-7 text-center text-sm tabular-nums">{line.quantity}</span>
                    <Button variant="ghost" size="icon" className="size-7" onClick={() => setQty(line.id, line.quantity + 1)}>
                      <Plus className="size-3.5" />
                    </Button>
                  </div>
                  <span className="w-16 text-right text-sm font-medium tabular-nums">
                    {money(Number(item.unitPrice) * line.quantity)}
                  </span>
                  <Button variant="ghost" size="icon" className="size-7 text-muted-foreground" onClick={() => setQty(line.id, 0)}>
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              ))}
            </div>

            <Separator />

            <div className="space-y-1 text-sm">
              <div className="flex justify-between text-muted-foreground">
                <span>Items</span>
                <span>{totalUnits}</span>
              </div>
              <div className="flex justify-between text-lg font-semibold">
                <span>Total</span>
                <span className="tabular-nums">{money(subtotal)}</span>
              </div>
            </div>

            <Button className="w-full" size="lg" disabled={isPending || cartLines.length === 0} onClick={checkout}>
              {isPending ? (
                <>
                  <Skeleton className="mr-2 size-4 rounded-full" />
                  Processing…
                </>
              ) : (
                <>
                  <ShoppingCart className="mr-2 size-4" />
                  Complete sale · {money(subtotal)}
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>

      <Dialog open={Boolean(invoice?.ok)} onOpenChange={(open) => !open && setInvoice(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Badge variant="secondary" className="size-6 justify-center rounded-full p-0">
                ✓
              </Badge>
              Sale completed
            </DialogTitle>
            <DialogDescription>
              {invoice?.saleId} · {money(invoice?.total ?? 0)} total
            </DialogDescription>
          </DialogHeader>

          <div className="rounded-xl border border-border bg-muted/40 p-4 text-sm">
            <p className="font-medium">Inventory updated</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Stock levels were decremented and the sale was written to the ledger. The
              dashboard and forecasting model will reflect it on the next load.
            </p>
          </div>

          {invoice?.pdf ? (
            <div className="flex gap-2">
              <Button className="flex-1" onClick={downloadPdf}>
                <Download className="mr-2 size-4" />
                Download invoice
              </Button>
              <Button variant="outline" onClick={printPdf}>
                <Printer className="mr-2 size-4" />
                Open
              </Button>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              Invoice PDF unavailable (ML service offline) — the sale was still recorded.
            </p>
          )}

          <Button variant="ghost" onClick={() => setInvoice(null)}>
            <X className="mr-2 size-4" />
            Close
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
