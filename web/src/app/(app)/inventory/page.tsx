import { Search } from "lucide-react";
import { requireOrgUser } from "@/lib/auth-utils";
import {
  getInventoryCategories,
  getInventoryList,
} from "@/lib/queries/inventory";
import { formatCurrency, formatNumber } from "@/lib/format";
import { AddItemDialog } from "@/components/inventory/add-item-dialog";
import { ItemRowActions } from "@/components/inventory/item-row-actions";
import { StockBadge } from "@/components/inventory/stock-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default async function InventoryPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string }>;
}) {
  const { organizationId } = await requireOrgUser();
  const { q = "", category = "" } = await searchParams;

  const [items, categories] = await Promise.all([
    getInventoryList(organizationId, { q, category }),
    getInventoryCategories(organizationId),
  ]);

  const lowCount = items.filter((i) => i.quantity <= i.reorderPoint).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Inventory</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {items.length} items
            {lowCount > 0 ? ` · ${lowCount} need attention` : ""}
          </p>
        </div>
        <AddItemDialog categories={categories} />
      </div>

      <form
        method="GET"
        className="flex flex-wrap items-center gap-3"
        role="search"
      >
        <div className="relative flex-1 min-w-52">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            name="q"
            defaultValue={q}
            placeholder="Search items…"
            className="pl-9"
          />
        </div>
        <select
          name="category"
          defaultValue={category}
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
        <Button type="submit" variant="secondary">
          Filter
        </Button>
        {(q || category) ? (
          <Button type="button" variant="ghost" asChild>
            <a href="/inventory">Clear</a>
          </Button>
        ) : null}
      </form>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Stock ledger</CardTitle>
          <CardDescription>Live quantities and reorder points</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>SKU</TableHead>
                <TableHead>Item</TableHead>
                <TableHead>Category</TableHead>
                <TableHead className="text-right">Qty</TableHead>
                <TableHead className="text-right">Price</TableHead>
                <TableHead className="text-right">Reorder at</TableHead>
                <TableHead>Expiry</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {item.sku ?? "—"}
                  </TableCell>
                  <TableCell className="font-medium">{item.name}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {item.category}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatNumber(item.quantity)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatCurrency(Number(item.unitPrice))}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-muted-foreground">
                    {item.reorderPoint}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {item.expiryDate
                      ? item.expiryDate.toLocaleDateString("en-IN", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })
                      : "—"}
                  </TableCell>
                  <TableCell>
                    <StockBadge
                      quantity={item.quantity}
                      reorderPoint={item.reorderPoint}
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <ItemRowActions itemId={item.id} />
                  </TableCell>
                </TableRow>
              ))}
              {items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="py-12 text-center text-muted-foreground">
                    {q || category
                      ? "No items match your filters."
                      : "No inventory yet. Add your first item to get started."}
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
