import { useState, useMemo } from "react";
import {
  FileSpreadsheet,
  Check,
  Copy,
  TrendingUp,
  Receipt,
  ShieldCheck,
  AlertCircle,
  HelpCircle,
  Sparkles,
  ExternalLink,
  Layers,
  ArrowRight,
  Info,
} from "lucide-react";
import { toast } from "sonner";
import { formatCRC } from "@/lib/mock-data";
import { ComprobanteContable } from "@/lib/accounting-reports";
import { evaluarRiesgoTributario } from "@/lib/hacienda/semaforo-riesgo";
import { SemaforoRiesgoCard } from "@/components/reports/SemaforoRiesgoCard";

interface DeclaraHubSimulatorProps {
  comprobantes: ComprobanteContable[];
  empresaNombre: string;
  empresaCedula: string;
  periodoDesde: string;
  periodoHasta: string;
  onDescargarExcel: () => void;
  onAbrirAceptadorGastos?: () => void;
  onAbrirD151?: () => void;
}

export function DeclaraHubSimulator({
  comprobantes,
  empresaNombre,
  empresaCedula,
  periodoDesde,
  periodoHasta,
  onDescargarExcel,
  onAbrirAceptadorGastos,
  onAbrirD151,
}: DeclaraHubSimulatorProps) {
  const [copiedCasilla, setCopiedCasilla] = useState<string | null>(null);

  // Diagnóstico Preventivo del Semáforo de Riesgo Tributario
  const diagnosticoRiesgo = useMemo(() => {
    return evaluarRiesgoTributario({
      comprobantes,
      empresaCedula,
    });
  }, [comprobantes, empresaCedula]);

  // Cálculos agrupados estrictos para las casillas oficiales del D-104 de Tributación
  const metricasD104 = useMemo(() => {
    // 1. VENTAS (DÉBITO FISCAL)
    const ventas = comprobantes.filter((c) => c.tipoOperacion === "VENTA");
    const notasCreditoVentas = ventas.filter((c) => c.tipoDoc === "NOTA_CREDITO");
    const ventasRegulares = ventas.filter((c) => c.tipoDoc !== "NOTA_CREDITO");

    // Base imponible y débitos por tarifa
    let baseGravada13 = 0;
    let debito13 = 0;
    let baseTarifasReducidas = 0;
    let debitoTarifasReducidas = 0;
    let baseExenta = 0;

    ventasRegulares.forEach((v) => {
      baseGravada13 += v.totalVentaNeta || 0;
      debito13 += v.iva13 || 0;
      debitoTarifasReducidas += (v.iva4 || 0) + (v.iva2 || 0) + (v.iva1 || 0);
      baseExenta += (v.totalExento || 0) + (v.totalExonerado || 0);
    });

    // Descontar notas de crédito de ventas
    const montoNcVentas = notasCreditoVentas.reduce((acc, nc) => acc + (nc.totalVentaNeta || 0), 0);
    const ivaNcVentas = notasCreditoVentas.reduce((acc, nc) => acc + (nc.totalIva || 0), 0);

    const totalDebitoFiscal = Math.max(0, debito13 + debitoTarifasReducidas - ivaNcVentas);
    const totalVentasNetas = Math.max(0, baseGravada13 + baseTarifasReducidas + baseExenta - montoNcVentas);

    // 2. COMPRAS Y GASTOS (CRÉDITO FISCAL)
    const compras = comprobantes.filter((c) => c.tipoOperacion === "COMPRA");
    const notasCreditoCompras = compras.filter((c) => c.tipoDoc === "NOTA_CREDITO");
    const comprasRegulares = compras.filter((c) => c.tipoDoc !== "NOTA_CREDITO");

    let baseComprasGravadas13 = 0;
    let credito13 = 0;
    let baseComprasReducidas = 0;
    let creditoReducidas = 0;
    let baseComprasExentas = 0;

    comprasRegulares.forEach((cp) => {
      baseComprasGravadas13 += cp.totalVentaNeta || (cp.totalComprobante - (cp.totalIva || 0)) || 0;
      credito13 += cp.iva13 || cp.totalIva || 0;
      creditoReducidas += (cp.iva4 || 0) + (cp.iva2 || 0) + (cp.iva1 || 0);
      baseComprasExentas += (cp.totalExento || 0) + (cp.totalExonerado || 0);
    });

    const ivaNcCompras = notasCreditoCompras.reduce((acc, nc) => acc + (nc.totalIva || 0), 0);
    const totalCreditoFiscal = Math.max(0, credito13 + creditoReducidas - ivaNcCompras);
    const totalComprasNetas = Math.max(0, baseComprasGravadas13 + baseComprasReducidas + baseComprasExentas);

    // 3. PRORRATA DEL IVA (PROPORCIONALIDAD - ART. 30 LEY 9635)
    const ventasConCredito = baseGravada13 + baseTarifasReducidas;
    const totalVentasParaProrrata = ventasConCredito + baseExenta;

    let factorProrrata = 100;
    let tieneProrrataMixta = false;

    if (totalVentasParaProrrata > 0 && baseExenta > 0) {
      factorProrrata = Number(((ventasConCredito / totalVentasParaProrrata) * 100).toFixed(2));
      tieneProrrataMixta = true;
    }

    const creditoFiscalBruto = totalCreditoFiscal;
    const creditoFiscalProrrateado = tieneProrrataMixta
      ? (creditoFiscalBruto * factorProrrata) / 100
      : creditoFiscalBruto;
    const ivaNoDeducibleGasto = Math.max(0, creditoFiscalBruto - creditoFiscalProrrateado);

    // Crédito fiscal final que efectivamente se aplica en la liquidación de la Casilla [140]/[141]
    const creditoEfectivoLiquidacion = tieneProrrataMixta
      ? creditoFiscalProrrateado
      : totalCreditoFiscal;

    // 4. LIQUIDACIÓN FINAL
    const balance = totalDebitoFiscal - creditoEfectivoLiquidacion;
    const impuestoAPagar = balance > 0 ? balance : 0;
    const saldoAFavor = balance < 0 ? Math.abs(balance) : 0;

    return {
      totalVentasNetas,
      baseGravada13,
      debito13,
      baseTarifasReducidas,
      debitoTarifasReducidas,
      baseExenta,
      montoNcVentas,
      ivaNcVentas,
      totalDebitoFiscal,

      totalComprasNetas,
      baseComprasGravadas13,
      credito13,
      baseComprasReducidas,
      creditoReducidas,
      baseComprasExentas,
      ivaNcCompras,
      totalCreditoFiscal,

      // Métricas de Prorrata
      ventasConCredito,
      totalVentasParaProrrata,
      factorProrrata,
      tieneProrrataMixta,
      creditoFiscalBruto,
      creditoFiscalProrrateado,
      ivaNoDeducibleGasto,
      creditoEfectivoLiquidacion,

      impuestoAPagar,
      saldoAFavor,
      balance,
      cantidadVentas: ventas.length,
      cantidadCompras: compras.length,
    };
  }, [comprobantes]);

  const handleCopyCasilla = (codigo: string, valor: number, esPorcentaje = false) => {
    const formatted = esPorcentaje ? valor.toFixed(2) : Math.round(valor).toString();
    navigator.clipboard.writeText(formatted);
    setCopiedCasilla(codigo);
    toast.success(`Casilla [${codigo}] copiada al portapapeles`, {
      description: esPorcentaje
        ? `Porcentaje listo para pegar en TRIBU-CR: ${formatted}%`
        : `Monto listo para pegar en TRIBU-CR: ₡${formatted}`,
    });
    setTimeout(() => setCopiedCasilla(null), 2500);
  };

  const handleCopyResumenContador = () => {
    const prorrataInfo = metricasD104.tieneProrrataMixta
      ? `\n📊 *PRORRATA DEL IVA (PROPORCIONALIDAD):*
• Coeficiente de Prorrata [Casilla 114]: ${metricasD104.factorProrrata.toFixed(2)}%
• Crédito Fiscal Aplicable [Casilla 131]: ₡${Math.round(metricasD104.creditoFiscalProrrateado).toLocaleString()}
• IVA No Deducible (Gasto en Renta D-101): ₡${Math.round(metricasD104.ivaNoDeducibleGasto).toLocaleString()}`
      : `\n📊 *PRORRATA DEL IVA:* Coeficiente [Casilla 114]: 100.00% (Crédito Pleno)`;

    const texto = `📋 *RESUMEN TRIBUTARIO D-104 (DECLARAHUB CR)*
Empresa: ${empresaNombre}
Cédula Jurídica: ${empresaCedula}
Período Fiscal: ${periodoDesde} al ${periodoHasta}

🔹 *VENTAS (DÉBITO FISCAL):*
• Total Ventas Netas: ₡${Math.round(metricasD104.totalVentasNetas).toLocaleString()}
• Base Gravada 13% [Casilla 101]: ₡${Math.round(metricasD104.baseGravada13).toLocaleString()}
• Débito IVA 13%: ₡${Math.round(metricasD104.debito13).toLocaleString()}
• Ventas Exentas [Casilla 103]: ₡${Math.round(metricasD104.baseExenta).toLocaleString()}
👉 *Total Débito Fiscal [Casilla 110]:* ₡${Math.round(metricasD104.totalDebitoFiscal).toLocaleString()}

🔸 *COMPRAS Y GASTOS (CRÉDITO FISCAL):*
• Total Compras: ₡${Math.round(metricasD104.totalComprasNetas).toLocaleString()}
• Compras Gravadas 13% [Casilla 121]: ₡${Math.round(metricasD104.baseComprasGravadas13).toLocaleString()}
👉 *Total Crédito Fiscal Bruto [Casilla 130]:* ₡${Math.round(metricasD104.totalCreditoFiscal).toLocaleString()}${prorrataInfo}

⚖️ *LIQUIDACIÓN FINAL D-104:*
${
  metricasD104.impuestoAPagar > 0
    ? `🔴 *IMPUESTO A PAGAR A HACIENDA [Casilla 140]:* ₡${Math.round(metricasD104.impuestoAPagar).toLocaleString()}`
    : `🟢 *SALDO A FAVOR DEL CONTRIBUYENTE [Casilla 141]:* ₡${Math.round(metricasD104.saldoAFavor).toLocaleString()}`
}

Generado automáticamente por FacturaOS DeclaraHub.`;

    navigator.clipboard.writeText(texto);
    toast.success("¡Resumen contable copiado para WhatsApp o Correo!");
  };

  return (
    <div className="space-y-6 animate-in fade-in-50 duration-300">
      {/* Banner Principal DeclaraHub */}
      <div className="rounded-2xl border border-blue-500/20 bg-gradient-to-r from-blue-900/20 via-indigo-900/20 to-slate-900/30 p-6 shadow-xl backdrop-blur-xs">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-500/20 px-3 py-0.5 text-xs font-black text-blue-400 border border-blue-500/30">
                <Sparkles className="h-3.5 w-3.5" /> DeclaraHub CR
              </span>
              <span className="rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-[11px] font-bold text-emerald-400 border border-emerald-500/30">
                ✓ Conforme TRIBU-CR / OVI 2026
              </span>
              <span className="text-xs text-muted-foreground font-mono">
                {empresaNombre} ({empresaCedula})
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-foreground">
              Borrador Oficial D-104 (Declaración del IVA)
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground max-w-2xl">
              Cruce automático de tus comprobantes de venta emitidos y compras recibidas. Haz clic en el botón de copiar de cada casilla oficial y pégala directamente en el portal de Hacienda.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {onAbrirD151 && (
              <button
                type="button"
                onClick={onAbrirD151}
                className="inline-flex items-center gap-1.5 rounded-xl border border-purple-500/40 bg-purple-500/10 px-3.5 py-2.5 text-xs font-bold text-purple-700 dark:text-purple-300 hover:bg-purple-500/20 transition-all cursor-pointer"
              >
                <FileSpreadsheet className="h-4 w-4" /> Borrador D-151
                <span className="rounded-full bg-purple-500/20 px-1.5 py-0.2 text-[10px] font-black uppercase">
                  &gt; ₡2.5M
                </span>
              </button>
            )}
            {onAbrirAceptadorGastos && (
              <button
                type="button"
                onClick={onAbrirAceptadorGastos}
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white shadow-md hover:bg-emerald-700 transition-all cursor-pointer hover:scale-[1.02]"
              >
                <ShieldCheck className="h-4 w-4" /> Aceptar Gastos (CCE Masivo)
                <span className="rounded-full bg-white/20 px-1.5 py-0.5 text-[10px] font-black uppercase">
                  Doc. 05
                </span>
              </button>
            )}
            <button
              type="button"
              onClick={handleCopyResumenContador}
              className="inline-flex items-center gap-2 rounded-xl border border-border bg-card/80 px-4 py-2.5 text-xs font-bold text-foreground shadow-xs hover:bg-muted transition-all cursor-pointer"
            >
              <Copy className="h-4 w-4 text-primary" /> Copiar Resumen (WhatsApp)
            </button>
            <button
              type="button"
              onClick={onDescargarExcel}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-xs font-bold text-primary-foreground shadow-md hover:bg-primary/90 transition-all cursor-pointer"
            >
              <FileSpreadsheet className="h-4 w-4" /> Exportar Paquete D-104 (.xlsx)
            </button>
          </div>
        </div>
      </div>

      {/* Semáforo de Riesgo Tributario (Anti-Auditoría Preventiva) */}
      <SemaforoRiesgoCard
        diagnostico={diagnosticoRiesgo}
        onAbrirAceptadorGastos={onAbrirAceptadorGastos}
      />

      {/* Tarjeta Gigante de Liquidación Final */}
      <div
        className={`rounded-2xl border p-5 sm:p-6 shadow-xl transition-all ${
          metricasD104.impuestoAPagar > 0
            ? "border-amber-500/30 bg-gradient-to-br from-amber-500/10 via-background to-card"
            : "border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 via-background to-card"
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div
              className={`grid h-14 w-14 shrink-0 place-items-center rounded-2xl shadow-md ${
                metricasD104.impuestoAPagar > 0
                  ? "bg-amber-500 text-white shadow-amber-500/25"
                  : "bg-emerald-600 text-white shadow-emerald-600/25"
              }`}
            >
              <ShieldCheck className="h-7 w-7" />
            </div>
            <div>
              <span className="text-[11px] font-black uppercase tracking-wider text-muted-foreground">
                Resultado de Liquidación Tributaria · Período ({periodoDesde} al {periodoHasta})
              </span>
              <h3 className="text-xl sm:text-2xl font-black text-foreground">
                {metricasD104.impuestoAPagar > 0
                  ? "Impuesto Neto a Pagar en Hacienda (D-104)"
                  : "Saldo a Favor del Contribuyente (Crédito Fiscal)"}
              </h3>
              <p className="text-xs text-muted-foreground">
                {metricasD104.impuestoAPagar > 0
                  ? "Débito por ventas supera al crédito de compras. Plazo legal de pago: antes del día 15 del mes siguiente."
                  : "Tus compras superaron las ventas de este período. Este crédito se deduce de tus ventas del próximo mes."}
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:items-end justify-center bg-card/60 p-3.5 rounded-xl border border-border/80">
            <span className="text-[10px] font-mono font-bold text-muted-foreground">
              {metricasD104.impuestoAPagar > 0 ? "CASILLA [140] D-104" : "CASILLA [141] D-104"}
            </span>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-2xl sm:text-3xl font-black tabular-nums font-mono text-foreground">
                {formatCRC(
                  metricasD104.impuestoAPagar > 0
                    ? metricasD104.impuestoAPagar
                    : metricasD104.saldoAFavor
                )}
              </span>
              <button
                type="button"
                onClick={() =>
                  handleCopyCasilla(
                    metricasD104.impuestoAPagar > 0 ? "140" : "141",
                    metricasD104.impuestoAPagar > 0
                      ? metricasD104.impuestoAPagar
                      : metricasD104.saldoAFavor
                  )
                }
                className="rounded-lg bg-primary/10 p-2 text-primary hover:bg-primary/20 transition-all cursor-pointer"
                title="Copiar monto exacto para TRIBU-CR"
              >
                {copiedCasilla === (metricasD104.impuestoAPagar > 0 ? "140" : "141") ? (
                  <Check className="h-4 w-4 text-emerald-500" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Grid del Formulario Oficial de Casillas D-104 */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* SECCIÓN 1: DÉBITO FISCAL (VENTAS DEL MES) */}
        <div className="rounded-2xl border border-border bg-card p-5 shadow-soft space-y-4">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div className="flex items-center gap-2">
              <div className="grid h-8 w-8 place-items-center rounded-lg bg-emerald-500/10 text-emerald-600">
                <TrendingUp className="h-4 w-4" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-foreground">I. Determinación del Débito Fiscal</h4>
                <p className="text-[11px] text-muted-foreground">Ventas y Facturación Oficial (Facturas + Tiquetes)</p>
              </div>
            </div>
            <span className="text-[11px] font-mono font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
              {metricasD104.cantidadVentas} emitidos
            </span>
          </div>

          <div className="space-y-3">
            {/* Casilla 101: Ventas Gravadas 13% */}
            <CasillaRow
              codigo="101"
              titulo="Ventas y Servicios Gravados (Tarifa General 13%)"
              descripcion="Base neta facturada al 13% antes de impuestos"
              base={metricasD104.baseGravada13}
              impuesto={metricasD104.debito13}
              impuestoEtiqueta="IVA Devengado (13%)"
              onCopy={() => handleCopyCasilla("101", metricasD104.baseGravada13)}
              isCopied={copiedCasilla === "101"}
            />

            {/* Casilla 102: Tarifas Reducidas */}
            <CasillaRow
              codigo="102"
              titulo="Ventas a Tarifas Reducidas (4%, 2%, 1%)"
              descripcion="Servicios de salud, boletos aéreos, canasta básica"
              base={metricasD104.baseTarifasReducidas}
              impuesto={metricasD104.debitoTarifasReducidas}
              impuestoEtiqueta="IVA Reducido"
              onCopy={() => handleCopyCasilla("102", metricasD104.baseTarifasReducidas)}
              isCopied={copiedCasilla === "102"}
            />

            {/* Casilla 103: Ventas Exentas */}
            <CasillaRow
              codigo="103"
              titulo="Ventas Exentas / No Sujetas de IVA"
              descripcion="Exportaciones, alquileres exentos y no gravados"
              base={metricasD104.baseExenta}
              impuesto={0}
              impuestoEtiqueta="Exento (₡0)"
              onCopy={() => handleCopyCasilla("103", metricasD104.baseExenta)}
              isCopied={copiedCasilla === "103"}
            />

            {/* Casilla 104: Notas de Crédito */}
            {metricasD104.montoNcVentas > 0 && (
              <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-3 flex items-center justify-between text-xs">
                <div>
                  <span className="font-mono font-bold text-destructive">[Casilla 104]</span>
                  <p className="font-semibold text-foreground">Notas de Crédito Emitidas (Anulaciones)</p>
                  <p className="text-[11px] text-muted-foreground">Disminuyen el Débito del mes</p>
                </div>
                <div className="text-right">
                  <span className="font-mono font-bold text-destructive tabular-nums">
                    -{formatCRC(metricasD104.montoNcVentas)}
                  </span>
                  <p className="text-[10px] text-muted-foreground">
                    IVA: -{formatCRC(metricasD104.ivaNcVentas)}
                  </p>
                </div>
              </div>
            )}

            {/* Total Débito Casilla 110 */}
            <div className="rounded-xl border-2 border-emerald-500/30 bg-emerald-500/10 p-3.5 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
                  CASILLA [110]
                </span>
                <p className="text-xs font-black text-foreground">TOTAL DÉBITO FISCAL (A)</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-base sm:text-lg font-black font-mono tabular-nums text-emerald-600 dark:text-emerald-400">
                  {formatCRC(metricasD104.totalDebitoFiscal)}
                </span>
                <button
                  type="button"
                  onClick={() => handleCopyCasilla("110", metricasD104.totalDebitoFiscal)}
                  className="rounded-md bg-emerald-500/20 p-1.5 text-emerald-700 hover:bg-emerald-500/30 cursor-pointer"
                  title="Copiar Débito Fiscal"
                >
                  {copiedCasilla === "110" ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                </button>
              </div>
            </div>

            {/* Casilla 114: Factor de Proporcionalidad / Prorrata */}
            <div className="rounded-xl border border-blue-500/30 bg-blue-500/5 p-3 flex items-center justify-between">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-blue-700 dark:text-blue-300">
                    CASILLA [114]
                  </span>
                  <span
                    className={`rounded-full px-2 py-0.2 text-[10px] font-bold ${
                      metricasD104.tieneProrrataMixta
                        ? "bg-amber-500/20 text-amber-700 dark:text-amber-300"
                        : "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300"
                    }`}
                  >
                    {metricasD104.tieneProrrataMixta ? "Ventas Mixtas Detectadas" : "Crédito Pleno (100%)"}
                  </span>
                </div>
                <p className="text-xs font-bold text-foreground">COEFICIENTE DE PROPORCIONALIDAD (PRORRATA)</p>
                <p className="text-[10px] text-muted-foreground">
                  {metricasD104.tieneProrrataMixta
                    ? "Ventas gravadas ÷ Ventas totales del período fiscal (Art. 30 Ley 9635)"
                    : "El 100% de tus ventas tienen derecho pleno a crédito fiscal"}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-base sm:text-lg font-black font-mono tabular-nums text-blue-600 dark:text-blue-400">
                  {metricasD104.factorProrrata.toFixed(2)}%
                </span>
                <button
                  type="button"
                  onClick={() => handleCopyCasilla("114", metricasD104.factorProrrata, true)}
                  className="rounded-md bg-blue-500/20 p-1.5 text-blue-700 hover:bg-blue-500/30 cursor-pointer"
                  title="Copiar Coeficiente de Prorrata para Casilla 114"
                >
                  {copiedCasilla === "114" ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* SECCIÓN 2: CRÉDITO FISCAL (COMPRAS Y GASTOS DEL MES) */}
        <div className="rounded-2xl border border-border bg-card p-5 shadow-soft space-y-4">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div className="flex items-center gap-2">
              <div className="grid h-8 w-8 place-items-center rounded-lg bg-amber-500/10 text-amber-600">
                <Receipt className="h-4 w-4" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-foreground">II. Determinación del Crédito Fiscal</h4>
                <p className="text-[11px] text-muted-foreground">Compras a Proveedores y Gastos con IVA Deducible</p>
              </div>
            </div>
            <span className="text-[11px] font-mono font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full">
              {metricasD104.cantidadCompras} soportadas
            </span>
          </div>

          {/* Banner de Validación CCE ante Hacienda */}
          {onAbrirAceptadorGastos && (
            <div className="flex flex-wrap items-center justify-between gap-2.5 rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-3 text-xs">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
                <span className="text-[11px] text-muted-foreground">
                  Para deducir este crédito fiscal, Hacienda exige la emisión del <strong>Mensaje Receptor (CCE)</strong>.
                </span>
              </div>
              <button
                type="button"
                onClick={onAbrirAceptadorGastos}
                className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-[11px] font-bold text-white hover:bg-emerald-700 transition-colors cursor-pointer"
              >
                Aceptar Facturas de Gastos (CCE) →
              </button>
            </div>
          )}

          <div className="space-y-3">
            {/* Casilla 121: Compras Gravadas 13% */}
            <CasillaRow
              codigo="121"
              titulo="Compras y Gastos Gravados (Crédito Pleno 13%)"
              descripcion="Insumos, alquiler, electricidad, repuestos vinculados al negocio"
              base={metricasD104.baseComprasGravadas13}
              impuesto={metricasD104.credito13}
              impuestoEtiqueta="IVA Crédito Fiscal (13%)"
              onCopy={() => handleCopyCasilla("121", metricasD104.baseComprasGravadas13)}
              isCopied={copiedCasilla === "121"}
            />

            {/* Casilla 122: Compras Tarifas Reducidas */}
            <CasillaRow
              codigo="122"
              titulo="Compras a Tarifas Reducidas (4%, 2%, 1%)"
              descripcion="Compras autorizadas bajo regímenes especiales"
              base={metricasD104.baseComprasReducidas}
              impuesto={metricasD104.creditoReducidas}
              impuestoEtiqueta="Crédito Reducido"
              onCopy={() => handleCopyCasilla("122", metricasD104.baseComprasReducidas)}
              isCopied={copiedCasilla === "122"}
            />

            {/* Casilla 123: Compras Exentas */}
            <CasillaRow
              codigo="123"
              titulo="Compras Exentas / Sin Derecho a Crédito Fiscal"
              descripcion="Gastos soportados sin IVA o con exención expresa"
              base={metricasD104.baseComprasExentas}
              impuesto={0}
              impuestoEtiqueta="Crédito ₡0"
              onCopy={() => handleCopyCasilla("123", metricasD104.baseComprasExentas)}
              isCopied={copiedCasilla === "123"}
            />

            {/* Total Crédito Casilla 130 */}
            <div className="rounded-xl border-2 border-amber-500/30 bg-amber-500/10 p-3.5 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300">
                  CASILLA [130]
                </span>
                <p className="text-xs font-black text-foreground">TOTAL CRÉDITO FISCAL BRUTO (B)</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-base sm:text-lg font-black font-mono tabular-nums text-amber-600 dark:text-amber-400">
                  {formatCRC(metricasD104.totalCreditoFiscal)}
                </span>
                <button
                  type="button"
                  onClick={() => handleCopyCasilla("130", metricasD104.totalCreditoFiscal)}
                  className="rounded-md bg-amber-500/20 p-1.5 text-amber-700 hover:bg-amber-500/30 cursor-pointer"
                  title="Copiar Crédito Fiscal"
                >
                  {copiedCasilla === "130" ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                </button>
              </div>
            </div>

            {/* Casilla 131: Crédito Fiscal por Proporcionalidad */}
            <div
              className={`rounded-xl border p-3 flex items-center justify-between ${
                metricasD104.tieneProrrataMixta
                  ? "border-2 border-purple-500/40 bg-purple-500/10"
                  : "border-border bg-background/50"
              }`}
            >
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-purple-700 dark:text-purple-300">
                    CASILLA [131]
                  </span>
                  {metricasD104.tieneProrrataMixta && (
                    <span className="rounded-full bg-purple-500/20 px-2 py-0.2 text-[10px] font-bold text-purple-700 dark:text-purple-300">
                      Crédito Real Deducible
                    </span>
                  )}
                </div>
                <p className="text-xs font-bold text-foreground">CRÉDITO FISCAL POR PROPORCIONALIDAD</p>
                <p className="text-[10px] text-muted-foreground">
                  {metricasD104.tieneProrrataMixta
                    ? `Aplica el factor ${metricasD104.factorProrrata.toFixed(2)}%. Resto (${formatCRC(
                        metricasD104.ivaNoDeducibleGasto
                      )}) pasa a gasto en Renta.`
                    : "Equivale al 100% del crédito bruto (sin afectación de ventas exentas)"}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-base sm:text-lg font-black font-mono tabular-nums text-purple-600 dark:text-purple-400">
                  {formatCRC(metricasD104.creditoFiscalProrrateado)}
                </span>
                <button
                  type="button"
                  onClick={() => handleCopyCasilla("131", metricasD104.creditoFiscalProrrateado)}
                  className="rounded-md bg-purple-500/20 p-1.5 text-purple-700 hover:bg-purple-500/30 cursor-pointer"
                  title="Copiar Crédito Aplicable por Prorrata para Casilla 131"
                >
                  {copiedCasilla === "131" ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Auditor de Proporcionalidad y Prorrata Oficial del IVA (Art. 30 Ley 9635) */}
      <div className="rounded-2xl border border-blue-500/20 bg-card p-5 shadow-soft space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border pb-3">
          <div className="flex items-center gap-2.5">
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-blue-500/10 text-blue-600">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-foreground">
                Auditor de Proporcionalidad y Prorrata del IVA (Art. 30 a 34 Ley 9635)
              </h4>
              <p className="text-[11px] text-muted-foreground">
                Regla tributaria para negocios con ventas mixtas (gravadas vs exentas).
              </p>
            </div>
          </div>
          <span
            className={`rounded-full px-3 py-1 text-xs font-bold ${
              metricasD104.tieneProrrataMixta
                ? "bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30"
                : "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30"
            }`}
          >
            {metricasD104.tieneProrrataMixta
              ? `Factor Aplicable: ${metricasD104.factorProrrata.toFixed(2)}% (Ajuste Requerido)`
              : "Factor Aplicable: 100.00% (Crédito Pleno)"}
          </span>
        </div>

        <div className="grid gap-3 sm:grid-cols-4 text-xs">
          <div className="rounded-xl border border-border/70 bg-muted/20 p-3">
            <span className="text-[11px] text-muted-foreground block">Ventas con Crédito Pleno</span>
            <span className="text-sm font-bold font-mono text-foreground">
              {formatCRC(metricasD104.ventasConCredito)}
            </span>
            <p className="text-[10px] text-muted-foreground mt-0.5">Tarifa 13% + Reducidas</p>
          </div>

          <div className="rounded-xl border border-border/70 bg-muted/20 p-3">
            <span className="text-[11px] text-muted-foreground block">Ventas Exentas / No Sujetas</span>
            <span className="text-sm font-bold font-mono text-amber-600">
              {formatCRC(metricasD104.baseExenta)}
            </span>
            <p className="text-[10px] text-muted-foreground mt-0.5">Sin derecho a crédito</p>
          </div>

          <div className="rounded-xl border border-purple-500/20 bg-purple-500/5 p-3">
            <span className="text-[11px] text-purple-700 dark:text-purple-300 block font-semibold">
              Crédito D-104 [Casilla 131]
            </span>
            <span className="text-sm font-bold font-mono text-purple-600 dark:text-purple-400">
              {formatCRC(metricasD104.creditoFiscalProrrateado)}
            </span>
            <p className="text-[10px] text-muted-foreground mt-0.5">Se descuenta del IVA a pagar</p>
          </div>

          <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-3">
            <span className="text-[11px] text-blue-700 dark:text-blue-300 block font-semibold">
              Gasto en Renta (D-101)
            </span>
            <span className="text-sm font-bold font-mono text-blue-600 dark:text-blue-400">
              {formatCRC(metricasD104.ivaNoDeducibleGasto)}
            </span>
            <p className="text-[10px] text-muted-foreground mt-0.5">IVA no deducible deducible en Renta</p>
          </div>
        </div>
      </div>

      {/* Guía Rápida para el Contador (Paso a Paso) */}
      <div className="rounded-2xl border border-border bg-muted/30 p-5 space-y-3">
        <h4 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
          <HelpCircle className="h-4 w-4 text-primary" /> ¿Cómo presentar esta declaración en TRIBU-CR / OVI?
        </h4>
        <div className="grid gap-3 sm:grid-cols-3 text-xs text-muted-foreground">
          <div className="rounded-xl border border-border/60 bg-card p-3">
            <span className="font-black text-primary font-mono text-sm block mb-1">Paso 1</span>
            <p>Ingresa al nuevo portal tributario de Hacienda con tu firma digital o usuario y selecciona el <strong>Formulario D-104 (IVA)</strong>.</p>
          </div>
          <div className="rounded-xl border border-border/60 bg-card p-3">
            <span className="font-black text-primary font-mono text-sm block mb-1">Paso 2</span>
            <p>Utiliza los botones <strong>Copiar</strong> en las casillas [101], [102], [121] y [130] de esta pantalla para pegar los montos exactos.</p>
          </div>
          <div className="rounded-xl border border-border/60 bg-card p-3">
            <span className="font-black text-primary font-mono text-sm block mb-1">Paso 3</span>
            <p>Verifica que la <strong>Casilla [140]</strong> coincida con el cálculo de DeclaraHub y presiona <em>Presentar Declaración</em>. ¡Listo en 2 minutos!</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function CasillaRow({
  codigo,
  titulo,
  descripcion,
  base,
  impuesto,
  impuestoEtiqueta,
  onCopy,
  isCopied,
}: {
  codigo: string;
  titulo: string;
  descripcion: string;
  base: number;
  impuesto: number;
  impuestoEtiqueta: string;
  onCopy: () => void;
  isCopied: boolean;
}) {
  return (
    <div className="rounded-xl border border-border bg-background/60 p-3 hover:bg-muted/40 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
      <div className="space-y-0.5">
        <div className="flex items-center gap-1.5">
          <span className="rounded bg-primary/10 px-1.5 py-0.2 font-mono text-[10px] font-bold text-primary">
            Casilla [{codigo}]
          </span>
          <span className="text-xs font-bold text-foreground">{titulo}</span>
        </div>
        <p className="text-[11px] text-muted-foreground">{descripcion}</p>
      </div>

      <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-border/60">
        <div className="text-right">
          <span className="text-xs font-mono font-bold text-foreground block tabular-nums">
            {formatCRC(base)}
          </span>
          <span className="text-[10px] text-muted-foreground font-mono block">
            {impuestoEtiqueta}: {formatCRC(impuesto)}
          </span>
        </div>
        <button
          type="button"
          onClick={onCopy}
          className="rounded-lg border border-border bg-card p-1.5 text-muted-foreground hover:bg-primary/10 hover:text-primary transition-all cursor-pointer"
          title={`Copiar valor de Casilla [${codigo}]`}
        >
          {isCopied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
        </button>
      </div>
    </div>
  );
}
