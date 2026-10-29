import { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  BookOpen,
  FileSpreadsheet,
  Download,
  Copy,
  Check,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  Receipt,
  Scale,
  Sparkles,
  ArrowRight,
  ExternalLink,
  Layers,
  HelpCircle,
} from "lucide-react";
import { toast } from "sonner";
import { formatCRC } from "@/lib/mock-data";
import { ComprobanteContable } from "@/lib/accounting-reports";
import {
  generarAsientosContables,
  exportarExcelAsientos,
  exportarCsvSoftland,
  exportarCsvQuickBooks,
  generarTextoTabuladoAsiento,
  AsientoContable,
  PaqueteAsientos,
} from "@/lib/hacienda/asientos-contables";

interface AsientosContablesModalProps {
  isOpen: boolean;
  onClose: () => void;
  comprobantes: ComprobanteContable[];
  empresaNombre: string;
  empresaCedula: string;
  periodoDesde: string;
  periodoHasta: string;
  factorProrrata?: number;
}

export function AsientosContablesModal({
  isOpen,
  onClose,
  comprobantes,
  empresaNombre,
  empresaCedula,
  periodoDesde,
  periodoHasta,
  factorProrrata = 100,
}: AsientosContablesModalProps) {
  const [tabActiva, setTabActiva] = useState<"CONSOLIDADO" | "VENTAS" | "COMPRAS" | "LIQUIDACION_IVA">("CONSOLIDADO");
  const [copiado, setCopiado] = useState(false);

  // Generación matemática de los asientos del período
  const paquete: PaqueteAsientos = useMemo(() => {
    return generarAsientosContables({
      comprobantes,
      empresaNombre,
      empresaCedula,
      periodoDesde,
      periodoHasta,
      factorProrrata,
    });
  }, [comprobantes, empresaNombre, empresaCedula, periodoDesde, periodoHasta, factorProrrata]);

  const asientoSeleccionado: AsientoContable = useMemo(() => {
    switch (tabActiva) {
      case "VENTAS":
        return paquete.asientoVentas;
      case "COMPRAS":
        return paquete.asientoCompras;
      case "LIQUIDACION_IVA":
        return paquete.asientoLiquidacionIva;
      case "CONSOLIDADO":
      default:
        return paquete.asientoConsolidado;
    }
  }, [tabActiva, paquete]);

  const handleDescargarExcel = () => {
    try {
      exportarExcelAsientos(paquete);
      toast.success("¡Libro de Asientos Contables descargado en Excel!", {
        description: `Incluye 6 hojas: Resumen, Ventas, Compras, D-104, Softland y QuickBooks.`,
      });
    } catch (err) {
      console.error(err);
      toast.error("Error al exportar a Excel");
    }
  };

  const handleDescargarSoftlandCsv = () => {
    try {
      const csv = exportarCsvSoftland(asientoSeleccionado, periodoHasta);
      // Incluir BOM UTF-8 (\uFEFF) para que Excel lo abra sin problemas de codificación (acentos, tildes, ñ)
      const blob = new Blob([csv.startsWith("\uFEFF") ? csv : "\uFEFF" + csv], {
        type: "text/csv;charset=utf-8;",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `Softland_${tabActiva}_${periodoHasta.slice(0, 7)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success("Archivo CSV para Softland descargado correctamente");
    } catch (err) {
      console.error(err);
      toast.error("Error al descargar CSV");
    }
  };

  const handleDescargarQuickbooksCsv = () => {
    try {
      const csv = exportarCsvQuickBooks(asientoSeleccionado, periodoHasta);
      // Incluir BOM UTF-8 (\uFEFF) para que Excel lo abra sin problemas de codificación (acentos, tildes, ñ)
      const blob = new Blob([csv.startsWith("\uFEFF") ? csv : "\uFEFF" + csv], {
        type: "text/csv;charset=utf-8;",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `QuickBooks_${tabActiva}_${periodoHasta.slice(0, 7)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success("Archivo CSV para QuickBooks descargado correctamente");
    } catch (err) {
      console.error(err);
      toast.error("Error al descargar CSV");
    }
  };

  const handleCopiarPortapapeles = () => {
    try {
      const texto = generarTextoTabuladoAsiento(asientoSeleccionado);
      navigator.clipboard.writeText(texto);
      setCopiado(true);
      toast.success("¡Asiento copiado en formato tabulado!", {
        description: "Pégalo con Ctrl+V en Excel, Google Sheets o tu ERP contable.",
      });
      setTimeout(() => setCopiado(false), 2500);
    } catch (err) {
      console.error(err);
      toast.error("Error al copiar al portapapeles");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[92vh] overflow-y-auto p-0">
        <DialogHeader className="p-6 pb-4 border-b border-border bg-card sticky top-0 z-10 backdrop-blur-sm">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-500/10 px-2.5 py-0.5 text-xs font-bold text-blue-500">
                  <Scale className="h-3.5 w-3.5" /> Pólizas y Asientos NIIF
                </span>
                <span className="rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" /> Debe = Haber (Cuadrado ₡0)
                </span>
              </div>
              <DialogTitle className="text-xl font-bold flex items-center gap-2">
                Exportador de Asientos Contables
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Pólizas de diario automáticas para Softland, QuickBooks, Contalink o Excel. Período:{" "}
                <span className="font-semibold text-foreground font-mono">
                  {periodoDesde} al {periodoHasta}
                </span>{" "}
                • {empresaNombre}
              </DialogDescription>
            </div>

            {/* Acciones principales */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleCopiarPortapapeles}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-xs font-semibold text-foreground hover:bg-muted transition-colors cursor-pointer"
                title="Copiar líneas tabuladas para pegar en Excel con Ctrl+V"
              >
                {copiado ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5 text-primary" />}
                {copiado ? "¡Copiado!" : "Copiar (Ctrl+V)"}
              </button>

              <button
                type="button"
                onClick={handleDescargarSoftlandCsv}
                className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-500/30 bg-indigo-500/10 px-3 py-2 text-xs font-semibold text-indigo-700 dark:text-indigo-300 hover:bg-indigo-500/20 transition-colors cursor-pointer"
                title="Descargar archivo CSV estructurado para Softland ERP"
              >
                <Download className="h-3.5 w-3.5" /> Softland .CSV
              </button>

              <button
                type="button"
                onClick={handleDescargarQuickbooksCsv}
                className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs font-semibold text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/20 transition-colors cursor-pointer"
                title="Descargar archivo CSV estructurado para QuickBooks"
              >
                <Download className="h-3.5 w-3.5" /> QuickBooks .CSV
              </button>

              <button
                type="button"
                onClick={handleDescargarExcel}
                className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-2 text-xs font-bold text-primary-foreground shadow-sm hover:bg-primary/90 transition-all cursor-pointer"
              >
                <FileSpreadsheet className="h-4 w-4" /> Exportar Todo (.xlsx)
              </button>
            </div>
          </div>

          {/* Tarjetas de Resumen Rápido */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-4 pt-3 border-t border-border/60">
            <div className="rounded-xl border border-border/80 bg-background/60 p-2.5">
              <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider block">
                Total Débito (Debe)
              </span>
              <span className="text-sm font-mono font-bold text-emerald-600 dark:text-emerald-400">
                {formatCRC(asientoSeleccionado.totalDebe)}
              </span>
            </div>
            <div className="rounded-xl border border-border/80 bg-background/60 p-2.5">
              <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider block">
                Total Crédito (Haber)
              </span>
              <span className="text-sm font-mono font-bold text-blue-600 dark:text-blue-400">
                {formatCRC(asientoSeleccionado.totalHaber)}
              </span>
            </div>
            <div className="rounded-xl border border-border/80 bg-background/60 p-2.5">
              <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider block">
                Diferencia
              </span>
              <span
                className={`text-sm font-mono font-bold ${
                  asientoSeleccionado.cuadrado ? "text-emerald-600 dark:text-emerald-400" : "text-rose-500"
                }`}
              >
                {formatCRC(asientoSeleccionado.diferencia)} {asientoSeleccionado.cuadrado ? "✓" : "⚠️"}
              </span>
            </div>
            <div className="rounded-xl border border-border/80 bg-background/60 p-2.5">
              <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider block">
                D-104 Liquidación
              </span>
              <span className="text-xs font-mono font-bold text-foreground truncate block">
                {paquete.resumen.impuestoAPagar > 0
                  ? `Pagar: ${formatCRC(paquete.resumen.impuestoAPagar)}`
                  : `A Favor: ${formatCRC(paquete.resumen.saldoAFavor)}`}
              </span>
            </div>
          </div>
        </DialogHeader>

        <div className="p-6 space-y-5">
          {/* Selector de Pestañas de Asientos */}
          <div className="flex border-b border-border gap-2 overflow-x-auto pb-1">
            <button
              type="button"
              onClick={() => setTabActiva("CONSOLIDADO")}
              className={`px-3.5 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                tabActiva === "CONSOLIDADO"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "text-muted-foreground hover:bg-muted"
              }`}
            >
              <Layers className="h-3.5 w-3.5" /> Póliza Consolidada (Maestra)
              <span className="rounded-full bg-primary-foreground/20 px-1.5 py-0.2 text-[10px]">
                {paquete.asientoConsolidado.lineas.length}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setTabActiva("VENTAS")}
              className={`px-3.5 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                tabActiva === "VENTAS"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "text-muted-foreground hover:bg-muted"
              }`}
            >
              <TrendingUp className="h-3.5 w-3.5" /> Asiento 1: Ventas y Facturación
              <span className="rounded-full bg-primary-foreground/20 px-1.5 py-0.2 text-[10px]">
                {paquete.asientoVentas.lineas.length}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setTabActiva("COMPRAS")}
              className={`px-3.5 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                tabActiva === "COMPRAS"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "text-muted-foreground hover:bg-muted"
              }`}
            >
              <Receipt className="h-3.5 w-3.5" /> Asiento 2: Compras y Gastos
              <span className="rounded-full bg-primary-foreground/20 px-1.5 py-0.2 text-[10px]">
                {paquete.asientoCompras.lineas.length}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setTabActiva("LIQUIDACION_IVA")}
              className={`px-3.5 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                tabActiva === "LIQUIDACION_IVA"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "text-muted-foreground hover:bg-muted"
              }`}
            >
              <Scale className="h-3.5 w-3.5" /> Asiento 3: Liquidación IVA D-104
              <span className="rounded-full bg-primary-foreground/20 px-1.5 py-0.2 text-[10px]">
                {paquete.asientoLiquidacionIva.lineas.length}
              </span>
            </button>
          </div>

          {/* Descripción del Asiento Activo */}
          <div className="rounded-xl border border-border/80 bg-muted/30 p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div>
              <span className="font-bold text-foreground text-sm block">
                {asientoSeleccionado.titulo}
              </span>
              <p className="text-muted-foreground mt-0.5">{asientoSeleccionado.descripcion}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="rounded bg-background px-2 py-1 font-mono text-[11px] font-semibold text-foreground border border-border">
                Fecha Póliza: {asientoSeleccionado.fecha}
              </span>
            </div>
          </div>

          {/* Tabla de Asiento de Diario (Debe y Haber) */}
          <div className="rounded-xl border border-border overflow-hidden shadow-xs bg-card">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-border bg-muted/60 text-muted-foreground font-semibold">
                    <th className="py-2.5 px-3 text-center w-12">#</th>
                    <th className="py-2.5 px-3 w-28">Cuenta</th>
                    <th className="py-2.5 px-3">Nombre de la Cuenta</th>
                    <th className="py-2.5 px-3 w-24">C. Costo</th>
                    <th className="py-2.5 px-3 text-right w-32 font-mono">Debe (₡)</th>
                    <th className="py-2.5 px-3 text-right w-32 font-mono">Haber (₡)</th>
                    <th className="py-2.5 px-3 w-24">Ref</th>
                    <th className="py-2.5 px-3 min-w-[200px]">Concepto / Detalle</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {asientoSeleccionado.lineas.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-muted-foreground">
                        No hay movimientos registrados para este asiento en el período.
                      </td>
                    </tr>
                  ) : (
                    asientoSeleccionado.lineas.map((linea, idx) => {
                      const esDebe = linea.debe > 0;
                      return (
                        <tr
                          key={`${linea.cuenta}-${idx}`}
                          className="hover:bg-muted/40 transition-colors font-sans"
                        >
                          <td className="py-2 px-3 text-center text-muted-foreground font-mono text-[11px]">
                            {idx + 1}
                          </td>
                          <td className="py-2 px-3 font-mono font-bold text-foreground">
                            {linea.cuenta}
                          </td>
                          <td className="py-2 px-3">
                            <span
                              className={`font-semibold ${
                                esDebe ? "text-foreground" : "text-muted-foreground pl-4"
                              }`}
                            >
                              {esDebe ? "" : "a/ "}
                              {linea.nombreCuenta}
                            </span>
                          </td>
                          <td className="py-2 px-3 font-mono text-[11px] text-muted-foreground">
                            {linea.centroCosto || "—"}
                          </td>
                          <td className="py-2 px-3 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                            {linea.debe > 0 ? formatCRC(linea.debe) : "—"}
                          </td>
                          <td className="py-2 px-3 text-right font-mono font-bold text-blue-600 dark:text-blue-400">
                            {linea.haber > 0 ? formatCRC(linea.haber) : "—"}
                          </td>
                          <td className="py-2 px-3 font-mono text-[11px] text-muted-foreground">
                            {linea.referencia}
                          </td>
                          <td className="py-2 px-3 text-muted-foreground text-[11px]">
                            {linea.concepto}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-border bg-muted/80 font-bold">
                    <td colSpan={4} className="py-3 px-3 text-right uppercase tracking-wider text-xs">
                      Totales de la Póliza:
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-xs text-emerald-600 dark:text-emerald-400">
                      {formatCRC(asientoSeleccionado.totalDebe)}
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-xs text-blue-600 dark:text-blue-400">
                      {formatCRC(asientoSeleccionado.totalHaber)}
                    </td>
                    <td colSpan={2} className="py-3 px-3">
                      <div className="flex items-center gap-1.5">
                        {asientoSeleccionado.cuadrado ? (
                          <span className="inline-flex items-center gap-1 rounded bg-emerald-500/10 px-2 py-0.5 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                            <CheckCircle2 className="h-3.5 w-3.5" /> Asiento Cuadrado (₡0)
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded bg-rose-500/10 px-2 py-0.5 text-[11px] font-bold text-rose-500">
                            <AlertCircle className="h-3.5 w-3.5" /> Descuadre: {formatCRC(asientoSeleccionado.diferencia)}
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Panel Informativo de Compatibilidad con Softland / QuickBooks */}
          <div className="rounded-xl border border-border/70 bg-muted/20 p-4 space-y-2 text-xs">
            <h5 className="font-bold text-foreground flex items-center gap-1.5">
              <Sparkles className="h-4 w-4 text-primary" /> Compatibilidad Directa con ERPs y Sistemas Contables de Costa Rica:
            </h5>
            <div className="grid gap-3 sm:grid-cols-3 text-muted-foreground text-[11px]">
              <div className="space-y-1">
                <span className="font-semibold text-foreground block">Softland ERP:</span>
                <p>
                  Exporta en formato nativo con columnas de Cuenta, Centro de Costo, Fecha YYYY/MM/DD, Débito y Crédito listos para la utilidad <em>Importación de Asientos</em>.
                </p>
              </div>
              <div className="space-y-1">
                <span className="font-semibold text-foreground block">QuickBooks (Online & Desktop):</span>
                <p>
                  Estructura de Diario con balance Debit / Credit por cuenta y memo detallando número de comprobante o referencia fiscal.
                </p>
              </div>
              <div className="space-y-1">
                <span className="font-semibold text-foreground block">Contalink / SAP / Excel:</span>
                <p>
                  Utiliza el botón <strong>Copiar (Ctrl+V)</strong> para pegar las filas y columnas directamente sobre cualquier celda de tu hoja de trabajo con alineación exacta.
                </p>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
