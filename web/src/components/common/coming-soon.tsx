import { Sparkles } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export function ComingSoon({
  title,
  description,
  feature,
}: {
  title: string;
  description: string;
  feature: string;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
      <Card>
        <CardContent className="flex flex-col items-center justify-center gap-3 py-16 text-center">
          <div className="flex size-12 items-center justify-center rounded-2xl border border-border bg-primary/10">
            <Sparkles className="size-6 text-primary" />
          </div>
          <h2 className="text-lg font-semibold">{feature}</h2>
          <p className="max-w-sm text-sm text-muted-foreground">
            This module is next in the build sequence. In the meantime, the rest
            of the workspace is fully operational.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
