import { useState, useMemo } from "react";
import {
  X,
  FileSpreadsheet,
  Download,
  Copy,
  Check,
  Send,
  Building2,
  Users,
  Receipt,
  Sparkles,
  HelpCircle,
  FileText,
  Search,
} from "lucide-react";
import { toast } from "sonner";
import { formatCRC } from "@/lib/mock-data";
import { ComprobanteContable } from "@/lib/accounting-reports";
import {
  generarInformeD151,
  exportarExcelD151,
  exportarTextoHaciendaD151,
  ResultadoD151,
} from "@/lib/hacienda/d151-generator";

interface D151ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  comprobantes: ComprobanteContable[];
  empresaNombre: string;
  empresaCedula: string;
}

export function D151ReportModal({
  isOpen,
  onClose,
  comprobantes,
  empresaNombre,
  empresaCedula,
}: D151ReportModalProps) {
  const currentYear = new Date().getFullYear();
  const [anoFiscal, setAnoFiscal] = useState<number>(currentYear);
  const [umbral, setUmbral] = useState<number>(2500000);
  const [pestañaActiva, setPestañaActiva] = useState<"proveedores" | "clientes">("proveedores");
  const [filtroTexto, setFiltroTexto] = useState("");
  const [copiedResumen, setCopiedResumen] = useState(false);

  // Generar informe D-151 con el motor de cálculo
  const resultadoD151 = useMemo<ResultadoD151>(() => {
    return generarInformeD151({
      comprobantes,
      anoFiscal,
      umbral,
    });
  }, [comprobantes, anoFiscal, umbral]);

  if (!isOpen) return null;

  const listaActual =
    pestañaActiva === "proveedores"
      ? resultadoD151.proveedores
      : resultadoD151.clientes;

  const listaFiltrada = listaActual.filter(
    (item) =>
      item.nombreRazonSocial.toLowerCase().includes(filtroTexto.toLowerCase()) ||
      item.numeroIdentificacion.includes(filtroTexto)
  );

  const handleDescargarExcel = () => {
    if (
      resultadoD151.proveedores.length === 0 &&
      resultadoD151.clientes.length === 0
    ) {
      toast.warning("No hay terceros que superen el umbral para este año.");
      return;
    }
    exportarExcelD151(resultadoD151, {
      nombre: empresaNombre,
      identificacion: empresaCedula,
    });
    toast.success("¡Libro oficial D-151 generado en Excel con éxito!");
  };

  const handleDescargarCsv = () => {
    const csvContent = exportarTextoHaciendaD151(resultadoD151);
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `D151_${anoFiscal}_${empresaCedula.replace(/\D/g, "")}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Archivo CSV generado para el importador de Hacienda");
  };

  const handleCopiarResumen = () => {
    const texto = `📋 *DECLARACIÓN INFORMATIVA ANUAL D-151 (HACIENDA CR)*
Empresa: ${empresaNombre} (${empresaCedula})
Año Fiscal: ${anoFiscal}
Umbral Oficial: ₡${umbral.toLocaleString()} colones

📦 *PROVEEDORES REPORTABLES (COMPRAS > ₡2.5M):*
• Total Terceros: ${resultadoD151.totalProveedoresSuperan}
• Monto Acumulado en Compras: ₡${resultadoD151.montoTotalComprasD151.toLocaleString()}

👥 *CLIENTES REPORTABLES (VENTAS > ₡2.5M):*
• Total Terceros: ${resultadoD151.totalClientesSuperan}
• Monto Acumulado en Ventas: ₡${resultadoD151.montoTotalVentasD151.toLocaleString()}

Generado automáticamente por DeclaraHub listo para presentar ante la Dirección General de Tributación.`;

    navigator.clipboard.writeText(texto);
    setCopiedResumen(true);
    toast.success("Resumen copiado para WhatsApp o correo del contador");
    setTimeout(() => setCopiedResumen(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
      <div className="w-full max-w-4xl rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
        {/* Cabecera */}
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-purple-500/10 text-purple-600">
              <FileSpreadsheet className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-foreground">
                  Borrador Oficial D-151 (Clientes y Proveedores &gt; ₡2.5M)
                </h3>
                <span className="rounded-full bg-purple-500/10 px-2.5 py-0.5 text-[10px] font-bold text-purple-700 dark:text-purple-300">
                  Declaración Informativa Anual DGT
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                Consolidación automática de terceros con transacciones anuales acumuladas superiores al umbral legal de Hacienda.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Barra de Filtros y Configuración del D-151 */}
        <div className="grid gap-3 sm:grid-cols-3 rounded-xl border border-border bg-muted/20 p-3.5 text-xs">
          {/* Año Fiscal */}
          <div>
            <label className="mb-1 block font-semibold text-muted-foreground">
              Año Fiscal a Declarar
            </label>
            <select
              value={anoFiscal}
              onChange={(e) => setAnoFiscal(parseInt(e.target.value, 10))}
              className="h-9 w-full rounded-lg border border-border bg-background px-3 font-mono font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option value={currentYear}>{currentYear} (Período en curso)</option>
              <option value={currentYear - 1}>{currentYear - 1} (Período anterior)</option>
              <option value={currentYear - 2}>{currentYear - 2}</option>
            </select>
          </div>

          {/* Umbral Legal */}
          <div>
            <label className="mb-1 block font-semibold text-muted-foreground">
              Umbral Mínimo Legal
            </label>
            <select
              value={umbral}
              onChange={(e) => setUmbral(parseInt(e.target.value, 10))}
              className="h-9 w-full rounded-lg border border-border bg-background px-3 font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option value={2500000}>₡2,500,000 (Regla General Art. 42)</option>
              <option value={50000}>₡50,000 (Honorarios / Alquileres Específicos)</option>
              <option value={1000000}>₡1,000,000 (Filtro Personalizado)</option>
            </select>
          </div>

          {/* Empresa */}
          <div>
            <label className="mb-1 block font-semibold text-muted-foreground">
              Empresa Declarante
            </label>
            <div className="h-9 flex items-center px-3 rounded-lg border border-border bg-background truncate font-bold text-foreground">
              {empresaNombre}
            </div>
          </div>
        </div>

        {/* Tarjetas de Resumen KPI D-151 */}
        <div className="grid gap-3 sm:grid-cols-2">
          {/* Proveedores */}
          <div
            onClick={() => setPestañaActiva("proveedores")}
            className={`cursor-pointer rounded-xl border p-4 transition-all ${
              pestañaActiva === "proveedores"
                ? "border-amber-500/50 bg-amber-500/10 shadow-xs"
                : "border-border bg-card hover:bg-muted/30"
            }`}
          >
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="font-semibold text-amber-700 dark:text-amber-300 flex items-center gap-1.5">
                <Receipt className="h-4 w-4" /> Compras / Proveedores (Código C)
              </span>
              <span className="rounded-full bg-amber-500/20 px-2 py-0.5 font-bold font-mono text-[10px] text-amber-800 dark:text-amber-200">
                {resultadoD151.totalProveedoresSuperan} obligados
              </span>
            </div>
            <p className="text-xl font-black font-mono text-foreground">
              {formatCRC(resultadoD151.montoTotalComprasD151)}
            </p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Total acumulado en proveedores que superaron el umbral de ₡{umbral.toLocaleString()}.
            </p>
          </div>

          {/* Clientes */}
          <div
            onClick={() => setPestañaActiva("clientes")}
            className={`cursor-pointer rounded-xl border p-4 transition-all ${
              pestañaActiva === "clientes"
                ? "border-primary/50 bg-primary/10 shadow-xs"
                : "border-border bg-card hover:bg-muted/30"
            }`}
          >
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="font-semibold text-primary flex items-center gap-1.5">
                <Users className="h-4 w-4" /> Ventas / Clientes (Código V)
              </span>
              <span className="rounded-full bg-primary/20 px-2 py-0.5 font-bold font-mono text-[10px] text-primary">
                {resultadoD151.totalClientesSuperan} obligados
              </span>
            </div>
            <p className="text-xl font-black font-mono text-foreground">
              {formatCRC(resultadoD151.montoTotalVentasD151)}
            </p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Total acumulado en clientes que superaron el umbral de ₡{umbral.toLocaleString()}.
            </p>
          </div>
        </div>

        {/* Tabla Detallada con Búsqueda */}
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 bg-muted/30 border-b border-border text-xs">
            <span className="font-bold text-foreground">
              {pestañaActiva === "proveedores"
                ? "Detalle de Proveedores a Reportar en D-151"
                : "Detalle de Clientes a Reportar en D-151"}
            </span>

            <div className="relative max-w-xs flex-1">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <input
                value={filtroTexto}
                onChange={(e) => setFiltroTexto(e.target.value)}
                placeholder="Filtrar por cédula o nombre..."
                className="h-8 w-full rounded-lg border border-border bg-background pl-8 pr-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>

          <div className="max-h-60 overflow-y-auto">
            {listaFiltrada.length === 0 ? (
              <div className="p-8 text-center text-xs text-muted-foreground">
                No hay registros que superen los ₡{umbral.toLocaleString()} colones acumulados para {anoFiscal}.
              </div>
            ) : (
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/50 text-[11px] text-muted-foreground border-b border-border">
                  <tr>
                    <th className="px-3 py-2">TIPO ID</th>
                    <th className="px-3 py-2">CÉDULA / IDENTIFICACIÓN</th>
                    <th className="px-3 py-2">NOMBRE O RAZÓN SOCIAL</th>
                    <th className="px-3 py-2 text-right">TOTAL ACUMULADO</th>
                    <th className="px-3 py-2 text-right">MERCANCÍAS</th>
                    <th className="px-3 py-2 text-right">SERVICIOS</th>
                    <th className="px-3 py-2 text-center">DOCS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border font-mono text-[11px]">
                  {listaFiltrada.map((item, idx) => (
                    <tr key={idx} className="hover:bg-muted/40 transition-colors">
                      <td className="px-3 py-2 text-center">
                        <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-bold">
                          {item.tipoIdentificacion}
                        </span>
                      </td>
                      <td className="px-3 py-2 font-bold text-foreground">
                        {item.numeroIdentificacion}
                      </td>
                      <td className="px-3 py-2 font-sans font-medium text-foreground max-w-[200px] truncate" title={item.nombreRazonSocial}>
                        {item.nombreRazonSocial}
                      </td>
                      <td className="px-3 py-2 text-right font-black text-foreground">
                        {formatCRC(item.montoTotalAnual)}
                      </td>
                      <td className="px-3 py-2 text-right text-muted-foreground">
                        {formatCRC(item.montoMercancias)}
                      </td>
                      <td className="px-3 py-2 text-right text-muted-foreground">
                        {formatCRC(item.montoServicios)}
                      </td>
                      <td className="px-3 py-2 text-center text-muted-foreground">
                        {item.cantidadComprobantes}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Botonera de Exportación */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-border">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Sparkles className="h-4 w-4 text-purple-600" />
            <span>Formato oficial conforme a la Resolución DGT-R-42-2015 de Hacienda.</span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleCopiarResumen}
              className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-3.5 py-2 text-xs font-semibold hover:bg-muted transition-colors cursor-pointer"
            >
              {copiedResumen ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
              <span>Copiar Resumen</span>
            </button>

            <button
              type="button"
              onClick={handleDescargarCsv}
              className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-3.5 py-2 text-xs font-semibold hover:bg-muted transition-colors cursor-pointer"
            >
              <Download className="h-4 w-4 text-blue-600" />
              <span>Descargar CSV (Hacienda)</span>
            </button>

            <button
              type="button"
              onClick={handleDescargarExcel}
              className="inline-flex items-center gap-2 rounded-xl bg-purple-600 px-4 py-2 text-xs font-bold text-white shadow-soft hover:bg-purple-700 transition-all cursor-pointer hover:scale-[1.02]"
            >
              <FileSpreadsheet className="h-4 w-4" />
              <span>EXPORTAR LIBRO D-151 (.XLSX)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
