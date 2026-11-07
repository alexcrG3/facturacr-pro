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
  FileSpreadsheet,
  Download,
  Copy,
  Printer,
  ShieldAlert,
  Crown,
  Eye,
  RefreshCw,
} from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/common/PageHeader";
import { formatCRC, Client } from "@/lib/mock-data";
import { consultarContribuyenteHacienda, TaxpayerInfo } from "@/lib/taxpayer";
import { supabase } from "@/lib/supabase";
import { useApp } from "@/contexts/AppContext";

export interface SuperAdminClientReportItem {
  id: string;
  name: string;
  legalId: string;
  legalIdType: string;
  typeLabel: string;
  email: string;
  phone: string;
  province: string;
  canton: string;
  district: string;
  address: string;
  economicActivity: string;
  establishmentId: string;
  establishmentName: string;
  establishmentCode: string;
  invoicesCount: number;
  totalSpent: number;
  createdAt?: string;
}

export const Route = createFileRoute("/app/clients")({
  component: ClientsPage,
});

export function extractEstablishmentId(rawAddress?: string, clientLegalId?: string, defaultEstId?: string): string {
  const match = rawAddress?.match(/\[EST:([a-zA-Z0-9_-]+)\]/);
  if (match) return match[1];
  if (clientLegalId === "3102789012" || clientLegalId === "3101554433") {
    return "eb91927c-e729-4437-b5ed-a705b4055304"; // GRUPO G TRES
  }
  return defaultEstId || "eb91927c-e729-4437-b5ed-a705b4055304";
}

export function cleanClientAddress(addr?: string): string {
  if (!addr) return "";
  return addr.replace(/\s*\[EST:[a-zA-Z0-9_-]+\]/g, "").trim();
}

