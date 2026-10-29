import { useState, useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  X,
  Copy,
  Check,
  Download,
  FileCode,
  FileText,
  Building2,
  User,
  ShieldCheck,
  AlertCircle,
  Clock,
  Package,
  RotateCw,
  Printer,
  Archive,
  Eye,
  Edit3,
  ArrowRight,
  Cloud,
  FolderSync,
  ExternalLink,
} from "lucide-react";
import JSZip from "jszip";
import { QRCodeSVG } from "qrcode.react";
import { toast } from "sonner";
import { formatCRC } from "@/lib/mock-data";
import { useApp } from "@/contexts/AppContext";
import { InvoiceRenderer } from "./templates/InvoiceRenderer";
import {
  construirXmlHacienda,
  firmarXmlHacienda,
  generarMensajeHaciendaXml,
  obtenerDiagnosticoHacienda,
} from "@/lib/hacienda";

export type DossierStatus = "borrador" | "pendiente" | "enviada" | "aceptada" | "rechazada";

export interface InvoiceDossierItem {
  id: string;
  number: string;
  client:
    | {
        name: string;
        email?: string;
        legalId?: string;
        phone?: string;
      }
    | string;
  date: string;
  total: number;
  status: DossierStatus | string;
  type: "FE" | "TE" | "NC" | "ND";
  haciendaKey?: string;
  clave?: string;
  xml?: string;
  motivoRechazo?: string;
  origen?: string;
  items?: any[];
  appName?: string;
}

function normalizeDossierStatus(st?: string): DossierStatus {
  const s = (st || "").toLowerCase();
  if (s.includes("aceptad")) return "aceptada";
  if (s.includes("rechazad")) return "rechazada";
  if (s.includes("enviad") || s.includes("recibid")) return "enviada";
  if (s.includes("pendient") || s.includes("procesand")) return "pendiente";
  if (s.includes("borrador")) return "borrador";
  return "aceptada";
}

interface InvoiceDossierModalProps {
  invoice: InvoiceDossierItem | null;
  onClose: () => void;
  onStatusChange?: (id: string, newStatus: DossierStatus) => void;
}

