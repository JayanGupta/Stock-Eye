"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  CategoryDonutChart,
  LegendList,
  RevenueTrendChart,
} from "@/components/dashboard/dashboard-charts";

export function ChartGrid({
  monthly,
  categories,
}: {
  monthly: { month: string; revenue: number; units: number }[];
  categories: { category: string; revenue: number }[];
}) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Revenue Trend</CardTitle>
          <CardDescription>Last 12 months</CardDescription>
        </CardHeader>
        <CardContent>
          <RevenueTrendChart data={monthly} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Revenue by Category</CardTitle>
          <CardDescription>Share of total revenue</CardDescription>
        </CardHeader>
        <CardContent>
          <CategoryDonutChart data={categories} />
          <div className="mt-4">
            <LegendList data={categories} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
