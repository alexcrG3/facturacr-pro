import { useState } from "react";
import {
  X,
  Upload,
  FileCode,
  FileText,
  CheckCircle2,
  AlertCircle,
  FolderArchive,
  Layers,
  Sparkles,
  Loader2,
  Check,
} from "lucide-react";
import { toast } from "sonner";
import {
  parsearXmlHacienda,
  guardarComprobanteContable,
  ComprobanteContable,
  EstadoHacienda,
} from "@/lib/accounting-reports";

interface ImportXmlModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportComplete: () => void;
  initialMode?: "expediente" | "carpeta";
}

export function ImportXmlModal({
  isOpen,
  onClose,
  onImportComplete,
  initialMode = "carpeta",
}: ImportXmlModalProps) {
  const [mode, setMode] = useState<"expediente" | "carpeta">(initialMode);

  // Formulario Expediente Individual
  const [xmlFirmadoFile, setXmlFirmadoFile] = useState<File | null>(null);
  const [respuestaFile, setRespuestaFile] = useState<File | null>(null);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [metadataFile, setMetadataFile] = useState<File | null>(null);
  const [xmlOriginalFile, setXmlOriginalFile] = useState<File | null>(null);
  const [estadoExpediente, setEstadoExpediente] = useState<EstadoHacienda>("ACEPTADO");
  const [procesando, setProcesando] = useState(false);

  // Carpeta / Lote de XMLs
  const [archivosLote, setArchivosLote] = useState<File[]>([]);
  const [resultadoLote, setResultadoLote] = useState<{
    procesados: number;
    exitosos: number;
    fallidos: number;
  } | null>(null);

  if (!isOpen) return null;

  // Procesar Expediente Individual
  const handleRegistrarExpediente = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!xmlFirmadoFile) {
      toast.error("El archivo XML firmado es obligatorio");
      return;
    }

    setProcesando(true);
    try {
      const xmlText = await xmlFirmadoFile.text();
      const parsed = parsearXmlHacienda(xmlText);

      if (!parsed || !parsed.clave) {
        toast.error("No se pudo extraer la clave o datos fiscales del XML firmado.");
        setProcesando(false);
        return;
      }

      const item: ComprobanteContable = {
        id: "exp-" + Date.now(),
        tipoOperacion: parsed.tipoOperacion || "COMPRA",
        tipoDoc: parsed.tipoDoc || "FACTURA",
        tipoDocCodigo: parsed.tipoDocCodigo || "01",
        estadoHacienda: estadoExpediente,
        clave: parsed.clave || "50600000000000000000000000000000000000000000000000",
        consecutivo: parsed.consecutivo || "00100001010000000001",
        emisorCedula: parsed.emisorCedula || "0000000000",
        emisorNombre: parsed.emisorNombre || "Proveedor Desconocido",
        receptorCedula: parsed.receptorCedula || "3101483899",
        receptorNombre: parsed.receptorNombre || "GRUPO G TRES COMERCIALIZADORA INTERAMERICANA S.A.",
        fechaEmision: parsed.fechaEmision || new Date().toISOString().slice(0, 10),
        fechaHora: parsed.fechaHora || new Date().toISOString(),
        moneda: parsed.moneda || "CRC",
        tipoCambio: parsed.tipoCambio || 1,
        totalComprobante: parsed.totalComprobante || 0,
        totalVentaNeta: parsed.totalVentaNeta || 0,
        totalExento: parsed.totalExento || 0,
        totalExonerado: parsed.totalExonerado || 0,
        tarifaIva: parsed.tarifaIva || 13,
        totalIva: parsed.totalIva || 0,
        iva13: parsed.iva13 || 0,
        iva4: 0,
        iva2: 0,
        iva1: 0,
        respuestaHacienda: `Expediente importado: ${estadoExpediente}`,
        cabysPrincipal: parsed.cabysPrincipal || "",
        detallePrincipal: parsed.detallePrincipal || "Compra / Gasto Registrado",
      };

      guardarComprobanteContable(item);
      toast.success("¡Expediente registrado con éxito!", {
        description: `Comprobante ${item.tipoDoc} #${item.consecutivo} de ${item.emisorNombre} agregado.`,
      });
      onImportComplete();
      onClose();
    } catch (err) {
      toast.error("Error al procesar el expediente");
    } finally {
      setProcesando(false);
    }
  };

  // Procesar Carpeta o Múltiples XMLs
  const handleProcesarLote = async () => {
    if (archivosLote.length === 0) {
      toast.error("Por favor selecciona al menos un archivo XML");
      return;
    }

    setProcesando(true);
    let exitosos = 0;
    let fallidos = 0;

    for (const file of archivosLote) {
      try {
        if (!file.name.toLowerCase().endsWith(".xml")) continue;
        const text = await file.text();
        const parsed = parsearXmlHacienda(text);
        if (parsed && parsed.clave) {
          const item: ComprobanteContable = {
            id: "batch-" + Math.random().toString(36).slice(2),
            tipoOperacion: parsed.tipoOperacion || "COMPRA",
            tipoDoc: parsed.tipoDoc || "FACTURA",
            tipoDocCodigo: parsed.tipoDocCodigo || "01",
            estadoHacienda: parsed.estadoHacienda || "ACEPTADO",
            clave: parsed.clave,
            consecutivo: parsed.consecutivo || "00100001010000000001",
            emisorCedula: parsed.emisorCedula || "0000000000",
            emisorNombre: parsed.emisorNombre || "Proveedor",
            receptorCedula: parsed.receptorCedula || "3101483899",
            receptorNombre: parsed.receptorNombre || "GRUPO G TRES COMERCIALIZADORA INTERAMERICANA S.A.",
            fechaEmision: parsed.fechaEmision || new Date().toISOString().slice(0, 10),
            fechaHora: parsed.fechaHora || new Date().toISOString(),
            moneda: parsed.moneda || "CRC",
            tipoCambio: parsed.tipoCambio || 1,
            totalComprobante: parsed.totalComprobante || 0,
            totalVentaNeta: parsed.totalVentaNeta || 0,
            totalExento: parsed.totalExento || 0,
            totalExonerado: parsed.totalExonerado || 0,
            tarifaIva: parsed.tarifaIva || 13,
            totalIva: parsed.totalIva || 0,
            iva13: parsed.iva13 || 0,
            iva4: 0,
            iva2: 0,
            iva1: 0,
            respuestaHacienda: parsed.respuestaHacienda || "Importado desde XML",
            cabysPrincipal: parsed.cabysPrincipal || "",
            detallePrincipal: parsed.detallePrincipal || "",
          };
          guardarComprobanteContable(item);
          exitosos++;
        } else {
          fallidos++;
        }
      } catch {
        fallidos++;
      }
    }

    setProcesando(false);
    setResultadoLote({ procesados: archivosLote.length, exitosos, fallidos });
    toast.success(`Se procesaron ${exitosos} XMLs correctamente`, {
      description: fallidos > 0 ? `${fallidos} archivos no eran facturas válidas.` : undefined,
    });
    onImportComplete();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
      <div className="w-full max-w-2xl rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div className="flex items-center gap-2.5">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary">
              <FolderArchive className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-foreground">
                {mode === "carpeta" ? "Analizar / Importar Carpeta de XML" : "Importar Expediente Electrónico"}
              </h3>
              <p className="text-xs text-muted-foreground">
                Reconstruye compras, ventas e IVA directamente de los archivos oficiales de Hacienda.
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

        {/* Selector de Pestaña */}
        <div className="grid grid-cols-2 gap-2 rounded-xl bg-muted/40 p-1">
          <button
            type="button"
            onClick={() => setMode("carpeta")}
            className={`flex items-center justify-center gap-2 rounded-lg py-2 text-xs font-semibold transition-all ${
              mode === "carpeta"
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Layers className="h-4 w-4" /> Importar Lote / Carpeta XML
          </button>
          <button
            type="button"
            onClick={() => setMode("expediente")}
            className={`flex items-center justify-center gap-2 rounded-lg py-2 text-xs font-semibold transition-all ${
              mode === "expediente"
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <FileCode className="h-4 w-4" /> Expediente Individual
          </button>
        </div>

        {/* Modo 1: Lote / Carpeta XML */}
        {mode === "carpeta" && (
          <div className="space-y-4">
            <div className="rounded-xl border-2 border-dashed border-border bg-muted/20 p-8 text-center hover:bg-muted/30 transition-colors">
              <Upload className="mx-auto h-10 w-10 text-muted-foreground/60 mb-2" />
              <h4 className="text-sm font-semibold text-foreground">
                Arrastra aquí tus archivos XML o selecciona una carpeta
              </h4>
              <p className="mt-1 text-xs text-muted-foreground max-w-sm mx-auto">
                El sistema leerá automáticamente claves numéricas, proveedores, montos, tarifas de IVA y respuestas de Hacienda.
              </p>

              <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-all shadow-xs">
                  <FileCode className="h-4 w-4" /> Seleccionar Archivos XML
                  <input
                    type="file"
                    multiple
                    accept=".xml"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files) {
                        setArchivosLote(Array.from(e.target.files));
                        setResultadoLote(null);
                      }
                    }}
                  />
                </label>
              </div>

              {archivosLote.length > 0 && (
                <div className="mt-4 rounded-lg bg-primary/10 p-3 text-xs text-primary font-medium">
                  {archivosLote.length} archivos XML seleccionados listos para procesar.
                </div>
              )}
            </div>

            {resultadoLote && (
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-xs text-emerald-800 dark:text-emerald-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
                  <div>
                    <p className="font-bold">Lote procesado exitosamente</p>
                    <p className="text-[11px] opacity-90">
                      {resultadoLote.exitosos} facturas y compras agregadas al reporte.
                    </p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="rounded-lg bg-emerald-600 text-white px-3 py-1.5 font-semibold text-xs hover:bg-emerald-700"
                >
                  Ver en Reporte
                </button>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium hover:bg-muted"
              >
                Cerrar
              </button>
              <button
                type="button"
                onClick={handleProcesarLote}
                disabled={procesando || archivosLote.length === 0}
                className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                {procesando ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Procesando XMLs...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" /> Reconstruir Datos ({archivosLote.length})
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Modo 2: Expediente Individual (Exacto a la imagen del usuario) */}
        {mode === "expediente" && (
          <form onSubmit={handleRegistrarExpediente} className="space-y-3.5 text-xs">
            {/* XML firmado */}
            <div>
              <label className="mb-1 block font-semibold text-foreground">XML firmado *</label>
              <div className="flex items-center gap-2">
                <input
                  readOnly
                  value={xmlFirmadoFile ? xmlFirmadoFile.name : ""}
                  placeholder="Selecciona el archivo XML firmado por el emisor"
                  className="h-9 w-full rounded-lg border border-border bg-background px-3 text-xs"
                />
                <label className="inline-flex cursor-pointer items-center gap-1 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground shrink-0 hover:bg-primary/90">
                  <Upload className="h-3.5 w-3.5" /> Buscar
                  <input
                    type="file"
                    accept=".xml"
                    required
                    className="hidden"
                    onChange={(e) => setXmlFirmadoFile(e.target.files?.[0] || null)}
                  />
                </label>
              </div>
            </div>

            {/* Respuesta Hacienda */}
            <div>
              <label className="mb-1 block font-semibold text-foreground">Respuesta Hacienda</label>
              <div className="flex items-center gap-2">
                <input
                  readOnly
                  value={respuestaFile ? respuestaFile.name : ""}
                  placeholder="Archivo MensajeHacienda.xml (Confirmación oficial)"
                  className="h-9 w-full rounded-lg border border-border bg-background px-3 text-xs"
                />
                <label className="inline-flex cursor-pointer items-center gap-1 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground shrink-0 hover:bg-primary/90">
                  <Upload className="h-3.5 w-3.5" /> Buscar
                  <input
                    type="file"
                    accept=".xml"
                    className="hidden"
                    onChange={(e) => setRespuestaFile(e.target.files?.[0] || null)}
                  />
                </label>
              </div>
            </div>

            {/* PDF */}
            <div>
              <label className="mb-1 block font-semibold text-foreground">PDF</label>
              <div className="flex items-center gap-2">
                <input
                  readOnly
                  value={pdfFile ? pdfFile.name : ""}
                  placeholder="Representación gráfica en PDF"
                  className="h-9 w-full rounded-lg border border-border bg-background px-3 text-xs"
                />
                <label className="inline-flex cursor-pointer items-center gap-1 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground shrink-0 hover:bg-primary/90">
                  <Upload className="h-3.5 w-3.5" /> Buscar
                  <input
                    type="file"
                    accept=".pdf"
                    className="hidden"
                    onChange={(e) => setPdfFile(e.target.files?.[0] || null)}
                  />
                </label>
              </div>
            </div>

            {/* metadata.json */}
            <div>
              <label className="mb-1 block font-semibold text-foreground">metadata.json</label>
              <div className="flex items-center gap-2">
                <input
                  readOnly
                  value={metadataFile ? metadataFile.name : ""}
                  placeholder="Archivo opcional metadata.json del comprobante"
                  className="h-9 w-full rounded-lg border border-border bg-background px-3 text-xs"
                />
                <label className="inline-flex cursor-pointer items-center gap-1 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground shrink-0 hover:bg-primary/90">
                  <Upload className="h-3.5 w-3.5" /> Buscar
                  <input
                    type="file"
                    accept=".json"
                    className="hidden"
                    onChange={(e) => setMetadataFile(e.target.files?.[0] || null)}
                  />
                </label>
              </div>
            </div>

            {/* XML original opcional */}
            <div>
              <label className="mb-1 block font-semibold text-foreground">XML original opcional</label>
              <div className="flex items-center gap-2">
                <input
                  readOnly
                  value={xmlOriginalFile ? xmlOriginalFile.name : ""}
                  placeholder="XML sin firmar (opcional)"
                  className="h-9 w-full rounded-lg border border-border bg-background px-3 text-xs"
                />
                <label className="inline-flex cursor-pointer items-center gap-1 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground shrink-0 hover:bg-primary/90">
                  <Upload className="h-3.5 w-3.5" /> Buscar
                  <input
                    type="file"
                    accept=".xml"
                    className="hidden"
                    onChange={(e) => setXmlOriginalFile(e.target.files?.[0] || null)}
                  />
                </label>
              </div>
            </div>

            {/* Selector de Estado */}
            <div>
              <label className="mb-1 block font-semibold text-foreground">Estado</label>
              <select
                value={estadoExpediente}
                onChange={(e) => setEstadoExpediente(e.target.value as EstadoHacienda)}
                className="h-9 w-full rounded-lg border border-border bg-background px-3 text-xs font-semibold focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20"
              >
                <option value="ACEPTADO">ACEPTADO (Por Hacienda)</option>
                <option value="RECIBIDO">RECIBIDO (Pendiente de respuesta)</option>
                <option value="RECHAZADO">RECHAZADO</option>
              </select>
            </div>

            <div className="flex items-center justify-end gap-2 pt-4 border-t border-border">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium hover:bg-muted"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={procesando || !xmlFirmadoFile}
                className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-5 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                {procesando ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Registrando...
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4" /> Registrar expediente
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
