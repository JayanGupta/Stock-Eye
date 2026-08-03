import { Package, Boxes, IndianRupee, Trash2, TrendingUp } from "lucide-react";
import { requireOrgUser } from "@/lib/auth-utils";
import {
  getAtRiskItems,
  getCategoryBreakdown,
  getDashboardStats,
  getExpiringItems,
  getMonthlyTrend,
  getTopItems,
} from "@/lib/queries/dashboard";
import { formatCurrency, formatNumber } from "@/lib/format";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { DashboardCharts } from "@/components/dashboard/charts-dynamic";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default async function DashboardPage() {
  const { organizationId, organizationName } = await requireOrgUser();

  const [stats, monthly, categories, topItems, atRisk, expiring] =
    await Promise.all([
      getDashboardStats(organizationId),
      getMonthlyTrend(organizationId),
      getCategoryBreakdown(organizationId),
      getTopItems(organizationId),
      getAtRiskItems(organizationId),
      getExpiringItems(organizationId),
    ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Operational overview for {organizationName}.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
        <KpiCard
          label="SKUs"
          value={formatNumber(stats.totalItems)}
          sub="Tracked items"
          icon={<Package className="size-4" />}
          accent="primary"
        />
        <KpiCard
          label="Stock Units"
          value={formatNumber(stats.totalStock)}
          sub={`Worth ${formatCurrency(stats.stockValue)}`}
          icon={<Boxes className="size-4" />}
          accent="success"
        />
        <KpiCard
          label="Revenue"
          value={formatCurrency(stats.revenue)}
          sub={`${formatNumber(stats.unitsSold)} units sold`}
          icon={<IndianRupee className="size-4" />}
          accent="primary"
        />
        <KpiCard
          label="Wastage"
          value={formatNumber(stats.wastageUnits)}
          sub="Units written off"
          icon={<Trash2 className="size-4" />}
          accent="danger"
        />
        <KpiCard
          label="At Risk"
          value={formatNumber(atRisk.length)}
          sub="Below reorder point"
          icon={<TrendingUp className="size-4" />}
          accent="warning"
        />
        <KpiCard
          label="Avg Price"
          value={formatCurrency(stats.avgPrice)}
          sub="Per unit"
          icon={<IndianRupee className="size-4" />}
        />
      </div>

      <DashboardCharts monthly={monthly} categories={categories} />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-sm">Top Sellers</CardTitle>
            <CardDescription>By revenue</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Units Sold</TableHead>
                  <TableHead className="text-right">Revenue</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topItems.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{item.category}</Badge>
                    </TableCell>
                    <TableCell className="text-right">{formatNumber(item.quantitySold)}</TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(item.revenue)}
                    </TableCell>
                  </TableRow>
                ))}
                {topItems.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">
                      No sales yet — get started by adding inventory.
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Needs Attention</CardTitle>
            <CardDescription>Low stock & expiring soon</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Low stock
              </p>
              <ul className="space-y-2">
                {atRisk.map((item) => (
                  <li key={item.id} className="flex items-center justify-between gap-2 text-sm">
                    <span className="truncate">{item.name}</span>
                    <Badge variant="destructive" className="shrink-0">
                      {item.quantity} left
                    </Badge>
                  </li>
                ))}
                {atRisk.length === 0 ? (
                  <li className="text-sm text-muted-foreground">All stocked up.</li>
                ) : null}
              </ul>
            </div>
            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Expiring soon
              </p>
              <ul className="space-y-2">
                {expiring.map((item) => (
                  <li key={item.id} className="flex items-center justify-between gap-2 text-sm">
                    <span className="truncate">{item.name}</span>
                    <span className="shrink-0 text-xs text-amber-400">
                      {item.expiryDate?.toLocaleDateString("en-IN", {
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                  </li>
                ))}
                {expiring.length === 0 ? (
                  <li className="text-sm text-muted-foreground">Nothing expiring.</li>
                ) : null}
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
