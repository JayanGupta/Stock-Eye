"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { BrainCircuit, RefreshCw, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";

type Risk = "critical" | "warning" | "safe";

type ForecastItem = {
  id: string;
  name: string;
  category: string;
  current_stock: number;
  unit_price: number;
  daily_demand: number;
  next_30_days: number;
  next_90_days: number;
  days_remaining: number;
  risk_level: Risk;
  recommended_restock: number;
  confidence: number;
  method: string;
  backtest: {
    mae: number;
    naive_mae: number;
    wmape: number;
    naive_wmape: number;
    improvement_pct: number;
    folds: number;
  } | null;
  forecast_units: number[];
};

type ItemDetail = ForecastItem & {
  history: { date: string; units: number }[];
};

type Meta = {
  model: string;
  items_ml: number;
  items_total: number;
  avg_improvement_pct: number;
  avg_wmape: number | null;
  horizon_days?: number;
};

const RISK_STYLES: Record<Risk, string> = {
  critical: "bg-rose-500/15 text-rose-400 border-rose-500/30",
  warning: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  safe: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
};

const METHOD_LABEL: Record<string, string> = {
  gradient_boosting: "Gradient boosting",
  seasonal_baseline: "Seasonal baseline",
  insufficient_data: "Insufficient data",
};

