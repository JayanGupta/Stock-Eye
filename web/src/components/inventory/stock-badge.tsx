import { Badge } from "@/components/ui/badge";
import { stockStatus } from "@/lib/queries/inventory";

const VARIANTS = {
  ok: {
    label: "In stock",
    className: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
  },
  low: {
    label: "Low",
    className: "border-amber-500/30 bg-amber-500/10 text-amber-400",
  },
  out: {
    label: "Out of stock",
    className: "border-rose-500/30 bg-rose-500/10 text-rose-400",
  },
} as const;

export function StockBadge({
  quantity,
  reorderPoint,
}: {
  quantity: number;
  reorderPoint: number;
}) {
  const variant = VARIANTS[stockStatus(quantity, reorderPoint)];
  return (
    <Badge variant="outline" className={variant.className}>
      {variant.label}
    </Badge>
  );
}
