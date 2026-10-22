import { cn } from "@/lib/utils";
import type { InvoiceStatus } from "@/lib/mock-data";

const styles: Record<InvoiceStatus, string> = {
  borrador: "bg-muted text-muted-foreground",
  pendiente: "bg-warning-soft text-warning-foreground",
  enviada: "bg-primary-soft text-primary",
  aceptada: "bg-success-soft text-success",
  rechazada: "bg-destructive-soft text-destructive",
};

const dotStyles: Record<InvoiceStatus, string> = {
  borrador: "bg-muted-foreground",
  pendiente: "bg-warning",
  enviada: "bg-primary",
  aceptada: "bg-success",
  rechazada: "bg-destructive",
};

const labels: Record<InvoiceStatus, string> = {
  borrador: "Borrador",
  pendiente: "Pendiente",
  enviada: "Enviada",
  aceptada: "Aceptada",
  rechazada: "Rechazada",
};

export function StatusBadge({ status }: { status: InvoiceStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium",
        styles[status],
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", dotStyles[status])} />
      {labels[status]}
    </span>
  );
}
