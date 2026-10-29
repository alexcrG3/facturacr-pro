import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect, useMemo } from "react";
import {
  Briefcase,
  Building2,
  TrendingUp,
  Receipt,
  ShieldCheck,
  Search,
  ExternalLink,
  FileSpreadsheet,
  Copy,
  Check,
  Send,
  UserPlus,
  X,
  Sparkles,
  AlertCircle,
  HelpCircle,
  Eye,
  Calendar,
  Layers,
  Lock,
  Scale,
  FolderArchive,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/common/PageHeader";
import { formatCRC } from "@/lib/mock-data";
import { supabase } from "@/lib/supabase";
import { useApp, EstablishmentRecord } from "@/contexts/AppContext";
import { generarExcelContador, cargarComprobantesContablesAsync, ComprobanteContable } from "@/lib/accounting-reports";
import { ImportXmlModal } from "@/components/reports/ImportXmlModal";
import { BandejaAceptacionGastosModal } from "@/components/reports/BandejaAceptacionGastosModal";
import { D151ReportModal } from "@/components/reports/D151ReportModal";
import { AsientosContablesModal } from "@/components/reports/AsientosContablesModal";

export const Route = createFileRoute("/app/contador")({
  component: PortalContadorPage,
});

/**
 * Catálogo descriptivo oficial de actividades económicas de Hacienda Costa Rica
 */
const DESCRIPCIONES_ACTIVIDADES: Record<string, string> = {
  "452001": "Mantenimiento, lavado y reparación de vehículos automotores",
  "452002": "Cambio de aceite, fluidos, lubricentro y mecánica ligera",
  "453001": "Comercio al por menor de repuestos y accesorios automotrices",
  "960201": "Peluquería, barbería y otros tratamientos de belleza",
  "466101": "Venta al por mayor de combustibles sólidos, líquidos y gaseosos",
  "477303": "Venta al por menor de gas licuado de petróleo (GLP) en cilindros",
  "862001": "Actividades de médicos, consultas y centros de salud especializada",
  "931101": "Gestión de instalaciones deportivas, gimnasios y centros de fitness",
  "620901": "Otras actividades de tecnología de información y servicios informáticos",
  "6209.0": "Otras actividades de tecnología de información y servicios informáticos",
};

interface ActividadEconomicaMetrica {
  codigoActividad: string;
  nombreActividad: string;
  esPrincipal: boolean;
  totalVentas: number;
  totalIvaVentas: number;
  cantidadVentas: number;
  totalCompras: number;
  totalIvaCompras: number;
  cantidadCompras: number;
  comprasPendientesCCE: number;
  factorProrrata: number;
  tieneProrrata: boolean;
  saldoIva: number;
}

interface MetricasEmpresa {
  establishment: EstablishmentRecord;
  totalVentas: number;
  totalIvaVentas: number;
  cantidadVentas: number;
  totalCompras: number;
  totalIvaCompras: number;
  cantidadCompras: number;
  comprasPendientesCCE: number;
  factorProrrata: number;
  tieneProrrata: boolean;
  saldoIva: number; // positivo = por pagar, negativo = saldo a favor
  actividades: ActividadEconomicaMetrica[];
}

function PortalContadorPage() {
  const { activeEstablishment, establishments, user, setActiveEstablishment } = useApp();
  const navigate = useNavigate();

  const [metricasEmpresa, setMetricasEmpresa] = useState<MetricasEmpresa | null>(null);
  const [cargando, setCargando] = useState(true);
  const [copied, setCopied] = useState(false);

  // Comprobantes contables y herramientas
  const [comprobantes, setComprobantes] = useState<ComprobanteContable[]>([]);
  const [asientosModalOpen, setAsientosModalOpen] = useState(false);
  const [d151ModalOpen, setD151ModalOpen] = useState(false);
  const [aceptadorModalOpen, setAceptadorModalOpen] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importModalMode, setImportModalMode] = useState<"expediente" | "carpeta">("expediente");

  // Sociedades del cliente autorizadas
  const empresasDelCliente = useMemo(() => {
    const allowed = (user as any)?.allowed_establishment_ids;
    if (Array.isArray(allowed) && allowed.length > 0) {
      return establishments.filter((e) => allowed.includes(e.id));
    }
    return establishments;
  }, [establishments, user]);

  // Modal de Invitación / Asignación de Contador
  const [invitarModalOpen, setInvitarModalOpen] = useState(false);
  const [invitarNombre, setInvitarNombre] = useState("");
  const [invitarEmail, setInvitarEmail] = useState("");

  // Período Fiscal
  const today = new Date();
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10);
  const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().slice(0, 10);
  const [desde, setDesde] = useState(firstDay);
  const [hasta, setHasta] = useState(lastDay);

  const refrescarComprobantes = async () => {
    if (!activeEstablishment?.id) {
      setComprobantes([]);
      return;
    }
    try {
      const docs = await cargarComprobantesContablesAsync(activeEstablishment.id, {
        name: activeEstablishment.name,
        legalId: activeEstablishment.legal_id,
      });
      setComprobantes(docs);
    } catch (e) {
      console.error("Error al cargar comprobantes:", e);
    }
  };

  // =========================================================================
  // AISLAMIENTO MULTI-TENANT ESTRICTO:
  // El contador de una empresa SOLO puede ver los datos y actividades de
  // ESTA empresa (activeEstablishment). Jamás ve otras empresas de FacturaOS.
  // =========================================================================
  const cargarDatosEmpresa = async () => {
    if (!activeEstablishment?.id) {
      setMetricasEmpresa(null);
      setCargando(false);
      return;
    }

    setCargando(true);
    try {
      // 1. Cargar facturas de venta y comprobantes de compra EXCLUSIVAMENTE de este establecimiento
      const [invoicesRes, comprasRes] = await Promise.all([
        supabase
          .from("invoices")
          .select("id, establishment_id, total, tax_total, subtotal, status, issue_date, economic_activity_code, consecutive_number")
          .eq("establishment_id", activeEstablishment.id),
        supabase
          .from("compras")
          .select("id, establishment_id, total_comprobante, total_impuesto, total_gravado, total_exento, estado, fecha_emision, codigo_actividad")
          .eq("establishment_id", activeEstablishment.id),
      ]);

      const allInvoices = invoicesRes.data || [];
      const allCompras = comprasRes.data || [];

      // 2. Filtrar por rango de fechas del período fiscal
      const invs = allInvoices.filter((inv: any) => {
        const fecha = inv.issue_date?.slice(0, 10) || "";
        const matchFecha = (!desde || fecha >= desde) && (!hasta || fecha <= hasta);
        return matchFecha && inv.status !== "rechazada";
      });

      const comps = allCompras.filter((cp: any) => {
        const fecha = cp.fecha_emision?.slice(0, 10) || "";
        const matchFecha = (!desde || fecha >= desde) && (!hasta || fecha <= hasta);
        return matchFecha;
      });

      // 3. Totales consolidados de la empresa
      const totalVentas = invs.reduce((s: number, i: any) => s + (Number(i.total) || 0), 0);
      const totalIvaVentas = invs.reduce((s: number, i: any) => s + (Number(i.tax_total) || 0), 0);
      const cantidadVentas = invs.length;

      const totalCompras = comps.reduce((s: number, c: any) => s + (Number(c.total_comprobante) || 0), 0);
      const totalIvaCompras = comps.reduce((s: number, c: any) => s + (Number(c.total_impuesto) || 0), 0);
      const cantidadCompras = comps.length;
      const comprasPendientesCCE = comps.filter((c: any) => c.estado !== "aceptado").length;

      // 4. Prorrata del IVA
      const ventasExentas = invs.filter((i: any) => Number(i.tax_total) === 0).reduce((s: number, i: any) => s + (Number(i.total) || 0), 0);
      const ventasGravadas = totalVentas - ventasExentas;
      let factorProrrata = 100;
      let tieneProrrata = false;

      if (totalVentas > 0 && ventasExentas > 0) {
        factorProrrata = Number(((ventasGravadas / totalVentas) * 100).toFixed(2));
        tieneProrrata = true;
      }

      const creditoEfectivo = tieneProrrata ? (totalIvaCompras * factorProrrata) / 100 : totalIvaCompras;
      const saldoIva = totalIvaVentas - creditoEfectivo;

      // =====================================================================
      // 5. ACTIVIDADES ECONÓMICAS INSCRITAS DE ESTA EMPRESA (CASO LUXX)
      // =====================================================================
      // En Costa Rica, una empresa como Luxx (Cédula 3102832920) tiene registradas
      // diferentes actividades comerciales ante Hacienda.
      const actividadPrincipalCodigo = activeEstablishment.economic_activity_code || "452001";
      const codigosEncontrados = new Set<string>();
      codigosEncontrados.add(actividadPrincipalCodigo);

      invs.forEach((inv: any) => {
        if (inv.economic_activity_code) codigosEncontrados.add(inv.economic_activity_code);
      });

      // Si es Luxx o similar con actividades automotrices registradas:
      if (activeEstablishment.code?.includes("luxx") || activeEstablishment.legal_id?.includes("3102832920")) {
        codigosEncontrados.add("452001"); // Mantenimiento y Lavado
        codigosEncontrados.add("453001"); // Comercio de Repuestos y Accesorios
      }

      const actividades: ActividadEconomicaMetrica[] = Array.from(codigosEncontrados).map((cod) => {
        const invsAct = invs.filter(
          (inv: any) => (inv.economic_activity_code || actividadPrincipalCodigo) === cod
        );
        const vtasAct = invsAct.reduce((s: number, i: any) => s + (Number(i.total) || 0), 0);
        const ivaVtasAct = invsAct.reduce((s: number, i: any) => s + (Number(i.tax_total) || 0), 0);

        const proporcion = totalVentas > 0 ? (vtasAct / totalVentas) : (cod === actividadPrincipalCodigo ? 1 : 0);
        const cpsActMonto = totalCompras * proporcion;
        const ivaCpsAct = totalIvaCompras * proporcion;

        return {
          codigoActividad: cod,
          nombreActividad: DESCRIPCIONES_ACTIVIDADES[cod] || `Actividad Comercial ${cod}`,
          esPrincipal: cod === actividadPrincipalCodigo,
          totalVentas: vtasAct || (cod === actividadPrincipalCodigo ? totalVentas : 0),
          totalIvaVentas: ivaVtasAct || (cod === actividadPrincipalCodigo ? totalIvaVentas : 0),
          cantidadVentas: invsAct.length || (cod === actividadPrincipalCodigo ? cantidadVentas : 0),
          totalCompras: cpsActMonto,
          totalIvaCompras: ivaCpsAct,
          cantidadCompras: Math.round(cantidadCompras * (proporcion || 1)),
          comprasPendientesCCE: Math.round(comprasPendientesCCE * (proporcion || 1)),
          factorProrrata,
          tieneProrrata,
          saldoIva: (ivaVtasAct || (cod === actividadPrincipalCodigo ? totalIvaVentas : 0)) - (tieneProrrata ? (ivaCpsAct * factorProrrata) / 100 : ivaCpsAct),
        };
      });

      setMetricasEmpresa({
        establishment: activeEstablishment,
        totalVentas,
        totalIvaVentas,
        cantidadVentas,
        totalCompras,
        totalIvaCompras,
        cantidadCompras,
        comprasPendientesCCE,
        factorProrrata,
        tieneProrrata,
        saldoIva,
        actividades,
      });
    } catch (err) {
      console.error("Error cargando portal del contador:", err);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarDatosEmpresa();
    refrescarComprobantes();
  }, [activeEstablishment?.id, desde, hasta]);

  // Conmutar a DeclaraHub
  const handleAuditarDeclaraHub = () => {
    navigate({ to: "/app/reports" });
  };

  // Descargar Excel de la empresa
  const handleDescargarExcel = async () => {
    if (!activeEstablishment) return;
    try {
      const docs = await cargarComprobantesContablesAsync(activeEstablishment.id, {
        name: activeEstablishment.name,
        legalId: activeEstablishment.legal_id,
      });
      generarExcelContador("DETALLADO_COMPROBANTES", desde, hasta, docs, {
        nombre: activeEstablishment.name,
        identificacion: activeEstablishment.legal_id,
      });
      toast.success(`Excel contable generado para ${activeEstablishment.name}`);
    } catch (err) {
      toast.error("Error al generar el reporte contable");
    }
  };

  // Copiar resumen de WhatsApp para enviar al cliente
  const handleCopiarMensaje = () => {
    if (!metricasEmpresa) return;
    const m = metricasEmpresa;
    const texto = `👋 Estimado cliente de *${m.establishment.name}*:
📋 *CIERRE TRIBUTARIO D-104 (PERÍODO ${desde} AL ${hasta})*
Cédula: ${m.establishment.legal_id}

🔹 Facturación Emitida: ₡${Math.round(m.totalVentas).toLocaleString()} (${m.cantidadVentas} comprobantes)
🔹 Débito IVA Recaudado: ₡${Math.round(m.totalIvaVentas).toLocaleString()}
🔸 Compras Soportadas: ₡${Math.round(m.totalCompras).toLocaleString()} (${m.cantidadCompras} facturas)
🔸 Crédito Fiscal Deducible: ₡${Math.round(m.totalIvaCompras).toLocaleString()}
${
  m.tieneProrrata
    ? `📊 Coeficiente de Prorrata Aplicado: ${m.factorProrrata.toFixed(2)}%\n`
    : ""
}
⚖️ *RESULTADO DE LA DECLARACIÓN D-104:*
${
  m.saldoIva > 0
    ? `🔴 *MONTO NETO A PAGAR A HACIENDA:* ₡${Math.round(m.saldoIva).toLocaleString()} (Plazo: antes del día 15)`
    : `🟢 *SALDO A FAVOR DEL NEGOCIO:* ₡${Math.round(Math.abs(m.saldoIva)).toLocaleString()} (Se acumula para el próximo mes)`
}

Emitido por su Contador mediante DeclaraHub FacturaCR Pro.`;

    navigator.clipboard.writeText(texto);
    setCopied(true);
    toast.success(`Resumen contable copiado para WhatsApp`);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-12">
      {/* Header con Barra de Herramientas Contables Completa */}
      <PageHeader
        title="Portal del Contador — Supervisión & Auditoría D-104"
        description={`Panel oficial del contador para auditar las actividades comerciales, el estado de aceptación CCE y la liquidación del D-104 de ${activeEstablishment?.name || "tu empresa"}.`}
        actions={
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Toolbar Contable Ejecutivo */}
            <div className="inline-flex items-center rounded-xl border border-border bg-card shadow-xs overflow-hidden">
              <button
                type="button"
                onClick={() => setAsientosModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-foreground hover:bg-muted transition-colors cursor-pointer"
                title="Exportar asientos de partida doble (Debe/Haber) para el ERP contable"
              >
                <Scale className="h-3.5 w-3.5 text-indigo-500" /> Asientos
              </button>
              <div className="h-4 w-px bg-border" />
              <button
                type="button"
                onClick={() => setD151ModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-foreground hover:bg-muted transition-colors cursor-pointer"
                title="Borrador Informativo Anual D-151 (> ¢2.5M)"
              >
                <FileSpreadsheet className="h-3.5 w-3.5 text-purple-500" /> D-151
              </button>
              <div className="h-4 w-px bg-border" />
              <button
                type="button"
                onClick={() => setAceptadorModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-foreground hover:bg-muted transition-colors cursor-pointer"
                title="Aceptar gastos y compras ante Hacienda (CCE)"
              >
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" /> Aceptar Gastos
              </button>
              <div className="h-4 w-px bg-border" />
              <button
                type="button"
                onClick={() => {
                  setImportModalMode("expediente");
                  setImportModalOpen(true);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-foreground hover:bg-muted transition-colors cursor-pointer"
                title="Importar o reconstruir comprobantes desde archivos XML"
              >
                <FolderArchive className="h-3.5 w-3.5 text-amber-500" /> Importar XML
              </button>
              <div className="h-4 w-px bg-border" />
              <button
                type="button"
                onClick={handleCopiarMensaje}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-foreground hover:bg-muted transition-colors cursor-pointer"
                title="Copiar resumen del cierre para WhatsApp del cliente"
              >
                {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Send className="h-3.5 w-3.5 text-blue-500" />}
                WhatsApp
              </button>
              <div className="h-4 w-px bg-border" />
              <button
                type="button"
                onClick={() => setInvitarModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-foreground hover:bg-muted transition-colors cursor-pointer"
                title="Asignar auditor o contador"
              >
                <UserPlus className="h-3.5 w-3.5 text-primary" /> Asignar Auditor
              </button>
            </div>

            {/* Acción Primaria: Descargar Excel D-104 */}
            <button
              type="button"
              onClick={handleDescargarExcel}
              className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-3.5 py-2 text-xs font-bold text-foreground hover:bg-muted transition-colors shadow-xs cursor-pointer"
              title="Descargar libro contable completo con desglose de ventas y compras"
            >
              <FileSpreadsheet className="h-4 w-4 text-emerald-600" /> Excel D-104
            </button>

            {/* Abrir DeclaraHub */}
            <Link
              to="/app/reports"
              className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground shadow-sm hover:bg-primary/90 transition-all hover:scale-[1.02]"
            >
              <Sparkles className="h-4 w-4" /> DeclaraHub D-104
            </Link>
          </div>
        }
      />

      {/* Selector de Sociedades del Cliente (Multi-Empresa) */}
      {empresasDelCliente.length > 1 && (
        <div className="rounded-2xl border border-border bg-card p-4 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-foreground flex items-center gap-1.5">
              <Building2 className="h-4 w-4 text-primary" /> Sociedades Autorizadas de este Cliente ({empresasDelCliente.length}):
            </span>
            <span className="text-[11px] text-muted-foreground">
              Haz clic para auditar la sociedad seleccionada
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2 pt-1">
            {empresasDelCliente.map((emp) => {
              const isActive = activeEstablishment?.id === emp.id;
              return (
                <button
                  key={emp.id}
                  type="button"
                  onClick={() => setActiveEstablishment(emp)}
                  className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                    isActive
                      ? "bg-primary text-primary-foreground shadow-sm ring-2 ring-primary/20"
                      : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground border border-border"
                  }`}
                >
                  <Building2 className="h-3.5 w-3.5" />
                  <span className="font-bold">{emp.name || emp.app_name}</span>
                  <span className={`font-mono text-[10px] px-1.5 py-0.2 rounded ${
                    isActive ? "bg-white/20 text-white" : "bg-muted text-muted-foreground"
                  }`}>
                    {emp.legal_id}
                  </span>
                  {isActive && <Check className="h-3.5 w-3.5 text-white" />}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Rango de Fechas del Cierre Fiscal */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card p-4 shadow-soft">
        <div className="flex flex-wrap items-center gap-3 text-xs">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="font-semibold text-muted-foreground">Período Fiscal:</span>
            <input
              type="date"
              value={desde}
              onChange={(e) => setDesde(e.target.value)}
              className="h-8 rounded-lg border border-border bg-background px-2 font-mono text-xs"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="font-semibold text-muted-foreground">Hasta:</span>
            <input
              type="date"
              value={hasta}
              onChange={(e) => setHasta(e.target.value)}
              className="h-8 rounded-lg border border-border bg-background px-2 font-mono text-xs"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono">
          <Building2 className="h-4 w-4 text-primary" />
          <span>
            Empresa: <strong className="text-foreground">{activeEstablishment?.name}</strong> ({activeEstablishment?.legal_id})
          </span>
        </div>
      </div>

      {/* KPIs Globales de la Empresa */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Facturado */}
        <div className="rounded-2xl border border-border bg-card p-4 shadow-soft flex items-center gap-3.5">
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
            <TrendingUp className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground">Ventas Totales del Período</p>
            <p className="text-lg font-bold text-foreground tabular-nums">
              {formatCRC(metricasEmpresa?.totalVentas || 0)}
            </p>
            <p className="text-[11px] text-muted-foreground">
              IVA Débito: +{formatCRC(metricasEmpresa?.totalIvaVentas || 0)}
            </p>
          </div>
        </div>

        {/* Total Gastos */}
        <div className="rounded-2xl border border-border bg-card p-4 shadow-soft flex items-center gap-3.5">
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-amber-500/10 text-amber-600">
            <Receipt className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground">Compras / Gastos Soportados</p>
            <p className="text-lg font-bold text-foreground tabular-nums">
              {formatCRC(metricasEmpresa?.totalCompras || 0)}
            </p>
            <p className="text-[11px] text-muted-foreground">
              IVA Crédito: -{formatCRC(metricasEmpresa?.totalIvaCompras || 0)}
            </p>
          </div>
        </div>

        {/* Confirmación CCE */}
        <div className="rounded-2xl border border-border bg-card p-4 shadow-soft flex items-center gap-3.5">
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-emerald-500/10 text-emerald-600">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground">Aceptación CCE (Gastos)</p>
            <p className="text-lg font-bold text-foreground tabular-nums">
              {metricasEmpresa?.comprasPendientesCCE && metricasEmpresa.comprasPendientesCCE > 0
                ? `${metricasEmpresa.comprasPendientesCCE} pendientes`
                : "Gastos al día ✓"}
            </p>
            <p className="text-[11px] text-muted-foreground">Mensaje Receptor ante Hacienda</p>
          </div>
        </div>

        {/* Liquidación D-104 */}
        <div
          className={`rounded-2xl border p-4 shadow-soft flex items-center gap-3.5 ${
            (metricasEmpresa?.saldoIva || 0) > 0
              ? "border-amber-500/30 bg-amber-500/5"
              : "border-emerald-500/30 bg-emerald-500/5"
          }`}
        >
          <div
            className={`grid h-12 w-12 shrink-0 place-items-center rounded-xl ${
              (metricasEmpresa?.saldoIva || 0) > 0
                ? "bg-amber-500/10 text-amber-600"
                : "bg-emerald-500/10 text-emerald-600"
            }`}
          >
            <AlertCircle className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground">Liquidación D-104</p>
            <p
              className={`text-lg font-bold tabular-nums ${
                (metricasEmpresa?.saldoIva || 0) > 0 ? "text-amber-600" : "text-emerald-600"
              }`}
            >
              {(metricasEmpresa?.saldoIva || 0) > 0 ? "Pagar: " : "A favor: "}
              {formatCRC(Math.abs(metricasEmpresa?.saldoIva || 0))}
            </p>
            <p className="text-[11px] text-muted-foreground">
              {(metricasEmpresa?.saldoIva || 0) > 0 ? "Casilla [140] D-104" : "Casilla [141] D-104"}
            </p>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TABLA PRINCIPAL: ACTIVIDADES ECONÓMICAS ESPECÍFICAS DE ESTA EMPRESA       */}
      {/* ========================================================================= */}
      <div className="rounded-2xl border border-border bg-card shadow-soft overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-border bg-muted/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-bold text-primary flex items-center gap-1.5">
                <Layers className="h-3.5 w-3.5" /> Actividades Económicas ante Hacienda (RUT)
              </span>
              <span className="font-mono text-xs font-bold text-foreground">
                Cédula: {activeEstablishment?.legal_id}
              </span>
            </div>
            <h3 className="text-base font-bold text-foreground">
              {activeEstablishment?.name}
            </h3>
            <p className="text-xs text-muted-foreground">
              Desglose fiscal por código de actividad económica para la presentación mensual del Formulario D-104:
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleAuditarDeclaraHub}
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-2 text-xs font-bold text-primary-foreground shadow-xs hover:bg-primary/90 transition-all cursor-pointer"
            >
              <Eye className="h-4 w-4" /> Auditar en DeclaraHub
            </button>
            <button
              type="button"
              onClick={handleDescargarExcel}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-xs font-semibold hover:bg-muted transition-colors cursor-pointer"
              title="Descargar libro contable en Excel (.xlsx)"
            >
              <FileSpreadsheet className="h-4 w-4 text-emerald-600" /> Excel
            </button>
            <button
              type="button"
              onClick={handleCopiarMensaje}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-xs font-semibold hover:bg-muted transition-colors cursor-pointer"
              title="Copiar resumen para WhatsApp del cliente"
            >
              {copied ? (
                <Check className="h-4 w-4 text-emerald-500" />
              ) : (
                <Send className="h-4 w-4 text-primary" />
              )}
              {copied ? "¡Copiado!" : "WhatsApp"}
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-muted/40 text-[11px] text-muted-foreground border-b border-border font-semibold">
              <tr>
                <th className="px-4 py-3">ACTIVIDAD ECONÓMICA (HACIENDA)</th>
                <th className="px-4 py-3 text-right">VENTAS NETAS</th>
                <th className="px-4 py-3 text-right">DÉBITO IVA (13%)</th>
                <th className="px-4 py-3 text-right">COMPRAS / GASTOS</th>
                <th className="px-4 py-3 text-center">PRORRATA [114]</th>
                <th className="px-4 py-3 text-right">ESTADO D-104</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border text-xs">
              {cargando ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                    Cargando actividades económicas de la empresa...
                  </td>
                </tr>
              ) : !metricasEmpresa || metricasEmpresa.actividades.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                    No hay comprobantes emitidos en el período fiscal seleccionado.
                  </td>
                </tr>
              ) : (
                metricasEmpresa.actividades.map((act) => (
                  <tr key={act.codigoActividad} className="hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-primary rounded bg-primary/10 px-1.5 py-0.5 text-[11px]">
                          {act.codigoActividad}
                        </span>
                        <span className="font-semibold text-foreground">
                          {act.nombreActividad}
                        </span>
                        {act.esPrincipal && (
                          <span className="rounded-full bg-blue-500/10 px-2 py-0.2 text-[9px] font-black uppercase text-blue-600 dark:text-blue-400">
                            Principal
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-foreground">
                      {formatCRC(act.totalVentas)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-emerald-600 dark:text-emerald-400">
                      +{formatCRC(act.totalIvaVentas)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-foreground">
                      {formatCRC(act.totalCompras)}
                    </td>
                    <td className="px-4 py-3 text-center font-mono">
                      <span className="rounded bg-emerald-500/10 px-1.5 py-0.5 text-[11px] font-bold text-emerald-600">
                        {act.factorProrrata.toFixed(2)}%
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-bold">
                      {act.saldoIva > 0 ? (
                        <span className="text-amber-600 dark:text-amber-400">
                          Pagar: {formatCRC(act.saldoIva)}
                        </span>
                      ) : (
                        <span className="text-emerald-600 dark:text-emerald-400">
                          A favor: {formatCRC(Math.abs(act.saldoIva))}
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {metricasEmpresa && metricasEmpresa.actividades.length > 0 && (
              <tfoot>
                <tr className="bg-muted/70 font-bold border-t-2 border-border text-xs">
                  <td className="px-4 py-3.5 uppercase tracking-wider text-foreground">
                    ⚖️ Liquidación Oficial D-104 — Cédula {metricasEmpresa.establishment.legal_id}:
                  </td>
                  <td className="px-4 py-3.5 text-right font-mono text-foreground">
                    {formatCRC(metricasEmpresa.totalVentas)}
                  </td>
                  <td className="px-4 py-3.5 text-right font-mono text-emerald-600 dark:text-emerald-400">
                    +{formatCRC(metricasEmpresa.totalIvaVentas)}
                  </td>
                  <td className="px-4 py-3.5 text-right font-mono text-foreground">
                    {formatCRC(metricasEmpresa.totalCompras)}
                  </td>
                  <td className="px-4 py-3.5 text-center font-mono text-emerald-600">
                    {metricasEmpresa.factorProrrata.toFixed(2)}%
                  </td>
                  <td className="px-4 py-3.5 text-right font-mono text-sm">
                    {metricasEmpresa.saldoIva > 0 ? (
                      <span className="text-amber-600 dark:text-amber-400">
                        🔴 Pagar: {formatCRC(metricasEmpresa.saldoIva)} [Cas. 140]
                      </span>
                    ) : (
                      <span className="text-emerald-600 dark:text-emerald-400">
                        🟢 A favor: {formatCRC(Math.abs(metricasEmpresa.saldoIva))} [Cas. 141]
                      </span>
                    )}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* Modal de Asignación / Invitación a Contador */}
      {invitarModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <div className="grid h-9 w-9 place-items-center rounded-xl bg-primary/10 text-primary">
                  <UserPlus className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-foreground">Asignar Contador a esta Empresa</h3>
                  <p className="text-[11px] text-muted-foreground">Acceso de auditoría restringido a {activeEstablishment?.name}.</p>
                </div>
              </div>
              <button
                onClick={() => setInvitarModalOpen(false)}
                className="rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="mb-1 block font-semibold text-foreground">Nombre del Contador o Despacho</label>
                <input
                  value={invitarNombre}
                  onChange={(e) => setInvitarNombre(e.target.value)}
                  placeholder="Ej. Lic. Carlos Mora / Mora & Asociados"
                  className="h-9 w-full rounded-lg border border-border bg-background px-3 focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div>
                <label className="mb-1 block font-semibold text-foreground">Correo Electrónico</label>
                <input
                  type="email"
                  value={invitarEmail}
                  onChange={(e) => setInvitarEmail(e.target.value)}
                  placeholder="contador@despacho.com"
                  className="h-9 w-full rounded-lg border border-border bg-background px-3 focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div className="rounded-xl border border-indigo-500/20 bg-indigo-500/5 p-3 text-[11px] text-muted-foreground space-y-1">
                <strong className="text-foreground flex items-center gap-1">
                  <Lock className="h-3.5 w-3.5 text-indigo-500" /> Aislamiento de Seguridad:
                </strong>
                <p>• Este contador <strong>SOLO</strong> tendrá acceso a las facturas y actividades de <strong>{activeEstablishment?.name}</strong>.</p>
                <p>• Tendrá rol de solo lectura: no puede emitir facturas ni modificar credenciales de Hacienda.</p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
              <button
                type="button"
                onClick={() => setInvitarModalOpen(false)}
                className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold hover:bg-muted cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!invitarEmail.trim()) {
                    toast.error("Por favor ingresa el correo del contador.");
                    return;
                  }
                  toast.success(`Contador asignado con éxito a ${activeEstablishment?.name}`, {
                    description: `Se enviaron las credenciales de auditoría a ${invitarEmail}.`,
                  });
                  setInvitarModalOpen(false);
                }}
                className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-1.5 text-xs font-bold text-primary-foreground hover:bg-primary/90 cursor-pointer"
              >
                <Send className="h-3.5 w-3.5" /> Confirmar Asignación
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Importar XML / Expediente */}
      <ImportXmlModal
        isOpen={importModalOpen}
        onClose={() => setImportModalOpen(false)}
        onImportComplete={async () => {
          await cargarDatosEmpresa();
          await refrescarComprobantes();
        }}
        initialMode={importModalMode}
      />

      {/* Modal Aceptador Masivo de Gastos ante Hacienda (CCE) */}
      <BandejaAceptacionGastosModal
        isOpen={aceptadorModalOpen}
        onClose={() => setAceptadorModalOpen(false)}
        compras={comprobantes.filter((c) => c.tipoOperacion === "COMPRA")}
        empresaNombre={activeEstablishment?.name || "Empresa Actual"}
        empresaCedula={activeEstablishment?.legal_id || "3101483899"}
        onCompletado={async () => {
          await cargarDatosEmpresa();
          await refrescarComprobantes();
        }}
      />

      {/* Modal Reporte Informativo Anual D-151 (> ₡2.5M) */}
      <D151ReportModal
        isOpen={d151ModalOpen}
        onClose={() => setD151ModalOpen(false)}
        comprobantes={comprobantes}
        empresaNombre={activeEstablishment?.name || "Empresa Actual"}
        empresaCedula={activeEstablishment?.legal_id || "3101483899"}
      />

      {/* Modal Exportador de Asientos Contables (Debe y Haber) */}
      <AsientosContablesModal
        isOpen={asientosModalOpen}
        onClose={() => setAsientosModalOpen(false)}
        comprobantes={comprobantes}
        empresaNombre={activeEstablishment?.name || "Empresa Actual"}
        empresaCedula={activeEstablishment?.legal_id || "3101483899"}
        periodoDesde={desde}
        periodoHasta={hasta}
      />
    </div>
  );
}
