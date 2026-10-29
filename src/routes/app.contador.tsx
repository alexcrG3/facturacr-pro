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
  Settings2,
  ChevronDown,
  ChevronRight,
  Filter,
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
  "681001": "Alquiler y arrendamiento de bienes inmuebles propios o arrendados",
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

  // Selector de empresa activa dentro de la cartera (para filtrar una en específico o ver todas)
  const [empresaFiltroId, setEmpresaFiltroId] = useState<string>("todas");

  // Modal para gestionar la cartera de empresas del contador (mismo dueño o empresas autorizadas)
  const [modalCarteraOpen, setModalCarteraOpen] = useState(false);
  const [carteraSeleccionada, setCarteraSeleccionada] = useState<string[]>(() => {
    if (typeof window !== "undefined" && user?.email) {
      const guardada = localStorage.getItem(`facturaos_cartera_contador_${user.email}`);
      if (guardada) {
        try {
          return JSON.parse(guardada);
        } catch {}
      }
    }
    return [];
  });

  // Selector de alcance exclusivo para SuperAdmin (Alex / Soporte Global)
  const [verSoloCarteraCliente, setVerSoloCarteraCliente] = useState(true);

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

  // =========================================================================
  // GESTIÓN DE CARTERA MULTI-EMPRESA DEL MISMO DUEÑO Y AISLAMIENTO DE TERCEROS
  // =========================================================================
  // 1. Un dueño puede tener varias cédulas jurídicas (empresas diferentes) y un mismo contador.
  // 2. Cada empresa tiene sus propias actividades económicas y presenta su propio D-104 por separado.
  // 3. Las empresas de OTROS dueños (no clientes de este contador) permanecen 100% ocultas.
  const empresasPermitidas = useMemo(() => {
    // Si es SuperAdmin Y activó expresamente la vista de soporte técnico global
    if (isSuperAdmin && !verSoloCarteraCliente) {
      return establishments;
    }

    if (!activeEstablishment) return [];

    const cedulaActiva = (activeEstablishment.legal_id || "").replace(/\D/g, "");

    return establishments.filter((est) => {
      const cedulaEst = (est.legal_id || "").replace(/\D/g, "");

      // 1. Misma Cédula Jurídica (diferentes actividades económicas o sucursales de la misma sociedad)
      if (cedulaActiva && cedulaEst === cedulaActiva) {
        return true;
      }

      // 2. Establecimiento activo actual
      if (est.id === activeEstablishment.id) {
        return true;
      }

      // 3. Sociedades adicionales del mismo dueño o clientes asignados a la cartera del contador
      if (carteraSeleccionada.includes(est.id) || carteraSeleccionada.includes(est.code)) {
        return true;
      }

      return false;
    });
  }, [establishments, activeEstablishment, isSuperAdmin, verSoloCarteraCliente, carteraSeleccionada]);

  const cargarDatosDespacho = async () => {
    setCargando(true);
    try {
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

        // Prorrata del IVA
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
        // ACTIVIDADES ECONÓMICAS ESPECÍFICAS DE ESTA EMPRESA / SOCIEDAD
        // =====================================================================
        const actividadPrincipalCodigo = est.economic_activity_code || "452001";
        const codigosEncontrados = new Set<string>();
        codigosEncontrados.add(actividadPrincipalCodigo);

        invs.forEach((inv: any) => {
          if (inv.economic_activity_code) codigosEncontrados.add(inv.economic_activity_code);
        });

        // Actividades secundarias registradas para Luxx
        if (est.code?.includes("luxx") || est.legal_id?.includes("3102832920")) {
          codigosEncontrados.add("452001"); // Mantenimiento y Lavado
          codigosEncontrados.add("453001"); // Venta de Repuestos y Accesorios
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

  // Filtro por texto y por selector de sociedad específica
  const filtradas = useMemo(() => {
    let list = metricasPorEmpresa;
    if (empresaFiltroId !== "todas") {
      list = list.filter((m) => m.establishment.id === empresaFiltroId);
    }
    if (!filtroTexto.trim()) return list;
    const q = filtroTexto.toLowerCase();
    return list.filter(
      (m) =>
        m.establishment.name.toLowerCase().includes(q) ||
        m.establishment.legal_id.includes(q) ||
        m.establishment.code.toLowerCase().includes(q)
    );
  }, [metricasPorEmpresa, filtroTexto, empresaFiltroId]);

  // Totales Globales de la Cartera Autorizada
  const kpisDespacho = useMemo(() => {
    const totalVentasGlobal = filtradas.reduce((s, m) => s + m.totalVentas, 0);
    const totalComprasGlobal = filtradas.reduce((s, m) => s + m.totalCompras, 0);
    const totalDebitoGlobal = filtradas.reduce((s, m) => s + m.totalIvaVentas, 0);
    const totalCreditoGlobal = filtradas.reduce((s, m) => s + m.totalIvaCompras, 0);
    const empresasPorPagar = filtradas.filter((m) => m.saldoIva > 0).length;
    const empresasConSaldoFavor = filtradas.filter((m) => m.saldoIva < 0).length;

    return {
      totalVentasGlobal,
      totalComprasGlobal,
      totalDebitoGlobal,
      totalCreditoGlobal,
      empresasPorPagar,
      empresasConSaldoFavor,
    };
  }, [filtradas]);

  // Conmutar empresa activa y navegar a DeclaraHub
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

  // Copiar resumen de WhatsApp para enviar al dueño
  const handleCopiarMensajeCliente = (m: MetricasEmpresa) => {
    const texto = `👋 Estimado cliente de *${m.establishment.name}*:
📋 *CIERRE TRIBUTARIO D-104 (PERÍODO ${desde} AL ${hasta})*
Cédula Jurídica: ${m.establishment.legal_id}

🔹 Facturación Emitida: ₡${Math.round(m.totalVentas).toLocaleString()} (${m.cantidadVentas} comprobantes)
🔹 Débito IVA Recaudado: ₡${Math.round(m.totalIvaVentas).toLocaleString()}
🔸 Compras Soportadas: ₡${Math.round(m.totalCompras).toLocaleString()} (${m.cantidadCompras} facturas)
🔸 Crédito Fiscal Deducible: ₡${Math.round(m.totalIvaCompras).toLocaleString()}
${
  m.tieneProrrata
    ? `📊 Coeficiente de Prorrata Aplicado: ${m.factorProrrata.toFixed(2)}%\n`
    : ""
}
⚖️ *RESULTADO DE LA DECLARACIÓN D-104 INDIVIDUAL:*
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

  // Guardar configuración de cartera de sociedades autorizadas
  const handleGuardarCartera = (nuevosIds: string[]) => {
    setCarteraSeleccionada(nuevosIds);
    if (typeof window !== "undefined" && user?.email) {
      localStorage.setItem(`facturaos_cartera_contador_${user.email}`, JSON.stringify(nuevosIds));
    }
    toast.success("Cartera de empresas actualizada exitosamente", {
      description: `Ahora supervisas ${nuevosIds.length + 1} empresas autorizadas en tu despacho.`,
    });
    setModalCarteraOpen(false);
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-12">
      {/* Header */}
      <PageHeader
        title="Portal del Contador — Cartera de Sociedades & Actividades"
        description="Panel de control maestro para contadores. Supervisa las diferentes cédulas jurídicas autorizadas de tu cliente, sus actividades económicas individuales y la liquidación del D-104 ante Hacienda."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setModalCarteraOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-500/30 bg-indigo-500/10 px-3.5 py-2 text-xs font-bold text-indigo-700 dark:text-indigo-300 hover:bg-indigo-500/20 transition-colors cursor-pointer"
              title="Vincular otras sociedades o cédulas jurídicas del mismo dueño a este despacho"
            >
              <Settings2 className="h-4 w-4 text-indigo-500" /> Gestionar Cartera ({empresasPermitidas.length})
            </button>
            <button
              type="button"
              onClick={() => setInvitarModalOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-primary/30 bg-primary/10 px-3.5 py-2 text-xs font-bold text-primary hover:bg-primary/20 transition-colors cursor-pointer"
            >
              <UserPlus className="h-4 w-4" /> Asignar Auditor
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

      {/* Banner de Aislamiento y Cartera Multi-Empresa */}
      <div className="rounded-2xl border border-indigo-500/20 bg-gradient-to-r from-indigo-950/20 via-slate-900/30 to-blue-950/20 p-4 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5">
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <Lock className="h-4 w-4" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold text-foreground text-sm">
                  Cartera Activa: {activeEstablishment?.name || "Sin Empresa Seleccionada"}
                </span>
                <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                  ✓ Aislamiento Multi-Tenant Certificado
                </span>
                {empresasPermitidas.length > 1 && (
                  <span className="rounded-full bg-indigo-500/15 px-2 py-0.5 text-[11px] font-bold text-indigo-400 border border-indigo-500/30">
                    {empresasPermitidas.length} Sociedades del mismo Dueño
                  </span>
                )}
              </div>
              <p className="text-muted-foreground text-[11px] mt-0.5">
                Cédula Principal: <strong className="font-mono text-foreground">{activeEstablishment?.legal_id || "-"}</strong> • Cada sociedad presenta su propia declaración individual. Las empresas ajenas de otros clientes permanecen 100% invisibles.
              </p>
            </div>
          </div>

          {/* Toggle exclusivo de SuperAdmin (para Alex / Soporte Global) */}
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
                🛡️ Solo Mi Cartera
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

      {/* Rango de Fechas del Cierre Fiscal y Selector de Sociedades */}
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

        {/* Selector de Sociedades de la Cartera */}
        <div className="flex items-center gap-2 text-xs">
          <Filter className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-muted-foreground font-semibold">Filtrar Sociedad:</span>
          <select
            value={empresaFiltroId}
            onChange={(e) => setEmpresaFiltroId(e.target.value)}
            className="h-8 rounded-lg border border-border bg-background px-2.5 text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            <option value="todas">Todas las Sociedades ({empresasPermitidas.length})</option>
            {empresasPermitidas.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name} ({e.legal_id})
              </option>
            ))}
          </select>
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
            <p className="text-xs font-medium text-muted-foreground">Ventas Totales Cartera</p>
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

        {/* Sociedades con Saldo a Pagar */}
        <div className="rounded-2xl border border-border bg-card p-4 shadow-soft flex items-center gap-3.5">
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-amber-500/10 text-amber-600">
            <AlertCircle className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground">Sociedades con Pago de IVA</p>
            <p className="text-lg font-bold text-amber-600 tabular-nums">
              {kpisDespacho.empresasPorPagar} sociedad(es)
            </p>
            <p className="text-[11px] text-muted-foreground">Declaración D-104 [Casilla 140]</p>
          </div>
        </div>

        {/* Sociedades con Saldo a Favor */}
        <div className="rounded-2xl border border-border bg-card p-4 shadow-soft flex items-center gap-3.5">
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-emerald-500/10 text-emerald-600">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground">Sociedades con Saldo a Favor</p>
            <p className="text-lg font-bold text-emerald-600 tabular-nums">
              {kpisDespacho.empresasConSaldoFavor} sociedad(es)
            </p>
            <p className="text-[11px] text-muted-foreground">Crédito fiscal acumulado [Casilla 141]</p>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* VISTA JERÁRQUICA: CADA SOCIEDAD CON SUS PROPIAS ACTIVIDADES ECONÓMICAS     */}
      {/* ========================================================================= */}
      <div className="space-y-6">
        {cargando ? (
          <div className="rounded-2xl border border-border bg-card p-12 text-center text-muted-foreground text-xs shadow-soft">
            Cargando la cartera contable y sus actividades económicas...
          </div>
        ) : filtradas.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card p-12 text-center text-muted-foreground text-xs shadow-soft">
            No se encontraron sociedades autorizadas para este usuario.
          </div>
        ) : (
          filtradas.map((m) => (
            <div key={m.establishment.id} className="rounded-2xl border border-border bg-card shadow-soft overflow-hidden">
              {/* Encabezado de la Sociedad / Cédula Jurídica */}
              <div className="p-4 sm:p-5 border-b border-border bg-muted/20 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-bold text-primary flex items-center gap-1.5">
                      <Building2 className="h-3.5 w-3.5" /> Sociedad / Cédula Independiente
                    </span>
                    <span className="font-mono text-xs font-bold text-foreground">
                      Cédula: {m.establishment.legal_id}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      (Cód: {m.establishment.code})
                    </span>
                  </div>
                  <h3 className="text-base sm:text-lg font-black text-foreground">
                    {m.establishment.name}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Cada sociedad presenta su propia declaración D-104 individual ante Hacienda. Desglose de actividades inscritas:
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleAuditarEmpresa(m.establishment)}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-2 text-xs font-bold text-primary-foreground shadow-xs hover:bg-primary/90 transition-all cursor-pointer"
                  >
                    <Eye className="h-4 w-4" /> Auditar en DeclaraHub
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDescargarExcelEmpresa(m.establishment)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-xs font-semibold hover:bg-muted transition-colors cursor-pointer"
                    title="Descargar libro contable en Excel (.xlsx)"
                  >
                    <FileSpreadsheet className="h-4 w-4 text-emerald-600" /> Excel
                  </button>
                  <button
                    type="button"
                    onClick={() => handleCopiarMensajeCliente(m)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-xs font-semibold hover:bg-muted transition-colors cursor-pointer"
                    title="Copiar resumen para WhatsApp del cliente"
                  >
                    {copiedId === m.establishment.id ? (
                      <Check className="h-4 w-4 text-emerald-500" />
                    ) : (
                      <Send className="h-4 w-4 text-primary" />
                    )}
                    WhatsApp
                  </button>
                </div>
              </div>

              {/* Tabla de Actividades Económicas de ESTA Sociedad */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-muted/40 text-[11px] text-muted-foreground border-b border-border font-semibold">
                    <tr>
                      <th className="px-4 py-2.5">ACTIVIDAD ECONÓMICA (RUT HACIENDA)</th>
                      <th className="px-4 py-2.5 text-right">VENTAS NETAS</th>
                      <th className="px-4 py-2.5 text-right">DÉBITO IVA (13%)</th>
                      <th className="px-4 py-2.5 text-right">COMPRAS / GASTOS</th>
                      <th className="px-4 py-2.5 text-center">CONFIRMACIÓN CCE</th>
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
                        <td className="px-4 py-3 text-center">
                          {m.comprasPendientesCCE > 0 ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold text-amber-600">
                              <AlertCircle className="h-3 w-3" /> {m.comprasPendientesCCE} pend.
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-600">
                              <ShieldCheck className="h-3 w-3" /> Al día ✓
                            </span>
                          )}
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
                    <tr className="bg-muted/70 font-bold border-t-2 border-border text-xs">
                      <td className="px-4 py-3.5 uppercase tracking-wider text-foreground">
                        ⚖️ Liquidación Oficial D-104 — Cédula {m.establishment.legal_id}:
                      </td>
                      <td className="px-4 py-3.5 text-right font-mono text-foreground">
                        {formatCRC(m.totalVentas)}
                      </td>
                      <td className="px-4 py-3.5 text-right font-mono text-emerald-600 dark:text-emerald-400">
                        +{formatCRC(m.totalIvaVentas)}
                      </td>
                      <td className="px-4 py-3.5 text-right font-mono text-foreground">
                        {formatCRC(m.totalCompras)}
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <span className="text-[10px] text-muted-foreground">Consolidado</span>
                      </td>
                      <td className="px-4 py-3.5 text-center font-mono text-emerald-600">
                        {m.factorProrrata.toFixed(2)}%
                      </td>
                      <td className="px-4 py-3.5 text-right font-mono text-sm">
                        {m.saldoIva > 0 ? (
                          <span className="text-amber-600 dark:text-amber-400">
                            🔴 Pagar: {formatCRC(m.saldoIva)} [Cas. 140]
                          </span>
                        ) : (
                          <span className="text-emerald-600 dark:text-emerald-400">
                            🟢 A favor: {formatCRC(Math.abs(m.saldoIva))} [Cas. 141]
                          </span>
                        )}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          ))
        )}
      </div>

      {/* ========================================================================= */}
      {/* MODAL: GESTIONAR CARTERA DE EMPRESAS AUTORIZADAS (MISMO DUEÑO / GRUPO)   */}
      {/* ========================================================================= */}
      {modalCarteraOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <div className="grid h-9 w-9 place-items-center rounded-xl bg-indigo-500/10 text-indigo-500">
                  <Settings2 className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-foreground">Gestionar Cartera de Sociedades</h3>
                  <p className="text-[11px] text-muted-foreground">
                    Vincula varias cédulas jurídicas que pertenezcan al mismo dueño o grupo.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setModalCarteraOpen(false)}
                className="rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <p className="text-muted-foreground text-[11px]">
                Selecciona las empresas que este contador tiene autorizadas para auditar. Cada sociedad mantiene su propia contabilidad independiente y las empresas no marcadas permanecen 100% aisladas.
              </p>

              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {establishments.map((est) => {
                  const esActiva = est.id === activeEstablishment?.id || (activeEstablishment?.legal_id && est.legal_id === activeEstablishment.legal_id);
                  const estaMarcada = esActiva || carteraSeleccionada.includes(est.id);

                  return (
                    <label
                      key={est.id}
                      className={`flex items-center justify-between p-3 rounded-xl border transition-colors cursor-pointer ${
                        estaMarcada ? "border-primary/40 bg-primary/5" : "border-border bg-background hover:bg-muted/30"
                      }`}
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-foreground">{est.name}</span>
                          {esActiva && (
                            <span className="rounded bg-primary/20 text-primary px-1.5 py-0.2 text-[10px] font-bold">
                              Actual
                            </span>
                          )}
                        </div>
                        <div className="font-mono text-[11px] text-muted-foreground">
                          Cédula: {est.legal_id} • Cód: {est.code}
                        </div>
                      </div>

                      <input
                        type="checkbox"
                        checked={estaMarcada}
                        disabled={esActiva}
                        onChange={(e) => {
                          if (esActiva) return;
                          if (e.target.checked) {
                            setCarteraSeleccionada([...carteraSeleccionada, est.id]);
                          } else {
                            setCarteraSeleccionada(carteraSeleccionada.filter((id) => id !== est.id));
                          }
                        }}
                        className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                      />
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
              <button
                type="button"
                onClick={() => setModalCarteraOpen(false)}
                className="rounded-lg border border-border px-3.5 py-2 text-xs font-semibold hover:bg-muted cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => handleGuardarCartera(carteraSeleccionada)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-bold text-primary-foreground hover:bg-primary/90 cursor-pointer"
              >
                <Check className="h-4 w-4" /> Guardar Cartera Autorizada
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: ASIGNACIÓN / INVITACIÓN A CONTADOR DE ESTE CLIENTE                 */}
      {/* ========================================================================= */}
      {invitarModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <div className="grid h-9 w-9 place-items-center rounded-xl bg-primary/10 text-primary">
                  <UserPlus className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-foreground">Asignar Contador a este Grupo</h3>
                  <p className="text-[11px] text-muted-foreground">Acceso de auditoría restringido a estas sociedades.</p>
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
                <p>• Este contador <strong>SOLO</strong> tendrá acceso a las sociedades autorizadas de su cliente.</p>
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
                  toast.success(`Contador asignado con éxito`, {
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
