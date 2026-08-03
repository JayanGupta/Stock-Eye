import { WifiOff } from "lucide-react";
import { requireOrgUser } from "@/lib/auth-utils";
import { mlFetch, MLServiceError } from "@/lib/ml";
import { ForecastView, type ForecastItem, type ForecastMeta } from "@/components/forecast/forecast-view";
import { Card, CardContent } from "@/components/ui/card";

export default async function ForecastPage() {
  const { organizationId } = await requireOrgUser();

  let items: ForecastItem[] = [];
  let meta: ForecastMeta | null = null;
  let offlineError: string | null = null;

  try {
    const [rawItems, rawMeta] = await Promise.all([
      mlFetch(`/api/forecast?org=${encodeURIComponent(organizationId)}&limit=300`),
      mlFetch(`/api/forecast/meta?org=${encodeURIComponent(organizationId)}`),
    ]);
    items = rawItems as unknown as ForecastItem[];
    meta = rawMeta as unknown as ForecastMeta;
  } catch (err) {
    offlineError =
      err instanceof MLServiceError ? err.message : "ML service unavailable";
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Forecast</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          AI demand forecasting and restock recommendations, powered by gradient
          boosting with walk-forward backtesting.
        </p>
      </div>

      {offlineError ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
            <WifiOff className="size-8 text-muted-foreground" />
            <p className="text-sm font-medium">ML service offline</p>
            <p className="max-w-sm text-xs text-muted-foreground">{offlineError}</p>
            <p className="text-xs text-muted-foreground">
              Start it with{" "}
              <code className="rounded bg-muted px-1 py-0.5">pnpm ml:dev</code> and
              refresh.
            </p>
          </CardContent>
        </Card>
      ) : (
        <ForecastView items={items} meta={meta} />
      )}
    </div>
  );
}