function ClientsPage() {
  const { activeEstablishment, establishments, user, authUser, isSuperAdmin, simulatedSession } = useApp();
  const [searchQuery, setSearchQuery] = useState("");
  const [clientsList, setClientsList] = useState<Client[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClientId, setEditingClientId] = useState<string | null>(null);

  // Control de Acceso Estricto SuperAdmin
  const isRealMasterSuperAdmin =
    authUser?.email?.toLowerCase().trim() === "alex@mail.com" ||
    user.role === "super_admin";

  const isSuperAdminUser = isSuperAdmin || (!simulatedSession && isRealMasterSuperAdmin);

  const isSimulatingAsRegularUser = Boolean(
    simulatedSession &&
    simulatedSession.simulatedUser.role !== "super_admin" &&
    isRealMasterSuperAdmin
  );

  // Estados del Reporte General de Clientes (Exclusivo SuperAdmin)
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [reportData, setReportData] = useState<SuperAdminClientReportItem[]>([]);
  const [isLoadingReport, setIsLoadingReport] = useState(false);
  const [reportSearch, setReportSearch] = useState("");
  const [reportCompanyFilter, setReportCompanyFilter] = useState<string>(() => activeEstablishment?.id || "all");
  const [reportTypeFilter, setReportTypeFilter] = useState<string>("all");

  useEffect(() => {
    if (activeEstablishment?.id) {
      setReportCompanyFilter(activeEstablishment.id);
    }
  }, [activeEstablishment?.id]);

  const handleOpenReport = () => {
    if (activeEstablishment?.id) {
      setReportCompanyFilter(activeEstablishment.id);
    }
    loadSuperAdminReportData();
    setIsReportModalOpen(true);
  };

  const loadSuperAdminReportData = async () => {
    setIsLoadingReport(true);
    try {
      // 1. Obtener todos los clientes registrados en la plataforma
      const { data: dbClients, error: errClients } = await supabase
        .from("clients")
        .select("*")
        .order("created_at", { ascending: false });

      if (errClients) console.error("Error cargando db clients:", errClients);

      // 2. Obtener facturas de todas las empresas para asociar montos y comprobantes
      const { data: allInvoices, error: errInvoices } = await supabase
        .from("invoices")
        .select("client_name, client_legal_id, total, establishment_id, issue_date, created_at");

      if (errInvoices) console.error("Error cargando all invoices:", errInvoices);

      const invoiceAggregates: Record<string, { total: number; count: number; name: string }> = {};
      (allInvoices || []).forEach((inv: any) => {
        const key = (inv.client_legal_id || inv.client_name || "").trim();
        if (!key || key === "Consumidor Final") return;
        const compKey = `${inv.establishment_id || "general"}__${key}`;
        if (!invoiceAggregates[compKey]) {
          invoiceAggregates[compKey] = {
            total: 0,
            count: 0,
            name: inv.client_name,
          };
        }
        invoiceAggregates[compKey].total += Number(inv.total) || 0;
        invoiceAggregates[compKey].count += 1;
      });

      const estMap = new Map<string, { name: string; code: string }>();
      establishments.forEach((e) => estMap.set(e.id, { name: e.name, code: e.code }));

      // Fallbacks garantizados para IDs de las empresas
      if (!estMap.has("eb91927c-e729-4437-b5ed-a705b4055304")) {
        estMap.set("eb91927c-e729-4437-b5ed-a705b4055304", {
          name: "GRUPO G TRES COMERCIALIZADORA INTERAMERICANA SOCIEDAD ANONIMA",
          code: "grupo_g_tres",
        });
      }
      if (!estMap.has("179a3381-8416-4205-8c03-91d5bebef210")) {
        estMap.set("179a3381-8416-4205-8c03-91d5bebef210", {
          name: "SRL. 3102832920",
          code: "luxx_car_wash",
        });
      }
      if (!estMap.has("1fde6110-df8f-47b6-b4ce-3202dcf4406f")) {
        estMap.set("1fde6110-df8f-47b6-b4ce-3202dcf4406f", {
          name: "Gas Express Distribuidora S.A.",
          code: "gas_express",
        });
      }
      if (!estMap.has("cc6bb57e-795b-4355-ba87-c20a26d3e278")) {
        estMap.set("cc6bb57e-795b-4355-ba87-c20a26d3e278", {
          name: "Empresa 107680742",
          code: "empresa_107680742_lsiz",
        });
      }

      const reportItems: SuperAdminClientReportItem[] = [];
      const seenCompositeKeys = new Set<string>();

      (dbClients || []).forEach((c: any) => {
        const estId = extractEstablishmentId(c.address, c.legal_id, "eb91927c-e729-4437-b5ed-a705b4055304");
        const estInfo = estMap.get(estId) || {
          name: "GRUPO G TRES COMERCIALIZADORA INTERAMERICANA SOCIEDAD ANONIMA",
          code: "grupo_g_tres",
        };
        const compKey = `${estId}__${c.legal_id}`;
        seenCompositeKeys.add(compKey);

        const agg = invoiceAggregates[compKey] || { total: 0, count: 0 };
        const cleanId = (c.legal_id || "").replace(/\D/g, "");
        const typeCode = c.legal_id_type || (cleanId.length === 10 ? "02" : "01");
        const typeLabel =
          typeCode === "02" || typeCode === "juridica"
            ? "Cédula Jurídica"
            : typeCode === "03" || typeCode === "dimex"
            ? "DIMEX"
            : typeCode === "04" || typeCode === "nite"
            ? "NITE"
            : "Cédula Física";

        const cleanAddr = cleanClientAddress(c.address);

        reportItems.push({
          id: c.id,
          name: c.name || "Sin nombre",
          legalId: c.legal_id || "",
          legalIdType: typeCode,
          typeLabel,
          email: c.email || "",
          phone: c.phone || "",
          province: c.province || c.city || c.district || "San José",
          canton: c.canton || "",
          district: c.district || "",
          address: cleanAddr,
          economicActivity: c.economic_activity || "",
          establishmentId: estId,
          establishmentName: estInfo.name,
          establishmentCode: estInfo.code,
          invoicesCount: agg.count || 0,
          totalSpent: agg.total || 0,
          createdAt: c.created_at,
        });
      });

      // Incluir clientes facturados que no estén en la tabla clients
      Object.entries(invoiceAggregates).forEach(([compKey, agg], idx) => {
        if (!seenCompositeKeys.has(compKey)) {
          const parts = compKey.split("__");
          const estId = parts[0] === "general" ? "eb91927c-e729-4437-b5ed-a705b4055304" : parts[0];
          const legalId = parts[1] || "";
          const estInfo = estMap.get(estId) || {
            name: "GRUPO G TRES COMERCIALIZADORA INTERAMERICANA SOCIEDAD ANONIMA",
            code: "grupo_g_tres",
          };
          const cleanId = legalId.replace(/\D/g, "");
          const typeCode = cleanId.length === 10 ? "02" : "01";

          reportItems.push({
            id: `inv-cl-rep-${idx}`,
            name: agg.name || "Cliente Facturado",
            legalId,
            legalIdType: typeCode,
            typeLabel: typeCode === "02" ? "Cédula Jurídica" : "Cédula Física",
            email: "",
            phone: "",
            province: "San José",
            canton: "",
            district: "",
            address: "",
            economicActivity: "",
            establishmentId: estId,
            establishmentName: estInfo.name,
            establishmentCode: estInfo.code,
            invoicesCount: agg.count,
            totalSpent: agg.total,
          });
        }
      });

      reportItems.sort((a, b) => b.totalSpent - a.totalSpent);
      setReportData(reportItems);
    } catch (err) {
      console.error("Error compilando reporte:", err);
      toast.error("Error al cargar datos del reporte general");
    } finally {
      setIsLoadingReport(false);
    }
  };

  const filteredReportData = useMemo(() => {
    return reportData.filter((item) => {
      if (reportCompanyFilter !== "all" && item.establishmentId !== reportCompanyFilter) {
        return false;
      }
      if (reportTypeFilter !== "all") {
        if (reportTypeFilter === "juridica" && item.legalIdType !== "02" && item.legalIdType !== "juridica") return false;
        if (reportTypeFilter === "fisica" && item.legalIdType !== "01" && item.legalIdType !== "fisica") return false;
        if (reportTypeFilter === "otros" && (item.legalIdType === "01" || item.legalIdType === "02" || item.legalIdType === "fisica" || item.legalIdType === "juridica")) return false;
      }
      if (!reportSearch.trim()) return true;
      const q = reportSearch.toLowerCase().trim();
      return (
        item.name.toLowerCase().includes(q) ||
        item.legalId.toLowerCase().includes(q) ||
        item.email.toLowerCase().includes(q) ||
        item.phone.toLowerCase().includes(q) ||
        item.province.toLowerCase().includes(q) ||
        item.economicActivity.toLowerCase().includes(q) ||
        item.establishmentName.toLowerCase().includes(q)
      );
    });
  }, [reportData, reportCompanyFilter, reportTypeFilter, reportSearch]);

  const reportStats = useMemo(() => {
    const total = filteredReportData.length;
    const juridicas = filteredReportData.filter((c) => c.legalIdType === "02" || c.legalIdType === "juridica").length;
    const fisicas = filteredReportData.filter((c) => c.legalIdType === "01" || c.legalIdType === "fisica").length;
    const totalSpent = filteredReportData.reduce((acc, c) => acc + (c.totalSpent || 0), 0);
    const totalInvoices = filteredReportData.reduce((acc, c) => acc + (c.invoicesCount || 0), 0);
    const withEmail = filteredReportData.filter((c) => Boolean(c.email)).length;
    const withPhone = filteredReportData.filter((c) => Boolean(c.phone)).length;
    return { total, juridicas, fisicas, totalSpent, totalInvoices, withEmail, withPhone };
  }, [filteredReportData]);

  const exportToCSV = () => {
    if (filteredReportData.length === 0) {
      toast.error("No hay registros para exportar");
      return;
    }
    const headers = [
      "ID Registro",
      "Razón Social / Nombre",
      "Tipo Identificación",
      "Número de Cédula",
      "Correo Electrónico",
      "Teléfono",
      "Provincia",
      "Cantón",
      "Distrito",
      "Dirección",
      "Actividad Económica",
      "Empresa / Establecimiento",
      "Código Empresa",
      "Total Facturas",
      "Total Facturado CRC (₡)",
      "Fecha Registro",
    ];

    const escapeCSV = (val: any) => {
      if (val === null || val === undefined) return '""';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    const rows = filteredReportData.map((c) => [
      escapeCSV(c.id),
      escapeCSV(c.name),
      escapeCSV(c.typeLabel),
      escapeCSV(c.legalId),
      escapeCSV(c.email),
      escapeCSV(c.phone),
      escapeCSV(c.province),
      escapeCSV(c.canton),
      escapeCSV(c.district),
      escapeCSV(c.address),
      escapeCSV(c.economicActivity),
      escapeCSV(c.establishmentName),
      escapeCSV(c.establishmentCode),
      escapeCSV(c.invoicesCount),
      escapeCSV(c.totalSpent),
      escapeCSV(c.createdAt || ""),
    ]);

    const csvContent = "\uFEFF" + [headers.join(";"), ...rows.map((r) => r.join(";"))].join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const dateStr = new Date().toISOString().slice(0, 10);
    a.href = url;
    const currentEstCode = reportCompanyFilter === "all" ? "Todas_Empresas" : (establishments.find((e) => e.id === reportCompanyFilter)?.code || activeEstablishment?.code || "Empresa");
    a.setAttribute("download", `Reporte_Clientes_${currentEstCode}_${dateStr}.csv`);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Reporte descargado correctamente en formato Excel / CSV");
  };

  const copyReportToClipboard = () => {
    if (filteredReportData.length === 0) {
      toast.error("No hay datos para copiar");
      return;
    }
    const headers = [
      "Razón Social",
      "Tipo",
      "Cédula",
      "Correo",
      "Teléfono",
      "Provincia",
      "Actividad Económica",
      "Empresa FacturaOS",
      "Facturas",
      "Total Facturado CRC",
    ];
    const rows = filteredReportData.map((c) => [
      c.name,
      c.typeLabel,
      c.legalId,
      c.email,
      c.phone,
      c.province,
      c.economicActivity,
      c.establishmentName,
      c.invoicesCount,
      c.totalSpent,
    ]);
    const tsv = [headers.join("\t"), ...rows.map((r) => r.join("\t"))].join("\n");
    navigator.clipboard.writeText(tsv);
    toast.success("¡Datos copiados al portapapeles! Listo para pegar en Excel o Google Sheets");
  };

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

      // 2. Clientes de la base de datos aislados estrictamente por establecimiento
      const { data: dbClients, error } = await supabase
        .from("clients")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Filtrar estrictamente: solo clientes que pertenezcan a este establecimiento
      const estLegalIds = Object.keys(clientTotals);
      const filteredDbClients = (dbClients || []).filter((c: any) => {
        const estId = extractEstablishmentId(c.address, c.legal_id, activeEstablishment.id);
        return estId === activeEstablishment.id || estLegalIds.includes(c.legal_id);
      });

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
            district: "San José",
            address: "",
          });
        }
      });

      const mapped: Client[] = filteredDbClients.map((row: any) => {
        const stats = clientTotals[row.legal_id] || clientTotals[row.name] || { total: 0, count: 0 };
        const cleanLocation = cleanClientAddress(row.district || row.canton || row.address || "San José");
        return {
          id: row.id,
          name: row.name,
          type: (row.legal_id_type === "02" || row.legal_id_type === "juridica") ? "juridica" : "fisica",
          legalId: row.legal_id,
          email: row.email || "",
          phone: row.phone || "",
          city: cleanLocation,
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
      city: cleanClientAddress(c.city || "San José"),
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
    const estTag = activeEstablishment?.id || "eb91927c-e729-4437-b5ed-a705b4055304";
    const cleanCity = cleanClientAddress(clientForm.city || "San José");
    const addressWithTag = `${cleanCity} [EST:${estTag}]`;

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
          district: cleanCity,
          province: cleanCity,
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
          address: addressWithTag,
          district: cleanCity,
          province: cleanCity,
          economic_activity: clientForm.economicActivity.trim() || null,
        })
        .select()
        .single();

      if (error) {
        toast.error("Error al registrar cliente: " + error.message);
        return;
      }
      const newClient: Client = {
        id: data.id,
        name: data.name,
        type: clientForm.type,
        legalId: data.legal_id,
        email: data.email || "",
        phone: data.phone || "",
        city: cleanCity,
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
    <div className="mx-auto max-w-7xl space-y-6 w-full min-w-0 overflow-x-clip">
      <PageHeader
        title="Clientes"
        description={`${clientsList.length} clientes registrados listos para facturar`}
        actions={
          <div className="flex flex-wrap items-center gap-2 w-full min-w-0">
            {/* Botón de Reporte de Clientes - EXCLUSIVO SUPERADMIN */}
            {isSuperAdminUser && (
              <button
                type="button"
                onClick={handleOpenReport}
                className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-purple-500/40 bg-purple-500/10 px-3 py-2 text-xs font-semibold text-purple-700 hover:bg-purple-500/20 dark:text-purple-300 dark:border-purple-500/30 transition-all shadow-xs cursor-pointer whitespace-nowrap"
                title={`Generar reporte completo de los clientes de ${activeEstablishment?.name || "esta empresa"}`}
              >
                <FileSpreadsheet className="h-4 w-4 text-purple-600 dark:text-purple-400 shrink-0" />
                <span>Reporte Clientes</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleOpenCreate}
              className="ml-auto inline-flex items-center justify-center gap-1.5 rounded-lg bg-primary px-3.5 py-2 text-xs font-medium text-primary-foreground hover:shadow-glow transition-all whitespace-nowrap cursor-pointer"
            >
              <Plus className="h-4 w-4 shrink-0" /> Nuevo cliente
            </button>
          </div>
        }
      />

      {/* Notificación explicativa cuando el SuperAdmin está simulando un rol regular que no tiene acceso al reporte */}
      {isSimulatingAsRegularUser && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-xs text-amber-900 dark:text-amber-200 flex flex-wrap items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-2.5">
            <ShieldAlert className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
            <div>
              <p className="font-semibold">
                Simulación de Inquilino Activa ({simulatedSession?.simulatedUser.name} · {simulatedSession?.simulatedUser.role?.toUpperCase()})
              </p>
              <p className="text-[11px] text-amber-800/80 dark:text-amber-300/80">
                El botón <strong>"Reporte de Clientes"</strong> está estrictamente <strong>oculto</strong> para este usuario según la política de seguridad multi-empresa.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleOpenReport}
            className="inline-flex items-center gap-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white px-3 py-1.5 text-xs font-semibold shadow-xs transition-colors"
          >
            <Crown className="h-3.5 w-3.5" /> Abrir Reporte como SuperAdmin
          </button>
        </div>
      )}

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
          <div key={c.id}
            className="group rounded-xl border border-border bg-card p-3.5 shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-elevated flex flex-col justify-between min-w-0 w-full overflow-hidden"
          >
            <div>
              <div className="flex items-start justify-between gap-2.5">
                <div className="flex items-start gap-2.5 min-w-0 flex-1">
                  <div
                    className={`grid h-10 w-10 sm:h-11 sm:w-11 shrink-0 place-items-center rounded-lg text-sm font-semibold ${
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
                      <h3 className="truncate font-semibold text-foreground text-sm sm:text-base">{c.name}</h3>
                    </div>
                    <p className="text-xs text-muted-foreground font-mono truncate">
                      {c.type === "juridica" ? "Cédula jurídica" : "Cédula física"} · {c.legalId}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleOpenEdit(c)}
                    className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-primary transition-colors cursor-pointer"
                    title="Editar cliente"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteClient(c.id, c.name)}
                    className="rounded-lg p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors cursor-pointer"
                    title="Eliminar cliente"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <dl className="mt-3 sm:mt-4 space-y-1.5 text-xs text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Mail className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <span className="truncate">{c.email}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <span className="truncate">{c.phone}</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <span className="truncate">{c.city}</span>
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

            <div className="mt-3 pt-3 border-t border-border space-y-2.5">
              <div className="flex items-end justify-between gap-2 min-w-0">
                <div className="min-w-0 flex-1 overflow-hidden">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    Total facturado
                  </p>
                  <p className="text-sm font-semibold tabular-nums text-foreground truncate">{formatCRC(c.totalSpent)}</p>
                </div>
                <span className="rounded-md bg-muted px-2 py-0.5 text-xs font-medium shrink-0 whitespace-nowrap">
                  {c.invoices} fact.
                </span>
              </div>

              <Link
                to="/app/invoices/new"
                search={{ clientId: c.id } as any}
                className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg border border-primary/30 bg-primary/10 py-1.5 text-xs font-semibold text-primary hover:bg-primary/20 transition-colors cursor-pointer"
              >
                <FileText className="h-3.5 w-3.5 shrink-0" /> Facturar a este cliente
              </Link>
            </div>
          </div>
        ))}
      </div>

      {/* Modal Registrar / Editar Cliente */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3 sm:p-4 backdrop-blur-xs">
          <div className="w-full max-w-md max-h-[92vh] overflow-y-auto rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-2xl space-y-4">
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

      {/* Modal Reporte General de Clientes (Consolidado SuperAdmin) */}
      {isReportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-2 sm:p-6 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="flex h-full max-h-[94vh] w-full max-w-7xl flex-col rounded-2xl border border-border bg-card shadow-2xl overflow-hidden min-w-0">
            {/* Encabezado del Reporte */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border bg-muted/30 p-3 sm:px-6 sm:py-4">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="grid h-9 w-9 sm:h-11 sm:w-11 place-items-center rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 shrink-0">
                  <FileSpreadsheet className="h-5 w-5 sm:h-6 sm:w-6" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-sm sm:text-lg font-bold text-foreground truncate">
                      Reporte de Clientes {activeEstablishment ? `· ${activeEstablishment.name}` : ""}
                    </h2>
                    <span className="inline-flex items-center gap-1 rounded-md bg-purple-600/15 px-2 py-0.5 text-[10px] sm:text-xs font-semibold text-purple-700 dark:text-purple-300 shrink-0">
                      <Crown className="h-3 w-3 text-amber-500" /> SuperAdmin
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground truncate">
                    {reportCompanyFilter === "all"
                      ? "Directorio integral consolidado en todas las empresas"
                      : `Clientes en ${establishments.find((e) => e.id === reportCompanyFilter)?.name || activeEstablishment?.name || "esta empresa"}`}
                  </p>
                </div>
              </div>

              {/* Botones de acción del reporte */}
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar max-w-full pb-0.5">
                <button
                  type="button"
                  onClick={exportToCSV}
                  disabled={isLoadingReport || filteredReportData.length === 0}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 transition-colors shadow-xs disabled:opacity-50 whitespace-nowrap"
                  title="Descargar archivo Excel / CSV con formato UTF-8"
                >
                  <Download className="h-3.5 w-3.5" /> Exportar a Excel
                </button>

                <button
                  type="button"
                  onClick={copyReportToClipboard}
                  disabled={isLoadingReport || filteredReportData.length === 0}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs font-semibold text-foreground hover:bg-muted transition-colors shadow-xs disabled:opacity-50 whitespace-nowrap"
                  title="Copiar datos tabulados al portapapeles para pegar en hojas de cálculo"
                >
                  <Copy className="h-3.5 w-3.5" /> Copiar Tabla
                </button>

                <button
                  type="button"
                  onClick={() => window.print()}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs font-semibold text-foreground hover:bg-muted transition-colors shadow-xs whitespace-nowrap"
                  title="Imprimir reporte"
                >
                  <Printer className="h-3.5 w-3.5" /> Imprimir
                </button>

                <button
                  type="button"
                  onClick={loadSuperAdminReportData}
                  disabled={isLoadingReport}
                  className="rounded-lg border border-border p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors shrink-0"
                  title="Recargar datos"
                >
                  <RefreshCw className={`h-4 w-4 ${isLoadingReport ? "animate-spin" : ""}`} />
                </button>

                <button
                  type="button"
                  onClick={() => setIsReportModalOpen(false)}
                  className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors ml-1 shrink-0"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Tarjetas KPI de Resumen (Compactas en móvil) */}
            <div className="grid grid-cols-2 gap-2 border-b border-border bg-muted/10 p-2.5 sm:p-4 sm:grid-cols-4">
              <div className="rounded-xl border border-border bg-card p-2 sm:p-3 shadow-2xs">
                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider truncate">
                  Total Clientes
                </p>
                <p className="text-base sm:text-xl font-bold text-foreground mt-0.5">
                  {reportStats.total.toLocaleString()}
                </p>
              </div>

              <div className="rounded-xl border border-border bg-card p-2 sm:p-3 shadow-2xs">
                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider truncate">
                  Cédulas
                </p>
                <p className="text-xs sm:text-base font-bold text-foreground mt-0.5">
                  {reportStats.juridicas} <span className="text-[10px] font-normal text-muted-foreground">CJ</span> · {reportStats.fisicas} <span className="text-[10px] font-normal text-muted-foreground">CF</span>
                </p>
              </div>

              <div className="rounded-xl border border-border bg-card p-2 sm:p-3 shadow-2xs">
                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider truncate">
                  Total Facturado
                </p>
                <p className="text-sm sm:text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-0.5 font-mono truncate">
                  {formatCRC(reportStats.totalSpent)}
                </p>
              </div>

              <div className="rounded-xl border border-border bg-card p-2 sm:p-3 shadow-2xs">
                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider truncate">
                  Con Contacto
                </p>
                <p className="text-xs sm:text-base font-bold text-foreground mt-0.5">
                  {reportStats.withEmail} <span className="text-[10px] font-normal text-muted-foreground">email</span> · {reportStats.withPhone} <span className="text-[10px] font-normal text-muted-foreground">tel</span>
                </p>
              </div>
            </div>

            {/* Barra de Filtros y Búsqueda */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 border-b border-border p-3 sm:p-4 bg-card min-w-0">
              <div className="relative w-full flex-1 min-w-0">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={reportSearch}
                  onChange={(e) => setReportSearch(e.target.value)}
                  placeholder="Buscar por cédula, razón social, correo, teléfono..."
                  className="h-9 w-full rounded-lg border border-border bg-background pl-9 pr-3 text-xs focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20"
                />
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 text-xs w-full sm:w-auto min-w-0">
                {/* Filtro por Empresa */}
                <div className="flex items-center gap-1.5 flex-1 sm:flex-initial min-w-0">
                  <span className="text-muted-foreground font-medium shrink-0">Empresa:</span>
                  <select
                    value={reportCompanyFilter}
                    onChange={(e) => setReportCompanyFilter(e.target.value)}
                    className="h-9 w-full sm:max-w-[220px] rounded-lg border border-border bg-background px-2.5 text-xs focus:border-ring focus:outline-none font-medium truncate"
                  >
                    {activeEstablishment && (
                      <option value={activeEstablishment.id}>
                        📍 {activeEstablishment.name} (Empresa Actual)
                      </option>
                    )}
                    {establishments
                      .filter((est) => est.id !== activeEstablishment?.id)
                      .map((est) => (
                        <option key={est.id} value={est.id}>
                          {est.name} ({est.code})
                        </option>
                      ))}
                    <option value="all">🌐 Ver Todas las Empresas Juntas (Consolidado)</option>
                  </select>
                </div>

                {/* Filtro por Tipo de Cédula */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="text-muted-foreground font-medium shrink-0">Tipo:</span>
                  <select
                    value={reportTypeFilter}
                    onChange={(e) => setReportTypeFilter(e.target.value)}
                    className="h-9 rounded-lg border border-border bg-background px-2 text-xs focus:border-ring focus:outline-none"
                  >
                    <option value="all">Todos los tipos</option>
                    <option value="juridica">Solo Cédula Jurídica</option>
                    <option value="fisica">Solo Cédula Física</option>
                    <option value="otros">DIMEX / NITE / Otros</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Tabla Detallada con Scroll */}
            <div className="flex-1 overflow-auto">
              {isLoadingReport ? (
                <div className="flex h-64 flex-col items-center justify-center gap-2">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <p className="text-xs text-muted-foreground">Compilando reporte general de clientes...</p>
                </div>
              ) : filteredReportData.length === 0 ? (
                <div className="flex h-64 flex-col items-center justify-center gap-2 text-muted-foreground">
                  <AlertCircle className="h-8 w-8 text-muted-foreground/60" />
                  <p className="text-sm font-medium">No se encontraron clientes con los filtros aplicados</p>
                  <button
                    type="button"
                    onClick={() => {
                      setReportSearch("");
                      setReportCompanyFilter("all");
                      setReportTypeFilter("all");
                    }}
                    className="text-xs text-primary hover:underline"
                  >
                    Limpiar filtros
                  </button>
                </div>
              ) : (
                <>
                  {/* ─── VISTA MÓVIL (CARDS) ─── */}
                  <div className="md:hidden divide-y divide-border">
                    {filteredReportData.map((item, idx) => (
                      <div key={item.id} className="p-3.5 space-y-2 text-xs">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <span className="text-[10px] text-muted-foreground font-mono">#{idx + 1}</span>
                            <h4 className="font-bold text-foreground text-sm truncate">{item.name}</h4>
                            <p className="text-[11px] font-mono text-muted-foreground">{item.legalId} · {item.typeLabel}</p>
                          </div>
                          <div className="text-right shrink-0">
                            <span className="text-[10px] text-muted-foreground block">FACTURADO</span>
                            <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                              {formatCRC(item.totalSpent)}
                            </span>
                            <span className="text-[10px] text-muted-foreground block">({item.invoicesCount} facturas)</span>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                          <span className="inline-flex items-center gap-1 rounded bg-purple-500/10 text-purple-700 dark:text-purple-300 px-1.5 py-0.5 font-medium truncate max-w-[200px]">
                            <Building2 className="h-3 w-3 shrink-0" />
                            {item.establishmentName}
                          </span>
                          {item.email && (
                            <span className="flex items-center gap-1 truncate max-w-[180px]">
                              <Mail className="h-3 w-3 shrink-0" /> {item.email}
                            </span>
                          )}
                          {item.phone && (
                            <span className="flex items-center gap-1 font-mono">
                              <Phone className="h-3 w-3 shrink-0" /> {item.phone}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* ─── VISTA DESKTOP (TABLA) ─── */}
                  <div className="hidden md:block">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="sticky top-0 z-10 border-b border-border bg-muted/90 backdrop-blur-xs font-semibold text-muted-foreground uppercase text-[10px] tracking-wider">
                        <tr>
                          <th className="py-2.5 px-3 w-10 text-center">#</th>
                          <th className="py-2.5 px-3 min-w-[200px]">Razón Social / Nombre</th>
                          <th className="py-2.5 px-3 min-w-[130px]">Identificación</th>
                          <th className="py-2.5 px-3 min-w-[180px]">Correo Electrónico</th>
                          <th className="py-2.5 px-3 min-w-[120px]">Teléfono</th>
                          <th className="py-2.5 px-3 min-w-[140px]">Ubicación</th>
                          <th className="py-2.5 px-3 min-w-[120px]">Actividad Económica</th>
                          <th className="py-2.5 px-3 min-w-[150px]">Empresa Emisora</th>
                          <th className="py-2.5 px-3 text-center min-w-[80px]">Facturas</th>
                          <th className="py-2.5 px-3 text-right min-w-[110px]">Total Facturado</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {filteredReportData.map((item, idx) => (
                          <tr
                            key={item.id}
                            className="hover:bg-muted/40 transition-colors group"
                          >
                            <td className="py-2.5 px-3 text-center text-muted-foreground font-mono text-[11px]">
                              {idx + 1}
                            </td>
                            <td className="py-2.5 px-3">
                              <div className="font-semibold text-foreground group-hover:text-primary transition-colors">
                                {item.name}
                              </div>
                              {item.address && (
                                <div className="text-[10px] text-muted-foreground line-clamp-1" title={item.address}>
                                  {item.address}
                                </div>
                              )}
                            </td>
                            <td className="py-2.5 px-3">
                              <span className="font-mono text-[11px] font-medium text-foreground">
                                {item.legalId}
                              </span>
                              <div className="text-[10px] text-muted-foreground">
                                {item.typeLabel}
                              </div>
                            </td>
                            <td className="py-2.5 px-3">
                              {item.email ? (
                                <a
                                  href={`mailto:${item.email}`}
                                  className="text-primary hover:underline flex items-center gap-1 truncate max-w-[200px]"
                                  title={item.email}
                                >
                                  <Mail className="h-3 w-3 shrink-0" />
                                  <span className="truncate">{item.email}</span>
                                </a>
                              ) : (
                                <span className="text-muted-foreground/50 italic text-[11px]">Sin correo</span>
                              )}
                            </td>
                            <td className="py-2.5 px-3">
                              {item.phone ? (
                                <a
                                  href={`tel:${item.phone}`}
                                  className="text-foreground hover:text-primary flex items-center gap-1 font-mono text-[11px]"
                                >
                                  <Phone className="h-3 w-3 shrink-0 text-muted-foreground" />
                                  <span>{item.phone}</span>
                                </a>
                              ) : (
                                <span className="text-muted-foreground/50 italic text-[11px]">Sin teléfono</span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-muted-foreground">
                              <div className="flex items-center gap-1">
                                <MapPin className="h-3 w-3 shrink-0 text-muted-foreground/70" />
                                <span className="font-medium text-foreground text-[11px]">
                                  {item.province || "San José"}
                                </span>
                              </div>
                              {(item.canton || item.district) && (
                                <div className="text-[10px] text-muted-foreground">
                                  {[item.canton, item.district].filter(Boolean).join(", ")}
                                </div>
                              )}
                            </td>
                            <td className="py-2.5 px-3">
                              {item.economicActivity ? (
                                <span className="inline-flex items-center gap-1 font-mono text-[11px] font-medium text-emerald-700 bg-emerald-500/10 dark:text-emerald-300 px-1.5 py-0.5 rounded">
                                  <Briefcase className="h-3 w-3" />
                                  {item.economicActivity}
                                </span>
                              ) : (
                                <span className="text-muted-foreground/50 italic text-[11px]">N/D</span>
                              )}
                            </td>
                            <td className="py-2.5 px-3">
                              <span className="inline-flex items-center gap-1 font-medium text-purple-700 dark:text-purple-300 bg-purple-500/10 px-2 py-0.5 rounded text-[11px]">
                                <Building2 className="h-3 w-3 shrink-0" />
                                <span className="truncate max-w-[150px]" title={item.establishmentName}>
                                  {item.establishmentName}
                                </span>
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-center font-mono text-[11px]">
                              <span className="rounded-md bg-muted px-2 py-0.5 font-semibold">
                                {item.invoicesCount}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono font-semibold text-foreground tabular-nums">
                              {formatCRC(item.totalSpent)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>

            {/* Pie del Reporte */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border bg-muted/20 px-6 py-3 text-xs text-muted-foreground">
              <div>
                Mostrando <strong className="text-foreground">{filteredReportData.length}</strong> de <strong className="text-foreground">{reportData.length}</strong> clientes registrados en el sistema FacturaOS.
              </div>
              <div className="flex items-center gap-4">
                <span>
                  Suma total: <strong className="text-foreground font-mono">{formatCRC(reportStats.totalSpent)}</strong>
                </span>
                <button
                  type="button"
                  onClick={() => setIsReportModalOpen(false)}
                  className="rounded-lg bg-primary px-4 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
