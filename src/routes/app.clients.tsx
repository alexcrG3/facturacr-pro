import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Plus,
  Search,
  Mail,
  Phone,
  MapPin,
  FileText,
  X,
  Check,
  Building2,
  User,
  Pencil,
  Trash2,
  Sparkles,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Briefcase,
} from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/common/PageHeader";
import { formatCRC, Client } from "@/lib/mock-data";
import { consultarContribuyenteHacienda, TaxpayerInfo } from "@/lib/taxpayer";
import { supabase } from "@/lib/supabase";
import { useApp } from "@/contexts/AppContext";

export const Route = createFileRoute("/app/clients")({
  component: ClientsPage,
});

function ClientsPage() {
  const { activeEstablishment } = useApp();
  const [searchQuery, setSearchQuery] = useState("");
  const [clientsList, setClientsList] = useState<Client[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClientId, setEditingClientId] = useState<string | null>(null);

  // Formulario cliente
  const [clientForm, setClientForm] = useState({
    name: "",
    type: "juridica" as "fisica" | "juridica",
    legalId: "",
    email: "",
    phone: "",
    city: "San José",
    economicActivity: "",
  });

  const [buscandoHacienda, setBuscandoHacienda] = useState(false);
  const [infoHacienda, setInfoHacienda] = useState<TaxpayerInfo | null>(null);

  const handleConsultarHacienda = async (cedulaToSearch?: string) => {
    const raw = (cedulaToSearch ?? clientForm.legalId).trim();
    const clean = raw.replace(/\D/g, "");
    if (clean.length < 9) {
      toast.error("Ingresa al menos 9 dígitos de la cédula para consultar en Hacienda");
      return;
    }

    setBuscandoHacienda(true);
    try {
      const info = await consultarContribuyenteHacienda(clean);
      if (info && info.nombre) {
        setInfoHacienda(info);
        const principalAct = info.actividades?.find((a) => a.tipo === "P" && a.estado === "A") || info.actividades?.find((a) => a.estado === "A") || info.actividades?.[0];
        setClientForm((prev) => ({
          ...prev,
          name: info.nombre,
          type: clean.length === 10 ? "juridica" : "fisica",
          economicActivity: principalAct ? principalAct.codigo : prev.economicActivity,
        }));
        toast.success(`Hacienda: ${info.nombre}`, {
          description: `Régimen: ${info.regimen?.descripcion || "General"}${principalAct ? ` · Actividad: ${principalAct.codigo}` : ""}`,
        });
      } else {
        setInfoHacienda(null);
        toast.info("No se encontró información tributaria para esta cédula en Hacienda");
      }
    } catch {
      toast.error("Error al consultar Hacienda");
    } finally {
      setBuscandoHacienda(false);
    }
  };

  const [isLoading, setIsLoading] = useState(false);

  const loadClients = async () => {
    if (!activeEstablishment?.id) {
      setClientsList([]);
      return;
    }
    setIsLoading(true);
    try {
      // 1. Obtener facturas de esta empresa para aislar clientes por negocio
      const { data: invData } = await supabase
        .from("invoices")
        .select("client_name, client_legal_id, total")
        .eq("establishment_id", activeEstablishment.id);

      const clientTotals: Record<string, { total: number; count: number; name: string }> = {};
      (invData || []).forEach((inv: any) => {
        const key = (inv.client_legal_id || inv.client_name || "").trim();
        if (!key || key === "Consumidor Final") return;
        if (!clientTotals[key]) {
          clientTotals[key] = { total: 0, count: 0, name: inv.client_name };
        }
        clientTotals[key].total += Number(inv.total) || 0;
        clientTotals[key].count += 1;
      });

      // 2. Clientes de la base de datos
      const isMaster = activeEstablishment.code === "grupo_g_tres";
      const { data: dbClients, error } = await supabase
        .from("clients")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Filtrar estrictamente:
      // Para inquilinos (ej: Nexus Clinic): clientes que hayan facturado en este establecimiento
      let filteredDbClients: any[] = [];
      if (isMaster) {
        filteredDbClients = dbClients || [];
      } else {
        const estLegalIds = Object.keys(clientTotals);
        filteredDbClients = (dbClients || []).filter((c: any) => estLegalIds.includes(c.legal_id));
      }

      // Añadir clientes facturados en esta empresa que no estén en la tabla clients
      const existingIds = new Set(filteredDbClients.map((c: any) => c.legal_id));
      Object.entries(clientTotals).forEach(([key, info], idx) => {
        if (!existingIds.has(key)) {
          filteredDbClients.push({
            id: `inv-cl-${idx}`,
            name: info.name,
            legal_id: key,
            legal_id_type: key.length === 10 ? "02" : "01",
            email: "",
            phone: "",
            economic_activity: "",
          });
        }
      });

      const mapped: Client[] = filteredDbClients.map((row: any) => {
        const stats = clientTotals[row.legal_id] || clientTotals[row.name] || { total: 0, count: 0 };
        return {
          id: row.id,
          name: row.name,
          type: (row.legal_id_type === "02" || row.legal_id_type === "juridica") ? "juridica" : "fisica",
          legalId: row.legal_id,
          email: row.email || "",
          phone: row.phone || "",
          city: row.district || row.canton || "San José",
          economicActivity: row.economic_activity || "",
          totalSpent: stats.total,
          invoices: stats.count,
        };
      });

      setClientsList(mapped);
    } catch (err) {
      console.error("Error cargando clientes aislados:", err);
      setClientsList([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadClients();
  }, [activeEstablishment]);

  const handleOpenCreate = () => {
    setEditingClientId(null);
    setInfoHacienda(null);
    setClientForm({
      name: "",
      type: "juridica",
      legalId: "",
      email: "",
      phone: "",
      city: "San José",
      economicActivity: "",
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (c: Client) => {
    setEditingClientId(c.id);
    setInfoHacienda(null);
    setClientForm({
      name: c.name,
      type: c.type,
      legalId: c.legalId,
      email: c.email,
      phone: c.phone,
      city: c.city || "San José",
      economicActivity: c.economicActivity || "",
    });
    setIsModalOpen(true);
  };

  const handleDeleteClient = async (id: string, name: string) => {
    if (confirm(`¿Estás seguro de que deseas eliminar al cliente "${name}"?`)) {
      const { error } = await supabase.from("clients").delete().eq("id", id);
      if (error) {
        toast.error("Error al eliminar cliente");
        return;
      }
      setClientsList((prev) => prev.filter((c) => c.id !== id));
      toast.success(`Cliente "${name}" eliminado correctamente`);
    }
  };

  const handleSaveClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientForm.name.trim() || !clientForm.legalId.trim()) {
      toast.error("Por favor completa el Nombre y la Cédula");
      return;
    }

    const legalIdType = clientForm.type === "juridica" ? "02" : "01";

    if (editingClientId) {
      // Editar en Supabase
      const { error } = await supabase
        .from("clients")
        .update({
          name: clientForm.name.trim(),
          legal_id: clientForm.legalId.trim(),
          legal_id_type: legalIdType,
          email: clientForm.email.trim() || "",
          phone: clientForm.phone.trim() || "",
          district: clientForm.city || "San José",
          economic_activity: clientForm.economicActivity.trim() || null,
        })
        .eq("id", editingClientId);

      if (error) {
        toast.error("Error al actualizar cliente");
        return;
      }
      toast.success(`¡Cliente "${clientForm.name.trim()}" actualizado con éxito!`);
    } else {
      // Crear en Supabase
      const { data, error } = await supabase
        .from("clients")
        .insert({
          name: clientForm.name.trim(),
          legal_id: clientForm.legalId.trim(),
          legal_id_type: legalIdType,
          email: clientForm.email.trim() || "",
          phone: clientForm.phone.trim() || "",
          district: clientForm.city || "San José",
          economic_activity: clientForm.economicActivity.trim() || null,
        })
        .select()
        .single();

      if (error) {
        toast.error("Error al registrar cliente");
        return;
      }
      const newClient: Client = {
        id: data.id,
        name: data.name,
        type: clientForm.type,
        legalId: data.legal_id,
        email: data.email || "",
        phone: data.phone || "",
        city: data.district || "San José",
        economicActivity: data.economic_activity || clientForm.economicActivity.trim() || "",
        totalSpent: 0,
        invoices: 0,
      };
      setClientsList((prev) => [newClient, ...prev]);
      toast.success(`¡Cliente "${newClient.name}" registrado con éxito!`);
    }

    await loadClients();
    setIsModalOpen(false);
  };

  const filteredClients = clientsList.filter((c) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      c.name.toLowerCase().includes(q) ||
      c.legalId.toLowerCase().includes(q) ||
      c.email.toLowerCase().includes(q) ||
      c.city.toLowerCase().includes(q)
    );
  });

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader
        title="Clientes"
        description={`${clientsList.length} clientes registrados listos para facturar`}
        actions={
          <button
            type="button"
            onClick={handleOpenCreate}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-2 text-sm font-medium text-primary-foreground hover:shadow-glow transition-all"
          >
            <Plus className="h-4 w-4" /> Nuevo cliente
          </button>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative max-w-md flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por nombre, cédula o correo…"
            className="h-10 w-full rounded-lg border border-border bg-card pl-9 pr-3 text-sm focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20"
          />
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {filteredClients.map((c) => (
          <div
            key={c.id}
            className="group rounded-xl border border-border bg-card p-5 shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-elevated flex flex-col justify-between"
          >
            <div>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0">
                  <div
                    className={`grid h-11 w-11 shrink-0 place-items-center rounded-lg text-sm font-semibold ${
                      c.type === "juridica"
                        ? "bg-primary-soft text-primary"
                        : "bg-emerald-500/10 text-emerald-600"
                    }`}
                  >
                    {c.name
                      .split(" ")
                      .map((n) => n[0])
                      .slice(0, 2)
                      .join("")}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="truncate font-semibold text-foreground">{c.name}</h3>
                    </div>
                    <p className="text-xs text-muted-foreground font-mono">
                      {c.type === "juridica" ? "Cédula jurídica" : "Cédula física"} · {c.legalId}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleOpenEdit(c)}
                    className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-primary transition-colors"
                    title="Editar cliente"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteClient(c.id, c.name)}
                    className="rounded-lg p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                    title="Eliminar cliente"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <dl className="mt-4 space-y-1.5 text-xs text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="truncate">{c.email}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                  {c.phone}
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  {c.city}
                </div>
                {c.economicActivity ? (
                  <div className="flex items-center gap-2 font-mono text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                    <Briefcase className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">Actividad: {c.economicActivity}</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-[11px] text-muted-foreground/60 italic">
                    <Briefcase className="h-3.5 w-3.5 shrink-0" />
                    <span>Sin actividad registrada</span>
                  </div>
                )}
              </dl>
            </div>

            <div className="mt-4 pt-3 border-t border-border space-y-3">
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    Total facturado
                  </p>
                  <p className="text-sm font-semibold tabular-nums">{formatCRC(c.totalSpent)}</p>
                </div>
                <span className="rounded-md bg-muted px-2 py-0.5 text-xs font-medium">
                  {c.invoices} facturas
                </span>
              </div>

              <Link
                to="/app/invoices/new"
                search={{ clientId: c.id } as any}
                className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg border border-primary/30 bg-primary/10 py-1.5 text-xs font-semibold text-primary hover:bg-primary/20 transition-colors"
              >
                <FileText className="h-3.5 w-3.5" /> Facturar a este cliente
              </Link>
            </div>
          </div>
        ))}
      </div>

      {/* Modal Registrar / Editar Cliente */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-base font-semibold">
                {editingClientId ? "Editar Cliente" : "Registrar Nuevo Cliente"}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="rounded-lg p-1 text-muted-foreground hover:bg-muted"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveClient} className="space-y-3 text-xs">
              <div>
                <label className="mb-1 block font-medium text-muted-foreground">Tipo de Identificación *</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setClientForm({ ...clientForm, type: "juridica" })}
                    className={`flex items-center justify-center gap-1.5 rounded-lg border p-2 text-xs font-medium transition-colors ${
                      clientForm.type === "juridica"
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-background"
                    }`}
                  >
                    <Building2 className="h-3.5 w-3.5" /> Cédula Jurídica
                  </button>
                  <button
                    type="button"
                    onClick={() => setClientForm({ ...clientForm, type: "fisica" })}
                    className={`flex items-center justify-center gap-1.5 rounded-lg border p-2 text-xs font-medium transition-colors ${
                      clientForm.type === "fisica"
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-background"
                    }`}
                  >
                    <User className="h-3.5 w-3.5" /> Cédula Física
                  </button>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-medium text-muted-foreground">
                    Número de Cédula (con o sin guiones) *
                  </label>
                  <button
                    type="button"
                    onClick={() => handleConsultarHacienda()}
                    disabled={buscandoHacienda || clientForm.legalId.replace(/\D/g, "").length < 9}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline disabled:opacity-40 disabled:no-underline"
                  >
                    {buscandoHacienda ? (
                      <>
                        <Loader2 className="h-3 w-3 animate-spin text-primary" /> Consultando Hacienda...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-3 w-3 text-amber-500" /> Consultar en Hacienda
                      </>
                    )}
                  </button>
                </div>
                <div className="relative">
                  <input
                    required
                    value={clientForm.legalId}
                    onChange={(e) => {
                      const val = e.target.value;
                      setClientForm((prev) => ({ ...prev, legalId: val }));
                      const clean = val.replace(/\D/g, "");
                      if (clean.length === 10) {
                        setClientForm((prev) => ({ ...prev, type: "juridica", legalId: val }));
                        handleConsultarHacienda(val);
                      } else if (clean.length === 9) {
                        setClientForm((prev) => ({ ...prev, type: "fisica", legalId: val }));
                        handleConsultarHacienda(val);
                      }
                    }}
                    onBlur={() => {
                      if (clientForm.legalId.replace(/\D/g, "").length >= 9 && !clientForm.name) {
                        handleConsultarHacienda();
                      }
                    }}
                    placeholder={clientForm.type === "juridica" ? "3-101-234567" : "1-1234-0567"}
                    className="h-9 w-full rounded-lg border border-border bg-background px-3 text-xs font-mono focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20"
                  />
                  {buscandoHacienda && (
                    <div className="absolute right-2.5 top-1/2 -translate-y-1/2">
                      <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    </div>
                  )}
                </div>
              </div>

              {infoHacienda && (
                <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-2.5 text-[11px] text-emerald-800 dark:text-emerald-200 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold flex items-center gap-1.5">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                      Hacienda CR: {infoHacienda.situacion?.estado || "Inscrito"}
                    </span>
                    <span className="rounded bg-emerald-600/20 text-emerald-800 dark:text-emerald-200 px-1.5 py-0.2 text-[10px] font-bold">
                      {infoHacienda.tipoLabel}
                    </span>
                  </div>
                  <p className="text-muted-foreground dark:text-emerald-300/80">
                    Régimen: {infoHacienda.regimen?.descripcion || "General"} · Adm. Tributaria: {infoHacienda.situacion?.administracionTributaria || "Central"}
                  </p>
                </div>
              )}

              <div>
                <label className="mb-1 block font-medium text-muted-foreground">Razón Social o Nombre Completo *</label>
                <input
                  required
                  value={clientForm.name}
                  onChange={(e) => setClientForm({ ...clientForm, name: e.target.value })}
                  placeholder="Ej. Distribuidora del Valle S.A."
                  className="h-9 w-full rounded-lg border border-border bg-background px-3 text-xs focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20"
                />
              </div>

              <div>
                <label className="mb-1 block font-medium text-muted-foreground">Correo Electrónico de Facturación</label>
                <input
                  type="email"
                  value={clientForm.email}
                  onChange={(e) => setClientForm({ ...clientForm, email: e.target.value })}
                  placeholder="facturacion@empresa.cr"
                  className="h-9 w-full rounded-lg border border-border bg-background px-3 text-xs focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-medium text-muted-foreground flex items-center gap-1.5">
                    <Briefcase className="h-3.5 w-3.5 text-primary" />
                    Actividad Económica del Cliente (CIIU / CAECR)
                  </label>
                  <span className="text-[10px] text-muted-foreground">Opcional</span>
                </div>
                {infoHacienda?.actividades && infoHacienda.actividades.length > 0 ? (
                  <div className="space-y-1.5">
                    <select
                      value={clientForm.economicActivity}
                      onChange={(e) => setClientForm({ ...clientForm, economicActivity: e.target.value })}
                      className="h-9 w-full rounded-lg border border-border bg-background px-3 text-xs focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20"
                    >
                      <option value="">-- Sin actividad específica --</option>
                      {infoHacienda.actividades.map((act) => (
                        <option key={act.codigo} value={act.codigo}>
                          {act.codigo} - {act.descripcion} ({act.tipo === "P" ? "Principal" : "Secundaria"})
                        </option>
                      ))}
                    </select>
                    <input
                      value={clientForm.economicActivity}
                      onChange={(e) => setClientForm({ ...clientForm, economicActivity: e.target.value })}
                      placeholder="O digita otro código si aplica"
                      className="h-8 w-full rounded-lg border border-dashed border-border bg-background px-3 text-[11px] font-mono focus:border-ring focus:outline-none"
                    />
                  </div>
                ) : (
                  <input
                    value={clientForm.economicActivity}
                    onChange={(e) => setClientForm({ ...clientForm, economicActivity: e.target.value })}
                    placeholder="Ej. 620101 (se autocompleta con Consultar Hacienda)"
                    className="h-9 w-full rounded-lg border border-border bg-background px-3 text-xs font-mono focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20"
                  />
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block font-medium text-muted-foreground">Teléfono</label>
                  <input
                    value={clientForm.phone}
                    onChange={(e) => setClientForm({ ...clientForm, phone: e.target.value })}
                    placeholder="+506 2222-3344"
                    className="h-9 w-full rounded-lg border border-border bg-background px-3 text-xs focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20"
                  />
                </div>
                <div>
                  <label className="mb-1 block font-medium text-muted-foreground">Provincia</label>
                  <select
                    value={clientForm.city}
                    onChange={(e) => setClientForm({ ...clientForm, city: e.target.value })}
                    className="h-9 w-full rounded-lg border border-border bg-background px-2 text-xs focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20"
                  >
                    {["San José", "Alajuela", "Cartago", "Heredia", "Guanacaste", "Puntarenas", "Limón"].map((p) => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium hover:bg-muted"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90"
                >
                  <Check className="h-3.5 w-3.5" />
                  {editingClientId ? "Guardar Cambios" : "Guardar Cliente"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
