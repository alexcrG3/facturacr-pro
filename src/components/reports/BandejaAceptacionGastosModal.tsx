import { useState, useMemo } from "react";
import {
  X,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Send,
  Loader2,
  FileCheck2,
  FileX2,
  CheckSquare,
  Square,
  HelpCircle,
  Sparkles,
  Download,
  Building2,
  FileCode,
} from "lucide-react";
import { toast } from "sonner";
import { formatCRC } from "@/lib/mock-data";
import { ComprobanteContable } from "@/lib/accounting-reports";
import {
  CodigoMensajeHacienda,
  CondicionImpuestoReceptor,
  transmitirMensajeReceptorHacienda,
  registrarAceptacionEnBaseDatos,
} from "@/lib/hacienda/mensaje-receptor";
import { HaciendaConfig } from "@/lib/hacienda/types";

interface BandejaAceptacionGastosModalProps {
  isOpen: boolean;
  onClose: () => void;
  compras: ComprobanteContable[];
  empresaNombre: string;
  empresaCedula: string;
  onCompletado: () => void;
}

export function BandejaAceptacionGastosModal({
  isOpen,
  onClose,
  compras,
  empresaNombre,
  empresaCedula,
  onCompletado,
}: BandejaAceptacionGastosModalProps) {
  // Filtrar solo las compras
  const listaCompras = useMemo(() => {
    return compras.filter((c) => c.tipoOperacion === "COMPRA");
  }, [compras]);

  // Selección de IDs
  const [seleccionados, setSeleccionados] = useState<string[]>(() =>
    listaCompras.map((c) => c.id)
  );

  // Opciones de confirmación
  const [codigoMensaje, setCodigoMensaje] = useState<CodigoMensajeHacienda>(1); // 1 = Aceptación Total
  const [condicionImpuesto, setCondicionImpuesto] =
    useState<CondicionImpuestoReceptor>("01"); // 01 = Crédito IVA total
  const [detalleMensaje, setDetalleMensaje] = useState("");

  // Estado de procesamiento en lote
  const [procesando, setProcesando] = useState(false);
  const [progreso, setProgreso] = useState({ actual: 0, total: 0 });
  const [resultadoFinal, setResultadoFinal] = useState<{
    exitosos: number;
    fallidos: number;
  } | null>(null);

  if (!isOpen) return null;

  const toggleSeleccion = (id: string) => {
    setSeleccionados((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const seleccionarTodos = () => {
    if (seleccionados.length === listaCompras.length) {
      setSeleccionados([]);
    } else {
      setSeleccionados(listaCompras.map((c) => c.id));
    }
  };

  // Totales de la selección
  const comprasSeleccionadas = listaCompras.filter((c) =>
    seleccionados.includes(c.id)
  );
  const totalMontoSeleccionado = comprasSeleccionadas.reduce(
    (acc, c) => acc + c.totalComprobante,
    0
  );
  const totalIvaSeleccionado = comprasSeleccionadas.reduce(
    (acc, c) => acc + (c.totalIva || 0),
    0
  );

  // Ejecución Masiva
  const handleAceptarMasivo = async () => {
    if (comprasSeleccionadas.length === 0) {
      toast.warning("Selecciona al menos una factura para aceptar.");
      return;
    }

    setProcesando(true);
    setResultadoFinal(null);
    setProgreso({ actual: 0, total: comprasSeleccionadas.length });

    // Cargar credenciales de Hacienda guardadas en configuración
    const configGuardada: HaciendaConfig = {
      ambiente:
        (localStorage.getItem("facturacr_hacienda_env") as any) || "staging",
      usuarioAtv:
        localStorage.getItem("facturacr_hacienda_username") ||
        "cpf-03-0101-483899@stag.comprobanteselectronicos.go.cr",
      claveAtv:
        localStorage.getItem("facturacr_hacienda_password") || "Hacienda2026*",
      pinP12: localStorage.getItem("facturacr_hacienda_pin") || "1234",
      p12CertBase64:
        localStorage.getItem("facturacr_hacienda_p12_base64") || undefined,
    };

    let exitosos = 0;
    let fallidos = 0;

    for (let i = 0; i < comprasSeleccionadas.length; i++) {
      const item = comprasSeleccionadas[i];
      setProgreso({ actual: i + 1, total: comprasSeleccionadas.length });

      try {
        const respuesta = await transmitirMensajeReceptorHacienda({
          config: configGuardada,
          datos: {
            claveDocEmisor: item.clave,
            cedulaEmisor: item.emisorCedula,
            fechaEmisionDoc: item.fechaEmision,
            mensaje: codigoMensaje,
            detalleMensaje:
              detalleMensaje.trim() ||
              (codigoMensaje === 1
                ? "Aceptación total de compras para crédito fiscal IVA D-104"
                : codigoMensaje === 2
                ? "Aceptación parcial de factura electrónica"
                : "Rechazo de comprobante"),
            montoTotalImpuesto: item.totalIva || 0,
            totalFactura: item.totalComprobante || 0,
            cedulaReceptor: empresaCedula,
            numeroSecuencia: i + 1,
            condicionImpuesto: condicionImpuesto,
          },
          p12CertBase64: configGuardada.p12CertBase64,
          pinP12: configGuardada.pinP12,
        });

        if (respuesta.ok) {
          await registrarAceptacionEnBaseDatos({
            compraId: item.id,
            clave: item.clave,
            consecutivo: respuesta.consecutivo,
            xmlFirmado: respuesta.xmlFirmado,
            tipoAceptacion:
              codigoMensaje === 1
                ? "ACEPTADO"
                : codigoMensaje === 2
                ? "ACEPTADO_PARCIAL"
                : "RECHAZADO",
          });
          exitosos++;
        } else {
          fallidos++;
        }
      } catch (err) {
        console.error("Error transmitiendo CCE:", err);
        fallidos++;
      }
    }

    setProcesando(false);
    setResultadoFinal({ exitosos, fallidos });
    toast.success(
      `¡Proceso completado! ${exitosos} comprobantes confirmados ante Hacienda.`,
      {
        description:
          codigoMensaje === 1
            ? "El crédito fiscal ha sido blindado legalmente para la declaración D-104."
            : undefined,
      }
    );
    onCompletado();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
      <div className="w-full max-w-4xl rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
        {/* Cabecera */}
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-500/10 text-emerald-600">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-foreground">
                  Aceptador Masivo de Gastos ante Hacienda (CCE)
                </h3>
                <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-bold text-emerald-600">
                  Hacienda CR v4.3/v4.4
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                Emite el Mensaje Receptor obligatorio para legalizar el crédito fiscal de tus compras y gastos deducibles.
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

        {/* Resumen de Empresa Activa */}
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-muted/30 p-3 text-xs border border-border">
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-primary" />
            <span className="font-semibold text-muted-foreground">Empresa Receptora:</span>
            <strong className="text-foreground">{empresaNombre}</strong>
            <span className="font-mono text-muted-foreground">({empresaCedula})</span>
          </div>

          <div className="flex items-center gap-4">
            <div>
              <span className="text-muted-foreground">Total Compras: </span>
              <strong className="font-mono text-foreground">
                {formatCRC(totalMontoSeleccionado)}
              </strong>
            </div>
            <div>
              <span className="text-muted-foreground">IVA a Deducir: </span>
              <strong className="font-mono text-emerald-600">
                +{formatCRC(totalIvaSeleccionado)}
              </strong>
            </div>
          </div>
        </div>

        {/* Parámetros de Confirmación */}
        <div className="grid gap-4 sm:grid-cols-2 rounded-xl border border-border bg-card p-4">
          {/* Tipo de Mensaje Receptor */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-foreground">
              Acción Receptor (Tipo de Documento)
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setCodigoMensaje(1)}
                className={`flex flex-col items-center justify-center rounded-lg border p-2 text-center transition-all ${
                  codigoMensaje === 1
                    ? "border-emerald-500 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-bold"
                    : "border-border bg-muted/20 text-muted-foreground hover:bg-muted"
                }`}
              >
                <CheckCircle2 className="h-4 w-4 mb-1 text-emerald-600" />
                <span className="text-xs">Aceptación Total</span>
                <span className="text-[10px] text-muted-foreground">Doc. 05 (CCE)</span>
              </button>

              <button
                type="button"
                onClick={() => setCodigoMensaje(2)}
                className={`flex flex-col items-center justify-center rounded-lg border p-2 text-center transition-all ${
                  codigoMensaje === 2
                    ? "border-amber-500 bg-amber-500/10 text-amber-700 dark:text-amber-300 font-bold"
                    : "border-border bg-muted/20 text-muted-foreground hover:bg-muted"
                }`}
              >
                <AlertTriangle className="h-4 w-4 mb-1 text-amber-600" />
                <span className="text-xs">Aceptación Parcial</span>
                <span className="text-[10px] text-muted-foreground">Doc. 06 (CPCE)</span>
              </button>

              <button
                type="button"
                onClick={() => setCodigoMensaje(3)}
                className={`flex flex-col items-center justify-center rounded-lg border p-2 text-center transition-all ${
                  codigoMensaje === 3
                    ? "border-destructive bg-destructive/10 text-destructive font-bold"
                    : "border-border bg-muted/20 text-muted-foreground hover:bg-muted"
                }`}
              >
                <FileX2 className="h-4 w-4 mb-1 text-destructive" />
                <span className="text-xs">Rechazo Total</span>
                <span className="text-[10px] text-muted-foreground">Doc. 07 (RCE)</span>
              </button>
            </div>
          </div>

          {/* Condición de IVA */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-foreground">
              Condición de Impuesto (Acreditación)
            </label>
            <select
              value={condicionImpuesto}
              onChange={(e) => setCondicionImpuesto(e.target.value as any)}
              className="h-10 w-full rounded-xl border border-border bg-background px-3 text-xs font-semibold text-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20"
            >
              <option value="01">01 - Genera crédito IVA total (Pleno - Insumos y Gastos)</option>
              <option value="02">02 - Genera crédito IVA parcial</option>
              <option value="03">03 - Bienes de capital (Maquinaria / Activos)</option>
              <option value="04">04 - Gasto corriente sin derecho a crédito fiscal</option>
              <option value="05">05 - Proporcionalidad (Prorrata)</option>
            </select>
            <p className="mt-1 text-[11px] text-muted-foreground">
              {condicionImpuesto === "01"
                ? "Deduce el 100% del IVA en compras vinculadas directamente a la actividad."
                : condicionImpuesto === "04"
                ? "Acepta el gasto para Impuesto sobre la Renta pero sin descontar IVA."
                : "Aplica la regla de deducción seleccionada ante Hacienda."}
            </p>
          </div>
        </div>

        {/* Tabla de Facturas Recibidas para Aceptar */}
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="flex items-center justify-between p-3 bg-muted/30 border-b border-border text-xs">
            <button
              type="button"
              onClick={seleccionarTodos}
              className="inline-flex items-center gap-1.5 font-semibold text-foreground hover:text-primary transition-colors"
            >
              {seleccionados.length === listaCompras.length ? (
                <CheckSquare className="h-4 w-4 text-primary" />
              ) : (
                <Square className="h-4 w-4 text-muted-foreground" />
              )}
              <span>
                Seleccionar todos ({seleccionados.length} de {listaCompras.length})
              </span>
            </button>
            <span className="text-muted-foreground font-mono text-[11px]">
              {comprasSeleccionadas.length} listas para firmar con llave .p12
            </span>
          </div>

          <div className="max-h-56 overflow-y-auto">
            {listaCompras.length === 0 ? (
              <div className="p-8 text-center text-xs text-muted-foreground">
                No hay compras o gastos registrados en este período. Puedes importar archivos XML desde la barra superior.
              </div>
            ) : (
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/50 text-[11px] text-muted-foreground border-b border-border">
                  <tr>
                    <th className="px-3 py-2 w-8"></th>
                    <th className="px-3 py-2">FECHA</th>
                    <th className="px-3 py-2">PROVEEDOR (EMISOR)</th>
                    <th className="px-3 py-2">CLAVE DE 50 DÍGITOS</th>
                    <th className="px-3 py-2 text-right">TOTAL</th>
                    <th className="px-3 py-2 text-right">IVA (13%)</th>
                    <th className="px-3 py-2 text-center">ESTADO CCE</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border font-mono text-[11px]">
                  {listaCompras.map((item) => {
                    const isSelected = seleccionados.includes(item.id);
                    return (
                      <tr
                        key={item.id}
                        onClick={() => toggleSeleccion(item.id)}
                        className={`cursor-pointer hover:bg-muted/40 transition-colors ${
                          isSelected ? "bg-primary/5" : ""
                        }`}
                      >
                        <td className="px-3 py-2">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {}} // Manejado por onClick de fila
                            className="rounded border-border text-primary focus:ring-primary"
                          />
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap text-muted-foreground">
                          {item.fechaEmision}
                        </td>
                        <td className="px-3 py-2 font-sans font-medium text-foreground max-w-[180px] truncate">
                          {item.emisorNombre}
                          <span className="block font-mono text-[10px] text-muted-foreground">
                            {item.emisorCedula}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-muted-foreground font-mono text-[10px]">
                          {item.clave.slice(0, 10)}...{item.clave.slice(-8)}
                        </td>
                        <td className="px-3 py-2 text-right font-bold text-foreground whitespace-nowrap">
                          {formatCRC(item.totalComprobante)}
                        </td>
                        <td className="px-3 py-2 text-right text-emerald-600 font-semibold whitespace-nowrap">
                          {formatCRC(item.totalIva)}
                        </td>
                        <td className="px-3 py-2 text-center whitespace-nowrap">
                          <span
                            className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                              item.estadoHacienda === "ACEPTADO"
                                ? "bg-emerald-500/10 text-emerald-600"
                                : "bg-amber-500/10 text-amber-600"
                            }`}
                          >
                            {item.estadoHacienda === "ACEPTADO"
                              ? "Aceptado CCE ✓"
                              : "Pendiente CCE"}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Progreso en vivo durante la transmisión */}
        {procesando && (
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold">
              <span className="flex items-center gap-2 text-primary">
                <Loader2 className="h-4 w-4 animate-spin" />
                Firmando y transmitiendo Mensaje Receptor ({progreso.actual} de {progreso.total})...
              </span>
              <span className="text-foreground font-mono">
                {Math.round((progreso.actual / (progreso.total || 1)) * 100)}%
              </span>
            </div>
            <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-300"
                style={{
                  width: `${(progreso.actual / (progreso.total || 1)) * 100}%`,
                }}
              />
            </div>
          </div>
        )}

        {/* Botonera de Acción */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-border">
          <div className="text-xs text-muted-foreground flex items-center gap-1.5">
            <Sparkles className="h-4 w-4 text-primary" />
            <span>
              Genera consecutivo oficial <code>0010000105000000000X</code> conforme a normativa de Hacienda.
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={procesando}
              className="rounded-xl border border-border px-4 py-2.5 text-xs font-semibold hover:bg-muted transition-colors"
            >
              Cerrar
            </button>

            <button
              type="button"
              onClick={handleAceptarMasivo}
              disabled={procesando || comprasSeleccionadas.length === 0}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-xs font-bold text-white shadow-soft hover:bg-emerald-700 transition-all hover:scale-[1.02] disabled:opacity-50 disabled:pointer-events-none"
            >
              {procesando ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Transmitiendo...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" /> TRANSMITIR ACEPTACIÓN A HACIENDA ({comprasSeleccionadas.length})
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
