import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useMemo } from "react";
import {
  WalletCards,
  CalendarClock,
  Calendar,
  ArrowUpRight,
  ArrowDownLeft,
  MessageCircle,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  AlertTriangle,
  DollarSign,
  Building2,
  User,
  CreditCard,
  ChevronRight,
  CalendarDays,
  TrendingUp,
  TrendingDown,
  Edit2,
  Trash2,
  X,
  Check,
  Share2,
  FileText,
  Receipt,
  History,
  Sparkles,
  Phone,
  Send,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/common/PageHeader";
import { useApp } from "@/contexts/AppContext";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/app/tesoreria")({
  component: TesoreriaPage,
});

// Estructura de Abono / Pago Parcial
export interface PaymentRecord {
  id: string;
  date: string;
  amount: number;
  method: string;
  reference: string;
  notes?: string;
  registered_at: string;
}

// Estructura de Cuenta por Cobrar (CxC)
export interface ReceivableItem {
  id: string;
  invoice_id?: string;
  consecutive_number: string;
  doc_type: "FE" | "TE";
  issue_date: string;
  client_name: string;
  client_legal_id?: string;
  client_phone?: string;
  client_email?: string;
  currency: "CRC" | "USD";
  total_amount: number;
  credit_term_days: number; // Plazo en días (editable manualmente)
  due_date: string; // Calculada: issue_date + credit_term_days
  payments: PaymentRecord[];
  notes?: string;
}

// Estructura de Cuenta por Pagar (CxP)
export interface PayableItem {
  id: string;
  supplier_name: string;
  supplier_legal_id: string;
  supplier_phone?: string;
  invoice_number: string;
  issue_date: string;
  category: string;
  currency: "CRC" | "USD";
  total_amount: number;
  credit_term_days: number;
  due_date: string;
  payments: PaymentRecord[];
  notes?: string;
}

type WeekCategory = "all" | "overdue" | "this_week" | "next_week" | "week_2" | "future" | "paid";

