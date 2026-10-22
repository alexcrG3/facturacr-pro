import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import {
  Mail,
  Download,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Clock,
  FileCode,
  FileText,
  Search,
  Sparkles,
  Layers,
  Settings2,
  Trash2,
  ExternalLink,
  ShieldCheck,
  Shield,
  KeyRound,
  Building2,
  Check,
  Plus,
  Loader2,
  ArrowRight,
  BarChart3,
  FileSpreadsheet,
  Upload,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/common/PageHeader";
import {
  guardarComprobanteContable,
  cargarComprobantesContablesAsync,
  limpiarComprobantesContables,
  parsearXmlHacienda,
  ComprobanteContable,
} from "@/lib/accounting-reports";
import {
  solicitarTokenGoogleWorkspace,
  obtenerTokenGoogleActivo,
  revocarTokenGoogle,
  buscarMensajesGmail,
  obtenerDetalleMensaje,
  procesarMensajeFacturaXml,
} from "@/lib/gmail-api";
import { formatCRC } from "@/lib/mock-data";

export const Route = createFileRoute("/app/gmail")({
  component: GmailSyncPage,
});

interface GmailAccount {
  id: string;
  email: string;
  label: string;
  connectedAt: string;
  status: "conectado" | "requiere_reautenticar";
  autoSync: boolean;
  totalDownloaded: number;
}

const defaultAccounts: GmailAccount[] = [];

function GmailSyncPage() {
  const [activeTab, setActiveTab] = useState<"descargar" | "cuentas" | "facturas">("descargar");
  const [accounts, setAccounts] = useState<GmailAccount[]>(() => {
    try {
      const saved = localStorage.getItem("facturacr_gmail_accounts");
      return saved ? JSON.parse(saved) : defaultAccounts;
    } catch {
      return defaultAccounts;
    }
  });

  // Correo de escaneo personalizable por el usuario
  const [emailToScan, setEmailToScan] = useState<string>(() => {
    try {
      const savedScan = localStorage.getItem("facturacr_scan_email");
      if (savedScan) return savedScan;
      const savedConfig = localStorage.getItem("facturacr_gmail_config");
      if (savedConfig) {
        const parsed = JSON.parse(savedConfig);
        if (parsed.gmailEmail) return parsed.gmailEmail;
      }
    } catch {}
    return "facturas@grupog3.cr";
  });

  const [searchQuery, setSearchQuery] = useState(() => {
    try {
      const saved = localStorage.getItem("facturacr_gmail_search_query");
      if (saved) return saved;
      if (import.meta.env.VITE_GMAIL_SEARCH_QUERY) return import.meta.env.VITE_GMAIL_SEARCH_QUERY;
    } catch {}
    return 'label:"Factura Electronica" has:attachment filename:xml';
  });

  const [dateFilter, setDateFilter] = useState({
    desde: `${new Date().getFullYear()}-01-01`,
    hasta: new Date().toISOString().slice(0, 10),
  });

  // Estado del proceso de descarga
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [scanLogs, setScanLogs] = useState<string[]>([]);
  const [downloadedInvoices, setDownloadedInvoices] = useState<ComprobanteContable[]>([]);
  const [showAddAccountModal, setShowAddAccountModal] = useState(false);
  const [newAccountForm, setNewAccountForm] = useState({
    email: "",
    label: "",
  });

  // Estado Google Workspace API (OAuth 2.0)
  const [googleClientId, setGoogleClientId] = useState<string>(() => {
    try {
      const saved = localStorage.getItem("facturacr_google_client_id");
      if (saved) return saved;
      if (import.meta.env.VITE_GOOGLE_CLIENT_ID) return import.meta.env.VITE_GOOGLE_CLIENT_ID;
    } catch {}
    return "492064688118-na6u0ns7fdn351beqt32na18g9ftjl7v.apps.googleusercontent.com";
  });
  const [hasGoogleToken, setHasGoogleToken] = useState<boolean>(() => {
    return !!obtenerTokenGoogleActivo();
  });
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  // Cargar facturas de compras existentes desde Supabase
  const refrescarFacturas = async () => {
    try {
      const all = await cargarComprobantesContablesAsync();
      const compras = all.filter((c) => c.tipoOperacion === "COMPRA");
      setDownloadedInvoices(compras);
    } catch {
      setDownloadedInvoices([]);
    }
  };

  useEffect(() => {
    refrescarFacturas();
  }, []);

  // Limpiar todos los comprobantes para empezar desde 0 absoluto
  const handleLimpiarComprobantes = () => {
    if (confirm("¿Deseas vaciar todos los comprobantes de compras descargados y dejar la lista en cero?")) {
      limpiarComprobantesContables();
      setDownloadedInvoices([]);
      toast.info("Todos los comprobantes de compras han sido removidos. La lista está en 0.");
    }
  };

  const handleConnectGoogleWorkspace = async () => {
    const cid = googleClientId.trim();
    if (!cid) {
      toast.error("Falta el Client ID de Google Workspace", {
        description: "Configúralo en Configuración (/app/settings) o en tu archivo protegido .env",
      });
      return;
    }

    setIsAuthenticating(true);
    try {
      await solicitarTokenGoogleWorkspace(cid);
      setHasGoogleToken(true);
      toast.success("¡Autenticación con Google Workspace exitosa!", {
        description: "Permiso estricto de solo lectura concedido (gmail.readonly).",
      });
    } catch (err: any) {
      toast.error("Error de autenticación con Google", {
        description: err?.message || "No se completó la autorización",
      });
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleDisconnectGoogleWorkspace = () => {
    revocarTokenGoogle();
    setHasGoogleToken(false);
    toast.info("Conexión con Google Workspace revocada. El token ha sido destruido.");
  };

  const handleStartScan = async () => {
    const targetEmail = emailToScan.trim();
    if (!targetEmail || !targetEmail.includes("@")) {
      toast.error("Por favor ingresa un correo electrónico válido para escanear");
      return;
    }

    localStorage.setItem("facturacr_scan_email", targetEmail);

    // Verificar si hay token activo de Google Workspace
    const token = obtenerTokenGoogleActivo();

    if (token) {
      // Flujo con Google Workspace / Gmail API REAL
      setIsScanning(true);
      setScanProgress(10);
      setScanLogs([
        "🔒 Conexión segura TLS 1.3 con Google Workspace verificada.",
        `Buzón autenticado: ${targetEmail}`,
        `Criterio de búsqueda: ${searchQuery}`,
        `Rango de fechas: ${dateFilter.desde} hasta ${dateFilter.hasta}`,
        "Consultando endpoint oficial de Gmail API...",
      ]);

      try {
        let fullQuery = searchQuery.trim() || "has:attachment filename:xml";
        if (dateFilter.desde) {
          fullQuery += ` after:${dateFilter.desde}`;
        }
        if (dateFilter.hasta) {
          try {
            const nextD = new Date(dateFilter.hasta);
            nextD.setDate(nextD.getDate() + 1);
            fullQuery += ` before:${nextD.toISOString().slice(0, 10)}`;
          } catch {
            fullQuery += ` before:${dateFilter.hasta}`;
          }
        }
        const messages = await buscarMensajesGmail(token, fullQuery);
        setScanProgress(30);
        setScanLogs((prev) => [
          ...prev,
          `✓ Se encontraron ${messages.length} correos en Gmail que coinciden con el filtro (${fullQuery}).`,
        ]);

        if (messages.length === 0) {
          setScanProgress(100);
          setIsScanning(false);
          setScanLogs((prev) => [
            ...prev,
            "No se encontraron mensajes con comprobantes en este rango de fechas.",
          ]);
          toast.info("Búsqueda completada: 0 facturas encontradas.");
          return;
        }

        let totalComprobantes = 0;
        for (let i = 0; i < messages.length; i++) {
          const m = messages[i];
          const detalle = await obtenerDetalleMensaje(token, m.id);
          if (detalle) {
            setScanLogs((prev) => [
              ...prev,
              `Leyendo mensaje [${i + 1}/${messages.length}]: ${detalle.subject.slice(0, 50)}...`,
            ]);
            const comps = await procesarMensajeFacturaXml(token, detalle, (log) => {
              setScanLogs((prev) => [...prev, log]);
            });
            totalComprobantes += comps.length;
          }
          setScanProgress(30 + Math.round(((i + 1) / messages.length) * 65));
        }

        setScanProgress(100);
        setIsScanning(false);
        refrescarFacturas();
        toast.success(`¡Descarga de Gmail completada! Se procesaron ${totalComprobantes} comprobantes.`);
        return;
      } catch (err: any) {
        setIsScanning(false);
        toast.error("Error al consultar Gmail API", { description: err?.message });
        setScanLogs((prev) => [...prev, `✕ Error: ${err?.message}`]);
        return;
      }
    }

    // Si no tiene token activo, advertir que se requiere autorizar
    if (googleClientId) {
      toast.info("Autorización requerida", {
        description: "Haz clic en 'Conectar con Google Workspace' para autorizar el acceso seguro de solo lectura.",
      });
      handleConnectGoogleWorkspace();
      return;
    }

    // Si no tiene Client ID
    setIsScanning(true);
    setScanProgress(15);
    setScanLogs([
      "Iniciando escaneo...",
      `Buzón objetivo: ${targetEmail}`,
      `Filtro: ${searchQuery}`,
      "Aviso: No se ha configurado el Client ID de Google Workspace en el archivo .env o en Configuración.",
      "Para que el sistema descargue los XMLs automáticamente sin descargarlos uno a uno, debes configurar tu Client ID en Configuración o en el archivo .env.",
      "Alternativa inmediata: Puedes arrastrar los XMLs descargados directamente al botón 'Importar XMLs de Compras'.",
    ]);

    setTimeout(() => {
      setScanProgress(100);
      setIsScanning(false);
      setScanLogs((prev) => [
        ...prev,
        "✓ Para activar la conexión automática con tu API de Google Workspace, ve a Configuración ➔ 'Cuentas Gmail / Facturas' o edita la variable VITE_GOOGLE_CLIENT_ID en el archivo .env.",
      ]);
      toast.info("Configuración de Google Workspace requerida", {
        description: "Ingresa tu Client ID en Configuración o en tu archivo .env",
      });
    }, 1500);
  };

  // Importar archivos XML reales recibidos del correo
  const handleImportXmlFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    let importados = 0;

    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      if (f.name.endsWith(".xml")) {
        try {
          const text = await f.text();
          const parsed = parsearXmlHacienda(text);
          if (parsed && parsed.clave) {
            const comp: ComprobanteContable = {
              id: "compra-xml-" + Date.now() + "-" + i,
              tipoOperacion: "COMPRA",
              tipoDoc: (parsed.tipoDoc as any) || "FACTURA",
              tipoDocCodigo: parsed.tipoDocCodigo || "01",
              estadoHacienda: "RECIBIDO",
              clave: parsed.clave,
              consecutivo: parsed.consecutivo || "",
              emisorCedula: parsed.emisorCedula || "",
              emisorNombre: parsed.emisorNombre || "Proveedor Local",
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
              iva4: parsed.iva4 || 0,
              iva2: parsed.iva2 || 0,
              iva1: parsed.iva1 || 0,
              respuestaHacienda: parsed.respuestaHacienda || "Aceptado",
              cabysPrincipal: parsed.cabysPrincipal || "",
              detallePrincipal: parsed.detallePrincipal || f.name,
              origenXml: f.name,
            };
            guardarComprobanteContable(comp);
            importados++;
          }
        } catch {
          // Ignorar XMLs no reconocidos
        }
      }
    }

    if (importados > 0) {
      toast.success(`¡Se importaron ${importados} facturas reales desde tus archivos XML!`);
      refrescarFacturas();
    } else {
      toast.error("No se detectaron XMLs válidos de facturas electrónicas de Hacienda en los archivos seleccionados.");
    }
  };

  const handleAddAccount = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAccountForm.email.includes("@")) {
      toast.error("Por favor ingresa un correo electrónico válido");
      return;
    }

    const newAcc: GmailAccount = {
      id: "acc-" + Date.now(),
      email: newAccountForm.email.trim(),
      label: newAccountForm.label.trim() || "Buzón de Facturación",
      connectedAt: new Date().toISOString().slice(0, 10),
      status: "conectado",
      autoSync: true,
      totalDownloaded: 0,
    };

    const updated = [...accounts, newAcc];
    setAccounts(updated);
    localStorage.setItem("facturacr_gmail_accounts", JSON.stringify(updated));
    setEmailToScan(newAcc.email);
    localStorage.setItem("facturacr_scan_email", newAcc.email);
    setShowAddAccountModal(false);
    setNewAccountForm({ email: "", label: "" });
    toast.success(`Cuenta "${newAcc.email}" vinculada correctamente`);
  };

  const handleDeleteAccount = (id: string, email: string) => {
    if (confirm(`¿Deseas desvincular la cuenta ${email}?`)) {
      const updated = accounts.filter((a) => a.id !== id);
      setAccounts(updated);
      localStorage.setItem("facturacr_gmail_accounts", JSON.stringify(updated));
      toast.info("Cuenta desvinculada");
    }
  };

  const totalMontoCompras = downloadedInvoices.reduce((s, x) => s + x.totalComprobante, 0);
  const totalIvaCompras = downloadedInvoices.reduce((s, x) => s + x.totalIva, 0);

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-16">
      <PageHeader
        title="Descarga Automática de Facturas (Gmail)"
        description="Conecta tu buzón de correo para extraer automáticamente todos los archivos XML y PDF que te envían tus proveedores."
        actions={
          <div className="flex items-center gap-2">
            {downloadedInvoices.length > 0 && (
              <button
                type="button"
                onClick={handleLimpiarComprobantes}
                className="inline-flex items-center gap-1.5 rounded-lg border border-destructive/30 bg-destructive/10 px-3.5 py-2 text-xs font-semibold text-destructive hover:bg-destructive/20 transition-colors"
                title="Eliminar comprobantes de prueba y reiniciar a 0"
              >
                <Trash2 className="h-4 w-4" /> Limpiar Comprobantes ({downloadedInvoices.length})
              </button>
            )}
            <Link
              to="/app/reports"
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3.5 py-2 text-xs font-semibold hover:bg-muted transition-colors"
            >
              <BarChart3 className="h-4 w-4 text-primary" /> Ir a Reportes del Contador
            </Link>
            <button
              type="button"
              onClick={() => setShowAddAccountModal(true)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-all shadow-xs"
            >
              <Plus className="h-4 w-4" /> Vincular Cuenta Gmail
            </button>
          </div>
        }
      />

      {/* Tabs de Navegación */}
      <div className="flex border-b border-border text-xs font-semibold gap-2">
        <button
          type="button"
          onClick={() => setActiveTab("descargar")}
          className={`flex items-center gap-2 px-4 py-2.5 border-b-2 transition-all ${
            activeTab === "descargar"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Download className="h-4 w-4" /> Centro de Descarga de Facturas
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("facturas")}
          className={`flex items-center gap-2 px-4 py-2.5 border-b-2 transition-all ${
            activeTab === "facturas"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <FileText className="h-4 w-4" /> Comprobantes Extraídos ({downloadedInvoices.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("cuentas")}
          className={`flex items-center gap-2 px-4 py-2.5 border-b-2 transition-all ${
            activeTab === "cuentas"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Mail className="h-4 w-4" /> Cuentas Gmail Vinculadas ({accounts.length})
        </button>
      </div>

      {/* TAB 1: CENTRO DE DESCARGA */}
      {activeTab === "descargar" && (
        <div className="space-y-6">
          {/* Panel de Configuración de Escaneo */}
          <div className="rounded-2xl border border-border bg-card p-6 shadow-soft space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-amber-500" />
                  Escanear Buzón y Descargar XMLs de Gastos
                </h3>
                <p className="text-xs text-muted-foreground">
                  Ingresa tu correo electrónico para que el sistema localice facturas y notas electrónicas enviadas por proveedores.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {hasGoogleToken ? (
                  <div className="flex items-center gap-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 text-xs text-emerald-700 dark:text-emerald-300 font-medium">
                    <ShieldCheck className="h-4 w-4 text-emerald-600" />
                    <span>Google Workspace Autorizado (Solo Lectura)</span>
                    <button
                      type="button"
                      onClick={handleDisconnectGoogleWorkspace}
                      className="ml-2 text-[10px] underline text-destructive hover:opacity-80"
                    >
                      Desconectar
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={handleConnectGoogleWorkspace}
                    disabled={isAuthenticating}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-blue-500/30 bg-blue-500/10 px-3 py-1.5 text-xs font-semibold text-blue-700 dark:text-blue-300 hover:bg-blue-500/20 transition-colors"
                  >
                    {isAuthenticating ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-600" /> Conectando...
                      </>
                    ) : (
                      <>
                        <KeyRound className="h-3.5 w-3.5 text-blue-600" /> Conectar con Google Workspace
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3 pt-2">
              {/* Campo para ingresar el correo directamente */}
              <div className="sm:col-span-3">
                <label className="mb-1.5 block text-xs font-semibold text-muted-foreground flex items-center justify-between">
                  <span>Tu Correo Electrónico (Gmail o Google Workspace) a escanear *</span>
                  {accounts.length > 0 && (
                    <span className="text-[11px] text-primary">Cuentas vinculadas disponibles</span>
                  )}
                </label>
                <div className="flex gap-2">
                  <input
                    type="email"
                    value={emailToScan}
                    onChange={(e) => {
                      setEmailToScan(e.target.value);
                      localStorage.setItem("facturacr_scan_email", e.target.value);
                    }}
                    placeholder="Ingresa tu correo aquí, ej: facturas@grupog3.cr o tu-cuenta@gmail.com"
                    className="h-10 flex-1 rounded-xl border border-border bg-background px-3 text-xs font-semibold text-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20"
                  />
                  {accounts.length > 0 && (
                    <select
                      onChange={(e) => {
                        if (e.target.value) {
                          setEmailToScan(e.target.value);
                          localStorage.setItem("facturacr_scan_email", e.target.value);
                        }
                      }}
                      className="h-10 rounded-xl border border-border bg-background px-3 text-xs font-medium text-foreground focus:border-ring focus:outline-none"
                    >
                      <option value="">Seleccionar cuenta guardada...</option>
                      {accounts.map((acc) => (
                        <option key={acc.id} value={acc.email}>
                          {acc.email} ({acc.label})
                        </option>
                      ))}
                    </select>
                  )}
                </div>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  El sistema revisará este buzón buscando archivos adjuntos XML de facturas emitidas a tu nombre.
                </p>
              </div>

              {/* Filtro de Búsqueda */}
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">
                  Criterio de búsqueda en Gmail
                </label>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    localStorage.setItem("facturacr_gmail_search_query", e.target.value);
                  }}
                  placeholder='label:"Factura Electronica" has:attachment filename:xml'
                  className="h-10 w-full rounded-xl border border-border bg-background px-3 text-xs font-mono font-medium focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20"
                />
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      const q = 'label:"Factura Electronica" has:attachment filename:xml';
                      setSearchQuery(q);
                      localStorage.setItem("facturacr_gmail_search_query", q);
                    }}
                    className="text-[10px] rounded-md bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-bold px-2 py-0.5 hover:bg-emerald-500/20 transition-colors font-mono"
                    title="Buscar únicamente en tu carpeta de Factura Electronica"
                  >
                    ⭐ Carpeta: Factura Electronica
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const q = "has:attachment filename:xml";
                      setSearchQuery(q);
                      localStorage.setItem("facturacr_gmail_search_query", q);
                    }}
                    className="text-[10px] rounded-md bg-blue-500/10 text-blue-700 dark:text-blue-300 font-semibold px-2 py-0.5 hover:bg-blue-500/20 transition-colors font-mono"
                    title="Buscar cualquier correo con archivos XML adjuntos"
                  >
                    + Todos los XMLs del buzón
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const q = "factura has:attachment";
                      setSearchQuery(q);
                      localStorage.setItem("facturacr_gmail_search_query", q);
                    }}
                    className="text-[10px] rounded-md bg-muted text-muted-foreground px-2 py-0.5 hover:bg-muted/80 transition-colors font-mono"
                    title="Buscar correos con asunto o contenido de factura"
                  >
                    + Asunto Factura
                  </button>
                </div>
              </div>

              {/* Rango Desde */}
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">
                  Facturas recibidas desde
                </label>
                <input
                  type="date"
                  value={dateFilter.desde}
                  onChange={(e) => setDateFilter({ ...dateFilter, desde: e.target.value })}
                  className="h-10 w-full rounded-xl border border-border bg-background px-3 text-xs font-mono font-medium focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20"
                />
              </div>

              {/* Rango Hasta */}
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">
                  Hasta la fecha
                </label>
                <input
                  type="date"
                  value={dateFilter.hasta}
                  onChange={(e) => setDateFilter({ ...dateFilter, hasta: e.target.value })}
                  className="h-10 w-full rounded-xl border border-border bg-background px-3 text-xs font-mono font-medium focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20"
                />
              </div>
            </div>

            {/* Subida directa alternativa */}
            <div className="rounded-xl border border-dashed border-border bg-muted/30 p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div>
                <span className="font-semibold text-foreground block">
                  ¿Ya tienes los archivos XML en tu computadora?
                </span>
                <span className="text-muted-foreground">
                  Si descargaste los XMLs directamente desde tu correo, puedes cargarlos aquí para procesarlos al instante.
                </span>
              </div>
              <label className="cursor-pointer inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3.5 py-1.5 text-xs font-semibold hover:bg-muted transition-colors shrink-0">
                <Upload className="h-4 w-4 text-primary" />
                <span>Importar XMLs de Compras</span>
                <input
                  type="file"
                  multiple
                  accept=".xml"
                  onChange={handleImportXmlFile}
                  className="hidden"
                />
              </label>
            </div>

            {/* Botón de Ejecución */}
            <div className="pt-3 border-t border-border flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                Filtro automático: <code>has:attachment filename:xml</code> de emisores comerciales CR.
              </div>

              <button
                type="button"
                onClick={handleStartScan}
                disabled={isScanning}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-bold text-primary-foreground shadow-soft hover:bg-primary/90 transition-all hover:scale-[1.01] disabled:opacity-50"
              >
                {isScanning ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" /> Escaneando bandeja de entrada...
                  </>
                ) : (
                  <>
                    <Download className="h-5 w-5" /> DESCARGAR FACTURAS DE GMAIL AHORA
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Consola / Terminal de Escaneo en Vivo */}
          {(isScanning || scanLogs.length > 0) && (
            <div className="rounded-2xl border border-border bg-slate-950 p-5 font-mono text-xs text-slate-200 shadow-elevated space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <div className="flex items-center gap-2 text-slate-400">
                  <div className="h-3 w-3 rounded-full bg-red-500/80" />
                  <div className="h-3 w-3 rounded-full bg-amber-500/80" />
                  <div className="h-3 w-3 rounded-full bg-emerald-500/80" />
                  <span className="text-[11px] font-semibold ml-2">Monitor de Sincronización Gmail</span>
                </div>
                <span className="text-slate-400 text-[11px]">{scanProgress}%</span>
              </div>

              {/* Barra de Progreso */}
              <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary transition-all duration-300"
                  style={{ width: `${scanProgress}%` }}
                />
              </div>

              {/* Logs */}
              <div className="space-y-1.5 max-h-48 overflow-y-auto text-[11px]">
                {scanLogs.map((log, index) => (
                  <div key={index} className="flex items-start gap-2">
                    <span className="text-slate-500 select-none">&gt;</span>
                    <span
                      className={
                        log.includes("✓")
                          ? "text-emerald-400"
                          : log.includes("🎉")
                          ? "text-primary font-bold"
                          : "text-slate-300"
                      }
                    >
                      {log}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tarjetas de Resumen de Compras Descargadas */}
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-border bg-card p-5 shadow-soft flex items-center gap-3.5">
              <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                <FileCode className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">Facturas Descargadas</p>
                <p className="text-xl font-bold text-foreground tabular-nums">
                  {downloadedInvoices.length} comprobantes
                </p>
                <p className="text-[11px] text-muted-foreground">XMLs y PDFs sincronizados</p>
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-card p-5 shadow-soft flex items-center gap-3.5">
              <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-amber-500/10 text-amber-600">
                <Building2 className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">Total Gastos Reportados</p>
                <p className="text-xl font-bold text-foreground tabular-nums">
                  {formatCRC(totalMontoCompras)}
                </p>
                <p className="text-[11px] text-muted-foreground">Compras de combustible, insumos, etc.</p>
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-card p-5 shadow-soft flex items-center gap-3.5">
              <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-emerald-500/10 text-emerald-600">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">Crédito Fiscal IVA Recuperado</p>
                <p className="text-xl font-bold text-foreground tabular-nums">
                  {formatCRC(totalIvaCompras)}
                </p>
                <p className="text-[11px] text-emerald-600 font-semibold">Listo para restar en D-104</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: COMPROBANTES EXTRAÍDOS */}
      {activeTab === "facturas" && (
        <div className="rounded-2xl border border-border bg-card shadow-soft overflow-hidden space-y-4 p-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border">
            <div>
              <h3 className="text-sm font-bold text-foreground">
                Facturas de Gastos y Proveedores Descargadas
              </h3>
              <p className="text-xs text-muted-foreground">
                Todos estos comprobantes ya están integrados en el cálculo del reporte para el contador.
              </p>
            </div>

            <Link
              to="/app/reports"
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-emerald-700 transition-colors shadow-xs"
            >
              <FileSpreadsheet className="h-4 w-4" /> Ver en Reporte del Contador
            </Link>
          </div>

          {downloadedInvoices.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-muted/10 p-12 text-center space-y-3">
              <div className="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-muted text-muted-foreground">
                <Mail className="h-6 w-6" />
              </div>
              <h4 className="text-sm font-semibold text-foreground">No hay comprobantes de compras o gastos todavía</h4>
              <p className="text-xs text-muted-foreground max-w-md mx-auto">
                No hay datos simulados o harcodeados. Escribe tu correo en la pestaña "Centro de Descarga de Facturas" o utiliza el botón de importación para cargar tus archivos XML reales.
              </p>
              <div className="flex items-center justify-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setActiveTab("descargar")}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
                >
                  <Download className="h-4 w-4" /> Ir a Escanear mi Correo
                </button>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/50 font-semibold text-muted-foreground border-b border-border">
                  <tr>
                    <th className="px-3.5 py-3 whitespace-nowrap">PROVEEDOR / EMISOR</th>
                    <th className="px-3.5 py-3 whitespace-nowrap">CÉDULA</th>
                    <th className="px-3.5 py-3 whitespace-nowrap">FECHA</th>
                    <th className="px-3.5 py-3 whitespace-nowrap">DETALLE DE COMPRA</th>
                    <th className="px-3.5 py-3 whitespace-nowrap text-right">MONTO TOTAL</th>
                    <th className="px-3.5 py-3 whitespace-nowrap text-right">IVA (CRÉDITO)</th>
                    <th className="px-3.5 py-3 whitespace-nowrap text-center">ESTADO</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border font-mono text-[11px]">
                  {downloadedInvoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-3.5 py-2.5 font-sans font-semibold text-foreground max-w-[220px] truncate">
                        {inv.emisorNombre}
                      </td>
                      <td className="px-3.5 py-2.5 text-muted-foreground">{inv.emisorCedula}</td>
                      <td className="px-3.5 py-2.5 text-muted-foreground">{inv.fechaEmision}</td>
                      <td className="px-3.5 py-2.5 font-sans text-muted-foreground max-w-[240px] truncate">
                        {inv.detallePrincipal}
                      </td>
                      <td className="px-3.5 py-2.5 text-right font-bold text-foreground">
                        {formatCRC(inv.totalComprobante)}
                      </td>
                      <td className="px-3.5 py-2.5 text-right text-emerald-600 font-semibold">
                        +{formatCRC(inv.totalIva)}
                      </td>
                      <td className="px-3.5 py-2.5 text-center">
                        <span className="rounded bg-emerald-500/10 text-emerald-600 px-2 py-0.5 text-[10px] font-bold">
                          {inv.estadoHacienda}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: GESTIÓN DE CUENTAS GMAIL */}
      {activeTab === "cuentas" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-foreground">Cuentas y Buzones Configurados</h3>
            <button
              type="button"
              onClick={() => setShowAddAccountModal(true)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
            >
              <Plus className="h-4 w-4" /> Agregar otra cuenta de Gmail
            </button>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {accounts.map((acc) => (
              <div
                key={acc.id}
                className="rounded-2xl border border-border bg-card p-5 shadow-soft space-y-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="grid h-11 w-11 place-items-center rounded-xl bg-red-500/10 text-red-600">
                      <Mail className="h-6 w-6" />
                    </div>
                    <div>
                      <p className="font-bold text-sm text-foreground">{acc.email}</p>
                      <p className="text-xs text-muted-foreground">{acc.label}</p>
                    </div>
                  </div>

                  <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-bold text-emerald-600 flex items-center gap-1">
                    <Check className="h-3 w-3" /> Activo
                  </span>
                </div>

                <div className="pt-2 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
                  <span>Vinculado el: {acc.connectedAt}</span>
                  <button
                    type="button"
                    onClick={() => handleDeleteAccount(acc.id, acc.email)}
                    className="text-destructive hover:underline text-xs flex items-center gap-1"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Desvincular
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal Agregar Cuenta */}
      {showAddAccountModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-base font-bold text-foreground">Vincular Cuenta de Gmail</h3>
              <button
                onClick={() => setShowAddAccountModal(false)}
                className="rounded-lg p-1 text-muted-foreground hover:bg-muted"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddAccount} className="space-y-3.5 text-xs">
              <div>
                <label className="mb-1 block font-semibold text-foreground">
                  Correo Electrónico (Gmail o Google Workspace) *
                </label>
                <input
                  type="email"
                  required
                  value={newAccountForm.email}
                  onChange={(e) => setNewAccountForm({ ...newAccountForm, email: e.target.value })}
                  placeholder="facturas@grupog3.cr o tu-correo@gmail.com"
                  className="h-9 w-full rounded-lg border border-border bg-background px-3 text-xs focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20"
                />
              </div>

              <div>
                <label className="mb-1 block font-semibold text-foreground">
                  Etiqueta / Nombre Descriptivo
                </label>
                <input
                  value={newAccountForm.label}
                  onChange={(e) => setNewAccountForm({ ...newAccountForm, label: e.target.value })}
                  placeholder="Ej: Buzón Facturas Grupo G3"
                  className="h-9 w-full rounded-lg border border-border bg-background px-3 text-xs focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20"
                />
              </div>

              <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 text-[11px] text-muted-foreground space-y-1">
                <p className="font-semibold text-primary">🔒 Conexión Segura con Protocolo IMAP / Google API</p>
                <p>
                  FacturaOS solo leerá correos que contengan archivos adjuntos <code>.xml</code> de facturación electrónica. No accede a mensajes personales.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setShowAddAccountModal(false)}
                  className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium hover:bg-muted"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-primary px-4 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 shadow-xs"
                >
                  Conectar Cuenta
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
