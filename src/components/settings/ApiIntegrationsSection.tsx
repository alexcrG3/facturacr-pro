import React, { useState, useEffect } from "react";
import { toast } from "sonner";
import {
  KeyRound,
  Copy,
  Check,
  Eye,
  EyeOff,
  Terminal,
  Play,
  Loader2,
  Building,
  ShieldCheck,
  FileCode,
  CheckCircle2,
  AlertCircle,
  Upload,
  RefreshCw,
  Plus,
  ExternalLink,
  Search,
  UserCheck,
  X,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

interface EstablishmentRecord {
  id: string;
  code: string;
  name: string;
  legal_id: string;
  legal_id_type: string;
  economic_activity_code: string;
  email: string;
  phone: string;
  atv_username: string;
  atv_password?: string;
  atv_pin?: string;
  atv_environment: string;
  is_active: boolean;
  p12_base64?: string;
  api_key?: string;
  app_name?: string;
}

export function ApiIntegrationsSection() {
  const [establishments, setEstablishments] = useState<EstablishmentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAppId, setSelectedAppId] = useState<string>("");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [showKeyMap, setShowKeyMap] = useState<Record<string, boolean>>({});
  const [showPinMap, setShowPinMap] = useState<Record<string, boolean>>({});

  // Modal para agregar nueva empresa / app
  const [showNewModal, setShowNewModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newAppName, setNewAppName] = useState("");
  const [newLegalId, setNewLegalId] = useState("");
  const [newLegalIdType, setNewLegalIdType] = useState("02");
  const [newActivity, setNewActivity] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newAtvUser, setNewAtvUser] = useState("");
  const [newAtvPass, setNewAtvPass] = useState("");
  const [newAtvPin, setNewAtvPin] = useState("");

  // Estados del probador interactivo
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);
  const [testDocType, setTestDocType] = useState<"04" | "01">("04");

  // Estados de consulta de identidad (TSE / RUT)
  const [searchCedula, setSearchCedula] = useState("114340648");
  const [searchingId, setSearchingId] = useState(false);
  const [identityResult, setIdentityResult] = useState<any>(null);

  // Pestaña de ejemplos de código
  const [activeCodeTab, setActiveCodeTab] = useState<"curl" | "ts" | "python" | "php">("ts");

  // Crear nuevo establecimiento y generar API Key
  const handleCreateEstablishment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAppName.trim() || !newLegalId.trim()) {
      toast.error("Por favor ingresa al menos el Nombre de la Aplicación y la Cédula.");
      return;
    }

    setCreating(true);
    try {
      const codeSlug = newAppName
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]/g, "_")
        .slice(0, 25);
      const uniqueCode = `${codeSlug}_${Math.random().toString(36).substring(2, 6)}`;
      const apiKeySecret = `fct_live_${codeSlug}_${Math.random().toString(36).substring(2, 10)}${Math.random().toString(36).substring(2, 10)}`;

      const { data: newEst, error: estErr } = await supabase
        .from("establishments")
        .insert({
          code: uniqueCode,
          name: newAppName.trim(),
          legal_id: newLegalId.trim(),
          legal_id_type: newLegalIdType,
          economic_activity_code: newActivity.replace(/\D/g, "").trim() || "620901",
          email: newEmail.trim() || null,
          phone: newPhone.trim() || null,
          atv_username: newAtvUser.trim() || null,
          atv_password: newAtvPass.trim() || null,
          atv_pin: newAtvPin.trim() || null,
          atv_environment: "staging",
          is_active: true,
        })
        .select()
        .single();

      if (estErr) throw estErr;

      const { error: keyErr } = await supabase.from("api_keys").insert({
        establishment_id: newEst.id,
        app_name: newAppName.trim(),
        key_prefix: apiKeySecret.slice(0, 12),
        key_secret: apiKeySecret,
        environment: "staging",
        is_active: true,
      });

      if (keyErr) throw keyErr;

      toast.success(`¡Empresa "${newAppName}" agregada con éxito!`, {
        description: `API Key generada: ${apiKeySecret.slice(0, 22)}...`,
      });

      // Limpiar formulario
      setNewAppName("");
      setNewLegalId("");
      setNewActivity("");
      setNewEmail("");
      setNewPhone("");
      setNewAtvUser("");
      setNewAtvPass("");
      setNewAtvPin("");
      setShowNewModal(false);

      await loadData();
      setSelectedAppId(newEst.id);
    } catch (err: any) {
      console.error("Error al registrar empresa:", err);
      toast.error(err.message || "Error al crear la empresa.");
    } finally {
      setCreating(false);
    }
  };

  // Cargar establecimientos y API keys desde Supabase
  const loadData = async () => {
    setLoading(true);
    try {
      const { data: estData, error: estErr } = await supabase
        .from("establishments")
        .select("*")
        .order("created_at", { ascending: true });

      const { data: keysData } = await supabase
        .from("api_keys")
        .select("*");

      if (estErr) throw estErr;

      const merged = (estData || []).map((e: any) => {
        const k = (keysData || []).find((key: any) => key.establishment_id === e.id);
        return {
          ...e,
          api_key: k ? k.key_secret : "fct_live_" + e.code + "_key",
          app_name: k ? k.app_name : e.name,
        };
      });

      setEstablishments(merged);
      if (merged.length > 0 && !selectedAppId) {
        setSelectedAppId(merged[0].id);
      }
    } catch (err: any) {
      console.error("Error al cargar establecimientos:", err);
      toast.error("No se pudieron cargar los establecimientos.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCopyKey = (key: string, id: string) => {
    navigator.clipboard.writeText(key);
    setCopiedKey(id);
    toast.success("API Key copiada al portapapeles");
    setTimeout(() => setCopiedKey(null), 2500);
  };

  const selectedEst = establishments.find((e) => e.id === selectedAppId) || establishments[0];

  // Ejecutar prueba de emisión vía API
  const handleTestEmit = async () => {
    if (!selectedEst) return;
    setTesting(true);
    setTestResult(null);

    try {
      const payload =
        testDocType === "04"
          ? {
              docType: "04",
              paymentMethod: "04",
              items: [
                {
                  cabys: "8314100009900",
                  detail: `Servicio de Prueba Express - ${selectedEst.app_name}`,
                  qty: 1,
                  unitPrice: 15000,
                  ivaRate: 13,
                },
              ],
              notes: `Emisión de prueba desde Panel Facturio PRO para ${selectedEst.app_name}`,
            }
          : {
              docType: "01",
              paymentMethod: "02",
              client: {
                idType: "01",
                idNumber: "114340648",
                name: "Carlos Andrés Mora Jiménez",
                email: "carlos@correo.cr",
              },
              items: [
                {
                  cabys: "8314100009900",
                  detail: `Membresía / Factura Oficial - ${selectedEst.app_name}`,
                  qty: 1,
                  unitPrice: 25000,
                  ivaRate: 13,
                },
              ],
              notes: `Factura Electrónica de prueba para ${selectedEst.app_name}`,
            };

      const res = await fetch("/api/v1/invoices/emit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${selectedEst.api_key}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      setTestResult(data);
      if (res.ok && data.success) {
        toast.success(`¡Comprobante emitido con éxito para ${selectedEst.app_name}!`);
      } else {
        toast.error(`Error: ${data.error || "Fallo en emisión"}`);
      }
    } catch (err: any) {
      setTestResult({ success: false, error: err.message });
      toast.error("Error al conectar con el API");
    } finally {
      setTesting(false);
    }
  };

  // Consultar Cédula en Cascada (Hacienda + TSE)
  const handleSearchIdentity = async () => {
    if (!searchCedula) return;
    setSearchingId(true);
    setIdentityResult(null);

    try {
      const res = await fetch(`/api/v1/identities/${searchCedula.trim()}`);
      const data = await res.json();
      if (res.ok && data.success) {
        setIdentityResult(data.data);
        toast.success(`Identidad encontrada: ${data.data.nombreCompleto}`);
      } else {
        setIdentityResult({ notFound: true, error: data.error });
        toast.error(data.error || "No se encontró la cédula.");
      }
    } catch (err: any) {
      toast.error("Error en la consulta de identidad.");
    } finally {
      setSearchingId(false);
    }
  };

  // Guardar cambios en un establecimiento
  const handleSaveEst = async (est: EstablishmentRecord) => {
    try {
      const { error } = await supabase
        .from("establishments")
        .update({
          name: est.name,
          legal_id: est.legal_id,
          economic_activity_code: est.economic_activity_code,
          atv_username: est.atv_username,
          atv_password: est.atv_password,
          atv_pin: est.atv_pin,
        })
        .eq("id", est.id);

      if (error) throw error;
      toast.success(`Configuración guardada para ${est.name}`);
    } catch (err: any) {
      toast.error("No se pudo actualizar el establecimiento.");
    }
  };

  return (
    <div className="space-y-8">
      {/* Encabezado Principal */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-border pb-5">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <KeyRound className="h-6 w-6 text-primary" />
            Hub de Integración Multi-Empresa & API REST
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Permite que <strong>Athletix OS, AvalCarCr, BarberApp, gasExpress, PawsPatients Pro</strong> y cualquier sistema externo emitan comprobantes electrónicos de Costa Rica de forma desatendida.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-600 border border-emerald-500/20">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            REST API v1 Activa
          </span>
          <button
            onClick={() => setShowNewModal(true)}
            className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 shadow-sm transition-all"
          >
            <Plus className="h-3.5 w-3.5" /> Agregar Empresa / App
          </button>
          <button
            onClick={loadData}
            className="flex items-center gap-1 rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs font-medium hover:bg-muted"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Refrescar
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <>
          {/* Selector de Establecimientos */}
          <div className="space-y-3">
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Establecimientos & Aplicaciones Conectadas ({establishments.length})
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {establishments.map((est) => {
                const isSelected = est.id === selectedEst?.id;
                return (
                  <button
                    key={est.id}
                    onClick={() => setSelectedAppId(est.id)}
                    className={`text-left p-4 rounded-xl border transition-all ${
                      isSelected
                        ? "border-primary bg-primary/5 ring-2 ring-primary/20 shadow-sm"
                        : "border-border bg-card hover:bg-muted/50"
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="font-semibold text-sm text-foreground flex items-center gap-2">
                        <Building className="h-4 w-4 text-primary" />
                        {est.app_name || est.name}
                      </div>
                      {isSelected && <CheckCircle2 className="h-4 w-4 text-primary" />}
                    </div>
                    <div className="mt-2 text-xs text-muted-foreground space-y-0.5">
                      <div><span className="font-medium text-foreground">Cédula:</span> {est.legal_id}</div>
                      <div><span className="font-medium text-foreground">Actividad:</span> {est.economic_activity_code}</div>
                    </div>
                  </button>
                );
              })}

              {/* Botón Card para Agregar Nueva Empresa o App */}
              <button
                type="button"
                onClick={() => setShowNewModal(true)}
                className="border-2 border-dashed border-border hover:border-primary/60 hover:bg-primary/5 p-4 rounded-xl flex flex-col items-center justify-center text-center gap-2 transition-all group min-h-[95px]"
              >
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Plus className="h-4 w-4 text-primary" />
                </div>
                <span className="text-xs font-semibold text-muted-foreground group-hover:text-primary">
                  + Agregar Nueva Empresa o App
                </span>
              </button>
            </div>
          </div>

          {/* Tarjeta de Detalle del Establecimiento Seleccionado */}
          {selectedEst && (
            <div className="rounded-xl border border-border bg-card p-6 shadow-sm space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-border pb-4">
                <div>
                  <h3 className="font-bold text-base flex items-center gap-2">
                    <ShieldCheck className="h-5 w-5 text-emerald-500" />
                    Credenciales & API Key: {selectedEst.app_name}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Razón Social: <strong>{selectedEst.name}</strong>
                  </p>
                </div>
                <button
                  onClick={() => handleSaveEst(selectedEst)}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
                >
                  <Check className="h-3.5 w-3.5" /> Guardar Cambios
                </button>
              </div>

              {/* Fila: API Key */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground flex items-center justify-between">
                  <span>API Key Secreta (Bearer Token para {selectedEst.app_name})</span>
                  <span className="text-[11px] text-muted-foreground">Usa este valor en el header <code>Authorization</code></span>
                </label>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <input
                      type={showKeyMap[selectedEst.id] ? "text" : "password"}
                      readOnly
                      value={selectedEst.api_key}
                      className="h-10 w-full rounded-lg border border-border bg-muted/40 px-3 pr-10 font-mono text-xs text-foreground focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setShowKeyMap((prev) => ({ ...prev, [selectedEst.id]: !prev[selectedEst.id] }))
                      }
                      className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
                    >
                      {showKeyMap[selectedEst.id] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopyKey(selectedEst.api_key || "", selectedEst.id)}
                    className="flex h-10 items-center gap-1.5 rounded-lg border border-border bg-background px-3.5 text-xs font-semibold hover:bg-muted"
                  >
                    {copiedKey === selectedEst.id ? (
                      <>
                        <Check className="h-3.5 w-3.5 text-emerald-500" /> Copiado
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5" /> Copiar Key
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Datos Fiscales y Llave Criptográfica .p12 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Cédula Emisor (Física o Jurídica)</label>
                  <input
                    value={selectedEst.legal_id}
                    onChange={(e) => {
                      const val = e.target.value;
                      setEstablishments((prev) =>
                        prev.map((item) => (item.id === selectedEst.id ? { ...item, legal_id: val } : item))
                      );
                    }}
                    className="h-9 w-full rounded-lg border border-border bg-background px-3 text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Código de Actividad Económica (CIIU)</label>
                  <input
                    value={selectedEst.economic_activity_code}
                    onChange={(e) => {
                      const val = e.target.value;
                      setEstablishments((prev) =>
                        prev.map((item) =>
                          item.id === selectedEst.id ? { ...item, economic_activity_code: val } : item
                        )
                      );
                    }}
                    className="h-9 w-full rounded-lg border border-border bg-background px-3 text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Usuario ATV de Hacienda (cpj-... / cpf-...)</label>
                  <input
                    value={selectedEst.atv_username || ""}
                    onChange={(e) => {
                      const val = e.target.value;
                      setEstablishments((prev) =>
                        prev.map((item) => (item.id === selectedEst.id ? { ...item, atv_username: val } : item))
                      );
                    }}
                    className="h-9 w-full rounded-lg border border-border bg-background px-3 text-xs font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">PIN de Llave Criptográfica (4 dígitos)</label>
                  <div className="relative">
                    <input
                      type={showPinMap[selectedEst.id] ? "text" : "password"}
                      value={selectedEst.atv_pin || ""}
                      placeholder="Ej. 1234"
                      onChange={(e) => {
                        const val = e.target.value;
                        setEstablishments((prev) =>
                          prev.map((item) => (item.id === selectedEst.id ? { ...item, atv_pin: val } : item))
                        );
                      }}
                      className="h-9 w-full rounded-lg border border-border bg-background px-3 pr-9 text-xs font-mono"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setShowPinMap((prev) => ({ ...prev, [selectedEst.id]: !prev[selectedEst.id] }))
                      }
                      className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
                    >
                      {showPinMap[selectedEst.id] ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Probador en Vivo de la API */}
          <div className="rounded-xl border border-border bg-card p-6 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-border pb-3">
              <div>
                <h3 className="font-bold text-base flex items-center gap-2">
                  <Play className="h-4 w-4 text-emerald-500 fill-emerald-500" />
                  Simulador en Vivo: Emitir Factura vía API
                </h3>
                <p className="text-xs text-muted-foreground">
                  Prueba el endpoint en tiempo real enviando un comprobante con la llave de <strong>{selectedEst?.app_name}</strong>.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={testDocType}
                  onChange={(e) => setTestDocType(e.target.value as any)}
                  className="rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs font-medium"
                >
                  <option value="04">04 - Tiquete Electrónico (Rápido)</option>
                  <option value="01">01 - Factura Electrónica (Con Cliente)</option>
                </select>
                <button
                  onClick={handleTestEmit}
                  disabled={testing}
                  className="flex items-center gap-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-1.5 text-xs font-semibold shadow-sm transition-all"
                >
                  {testing ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" /> Emitiendo...
                    </>
                  ) : (
                    <>
                      <Play className="h-3.5 w-3.5 fill-white" /> Ejecutar POST
                    </>
                  )}
                </button>
              </div>
            </div>

            {testResult && (
              <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-3 font-mono text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-foreground flex items-center gap-1.5">
                    {testResult.success ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-rose-500" />
                    )}
                    Respuesta del Servidor Facturio PRO
                  </span>
                  <span className="text-[11px] text-muted-foreground">HTTP 200 OK</span>
                </div>

                {testResult.success && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2 bg-card p-3 rounded-lg border border-border">
                    <div>
                      <div className="text-[10px] text-muted-foreground uppercase">Consecutivo Oficial:</div>
                      <div className="font-bold text-foreground">{testResult.consecutiveNumber}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-muted-foreground uppercase">Total Cobrado:</div>
                      <div className="font-bold text-emerald-600">₡{Number(testResult.total).toLocaleString()}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-muted-foreground uppercase">Estado en Hacienda:</div>
                      <div className="font-bold text-emerald-600 uppercase">{testResult.status}</div>
                    </div>
                    <div className="md:col-span-3 pt-1">
                      <div className="text-[10px] text-muted-foreground uppercase">Clave Numérica (50 dígitos):</div>
                      <div className="font-mono text-xs break-all text-primary">{testResult.clave}</div>
                    </div>
                  </div>
                )}

                <pre className="max-h-48 overflow-y-auto rounded bg-black/90 p-3 text-emerald-400 text-[11px] leading-relaxed">
                  {JSON.stringify(testResult, null, 2)}
                </pre>
              </div>
            )}
          </div>

          {/* Probador de Cédulas e Identidades (TSE / RUT) */}
          <div className="rounded-xl border border-border bg-card p-6 shadow-sm space-y-4">
            <div className="border-b border-border pb-3">
              <h3 className="font-bold text-base flex items-center gap-2">
                <UserCheck className="h-5 w-5 text-indigo-500" />
                Consulta de Identidades (Hacienda RUT & Padrón Electoral TSE)
              </h3>
              <p className="text-xs text-muted-foreground">
                Tus aplicaciones pueden consultar cualquier cédula para autocompletar el nombre y actividades del socio, paciente o cliente.
              </p>
            </div>

            <div className="flex items-center gap-2 max-w-md">
              <input
                type="text"
                placeholder="Digita una cédula (ej. 114340648)"
                value={searchCedula}
                onChange={(e) => setSearchCedula(e.target.value)}
                className="h-9 flex-1 rounded-lg border border-border bg-background px-3 text-xs"
              />
              <button
                onClick={handleSearchIdentity}
                disabled={searchingId}
                className="flex items-center gap-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white px-3.5 py-2 text-xs font-semibold"
              >
                {searchingId ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5" />}
                Consultar
              </button>
            </div>

            {identityResult && (
              <div className="rounded-lg border border-border bg-muted/40 p-4 font-mono text-xs">
                {identityResult.notFound ? (
                  <div className="text-rose-500 font-semibold">{identityResult.error}</div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-foreground text-sm">{identityResult.nombreCompleto}</span>
                      <span className="rounded bg-indigo-500/10 px-2 py-0.5 text-[10px] font-semibold text-indigo-600 border border-indigo-500/20 uppercase">
                        Fuente: {identityResult.source}
                      </span>
                    </div>
                    <div className="text-muted-foreground">
                      Cédula: <strong>{identityResult.cedula}</strong> · Tipo: <strong>{identityResult.tipoPersona}</strong>
                    </div>
                    {identityResult.actividadesEconomicas && identityResult.actividadesEconomicas.length > 0 && (
                      <div className="pt-2 border-t border-border mt-2">
                        <div className="text-[11px] font-bold text-foreground mb-1">Actividades Económicas en Hacienda:</div>
                        <ul className="space-y-1 text-muted-foreground">
                          {identityResult.actividadesEconomicas.map((act: any, idx: number) => (
                            <li key={idx} className="flex gap-2">
                              <span className="font-bold text-foreground">{act.codigo}:</span>
                              <span>{act.descripcion}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Guía Rápida de Código */}
          <div className="rounded-xl border border-border bg-card p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="font-bold text-base flex items-center gap-2">
                <FileCode className="h-5 w-5 text-primary" />
                Ejemplos de Integración para tus Desarrolladores
              </h3>
              <div className="flex rounded-lg border border-border bg-muted/40 p-0.5 text-xs font-medium">
                <button
                  onClick={() => setActiveCodeTab("ts")}
                  className={`px-3 py-1 rounded-md transition-all ${
                    activeCodeTab === "ts" ? "bg-card text-foreground font-semibold shadow-xs" : "text-muted-foreground"
                  }`}
                >
                  TypeScript / Node.js
                </button>
                <button
                  onClick={() => setActiveCodeTab("curl")}
                  className={`px-3 py-1 rounded-md transition-all ${
                    activeCodeTab === "curl" ? "bg-card text-foreground font-semibold shadow-xs" : "text-muted-foreground"
                  }`}
                >
                  cURL
                </button>
                <button
                  onClick={() => setActiveCodeTab("python")}
                  className={`px-3 py-1 rounded-md transition-all ${
                    activeCodeTab === "python" ? "bg-card text-foreground font-semibold shadow-xs" : "text-muted-foreground"
                  }`}
                >
                  Python
                </button>
                <button
                  onClick={() => setActiveCodeTab("php")}
                  className={`px-3 py-1 rounded-md transition-all ${
                    activeCodeTab === "php" ? "bg-card text-foreground font-semibold shadow-xs" : "text-muted-foreground"
                  }`}
                >
                  PHP
                </button>
              </div>
            </div>

            <div className="relative">
              <pre className="overflow-x-auto rounded-lg bg-neutral-950 p-4 font-mono text-xs text-neutral-200 leading-relaxed">
                {activeCodeTab === "ts" && `// En ${selectedEst.app_name} al procesar un cobro:
const response = await fetch("https://facturio.tu-dominio.cr/api/v1/invoices/emit", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Authorization": "Bearer ${selectedEst.api_key}"
  },
  body: JSON.stringify({
    docType: "04", // 04: Tiquete o 01: Factura
    paymentMethod: "04", // 04: SINPE Móvil, 02: Tarjeta, 01: Efectivo
    items: [
      {
        cabys: "8314100009900",
        detail: "Servicio o producto cobrado",
        qty: 1,
        unitPrice: 15000,
        ivaRate: 13
      }
    ]
  })
});

const data = await response.json();
console.log("Clave Oficial:", data.clave);
console.log("Ver PDF:", data.pdfUrl);`}

                {activeCodeTab === "curl" && `curl -X POST https://facturio.tu-dominio.cr/api/v1/invoices/emit \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer ${selectedEst.api_key}" \\
  -d '{
    "docType": "04",
    "paymentMethod": "04",
    "items": [
      {
        "cabys": "8314100009900",
        "detail": "Venta en mostrador",
        "qty": 1,
        "unitPrice": 12000,
        "ivaRate": 13
      }
    ]
  }'`}

                {activeCodeTab === "python" && `import requests

url = "https://facturio.tu-dominio.cr/api/v1/invoices/emit"
headers = {
    "Content-Type": "application/json",
    "Authorization": "Bearer ${selectedEst.api_key}"
}
payload = {
    "docType": "04",
    "paymentMethod": "04",
    "items": [
        {
            "cabys": "8314100009900",
            "detail": "Cobro de Servicio",
            "qty": 1,
            "unitPrice": 15000,
            "ivaRate": 13
        }
    ]
}

response = requests.post(url, json=payload, headers=headers)
data = response.json()
print("Clave Hacienda:", data.get("clave"))`}

                {activeCodeTab === "php" && `<?php
$curl = curl_init();
curl_setopt_array($curl, array(
  CURLOPT_URL => 'https://facturio.tu-dominio.cr/api/v1/invoices/emit',
  CURLOPT_RETURNTRANSFER => true,
  CURLOPT_CUSTOMREQUEST => 'POST',
  CURLOPT_POSTFIELDS => json_encode(array(
    'docType' => '04',
    'paymentMethod' => '04',
    'items' => array(
      array(
        'cabys' => '8314100009900',
        'detail' => 'Cobro en Mostrador',
        'qty' => 1,
        'unitPrice' => 15000,
        'ivaRate' => 13
      )
    )
  )),
  CURLOPT_HTTPHEADER => array(
    'Content-Type: application/json',
    'Authorization: Bearer ${selectedEst.api_key}'
  ),
));

$response = curl_exec($curl);
curl_close($curl);
$factura = json_decode($response, true);
echo "Clave: " . $factura['clave'];
?>`}
              </pre>
            </div>
          </div>
        </>
      )}

      {/* Modal para Crear Nueva Empresa / App */}
      {showNewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="w-full max-w-xl rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-5 animate-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <h3 className="font-bold text-lg flex items-center gap-2 text-foreground">
                  <Plus className="h-5 w-5 text-primary" />
                  Agregar Nueva Empresa o Aplicación
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Se creará su entidad fiscal aislada y se generará una API Key exclusiva para emitir comprobantes.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowNewModal(false)}
                className="rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateEstablishment} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="sm:col-span-2 space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">
                    Nombre de la Aplicación o Empresa *
                  </label>
                  <input
                    required
                    type="text"
                    placeholder="Ej. NexusClinic, NexusSport, Restaurante El Faro"
                    value={newAppName}
                    onChange={(e) => setNewAppName(e.target.value)}
                    className="h-9 w-full rounded-lg border border-border bg-background px-3 text-xs focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">
                    Cédula Emisora (Física / Jurídica) *
                  </label>
                  <input
                    required
                    type="text"
                    placeholder="Ej. 3-101-123456 o 114340648"
                    value={newLegalId}
                    onChange={(e) => setNewLegalId(e.target.value)}
                    className="h-9 w-full rounded-lg border border-border bg-background px-3 text-xs focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">
                    Tipo de Identificación
                  </label>
                  <select
                    value={newLegalIdType}
                    onChange={(e) => setNewLegalIdType(e.target.value)}
                    className="h-9 w-full rounded-lg border border-border bg-background px-2.5 text-xs font-medium focus:border-primary focus:outline-none"
                  >
                    <option value="02">02 - Cédula Jurídica (10 dígitos)</option>
                    <option value="01">01 - Cédula Física (9 dígitos)</option>
                    <option value="03">03 - DIMEX (11 o 12 dígitos)</option>
                    <option value="04">04 - NITE</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">
                    Actividad Económica (CIIU)
                  </label>
                  <input
                    type="text"
                    placeholder="Ej. 862001 (Clínica), 831401 (Gym)"
                    value={newActivity}
                    onChange={(e) => setNewActivity(e.target.value)}
                    className="h-9 w-full rounded-lg border border-border bg-background px-3 text-xs focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">
                    Correo del Emisor (Opcional)
                  </label>
                  <input
                    type="email"
                    placeholder="facturas@empresa.cr"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    className="h-9 w-full rounded-lg border border-border bg-background px-3 text-xs focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>

                <div className="sm:col-span-2 pt-2 border-t border-border">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block mb-2">
                    Credenciales ATV de Hacienda (Opcional - puedes configurarlas después)
                  </span>
                </div>

                <div className="sm:col-span-2 space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">
                    Usuario ATV (cpj-... / cpf-...)
                  </label>
                  <input
                    type="text"
                    placeholder="cpj-3-101-xxxxxx@stag.comprobanteselectronicos.go.cr"
                    value={newAtvUser}
                    onChange={(e) => setNewAtvUser(e.target.value)}
                    className="h-9 w-full rounded-lg border border-border bg-background px-3 text-xs font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">
                    Contraseña ATV
                  </label>
                  <input
                    type="password"
                    placeholder="••••••••••••"
                    value={newAtvPass}
                    onChange={(e) => setNewAtvPass(e.target.value)}
                    className="h-9 w-full rounded-lg border border-border bg-background px-3 text-xs font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">
                    PIN Llave Criptográfica
                  </label>
                  <input
                    type="password"
                    placeholder="Ej. 1234"
                    maxLength={4}
                    value={newAtvPin}
                    onChange={(e) => setNewAtvPin(e.target.value)}
                    className="h-9 w-full rounded-lg border border-border bg-background px-3 text-xs font-mono"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-border">
                <button
                  type="button"
                  disabled={creating}
                  onClick={() => setShowNewModal(false)}
                  className="rounded-lg border border-border px-4 py-2 text-xs font-semibold hover:bg-muted"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 shadow-sm"
                >
                  {creating ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" /> Registrando...
                    </>
                  ) : (
                    <>
                      <Plus className="h-3.5 w-3.5" /> Registrar Empresa y Generar API Key
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