export function ForecastClient() {
  const [items, setItems] = useState<ForecastItem[] | null>(null);
  const [meta, setMeta] = useState<Meta | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string | null>(null);
  const [detail, setDetail] = useState<ItemDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const fetchData = useCallback(async () => {
    const res = await fetch("/api/ml/forecast", { cache: "no-store" });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error ?? "Forecast failed");
    setItems(json.items as ForecastItem[]);
    setMeta(json.meta as Meta);
  }, []);

  useEffect(() => {
    let active = true;
    fetch("/api/ml/forecast", { cache: "no-store" })
      .then(async (res) => {
        const json = await res.json();
        if (!active) return;
        if (!res.ok) throw new Error(json.error ?? "Forecast failed");
        setItems(json.items as ForecastItem[]);
        setMeta(json.meta as Meta);
      })
      .catch((err) => {
        if (active) setError(err instanceof Error ? err.message : "Forecast failed");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const retry = () => {
    setLoading(true);
    setError(null);
    fetchData()
      .catch((err) => setError(err instanceof Error ? err.message : "Forecast failed"))
      .finally(() => setLoading(false));
  };

  const selectItem = useCallback(async (id: string) => {
    setSelected(id);
    setDetailLoading(true);
    setDetail(null);
    try {
      const res = await fetch(`/api/ml/forecast/${id}`, { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to load item forecast");
      setDetail(json as ItemDetail);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load forecast");
      setSelected(null);
    } finally {
      setDetailLoading(false);
    }
  }, []);

  const chartData = useCallback(() => {
    if (!detail) return [];
    type Point = { label: string; history: number | null; forecast: number | null };
    const history: Point[] = detail.history.slice(-120).map((h) => ({ label: h.date, history: h.units, forecast: null }));
    const lastDate = history.length ? new Date(history[history.length - 1].label) : new Date();
    const points = history.map((p) => ({ ...p }));
    for (let i = 0; i < detail.forecast_units.length; i++) {
      const d = new Date(lastDate);
      d.setDate(d.getDate() + (i + 1) * 7);
      points.push({
        label: d.toISOString().slice(0, 10),
        history: null,
        forecast: detail.forecast_units[i],
      });
    }
    return points;
  }, [detail]);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid gap-4 md:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center gap-4 py-16 text-center">
          <div className="flex size-12 items-center justify-center rounded-2xl border border-border bg-primary/10">
            <BrainCircuit className="size-6 text-primary" />
          </div>
          <div>
            <h2 className="font-semibold">ML service offline</h2>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">{error}</p>
          </div>
          <Button onClick={retry} variant="outline">
            <RefreshCw className="mr-2 size-4" />
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  const riskCounts = {
    critical: items?.filter((i) => i.risk_level === "critical").length ?? 0,
    warning: items?.filter((i) => i.risk_level === "warning").length ?? 0,
    safe: items?.filter((i) => i.risk_level === "safe").length ?? 0,
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <BrainCircuit className="size-4" />
              Model & coverage
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">
              {meta?.items_ml ?? 0}
              <span className="ml-1 text-sm font-normal text-muted-foreground">
                / {meta?.items_total ?? 0} items
              </span>
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {meta?.model === "gradient_boosting" ? "Gradient boosting (walk-forward)" : "Baseline models"} · {meta?.horizon_days ?? 90}-day horizon
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <TrendingUp className="size-4" />
              Backtest vs naive baseline
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">
              {meta?.avg_improvement_pct != null ? `${Math.max(0, meta.avg_improvement_pct).toFixed(1)}%` : "—"}
              <span className="ml-1 text-sm font-normal text-muted-foreground">MAE improvement</span>
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              avg WMAPE {meta?.avg_wmape != null ? `${meta.avg_wmape}%` : "—"} on held-out windows
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Risk distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4 text-sm">
              <Badge className={cn("gap-1.5", RISK_STYLES.critical)}>Critical {riskCounts.critical}</Badge>
              <Badge className={cn("gap-1.5", RISK_STYLES.warning)}>Warning {riskCounts.warning}</Badge>
              <Badge className={cn("gap-1.5", RISK_STYLES.safe)}>Safe {riskCounts.safe}</Badge>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Items at risk of stockout within 45 days.
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-5">
        <Card className="xl:col-span-3">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Per-item forecast</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead className="text-right">Stock</TableHead>
                  <TableHead className="text-right">Daily demand</TableHead>
                  <TableHead className="text-right">Next 30d</TableHead>
                  <TableHead className="text-right">Days left</TableHead>
                  <TableHead>Risk</TableHead>
                  <TableHead className="text-right">Restock</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(items ?? []).map((it) => (
                  <TableRow
                    key={it.id}
                    className={cn("cursor-pointer", selected === it.id && "bg-primary/5")}
                    onClick={() => selectItem(it.id)}
                  >
                    <TableCell>
                      <div className="font-medium">{it.name}</div>
                      <div className="text-xs text-muted-foreground">{it.category}</div>
                    </TableCell>
                    <TableCell className="text-right">{it.current_stock}</TableCell>
                    <TableCell className="text-right">{it.daily_demand.toFixed(1)}</TableCell>
                    <TableCell className="text-right">{Math.round(it.next_30_days)}</TableCell>
                    <TableCell className="text-right">
                      {it.days_remaining === Infinity ? "∞" : it.days_remaining.toFixed(0)}
                    </TableCell>
                    <TableCell>
                      <Badge className={cn("capitalize", RISK_STYLES[it.risk_level])}>
                        {it.risk_level}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {it.recommended_restock > 0 ? `+${it.recommended_restock}` : "—"}
                    </TableCell>
                  </TableRow>
                ))}
                {items && items.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                      No items to forecast.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card className="xl:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">
              {detail ? detail.name : "Item detail"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {detailLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-48" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            ) : detail ? (
              <div className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  <Badge className={cn("capitalize", RISK_STYLES[detail.risk_level])}>{detail.risk_level}</Badge>
                  <Badge variant="secondary">{METHOD_LABEL[detail.method] ?? detail.method}</Badge>
                  <Badge variant="outline">{detail.confidence.toFixed(0)}% confidence</Badge>
                </div>

                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="rounded-lg border border-border p-2">
                    <p className="text-lg font-semibold">{detail.current_stock}</p>
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Stock</p>
                  </div>
                  <div className="rounded-lg border border-border p-2">
                    <p className="text-lg font-semibold">{detail.daily_demand.toFixed(1)}</p>
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Daily demand</p>
                  </div>
                  <div className="rounded-lg border border-border p-2">
                    <p className="text-lg font-semibold">
                      {detail.days_remaining === Infinity ? "∞" : detail.days_remaining.toFixed(0)}
                    </p>
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Days left</p>
                  </div>
                </div>

                {detail.backtest && (
                  <div className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
                    Walk-forward backtest ({detail.backtest.folds} folds): MAE{" "}
                    <span className="font-medium text-foreground">{detail.backtest.mae}</span> vs naive{" "}
                    {detail.backtest.naive_mae} · WMAPE{" "}
                    <span className="font-medium text-foreground">{detail.backtest.wmape}%</span>
                  </div>
                )}

                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData()} margin={{ top: 4, right: 4, bottom: 0, left: -18 }}>
                      <defs>
                        <linearGradient id="hist" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.35} />
                          <stop offset="95%" stopColor="#22d3ee" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="fc" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#a78bfa" stopOpacity={0.5} />
                          <stop offset="95%" stopColor="#a78bfa" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid stroke="rgba(148,163,184,0.12)" vertical={false} />
                      <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#94a3b8" }} tickLine={false} axisLine={false} minTickGap={32} />
                      <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} tickLine={false} axisLine={false} allowDecimals={false} />
                      <Tooltip
                        contentStyle={{ background: "#0b0f19", border: "1px solid #1e293b", borderRadius: 8, fontSize: 12 }}
                        labelStyle={{ color: "#94a3b8" }}
                      />
                      <Area type="monotone" dataKey="history" name="Actual" stroke="#22d3ee" strokeWidth={1.5} fill="url(#hist)" connectNulls />
                      <Area type="monotone" dataKey="forecast" name="Forecast" stroke="#a78bfa" strokeWidth={1.5} strokeDasharray="5 4" fill="url(#fc)" connectNulls />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
                <Separator />
                <p className="text-xs text-muted-foreground">
                  Recommended restock:{" "}
                  <span className="font-semibold text-foreground">
                    {detail.recommended_restock > 0 ? `+${detail.recommended_restock} units` : "none needed"}
                  </span>{" "}
                  to cover projected {Math.round(detail.next_90_days)}-unit demand over the next 90 days.
                </p>
              </div>
            ) : (
              <p className="flex h-64 items-center justify-center text-center text-sm text-muted-foreground">
                Select an item to view its forecast, historical sales and backtest quality.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
