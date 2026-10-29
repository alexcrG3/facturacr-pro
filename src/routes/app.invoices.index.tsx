import { createFileRoute, Link } from "@tanstack/react-router";
import { Plus, Search, Filter, Download, FileCode, Copy, Check, X, FileText, Eye, Edit3 } from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { PageHeader } from "@/components/common/PageHeader";
import { StatusBadge } from "@/components/common/StatusBadge";
import { formatCRC } from "@/lib/mock-data";
import {
  InvoiceDossierModal,
  type InvoiceDossierItem,
} from "@/components/invoices/InvoiceDossierModal";
import { supabase } from "@/lib/supabase";
import { useApp } from "@/contexts/AppContext";

export const Route = createFileRoute("/app/invoices/")({
  validateSearch: (search: Record<string, unknown>): { docType?: string } => ({
    docType: typeof search.docType === "string" ? search.docType : undefined,
  }),
  component: InvoicesPage,
});

function InvoicesPage() {
  const { activeEstablishment } = useApp();
  const search = Route.useSearch();
  const docFilter = search.docType; // "facturas" | "notas" | "tiquetes" | undefined
  const [activeTab, setActiveTab] = useState("todas");
  const [searchQuery, setSearchQuery] = useState("");
  const [copiedClave, setCopiedClave] = useState<string | null>(null);
  const [selectedDossierInvoice, setSelectedDossierInvoice] = useState<InvoiceDossierItem | null>(
    null,
  );
  const [invoicesList, setInvoicesList] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const loadInvoices = async () => {
    if (!activeEstablishment?.id) {
      setInvoicesList([]);
      return;
    }
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("invoices")
        .select("*")
        .eq("establishment_id", activeEstablishment.id)
        .order("issue_date", { ascending: false });
      if (error) throw error;
      const mapped = (data || []).map((row: any) => {
        const consec = row.consecutive_number || "";
        let docType = "FE";
        if (consec.startsWith("NC-") || consec.substring(8, 10) === "03") {
          docType = "NC";
        } else if (consec.startsWith("ND-") || consec.substring(8, 10) === "02") {
          docType = "ND";
        } else if (consec.startsWith("TE-") || consec.substring(8, 10) === "04") {
          docType = "TE";
        }
        const rawStatus = (row.status || "").toLowerCase();
        const normStatus: InvoiceDossierItem["status"] =
          rawStatus.includes("aceptad") ? "aceptada" :
          rawStatus.includes("rechazad") ? "rechazada" :
          rawStatus.includes("enviad") || rawStatus.includes("recibid") ? "enviada" :
          rawStatus.includes("pendient") || rawStatus.includes("procesand") ? "pendiente" : "aceptada";

        return {
          id: row.id,
          clave: row.clave || "",
          haciendaKey: row.clave || "",
          number: row.consecutive_number || "",
          date: row.issue_date,
          issueDate: row.issue_date,
          status: normStatus,
          type: docType,
          total: Number(row.total) || 0,
          client: { name: row.client_name || "Consumidor Final", legalId: row.client_legal_id || "" },
          items: row.items || [],
          appName: row.app_name,
        };
      });
      setInvoicesList(mapped);
    } catch (err) {
      console.error("Error cargando facturas de Supabase:", err);
      setInvoicesList([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInvoiceStatusChange = async (id: string, newStatus: InvoiceDossierItem["status"]) => {
    setInvoicesList((prev) =>
      prev.map((inv) => (inv.id === id ? { ...inv, status: newStatus as any } : inv)),
    );
    await supabase.from("invoices").update({ status: newStatus }).eq("id", id);
  };

  useEffect(() => {
    loadInvoices();
    window.addEventListener("focus", loadInvoices);
    return () => window.removeEventListener("focus", loadInvoices);
  }, [activeEstablishment]);

  const baseInvoices = useMemo(() => {
    return invoicesList.filter((i: any) => {
      if (docFilter === "notas") {
        return i.type === "NC" || i.type === "ND" || i.number?.startsWith("NC") || i.number?.startsWith("ND");
      }
      if (docFilter === "tiquetes") {
        return i.type === "TE" || i.number?.startsWith("TE");
      }
      if (docFilter === "facturas") {
        return i.type === "FE" || i.number?.startsWith("FE");
      }
      return true;
    });
  }, [invoicesList, docFilter]);

  const tabs = [
    { id: "todas", label: "Todas", count: baseInvoices.length },
    {
      id: "aceptadas",
      label: "Aceptadas por Hacienda",
      count: baseInvoices.filter((i: any) => i.status === "aceptada").length,
    },
    {
      id: "pendientes",
      label: "En proceso / Enviando",
      count: baseInvoices.filter((i: any) => i.status === "pendiente").length,
    },
    {
      id: "rechazadas",
      label: "Rechazadas",
      count: baseInvoices.filter((i: any) => i.status === "rechazada").length,
    },
    {
      id: "borradores",
      label: "Borradores",
      count: baseInvoices.filter((i: any) => i.status === "borrador").length,
    },
  ];

  const filteredInvoices = baseInvoices.filter((i: any) => {
    const matchesTab =
      activeTab === "todas"
        ? true
        : activeTab === "aceptadas"
          ? i.status === "aceptada"
          : activeTab === "pendientes"
            ? i.status === "pendiente"
            : activeTab === "rechazadas"
              ? i.status === "rechazada"
              : activeTab === "borradores"
                ? i.status === "borrador"
                : true;

    if (!matchesTab) return false;

    if (!searchQuery.trim()) return true;

    const q = searchQuery.toLowerCase().trim();
    return (
      i.number.toLowerCase().includes(q) ||
      (i.haciendaKey && i.haciendaKey.toLowerCase().includes(q)) ||
      (i.client?.name && i.client.name.toLowerCase().includes(q)) ||
      (i.client?.email && i.client.email.toLowerCase().includes(q))
    );
  });

  const handleCopyClave = (clave: string) => {
    navigator.clipboard.writeText(clave);
    setCopiedClave(clave);
    setTimeout(() => setCopiedClave(null), 2000);
  };

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title={
          docFilter === "notas"
            ? "Notas de Crédito y Débito"
            : docFilter === "tiquetes"
              ? "Tiquetes Electrónicos"
              : "Facturas Electrónicas"
        }
        description={
          docFilter === "notas"
            ? "Gestión de notas de crédito y débito electrónicas vinculadas a facturas previas ante Hacienda (v4.4 v2)."
            : docFilter === "tiquetes"
              ? "Gestión y emisión de tiquetes electrónicos para consumidor final (v4.4 v2)."
              : "Gestión y emisión de comprobantes autorizados por el Ministerio de Hacienda (v4.4 v2)."
        }
        actions={
          <>
            <button className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium hover:bg-muted">
              <Download className="h-4 w-4" /> Exportar reporte
            </button>
            {docFilter === "notas" ? (
              <div className="flex items-center gap-2">
                <Link
                  to="/app/invoices/new"
                  search={{ type: "03" } as any}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-amber-600 px-3.5 py-2 text-sm font-medium text-white hover:bg-amber-700 shadow-sm"
                >
                  <Plus className="h-4 w-4" /> Nueva Nota de Crédito
                </Link>
                <Link
                  to="/app/invoices/new"
                  search={{ type: "02" } as any}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-2 text-sm font-medium text-primary-foreground hover:shadow-glow"
                >
                  <Plus className="h-4 w-4" /> Nueva Nota de Débito
                </Link>
              </div>
            ) : docFilter === "tiquetes" ? (
              <Link
                to="/app/invoices/new"
                search={{ type: "04" } as any}
                className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-2 text-sm font-medium text-white hover:bg-emerald-700 shadow-sm"
              >
                <Plus className="h-4 w-4" /> Nuevo Tiquete
              </Link>
            ) : (
              <Link
                to="/app/invoices/new"
                search={{ type: "01" } as any}
                className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-2 text-sm font-medium text-primary-foreground hover:shadow-glow"
              >
                <Plus className="h-4 w-4" /> Nueva factura
              </Link>
            )}
          </>
        }
      />

      <div className="rounded-xl border border-border bg-card shadow-soft">
        <div className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-3">
          <div className="flex flex-wrap gap-1">
            {tabs.map((t) => {
              const active = activeTab === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setActiveTab(t.id)}
                  className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                    active
                      ? "bg-primary-soft text-primary font-semibold"
                      : "text-muted-foreground hover:bg-muted"
                  }`}
                >
                  {t.label}
                  <span
                    className={`rounded px-1.5 text-[10px] ${active ? "bg-primary/20 text-primary" : "bg-muted"}`}
                  >
                    {t.count}
                  </span>
                </button>
              );
            })}
          </div>
          <div className="ml-auto flex items-center gap-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar clave o cliente…"
                className="h-9 w-48 rounded-md border border-border bg-background pl-8 pr-3 text-xs focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20"
              />
            </div>
            <button className="grid h-9 w-9 place-items-center rounded-md border border-border hover:bg-muted">
              <Filter className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-5 py-3 text-left font-medium">Consecutivo</th>
                <th className="px-5 py-3 text-left font-medium">Clave Hacienda (50 dígitos)</th>
                <th className="px-5 py-3 text-left font-medium">Cliente</th>
                <th className="px-5 py-3 text-left font-medium">Tipo</th>
                <th className="px-5 py-3 text-left font-medium">Estado Hacienda</th>
                <th className="px-5 py-3 text-right font-medium">Total</th>
                <th className="px-5 py-3 text-center font-medium">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center text-muted-foreground">
                    <FileText className="mx-auto h-10 w-10 text-muted-foreground/30 mb-3" />
                    <p className="text-sm font-semibold text-foreground">
                      No hay {docFilter === "notas" ? "notas de crédito ni de débito" : docFilter === "tiquetes" ? "tiquetes electrónicos" : "facturas"} registradas
                    </p>
                    <p className="text-xs text-muted-foreground/80 mt-1 max-w-md mx-auto">
                      {activeEstablishment?.name || "Esta empresa"} no cuenta con documentos en esta sección. Cada comprobante emitido se reflejará aquí en tiempo real y aislado exclusivamente para este negocio.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredInvoices.map((inv) => {
                  const isCopied = copiedClave === inv.haciendaKey;
                  return (
                    <tr
                      key={inv.id}
                      onClick={() =>
                        setSelectedDossierInvoice({
                        ...inv,
                        clave: inv.clave || inv.haciendaKey,
                        haciendaKey: inv.haciendaKey || inv.clave,
                        items: inv.items,
                        appName: inv.appName,
                      })
                    }
                    className="cursor-pointer transition-colors hover:bg-muted/40"
                  >
                    <td className="px-5 py-3.5 font-mono text-xs font-semibold text-foreground">
                      {inv.number}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-1.5 font-mono text-[11px] text-muted-foreground">
                        <span className="max-w-[170px] truncate" title={inv.haciendaKey}>
                          {inv.haciendaKey || "506290826003101483899000010000201..."}
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCopyClave(inv.haciendaKey || "");
                          }}
                          className="rounded p-1 hover:bg-muted hover:text-foreground text-muted-foreground"
                          title="Copiar clave numérica"
                        >
                          {isCopied ? (
                            <Check className="h-3 w-3 text-emerald-500" />
                          ) : (
                            <Copy className="h-3 w-3" />
                          )}
                        </button>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="font-medium text-foreground">
                        {typeof inv.client === "string" ? inv.client : inv.client?.name}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {typeof inv.client === "string"
                          ? "cliente@empresa.cr"
                          : inv.client?.email || "cliente@empresa.cr"}
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <span
                        className={`rounded-md border px-2 py-0.5 font-mono text-xs font-semibold ${
                          inv.type === "FE"
                            ? "border-primary/30 bg-primary/10 text-primary"
                            : inv.type === "TE"
                              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                              : inv.type === "NC"
                                ? "border-amber-500/30 bg-amber-500/10 text-amber-600"
                                : "border-border bg-muted text-muted-foreground"
                        }`}
                      >
                        {inv.type}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <StatusBadge status={inv.status} />
                    </td>
                    <td className="px-5 py-3.5 text-right font-semibold tabular-nums">
                      {formatCRC(inv.total)}
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      <div className="inline-flex items-center gap-1.5">
                        {inv.status === "borrador" && (
                          <Link
                            to="/app/invoices/new"
                            onClick={(e) => e.stopPropagation()}
                            className="inline-flex items-center gap-1 rounded-md bg-primary px-2.5 py-1 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-colors shadow-sm"
                            title="Completar datos y emitir factura a Hacienda"
                          >
                            <Edit3 className="h-3.5 w-3.5" />
                            Completar
                          </Link>
                        )}
                        {(inv.clave || inv.haciendaKey) && (
                          <a
                            href={`/api/v1/invoices/${inv.clave || inv.haciendaKey}/pdf`}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="inline-flex items-center gap-1 rounded-md bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 px-2.5 py-1 text-xs font-semibold transition-colors shadow-xs"
                            title="Ver / Imprimir Factura o Tiquete en PDF Oficial con QR"
                          >
                            <Eye className="h-3.5 w-3.5" />
                            Ver PDF
                          </a>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedDossierInvoice({
                              ...inv,
                              clave: inv.clave || inv.haciendaKey,
                              haciendaKey: inv.haciendaKey || inv.clave,
                              items: inv.items,
                              appName: inv.appName,
                            });
                          }}
                          className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-2.5 py-1 text-xs font-medium hover:bg-muted text-foreground transition-colors"
                          title="Ver Expediente Fiscal (Resumen, Diagnóstico Hacienda, Archivos XML/PDF)"
                        >
                          <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                          Expediente
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Expediente Fiscal (Resumen, Interpretación de Hacienda, Archivos XML/PDF) */}
      {selectedDossierInvoice && (
        <InvoiceDossierModal
          invoice={selectedDossierInvoice}
          onClose={() => setSelectedDossierInvoice(null)}
          onStatusChange={handleInvoiceStatusChange}
        />
      )}
    </div>
  );
}
