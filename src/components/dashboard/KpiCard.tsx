import { ArrowUpRight, ArrowDownRight, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function KpiCard({
  label,
  value,
  change,
  icon: Icon,
  accent = "primary",
}: {
  label: string;
  value: string;
  change?: number;
  icon: LucideIcon;
  accent?: "primary" | "success" | "warning" | "destructive";
}) {
  const accentMap = {
    primary: "bg-primary-soft text-primary",
    success: "bg-success-soft text-success",
    warning: "bg-warning-soft text-warning-foreground",
    destructive: "bg-destructive-soft text-destructive",
  };
  const positive = (change ?? 0) >= 0;

  return (
    <div className="group relative overflow-hidden rounded-xl border border-border bg-card p-5 shadow-soft transition-all hover:shadow-elevated">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {label}
          </p>
          <p className="mt-2 text-2xl font-semibold tracking-tight md:text-3xl">{value}</p>
        </div>
        <div className={cn("grid h-10 w-10 place-items-center rounded-lg", accentMap[accent])}>
          <Icon className="h-5 w-5" />
        </div>
      </div>

      {typeof change === "number" && (
        <div className="mt-4 flex items-center gap-1.5 text-xs">
          <span
            className={cn(
              "inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 font-medium",
              positive ? "bg-success-soft text-success" : "bg-destructive-soft text-destructive",
            )}
          >
            {positive ? (
              <ArrowUpRight className="h-3 w-3" />
            ) : (
              <ArrowDownRight className="h-3 w-3" />
            )}
            {Math.abs(change)}%
          </span>
          <span className="text-muted-foreground">vs. periodo anterior</span>
        </div>
      )}

      <div className="pointer-events-none absolute -right-12 -top-12 h-32 w-32 rounded-full bg-gradient-to-br from-primary/5 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
    </div>
  );
}
