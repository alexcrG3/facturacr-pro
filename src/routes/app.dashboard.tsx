import { createFileRoute, Link } from "@tanstack/react-router";
import { DollarSign, FileText, Users, Receipt, ArrowUpRight, Plus, PackageOpen, Building2 } from "lucide-react";
import { useState, useEffect } from "react";
import { PageHeader } from "@/components/common/PageHeader";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { StatusBadge } from "@/components/common/StatusBadge";
import { formatCRC } from "@/lib/mock-data";
import { supabase } from "@/lib/supabase";
import { useApp } from "@/contexts/AppContext";

export const Route = createFileRoute("/app/dashboard")({
  component: Dashboard,
});

function Dashboard() {
  const { activeEstablishment, isSuperAdmin } = useApp();
  const [invoices, setInvoices] = useState<any[]>([]);
  const [clientsCount, setClientsCount] = useState<number>(0);

  useEffect(() => {
    const loadData = async () => {
      if (!activeEstablishment?.id) {
        setInvoices([]);
        return;
      }
      try {
        const { data: invoiceData, error } = await supabase
          .from("invoices")
          .select("id, consecutive_number, issue_date, status, total, client_name, client_legal_id, establishment_id, app_name")
          .eq("establishment_id", activeEstablishment.id)
          .order("issue_date", { ascending: false });
        if (invoiceData) {
          setInvoices(invoiceData.map((row: any) => ({
            id: row.id,
            consecutiveNumber: row.consecutive_number,
            issueDate: row.issue_date,
            status: row.status,
            total: Number(row.total) || 0,
            client: { name: row.client_name || "Consumidor Final" },
          })));
        } else {
          setInvoices([]);
        }

        const uniqueClients = new Set(
          (invoiceData || [])
            .map((r: any) => r.client_legal_id || r.client_name)
            .filter((val: string) => val && val !== "Consumidor Final")
        );
        setClientsCount(uniqueClients.size);
      } catch {
        setInvoices([]);
        setClientsCount(0);
      }
    };

    loadData();
  }, [activeEstablishment]);


  const today = new Date().toISOString().slice(0, 10);
  const thisMonth = new Date().toISOString().slice(0, 7);

  const ventasHoy = invoices
    .filter((inv) => inv.issueDate?.slice(0, 10) === today && inv.status !== "rechazada")
    .reduce((s, inv) => s + (inv.total || 0), 0);

  const ventasMes = invoices
    .filter((inv) => inv.issueDate?.slice(0, 7) === thisMonth && inv.status !== "rechazada")
    .reduce((s, inv) => s + (inv.total || 0), 0);

  const facturasPendientes = invoices.filter(
    (inv) => inv.status === "borrador" || inv.status === "enviada"
  ).length;

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader
        title={activeEstablishment ? `Panel: ${activeEstablishment.app_name || activeEstablishment.name} 👋` : "Bienvenido a FacturaOS 👋"}
        description={
          activeEstablishment
            ? `Cédula: ${activeEstablishment.legal_id} · Actividad: ${activeEstablishment.economic_activity_code} · Operación comercial en tiempo real.`
            : "Aquí tienes el resumen en tiempo real de tu operación comercial."
        }
        actions={
          <div className="flex items-center gap-2">
            <Link
              to="/app/invoices/new"
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-2 text-xs font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 transition-all"
            >
              <Plus className="h-4 w-4" /> Nueva Factura
            </Link>
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Ventas hoy"
          value={formatCRC(ventasHoy)}
          change={ventasHoy > 0 ? 100 : undefined}
          icon={DollarSign}
          accent="primary"
        />
        <KpiCard
          label="Ventas del mes"
          value={formatCRC(ventasMes)}
          change={ventasMes > 0 ? 100 : undefined}
          icon={Receipt}
          accent="success"
        />
        <KpiCard
          label="Facturas pendientes"
          value={String(facturasPendientes)}
          icon={FileText}
          accent="warning"
        />
        <KpiCard
          label="Clientes activos"
          value={String(clientsCount)}
          icon={Users}
          accent="primary"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Resumen de Facturación */}
        <div className="lg:col-span-2 rounded-xl border border-border bg-card p-6 shadow-soft space-y-4">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div>
              <h3 className="text-sm font-bold text-foreground">Flujo de Facturación Semanal</h3>
              <p className="text-xs text-muted-foreground">Comportamiento de ventas autorizadas por Hacienda</p>
            </div>
            <span className="text-sm font-bold font-mono text-primary">{formatCRC(ventasMes)}</span>
          </div>

          {invoices.length === 0 ? (
            <div className="grid place-items-center py-12 text-center text-muted-foreground">
              <PackageOpen className="h-12 w-12 text-muted-foreground/30 mb-2" />
              <p className="text-xs font-medium">Aún no hay comprobantes emitidos en el periodo actual.</p>
              <p className="text-[11px] text-muted-foreground/70 mt-1">
                Tus ventas aparecerán aquí en tiempo real cuando emitas facturas o tiquetes electrónicos.
              </p>
            </div>
          ) : (
            <div className="space-y-2 py-4">
              <p className="text-xs font-medium text-foreground">Total de comprobantes registrados: {invoices.length}</p>
            </div>
          )}
        </div>

        {/* Productos más vendidos */}
        <div className="rounded-xl border border-border bg-card p-5 shadow-soft">
          <h3 className="text-sm font-semibold">Productos más vendidos</h3>
          <p className="text-xs text-muted-foreground">Últimos 30 días</p>
          <div className="mt-8 grid place-items-center py-6 text-center text-muted-foreground">
            <p className="text-xs font-medium">Sin ventas registradas en el catálogo</p>
            <p className="text-[11px] text-muted-foreground/70 mt-1">
              Las líneas de detalle facturadas se agruparán aquí automáticamente.
            </p>
          </div>
        </div>
      </div>

      {/* Actividad Reciente */}
      <div className="rounded-xl border border-border bg-card shadow-soft">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h3 className="text-sm font-semibold">Actividad reciente</h3>
          {invoices.length > 0 && (
            <Link to="/app/invoices" className="text-xs font-medium text-primary hover:underline">
              Ver todas ({invoices.length})
            </Link>
          )}
        </div>

        {invoices.length === 0 ? (
          <div className="py-10 text-center text-xs text-muted-foreground">
            No hay actividad reciente registrada en el sistema.
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {invoices.slice(0, 5).map((inv) => (
              <li key={inv.id} className="flex items-center justify-between px-5 py-3.5 hover:bg-muted/40 transition-colors text-xs">
                <div className="flex items-center gap-3">
                  <FileText className="h-4 w-4 text-primary" />
                  <div>
                    <span className="font-semibold text-foreground block">{inv.consecutiveNumber || inv.id}</span>
                    <span className="text-muted-foreground">{inv.client?.name || "Cliente Contado"}</span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-mono font-semibold">{formatCRC(inv.total || 0)}</span>
                  {inv.status && <StatusBadge status={inv.status} />}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
