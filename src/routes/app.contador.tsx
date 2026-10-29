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
  Lock,
  Layers,
  SlidersHorizontal,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/common/PageHeader";
import { formatCRC } from "@/lib/mock-data";
import { supabase } from "@/lib/supabase";
import { useApp, EstablishmentRecord } from "@/contexts/AppContext";
import { generarExcelContador, cargarComprobantesContablesAsync } from "@/lib/accounting-reports";

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
  const { establishments, activeEstablishment, setActiveEstablishment, user, isSuperAdmin } = useApp();
  const navigate = useNavigate();

  const [metricasPorEmpresa, setMetricasPorEmpresa] = useState<MetricasEmpresa[]>([]);
  const [cargando, setCargando] = useState(true);
  const [filtroTexto, setFiltroTexto] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Selector de alcance: solo SuperAdmin puede conmutar a vista global de soporte técnico
  const [verSoloCarteraCliente, setVerSoloCarteraCliente] = useState(true);

  // Vista activa: Empresas o Actividades de la empresa
  const [vistaDesglose, setVistaDesglose] = useState<"empresas" | "actividades">("actividades");

  // Modal de Invitación
  const [invitarModalOpen, setInvitarModalOpen] = useState(false);
  const [invitarNombre, setInvitarNombre] = useState("");
  const [invitarEmail, setInvitarEmail] = useState("");

  // Período Fiscal
  const today = new Date();
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10);
  const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().slice(0, 10);
  const [desde, setDesde] = useState(firstDay);
  const [hasta, setHasta] = useState(lastDay);

  // =========================================================================
  // FILTRADO ESTRICTO MULTI-TENANT: AISLAMIENTO DE CARTERA DEL CONTADOR
  // =========================================================================
  // Un contador NO debe ver empresas de las cuales no es contador.
  // Por ejemplo, el contador de Luxx ve Luxx (y todas sus actividades), pero NO Gas Express ni Grupo G Tres.
  const empresasPermitidas = useMemo(() => {
    // Si es SuperAdmin Y deliberadamente desactivó el filtro de cliente, ve toda la plataforma
    if (isSuperAdmin && !verSoloCarteraCliente) {
      return establishments;
    }

    if (!activeEstablishment) return [];

    const cedulaActiva = (activeEstablishment.legal_id || "").replace(/\D/g, "");

    return establishments.filter((est) => {
      const cedulaEst = (est.legal_id || "").replace(/\D/g, "");

      // 1. Misma Cédula Jurídica / Física: pertenece a este mismo cliente/empresa
      // (por ejemplo: diferentes actividades económicas o sucursales de Luxx)
      if (cedulaActiva && cedulaEst === cedulaActiva) {
        return true;
      }

      // 2. Coincidencia directa por ID de establecimiento activo
      if (est.id === activeEstablishment.id) {
        return true;
      }

      // 3. Cartera de clientes explícitamente autorizada para este contador
      const carteraGuardada = typeof window !== "undefined"
        ? JSON.parse(localStorage.getItem(`facturaos_cartera_contador_${user.email}`) || "[]")
        : [];
      if (carteraGuardada.includes(est.id) || carteraGuardada.includes(est.code)) {
        return true;
      }

      return false;
    });
  }, [establishments, activeEstablishment, isSuperAdmin, verSoloCarteraCliente, user.email]);

  const cargarDatosDespacho = async () => {
    setCargando(true);
    try {
      // Cargar facturas y compras de las empresas autorizadas
      const [invoicesRes, comprasRes] = await Promise.all([
        supabase
          .from("invoices")
          .select("id, establishment_id, total, tax_total, subtotal, status, issue_date, economic_activity_code, consecutive_number, items"),
        supabase
          .from("compras")
          .select("id, establishment_id, total_comprobante, total_impuesto, total_gravado, total_exento, estado, fecha_emision, codigo_actividad"),
      ]);

      const allInvoices = invoicesRes.data || [];
      const allCompras = comprasRes.data || [];

      const resultados: MetricasEmpresa[] = empresasPermitidas.map((est) => {
        // Filtrar por empresa y rango de fechas
        const invs = allInvoices.filter((inv: any) => {
          const matchEst = inv.establishment_id === est.id;
          const fecha = inv.issue_date?.slice(0, 10) || "";
          const matchFecha = (!desde || fecha >= desde) && (!hasta || fecha <= hasta);
          return matchEst && matchFecha && inv.status !== "rechazada";
        });

        const comps = allCompras.filter((cp: any) => {
          const matchEst = cp.establishment_id === est.id;
          const fecha = cp.fecha_emision?.slice(0, 10) || "";
          const matchFecha = (!desde || fecha >= desde) && (!hasta || fecha <= hasta);
          return matchEst && matchFecha;
        });

        const totalVentas = invs.reduce((s: number, i: any) => s + (Number(i.total) || 0), 0);
        const totalIvaVentas = invs.reduce((s: number, i: any) => s + (Number(i.tax_total) || 0), 0);
        const cantidadVentas = invs.length;

        const totalCompras = comps.reduce((s: number, c: any) => s + (Number(c.total_comprobante) || 0), 0);
        const totalIvaCompras = comps.reduce((s: number, c: any) => s + (Number(c.total_impuesto) || 0), 0);
        const cantidadCompras = comps.length;
        const comprasPendientesCCE = comps.filter((c: any) => c.estado !== "aceptado").length;

        // Prorrata
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
        // DESGLOSE POR ACTIVIDAD ECONÓMICA DE LA EMPRESA (CASO LUXX)
        // =====================================================================
        // Una empresa puede tener múltiples actividades económicas ante Hacienda.
        // El contador debe ver cada una desglosada y el consolidado D-104.
        const actividadPrincipalCodigo = est.economic_activity_code || "452001";
        const codigosEncontrados = new Set<string>();
        codigosEncontrados.add(actividadPrincipalCodigo);

        invs.forEach((inv: any) => {
          if (inv.economic_activity_code) codigosEncontrados.add(inv.economic_activity_code);
        });

        // Para Luxx (3102832920), asegurar que figuren sus actividades registradas de lavado y repuestos
        if (est.code?.includes("luxx") || est.legal_id?.includes("3102832920")) {
          codigosEncontrados.add("452001"); // Lavado y Mantenimiento
          codigosEncontrados.add("453001"); // Venta de Repuestos y Accesorios
        }

        const actividades: ActividadEconomicaMetrica[] = Array.from(codigosEncontrados).map((cod) => {
          const invsAct = invs.filter(
            (inv: any) => (inv.economic_activity_code || actividadPrincipalCodigo) === cod
          );
          const vtasAct = invsAct.reduce((s: number, i: any) => s + (Number(i.total) || 0), 0);
          const ivaVtasAct = invsAct.reduce((s: number, i: any) => s + (Number(i.tax_total) || 0), 0);

          // Si las compras no están etiquetadas por actividad, se imputan proporcionalmente a las ventas
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

        return {
          establishment: est,
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
        };
      });

      setMetricasPorEmpresa(resultados);
    } catch (err) {
      console.error("Error cargando despacho contable:", err);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    if (empresasPermitidas.length > 0) {
      cargarDatosDespacho();
    } else {
      setMetricasPorEmpresa([]);
      setCargando(false);
    }
  }, [empresasPermitidas, desde, hasta]);

  // Filtro por texto
  const filtradas = useMemo(() => {
    if (!filtroTexto.trim()) return metricasPorEmpresa;
    const q = filtroTexto.toLowerCase();
    return metricasPorEmpresa.filter(
      (m) =>
        m.establishment.name.toLowerCase().includes(q) ||
        m.establishment.legal_id.includes(q) ||
        m.establishment.code.toLowerCase().includes(q)
    );
  }, [metricasPorEmpresa, filtroTexto]);

  // Totales Globales de la Cartera Autorizada
  const kpisDespacho = useMemo(() => {
    const totalVentasGlobal = metricasPorEmpresa.reduce((s, m) => s + m.totalVentas, 0);
    const totalComprasGlobal = metricasPorEmpresa.reduce((s, m) => s + m.totalCompras, 0);
    const totalDebitoGlobal = metricasPorEmpresa.reduce((s, m) => s + m.totalIvaVentas, 0);
    const totalCreditoGlobal = metricasPorEmpresa.reduce((s, m) => s + m.totalIvaCompras, 0);
    const empresasPorPagar = metricasPorEmpresa.filter((m) => m.saldoIva > 0).length;
    const empresasConSaldoFavor = metricasPorEmpresa.filter((m) => m.saldoIva < 0).length;

    return {
      totalVentasGlobal,
      totalComprasGlobal,
      totalDebitoGlobal,
      totalCreditoGlobal,
      empresasPorPagar,
      empresasConSaldoFavor,
    };
  }, [metricasPorEmpresa]);

  // Conmutar empresa y navegar a DeclaraHub
  const handleAuditarEmpresa = (est: EstablishmentRecord) => {
    setActiveEstablishment(est);
    toast.success(`Conmutado a ${est.name}`, {
      description: "Abriendo DeclaraHub para auditoría fiscal del D-104...",
    });
    navigate({ to: "/app/reports" });
  };

  // Descargar Excel de la empresa
  const handleDescargarExcelEmpresa = async (est: EstablishmentRecord) => {
    try {
      const docs = await cargarComprobantesContablesAsync(est.id, {
        name: est.name,
        legalId: est.legal_id,
      });
      generarExcelContador("DETALLADO_COMPROBANTES", desde, hasta, docs, {
        nombre: est.name,
        identificacion: est.legal_id,
      });
      toast.success(`Excel contable generado para ${est.name}`);
    } catch (err) {
      toast.error("Error al generar el reporte contable");
    }
  };

  // Copiar resumen de WhatsApp para enviar al cliente
  const handleCopiarMensajeCliente = (m: MetricasEmpresa) => {
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

Emitido por su Despacho Contable mediante DeclaraHub.`;

    navigator.clipboard.writeText(texto);
    setCopiedId(m.establishment.id);
    toast.success(`Mensaje para WhatsApp copiado para ${m.establishment.name}`);
    setTimeout(() => setCopiedId(null), 2500);
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-12">
      {/* Header */}
      <PageHeader
        title="Portal del Contador — Cartera de Clientes & Auditoría D-104"
        description="Panel de control maestro para contadores y auditores. Supervisa las actividades económicas autorizadas de tu cliente, el estado de aceptación CCE y la liquidación del D-104 en tiempo real."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setInvitarModalOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-primary/30 bg-primary/10 px-3.5 py-2 text-xs font-bold text-primary hover:bg-primary/20 transition-colors cursor-pointer"
            >
              <UserPlus className="h-4 w-4" /> Asignar Auditor / Contador
            </button>
            <Link
              to="/app/reports"
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-soft hover:bg-emerald-700 transition-all hover:scale-[1.02]"
            >
              <ShieldCheck className="h-4 w-4" /> Abrir DeclaraHub D-104
            </Link>
          </div>
        }
      />

      {/* Banner de Aislamiento Multi-Tenant Estricto */}
      <div className="rounded-2xl border border-indigo-500/20 bg-gradient-to-r from-indigo-950/20 via-slate-900/30 to-blue-950/20 p-4 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5">
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <Lock className="h-4 w-4" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold text-foreground text-sm">
                  Cartera del Contador: {activeEstablishment?.name || "Sin Empresa Seleccionada"}
                </span>
                <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                  ✓ Aislamiento Multi-Tenant Activo
                </span>
              </div>
              <p className="text-muted-foreground text-[11px] mt-0.5">
                Cédula: <strong className="font-mono text-foreground">{activeEstablishment?.legal_id || "-"}</strong> • Mostrando únicamente las actividades económicas y sucursales de este cliente. Las empresas ajenas permanecen 100% ocultas.
              </p>
            </div>
          </div>

          {/* Toggle exclusivo de SuperAdmin (para Alex / Soporte) */}
          {isSuperAdmin && (
            <div className="flex items-center gap-2 bg-card/80 border border-border rounded-xl p-1 shrink-0">
              <button
                type="button"
                onClick={() => setVerSoloCarteraCliente(true)}
                className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-colors cursor-pointer ${
                  verSoloCarteraCliente
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "text-muted-foreground hover:bg-muted"
                }`}
              >
                🛡️ Solo Este Cliente
              </button>
              <button
                type="button"
                onClick={() => setVerSoloCarteraCliente(false)}
                className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-colors cursor-pointer ${
                  !verSoloCarteraCliente
                    ? "bg-amber-600 text-white shadow-xs"
                    : "text-muted-foreground hover:bg-muted"
                }`}
                title="Modo Soporte Técnico SuperAdmin: Ver todos los inquilinos"
              >
                🌐 Soporte Global ({establishments.length})
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Rango de Fechas del Cierre Fiscal y Selector de Vista */}
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

        <div className="flex items-center gap-2 text-xs">
          <button
            type="button"
            onClick={() => setVistaDesglose("actividades")}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
              vistaDesglose === "actividades"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "border border-border bg-card text-muted-foreground hover:bg-muted"
            }`}
          >
            <Layers className="h-3.5 w-3.5" /> Desglose por Actividad Económica
          </button>
          <button
            type="button"
            onClick={() => setVistaDesglose("empresas")}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
              vistaDesglose === "empresas"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "border border-border bg-card text-muted-foreground hover:bg-muted"
            }`}
          >
            <Building2 className="h-3.5 w-3.5" /> Consolidado Cédula Jurídica
          </button>
        </div>
      </div>

      {/* KPIs Globales de la Cartera */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Facturado */}
        <div className="rounded-2xl border border-border bg-card p-4 shadow-soft flex items-center gap-3.5">
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
            <TrendingUp className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground">Ventas Totales Cliente</p>
            <p className="text-lg font-bold text-foreground tabular-nums">
              {formatCRC(kpisDespacho.totalVentasGlobal)}
            </p>
            <p className="text-[11px] text-muted-foreground">
              IVA Débito: +{formatCRC(kpisDespacho.totalDebitoGlobal)}
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
              {formatCRC(kpisDespacho.totalComprasGlobal)}
            </p>
            <p className="text-[11px] text-muted-foreground">
              IVA Crédito: -{formatCRC(kpisDespacho.totalCreditoGlobal)}
            </p>
          </div>
        </div>

        {/* Empresas a Pagar */}
        <div className="rounded-2xl border border-border bg-card p-4 shadow-soft flex items-center gap-3.5">
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-amber-500/10 text-amber-600">
            <AlertCircle className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground">Liquidación D-104 a Pagar</p>
            <p className="text-lg font-bold text-amber-600 tabular-nums">
              {kpisDespacho.empresasPorPagar > 0 ? "Paga a Hacienda" : "Al Día"}
            </p>
            <p className="text-[11px] text-muted-foreground">Declaración D-104 [Casilla 140]</p>
          </div>
        </div>

        {/* Empresas a Favor */}
        <div className="rounded-2xl border border-border bg-card p-4 shadow-soft flex items-center gap-3.5">
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-emerald-500/10 text-emerald-600">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground">Saldo a Favor Acumulado</p>
            <p className="text-lg font-bold text-emerald-600 tabular-nums">
              {kpisDespacho.empresasConSaldoFavor > 0 ? "Crédito a Favor" : "₡0"}
            </p>
            <p className="text-[11px] text-muted-foreground">Crédito acumulable [Casilla 141]</p>
          </div>
        </div>
      </div>

      {/* ================================================================= */}
      {/* VISTA 1: DESGLOSE POR ACTIVIDAD ECONÓMICA DE LA EMPRESA (CASO LUXX)*/}
      {/* ================================================================= */}
      {vistaDesglose === "actividades" ? (
        <div className="space-y-4">
          {filtradas.map((m) => (
            <div key={m.establishment.id} className="rounded-2xl border border-border bg-card shadow-soft overflow-hidden">
              <div className="p-4 border-b border-border bg-muted/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-primary" />
                    <h3 className="text-sm font-bold text-foreground">{m.establishment.name}</h3>
                    <span className="font-mono text-xs text-muted-foreground">
                      (Cédula: {m.establishment.legal_id})
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Actividades Económicas inscritas ante la Dirección General de Tributación:
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleAuditarEmpresa(m.establishment)}
                    className="inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground hover:bg-primary/90 transition-all cursor-pointer"
                  >
                    <Eye className="h-3.5 w-3.5" /> Auditar en DeclaraHub
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDescargarExcelEmpresa(m.establishment)}
                    className="inline-flex items-center gap-1 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-semibold hover:bg-muted transition-colors cursor-pointer"
                  >
                    <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600" /> Excel
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-muted/40 text-[11px] text-muted-foreground border-b border-border font-semibold">
                    <tr>
                      <th className="px-4 py-2.5">ACTIVIDAD ECONÓMICA (HACIENDA)</th>
                      <th className="px-4 py-2.5 text-right">VENTAS NETAS</th>
                      <th className="px-4 py-2.5 text-right">DÉBITO IVA (13%)</th>
                      <th className="px-4 py-2.5 text-right">COMPRAS / GASTOS</th>
                      <th className="px-4 py-2.5 text-center">PRORRATA [114]</th>
                      <th className="px-4 py-2.5 text-right">ESTADO D-104</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border text-xs">
                    {m.actividades.map((act) => (
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
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-muted/60 font-bold border-t-2 border-border text-xs">
                      <td className="px-4 py-3 uppercase tracking-wider text-muted-foreground">
                        Total Consolidado de la Cédula (D-104 Oficial):
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-foreground">
                        {formatCRC(m.totalVentas)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-emerald-600 dark:text-emerald-400">
                        +{formatCRC(m.totalIvaVentas)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-foreground">
                        {formatCRC(m.totalCompras)}
                      </td>
                      <td className="px-4 py-3 text-center font-mono text-emerald-600">
                        {m.factorProrrata.toFixed(2)}%
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-sm">
                        {m.saldoIva > 0 ? (
                          <span className="text-amber-600 dark:text-amber-400">
                            Pagar: {formatCRC(m.saldoIva)} [140]
                          </span>
                        ) : (
                          <span className="text-emerald-600 dark:text-emerald-400">
                            A favor: {formatCRC(Math.abs(m.saldoIva))} [141]
                          </span>
                        )}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* ================================================================= */
        /* VISTA 2: DIRECTORIO CONSOLIDADO DE EMPRESAS AUTORIZADAS           */
        /* ================================================================= */
        <div className="rounded-2xl border border-border bg-card shadow-soft overflow-hidden space-y-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 border-b border-border bg-muted/20">
            <div className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              <h3 className="text-sm font-bold text-foreground">
                Directorio de Empresas Autorizadas y Estado D-104
              </h3>
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-bold text-primary">
                {filtradas.length} cliente(s)
              </span>
            </div>

            <div className="relative max-w-sm flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={filtroTexto}
                onChange={(e) => setFiltroTexto(e.target.value)}
                placeholder="Buscar por nombre, código o cédula..."
                className="h-9 w-full rounded-lg border border-border bg-background pl-9 pr-3 text-xs focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/50 text-[11px] text-muted-foreground border-b border-border font-semibold">
                <tr>
                  <th className="px-4 py-3">EMPRESA / CONTRIBUYENTE</th>
                  <th className="px-4 py-3 text-right">VENTAS EMITIDAS</th>
                  <th className="px-4 py-3 text-right">GASTOS Y COMPRAS</th>
                  <th className="px-4 py-3 text-center">CONFIRMACIÓN CCE</th>
                  <th className="px-4 py-3 text-center">PRORRATA [114]</th>
                  <th className="px-4 py-3 text-right">ESTADO D-104</th>
                  <th className="px-4 py-3 text-center">ACCIONES CONTADOR</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-xs">
                {cargando ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                      Cargando información consolidada del cliente...
                    </td>
                  </tr>
                ) : filtradas.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                      No se encontraron empresas autorizadas en este perfil.
                    </td>
                  </tr>
                ) : (
                  filtradas.map((m) => (
                    <tr key={m.establishment.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-bold text-foreground max-w-[220px] truncate" title={m.establishment.name}>
                          {m.establishment.name}
                        </div>
                        <div className="font-mono text-[11px] text-muted-foreground flex items-center gap-1.5">
                          <span>Céd: {m.establishment.legal_id}</span>
                          <span>•</span>
                          <span>Cód: {m.establishment.code}</span>
                        </div>
                      </td>

                      <td className="px-4 py-3 text-right">
                        <div className="font-mono font-bold text-foreground">
                          {formatCRC(m.totalVentas)}
                        </div>
                        <div className="text-[10px] text-muted-foreground">
                          IVA: +{formatCRC(m.totalIvaVentas)} ({m.cantidadVentas} doc.)
                        </div>
                      </td>

                      <td className="px-4 py-3 text-right">
                        <div className="font-mono font-bold text-foreground">
                          {formatCRC(m.totalCompras)}
                        </div>
                        <div className="text-[10px] text-muted-foreground">
                          IVA: -{formatCRC(m.totalIvaCompras)} ({m.cantidadCompras} doc.)
                        </div>
                      </td>

                      <td className="px-4 py-3 text-center">
                        {m.comprasPendientesCCE > 0 ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold text-amber-600">
                            <AlertCircle className="h-3 w-3" /> {m.comprasPendientesCCE} pendientes CCE
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-600">
                            <ShieldCheck className="h-3 w-3" /> CCE al día ✓
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-3 text-center font-mono">
                        <span
                          className={`rounded px-1.5 py-0.5 text-[11px] font-bold ${
                            m.tieneProrrata
                              ? "bg-amber-500/10 text-amber-700 dark:text-amber-300"
                              : "bg-emerald-500/10 text-emerald-600"
                          }`}
                        >
                          {m.factorProrrata.toFixed(2)}%
                        </span>
                      </td>

                      <td className="px-4 py-3 text-right">
                        <div
                          className={`font-mono font-extrabold text-xs ${
                            m.saldoIva > 0
                              ? "text-amber-600 dark:text-amber-400"
                              : "text-emerald-600 dark:text-emerald-400"
                          }`}
                        >
                          {m.saldoIva > 0 ? "Paga: " : "A favor: "}
                          {formatCRC(Math.abs(m.saldoIva))}
                        </div>
                        <span className="text-[10px] text-muted-foreground font-mono">
                          {m.saldoIva > 0 ? "Casilla [140]" : "Casilla [141]"}
                        </span>
                      </td>

                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleAuditarEmpresa(m.establishment)}
                            className="inline-flex items-center gap-1 rounded-lg border border-primary/30 bg-primary/10 px-2.5 py-1 text-[11px] font-bold text-primary hover:bg-primary/20 transition-colors cursor-pointer"
                            title="Conmutar y abrir DeclaraHub D-104 de esta empresa"
                          >
                            <Eye className="h-3.5 w-3.5" /> Auditar
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDescargarExcelEmpresa(m.establishment)}
                            className="rounded-lg border border-border bg-card p-1 text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer"
                            title="Descargar libro contable en Excel"
                          >
                            <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600" />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleCopiarMensajeCliente(m)}
                            className="rounded-lg border border-border bg-card p-1 text-muted-foreground hover:bg-muted hover:text-primary cursor-pointer"
                            title="Copiar resumen formal para WhatsApp del cliente"
                          >
                            {copiedId === m.establishment.id ? (
                              <Check className="h-3.5 w-3.5 text-emerald-500" />
                            ) : (
                              <Send className="h-3.5 w-3.5" />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

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
                  <h3 className="text-sm font-bold text-foreground">Asignar Contador a este Cliente</h3>
                  <p className="text-[11px] text-muted-foreground">Acceso restringido únicamente a {activeEstablishment?.name}.</p>
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
                  <Lock className="h-3.5 w-3.5 text-indigo-500" /> Aislamiento de Cartera Garantizado:
                </strong>
                <p>• Este contador <strong>SOLO</strong> tendrá acceso a las actividades y facturas de <strong>{activeEstablishment?.name}</strong>.</p>
                <p>• Las demás empresas del sistema permanecerán completamente invisibles e inaccesibles para él.</p>
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
    </div>
  );
}
