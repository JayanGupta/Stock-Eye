"use client";

import { useState, useMemo } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Info,
  Search,
  TrendingDown,
  XCircle,
} from "lucide-react";
import { formatCurrency, formatNumber } from "@/lib/format";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export type ForecastItem = {
  id: string;
  name: string;
  category: string;
  current_stock: number;
  unit_price: number;
  daily_demand: number;
  next_30_days: number;
  days_remaining: number;
  risk_level: "critical" | "warning" | "safe";
  recommended_restock: number;
  confidence: number;
  method: string;
  backtest: {
    mae: number;
    rmse: number;
    mape: number;
    improvement_pct: number;
    folds: number;
  } | null;
};

export type ForecastMeta = {
  model: string;
  items_ml: number;
  items_total: number;
  avg_improvement_pct: number;
  avg_mape: number | null;
  horizon_days?: number;
};

const RISK_CONFIG = {
  critical: {
    label: "Critical",
    icon: XCircle,
    className: "text-destructive border-destructive/30 bg-destructive/10",
  },
  warning: {
    label: "Warning",
    icon: AlertTriangle,
    className: "text-amber-400 border-amber-400/30 bg-amber-400/10",
  },
  safe: {
    label: "Safe",
    icon: CheckCircle2,
    className: "text-emerald-400 border-emerald-400/30 bg-emerald-400/10",
  },
} as const;

function RiskBadge({ level }: { level: "critical" | "warning" | "safe" }) {
  const cfg = RISK_CONFIG[level];
  const Icon = cfg.icon;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-medium ${cfg.className}`}
    >
      <Icon className="size-3" />
      {cfg.label}
    </span>
  );
}

function MethodBadge({ method }: { method: string }) {
  if (method === "gradient_boosting") {
    return (
      <Badge variant="secondary" className="text-xs">
        ML
      </Badge>
    );
  }
  if (method === "seasonal_baseline") {
    return (
      <Badge variant="outline" className="text-xs">
        Baseline
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="text-xs text-muted-foreground">
      Sparse
    </Badge>
  );
}

export function ForecastView({
  items,
  meta,
}: {
  items: ForecastItem[];
  meta: ForecastMeta | null;
}) {
  const [search, setSearch] = useState("");
  const [riskFilter, setRiskFilter] = useState<string>("");

  const filtered = useMemo(() => {
    let list = items;
    if (riskFilter) list = list.filter((i) => i.risk_level === riskFilter);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (i) =>
          i.name.toLowerCase().includes(q) ||
          i.category.toLowerCase().includes(q),
      );
    }
    return list;
  }, [items, search, riskFilter]);

  const counts = useMemo(
    () => ({
      critical: items.filter((i) => i.risk_level === "critical").length,
      warning: items.filter((i) => i.risk_level === "warning").length,
      safe: items.filter((i) => i.risk_level === "safe").length,
    }),
    [items],
  );

  return (
    <div className="space-y-6">
      {/* Model quality banner */}
      {meta && meta.items_total > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="pt-4 pb-4">
              <p className="text-xs text-muted-foreground">Items tracked</p>
              <p className="text-2xl font-bold tabular-nums">{meta.items_total}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {meta.items_ml} with ML model
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4">
              <p className="text-xs text-muted-foreground">Critical stock</p>
              <p className="text-2xl font-bold tabular-nums text-destructive">
                {counts.critical}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {counts.warning} warning
              </p>
            </CardContent>
          </Card>
          {meta.avg_mape !== null && (
            <Card>
              <CardContent className="pt-4 pb-4">
                <p className="text-xs text-muted-foreground">Avg forecast error</p>
                <p className="text-2xl font-bold tabular-nums">
                  {meta.avg_mape.toFixed(1)}%
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">MAPE (lower is better)</p>
              </CardContent>
            </Card>
          )}
          {meta.avg_improvement_pct > 0 && (
            <Card>
              <CardContent className="pt-4 pb-4">
                <p className="text-xs text-muted-foreground">vs naive baseline</p>
                <p className="text-2xl font-bold tabular-nums text-primary">
                  +{meta.avg_improvement_pct.toFixed(1)}%
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  avg improvement
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Filters */}
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
        <div className="flex gap-2">
          {(["", "critical", "warning", "safe"] as const).map((r) => (
            <Button
              key={r}
              size="sm"
              variant={riskFilter === r ? "default" : "outline"}
              onClick={() => setRiskFilter(r)}
            >
              {r === ""
                ? `All (${items.length})`
                : r === "critical"
                  ? `Critical (${counts.critical})`
                  : r === "warning"
                    ? `Warning (${counts.warning})`
                    : `Safe (${counts.safe})`}
            </Button>
          ))}
        </div>
      </div>

      {/* Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <TrendingDown className="size-4" />
            Demand Forecast
          </CardTitle>
          <CardDescription>
            90-day horizon · walk-forward backtested · sorted by risk
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item</TableHead>
                <TableHead>Category</TableHead>
                <TableHead className="text-right">Stock</TableHead>
                <TableHead className="text-right">Daily demand</TableHead>
                <TableHead className="text-right">Days left</TableHead>
                <TableHead className="text-right">Restock rec.</TableHead>
                <TableHead className="text-right">Confidence</TableHead>
                <TableHead>Model</TableHead>
                <TableHead>Risk</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.name}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {item.category}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatNumber(item.current_stock)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {item.daily_demand.toFixed(1)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {item.days_remaining === Infinity || item.days_remaining > 999
                      ? "∞"
                      : item.days_remaining.toFixed(0)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {item.recommended_restock > 0 ? (
                      <span className="font-medium text-amber-400">
                        +{formatNumber(item.recommended_restock)}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    <span
                      className={
                        item.confidence >= 70
                          ? "text-emerald-400"
                          : item.confidence >= 50
                            ? "text-amber-400"
                            : "text-muted-foreground"
                      }
                    >
                      {item.confidence.toFixed(0)}%
                    </span>
                  </TableCell>
                  <TableCell>
                    <MethodBadge method={item.method} />
                  </TableCell>
                  <TableCell>
                    <RiskBadge level={item.risk_level} />
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={9}
                    className="py-12 text-center text-muted-foreground"
                  >
                    {search || riskFilter
                      ? "No items match your filters."
                      : "No forecast data — add inventory items and sales history."}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {items.length > 0 && (
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Info className="size-3.5" />
          ML model requires 42+ days of sales history. Items below the threshold
          use a seasonal baseline.
        </p>
      )}
    </div>
  );
}
