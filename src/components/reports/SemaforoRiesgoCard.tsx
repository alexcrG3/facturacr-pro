import { useState } from "react";
import {
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  Info,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Sparkles,
  ArrowRight,
  HelpCircle,
  Activity,
  FileCheck2,
} from "lucide-react";
import { DiagnosticoRiesgoFiscal } from "@/lib/hacienda/semaforo-riesgo";
import { formatCRC } from "@/lib/mock-data";

interface SemaforoRiesgoCardProps {
  diagnostico: DiagnosticoRiesgoFiscal;
  onAbrirAceptadorGastos?: () => void;
}

export function SemaforoRiesgoCard({
  diagnostico,
  onAbrirAceptadorGastos,
}: SemaforoRiesgoCardProps) {
  const [expandido, setExpandido] = useState(false);

  const { puntuacionSalud, nivelRiesgo, alertas } = diagnostico;

  const colorConfig = {
    BAJO: {
      border: "border-emerald-500/30",
      bg: "bg-emerald-500/5",
      badgeBg: "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
      iconColor: "text-emerald-600",
      scoreColor: "text-emerald-600 dark:text-emerald-400",
      label: "Riesgo Bajo · Salud Fiscal Excelente",
      sublabel: "Tus comprobantes cumplen con los estándares de validación de Hacienda.",
    },
    MEDIO: {
      border: "border-amber-500/30",
      bg: "bg-amber-500/5",
      badgeBg: "bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/30",
      iconColor: "text-amber-600",
      scoreColor: "text-amber-600 dark:text-amber-400",
      label: "Riesgo Medio · Requiere Atención Preventiva",
      sublabel: "Se detectaron incongruencias que podrían generar consultas de Tributación.",
    },
    ALTO: {
      border: "border-destructive/40",
      bg: "bg-destructive/5",
      badgeBg: "bg-destructive/20 text-destructive border-destructive/30",
      iconColor: "text-destructive",
      scoreColor: "text-destructive",
      label: "Riesgo Alto · Contingencia Tributaria Detectada",
      sublabel: "Hay comprobantes rechazados o gastos sin confirmación legal.",
    },
  }[nivelRiesgo];

  return (
    <div
      className={`rounded-2xl border ${colorConfig.border} ${colorConfig.bg} p-5 shadow-soft transition-all space-y-4`}
    >
      {/* Cabecera del Semáforo */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-card border border-border shadow-xs ${colorConfig.iconColor}`}>
            {nivelRiesgo === "BAJO" ? (
              <ShieldCheck className="h-6 w-6" />
            ) : (
              <ShieldAlert className="h-6 w-6" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Activity className="h-3.5 w-3.5 text-primary" /> Semáforo de Riesgo Tributario (Anti-Auditoría)
              </span>
              <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase border ${colorConfig.badgeBg}`}>
                {colorConfig.label}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              {colorConfig.sublabel}
            </p>
          </div>
        </div>

        {/* Puntuación */}
        <div className="flex items-center gap-3">
          <div className="text-right">
            <span className="text-[10px] font-mono uppercase text-muted-foreground block">
              Índice de Salud Fiscal
            </span>
            <div className="flex items-baseline justify-end gap-1">
              <span className={`text-2xl sm:text-3xl font-black font-mono tabular-nums ${colorConfig.scoreColor}`}>
                {puntuacionSalud}
              </span>
              <span className="text-xs font-bold text-muted-foreground font-mono">/ 100</span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setExpandido(!expandido)}
            className="rounded-xl border border-border bg-card p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
            title={expandido ? "Ocultar diagnóstico" : "Ver diagnóstico completo"}
          >
            {expandido ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Chequeos de Auditoría Rápida */}
      <div className="grid gap-2.5 sm:grid-cols-4 text-xs pt-1">
        {/* CCE */}
        <div className="rounded-xl border border-border/80 bg-card/80 p-2.5">
          <div className="flex items-center justify-between text-[11px] mb-1">
            <span className="text-muted-foreground">Confirmación CCE</span>
            {diagnostico.comprasSinCCE === 0 ? (
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
            ) : (
              <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
            )}
          </div>
          <span className="font-bold text-foreground block font-mono">
            {diagnostico.comprasSinCCE === 0
              ? "100% al día ✓"
              : `${diagnostico.comprasSinCCE} sin confirmar`}
          </span>
        </div>

        {/* Anulaciones */}
        <div className="rounded-xl border border-border/80 bg-card/80 p-2.5">
          <div className="flex items-center justify-between text-[11px] mb-1">
            <span className="text-muted-foreground">Notas de Crédito</span>
            {diagnostico.notasCreditoPorcentaje <= 15 ? (
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
            ) : (
              <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
            )}
          </div>
          <span className="font-bold text-foreground block font-mono">
            {diagnostico.notasCreditoPorcentaje.toFixed(1)}% de ventas
          </span>
        </div>

        {/* Margen */}
        <div className="rounded-xl border border-border/80 bg-card/80 p-2.5">
          <div className="flex items-center justify-between text-[11px] mb-1">
            <span className="text-muted-foreground">Ventas vs Gastos</span>
            {diagnostico.totalVentas >= diagnostico.totalCompras ? (
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
            ) : (
              <Info className="h-3.5 w-3.5 text-blue-600" />
            )}
          </div>
          <span className="font-bold text-foreground block font-mono">
            {diagnostico.totalVentas >= diagnostico.totalCompras
              ? "Margen Positivo ✓"
              : "Saldo a Favor (Inversión)"}
          </span>
        </div>

        {/* Umbral D-151 */}
        <div className="rounded-xl border border-border/80 bg-card/80 p-2.5">
          <div className="flex items-center justify-between text-[11px] mb-1">
            <span className="text-muted-foreground">Límite D-151 (&gt; ₡2.5M)</span>
            <Sparkles className="h-3.5 w-3.5 text-primary" />
          </div>
          <span className="font-bold text-foreground block font-mono">
            {diagnostico.proveedoresD151.length + diagnostico.clientesD151.length} terceros detectados
          </span>
        </div>
      </div>

      {/* Lista Desplegable de Hallazgos y Alertas */}
      {expandido && (
        <div className="space-y-3 pt-2 border-t border-border">
          <h5 className="text-xs font-bold text-foreground flex items-center gap-2">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            Hallazgos del Diagnóstico Preventivo ({alertas.length})
          </h5>

          {alertas.length === 0 ? (
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>
                ¡Felicidades! Todos los comprobantes del período cumplen los parámetros de consistencia fiscal de la DGT.
              </span>
            </div>
          ) : (
            <div className="space-y-2">
              {alertas.map((alerta) => (
                <div
                  key={alerta.id}
                  className={`rounded-xl border p-3 text-xs space-y-1.5 ${
                    alerta.tipo === "CRITICO"
                      ? "border-destructive/30 bg-destructive/10 text-destructive-foreground"
                      : alerta.tipo === "ADVERTENCIA"
                      ? "border-amber-500/30 bg-amber-500/10"
                      : "border-blue-500/30 bg-blue-500/10"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span
                        className={`rounded px-1.5 py-0.5 text-[10px] font-black uppercase ${
                          alerta.tipo === "CRITICO"
                            ? "bg-destructive text-white"
                            : alerta.tipo === "ADVERTENCIA"
                            ? "bg-amber-600 text-white"
                            : "bg-blue-600 text-white"
                        }`}
                      >
                        {alerta.tipo}
                      </span>
                      <strong className="text-foreground">{alerta.titulo}</strong>
                    </div>

                    {alerta.casillaAfectada && (
                      <span className="font-mono text-[10px] font-bold text-muted-foreground bg-card px-2 py-0.5 rounded border border-border">
                        {alerta.casillaAfectada}
                      </span>
                    )}
                  </div>

                  <p className="text-muted-foreground text-[11px]">{alerta.descripcion}</p>

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                    <p className="text-[11px] font-semibold text-foreground">
                      💡 Solución recomendada: <span className="font-normal text-muted-foreground">{alerta.solucionSugerida}</span>
                    </p>

                    {alerta.id === "alerta-cce-pendiente" && onAbrirAceptadorGastos && (
                      <button
                        type="button"
                        onClick={onAbrirAceptadorGastos}
                        className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-emerald-700 transition-colors cursor-pointer"
                      >
                        Aceptar Gastos (CCE) →
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
