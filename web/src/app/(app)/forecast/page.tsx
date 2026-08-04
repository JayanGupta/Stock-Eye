import { requireRole } from "@/lib/auth-utils";
import { VIEWER } from "@/lib/roles";
import { ForecastClient } from "@/components/forecast/forecast-client";

export const dynamic = "force-dynamic";

export default async function ForecastPage() {
  await requireRole(VIEWER);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Demand forecasting</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Machine-learning demand projections trained on your sales ledger,
          validated with walk-forward backtesting against a naive baseline.
        </p>
      </div>
      <ForecastClient />
    </div>
  );
}
