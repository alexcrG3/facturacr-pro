import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo, useEffect } from "react";
import {
  FileSpreadsheet,
  FileCode,
  FolderArchive,
  Calendar,
  Filter,
  Search,
  Download,
  Copy,
  Check,
  Building2,
  TrendingUp,
  Receipt,
  Sparkles,
  RefreshCw,
  Eye,
  Plus,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  FileText,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/common/PageHeader";
import {
  TIPOS_REPORTE,
  TipoReporteId,
  cargarComprobantesContablesAsync,
  limpiarComprobantesContables,
  generarExcelContador,
  ComprobanteContable,
} from "@/lib/accounting-reports";
import { ImportXmlModal } from "@/components/reports/ImportXmlModal";
import { DeclaraHubSimulator } from "@/components/reports/DeclaraHubSimulator";
import { formatCRC } from "@/lib/mock-data";
import { useApp } from "@/contexts/AppContext";

export const Route = createFileRoute("/app/reports")({
  component: ReportsPage,
});

function ReportsPage() {
  const { activeEstablishment } = useApp();
  // Rango de fechas por defecto (Mes actual)
  const today = new Date();
  const firstDayThisMonth = new Date(today.getFullYear(), today.getMonth(), 1)
    .toISOString()
    .slice(0, 10);
  const lastDayThisMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0)
    .toISOString()
    .slice(0, 10);

  const [desde, setDesde] = useState(firstDayThisMonth);
  const [hasta, setHasta] = useState(lastDayThisMonth);
  const [vistaActiva, setVistaActiva] = useState<"declarahub" | "libro">("declarahub");
  const [tipoReporte, setTipoReporte] = useState<TipoReporteId>("DETALLADO_COMPROBANTES");
  const [comprobantes, setComprobantes] = useState<ComprobanteContable[]>([]);
  const [searchFilter, setSearchFilter] = useState("");
  const [copiedClave, setCopiedClave] = useState<string | null>(null);

  // Modal de Importar XML / Expediente
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importModalMode, setImportModalMode] = useState<"carpeta" | "expediente">("carpeta");

  // Cargar datos
  const refrescarComprobantes = async () => {
    if (!activeEstablishment?.id) {
      setComprobantes([]);
      return;
    }
    const list = await cargarComprobantesContablesAsync(activeEstablishment.id, {
      name: activeEstablishment.name,
      legalId: activeEstablishment.legal_id,
    });
    setComprobantes(list);
  };

  const handleLimpiarCompras = async () => {
    if (confirm("¿Deseas vaciar todos los comprobantes de compras y gastos almacenados?")) {
      limpiarComprobantesContables();
      await refrescarComprobantes();
      toast.info("Comprobantes de compras eliminados. La lista está en 0.");
    }
  };

  useEffect(() => {
    refrescarComprobantes();
  }, [activeEstablishment]);

  // Presets rápidos de fecha
  const setPeriodoRapido = (tipo: "este_mes" | "mes_anterior" | "este_ano" | "todo") => {
    const now = new Date();
    if (tipo === "este_mes") {
      setDesde(new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10));
      setHasta(new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10));
    } else if (tipo === "mes_anterior") {
      setDesde(new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().slice(0, 10));
      setHasta(new Date(now.getFullYear(), now.getMonth(), 0).toISOString().slice(0, 10));
    } else if (tipo === "este_ano") {
      setDesde(new Date(now.getFullYear(), 0, 1).toISOString().slice(0, 10));
      setHasta(new Date(now.getFullYear(), 11, 31).toISOString().slice(0, 10));
    } else if (tipo === "todo") {
      setDesde("2020-01-01");
      setHasta("2030-12-31");
    }
    toast.info("Rango de fechas actualizado");
  };

  // Filtrado de comprobantes
  const filtrados = useMemo(() => {
    return comprobantes.filter((c) => {
      const matchFecha = c.fechaEmision >= desde && c.fechaEmision <= hasta;
      if (!matchFecha) return false;

      // Filtro por tipo de reporte
      if (
        (tipoReporte === "COMPRAS_DETALLADAS" ||
          tipoReporte === "RESUMEN_COMPRAS" ||
          tipoReporte === "IVA_COMPRAS" ||
          tipoReporte === "COMPRAS_PROVEEDOR") &&
        c.tipoOperacion !== "COMPRA"
      ) {
        return false;
      }
      if (
        (tipoReporte === "VENTAS_DETALLADAS" ||
          tipoReporte === "RESUMEN_VENTAS" ||
          tipoReporte === "IVA_VENTAS" ||
          tipoReporte === "VENTAS_CLIENTE") &&
        c.tipoOperacion !== "VENTA"
      ) {
        return false;
      }
      if (tipoReporte === "NOTAS_CREDITO" && c.tipoDoc !== "NOTA_CREDITO") {
        return false;
      }
      if (tipoReporte === "NOTAS_DEBITO" && c.tipoDoc !== "NOTA_DEBITO") {
        return false;
      }

      // Filtro por texto
      if (searchFilter.trim()) {
        const q = searchFilter.toLowerCase();
        return (
          c.clave.toLowerCase().includes(q) ||
          c.emisorNombre.toLowerCase().includes(q) ||
          c.emisorCedula.includes(q) ||
          c.receptorNombre.toLowerCase().includes(q) ||
          c.receptorCedula.includes(q) ||
          c.consecutivo.includes(q) ||
          c.tipoDoc.toLowerCase().includes(q)
        );
      }

      return true;
    });
  }, [comprobantes, desde, hasta, tipoReporte, searchFilter]);

  // Cálculos contables y liquidación de IVA (D-104)
  const totalesContables = useMemo(() => {
    const ventas = filtrados.filter((x) => x.tipoOperacion === "VENTA");
    const compras = filtrados.filter((x) => x.tipoOperacion === "COMPRA");

    const totalVentasMonto = ventas.reduce((s, x) => s + x.totalComprobante, 0);
    const totalComprasMonto = compras.reduce((s, x) => s + x.totalComprobante, 0);

    const ivaDebitoVentas = ventas.reduce((s, x) => s + (x.totalIva || 0), 0);
    const ivaCreditoCompras = compras.reduce((s, x) => s + (x.totalIva || 0), 0);
    const saldoIva = ivaDebitoVentas - ivaCreditoCompras;

    return {
      totalVentasMonto,
      totalComprasMonto,
      ivaDebitoVentas,
      ivaCreditoCompras,
      saldoIva,
      cantidadVentas: ventas.length,
      cantidadCompras: compras.length,
    };
  }, [filtrados]);

  // Descargar Excel
  const handleDescargarExcel = () => {
    if (filtrados.length === 0) {
      toast.warning("No hay comprobantes en el periodo seleccionado para exportar.");
      return;
    }

    try {
      const empresaConfig = JSON.parse(
        localStorage.getItem("facturacr_company_profile") || "{}"
      );
      const empresa = {
        nombre: empresaConfig.name || "GRUPO G TRES COMERCIALIZADORA INTERAMERICANA SOCIEDAD ANONIMA",
        identificacion: empresaConfig.legalId || "3101483899",
      };

      generarExcelContador(tipoReporte, desde, hasta, comprobantes, empresa);
      toast.success("¡Reporte generado en Excel exitosamente!", {
        description: `Se descargó el archivo con ${filtrados.length} comprobantes contables.`,
      });
    } catch (err) {
      toast.error("Error al generar el archivo de Excel");
      console.error(err);
    }
  };

  const handleCopiarClave = (clave: string) => {
    navigator.clipboard.writeText(clave);
    setCopiedClave(clave);
    toast.success("Clave de 50 dígitos copiada al portapapeles");
    setTimeout(() => setCopiedClave(null), 2000);
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-12">
      {/* Header */}
      <PageHeader
        title="DeclaraHub — Contabilidad y D-104"
        description="Portal oficial de conciliación contable, borrador de declaración mensual D-104 de Hacienda CR y reportes en Excel."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setImportModalMode("expediente");
                setImportModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-xs font-semibold hover:bg-muted transition-colors"
            >
              <FileCode className="h-4 w-4 text-primary" /> Reconstruir datos desde XML
            </button>
            <button
              type="button"
              onClick={() => {
                setImportModalMode("carpeta");
                setImportModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-xs font-semibold hover:bg-muted transition-colors"
            >
              <FolderArchive className="h-4 w-4 text-amber-500" /> Analizar / Importar carpeta de XML
            </button>
            <button
              type="button"
              onClick={handleDescargarExcel}
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-soft hover:bg-emerald-700 transition-all hover:scale-[1.02]"
            >
              <FileSpreadsheet className="h-4 w-4" /> GENERAR REPORTE EN EXCEL
            </button>
          </div>
        }
      />

      {/* Tabs Selector: DeclaraHub vs Libro de Comprobantes */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setVistaActiva("declarahub")}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              vistaActiva === "declarahub"
                ? "bg-primary text-primary-foreground shadow-soft"
                : "bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            <Sparkles className="h-4 w-4" />
            DeclaraHub (Borrador D-104)
            <span className="rounded-full bg-emerald-500/20 text-emerald-400 px-2 py-0.5 text-[10px] font-extrabold uppercase">
              Hacienda CR
            </span>
          </button>

          <button
            type="button"
            onClick={() => setVistaActiva("libro")}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              vistaActiva === "libro"
                ? "bg-primary text-primary-foreground shadow-soft"
                : "bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            <FileSpreadsheet className="h-4 w-4" />
            Libro de Comprobantes & Excel
            <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-foreground">
              {filtrados.length}
            </span>
          </button>
        </div>

        {/* Período Rápido Compacto */}
        <div className="flex items-center gap-1.5 text-xs">
          <span className="text-muted-foreground font-medium mr-1 text-[11px]">Período:</span>
          <button
            type="button"
            onClick={() => setPeriodoRapido("este_mes")}
            className="rounded-lg border border-border bg-card px-2.5 py-1 text-[11px] font-medium hover:bg-muted"
          >
            Este mes
          </button>
          <button
            type="button"
            onClick={() => setPeriodoRapido("mes_anterior")}
            className="rounded-lg border border-border bg-card px-2.5 py-1 text-[11px] font-medium hover:bg-muted"
          >
            Mes anterior
          </button>
          <button
            type="button"
            onClick={() => setPeriodoRapido("este_ano")}
            className="rounded-lg border border-border bg-card px-2.5 py-1 text-[11px] font-medium hover:bg-muted"
          >
            Este año
          </button>
        </div>
      </div>

      {/* Rango de Fechas Activo */}
      <div className="flex flex-wrap items-center gap-3 bg-muted/20 border border-border rounded-xl px-4 py-2.5 text-xs">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <span className="font-semibold text-muted-foreground">Desde:</span>
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
        <div className="ml-auto text-xs text-muted-foreground">
          Empresa activa: <strong className="text-foreground">{activeEstablishment?.name || "Sin empresa seleccionada"}</strong> ({activeEstablishment?.legal_id || "-"})
        </div>
      </div>

      {vistaActiva === "declarahub" ? (
        <DeclaraHubSimulator
          comprobantes={filtrados}
          empresaNombre={activeEstablishment?.name || "Empresa Actual"}
          empresaCedula={activeEstablishment?.legal_id || ""}
          periodoDesde={desde}
          periodoHasta={hasta}
          onDescargarExcel={handleDescargarExcel}
        />
      ) : (
        <>
          {/* Panel de Filtro de Reporte en Vista Libro */}
          <div className="rounded-2xl border border-border bg-card p-6 shadow-soft space-y-5">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div className="sm:col-span-2">
                <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">
                  Tipo de reporte para exportar a Excel
                </label>
                <select
                  value={tipoReporte}
                  onChange={(e) => setTipoReporte(e.target.value as TipoReporteId)}
                  className="h-10 w-full rounded-xl border border-border bg-background px-3 text-xs font-semibold text-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20"
                >
                  {TIPOS_REPORTE.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-end">
                <button
                  type="button"
                  onClick={handleDescargarExcel}
                  className="h-10 w-full inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 text-xs font-bold text-primary-foreground shadow-soft hover:bg-primary/90 transition-all"
                >
                  <FileSpreadsheet className="h-4 w-4" /> GENERAR EXCEL
                </button>
              </div>
            </div>

            {comprobantes.some((c) => c.tipoOperacion === "COMPRA") && (
              <div className="flex justify-end pt-2 border-t border-border">
                <button
                  type="button"
                  onClick={handleLimpiarCompras}
                  className="inline-flex items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-1.5 text-xs font-semibold text-destructive hover:bg-destructive/20 transition-colors"
                >
                  <Trash2 className="h-3.5 w-3.5" /> LIMPIAR COMPRAS GUARDADAS
                </button>
              </div>
            )}
          </div>

      {/* Resumen Fiscal / Liquidación de IVA D-104 */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Ventas */}
        <div className="rounded-2xl border border-border bg-card p-4 shadow-soft flex items-center gap-3.5">
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
            <TrendingUp className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground">Ventas del Período</p>
            <p className="text-lg font-bold text-foreground tabular-nums">
              {formatCRC(totalesContables.totalVentasMonto)}
            </p>
            <p className="text-[11px] text-muted-foreground">
              {totalesContables.cantidadVentas} comprobantes emitidos
            </p>
          </div>
        </div>

        {/* Total Compras */}
        <div className="rounded-2xl border border-border bg-card p-4 shadow-soft flex items-center gap-3.5">
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-amber-500/10 text-amber-600">
            <Receipt className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground">Compras / Gastos Soportados</p>
            <p className="text-lg font-bold text-foreground tabular-nums">
              {formatCRC(totalesContables.totalComprasMonto)}
            </p>
            <p className="text-[11px] text-muted-foreground">
              {totalesContables.cantidadCompras} facturas de proveedores
            </p>
          </div>
        </div>

        {/* IVA Débito vs Crédito */}
        <div className="rounded-2xl border border-border bg-card p-4 shadow-soft flex items-center gap-3.5">
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-blue-500/10 text-blue-600">
            <FileText className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground">IVA Débito / Crédito</p>
            <div className="flex items-center gap-2 text-xs font-semibold tabular-nums mt-0.5">
              <span className="text-emerald-600">+{formatCRC(totalesContables.ivaDebitoVentas)}</span>
              <span className="text-muted-foreground">/</span>
              <span className="text-amber-600">-{formatCRC(totalesContables.ivaCreditoCompras)}</span>
            </div>
            <p className="text-[11px] text-muted-foreground">IVA Devengado vs Soportado</p>
          </div>
        </div>

        {/* Saldo D-104 */}
        <div
          className={`rounded-2xl border p-4 shadow-soft flex items-center gap-3.5 ${
            totalesContables.saldoIva >= 0
              ? "border-emerald-500/30 bg-emerald-500/10"
              : "border-blue-500/30 bg-blue-500/10"
          }`}
        >
          <div
            className={`grid h-12 w-12 shrink-0 place-items-center rounded-xl ${
              totalesContables.saldoIva >= 0
                ? "bg-emerald-500 text-white"
                : "bg-blue-600 text-white"
            }`}
          >
            <ShieldCheck className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              {totalesContables.saldoIva >= 0 ? "IVA a Pagar (Hacienda)" : "Saldo a Favor (Crédito)"}
            </p>
            <p className="text-lg font-extrabold text-foreground tabular-nums">
              {formatCRC(Math.abs(totalesContables.saldoIva))}
            </p>
            <p className="text-[11px] text-muted-foreground">Declaración mensual D-104</p>
          </div>
        </div>
      </div>

      {/* Tabla Interactiva de Comprobantes (Formato exacto a la hoja de Excel) */}
      <div className="rounded-2xl border border-border bg-card shadow-soft overflow-hidden">
        {/* Barra de Búsqueda y Resultados */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 border-b border-border bg-muted/20">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-foreground">
              {TIPOS_REPORTE.find((r) => r.id === tipoReporte)?.label}
            </h3>
            <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-bold text-primary">
              {filtrados.length} registros
            </span>
          </div>

          <div className="relative max-w-sm flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              placeholder="Buscar por cédula, nombre, clave o consecutivo…"
              className="h-9 w-full rounded-lg border border-border bg-background pl-9 pr-3 text-xs focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20"
            />
          </div>
        </div>

        {/* Tabla */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-muted/50 font-semibold text-muted-foreground border-b border-border">
              <tr>
                <th className="px-3.5 py-3 whitespace-nowrap">TIPO OPERACIÓN</th>
                <th className="px-3.5 py-3 whitespace-nowrap">TIPO DOC</th>
                <th className="px-3.5 py-3 whitespace-nowrap">ESTADO HACIENDA</th>
                <th className="px-3.5 py-3 whitespace-nowrap">CLAVE NUMÉRICA (50 DÍGITOS)</th>
                <th className="px-3.5 py-3 whitespace-nowrap">CÉDULA EMISOR</th>
                <th className="px-3.5 py-3 whitespace-nowrap">RAZÓN SOCIAL EMISOR</th>
                <th className="px-3.5 py-3 whitespace-nowrap">CÉDULA RECEPTOR</th>
                <th className="px-3.5 py-3 whitespace-nowrap">RAZÓN SOCIAL RECEPTOR</th>
                <th className="px-3.5 py-3 whitespace-nowrap">FECHA</th>
                <th className="px-3.5 py-3 whitespace-nowrap">MONEDA</th>
                <th className="px-3.5 py-3 whitespace-nowrap text-right">TOTAL</th>
                <th className="px-3.5 py-3 whitespace-nowrap text-right">IVA (13%)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border font-mono text-[11px]">
              {filtrados.length === 0 ? (
                <tr>
                  <td colSpan={12} className="px-4 py-8 text-center text-muted-foreground font-sans">
                    No se encontraron comprobantes en el rango de fechas seleccionado.
                  </td>
                </tr>
              ) : (
                filtrados.map((item) => (
                  <tr key={item.id} className="hover:bg-muted/30 transition-colors">
                    {/* Tipo Operación */}
                    <td className="px-3.5 py-2.5 whitespace-nowrap font-semibold">
                      <span
                        className={`rounded px-1.5 py-0.5 text-[10px] ${
                          item.tipoOperacion === "VENTA"
                            ? "bg-primary/10 text-primary"
                            : "bg-amber-500/10 text-amber-700 dark:text-amber-400"
                        }`}
                      >
                        {item.tipoOperacion}
                      </span>
                    </td>

                    {/* Tipo Doc */}
                    <td className="px-3.5 py-2.5 whitespace-nowrap font-medium text-foreground">
                      {item.tipoDoc}
                    </td>

                    {/* Estado */}
                    <td className="px-3.5 py-2.5 whitespace-nowrap">
                      <span
                        className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                          item.estadoHacienda === "ACEPTADO"
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                            : item.estadoHacienda === "RECHAZADO"
                            ? "bg-destructive/10 text-destructive"
                            : "bg-blue-500/10 text-blue-600"
                        }`}
                      >
                        {item.estadoHacienda}
                      </span>
                    </td>

                    {/* Clave */}
                    <td className="px-3.5 py-2.5 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] text-muted-foreground">
                          {item.clave.slice(0, 15)}...{item.clave.slice(-8)}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleCopiarClave(item.clave)}
                          className="text-muted-foreground hover:text-primary p-0.5"
                          title="Copiar clave completa de 50 dígitos"
                        >
                          {copiedClave === item.clave ? (
                            <Check className="h-3 w-3 text-emerald-500" />
                          ) : (
                            <Copy className="h-3 w-3" />
                          )}
                        </button>
                      </div>
                    </td>

                    {/* Emisor */}
                    <td className="px-3.5 py-2.5 whitespace-nowrap text-muted-foreground">
                      {item.emisorCedula}
                    </td>
                    <td className="px-3.5 py-2.5 max-w-[200px] truncate font-sans text-xs text-foreground" title={item.emisorNombre}>
                      {item.emisorNombre}
                    </td>

                    {/* Receptor */}
                    <td className="px-3.5 py-2.5 whitespace-nowrap text-muted-foreground">
                      {item.receptorCedula || "-"}
                    </td>
                    <td className="px-3.5 py-2.5 max-w-[200px] truncate font-sans text-xs text-foreground" title={item.receptorNombre}>
                      {item.receptorNombre}
                    </td>

                    {/* Fecha */}
                    <td className="px-3.5 py-2.5 whitespace-nowrap text-muted-foreground">
                      {item.fechaEmision}
                    </td>

                    {/* Moneda */}
                    <td className="px-3.5 py-2.5 whitespace-nowrap">{item.moneda}</td>

                    {/* Total */}
                    <td className="px-3.5 py-2.5 whitespace-nowrap text-right font-bold text-foreground">
                      {formatCRC(item.totalComprobante)}
                    </td>

                    {/* IVA */}
                    <td className="px-3.5 py-2.5 whitespace-nowrap text-right text-muted-foreground">
                      {formatCRC(item.totalIva)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
        </>
      )}

      {/* Modal Importar XML / Expediente */}
      <ImportXmlModal
        isOpen={importModalOpen}
        onClose={() => setImportModalOpen(false)}
        onImportComplete={refrescarComprobantes}
        initialMode={importModalMode}
      />
    </div>
  );
}
