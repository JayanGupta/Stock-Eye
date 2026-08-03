import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function KpiCard({
  label,
  value,
  sub,
  icon,
  accent,
  children,
}: {
  label: string;
  value?: string;
  sub?: string;
  icon?: React.ReactNode;
  accent?: "primary" | "success" | "warning" | "danger";
  children?: React.ReactNode;
}) {
  const accents: Record<string, string> = {
    primary: "text-primary",
    success: "text-emerald-400",
    warning: "text-amber-400",
    danger: "text-rose-400",
  };

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-4">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {label}
          </p>
          {icon ? (
            <div className={cn("shrink-0", accents[accent ?? "primary"])}>
              {icon}
            </div>
          ) : null}
        </div>
        {value !== undefined ? (
          <p className="mt-2 text-2xl font-semibold tracking-tight">{value}</p>
        ) : null}
        {children}
        {sub ? (
          <p className="mt-1 text-xs text-muted-foreground">{sub}</p>
        ) : null}
      </CardContent>
    </Card>
  );
}
