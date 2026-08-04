import { Boxes } from "lucide-react";
import { cn } from "@/lib/utils";

export function Logo({
  className,
  iconClassName,
}: {
  className?: string;
  iconClassName?: string;
}) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <div
        className={cn(
          "flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-[0_0_24px_oklch(0.62_0.16_235/0.45)]",
          iconClassName,
        )}
      >
        <Boxes className="size-5" />
      </div>
      <div className="flex flex-col leading-none">
        <span className="text-lg font-semibold tracking-tight">Stock-Eye</span>
        <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
          Warehouse AI
        </span>
      </div>
    </div>
  );
}
