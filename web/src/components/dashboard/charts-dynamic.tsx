"use client";

import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";

const ChartGrid = dynamic(() => import("./chart-grid").then((m) => m.ChartGrid), {
  ssr: false,
  loading: () => (
    <div className="grid gap-4 lg:grid-cols-2">
      <Skeleton className="h-[340px]" />
      <Skeleton className="h-[340px]" />
    </div>
  ),
});

export function DashboardCharts({
  monthly,
  categories,
}: {
  monthly: { month: string; revenue: number; units: number }[];
  categories: { category: string; revenue: number }[];
}) {
  return <ChartGrid monthly={monthly} categories={categories} />;
}
