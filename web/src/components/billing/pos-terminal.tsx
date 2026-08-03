"use client";

import { useState, useTransition, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  Download,
  Loader2,
  Minus,
  Plus,
  Receipt,
  Search,
  ShoppingCart,
  Trash2,
  WifiOff,
} from "lucide-react";
import { completeSaleAction, type SaleResult } from "@/lib/actions/billing";
import { formatCurrency } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type ItemRow = {
  id: string;
  name: string;
  category: string;
  sku: string | null;
  quantity: number;
  unitPrice: number;
};

type CartItem = {
  itemId: string;
  name: string;
  sku: string | null;
  quantity: number;
  unitPrice: number;
};

export function PosTerminal({ items }: { items: ItemRow[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [cart, setCart] = useState<Map<string, CartItem>>(new Map());
  const [customerName, setCustomerName] = useState("");
  const [error, setError] = useState<string>();
  const [result, setResult] = useState<SaleResult>();

  const categories = useMemo(
    () => [...new Set(items.map((i) => i.category))].sort(),
    [items],
  );

  const filtered = useMemo(() => {
    let list = items.filter((i) => i.quantity > 0);
    if (category) list = list.filter((i) => i.category === category);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (i) =>
          i.name.toLowerCase().includes(q) ||
          (i.sku?.toLowerCase() ?? "").includes(q) ||
          i.category.toLowerCase().includes(q),
      );
    }
    return list;
  }, [items, search, category]);

  function addToCart(item: ItemRow) {
    setCart((prev) => {
      const next = new Map(prev);
      const existing = next.get(item.id);
      if (existing) {
        if (existing.quantity < item.quantity) {
          next.set(item.id, { ...existing, quantity: existing.quantity + 1 });
        }
      } else {
        next.set(item.id, {
          itemId: item.id,
          name: item.name,
          sku: item.sku,
          quantity: 1,
          unitPrice: item.unitPrice,
        });
      }
      return next;
    });
  }

  function updateQty(itemId: string, delta: number) {
    setCart((prev) => {
      const next = new Map(prev);
      const ci = next.get(itemId);
      if (!ci) return prev;
      const inv = items.find((i) => i.id === itemId);
      const newQty = ci.quantity + delta;
      if (newQty <= 0) {
        next.delete(itemId);
      } else if (!inv || newQty > inv.quantity) {
        // cap at available
      } else {
        next.set(itemId, { ...ci, quantity: newQty });
      }
      return next;
    });
  }

  function removeFromCart(itemId: string) {
    setCart((prev) => {
      const next = new Map(prev);
      next.delete(itemId);
      return next;
    });
  }

  const cartItems = [...cart.values()];
  const subtotal = cartItems.reduce((acc, ci) => acc + ci.quantity * ci.unitPrice, 0);
  const canSubmit = cartItems.length > 0 && customerName.trim().length > 0 && !isPending;

  function handleSubmit() {
    setError(undefined);
    const fd = new FormData();
    fd.set(
      "payload",
      JSON.stringify({ customerName: customerName.trim(), items: cartItems }),
    );
    startTransition(async () => {
      const res = await completeSaleAction(fd);
      if (res.error) {
        setError(res.error);
      } else {
        setResult(res);
        setCart(new Map());
        setCustomerName("");
        router.refresh();
      }
    });
  }

  function downloadPdf() {
    if (!result?.pdfBase64 || !result?.pdfFilename) return;
    const bytes = Uint8Array.from(atob(result.pdfBase64), (c) => c.charCodeAt(0));
    const blob = new Blob([bytes], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = result.pdfFilename;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (result && !error) {
    return (
      <Card className="mx-auto max-w-md">
        <CardContent className="flex flex-col items-center gap-4 py-14 text-center">
          <div className="flex size-14 items-center justify-center rounded-2xl border border-border bg-primary/10">
            <CheckCircle2 className="size-7 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Sale complete</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Total collected: {formatCurrency(result.total ?? 0)}
            </p>
          </div>
          {result.pdfBase64 ? (
            <Button onClick={downloadPdf}>
              <Download className="size-4" />
              Download Invoice PDF
            </Button>
          ) : (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <WifiOff className="size-3.5" />
              PDF skipped — ML service offline
            </div>
          )}
          <Button variant="outline" onClick={() => setResult(undefined)}>
            New sale
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
      {/* ── Item browser ── */}
      <div className="space-y-4">
        <div className="flex flex-wrap gap-3">
          <div className="relative min-w-48 flex-1">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search items…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
            aria-label="Filter by category"
          >
            <option value="">All categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((item) => {
            const inCart = cart.get(item.id)?.quantity ?? 0;
            const maxed = inCart >= item.quantity;
            return (
              <button
                key={item.id}
                onClick={() => addToCart(item)}
                disabled={maxed}
                className="flex items-start justify-between gap-2 rounded-lg border border-border bg-card p-3 text-left transition-colors hover:bg-accent/50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{item.name}</p>
                  <p className="text-xs text-muted-foreground">{item.category}</p>
                  {inCart > 0 && (
                    <Badge variant="secondary" className="mt-1 text-xs">
                      {inCart} in cart
                    </Badge>
                  )}
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-sm font-semibold">
                    {formatCurrency(item.unitPrice)}
                  </p>
                  <p className="text-xs text-muted-foreground">{item.quantity} left</p>
                </div>
              </button>
            );
          })}
          {filtered.length === 0 && (
            <p className="col-span-full py-10 text-center text-sm text-muted-foreground">
              {search || category
                ? "No items match your filters."
                : "No items with available stock."}
            </p>
          )}
        </div>
      </div>

      {/* ── Cart ── */}
      <div className="space-y-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <ShoppingCart className="size-4" />
              Cart
              {cartItems.length > 0 && (
                <Badge variant="secondary">{cartItems.length}</Badge>
              )}
            </CardTitle>
            <CardDescription>Customer details and line items</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="customer">Customer name</Label>
              <Input
                id="customer"
                placeholder="Walk-in customer"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
              />
            </div>

            {cartItems.length > 0 ? (
              <div className="space-y-2">
                {cartItems.map((ci) => {
                  const inv = items.find((i) => i.id === ci.itemId);
                  return (
                    <div
                      key={ci.itemId}
                      className="flex items-center gap-2 rounded-md border border-border p-2"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{ci.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatCurrency(ci.unitPrice)} each
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-7"
                          onClick={() => updateQty(ci.itemId, -1)}
                        >
                          <Minus className="size-3" />
                        </Button>
                        <span className="w-6 text-center text-sm tabular-nums">
                          {ci.quantity}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-7"
                          onClick={() => updateQty(ci.itemId, 1)}
                          disabled={ci.quantity >= (inv?.quantity ?? 0)}
                        >
                          <Plus className="size-3" />
                        </Button>
                      </div>
                      <p className="w-20 text-right text-sm font-medium tabular-nums">
                        {formatCurrency(ci.quantity * ci.unitPrice)}
                      </p>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-7 text-muted-foreground hover:text-destructive"
                        onClick={() => removeFromCart(ci.itemId)}
                      >
                        <Trash2 className="size-3" />
                      </Button>
                    </div>
                  );
                })}

                <div className="flex items-center justify-between border-t border-border pt-3">
                  <span className="text-sm font-medium">Total</span>
                  <span className="text-base font-bold tabular-nums">
                    {formatCurrency(subtotal)}
                  </span>
                </div>
              </div>
            ) : (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Click items on the left to add them.
              </p>
            )}

            {error && (
              <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                {error}
              </p>
            )}

            <Button className="w-full" disabled={!canSubmit} onClick={handleSubmit}>
              {isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Receipt className="size-4" />
              )}
              {isPending ? "Processing…" : "Complete Sale & Invoice"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