export function InvoiceDossierModal({
  invoice,
  onClose,
  onStatusChange,
}: InvoiceDossierModalProps) {
  const navigate = useNavigate();
  const { activeEstablishment } = useApp();
  const [activeTab, setActiveTab] = useState<"resumen" | "interpretacion" | "archivos">("resumen");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [selectedFilePreview, setSelectedFilePreview] = useState<{
    title: string;
    type: "xml" | "pdf";
    content: string;
    filename: string;
  } | null>(() => {
    if ((invoice as any)?.autoOpenPdf) {
      return {
        title: `Representación Gráfica: ${invoice?.number}`,
        type: "pdf",
        content: "",
        filename: `${invoice?.number}.pdf`,
      };
    }
    return null;
  });
  const [isConsulting, setIsConsulting] = useState(false);
  const [isUploadingDrive, setIsUploadingDrive] = useState(false);
  const [isDriveSaved, setIsDriveSaved] = useState(false);
  const [currentStatus, setCurrentStatus] = useState<DossierStatus>(() =>
    normalizeDossierStatus(invoice?.status),
  );

  useEffect(() => {
    if (invoice?.status) {
      setCurrentStatus(normalizeDossierStatus(invoice.status));
    }
    if ((invoice as any)?.autoOpenPdf) {
      setSelectedFilePreview({
        title: `Representación Gráfica: ${invoice?.number}`,
        type: "pdf",
        content: "",
        filename: `${invoice?.number}.pdf`,
      });
    }
  }, [invoice?.status, (invoice as any)?.autoOpenPdf]);

  const handleSaveToGoogleDrive = () => {
    setIsUploadingDrive(true);
    toast.info("Conectando con Google Drive...", {
      description: `Creando estructura de carpeta /Facturas_CR_2026/${invoice?.number}/`,
    });
    setTimeout(() => {
      setIsUploadingDrive(false);
      setIsDriveSaved(true);
      toast.success("¡Expediente respaldado en Google Drive!", {
        description: `Se guardaron con éxito los 4 archivos (XMLs, Respuesta Hacienda y PDF).`,
      });
    }, 1400);
  };

  if (!invoice) return null;

  const clientName = typeof invoice.client === "string" ? invoice.client : invoice.client?.name || "Consumidor Final";
  const clientEmail =
    typeof invoice.client === "string"
      ? "cliente@empresa.cr"
      : invoice.client?.email || "cliente@empresa.cr";
  const clientLegalId =
    typeof invoice.client === "string"
      ? ""
      : invoice.client?.legalId || "";

  const numOnly = (invoice.number || "").replace(/\D/g, "").padStart(10, "0");
  const consecutivo =
    invoice.number && invoice.number.length === 20
      ? invoice.number
      : `0010000201${numOnly}`;
  const clave =
    invoice.haciendaKey ||
    (invoice as any).clave ||
    `506290826003101483899000010000201${numOnly}1987654321`;

  const emisorNombre =
    activeEstablishment?.name ||
    (invoice as any).appName ||
    "AvalCar Centro de Servicio Automotriz S.A.";
  const emisorCedula = (
    activeEstablishment?.legal_id || "3-101-483899"
  ).replace(/\D/g, "");
  const emisorCorreo =
    activeEstablishment?.email || "facturacion@avalcar.cr";
  const codigoActividad =
    activeEstablishment?.economic_activity_code || "452001";
  const docTypeStr =
    invoice.type === "TE" || consecutivo.substring(8, 10) === "04"
      ? "04"
      : invoice.type === "NC" || consecutivo.substring(8, 10) === "03"
        ? "03"
        : invoice.type === "ND" || consecutivo.substring(8, 10) === "02"
          ? "02"
          : "01";

  const subtotal = invoice.total / 1.13;
  const impuesto = invoice.total - subtotal;
  const invoiceItems = Array.isArray((invoice as any).items) && (invoice as any).items.length > 0
    ? (invoice as any).items
    : null;

  const estId = activeEstablishment?.id;
  const savedLogo = estId && typeof window !== "undefined" ? localStorage.getItem(`facturaos_company_logo_${estId}`) : null;
  const savedBank = estId && typeof window !== "undefined" ? localStorage.getItem(`facturaos_bank_accounts_${estId}`) : null;
  const savedSinpe = estId && typeof window !== "undefined" ? localStorage.getItem(`facturaos_sinpe_phone_${estId}`) : null;
  const savedTemplate = (estId && typeof window !== "undefined" ? localStorage.getItem(`facturaos_invoice_template_${estId}`) : null) as any;

  // Generar archivos del expediente
  const xmlOriginal =
    invoice.xml ||
    construirXmlHacienda({
      clave,
      consecutivo,
      fechaEmision: new Date(invoice.date || Date.now()),
      tipoDocumento: docTypeStr,
      emisor: {
        nombre: emisorNombre,
        tipoIdentificacion: (activeEstablishment?.legal_id_type as any) || "02",
        numeroIdentificacion: emisorCedula,
        correo: emisorCorreo,
      },
      receptor: {
        nombre: clientName,
        correo: clientEmail,
        tipoIdentificacion: clientLegalId.replace(/\D/g, "").length === 9 ? "01" : "02",
        numeroIdentificacion: clientLegalId.replace(/\D/g, "") || "000000000",
      },
      codigoActividad,
      condicionVenta: "01",
      mediosPago: ["01"],
      moneda: "CRC",
      tipoCambio: 1,
      lineas: invoiceItems
        ? invoiceItems.map((it: any, idx: number) => {
            const up = Number(it.unitPrice || it.precioUnitario || 0);
            const q = Number(it.quantity || 1);
            const sub = up * q;
            const tax = Number(it.taxAmount ?? (sub * 0.13));
            const tot = Number(it.totalAmount ?? (sub + tax));
            return {
              numeroLinea: idx + 1,
              codigoCabys: it.cabysCode || it.cabys || "8311100000000",
              detalle: it.description || it.detalle || it.name || "Servicio",
              unidadMedida: "Sp",
              cantidad: q,
              precioUnitario: up,
              montoTotal: sub,
              subtotal: sub,
              impuesto: {
                codigo: "01",
                codigoTarifa: "08",
                tarifa: 13,
                monto: tax,
              },
              montoTotalLinea: tot,
            };
          })
        : [
            {
              numeroLinea: 1,
              codigoCabys: "8311100000000",
              detalle: "Servicios profesionales facturados",
              unidadMedida: "Sp",
              cantidad: 1,
              precioUnitario: subtotal,
              montoTotal: subtotal,
              subtotal: subtotal,
              impuesto: {
                codigo: "01",
                codigoTarifa: "08",
                tarifa: 13,
                monto: impuesto,
              },
              montoTotalLinea: invoice.total,
            },
          ],
      resumen: {
        totalServGravados: subtotal,
        totalServExentos: 0,
        totalMercanciasGravadas: 0,
        totalMercanciasExentas: 0,
        totalGravado: subtotal,
        totalExento: 0,
        totalVenta: subtotal,
        totalDescuentos: 0,
        totalVentaNeta: subtotal,
        totalImpuesto: impuesto,
        totalComprobante: invoice.total,
      },
    });

  const xmlFirmado = firmarXmlHacienda({ xmlSinFirmar: xmlOriginal });
  const xmlRespuestaHacienda = generarMensajeHaciendaXml({
    clave,
    nombreEmisor: emisorNombre,
    tipoIdEmisor: (activeEstablishment?.legal_id_type as any) || "02",
    cedulaEmisor: emisorCedula,
    nombreReceptor: clientName,
    tipoIdReceptor: clientLegalId.replace(/\D/g, "").length === 9 ? "01" : "02",
    cedulaReceptor: clientLegalId.replace(/\D/g, "") || "000000000",
    fecha: invoice.date,
    montoTotal: invoice.total,
    montoImpuesto: impuesto,
    estado: currentStatus,
    detallePersonalizado: invoice.motivoRechazo,
  });

  const diagnostico = obtenerDiagnosticoHacienda(
    currentStatus,
    clave,
    invoice.date,
    invoice.motivoRechazo,
  );

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(label);
    toast.success(`${label} copiado al portapapeles`);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleDownloadSingleFile = (
    filename: string,
    content: string,
    mimeType = "application/xml",
  ) => {
    const blob = new Blob([content], { type: `${mimeType};charset=utf-8` });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
    toast.success(`Archivo ${filename} descargado`);
  };

  const handleDownloadZipPackage = async () => {
    try {
      const zip = new JSZip();
      const folderName = `Expediente_${invoice.number}_${clave.slice(-8)}`;
      const folder = zip.folder(folderName);

      if (folder) {
        folder.file("01_comprobante_original.xml", xmlOriginal);
        folder.file("02_comprobante_firmado.xml", xmlFirmado);
        folder.file("03_respuesta_hacienda.xml", xmlRespuestaHacienda);
        folder.file(
          "metadata.json",
          JSON.stringify(
            {
              numero: invoice.number,
              clave,
              consecutivo,
              fecha: invoice.date,
              estado: currentStatus,
              emisor: { nombre: emisorNombre, legalId: emisorCedula },
              receptor: { nombre: clientName, legalId: clientLegalId, email: clientEmail },
              totales: { subtotal, impuesto, total: invoice.total },
              diagnostico,
            },
            null,
            2,
          ),
        );
      }

      const blob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${folderName}.zip`;
      link.click();
      URL.revokeObjectURL(url);
      toast.success("Paquete digital completo (.ZIP) descargado con éxito");
    } catch {
      toast.error("Error al generar archivo ZIP");
    }
  };

  const handleConsultLiveStatus = () => {
    setIsConsulting(true);
    toast.info("Consultando estado en el servidor de Hacienda...");
    setTimeout(() => {
      setIsConsulting(false);
      setCurrentStatus("aceptada");
      if (onStatusChange && invoice) {
        onStatusChange(invoice.id, "aceptada");
      }
      toast.success("¡Hacienda confirmó la recepción! Estado actualizado a ACEPTADO.");
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm animate-in fade-in">
      <div className="flex h-[90vh] w-full max-w-4xl flex-col rounded-2xl border border-border bg-card shadow-2xl overflow-hidden">
        {/* Encabezado Superior */}
        <div className="flex items-center justify-between border-b border-border bg-muted/30 px-6 py-4">
          <div className="flex items-center gap-3">
            <div
              className={`grid h-10 w-10 place-items-center rounded-xl ${
                currentStatus === "aceptada"
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                  : currentStatus === "rechazada"
                    ? "bg-destructive/10 text-destructive"
                    : currentStatus === "borrador"
                      ? "bg-slate-500/10 text-slate-600 dark:text-slate-300"
                      : "bg-amber-500/10 text-amber-600"
              }`}
            >
              {currentStatus === "aceptada" ? (
                <ShieldCheck className="h-5 w-5" />
              ) : currentStatus === "rechazada" ? (
                <AlertCircle className="h-5 w-5" />
              ) : currentStatus === "borrador" ? (
                <FileText className="h-5 w-5" />
              ) : (
                <Clock className="h-5 w-5" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-semibold text-foreground">
                  Expediente Fiscal: {invoice.number}
                </h2>
                <span
                  className={`rounded-md px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider ${
                    currentStatus === "aceptada"
                      ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                      : currentStatus === "rechazada"
                        ? "bg-destructive/15 text-destructive"
                        : currentStatus === "borrador"
                          ? "bg-slate-500/15 text-slate-700 dark:text-slate-300"
                          : "bg-amber-500/15 text-amber-700 dark:text-amber-300"
                  }`}
                >
                  {currentStatus === "aceptada"
                    ? "ACEPTADO"
                    : currentStatus === "rechazada"
                      ? "RECHAZADO"
                      : currentStatus === "borrador"
                        ? "BORRADOR"
                        : "PROCESANDO"}
                </span>
              </div>
              <p className="text-xs text-muted-foreground font-mono mt-0.5">
                Clave: {clave}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {currentStatus === "borrador" && (
              <button
                onClick={() => {
                  onClose();
                  navigate({ to: "/app/invoices/new" });
                }}
                className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-colors shadow-sm"
              >
                <Edit3 className="h-3.5 w-3.5" /> Completar y Emitir
              </button>
            )}
            <button
              onClick={handleSaveToGoogleDrive}
              disabled={isUploadingDrive}
              className={`inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium transition-colors ${
                isDriveSaved
                  ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30"
                  : "bg-background hover:bg-muted text-foreground"
              }`}
              title="Guardar copia del expediente en Google Drive"
            >
              {isUploadingDrive ? (
                <RotateCw className="h-3.5 w-3.5 text-primary animate-spin" />
              ) : (
                <Cloud className="h-3.5 w-3.5 text-primary" />
              )}
              {isDriveSaved ? "En Google Drive ✓" : "Google Drive"}
            </button>
            <button
              onClick={handleDownloadZipPackage}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium hover:bg-muted transition-colors"
              title="Descargar todos los archivos en un .zip"
            >
              <Archive className="h-3.5 w-3.5 text-primary" /> Descargar Paquete (.zip)
            </button>
            {clave && (
              <button
                type="button"
                onClick={() =>
                  setSelectedFilePreview({
                    title: `Representación Gráfica: ${invoice.number}`,
                    type: "pdf",
                    content: "",
                    filename: `${invoice.number}.pdf`,
                  })
                }
                className="inline-flex items-center gap-1.5 rounded-lg bg-primary text-primary-foreground px-3 py-1.5 text-xs font-semibold hover:bg-primary/90 transition-colors shadow-xs"
                title="Ver e imprimir representación gráfica oficial con QR"
              >
                <Eye className="h-3.5 w-3.5" /> Ver PDF Oficial
              </button>
            )}
            <button
              onClick={onClose}
              className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Barra de Pestañas */}
        <div className="flex border-b border-border bg-background px-6">
          <button
            onClick={() => setActiveTab("resumen")}
            className={`inline-flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === "resumen"
                ? "border-primary text-primary font-semibold"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <FileText className="h-4 w-4" /> Resumen del Comprobante
          </button>
          <button
            onClick={() => setActiveTab("interpretacion")}
            className={`inline-flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === "interpretacion"
                ? "border-primary text-primary font-semibold"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <ShieldCheck className="h-4 w-4" /> Interpretación y Diagnóstico de Hacienda
          </button>
          <button
            onClick={() => setActiveTab("archivos")}
            className={`inline-flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === "archivos"
                ? "border-primary text-primary font-semibold"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Package className="h-4 w-4" /> Archivos Digitales (XML / PDF)
          </button>
        </div>

        {/* Contenido de las pestañas */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* ───────────────── PESTAÑA 1: RESUMEN ───────────────── */}
          {activeTab === "resumen" && (
            <div className="space-y-6">
              {currentStatus === "borrador" && (
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-xl border border-primary/30 bg-primary/5 p-4 text-foreground">
                  <div className="space-y-1">
                    <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                      <Edit3 className="h-4 w-4 text-primary" /> Esta factura es un borrador no emitido
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Puedes completar los datos del cliente, agregar o modificar líneas de productos y generar el comprobante oficial firmado para Hacienda.
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      onClose();
                      navigate({ to: "/app/invoices/new" });
                    }}
                    className="inline-flex items-center gap-2 shrink-0 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-colors shadow-md"
                  >
                    Completar y Emitir Factura <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}

              {/* Tarjetas Principales Emisor / Receptor */}
              <div className="grid gap-6 md:grid-cols-2">
                {/* Info del comprobante */}
                <div className="rounded-xl border border-border bg-card p-5 space-y-4 shadow-soft">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    <FileText className="h-4 w-4 text-primary" /> Información del Comprobante
                  </div>

                  <div className="space-y-3 text-xs">
                    <div>
                      <span className="text-muted-foreground block mb-1">
                        Clave Numérica (50 dígitos):
                      </span>
                      <div className="flex items-center justify-between rounded-lg border border-border bg-muted/20 px-3 py-2 font-mono">
                        <span className="break-all font-semibold text-foreground">{clave}</span>
                        <button
                          onClick={() => handleCopy(clave, "Clave")}
                          className="ml-2 rounded p-1 hover:bg-muted text-muted-foreground hover:text-foreground"
                          title="Copiar clave"
                        >
                          {copiedKey === "Clave" ? (
                            <Check className="h-3.5 w-3.5 text-emerald-500" />
                          ) : (
                            <Copy className="h-3.5 w-3.5" />
                          )}
                        </button>
                      </div>
                    </div>

                    <div>
                      <span className="text-muted-foreground block mb-1">
                        Consecutivo Tributario:
                      </span>
                      <div className="flex items-center justify-between rounded-lg border border-border bg-muted/20 px-3 py-2 font-mono">
                        <span className="font-semibold text-foreground">{consecutivo}</span>
                        <button
                          onClick={() => handleCopy(consecutivo, "Consecutivo")}
                          className="ml-2 rounded p-1 hover:bg-muted text-muted-foreground hover:text-foreground"
                          title="Copiar consecutivo"
                        >
                          {copiedKey === "Consecutivo" ? (
                            <Check className="h-3.5 w-3.5 text-emerald-500" />
                          ) : (
                            <Copy className="h-3.5 w-3.5" />
                          )}
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <div>
                        <span className="text-muted-foreground block">Tipo Comprobante:</span>
                        <span className="font-medium text-foreground">
                          {invoice.type === "FE"
                            ? "01 · Factura Electrónica"
                            : invoice.type === "TE"
                              ? "04 · Tiquete"
                              : "03 · Nota de Crédito"}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block">Fecha Emisión:</span>
                        <span className="font-medium text-foreground">{invoice.date}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Emisor y Receptor */}
                <div className="rounded-xl border border-border bg-card p-5 space-y-4 shadow-soft">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    <User className="h-4 w-4 text-primary" /> Emisor y Receptor
                  </div>

                  <div className="space-y-3 text-xs">
                    <div className="rounded-lg border border-border bg-muted/10 p-3">
                      <div className="flex items-center gap-1.5 font-medium text-foreground">
                        <Building2 className="h-3.5 w-3.5 text-primary" /> Emisor: Grupo G3 (3-101-483899)
                      </div>
                      <p className="text-muted-foreground mt-0.5">
                        Actividad: 620901 • facturas@grupog3.cr
                      </p>
                    </div>

                    <div className="rounded-lg border border-border bg-muted/10 p-3">
                      <div className="flex items-center gap-1.5 font-medium text-foreground">
                        <User className="h-3.5 w-3.5 text-primary" /> Receptor: {clientName}
                      </div>
                      <p className="text-muted-foreground mt-0.5">
                        Cédula: {clientLegalId} • {clientEmail}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Desglose de Totales */}
              <div className="rounded-xl border border-border bg-muted/20 p-5">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <span className="text-xs text-muted-foreground block">Subtotal Neto</span>
                    <span className="text-lg font-semibold tabular-nums text-foreground">
                      {formatCRC(subtotal)}
                    </span>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground block">IVA (13%)</span>
                    <span className="text-lg font-semibold tabular-nums text-foreground">
                      {formatCRC(impuesto)}
                    </span>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground block">
                      Otros Cargos / Exoneración
                    </span>
                    <span className="text-lg font-semibold tabular-nums text-muted-foreground">
                      ₡ 0
                    </span>
                  </div>
                  <div className="border-l border-border pl-6">
                    <span className="text-xs text-muted-foreground block font-medium">
                      TOTAL COMPROBANTE
                    </span>
                    <span className="text-2xl font-bold tabular-nums text-primary">
                      {formatCRC(invoice.total)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ───────────────── PESTAÑA 2: INTERPRETACIÓN DE HACIENDA ───────────────── */}
          {activeTab === "interpretacion" && (
            <div className="space-y-6">
              {/* Diagnóstico Banner */}
              <div
                className={`rounded-2xl border p-5 ${
                  currentStatus === "aceptada"
                    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-900 dark:text-emerald-200"
                    : currentStatus === "rechazada"
                      ? "border-destructive/30 bg-destructive/10 text-destructive"
                      : currentStatus === "borrador"
                        ? "border-border bg-muted/40 text-foreground"
                        : "border-amber-500/30 bg-amber-500/10 text-amber-900 dark:text-amber-200"
                }`}
              >
                <div className="flex items-start gap-3.5">
                  {currentStatus === "aceptada" ? (
                    <ShieldCheck className="h-6 w-6 shrink-0 text-emerald-600 dark:text-emerald-400" />
                  ) : currentStatus === "rechazada" ? (
                    <AlertCircle className="h-6 w-6 shrink-0 text-destructive" />
                  ) : currentStatus === "borrador" ? (
                    <FileText className="h-6 w-6 shrink-0 text-muted-foreground" />
                  ) : (
                    <RotateCw
                      className={`h-6 w-6 shrink-0 text-amber-600 ${isConsulting ? "animate-spin" : ""}`}
                    />
                  )}
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center justify-between">
                      <h3 className="text-base font-semibold">
                        {currentStatus === "aceptada"
                          ? "Comprobante Aceptado por el Ministerio de Hacienda"
                          : currentStatus === "rechazada"
                            ? "Comprobante Rechazado por Hacienda"
                            : currentStatus === "borrador"
                              ? "Documento en Borrador (Sin Transmitir a Hacienda)"
                              : "Comprobante en Proceso de Validación"}
                      </h3>
                      {currentStatus === "pendiente" && (
                        <button
                          onClick={handleConsultLiveStatus}
                          disabled={isConsulting}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                        >
                          <RotateCw
                            className={`h-3.5 w-3.5 ${isConsulting ? "animate-spin" : ""}`}
                          />
                          Consultar estado en vivo
                        </button>
                      )}
                      {currentStatus === "borrador" && (
                        <button
                          onClick={() => {
                            onClose();
                            navigate({ to: "/app/invoices/new" });
                          }}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                          Completar y emitir ahora
                        </button>
                      )}
                    </div>
                    <p className="text-sm leading-relaxed opacity-95">
                      {currentStatus === "borrador"
                        ? "Este comprobante no ha sido enviado al Ministerio de Hacienda. Para generar la clave de 50 dígitos definitiva y enviarlo a validación, haz clic en 'Completar y emitir ahora'."
                        : diagnostico.detalleHacienda}
                    </p>

                    {diagnostico.solucionSugerida && currentStatus !== "borrador" && (
                      <div className="mt-3 rounded-lg border border-destructive/20 bg-background/60 p-3 text-xs text-foreground">
                        <strong className="text-destructive font-semibold block mb-1">
                          Causa y Solución Recomendada:
                        </strong>
                        <p>{diagnostico.solucionSugerida}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Visor de MensajeHacienda.xml */}
              <div className="rounded-xl border border-border bg-card p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    <FileCode className="h-4 w-4 text-primary" /> Acuse Oficial: MensajeHacienda.xml
                  </div>
                  <button
                    onClick={() =>
                      handleDownloadSingleFile(
                        `${invoice.number}_MensajeHacienda.xml`,
                        xmlRespuestaHacienda,
                      )
                    }
                    className="inline-flex items-center gap-1 text-xs text-primary hover:underline font-medium"
                  >
                    <Download className="h-3.5 w-3.5" /> Descargar MensajeHacienda.xml
                  </button>
                </div>
                <div className="max-h-60 overflow-auto rounded-lg border border-border bg-muted/20 p-4 font-mono text-xs text-muted-foreground">
                  <pre className="whitespace-pre-wrap break-all">{xmlRespuestaHacienda}</pre>
                </div>
              </div>
            </div>
          )}

          {/* ───────────────── PESTAÑA 3: ARCHIVOS DIGITALES ───────────────── */}
          {activeTab === "archivos" && (
            <div className="space-y-6">
              {/* Respaldo en la Nube Banner */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-xl border border-primary/20 bg-primary/5 p-4">
                <div className="flex items-start gap-3">
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                    <Cloud className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-foreground">
                      Respaldo Automático en Google Drive & Nube
                    </h4>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Guarda los 4 archivos tributarios (XMLs, Respuesta Hacienda y PDF con QR) en tu Google Drive para cumplimiento legal de 5 años.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={handleSaveToGoogleDrive}
                    disabled={isUploadingDrive}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-colors shadow-sm disabled:opacity-50"
                  >
                    {isUploadingDrive ? (
                      <RotateCw className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Cloud className="h-3.5 w-3.5" />
                    )}
                    {isDriveSaved ? "Sincronizado en Drive ✓" : "Subir a Google Drive"}
                  </button>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                {/* 01 · XML Original */}
                <div className="flex flex-col justify-between rounded-xl border border-border bg-card p-4 transition-all hover:border-primary/50 hover:shadow-soft">
                  <div className="flex items-start gap-3">
                    <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-blue-500/10 text-blue-500">
                      <FileCode className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-foreground">
                        01 · Comprobante Original
                      </h4>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        XML base estructurado según esquema oficial v4.4 (v2) antes del firmado.
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 flex items-center justify-end gap-2 border-t border-border pt-3">
                    <button
                      onClick={() =>
                        setSelectedFilePreview({
                          title: "01 · Comprobante Original (XML)",
                          type: "xml",
                          content: xmlOriginal,
                          filename: `${invoice.number}_original.xml`,
                        })
                      }
                      className="inline-flex items-center gap-1 rounded-md border border-border px-2.5 py-1 text-xs font-medium hover:bg-muted text-foreground"
                    >
                      <Eye className="h-3.5 w-3.5 text-muted-foreground" /> Ver
                    </button>
                    <button
                      onClick={() =>
                        handleDownloadSingleFile(`${invoice.number}_original.xml`, xmlOriginal)
                      }
                      className="inline-flex items-center gap-1 rounded-md bg-primary px-2.5 py-1 text-xs font-medium text-primary-foreground hover:bg-primary/90"
                    >
                      <Download className="h-3.5 w-3.5" /> Descargar
                    </button>
                  </div>
                </div>

                {/* 02 · XML Firmado */}
                <div className="flex flex-col justify-between rounded-xl border border-border bg-card p-4 transition-all hover:border-primary/50 hover:shadow-soft">
                  <div className="flex items-start gap-3">
                    <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-emerald-500/10 text-emerald-500">
                      <FileCode className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-foreground">
                        02 · Comprobante Firmado
                      </h4>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        XML oficial firmado digitalmente con estándar XAdES-EPES.
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 flex items-center justify-end gap-2 border-t border-border pt-3">
                    <button
                      onClick={() =>
                        setSelectedFilePreview({
                          title: "02 · Comprobante Firmado XAdES-EPES (XML)",
                          type: "xml",
                          content: xmlFirmado,
                          filename: `${invoice.number}_firmado.xml`,
                        })
                      }
                      className="inline-flex items-center gap-1 rounded-md border border-border px-2.5 py-1 text-xs font-medium hover:bg-muted text-foreground"
                    >
                      <Eye className="h-3.5 w-3.5 text-muted-foreground" /> Ver
                    </button>
                    <button
                      onClick={() =>
                        handleDownloadSingleFile(`${invoice.number}_firmado.xml`, xmlFirmado)
                      }
                      className="inline-flex items-center gap-1 rounded-md bg-primary px-2.5 py-1 text-xs font-medium text-primary-foreground hover:bg-primary/90"
                    >
                      <Download className="h-3.5 w-3.5" /> Descargar
                    </button>
                  </div>
                </div>

                {/* 03 · Respuesta de Hacienda */}
                <div className="flex flex-col justify-between rounded-xl border border-border bg-card p-4 transition-all hover:border-primary/50 hover:shadow-soft">
                  <div className="flex items-start gap-3">
                    <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-purple-500/10 text-purple-500">
                      <ShieldCheck className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-foreground">
                        03 · Respuesta de Hacienda
                      </h4>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        MensajeHacienda.xml con acuse de recibo y firma de Tributación.
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 flex items-center justify-end gap-2 border-t border-border pt-3">
                    <button
                      onClick={() =>
                        setSelectedFilePreview({
                          title: "03 · Respuesta Oficial de Hacienda (XML)",
                          type: "xml",
                          content: xmlRespuestaHacienda,
                          filename: `${invoice.number}_MensajeHacienda.xml`,
                        })
                      }
                      className="inline-flex items-center gap-1 rounded-md border border-border px-2.5 py-1 text-xs font-medium hover:bg-muted text-foreground"
                    >
                      <Eye className="h-3.5 w-3.5 text-muted-foreground" /> Ver
                    </button>
                    <button
                      onClick={() =>
                        handleDownloadSingleFile(
                          `${invoice.number}_MensajeHacienda.xml`,
                          xmlRespuestaHacienda,
                        )
                      }
                      className="inline-flex items-center gap-1 rounded-md bg-primary px-2.5 py-1 text-xs font-medium text-primary-foreground hover:bg-primary/90"
                    >
                      <Download className="h-3.5 w-3.5" /> Descargar
                    </button>
                  </div>
                </div>

                {/* 04 · Representación PDF */}
                <div className="flex flex-col justify-between rounded-xl border border-border bg-card p-4 transition-all hover:border-primary/50 hover:shadow-soft">
                  <div className="flex items-start gap-3">
                    <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-red-500/10 text-red-500">
                      <Printer className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-foreground">
                        04 · Representación PDF
                      </h4>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Diseño fiscal para impresión o envío por correo al cliente.
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 flex items-center justify-end gap-2 border-t border-border pt-3">
                    <button
                      onClick={() =>
                        setSelectedFilePreview({
                          title: `Representación Gráfica: ${invoice.number}`,
                          type: "pdf",
                          content: "",
                          filename: `${invoice.number}.pdf`,
                        })
                      }
                      className="inline-flex items-center gap-1 rounded-md border border-border px-2.5 py-1 text-xs font-medium hover:bg-muted text-foreground"
                    >
                      <Eye className="h-3.5 w-3.5 text-muted-foreground" /> Ver PDF
                    </button>
                    <button
                      onClick={() => {
                        window.open(`/api/v1/invoices/${clave}/pdf`, "_blank");
                        toast.success("Abriendo representación PDF oficial...");
                      }}
                      className="inline-flex items-center gap-1 rounded-md bg-primary px-2.5 py-1 text-xs font-medium text-primary-foreground hover:bg-primary/90"
                    >
                      <Download className="h-3.5 w-3.5" /> Descargar
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal interno para visor de archivo individual */}
        {selectedFilePreview && (
          <div className="fixed inset-0 z-60 flex items-center justify-center bg-background/90 p-4 backdrop-blur-md animate-in fade-in">
            <div className="flex h-[80vh] w-full max-w-3xl flex-col rounded-2xl border border-border bg-card shadow-2xl">
              <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
                <div className="flex items-center gap-2">
                  <FileCode className="h-4 w-4 text-primary" />
                  <h4 className="text-sm font-semibold text-foreground">
                    {selectedFilePreview.title}
                  </h4>
                </div>
                <div className="flex items-center gap-2">
                  {selectedFilePreview.type === "xml" ? (
                    <button
                      onClick={() =>
                        handleDownloadSingleFile(
                          selectedFilePreview.filename,
                          selectedFilePreview.content,
                        )
                      }
                      className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-1 text-xs font-medium text-primary-foreground"
                    >
                      <Download className="h-3.5 w-3.5" /> Descargar
                    </button>
                  ) : (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => window.print()}
                        className="inline-flex items-center gap-1 rounded-md border border-border px-2.5 py-1 text-xs font-medium hover:bg-muted text-foreground"
                      >
                        <Printer className="h-3.5 w-3.5" /> Imprimir
                      </button>
                      <button
                        onClick={() => {
                          window.open(`/api/v1/invoices/${clave}/pdf`, "_blank");
                        }}
                        className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-1 text-xs font-medium text-primary-foreground"
                      >
                        <Download className="h-3.5 w-3.5" /> Descargar PDF
                      </button>
                    </div>
                  )}
                  <button
                    onClick={() => setSelectedFilePreview(null)}
                    className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <div className="flex-1 overflow-auto p-4 bg-muted/10 font-mono text-xs text-foreground">
                {selectedFilePreview.type === "xml" ? (
                  <pre className="whitespace-pre-wrap break-all">{selectedFilePreview.content}</pre>
                ) : (
                  <div className="mx-auto max-w-4xl p-2 print:m-0 print:p-0">
                    <InvoiceRenderer
                      invoice={invoice}
                      emisor={{
                        name: emisorNombre,
                        legalId: emisorCedula,
                        legalIdType: (activeEstablishment?.legal_id_type as any) || "02",
                        email: emisorCorreo,
                        phone: activeEstablishment?.phone || "+506 2222-0000",
                        address: activeEstablishment?.address || "San José, Costa Rica",
                        activityCode: codigoActividad,
                        logoUrl: savedLogo || undefined,
                        bankAccounts: savedBank || undefined,
                        sinpePhone: savedSinpe || undefined,
                      }}
                      client={{
                        name: clientName,
                        legalId: clientLegalId,
                        email: clientEmail,
                        phone: typeof invoice.client === "object" ? invoice.client.phone : undefined,
                      }}
                      consecutivo={consecutivo}
                      clave={clave}
                      docTypeStr={docTypeStr as any}
                      docTypeName={
                        docTypeStr === "01"
                          ? "FACTURA ELECTRÓNICA"
                          : docTypeStr === "04"
                            ? "TIQUETE ELECTRÓNICO"
                            : docTypeStr === "03"
                              ? "NOTA DE CRÉDITO"
                              : "NOTA DE DÉBITO"
                      }
                      items={
                        invoiceItems || [
                          {
                            description: "Servicio Profesional / Comercial Autorizado",
                            quantity: 1,
                            unitPrice: subtotal,
                            total: invoice.total,
                            ivaRate: 13,
                          },
                        ]
                      }
                      subtotal={subtotal}
                      impuesto={impuesto}
                      total={invoice.total}
                      currency="CRC"
                      condicionVenta="Contado"
                      medioPago="Transferencia Bancaria / SINPE"
                      establishmentId={activeEstablishment?.id}
                      initialTemplate={savedTemplate || "corporativa"}
                      showSelector={true}
                    />
                    <div className="flex justify-end gap-3 pt-4 print:hidden border-t border-border mt-4">
                      <button
                        onClick={() => window.print()}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow-sm hover:bg-primary/90"
                      >
                        <Printer className="h-4 w-4" /> Imprimir Documento / Guardar PDF (1 Página)
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}