export function TesoreriaPage() {
  const { activeEstablishment } = useApp();

  // Pestaña principal: "cxc" | "cxp" | "flujo"
  const [activeTab, setActiveTab] = useState<"cxc" | "cxp" | "flujo">("cxc");

  // Filtro de vencimiento semana a semana
  const [selectedWeekFilter, setSelectedWeekFilter] = useState<WeekCategory>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "partial" | "paid">("all");

  // Datos
  const [receivables, setReceivables] = useState<ReceivableItem[]>([]);
  const [payables, setPayables] = useState<PayableItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modales
  const [isNewPayableModalOpen, setIsNewPayableModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [activeItemForPayment, setActiveItemForPayment] = useState<{
    item: ReceivableItem | PayableItem;
    type: "cxc" | "cxp";
  } | null>(null);

  const [isTermModalOpen, setIsTermModalOpen] = useState(false);
  const [activeItemForTerm, setActiveItemForTerm] = useState<{
    item: ReceivableItem | PayableItem;
    type: "cxc" | "cxp";
  } | null>(null);

  const [isWhatsAppModalOpen, setIsWhatsAppModalOpen] = useState(false);
  const [activeItemForWhatsApp, setActiveItemForWhatsApp] = useState<ReceivableItem | null>(null);

  // Formulario Nuevo Abono
  const [paymentForm, setPaymentForm] = useState({
    amount: 0,
    date: new Date().toISOString().slice(0, 10),
    method: "SINPE Móvil",
    reference: "",
    notes: "",
  });

  // Formulario Editar Plazo en Días
  const [termForm, setTermForm] = useState({
    days: 30,
    customDueDate: "",
  });

  // Formulario Nueva CxP (Gasto / Factura de Proveedor)
  const [newPayableForm, setNewPayableForm] = useState({
    supplier_name: "",
    supplier_legal_id: "",
    supplier_phone: "",
    invoice_number: "",
    issue_date: new Date().toISOString().slice(0, 10),
    category: "Mercadería e Insumos",
    currency: "CRC" as "CRC" | "USD",
    total_amount: 0,
    credit_term_days: 30,
    notes: "",
  });

  // Helper para sumar días a una fecha
  const addDaysToDate = (dateStr: string, days: number): string => {
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      d.setDate(d.getDate() + Number(days));
      return d.toISOString().slice(0, 10);
    } catch {
      return dateStr;
    }
  };

  // Helper para calcular diferencia de días con respecto a hoy
  const getDaysDiff = (dueDateStr: string): number => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const due = new Date(dueDateStr);
      due.setHours(0, 0, 0, 0);
      const diffTime = due.getTime() - today.getTime();
      return Math.round(diffTime / (1000 * 60 * 60 * 24));
    } catch {
      return 0;
    }
  };

  // Clasificar una fecha en su categoría de semana
  const getWeekCategory = (dueDateStr: string, isFullyPaid: boolean): WeekCategory => {
    if (isFullyPaid) return "paid";
    const diff = getDaysDiff(dueDateStr);
    if (diff < 0) return "overdue";
    if (diff <= 7) return "this_week";
    if (diff <= 14) return "next_week";
    if (diff <= 21) return "week_2";
    return "future";
  };

  // Cargar Cuentas por Cobrar y por Pagar
  useEffect(() => {
    if (!activeEstablishment?.id) return;

    const loadData = async () => {
      setIsLoading(true);
      try {
        const estId = activeEstablishment.id;

        // 1. Cargar configuración guardada de CxC (plazos personalizados y abonos)
        const savedCxcOverridesRaw = localStorage.getItem(`facturaos_cxc_overrides_${estId}`);
        const cxcOverrides: Record<string, { credit_term_days?: number; due_date?: string; payments?: PaymentRecord[] }> = savedCxcOverridesRaw
          ? JSON.parse(savedCxcOverridesRaw)
          : {};

        // 2. Cargar Facturas desde Supabase
        const { data: dbInvoices } = await supabase
          .from("invoices")
          .select("*")
          .eq("establishment_id", estId)
          .order("issue_date", { ascending: false });

        let cxcList: ReceivableItem[] = [];

        if (dbInvoices && dbInvoices.length > 0) {
          cxcList = dbInvoices.map((inv: any) => {
            const override = cxcOverrides[inv.id] || {};
            const consec = inv.consecutive_number || "";
            const isTicket = consec.includes("TE-") || consec.substring(8, 10) === "04";
            const termDays = override.credit_term_days ?? (Number(inv.credit_term) || (inv.sale_condition === "02" ? 30 : 15));
            const issueDate = inv.issue_date ? inv.issue_date.slice(0, 10) : new Date().toISOString().slice(0, 10);
            const dueDate = override.due_date || addDaysToDate(issueDate, termDays);

            return {
              id: inv.id,
              invoice_id: inv.id,
              consecutive_number: consec || "FE-0001",
              doc_type: isTicket ? "TE" : "FE",
              issue_date: issueDate,
              client_name: inv.client_name || "Cliente General",
              client_legal_id: inv.client_legal_id || "",
              client_phone: inv.client_phone || "",
              client_email: inv.client_email || "",
              currency: (inv.currency as "CRC" | "USD") || "CRC",
              total_amount: Number(inv.total) || 0,
              credit_term_days: termDays,
              due_date: dueDate,
              payments: override.payments || [],
            };
          });
        }

        // Si no hay facturas o son pocas, crear datos demostrativos para que el cliente visualice de inmediato
        if (cxcList.length === 0) {
          const sampleCxC: ReceivableItem[] = [
            {
              id: "demo-cxc-1",
              consecutive_number: "00100001010000000124",
              doc_type: "FE",
              issue_date: addDaysToDate(new Date().toISOString().slice(0, 10), -20),
              client_name: "Transportes Interamericanos del Valle S.A.",
              client_legal_id: "3-101-554433",
              client_phone: "8888-2233",
              currency: "CRC",
              total_amount: 385000,
              credit_term_days: 15, // Vencida hace 5 días
              due_date: addDaysToDate(new Date().toISOString().slice(0, 10), -5),
              payments: [{ id: "p1", date: addDaysToDate(new Date().toISOString().slice(0, 10), -10), amount: 100000, method: "SINPE Móvil", reference: "SINPE-9988", registered_at: new Date().toISOString() }],
            },
            {
              id: "demo-cxc-2",
              consecutive_number: "00100001010000000125",
              doc_type: "FE",
              issue_date: addDaysToDate(new Date().toISOString().slice(0, 10), -10),
              client_name: "Corporación Automotriz del Este",
              client_legal_id: "3-102-778899",
              client_phone: "8777-1122",
              currency: "CRC",
              total_amount: 540000,
              credit_term_days: 14, // Vence esta semana (en 4 días)
              due_date: addDaysToDate(new Date().toISOString().slice(0, 10), 4),
              payments: [],
            },
            {
              id: "demo-cxc-3",
              consecutive_number: "00100001010000000126",
              doc_type: "FE",
              issue_date: addDaysToDate(new Date().toISOString().slice(0, 10), -5),
              client_name: "Servicios Logísticos San José",
              client_legal_id: "3-101-992211",
              client_phone: "7011-3344",
              currency: "CRC",
              total_amount: 225000,
              credit_term_days: 15, // Vence próxima semana (en 10 días)
              due_date: addDaysToDate(new Date().toISOString().slice(0, 10), 10),
              payments: [],
            },
          ];
          cxcList = sampleCxC;
        }

        setReceivables(cxcList);

        // 3. Cargar Cuentas por Pagar (CxP)
        const savedCxpRaw = localStorage.getItem(`facturaos_cxp_items_${estId}`);
        let cxpList: PayableItem[] = savedCxpRaw ? JSON.parse(savedCxpRaw) : [];

        if (cxpList.length === 0) {
          cxpList = [
            {
              id: "demo-cxp-1",
              supplier_name: "Distribuidora de Lubricantes y Repuestos S.A.",
              supplier_legal_id: "3-101-112233",
              supplier_phone: "2233-4455",
              invoice_number: "FAC-99201",
              issue_date: addDaysToDate(new Date().toISOString().slice(0, 10), -15),
              category: "Insumos y Mercadería",
              currency: "CRC",
              total_amount: 195000,
              credit_term_days: 30, // Vence en 15 días (Semana +2)
              due_date: addDaysToDate(new Date().toISOString().slice(0, 10), 15),
              payments: [],
            },
            {
              id: "demo-cxp-2",
              supplier_name: "Servicios Eléctricos y Mantenimiento Pro",
              supplier_legal_id: "3-102-445566",
              supplier_phone: "2288-9900",
              invoice_number: "FAC-4412",
              issue_date: addDaysToDate(new Date().toISOString().slice(0, 10), -25),
              category: "Servicios Públicos y Mantenimiento",
              currency: "CRC",
              total_amount: 85000,
              credit_term_days: 30, // Vence en 5 días (Esta semana)
              due_date: addDaysToDate(new Date().toISOString().slice(0, 10), 5),
              payments: [],
            },
          ];
          localStorage.setItem(`facturaos_cxp_items_${estId}`, JSON.stringify(cxpList));
        }

        setPayables(cxpList);
      } catch (err) {
        console.error("Error cargando datos de tesorería:", err);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [activeEstablishment?.id]);

  // Persistir cambios de CxC en localStorage
  const saveCxcOverride = (item: ReceivableItem) => {
    if (!activeEstablishment?.id) return;
    try {
      const estId = activeEstablishment.id;
      const raw = localStorage.getItem(`facturaos_cxc_overrides_${estId}`);
      const overrides = raw ? JSON.parse(raw) : {};
      overrides[item.id] = {
        credit_term_days: item.credit_term_days,
        due_date: item.due_date,
        payments: item.payments,
      };
      localStorage.setItem(`facturaos_cxc_overrides_${estId}`, JSON.stringify(overrides));
    } catch (e) {
      console.warn("Error guardando override CxC:", e);
    }
  };

  // Persistir cambios de CxP en localStorage
  const saveCxpList = (list: PayableItem[]) => {
    if (!activeEstablishment?.id) return;
    try {
      localStorage.setItem(`facturaos_cxp_items_${activeEstablishment.id}`, JSON.stringify(list));
    } catch (e) {
      console.warn("Error guardando CxP:", e);
    }
  };

  // ─── CÁLCULOS SEMANALES Y KPIS ──────────────────────────────────────────────
  const stats = useMemo(() => {
    let totalCxcPending = 0;
    let totalCxcOverdue = 0;
    let totalCxcThisWeek = 0;
    let totalCxcNextWeek = 0;
    let totalCxcWeek2 = 0;

    let cxcOverdueCount = 0;
    let cxcThisWeekCount = 0;
    let cxcNextWeekCount = 0;
    let cxcWeek2Count = 0;

    receivables.forEach((r) => {
      const paid = r.payments.reduce((s, p) => s + p.amount, 0);
      const balance = Math.max(0, r.total_amount - paid);
      if (balance > 0) {
        totalCxcPending += balance;
        const cat = getWeekCategory(r.due_date, false);
        if (cat === "overdue") {
          totalCxcOverdue += balance;
          cxcOverdueCount++;
        } else if (cat === "this_week") {
          totalCxcThisWeek += balance;
          cxcThisWeekCount++;
        } else if (cat === "next_week") {
          totalCxcNextWeek += balance;
          cxcNextWeekCount++;
        } else if (cat === "week_2") {
          totalCxcWeek2 += balance;
          cxcWeek2Count++;
        }
      }
    });

    let totalCxpPending = 0;
    let totalCxpOverdue = 0;
    let totalCxpThisWeek = 0;
    let totalCxpNextWeek = 0;
    let totalCxpWeek2 = 0;

    let cxpOverdueCount = 0;
    let cxpThisWeekCount = 0;
    let cxpNextWeekCount = 0;
    let cxpWeek2Count = 0;

    payables.forEach((p) => {
      const paid = p.payments.reduce((s, pay) => s + pay.amount, 0);
      const balance = Math.max(0, p.total_amount - paid);
      if (balance > 0) {
        totalCxpPending += balance;
        const cat = getWeekCategory(p.due_date, false);
        if (cat === "overdue") {
          totalCxpOverdue += balance;
          cxpOverdueCount++;
        } else if (cat === "this_week") {
          totalCxpThisWeek += balance;
          cxpThisWeekCount++;
        } else if (cat === "next_week") {
          totalCxpNextWeek += balance;
          cxpNextWeekCount++;
        } else if (cat === "week_2") {
          totalCxpWeek2 += balance;
          cxpWeek2Count++;
        }
      }
    });

    return {
      totalCxcPending,
      totalCxcOverdue,
      totalCxcThisWeek,
      totalCxcNextWeek,
      totalCxcWeek2,
      cxcOverdueCount,
      cxcThisWeekCount,
      cxcNextWeekCount,
      cxcWeek2Count,

      totalCxpPending,
      totalCxpOverdue,
      totalCxpThisWeek,
      totalCxpNextWeek,
      totalCxpWeek2,
      cxpOverdueCount,
      cxpThisWeekCount,
      cxpNextWeekCount,
      cxpWeek2Count,

      netBalance: totalCxcPending - totalCxpPending,
      netThisWeek: totalCxcThisWeek - totalCxpThisWeek,
      netNextWeek: totalCxcNextWeek - totalCxpNextWeek,
      netWeek2: totalCxcWeek2 - totalCxpWeek2,
    };
  }, [receivables, payables]);

  // Filtrado de CxC
  const filteredReceivables = useMemo(() => {
    return receivables.filter((r) => {
      const paid = r.payments.reduce((s, p) => s + p.amount, 0);
      const isPaid = paid >= r.total_amount;
      const cat = getWeekCategory(r.due_date, isPaid);

      // Filtro semanal
      if (selectedWeekFilter !== "all" && cat !== selectedWeekFilter) {
        return false;
      }

      // Filtro estado
      if (statusFilter === "pending" && isPaid) return false;
      if (statusFilter === "paid" && !isPaid) return false;
      if (statusFilter === "partial" && (paid === 0 || isPaid)) return false;

      // Filtro búsqueda
      if (searchTerm) {
        const q = searchTerm.toLowerCase();
        const matchesClient = r.client_name.toLowerCase().includes(q);
        const matchesConsec = r.consecutive_number.toLowerCase().includes(q);
        const matchesLegal = (r.client_legal_id || "").includes(q);
        if (!matchesClient && !matchesConsec && !matchesLegal) return false;
      }

      return true;
    });
  }, [receivables, selectedWeekFilter, statusFilter, searchTerm]);

  // Filtrado de CxP
  const filteredPayables = useMemo(() => {
    return payables.filter((p) => {
      const paid = p.payments.reduce((s, pay) => s + pay.amount, 0);
      const isPaid = paid >= p.total_amount;
      const cat = getWeekCategory(p.due_date, isPaid);

      // Filtro semanal
      if (selectedWeekFilter !== "all" && cat !== selectedWeekFilter) {
        return false;
      }

      // Filtro estado
      if (statusFilter === "pending" && isPaid) return false;
      if (statusFilter === "paid" && !isPaid) return false;
      if (statusFilter === "partial" && (paid === 0 || isPaid)) return false;

      // Filtro búsqueda
      if (searchTerm) {
        const q = searchTerm.toLowerCase();
        const matchesSupp = p.supplier_name.toLowerCase().includes(q);
        const matchesInv = p.invoice_number.toLowerCase().includes(q);
        const matchesLegal = (p.supplier_legal_id || "").includes(q);
        if (!matchesSupp && !matchesInv && !matchesLegal) return false;
      }

      return true;
    });
  }, [payables, selectedWeekFilter, statusFilter, searchTerm]);

  // ─── ACCIONES: MODAL EDITAR PLAZO EN DÍAS ──────────────────────────────────
  const handleOpenTermModal = (item: ReceivableItem | PayableItem, type: "cxc" | "cxp") => {
    setActiveItemForTerm({ item, type });
    setTermForm({
      days: item.credit_term_days || 30,
      customDueDate: item.due_date,
    });
    setIsTermModalOpen(true);
  };

  const handleSaveTerm = () => {
    if (!activeItemForTerm) return;
    const { item, type } = activeItemForTerm;
    const newDays = Number(termForm.days) || 30;
    const newDueDate = termForm.customDueDate || addDaysToDate(item.issue_date, newDays);

    if (type === "cxc") {
      const updated = receivables.map((r) =>
        r.id === item.id ? { ...r, credit_term_days: newDays, due_date: newDueDate } : r
      );
      setReceivables(updated);
      const target = updated.find((r) => r.id === item.id);
      if (target) saveCxcOverride(target);
      toast.success(`Plazo de vencimiento actualizado a ${newDays} días (Vence: ${newDueDate})`);
    } else {
      const updated = payables.map((p) =>
        p.id === item.id ? { ...p, credit_term_days: newDays, due_date: newDueDate } : p
      );
      setPayables(updated);
      saveCxpList(updated);
      toast.success(`Plazo de proveedor actualizado a ${newDays} días (Vence: ${newDueDate})`);
    }

    setIsTermModalOpen(false);
  };

  // ─── ACCIONES: MODAL REGISTRAR ABONO / PAGO ────────────────────────────────
  const handleOpenPaymentModal = (item: ReceivableItem | PayableItem, type: "cxc" | "cxp") => {
    setActiveItemForPayment({ item, type });
    const paid = item.payments.reduce((s, p) => s + p.amount, 0);
    const balance = Math.max(0, item.total_amount - paid);
    setPaymentForm({
      amount: balance,
      date: new Date().toISOString().slice(0, 10),
      method: "SINPE Móvil",
      reference: "",
      notes: "",
    });
    setIsPaymentModalOpen(true);
  };

  const handleSavePayment = () => {
    if (!activeItemForPayment) return;
    const { item, type } = activeItemForPayment;
    const amount = Number(paymentForm.amount);
    if (!amount || amount <= 0) {
      toast.error("Por favor ingresa un monto válido mayor a 0");
      return;
    }

    const newPayment: PaymentRecord = {
      id: "pay-" + Date.now(),
      date: paymentForm.date,
      amount,
      method: paymentForm.method,
      reference: paymentForm.reference,
      notes: paymentForm.notes,
      registered_at: new Date().toISOString(),
    };

    if (type === "cxc") {
      const updated = receivables.map((r) =>
        r.id === item.id ? { ...r, payments: [newPayment, ...r.payments] } : r
      );
      setReceivables(updated);
      const target = updated.find((r) => r.id === item.id);
      if (target) saveCxcOverride(target);
      toast.success(`¡Abono de ₡${amount.toLocaleString()} registrado con éxito!`);
    } else {
      const updated = payables.map((p) =>
        p.id === item.id ? { ...p, payments: [newPayment, ...p.payments] } : p
      );
      setPayables(updated);
      saveCxpList(updated);
      toast.success(`¡Pago a proveedor de ₡${amount.toLocaleString()} registrado!`);
    }

    setIsPaymentModalOpen(false);
  };

  // ─── ACCIONES: NUEVA CUENTA POR PAGAR (CxP) ────────────────────────────────
  const handleCreatePayable = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPayableForm.supplier_name || !newPayableForm.total_amount) {
      toast.error("Por favor completa el nombre del proveedor y el monto");
      return;
    }

    const dueDate = addDaysToDate(newPayableForm.issue_date, newPayableForm.credit_term_days);
    const newItem: PayableItem = {
      id: "cxp-" + Date.now(),
      supplier_name: newPayableForm.supplier_name,
      supplier_legal_id: newPayableForm.supplier_legal_id || "3-101-000000",
      supplier_phone: newPayableForm.supplier_phone,
      invoice_number: newPayableForm.invoice_number || `FAC-${Math.floor(1000 + Math.random() * 9000)}`,
      issue_date: newPayableForm.issue_date,
      category: newPayableForm.category,
      currency: newPayableForm.currency,
      total_amount: Number(newPayableForm.total_amount),
      credit_term_days: Number(newPayableForm.credit_term_days),
      due_date: dueDate,
      payments: [],
      notes: newPayableForm.notes,
    };

    const updated = [newItem, ...payables];
    setPayables(updated);
    saveCxpList(updated);
    toast.success(`Cuenta por pagar a ${newItem.supplier_name} creada con éxito.`);
    setIsNewPayableModalOpen(false);
    setNewPayableForm({
      supplier_name: "",
      supplier_legal_id: "",
      supplier_phone: "",
      invoice_number: "",
      issue_date: new Date().toISOString().slice(0, 10),
      category: "Mercadería e Insumos",
      currency: "CRC",
      total_amount: 0,
      credit_term_days: 30,
      notes: "",
    });
  };

  // ─── ACCIONES: COBRO 1-CLIC POR WHATSAPP ───────────────────────────────────
  const handleOpenWhatsApp = (item: ReceivableItem) => {
    setActiveItemForWhatsApp(item);
    setIsWhatsAppModalOpen(true);
  };

  const getWhatsAppMessage = (item: ReceivableItem) => {
    const paid = item.payments.reduce((s, p) => s + p.amount, 0);
    const balance = Math.max(0, item.total_amount - paid);
    const diff = getDaysDiff(item.due_date);
    const companyName = activeEstablishment?.app_name || activeEstablishment?.name || "FacturaOS";
    const bankDetails = typeof window !== "undefined" && activeEstablishment?.id
      ? localStorage.getItem(`facturaos_bank_accounts_${activeEstablishment.id}`) || ""
      : "";

    let statusPhrase = "";
    if (diff < 0) {
      statusPhrase = `venció hace ${Math.abs(diff)} días (Fecha límite: ${item.due_date})`;
    } else if (diff === 0) {
      statusPhrase = `vence el día de hoy (${item.due_date})`;
    } else {
      statusPhrase = `vence en ${diff} días (${item.due_date})`;
    }

    return `Hola *${item.client_name}*, le saludamos cordialmente de *${companyName}*. 👋\n\nLe recordamos el detalle de su factura a crédito pendiente:\n📄 *Comprobante:* ${item.consecutive_number}\n📅 *Vencimiento:* ${statusPhrase}\n💰 *Saldo Pendiente:* ₡${balance.toLocaleString()} ${item.currency === "USD" ? "USD" : "CRC"}\n\n💳 *Cuentas para Transferencia / SINPE:*${bankDetails ? `\n${bankDetails}` : "\nPor favor consúltenos nuestros números de cuenta IBAN o SINPE Móvil."}\n\nAgradecemos enviarnos el comprobante por este medio una vez realizada la transferencia. ¡Muchas gracias por su preferencia!`;
  };

  const sendWhatsApp = (item: ReceivableItem) => {
    const rawPhone = (item.client_phone || "").replace(/\D/g, "");
    const phone = rawPhone.length === 8 ? `506${rawPhone}` : rawPhone;
    const msg = encodeURIComponent(getWhatsAppMessage(item));
    const url = phone ? `https://wa.me/${phone}?text=${msg}` : `https://wa.me/?text=${msg}`;
    window.open(url, "_blank");
    setIsWhatsAppModalOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Header de la Página */}
      <PageHeader
        title="Tesorería — Cobros y Pagos (CxC / CxP)"
        description="Gestión integral de créditos, vencimientos semana a semana, pagos a proveedores y flujo de caja."
        actions={
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() => setIsNewPayableModalOpen(true)}
              className="inline-flex items-center gap-2 rounded-xl border border-border bg-background px-4 py-2 text-xs font-bold text-foreground hover:bg-muted transition-all shadow-2xs cursor-pointer"
            >
              <Plus className="h-4 w-4 text-primary" />
              <span>+ Nuevo Gasto / CxP</span>
            </button>
            <a
              href="/app/invoices/new"
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground shadow-sm hover:bg-primary/90 transition-all cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span>+ Emitir a Crédito</span>
            </a>
          </div>
        }
      />

      {/* ─── RESUMEN DE FLUJO Y KPIS PRINCIPALES ────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total por Cobrar (CxC) */}
        <div className="rounded-2xl border border-border bg-card p-5 shadow-soft space-y-2">
          <div className="flex items-center justify-between text-muted-foreground text-xs font-semibold">
            <span>Cuentas por Cobrar (Clientes)</span>
            <div className="grid h-8 w-8 place-items-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <ArrowDownLeft className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-black font-mono text-emerald-600 dark:text-emerald-400">
            ₡{stats.totalCxcPending.toLocaleString()}
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <span className="font-semibold text-foreground">{receivables.length} facturas</span> emitidas a crédito
          </div>
        </div>

        {/* Total por Pagar (CxP) */}
        <div className="rounded-2xl border border-border bg-card p-5 shadow-soft space-y-2">
          <div className="flex items-center justify-between text-muted-foreground text-xs font-semibold">
            <span>Cuentas por Pagar (Proveedores)</span>
            <div className="grid h-8 w-8 place-items-center rounded-xl bg-red-500/10 text-destructive">
              <ArrowUpRight className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-black font-mono text-destructive">
            ₡{stats.totalCxpPending.toLocaleString()}
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <span className="font-semibold text-foreground">{payables.length} compromisos</span> por liquidar
          </div>
        </div>

        {/* Flujo Neto Proyectado */}
        <div className="rounded-2xl border border-border bg-card p-5 shadow-soft space-y-2">
          <div className="flex items-center justify-between text-muted-foreground text-xs font-semibold">
            <span>Flujo Neto Proyectado</span>
            <div className="grid h-8 w-8 place-items-center rounded-xl bg-primary/10 text-primary">
              <WalletCards className="h-4 w-4" />
            </div>
          </div>
          <div className={`text-2xl font-black font-mono ${stats.netBalance >= 0 ? "text-primary" : "text-destructive"}`}>
            {stats.netBalance >= 0 ? "+" : ""}₡{stats.netBalance.toLocaleString()}
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            {stats.netBalance >= 0 ? (
              <span className="text-emerald-600 font-semibold flex items-center gap-1">
                <TrendingUp className="h-3.5 w-3.5" /> Superávit de caja disponible
              </span>
            ) : (
              <span className="text-destructive font-semibold flex items-center gap-1">
                <TrendingDown className="h-3.5 w-3.5" /> Déficit proyectado
              </span>
            )}
          </div>
        </div>

        {/* Facturas Vencidas (En Mora) */}
        <div className="rounded-2xl border border-border bg-card p-5 shadow-soft space-y-2">
          <div className="flex items-center justify-between text-muted-foreground text-xs font-semibold">
            <span>Vencidas (Alerta de Mora)</span>
            <div className="grid h-8 w-8 place-items-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <AlertTriangle className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-black font-mono text-amber-600 dark:text-amber-400">
            ₡{stats.totalCxcOverdue.toLocaleString()}
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <span className="font-bold text-amber-700 dark:text-amber-300">{stats.cxcOverdueCount} cobros</span> requieren gestión inmediata
          </div>
        </div>
      </div>

      {/* ─── PESTAÑAS PRINCIPALES Y TIMELINE SEMANAL ────────────────────────── */}
      <div className="space-y-4">
        {/* Selector de Pestaña */}
        <div className="flex items-center justify-between border-b border-border pb-3 flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab("cxc")}
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition-all cursor-pointer ${
                activeTab === "cxc"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <ArrowDownLeft className="h-4 w-4" />
              <span>Cuentas por Cobrar (Clientes)</span>
              <span className="ml-1 rounded-full bg-white/20 dark:bg-black/20 px-2 py-0.5 text-[10px]">
                {receivables.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("cxp")}
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition-all cursor-pointer ${
                activeTab === "cxp"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <ArrowUpRight className="h-4 w-4" />
              <span>Cuentas por Pagar (Proveedores)</span>
              <span className="ml-1 rounded-full bg-white/20 dark:bg-black/20 px-2 py-0.5 text-[10px]">
                {payables.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("flujo")}
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition-all cursor-pointer ${
                activeTab === "flujo"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <CalendarDays className="h-4 w-4" />
              <span>Flujo de Caja Semanal</span>
            </button>
          </div>

          <div className="text-xs text-muted-foreground flex items-center gap-1.5">
            <Clock className="h-4 w-4 text-primary" />
            <span>Actualizado en tiempo real</span>
          </div>
        </div>

        {/* ─── FILTRO SEMANA A SEMANA (BOTONES DE CRONOGRAMA) ───────────────── */}
        {activeTab !== "flujo" && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
            {/* Todas */}
            <button
              type="button"
              onClick={() => setSelectedWeekFilter("all")}
              className={`rounded-xl border p-3 text-left transition-all cursor-pointer ${
                selectedWeekFilter === "all"
                  ? "border-primary bg-primary/10 text-primary ring-2 ring-primary/20"
                  : "border-border bg-card text-muted-foreground hover:bg-muted"
              }`}
            >
              <div className="text-[10px] uppercase font-bold tracking-wider">Todas las Fechas</div>
              <div className="text-base font-black font-mono text-foreground mt-0.5">
                {activeTab === "cxc" ? receivables.length : payables.length} docs
              </div>
              <div className="text-[10px] text-muted-foreground">Ver panorama completo</div>
            </button>

            {/* Vencidas (Mora) */}
            <button
              type="button"
              onClick={() => setSelectedWeekFilter("overdue")}
              className={`rounded-xl border p-3 text-left transition-all cursor-pointer ${
                selectedWeekFilter === "overdue"
                  ? "border-destructive bg-destructive/10 text-destructive ring-2 ring-destructive/20"
                  : "border-border bg-card text-muted-foreground hover:bg-muted"
              }`}
            >
              <div className="text-[10px] uppercase font-bold tracking-wider text-destructive flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" /> Vencidas
              </div>
              <div className="text-base font-black font-mono text-destructive mt-0.5">
                ₡{activeTab === "cxc" ? stats.totalCxcOverdue.toLocaleString() : stats.totalCxpOverdue.toLocaleString()}
              </div>
              <div className="text-[10px] text-destructive/80 font-medium">
                {activeTab === "cxc" ? stats.cxcOverdueCount : stats.cxpOverdueCount} en atraso
              </div>
            </button>

            {/* Esta Semana (Vence Lun - Dom) */}
            <button
              type="button"
              onClick={() => setSelectedWeekFilter("this_week")}
              className={`rounded-xl border p-3 text-left transition-all cursor-pointer ${
                selectedWeekFilter === "this_week"
                  ? "border-amber-500 bg-amber-500/10 text-amber-700 dark:text-amber-300 ring-2 ring-amber-500/20"
                  : "border-border bg-card text-muted-foreground hover:bg-muted"
              }`}
            >
              <div className="text-[10px] uppercase font-bold tracking-wider text-amber-600 dark:text-amber-400">
                Esta Semana
              </div>
              <div className="text-base font-black font-mono text-amber-600 dark:text-amber-400 mt-0.5">
                ₡{activeTab === "cxc" ? stats.totalCxcThisWeek.toLocaleString() : stats.totalCxpThisWeek.toLocaleString()}
              </div>
              <div className="text-[10px] text-muted-foreground">Vencimiento en 7 días</div>
            </button>

            {/* Próxima Semana (Semana +1) */}
            <button
              type="button"
              onClick={() => setSelectedWeekFilter("next_week")}
              className={`rounded-xl border p-3 text-left transition-all cursor-pointer ${
                selectedWeekFilter === "next_week"
                  ? "border-emerald-500 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 ring-2 ring-emerald-500/20"
                  : "border-border bg-card text-muted-foreground hover:bg-muted"
              }`}
            >
              <div className="text-[10px] uppercase font-bold tracking-wider text-emerald-600 dark:text-emerald-400">
                Semana +1
              </div>
              <div className="text-base font-black font-mono text-emerald-600 dark:text-emerald-400 mt-0.5">
                ₡{activeTab === "cxc" ? stats.totalCxcNextWeek.toLocaleString() : stats.totalCxpNextWeek.toLocaleString()}
              </div>
              <div className="text-[10px] text-muted-foreground">En 8 a 14 días</div>
            </button>

            {/* En 2 Semanas (Semana +2) */}
            <button
              type="button"
              onClick={() => setSelectedWeekFilter("week_2")}
              className={`rounded-xl border p-3 text-left transition-all cursor-pointer ${
                selectedWeekFilter === "week_2"
                  ? "border-blue-500 bg-blue-500/10 text-blue-700 dark:text-blue-300 ring-2 ring-blue-500/20"
                  : "border-border bg-card text-muted-foreground hover:bg-muted"
              }`}
            >
              <div className="text-[10px] uppercase font-bold tracking-wider text-blue-600 dark:text-blue-400">
                Semana +2
              </div>
              <div className="text-base font-black font-mono text-blue-600 dark:text-blue-400 mt-0.5">
                ₡{activeTab === "cxc" ? stats.totalCxcWeek2.toLocaleString() : stats.totalCxpWeek2.toLocaleString()}
              </div>
              <div className="text-[10px] text-muted-foreground">En 15 a 21 días</div>
            </button>

            {/* Ya Pagadas */}
            <button
              type="button"
              onClick={() => setSelectedWeekFilter("paid")}
              className={`rounded-xl border p-3 text-left transition-all cursor-pointer ${
                selectedWeekFilter === "paid"
                  ? "border-primary bg-primary/10 text-primary ring-2 ring-primary/20"
                  : "border-border bg-card text-muted-foreground hover:bg-muted"
              }`}
            >
              <div className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3 text-emerald-500" /> Liquidadas
              </div>
              <div className="text-base font-black font-mono text-foreground mt-0.5">
                Historial
              </div>
              <div className="text-[10px] text-muted-foreground">Comprobantes al 100%</div>
            </button>
          </div>
        )}
      </div>

      {/* ─── TAB 1: CUENTAS POR COBRAR (CxC) ─────────────────────────────────── */}
      {activeTab === "cxc" && (
        <div className="space-y-4">
          {/* Barra de Filtros */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Buscar cliente, cédula o consecutivo..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-10 w-full rounded-xl border border-border bg-card pl-9 pr-3 text-xs focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20 shadow-xs"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="h-10 rounded-xl border border-border bg-card px-3 text-xs focus:border-ring focus:outline-none shadow-xs font-medium text-foreground cursor-pointer"
              >
                <option value="all">Todos los estados de pago</option>
                <option value="pending">Solo Pendientes</option>
                <option value="partial">Con Abonos Parciales</option>
                <option value="paid">Totalmente Pagadas</option>
              </select>
            </div>
          </div>

          {/* Tabla de CxC */}
          <div className="rounded-xl border border-border bg-card shadow-soft overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="border-b border-border bg-muted/40 font-semibold text-muted-foreground uppercase text-[11px] tracking-wider">
                  <tr>
                    <th className="px-5 py-3.5">Cliente</th>
                    <th className="px-5 py-3.5">Comprobante</th>
                    <th className="px-5 py-3.5">Plazo en Días</th>
                    <th className="px-5 py-3.5">Vencimiento</th>
                    <th className="px-5 py-3.5 text-right">Monto / Saldo</th>
                    <th className="px-5 py-3.5 text-center">Acciones de Cobro</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredReceivables.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-5 py-12 text-center text-muted-foreground">
                        <WalletCards className="h-8 w-8 mx-auto text-muted-foreground/40 mb-2" />
                        <p className="font-semibold text-foreground text-sm">No se encontraron cuentas por cobrar</p>
                        <p className="text-xs">No hay comprobantes que coincidan con el filtro seleccionado.</p>
                      </td>
                    </tr>
                  ) : (
                    filteredReceivables.map((item) => {
                      const totalPaid = item.payments.reduce((s, p) => s + p.amount, 0);
                      const balance = Math.max(0, item.total_amount - totalPaid);
                      const isFullyPaid = balance <= 0;
                      const diff = getDaysDiff(item.due_date);
                      const isOverdue = diff < 0 && !isFullyPaid;
                      const isThisWeek = diff >= 0 && diff <= 7 && !isFullyPaid;

                      return (
                        <tr key={item.id} className="hover:bg-muted/30 transition-colors">
                          {/* Cliente */}
                          <td className="px-5 py-4">
                            <div className="font-semibold text-foreground">{item.client_name}</div>
                            <div className="text-[11px] text-muted-foreground">
                              {item.client_legal_id && `Céd: ${item.client_legal_id} • `}
                              {item.client_phone || "Sin teléfono"}
                            </div>
                          </td>

                          {/* Comprobante */}
                          <td className="px-5 py-4">
                            <div className="font-mono font-bold text-foreground flex items-center gap-1.5">
                              <span className="rounded bg-primary/10 text-primary px-1.5 py-0.5 text-[10px]">
                                {item.doc_type}
                              </span>
                              <span>{item.consecutive_number}</span>
                            </div>
                            <div className="text-[11px] text-muted-foreground">
                              Emitida: {item.issue_date}
                            </div>
                          </td>

                          {/* Plazo en Días (Editable con 1 clic) */}
                          <td className="px-5 py-4">
                            <button
                              type="button"
                              onClick={() => handleOpenTermModal(item, "cxc")}
                              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-2.5 py-1 text-xs font-semibold text-foreground hover:border-primary/40 hover:bg-primary/5 hover:text-primary transition-all cursor-pointer shadow-2xs"
                              title="Haga clic para cambiar los días de plazo o dar prórroga"
                            >
                              <Calendar className="h-3.5 w-3.5 text-primary" />
                              <span>{item.credit_term_days} días</span>
                              <Edit2 className="h-3 w-3 text-muted-foreground" />
                            </button>
                          </td>

                          {/* Vencimiento y Semáforo */}
                          <td className="px-5 py-4">
                            <div className="font-mono font-semibold text-foreground text-xs">
                              {item.due_date}
                            </div>
                            <div className="pt-0.5">
                              {isFullyPaid ? (
                                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                                  <Check className="h-3 w-3" /> Pagada al 100%
                                </span>
                              ) : isOverdue ? (
                                <span className="inline-flex items-center gap-1 rounded-full bg-destructive/10 px-2 py-0.5 text-[10px] font-bold text-destructive">
                                  <AlertTriangle className="h-3 w-3" /> Venció hace {Math.abs(diff)} días
                                </span>
                              ) : isThisWeek ? (
                                <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold text-amber-600 dark:text-amber-400">
                                  <Clock className="h-3 w-3" /> Vence en {diff} días
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
                                  Al día (en {diff} días)
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Monto y Saldo */}
                          <td className="px-5 py-4 text-right">
                            <div className="font-mono font-bold text-sm text-foreground">
                              ₡{balance.toLocaleString()}
                            </div>
                            <div className="text-[11px] text-muted-foreground font-mono">
                              Total: ₡{item.total_amount.toLocaleString()}
                              {totalPaid > 0 && ` • Abono: ₡${totalPaid.toLocaleString()}`}
                            </div>
                          </td>

                          {/* Acciones de Cobro */}
                          <td className="px-5 py-4 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              {/* Botón Cobrar por WhatsApp */}
                              {!isFullyPaid && (
                                <button
                                  type="button"
                                  onClick={() => handleOpenWhatsApp(item)}
                                  className="inline-flex items-center gap-1 rounded-lg border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-300 px-2.5 py-1.5 text-xs font-bold transition-all cursor-pointer shadow-2xs"
                                  title="Enviar recordatorio formal por WhatsApp con datos de cuenta IBAN"
                                >
                                  <MessageCircle className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                                  <span>Cobrar</span>
                                </button>
                              )}

                              {/* Botón Registrar Abono */}
                              {!isFullyPaid ? (
                                <button
                                  type="button"
                                  onClick={() => handleOpenPaymentModal(item, "cxc")}
                                  className="inline-flex items-center gap-1 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground px-2.5 py-1.5 text-xs font-bold transition-all cursor-pointer shadow-2xs"
                                  title="Registrar abono parcial o liquidación total"
                                >
                                  <DollarSign className="h-3.5 w-3.5" />
                                  <span>Abonar</span>
                                </button>
                              ) : (
                                <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                                  <CheckCircle2 className="h-4 w-4" /> Liquidado
                                </span>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ─── TAB 2: CUENTAS POR PAGAR (CxP) ─────────────────────────────────── */}
      {activeTab === "cxp" && (
        <div className="space-y-4">
          {/* Barra de Filtros */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Buscar proveedor, cédula o factura..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-10 w-full rounded-xl border border-border bg-card pl-9 pr-3 text-xs focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20 shadow-xs"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => setIsNewPayableModalOpen(true)}
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground shadow-sm hover:bg-primary/90 transition-all cursor-pointer"
              >
                <Plus className="h-4 w-4" />
                <span>+ Registrar Factura de Proveedor</span>
              </button>
            </div>
          </div>

          {/* Tabla de CxP */}
          <div className="rounded-xl border border-border bg-card shadow-soft overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="border-b border-border bg-muted/40 font-semibold text-muted-foreground uppercase text-[11px] tracking-wider">
                  <tr>
                    <th className="px-5 py-3.5">Proveedor</th>
                    <th className="px-5 py-3.5">Factura / Categoría</th>
                    <th className="px-5 py-3.5">Plazo Otorgado</th>
                    <th className="px-5 py-3.5">Fecha Vencimiento</th>
                    <th className="px-5 py-3.5 text-right">Monto / Saldo por Pagar</th>
                    <th className="px-5 py-3.5 text-center">Acciones de Pago</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredPayables.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-5 py-12 text-center text-muted-foreground">
                        <Building2 className="h-8 w-8 mx-auto text-muted-foreground/40 mb-2" />
                        <p className="font-semibold text-foreground text-sm">No se encontraron cuentas por pagar</p>
                        <p className="text-xs">No hay obligaciones de proveedores en este rango.</p>
                      </td>
                    </tr>
                  ) : (
                    filteredPayables.map((item) => {
                      const totalPaid = item.payments.reduce((s, p) => s + p.amount, 0);
                      const balance = Math.max(0, item.total_amount - totalPaid);
                      const isFullyPaid = balance <= 0;
                      const diff = getDaysDiff(item.due_date);
                      const isOverdue = diff < 0 && !isFullyPaid;
                      const isThisWeek = diff >= 0 && diff <= 7 && !isFullyPaid;

                      return (
                        <tr key={item.id} className="hover:bg-muted/30 transition-colors">
                          {/* Proveedor */}
                          <td className="px-5 py-4">
                            <div className="font-semibold text-foreground">{item.supplier_name}</div>
                            <div className="text-[11px] text-muted-foreground">
                              Céd: {item.supplier_legal_id} {item.supplier_phone && `• Tel: ${item.supplier_phone}`}
                            </div>
                          </td>

                          {/* Factura / Categoría */}
                          <td className="px-5 py-4">
                            <div className="font-mono font-bold text-foreground">
                              {item.invoice_number}
                            </div>
                            <div className="text-[11px] text-muted-foreground">
                              {item.category} • Emitida: {item.issue_date}
                            </div>
                          </td>

                          {/* Plazo Otorgado (Editable) */}
                          <td className="px-5 py-4">
                            <button
                              type="button"
                              onClick={() => handleOpenTermModal(item, "cxp")}
                              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-2.5 py-1 text-xs font-semibold text-foreground hover:border-primary/40 hover:bg-primary/5 hover:text-primary transition-all cursor-pointer shadow-2xs"
                              title="Haga clic para editar los días de crédito del proveedor"
                            >
                              <Calendar className="h-3.5 w-3.5 text-primary" />
                              <span>{item.credit_term_days} días</span>
                              <Edit2 className="h-3 w-3 text-muted-foreground" />
                            </button>
                          </td>

                          {/* Fecha Vencimiento */}
                          <td className="px-5 py-4">
                            <div className="font-mono font-semibold text-foreground text-xs">
                              {item.due_date}
                            </div>
                            <div className="pt-0.5">
                              {isFullyPaid ? (
                                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                                  <Check className="h-3 w-3" /> Pagado al 100%
                                </span>
                              ) : isOverdue ? (
                                <span className="inline-flex items-center gap-1 rounded-full bg-destructive/10 px-2 py-0.5 text-[10px] font-bold text-destructive">
                                  <AlertTriangle className="h-3 w-3" /> Venció hace {Math.abs(diff)} días
                                </span>
                              ) : isThisWeek ? (
                                <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold text-amber-600 dark:text-amber-400">
                                  <Clock className="h-3 w-3" /> Vence en {diff} días
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
                                  Al día (en {diff} días)
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Saldo por Pagar */}
                          <td className="px-5 py-4 text-right">
                            <div className="font-mono font-bold text-sm text-destructive">
                              ₡{balance.toLocaleString()}
                            </div>
                            <div className="text-[11px] text-muted-foreground font-mono">
                              Total: ₡{item.total_amount.toLocaleString()}
                              {totalPaid > 0 && ` • Pagado: ₡${totalPaid.toLocaleString()}`}
                            </div>
                          </td>

                          {/* Acciones de Pago */}
                          <td className="px-5 py-4 text-center">
                            {!isFullyPaid ? (
                              <button
                                type="button"
                                onClick={() => handleOpenPaymentModal(item, "cxp")}
                                className="inline-flex items-center gap-1 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground px-3 py-1.5 text-xs font-bold transition-all cursor-pointer shadow-2xs"
                              >
                                <DollarSign className="h-3.5 w-3.5" />
                                <span>Registrar Pago</span>
                              </button>
                            ) : (
                              <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center justify-center gap-1">
                                <CheckCircle2 className="h-4 w-4" /> Completado
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ─── TAB 3: FLUJO DE CAJA SEMANA A SEMANA CONSOLIDADO ────────────────── */}
      {activeTab === "flujo" && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-primary/20 bg-gradient-to-r from-primary/5 via-background to-primary/5 p-6 shadow-sm">
            <h3 className="font-bold text-foreground text-base flex items-center gap-2">
              <CalendarDays className="h-5 w-5 text-primary" />
              Proyección de Flujo de Caja (Cobros vs Pagos Semana a Semana)
            </h3>
            <p className="text-xs text-muted-foreground mt-1">
              Anticípate a tus necesidades de liquidez: compara los cobros que te ingresarán contra los pagos a proveedores que debes realizar cada semana.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Vencidas */}
            <div className="rounded-2xl border border-destructive/20 bg-card p-5 space-y-3 shadow-soft">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-destructive uppercase tracking-wider flex items-center gap-1.5">
                  <AlertTriangle className="h-4 w-4" /> Vencidas / Mora
                </span>
                <span className="text-[10px] bg-destructive/10 text-destructive px-2 py-0.5 rounded-full font-bold">
                  Inmediato
                </span>
              </div>
              <div className="space-y-1.5 pt-1">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Por Cobrar:</span>
                  <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                    +₡{stats.totalCxcOverdue.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Por Pagar:</span>
                  <span className="font-mono font-bold text-destructive">
                    -₡{stats.totalCxpOverdue.toLocaleString()}
                  </span>
                </div>
                <div className="border-t border-border pt-1.5 flex justify-between text-xs font-bold">
                  <span>Balance Neto:</span>
                  <span className={`font-mono ${stats.totalCxcOverdue - stats.totalCxpOverdue >= 0 ? "text-primary" : "text-destructive"}`}>
                    ₡{(stats.totalCxcOverdue - stats.totalCxpOverdue).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            {/* Esta Semana */}
            <div className="rounded-2xl border border-amber-500/30 bg-card p-5 space-y-3 shadow-soft">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-700 dark:text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Clock className="h-4 w-4 text-amber-500" /> Esta Semana
                </span>
                <span className="text-[10px] bg-amber-500/10 text-amber-700 dark:text-amber-300 px-2 py-0.5 rounded-full font-bold">
                  Próximos 7 días
                </span>
              </div>
              <div className="space-y-1.5 pt-1">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Por Cobrar:</span>
                  <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                    +₡{stats.totalCxcThisWeek.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Por Pagar:</span>
                  <span className="font-mono font-bold text-destructive">
                    -₡{stats.totalCxpThisWeek.toLocaleString()}
                  </span>
                </div>
                <div className="border-t border-border pt-1.5 flex justify-between text-xs font-bold">
                  <span>Balance Neto:</span>
                  <span className={`font-mono ${stats.netThisWeek >= 0 ? "text-primary" : "text-destructive"}`}>
                    ₡{stats.netThisWeek.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            {/* Semana +1 */}
            <div className="rounded-2xl border border-emerald-500/30 bg-card p-5 space-y-3 shadow-soft">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300 uppercase tracking-wider flex items-center gap-1.5">
                  <CalendarDays className="h-4 w-4 text-emerald-500" /> Semana +1
                </span>
                <span className="text-[10px] bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded-full font-bold">
                  En 8 a 14 días
                </span>
              </div>
              <div className="space-y-1.5 pt-1">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Por Cobrar:</span>
                  <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                    +₡{stats.totalCxcNextWeek.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Por Pagar:</span>
                  <span className="font-mono font-bold text-destructive">
                    -₡{stats.totalCxpNextWeek.toLocaleString()}
                  </span>
                </div>
                <div className="border-t border-border pt-1.5 flex justify-between text-xs font-bold">
                  <span>Balance Neto:</span>
                  <span className={`font-mono ${stats.netNextWeek >= 0 ? "text-primary" : "text-destructive"}`}>
                    ₡{stats.netNextWeek.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            {/* Semana +2 */}
            <div className="rounded-2xl border border-blue-500/30 bg-card p-5 space-y-3 shadow-soft">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-blue-700 dark:text-blue-300 uppercase tracking-wider flex items-center gap-1.5">
                  <TrendingUp className="h-4 w-4 text-blue-500" /> Semana +2
                </span>
                <span className="text-[10px] bg-blue-500/10 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-full font-bold">
                  En 15 a 21 días
                </span>
              </div>
              <div className="space-y-1.5 pt-1">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Por Cobrar:</span>
                  <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                    +₡{stats.totalCxcWeek2.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Por Pagar:</span>
                  <span className="font-mono font-bold text-destructive">
                    -₡{stats.totalCxpWeek2.toLocaleString()}
                  </span>
                </div>
                <div className="border-t border-border pt-1.5 flex justify-between text-xs font-bold">
                  <span>Balance Neto:</span>
                  <span className={`font-mono ${stats.netWeek2 >= 0 ? "text-primary" : "text-destructive"}`}>
                    ₡{stats.netWeek2.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL 1: REGISTRAR ABONO / PAGO ─────────────────────────────────── */}
      {isPaymentModalOpen && activeItemForPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs animate-in fade-in-50 duration-200">
          <div className="w-full max-w-md rounded-3xl bg-card border border-border p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <DollarSign className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-foreground text-base">
                    {activeItemForPayment.type === "cxc" ? "Registrar Abono de Cliente" : "Registrar Pago a Proveedor"}
                  </h3>
                  <p className="text-xs text-muted-foreground">Gestión de saldo y liquidación de comprobantes</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsPaymentModalOpen(false)}
                className="rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="rounded-xl border border-border bg-muted/40 p-3 text-xs space-y-1">
              <div className="font-bold text-foreground">
                {activeItemForPayment.type === "cxc"
                  ? (activeItemForPayment.item as ReceivableItem).client_name
                  : (activeItemForPayment.item as PayableItem).supplier_name}
              </div>
              <div className="text-muted-foreground text-[11px]">
                Comprobante: <strong>{activeItemForPayment.type === "cxc" ? (activeItemForPayment.item as ReceivableItem).consecutive_number : (activeItemForPayment.item as PayableItem).invoice_number}</strong>
              </div>
              <div className="text-muted-foreground text-[11px] font-mono">
                Monto Original: ₡{activeItemForPayment.item.total_amount.toLocaleString()}
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="font-semibold text-foreground">Monto a Abonar (₡)</label>
                <input
                  type="number"
                  value={paymentForm.amount || ""}
                  onChange={(e) => setPaymentForm({ ...paymentForm, amount: Number(e.target.value) })}
                  className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm font-mono font-bold focus:border-primary focus:outline-none"
                  placeholder="0.00"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-foreground">Fecha del Pago</label>
                  <input
                    type="date"
                    value={paymentForm.date}
                    onChange={(e) => setPaymentForm({ ...paymentForm, date: e.target.value })}
                    className="h-10 w-full rounded-xl border border-border bg-background px-3 text-xs focus:border-primary focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-foreground">Método</label>
                  <select
                    value={paymentForm.method}
                    onChange={(e) => setPaymentForm({ ...paymentForm, method: e.target.value })}
                    className="h-10 w-full rounded-xl border border-border bg-background px-2 text-xs focus:border-primary focus:outline-none"
                  >
                    <option value="SINPE Móvil">SINPE Móvil</option>
                    <option value="Transferencia Bancaria">Transferencia Bancaria</option>
                    <option value="Tarjeta de Débito/Crédito">Tarjeta de Débito/Crédito</option>
                    <option value="Efectivo">Efectivo</option>
                    <option value="Cheque">Cheque</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-foreground">N° Comprobante / Referencia (Opcional)</label>
                <input
                  type="text"
                  placeholder="Ej: SINPE-123456 o Ref Bancaria"
                  value={paymentForm.reference}
                  onChange={(e) => setPaymentForm({ ...paymentForm, reference: e.target.value })}
                  className="h-10 w-full rounded-xl border border-border bg-background px-3 text-xs focus:border-primary focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-foreground">Notas Adicionales</label>
                <input
                  type="text"
                  placeholder="Ej: Cancelación saldo restante"
                  value={paymentForm.notes}
                  onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                  className="h-10 w-full rounded-xl border border-border bg-background px-3 text-xs focus:border-primary focus:outline-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-border">
              <button
                type="button"
                onClick={() => setIsPaymentModalOpen(false)}
                className="rounded-xl border border-border px-4 py-2.5 font-semibold text-muted-foreground hover:bg-muted cursor-pointer text-xs"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSavePayment}
                className="inline-flex items-center gap-2 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground px-5 py-2.5 font-bold shadow-sm cursor-pointer text-xs"
              >
                <Check className="h-4 w-4" />
                <span>Guardar Abono</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL 2: EDITAR PLAZO EN DÍAS / PRÓRROGA ────────────────────────── */}
      {isTermModalOpen && activeItemForTerm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs animate-in fade-in-50 duration-200">
          <div className="w-full max-w-md rounded-3xl bg-card border border-border p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <CalendarClock className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-foreground text-base">Modificar Plazo de Vencimiento</h3>
                  <p className="text-xs text-muted-foreground">Ajuste manual de días o prórroga personalizada</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsTermModalOpen(false)}
                className="rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="rounded-xl border border-border bg-muted/40 p-3 space-y-1">
                <p className="font-semibold text-foreground">
                  Comprobante emitido el: <strong>{activeItemForTerm.item.issue_date}</strong>
                </p>
                <p className="text-muted-foreground">
                  Al cambiar la cantidad de días, la fecha de vencimiento y su semana de cobro se recalculan automáticamente.
                </p>
              </div>

              {/* Botones rápidos de días */}
              <div className="space-y-1.5">
                <label className="font-semibold text-foreground">Atajos Rápidos de Plazo</label>
                <div className="grid grid-cols-4 gap-2">
                  {[15, 30, 45, 60].map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => {
                        setTermForm({
                          days: d,
                          customDueDate: addDaysToDate(activeItemForTerm.item.issue_date, d),
                        });
                      }}
                      className={`rounded-xl border py-2 text-xs font-bold transition-all cursor-pointer ${
                        Number(termForm.days) === d
                          ? "border-primary bg-primary text-primary-foreground shadow-xs"
                          : "border-border bg-card text-foreground hover:bg-muted"
                      }`}
                    >
                      {d} Días
                    </button>
                  ))}
                </div>
              </div>

              {/* Input manual de días */}
              <div className="space-y-1">
                <label className="font-semibold text-foreground">O escribe los Días Exactos para Vencer:</label>
                <div className="relative">
                  <input
                    type="number"
                    min="1"
                    max="365"
                    value={termForm.days || ""}
                    onChange={(e) => {
                      const days = Number(e.target.value);
                      setTermForm({
                        days,
                        customDueDate: addDaysToDate(activeItemForTerm.item.issue_date, days),
                      });
                    }}
                    className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm font-mono font-bold focus:border-primary focus:outline-none"
                    placeholder="Ej: 30"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-semibold">
                    Días
                  </span>
                </div>
              </div>

              {/* Fecha resultante */}
              <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 space-y-1">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Nueva Fecha de Vencimiento:</span>
                  <span className="font-mono font-black text-primary text-sm">
                    {termForm.customDueDate || addDaysToDate(activeItemForTerm.item.issue_date, termForm.days)}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-border">
              <button
                type="button"
                onClick={() => setIsTermModalOpen(false)}
                className="rounded-xl border border-border px-4 py-2.5 font-semibold text-muted-foreground hover:bg-muted cursor-pointer text-xs"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveTerm}
                className="inline-flex items-center gap-2 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground px-5 py-2.5 font-bold shadow-sm cursor-pointer text-xs"
              >
                <Check className="h-4 w-4" />
                <span>Aplicar Nuevo Plazo</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL 3: NUEVA CUENTA POR PAGAR (CxP PROVEEDORES) ───────────────── */}
      {isNewPayableModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs animate-in fade-in-50 duration-200">
          <div className="w-full max-w-lg rounded-3xl bg-card border border-border p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <Building2 className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-foreground text-base">Registrar Cuenta por Pagar (Proveedor)</h3>
                  <p className="text-xs text-muted-foreground">Control de facturas recibidas y compromisos de pago</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsNewPayableModalOpen(false)}
                className="rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreatePayable} className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="font-semibold text-foreground">Nombre del Proveedor *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Distribuidora Nacional S.A."
                  value={newPayableForm.supplier_name}
                  onChange={(e) => setNewPayableForm({ ...newPayableForm, supplier_name: e.target.value })}
                  className="h-10 w-full rounded-xl border border-border bg-background px-3 text-xs focus:border-primary focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-foreground">Cédula del Proveedor</label>
                  <input
                    type="text"
                    placeholder="3-101-123456"
                    value={newPayableForm.supplier_legal_id}
                    onChange={(e) => setNewPayableForm({ ...newPayableForm, supplier_legal_id: e.target.value })}
                    className="h-10 w-full rounded-xl border border-border bg-background px-3 text-xs focus:border-primary focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-foreground">N° Factura de Proveedor</label>
                  <input
                    type="text"
                    placeholder="FAC-1234 o Consecutivo"
                    value={newPayableForm.invoice_number}
                    onChange={(e) => setNewPayableForm({ ...newPayableForm, invoice_number: e.target.value })}
                    className="h-10 w-full rounded-xl border border-border bg-background px-3 text-xs focus:border-primary focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-foreground">Monto Total a Pagar (₡) *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    placeholder="0.00"
                    value={newPayableForm.total_amount || ""}
                    onChange={(e) => setNewPayableForm({ ...newPayableForm, total_amount: Number(e.target.value) })}
                    className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm font-mono font-bold focus:border-primary focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-foreground">Categoría de Gasto</label>
                  <select
                    value={newPayableForm.category}
                    onChange={(e) => setNewPayableForm({ ...newPayableForm, category: e.target.value })}
                    className="h-10 w-full rounded-xl border border-border bg-background px-2 text-xs focus:border-primary focus:outline-none"
                  >
                    <option value="Mercadería e Insumos">Mercadería e Insumos</option>
                    <option value="Servicios Profesionales">Servicios Profesionales</option>
                    <option value="Alquiler y Local">Alquiler y Local</option>
                    <option value="Servicios Públicos (Luz/Agua/Internet)">Servicios Públicos</option>
                    <option value="Repuestos y Mantenimiento">Repuestos y Mantenimiento</option>
                    <option value="Otros Gastos Operativos">Otros Gastos Operativos</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-foreground">Fecha de Emisión</label>
                  <input
                    type="date"
                    value={newPayableForm.issue_date}
                    onChange={(e) => setNewPayableForm({ ...newPayableForm, issue_date: e.target.value })}
                    className="h-10 w-full rounded-xl border border-border bg-background px-3 text-xs focus:border-primary focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-foreground">Plazo Otorgado (Días)</label>
                  <input
                    type="number"
                    min="1"
                    value={newPayableForm.credit_term_days}
                    onChange={(e) => setNewPayableForm({ ...newPayableForm, credit_term_days: Number(e.target.value) })}
                    className="h-10 w-full rounded-xl border border-border bg-background px-3 text-xs font-mono font-bold focus:border-primary focus:outline-none"
                  />
                </div>
              </div>

              <div className="rounded-xl border border-border bg-muted/40 p-3 text-xs flex justify-between items-center">
                <span className="text-muted-foreground">Vencimiento Calculado:</span>
                <span className="font-mono font-black text-destructive">
                  {addDaysToDate(newPayableForm.issue_date, newPayableForm.credit_term_days)}
                </span>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsNewPayableModalOpen(false)}
                  className="rounded-xl border border-border px-4 py-2.5 font-semibold text-muted-foreground hover:bg-muted cursor-pointer text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center gap-2 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground px-5 py-2.5 font-bold shadow-sm cursor-pointer text-xs"
                >
                  <Check className="h-4 w-4" />
                  <span>Guardar Cuenta por Pagar</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL 4: VISTA PREVIA MENSAJE DE WHATSAPP ──────────────────────── */}
      {isWhatsAppModalOpen && activeItemForWhatsApp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs animate-in fade-in-50 duration-200">
          <div className="w-full max-w-md rounded-3xl bg-card border border-border p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                  <MessageCircle className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-foreground text-base">Recordatorio por WhatsApp</h3>
                  <p className="text-xs text-muted-foreground">Mensaje profesional de cobro con datos de transferencia</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsWhatsAppModalOpen(false)}
                className="rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="font-semibold text-foreground">Teléfono del Cliente (WhatsApp):</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Ej: 8888-9999 o 50688889999"
                    value={activeItemForWhatsApp.client_phone || ""}
                    onChange={(e) => setActiveItemForWhatsApp({ ...activeItemForWhatsApp, client_phone: e.target.value })}
                    className="h-10 w-full rounded-xl border border-border bg-background pl-9 pr-3 text-xs font-mono focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-foreground">Vista Previa del Mensaje:</label>
                <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-4 text-xs font-sans whitespace-pre-line text-foreground/90 leading-relaxed shadow-xs">
                  {getWhatsAppMessage(activeItemForWhatsApp)}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-border">
              <button
                type="button"
                onClick={() => setIsWhatsAppModalOpen(false)}
                className="rounded-xl border border-border px-4 py-2.5 font-semibold text-muted-foreground hover:bg-muted cursor-pointer text-xs"
              >
                Cerrar
              </button>
              <button
                type="button"
                onClick={() => sendWhatsApp(activeItemForWhatsApp)}
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 font-bold shadow-md shadow-emerald-600/25 cursor-pointer text-xs"
              >
                <Send className="h-4 w-4" />
                <span>Abrir WhatsApp y Enviar</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
