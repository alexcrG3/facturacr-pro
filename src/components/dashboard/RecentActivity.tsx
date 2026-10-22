import { recentActivity, formatCRC } from "@/lib/mock-data";
import { StatusBadge } from "@/components/common/StatusBadge";
import { FileText, UserPlus, AlertTriangle } from "lucide-react";

const iconFor = (type: string) => {
  if (type === "factura") return FileText;
  if (type === "cliente") return UserPlus;
  return AlertTriangle;
};

export function RecentActivity() {
  return (
    <div className="rounded-xl border border-border bg-card shadow-soft">
      <div className="flex items-center justify-between border-b border-border px-5 py-4">
        <h3 className="text-sm font-semibold">Actividad reciente</h3>
        <button className="text-xs font-medium text-primary hover:underline">Ver todo</button>
      </div>
      <ul className="divide-y divide-border">
        {recentActivity.map((a) => {
          const Icon = iconFor(a.type);
          return (
            <li
              key={a.id}
              className="flex items-center gap-3 px-5 py-3.5 transition-colors hover:bg-muted/40"
            >
              <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-muted">
                <Icon className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{a.title}</p>
                {a.customer && (
                  <p className="truncate text-xs text-muted-foreground">{a.customer}</p>
                )}
              </div>
              <div className="hidden flex-col items-end gap-1 sm:flex">
                {a.amount !== null && (
                  <span className="text-sm font-medium tabular-nums">{formatCRC(a.amount)}</span>
                )}
                {a.status && <StatusBadge status={a.status} />}
              </div>
              <span className="hidden shrink-0 text-xs text-muted-foreground md:block">
                {a.time}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
