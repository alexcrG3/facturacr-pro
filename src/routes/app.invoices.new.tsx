import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  ArrowLeft,
  Plus,
  Trash2,
  Save,
  Send,
  FileText,
  User,
  Package,
  Calculator,
  Info,
  Eye,
  ChevronDown,
  Percent,
  Search,
  CheckCircle2,
  Download,
  Copy,
  Check,
  X,
  Loader2,
  FileCode,
  Sparkles,
  Store,
} from "lucide-react";
import { useMemo, useState, useEffect } from "react";
import { toast } from "sonner";
import { clients as defaultClients, formatCRC, Client } from "@/lib/mock-data";
import {
  generarClave,
  generarConsecutivo,
  construirXmlHacienda,
  firmarXmlHacienda,
  TipoDocumento,
} from "@/lib/hacienda";
import { CabysFinderModal } from "@/components/common/CabysFinderModal";
import { type CabysItem, buscarCabys } from "@/lib/cabys";
import { consultarContribuyenteHacienda, TaxpayerInfo } from "@/lib/taxpayer";
import { supabase } from "@/lib/supabase";
import { useApp } from "@/contexts/AppContext";

export const Route = createFileRoute("/app/invoices/new")({
  validateSearch: (search: Record<string, unknown>): { clientId?: string } => {
    return {
      clientId: typeof search.clientId === "string" ? search.clientId : undefined,
    };
  },
  component: NewInvoice,
});

// ─────────────────────────────────────────────────────────────────────────────
// Catálogos auxiliares
// ─────────────────────────────────────────────────────────────────────────────
const DOC_TYPES: { code: TipoDocumento; label: string; short: string; badge: string }[] = [
  { code: "01", label: "Factura Electrónica", short: "FE", badge: "01" },
  { code: "04", label: "Tiquete Electrónico", short: "TE", badge: "04" },
  { code: "03", label: "Nota de Crédito", short: "NC", badge: "03" },
  { code: "02", label: "Nota de Débito", short: "ND", badge: "02" },
];

const PAYMENT_METHODS = [
  { code: "01", label: "01 - Efectivo" },
  { code: "02", label: "02 - Tarjeta (Crédito / Débito)" },
  { code: "03", label: "03 - Cheque" },
  { code: "04", label: "04 - Transferencia - depósito bancario (SINPE)" },
  { code: "05", label: "05 - Recaudado por terceros" },
  { code: "99", label: "99 - Otros" },
];

const SALE_CONDITIONS = [
  { code: "01", label: "01 - Al contado" },
  { code: "02", label: "02 - A crédito" },
  { code: "03", label: "03 - Consignación" },
  { code: "04", label: "04 - Apartado" },
  { code: "05", label: "05 - Arrendamiento con opción de compra" },
  { code: "06", label: "06 - Arrendamiento en función financiera" },
  { code: "07", label: "07 - Cobro a favor de un tercero" },
  { code: "08", label: "08 - Servicios prestados al Estado a crédito" },
  { code: "09", label: "09 - Pago de servicios prestados al Estado" },
  { code: "10", label: "10 - Venta a crédito en IVA hasta 90 días" },
  { code: "11", label: "11 - Pago de venta a crédito en IVA hasta 90 días" },
  { code: "99", label: "99 - Otros" },
];

const ID_TYPES = [
  { code: "01", label: "01 - Cédula Física (9 dígitos)" },
  { code: "02", label: "02 - Cédula Jurídica (10 dígitos)" },
  { code: "03", label: "03 - DIMEX (11 o 12 dígitos)" },
  { code: "04", label: "04 - NITE (10 dígitos)" },
];

const CURRENCIES = [
  { code: "CRC", label: "Colones (CRC)", rate: 1 },
  { code: "USD", label: "Dólares (USD)", rate: 512.45 },
  { code: "EUR", label: "Euros (EUR)", rate: 558.1 },
];

const UNITS = [
  { code: "Unid", label: "Unidad" },
  { code: "Sp", label: "Servicio profesional" },
  { code: "kg", label: "Kilogramo" },
  { code: "g", label: "Gramo" },
  { code: "L", label: "Litro" },
  { code: "ml", label: "Mililitro" },
  { code: "m", label: "Metro" },
  { code: "cm", label: "Centímetro" },
  { code: "h", label: "Hora" },
  { code: "d", label: "Día" },
];

const IVA_RATES = [
  { code: "01", label: "Tarifa 0% (Exento)", rate: 0 },
  { code: "02", label: "Tarifa reducida 1%", rate: 1 },
  { code: "03", label: "Tarifa reducida 2%", rate: 2 },
  { code: "04", label: "Tarifa reducida 4%", rate: 4 },
  { code: "08", label: "Tarifa general 13%", rate: 13 },
];

const EXEMPTION_TYPES = [
  { code: "01", label: "Compras autorizadas por la DGT" },
  { code: "02", label: "Ventas exentas a diplomáticos" },
  { code: "03", label: "Autorizado Ley especial" },
  { code: "04", label: "Exenciones Dirección General de Hacienda" },
  { code: "05", label: "Transitorios" },
  { code: "99", label: "Otros" },
];

const PROVINCES = [
  "San José",
  "Alajuela",
  "Cartago",
  "Heredia",
  "Guanacaste",
  "Puntarenas",
  "Limón",
];

const REF_TYPES = [
  { code: "13", label: "13 - Anulación por error material (Afecta periodo original - Noviembre)" },
  { code: "14", label: "14 - Corrección de montos por error material (Afecta periodo original - Noviembre)" },
  { code: "15", label: "15 - Sustitución de comprobante por error material (Afecta periodo original - Noviembre)" },
  { code: "01", label: "01 - Anula documento de referencia (Devolución comercial ordinaria)" },
  { code: "02", label: "02 - Corrige texto del documento" },
  { code: "03", label: "03 - Corrige montos" },
  { code: "04", label: "04 - Referencia a otro documento" },
  { code: "05", label: "05 - Sustituye comprobante provisional por contingencia" },
  { code: "16", label: "16 - Referencia a comprobante electrónico rechazado por Hacienda" },
  { code: "17", label: "17 - Aplicación de pago en Recibo Electrónico de Pago (REP)" },
  { code: "99", label: "99 - Otros" },
];

// ─────────────────────────────────────────────────────────────────────────────
// Tipos
// ─────────────────────────────────────────────────────────────────────────────
type Line = {
  id: string;
  productId: string;
  cabys: string; // 13 dígitos
  code: string; // código comercial interno
  detail: string;
  unit: string;
  qty: number;
  unitPrice: number;
  discountPct: number;
  discountReason: string;
  ivaCode: string; // tarifa IVA
  hasExemption: boolean;
  exemption: {
    type: string;
    docNumber: string;
    institution: string;
    date: string;
    pct: number;
  };
};

function emptyLine(p?: any): Line {
  return {
    id: crypto.randomUUID(),
    productId: p?.id ?? "",
    cabys: p?.cabys ?? "",
    code: p?.sku ?? "",
    detail: p?.name ?? "",
    unit: p?.unit ?? "Unid",
    qty: 1,
    unitPrice: p?.price ?? 0,
    discountPct: 0,
    discountReason: "",
    ivaCode: "08",
    hasExemption: false,
    exemption: { type: "04", docNumber: "", institution: "Ministerio de Hacienda", date: new Date().toISOString().slice(0, 10), pct: 100 },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
function NewInvoice() {
  const { activeEstablishment } = useApp();
  const search = Route.useSearch();
  // Lista de clientes cargados desde Supabase
  const [allClients, setAllClients] = useState<any[]>([]);
  const [companyCabys, setCompanyCabys] = useState<any[]>([]);
  const [allProducts, setAllProducts] = useState<any[]>([]);
  const [recentInvoices, setRecentInvoices] = useState<any[]>([]);

  useEffect(() => {
    supabase
      .from("invoices")
      .select("*")
      .order("issue_date", { ascending: false })
      .limit(30)
      .then(({ data }) => {
        if (data) setRecentInvoices(data);
      });
  }, []);

  useEffect(() => {
    supabase
      .from("products")
      .select("*")
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        if (data && data.length > 0) {
          setAllProducts(
            data.map((row: any) => ({
              id: row.id,
              name: row.name,
              sku: row.code || "",
              cabys: row.cabys_code || "",
              price: Number(row.price) || 0,
              tax_rate: Number(row.tax_rate) || 13,
              unit: row.unit || "Unid",
              description: row.description || "",
            }))
          );
        }
      });
  }, []);

  useEffect(() => {
    supabase
      .from("company_cabys")
      .select("*")
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        if (data && data.length > 0) setCompanyCabys(data);
      });
  }, []);

  useEffect(() => {
    supabase
      .from("clients")
      .select("*")
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        if (data && data.length > 0) {
          setAllClients(
            data.map((row: any) => ({
              id: row.id,
              name: row.name,
              type: row.legal_id_type === "02" || row.legal_id_type === "juridica" ? "juridica" : "fisica",
              legalId: row.legal_id,
              legalIdType: row.legal_id_type || (row.legal_id?.length === 10 ? "02" : "01"),
              email: row.email || "",
              phone: row.phone || "",
              province: row.province || "San José",
              canton: row.canton || "",
              district: row.district || "",
              address: row.address || "",
              city: row.province || row.canton || "San José",
              economicActivity: row.economic_activity || "",
              totalSpent: 0,
              invoices: 0,
            }))
          );
        }
      });
  }, []);

  // Configuración de Hacienda y Ambiente (Staging vs Producción)
  const [ambiente, setAmbiente] = useState<"staging" | "produccion">(() => {
    try {
      const cfg = JSON.parse(localStorage.getItem("facturacr_hacienda_config") || "{}");
      return cfg.ambiente || "staging";
    } catch {
      return "staging";
    }
  });

  const [emisorActivityCode, setEmisorActivityCode] = useState(() => {
    return activeEstablishment?.economic_activity_code || "452001";
  });

  useEffect(() => {
    if (activeEstablishment?.economic_activity_code) {
      setEmisorActivityCode(activeEstablishment.economic_activity_code);
    }
  }, [activeEstablishment?.economic_activity_code]);
  const [docType, setDocType] = useState(() => {
    try {
      const urlType = (search as any)?.type || new URLSearchParams(window.location.search).get("type");
      if (urlType === "01" || urlType === "02" || urlType === "03" || urlType === "04") {
        return urlType;
      }
    } catch {}
    return "01";
  });

  useEffect(() => {
    try {
      const urlType = (search as any)?.type || new URLSearchParams(window.location.search).get("type");
      if (urlType && (urlType === "01" || urlType === "02" || urlType === "03" || urlType === "04")) {
        setDocType(urlType);
      }
    } catch {}
  }, [search]);

  const [saleCondition, setSaleCondition] = useState("01");
  const [creditTerm, setCreditTerm] = useState(30);
  const [paymentMethod, setPaymentMethod] = useState("01");
  const [currency, setCurrency] = useState("CRC");
  const [issueDate, setIssueDate] = useState(new Date().toISOString().slice(0, 16));
  const [notes, setNotes] = useState("");
  const [otherCharges, setOtherCharges] = useState(0);
  const [otherChargesDetail, setOtherChargesDetail] = useState("");

  // Cajas y Consecutivos oficiales (Hacienda CR)
  const [cajas, setCajas] = useState<any[]>([]);
  const [selectedCajaId, setSelectedCajaId] = useState<string>("");

  useEffect(() => {
    async function loadCajas() {
      try {
        let loadedList: any[] = [];

        // 1. Prioridad: Cajas guardadas en localStorage para este establecimiento
        if (activeEstablishment?.id) {
          try {
            const raw = localStorage.getItem(`facturaos_cajas_${activeEstablishment.id}`);
            if (raw) {
              const parsed = JSON.parse(raw);
              if (Array.isArray(parsed) && parsed.length > 0) {
                loadedList = parsed;
              }
            }
          } catch {}
        }

        // 2. Si no hay en localStorage, consultar en Supabase
        if (loadedList.length === 0) {
          const { data, error } = await supabase
            .from("cash_registers")
            .select("*")
            .eq("is_active", true)
            .order("branch_code", { ascending: true })
            .order("terminal_code", { ascending: true });

          if (!error && data && data.length > 0) {
            loadedList = data;
          }
        }

        // 3. Fallback por defecto si no existen
        if (loadedList.length === 0) {
          const defaultCaja = {
            id: `caja-${activeEstablishment?.code || "001"}-1`,
            branch_code: "001",
            branch_name: activeEstablishment?.name || "Casa Matriz",
            terminal_code: "00001",
            terminal_name: "Caja 1 - Principal",
            next_invoice_number: 1,
            next_ticket_number: 1,
            next_credit_note_number: 1,
            next_debit_note_number: 1,
            is_active: true,
          };
          loadedList = [defaultCaja];
        }

        setCajas(loadedList);
        setSelectedCajaId((prev) => (loadedList.some((c) => c.id === prev) ? prev : loadedList[0].id));
      } catch (err) {
        console.error("Error cargando cajas:", err);
      }
    }
    loadCajas();
  }, [activeEstablishment?.id]);

  // Receptor (Inicia en blanco para que el usuario elija o escriba)
  const [clientId, setClientId] = useState<string>("");
  const [recv, setRecv] = useState({
    idType: "01",
    idNumber: "",
    name: "",
    commercialName: "",
    email: "",
    phone: "",
    province: "San José",
    canton: "",
    district: "",
    otherSigns: "",
    economicActivity: "",
  });

  const [buscandoReceptorHacienda, setBuscandoReceptorHacienda] = useState(false);
  const [infoReceptorHacienda, setInfoReceptorHacienda] = useState<TaxpayerInfo | null>(null);

  const handleConsultarReceptorHacienda = async (cedulaToSearch?: string) => {
    const raw = (cedulaToSearch ?? recv.idNumber).trim();
    const clean = raw.replace(/\D/g, "");
    if (clean.length < 9) {
      toast.error("Ingresa al menos 9 dígitos de la cédula para consultar en Hacienda");
      return;
    }

    setBuscandoReceptorHacienda(true);
    try {
      const info = await consultarContribuyenteHacienda(clean);
      if (info && info.nombre) {
        setInfoReceptorHacienda(info);
        let matchedProvince = recv.province;
        const admin = info.situacion?.administracionTributaria?.toLowerCase() || "";
        const provinces = ["San José", "Alajuela", "Cartago", "Heredia", "Guanacaste", "Puntarenas", "Limón"];
        const foundProv = provinces.find((p) => admin.includes(p.toLowerCase()));
        if (foundProv) matchedProvince = foundProv;

        const principalAct = info.actividades?.find((a) => a.tipo === "P" && a.estado === "A") || info.actividades?.find((a) => a.estado === "A") || info.actividades?.[0];

        setRecv((prev) => ({
          ...prev,
          name: info.nombre,
          idType: info.tipoIdentificacion,
          province: matchedProvince,
          economicActivity: principalAct?.codigo || prev.economicActivity || "",
        }));
        toast.success(`Hacienda: "${info.nombre}"`, {
          description: `Régimen: ${info.regimen?.descripcion || "General"} · Estado: ${info.situacion?.estado || "Inscrito"}${principalAct ? ` · Actividad: ${principalAct.codigo}` : ""}`,
        });
      } else {
        setInfoReceptorHacienda(null);
        toast.info("No se encontró información en Hacienda para esta cédula");
      }
    } catch {
      toast.error("Error al consultar en Hacienda");
    } finally {
      setBuscandoReceptorHacienda(false);
    }
  };

  const selectClient = (c: any) => {
    setClientId(c.id);
    setInfoReceptorHacienda(null);
    setRecv({
      idType: c.legalIdType || (c.type === "juridica" ? "02" : "01"),
      idNumber: c.legalId,
      name: c.name,
      commercialName: "",
      email: c.email,
      phone: c.phone || "",
      province: c.province || c.city || "San José",
      canton: c.canton || "",
      district: c.district || "",
      otherSigns: c.address || "",
      economicActivity: c.economicActivity || c.economic_activity || "",
    });
    toast.success(`Cliente "${c.name}" cargado`, {
      description: `Cédula: ${c.legalId}${c.economicActivity ? ` • Actividad: ${c.economicActivity}` : ""}`,
    });
  };

  // Cargar cliente automáticamente si viene por URL (?clientId=...)
  useEffect(() => {
    try {
      const urlClientId = search.clientId || new URLSearchParams(window.location.search).get("clientId");
      if (urlClientId && allClients.length > 0) {
        const found = allClients.find((c) => c.id === urlClientId);
        if (found) {
          selectClient(found);
        }
      }
    } catch {}
  }, [allClients, search.clientId]);

  // Líneas (Inicia con una línea limpia en blanco lista para llenar)
  const [lines, setLines] = useState<Line[]>([emptyLine()]);

  // Modal Buscador CABYS BCCR / Hacienda
  const [isCabysModalOpen, setIsCabysModalOpen] = useState(false);
  const [cabysTargetLineId, setCabysTargetLineId] = useState<string | null>(null);

  const openCabysForLine = (lineId: string) => {
    setCabysTargetLineId(lineId);
    setIsCabysModalOpen(true);
  };

  const handleSelectCabysForLine = (item: CabysItem) => {
    if (!cabysTargetLineId) return;

    // Mapear tarifa de impuesto a código de IVA Hacienda
    let targetIvaCode = "08"; // 13% default
    if (item.impuesto === 0) targetIvaCode = "01";
    else if (item.impuesto === 1) targetIvaCode = "02";
    else if (item.impuesto === 2) targetIvaCode = "03";
    else if (item.impuesto === 4) targetIvaCode = "04";
    else if (item.impuesto === 13) targetIvaCode = "08";

    setLines((prev) =>
      prev.map((l) => {
        if (l.id === cabysTargetLineId) {
          return {
            ...l,
            cabys: item.codigo,
            detail: l.detail.trim() ? l.detail : item.descripcion,
            ivaCode: targetIvaCode,
          };
        }
        return l;
      }),
    );
    toast.success(`Código CABYS ${item.codigo} asignado`, {
      description: `${item.descripcion} • IVA ${item.impuesto}%`,
    });
  };

  // Referencia (NC/ND)
  const isReference = docType === "03" || docType === "02";
  const [ref, setRef] = useState({ type: "01", docKey: "", reason: "" });

  // Cálculos
  const calc = useMemo(() => {
    let subtotal = 0,
      totalDiscount = 0,
      totalTax = 0,
      exonerated = 0,
      exempt = 0,
      taxed = 0;
    const rows = lines.map((l) => {
      const gross = l.qty * l.unitPrice;
      const discount = (gross * l.discountPct) / 100;
      const net = gross - discount;
      const ivaRate = IVA_RATES.find((r) => r.code === l.ivaCode)?.rate ?? 0;
      const baseTax = (net * ivaRate) / 100;
      
      // En Costa Rica (Hacienda CR):
      // Si el porcentaje ingresado es 13 (los 13 puntos de IVA) o 100 (% total), exonera el 100% del IVA (ej: ₡2.457 en ₡18.900)
      let exoneration = 0;
      if (l.hasExemption && l.exemption.pct > 0) {
        if (l.exemption.pct === 100 || l.exemption.pct >= ivaRate) {
          exoneration = baseTax;
        } else {
          exoneration = (net * l.exemption.pct) / 100;
        }
      }
      exoneration = Math.min(exoneration, baseTax);
      const tax = baseTax - exoneration;
      const total = net + tax;

      subtotal += gross;
      totalDiscount += discount;
      totalTax += tax;
      if (ivaRate === 0) exempt += net;
      else if (l.hasExemption && exoneration > 0) exonerated += net;
      else taxed += net;
      return { ...l, gross, discount, net, baseTax, exoneration, tax, total };
    });
    const grandTotal = subtotal - totalDiscount + totalTax + otherCharges;
    return { rows, subtotal, totalDiscount, totalTax, taxed, exempt, exonerated, grandTotal, total: grandTotal };
  }, [lines, otherCharges]);

  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalData, setModalData] = useState<{
    isOpen: boolean;
    mode: "preview" | "emitted";
    clave: string;
    consecutivo: string;
    xml: string;
    total: number;
    docNumber: string;
  } | null>(null);
  const [isCopied, setIsCopied] = useState(false);

  const fxRate = CURRENCIES.find((c) => c.code === currency)?.rate ?? 1;

  const getDocPrefix = (type: string) => {
    switch (type) {
      case "01":
        return "FE";
      case "04":
        return "TE";
      case "03":
        return "NC";
      case "02":
        return "ND";
      case "09":
        return "FEE";
      case "08":
        return "FEC";
      default:
        return "DOC";
    }
  };

  const updateLine = (id: string, patch: Partial<Line>) =>
    setLines((ls) => ls.map((l) => (l.id === id ? { ...l, ...patch } : l)));

  const activeCaja = useMemo(() => {
    return (
      cajas.find((c) => c.id === selectedCajaId) ||
      cajas[0] || {
        id: "default-caja",
        branch_code: "001",
        branch_name: "Casa Matriz",
        terminal_code: "00001",
        terminal_name: "Caja 1 - Principal",
        next_invoice_number: 1,
        next_ticket_number: 1,
        next_credit_note_number: 1,
        next_debit_note_number: 1,
      }
    );
  }, [cajas, selectedCajaId]);

  const currentSequenceNumber = useMemo(() => {
    if (!activeCaja) return 1;
    switch (docType) {
      case "01":
        return activeCaja.next_invoice_number || 1;
      case "04":
        return activeCaja.next_ticket_number || 1;
      case "03":
        return activeCaja.next_credit_note_number || 1;
      case "02":
        return activeCaja.next_debit_note_number || 1;
      default:
        return activeCaja.next_invoice_number || 1;
    }
  }, [activeCaja, docType]);

  const buildInvoiceXml = () => {
    const sucursalNum = parseInt(activeCaja.branch_code || "1", 10);
    const terminalNum = parseInt(activeCaja.terminal_code || "1", 10);
    const secuenciaNum = currentSequenceNumber;

    const consecutivo = generarConsecutivo({
      sucursal: sucursalNum,
      terminal: terminalNum,
      tipoDocumento: (docType as TipoDocumento) || "01",
      secuencia: secuenciaNum,
    });

    const emisorLegalId = (activeEstablishment?.legal_id || "3101483899").replace(/\D/g, "");
    const clave = generarClave({
      cedulaEmisor: emisorLegalId,
      consecutivo,
      fecha: new Date(issueDate || Date.now()),
    });

    const isTiquete = docType === "04";
    const receptorPayload =
      isTiquete && !recv.idNumber && !recv.name
        ? undefined
        : {
            nombre: recv.name || (isTiquete ? "Consumidor Final" : "Cliente"),
            tipoIdentificacion: recv.idNumber
              ? ((recv.idType as "01" | "02" | "03" | "04") || "02")
              : undefined,
            numeroIdentificacion: recv.idNumber || undefined,
            correo: recv.email || "facturacion@cliente.cr",
          };

    const xmlRaw = construirXmlHacienda({
      clave,
      consecutivo,
      fechaEmision: new Date(issueDate || Date.now()),
      tipoDocumento: (docType as TipoDocumento) || "01",
      emisor: {
        nombre: activeEstablishment?.name || "Grupo G3",
        tipoIdentificacion: (activeEstablishment?.legal_id_type as any) || (emisorLegalId.length === 10 ? "02" : "01"),
        numeroIdentificacion: emisorLegalId,
        correo: activeEstablishment?.email || "facturacion@grupogtres.com",
      },
      receptor: receptorPayload,
      codigoActividad: (emisorActivityCode?.replace(".", "") === "62090" ? "620901" : emisorActivityCode?.replace(".", "")) || activeEstablishment?.economic_activity_code || "452001",
      condicionVenta: (saleCondition as "01" | "02") || "01",
      mediosPago: [paymentMethod as "01"],
      moneda: (currency as "CRC" | "USD") || "CRC",
      tipoCambio: fxRate,
      lineas: calc.rows.map((r, i) => ({
        numeroLinea: i + 1,
        codigoCabys: r.cabys || "8311100000000",
        detalle: r.detail || "Servicios profesionales",
        unidadMedida: r.unit || "Unid",
        cantidad: r.qty,
        precioUnitario: r.unitPrice,
        montoTotal: r.gross,
        descuento: r.discount > 0 ? { monto: r.discount } : undefined,
        subtotal: r.net,
        impuesto: {
          codigo: "01",
          codigoTarifa: (r.ivaCode as "01" | "02" | "08") || "08",
          tarifa: IVA_RATES.find((x) => x.code === r.ivaCode)?.rate || 13,
          monto: r.tax,
          exoneracion:
            r.hasExemption && r.exoneration > 0
              ? {
                  tipoDocumento: r.exemption.type || "04",
                  numeroDocumento: r.exemption.docNumber || "EX-0001",
                  nombreInstitucion: r.exemption.institution || "Ministerio de Hacienda",
                  fechaEmision: r.exemption.date || new Date().toISOString().slice(0, 10),
                  porcentajeExoneracion: r.exemption.pct,
                  montoExoneracion: r.exoneration,
                }
              : undefined,
        },
        montoTotalLinea: r.total,
      })),
      resumen: {
        totalServGravados: calc.taxed,
        totalServExentos: calc.exempt,
        totalMercanciasGravadas: 0,
        totalMercanciasExentas: 0,
        totalGravado: calc.taxed,
        totalExento: calc.exempt,
        totalVenta: calc.subtotal,
        totalDescuentos: calc.totalDiscount,
        totalVentaNeta: calc.subtotal - calc.totalDiscount,
        totalImpuesto: calc.totalTax,
        totalComprobante: calc.grandTotal,
      },
      informacionReferencia:
        isReference && ref.docKey.trim()
          ? [
              {
                tipoDocumento: "01",
                numeroDocumento: ref.docKey.trim(),
                fechaEmision: new Date(),
                codigo: ref.type,
                razon:
                  ref.reason.trim() ||
                  (REF_TYPES.find((r) => r.code === ref.type)?.label || "Ajuste contable"),
              },
            ]
          : undefined,
    });

    const xmlFirmado = firmarXmlHacienda({ xmlSinFirmar: xmlRaw });
    return { clave, consecutivo, xml: xmlFirmado };
  };

  const handlePreview = () => {
    const { clave, consecutivo, xml } = buildInvoiceXml();
    const prefix = getDocPrefix(docType);
    setModalData({
      isOpen: true,
      mode: "preview",
      clave,
      consecutivo,
      xml,
      total: calc.grandTotal,
      docNumber: `${prefix}-${consecutivo.slice(-6)}`,
    });
  };

  const handleSaveDraft = () => {
    toast.success("Borrador guardado exitosamente");
    navigate({ to: "/app/invoices" });
  };

  const handleEmit = () => {
    // Validación de Hacienda para Factura Electrónica (01)
    if (docType === "01") {
      if (!recv.idNumber || !recv.name) {
        toast.error("Datos incompletos para Factura Electrónica (01)", {
          description:
            "Hacienda CR exige Cédula y Nombre/Razón Social del receptor. Si es una venta a consumidor final, selecciona 'Tiquete Electrónico (04)'.",
        });
        return;
      }
    }

    // Validación obligatoria de Referencia para Nota de Crédito (03) y Nota de Débito (02)
    if (isReference) {
      if (!ref.docKey.trim()) {
        toast.error("Datos de referencia incompletos", {
          description:
            "Hacienda exige indicar la Clave numérica oficial de 50 dígitos del comprobante original referenciado.",
        });
        return;
      }
    }

    setIsSubmitting(true);
    setTimeout(async () => {
      setIsSubmitting(false);
      const { clave, consecutivo, xml } = buildInvoiceXml();
      const prefix = getDocPrefix(docType);
      const docNumber = `${prefix}-${consecutivo.slice(-6)}`;

      // 1. Incrementar el consecutivo en la caja de Hacienda correspondiente
      try {
        let updateCol = "next_invoice_number";
        if (docType === "04") updateCol = "next_ticket_number";
        else if (docType === "03") updateCol = "next_credit_note_number";
        else if (docType === "02") updateCol = "next_debit_note_number";

        const nextNum = currentSequenceNumber + 1;
        if (activeCaja.id && activeCaja.id !== "default-caja") {
          await supabase
            .from("cash_registers")
            .update({ [updateCol]: nextNum })
            .eq("id", activeCaja.id);
        }

        const updatedCajas = cajas.map((c) => (c.id === activeCaja.id ? { ...c, [updateCol]: nextNum } : c));
        setCajas(updatedCajas);
        if (activeEstablishment?.id) {
          localStorage.setItem(`facturaos_cajas_${activeEstablishment.id}`, JSON.stringify(updatedCajas));
        }
      } catch (e) {
        console.error("Error incrementando consecutivo en caja:", e);
      }

      // 2. Guardar en Supabase para que aparezca en el listado de facturas
      try {
        const clientName = recv.name || (docType === "04" ? "Consumidor Final" : "Cliente General");
        const clientLegalId = recv.idNumber || "";

        const { error } = await supabase.from("invoices").insert({
          clave: clave,
          consecutive_number: docNumber,
          issue_date: new Date().toISOString(),
          status: "aceptada",
          total: calc.grandTotal,
          subtotal: calc.subtotal,
          tax_total: calc.totalTax,
          client_name: clientName,
          client_legal_id: clientLegalId,
          items: calc.rows,
          payment_method: paymentMethod,
          currency: currency,
          exchange_rate: 1,
          notes: notes,
          establishment_id: activeEstablishment?.id,
          app_name: activeEstablishment?.app_name || activeEstablishment?.name || "Grupo G Tres",
        });

        if (error) {
          console.error("Error guardando factura en Supabase:", error);
          // Fallback a localStorage si Supabase falla
          const newInvoice = {
            id: `inv-${Date.now()}`,
            number: docNumber,
            haciendaKey: clave,
            client: { name: clientName, email: recv.email || "cliente@correo.cr" },
            type: prefix,
            date: new Date().toISOString().split("T")[0],
            status: "aceptada",
            total: calc.grandTotal,
            xml,
          };
          const existing = JSON.parse(localStorage.getItem("facturacr_emitted_invoices") || "[]");
          localStorage.setItem("facturacr_emitted_invoices", JSON.stringify([newInvoice, ...existing]));
        }
      } catch (err) {
        console.error("Error al guardar factura:", err);
      }

      setModalData({
        isOpen: true,
        mode: "emitted",
        clave,
        consecutivo,
        xml,
        total: calc.grandTotal,
        docNumber,
      });
      toast.success(
        docType === "04"
          ? "¡Tiquete Electrónico emitido con éxito!"
          : "¡Factura Electrónica emitida con éxito!",
        {
          description: `Clave oficial generada para Sucursal ${activeCaja.branch_code} · Terminal ${activeCaja.terminal_code} · Consecutivo #${currentSequenceNumber}.`,
        },
      );
    }, 1200);
  };

  const handleCopyClave = (clave: string) => {
    navigator.clipboard.writeText(clave);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleDownloadXml = (docNum: string, xmlContent: string) => {
    const blob = new Blob([xmlContent], { type: "application/xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${docNum}_firmado_hacienda.xml`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-16">
      {/* Topbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          to="/app/invoices"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Volver a facturas
        </Link>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handlePreview}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium hover:bg-muted transition-colors"
          >
            <Eye className="h-4 w-4" /> Previsualizar
          </button>
          <button
            type="button"
            onClick={handleSaveDraft}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium hover:bg-muted transition-colors"
          >
            <Save className="h-4 w-4" /> Guardar borrador
          </button>
          <button
            type="button"
            onClick={handleEmit}
            disabled={isSubmitting}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-2 text-sm font-medium text-primary-foreground shadow-soft hover:opacity-95 transition-all disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Emitiendo...
              </>
            ) : (
              <>
                <Send className="h-4 w-4" /> Emitir y enviar a Hacienda
              </>
            )}
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight">
            Nuevo comprobante electrónico
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Completá los datos según los requerimientos de la Dirección General de Tributación (v4.4 v2).
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div
            className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-xs shadow-sm ${
              ambiente === "staging"
                ? "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300"
                : "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
            }`}
          >
            <span
              className={`h-2.5 w-2.5 rounded-full ${
                ambiente === "staging" ? "bg-amber-500 animate-pulse" : "bg-emerald-500"
              }`}
            />
            <span className="font-semibold">
              {ambiente === "staging" ? "Modo Pruebas / Sandbox" : "Ambiente Producción"}
            </span>
            <span className="text-muted-foreground">
              {ambiente === "staging" ? "• Cero efecto tributario" : "• Emisión Oficial Real"}
            </span>
          </div>

          <Link
            to="/app/settings"
            className="rounded-lg border border-border bg-card px-2.5 py-2 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            title="Cambiar entre modo Pruebas y Producción en Configuración"
          >
            Cambiar
          </Link>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Columna principal */}
        <div className="space-y-6 lg:col-span-2">
          {/* 1. Datos del documento */}
          <Section icon={FileText} title="Datos del documento" subtitle="Tipo de comprobante, condición y moneda">
            {/* Selector Rápido FE vs TE */}
            <div className="mb-4 space-y-3">
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Selecciona el Tipo de Comprobante
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setDocType("01")}
                  className={`flex items-start gap-3 p-3.5 rounded-xl border text-left transition-all ${
                    docType === "01"
                      ? "border-primary bg-primary/10 ring-2 ring-primary/20"
                      : "border-border bg-card hover:bg-muted/60"
                  }`}
                >
                  <div className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${docType === "01" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                    <FileText className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-foreground">Factura Electrónica (FE)</span>
                      <span className="rounded bg-primary/20 px-1.5 py-0.2 text-[10px] font-bold text-primary font-mono">01</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Para empresas y contribuyentes. <strong>Requiere Cédula</strong> y otorga <strong>Crédito Fiscal de IVA</strong> y deducción de renta.
                    </p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setDocType("04");
                    // Auto sugerir Consumidor Final si no hay cliente seleccionado
                    if (!recv.name || recv.idNumber === defaultClients[0]?.legalId) {
                      setRecv((r) => ({
                        ...r,
                        name: "Consumidor Final",
                        idNumber: "",
                        email: "",
                      }));
                    }
                  }}
                  className={`flex items-start gap-3 p-3.5 rounded-xl border text-left transition-all ${
                    docType === "04"
                      ? "border-emerald-500 bg-emerald-500/10 ring-2 ring-emerald-500/20"
                      : "border-border bg-card hover:bg-muted/60"
                  }`}
                >
                  <div className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${docType === "04" ? "bg-emerald-600 text-white" : "bg-muted text-muted-foreground"}`}>
                    <FileCode className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-foreground">Tiquete Electrónico (TE)</span>
                      <span className="rounded bg-emerald-100 dark:bg-emerald-950/60 px-1.5 py-0.2 text-[10px] font-bold text-emerald-700 dark:text-emerald-300 font-mono">04</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Para <strong>Consumidor Final</strong> / mostrador. <strong>Cédula opcional</strong>. No genera crédito fiscal de IVA para el comprador.
                    </p>
                  </div>
                </button>
              </div>

              {/* Otros tipos opcionales */}
              {docType !== "01" && docType !== "04" && (
                <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-300">
                  Documento seleccionado: <strong>{DOC_TYPES.find((d) => d.code === docType)?.label}</strong>
                </div>
              )}
            </div>

            {/* Punto de emisión (Caja / Terminal) */}
            <div className="mb-4 rounded-xl border border-blue-500/20 bg-blue-500/5 dark:bg-blue-950/20 p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-blue-600/10 text-blue-600 dark:text-blue-400">
                  <Store className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-foreground">Punto de Emisión (Caja / Terminal)</span>
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-mono font-bold">
                      Próximo: #{currentSequenceNumber}
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Sucursal <strong>{activeCaja.branch_code}</strong> • Terminal <strong>{activeCaja.terminal_code}</strong> ({activeCaja.terminal_name})
                  </p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full sm:w-auto">
                <div className="flex items-center gap-2 bg-background/90 dark:bg-card/90 p-1.5 rounded-xl border border-blue-500/30 shadow-2xs">
                  <span className="text-[11px] font-bold text-foreground pl-1 whitespace-nowrap">
                    Caja:
                  </span>
                  <select
                    value={selectedCajaId}
                    onChange={(e) => {
                      const newId = e.target.value;
                      setSelectedCajaId(newId);
                      const picked = cajas.find((c) => c.id === newId);
                      if (picked) {
                        const nameLower = (picked.terminal_name || "").toLowerCase();
                        if (picked.terminal_code === "00001" || nameLower.includes("wash") || nameLower.includes("lavacar")) {
                          setEmisorActivityCode("452001");
                          toast.info("Caja cambiada a: " + picked.terminal_name, {
                            description: "Actividad asignada: 452001 (Lavado / Car Wash)",
                          });
                        } else if (picked.terminal_code === "00002" || nameLower.includes("aval")) {
                          setEmisorActivityCode("829900");
                          toast.info("Caja cambiada a: " + picked.terminal_name, {
                            description: "Actividad asignada: 829900 (Servicios y Avalúos)",
                          });
                        }
                      }
                    }}
                    className="text-xs rounded-lg border border-primary/40 bg-background px-3 py-1.5 font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-primary shadow-xs cursor-pointer min-w-[210px]"
                  >
                    {cajas.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.terminal_name} (Terminal {c.terminal_code})
                      </option>
                    ))}
                  </select>
                </div>

                <Link
                  to="/app/cajas"
                  className="text-xs font-semibold text-primary hover:underline whitespace-nowrap text-right sm:text-left"
                  title="Configurar cajas y numeración de Hacienda"
                >
                  Mantenimiento de cajas →
                </Link>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 pt-2 border-t border-border">
              <Field label="Todos los tipos de documento">
                <Select
                  value={docType}
                  onChange={setDocType}
                  options={DOC_TYPES.map((d) => ({ value: d.code, label: d.label }))}
                />
              </Field>
              <Field label="Fecha y hora de emisión" required>
                <input
                  type="datetime-local"
                  value={issueDate}
                  onChange={(e) => setIssueDate(e.target.value)}
                  className={inputCls}
                />
              </Field>
              <Field label="Condición de venta" required>
                <Select
                  value={saleCondition}
                  onChange={setSaleCondition}
                  options={SALE_CONDITIONS.map((d) => ({ value: d.code, label: d.label }))}
                />
              </Field>
              {saleCondition === "02" ? (
                <Field label="Plazo de crédito (días)" required>
                  <input
                    type="number"
                    min={1}
                    value={creditTerm}
                    onChange={(e) => setCreditTerm(+e.target.value)}
                    className={inputCls}
                  />
                </Field>
              ) : (
                <Field label="Medio de pago" required>
                  <Select
                    value={paymentMethod}
                    onChange={setPaymentMethod}
                    options={PAYMENT_METHODS.map((d) => ({ value: d.code, label: d.label }))}
                  />
                </Field>
              )}
              <Field label="Moneda" required>
                <Select
                  value={currency}
                  onChange={setCurrency}
                  options={CURRENCIES.map((d) => ({ value: d.code, label: d.label }))}
                />
              </Field>
              <Field label="Tipo de cambio (CRC)">
                <input
                  type="number"
                  step="0.01"
                  value={fxRate}
                  readOnly={currency === "CRC"}
                  className={inputCls + " bg-muted/40"}
                />
              </Field>
              <div className="md:col-span-2">
                <Field label="Tu Actividad Económica Emisor (Hacienda CR)" required>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                    <input
                      value={emisorActivityCode}
                      onChange={(e) => setEmisorActivityCode(e.target.value)}
                      maxLength={8}
                      placeholder="6209.0"
                      className={inputCls + " font-mono text-xs max-w-[140px] font-bold"}
                      title="Actividad económica registrada ante Tributación (ej: 6209.0)"
                    />
                    <div className="text-xs text-muted-foreground flex items-center gap-1.5 bg-muted/40 px-3 py-2 rounded-lg border border-border/60">
                      <span className="font-bold text-foreground font-mono">6209.0:</span>
                      <span>Otras actividades de la tecnología de información y servicio informáticos</span>
                    </div>
                  </div>
                </Field>
              </div>
            </div>
          </Section>

          {/* 2. Receptor */}
          <Section
            icon={User}
            title={docType === "04" ? "Receptor (Opcional en Tiquete)" : "Receptor (Cliente)"}
            subtitle={
              docType === "04"
                ? "En Tiquete Electrónico podés vender a Consumidor Final sin cédula."
                : "Datos fiscales obligatorios según Hacienda CR."
            }
          >
            {/* Banner explicativo y botón rápido para Tiquete */}
            {docType === "04" ? (
              <div className="mb-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <p className="text-xs font-semibold text-emerald-800 dark:text-emerald-200 flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" /> Tiquete Electrónico a Consumidor Final
                  </p>
                  <p className="text-[11px] text-emerald-700 dark:text-emerald-300">
                    No necesitas cédula ni nombre. Si el cliente pide correo para copia, podés indicarlo abajo.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setClientId("");
                    setRecv({
                      idType: "01",
                      idNumber: "",
                      name: "Consumidor Final",
                      commercialName: "",
                      email: "",
                      phone: "",
                      province: "San José",
                      canton: "",
                      district: "",
                      otherSigns: "",
                      economicActivity: "",
                    });
                    toast.success("Cliente configurado como Consumidor Final (Sin Cédula)");
                  }}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 transition-colors shrink-0 shadow-xs"
                >
                  <User className="h-3.5 w-3.5" /> Venta a Consumidor Final
                </button>
              </div>
            ) : (
              <div className="mb-4 rounded-xl border border-primary/20 bg-primary/5 p-3 flex items-center gap-2 text-xs text-primary">
                <Info className="h-4 w-4 shrink-0" />
                <span>
                  <strong>Factura Electrónica (01):</strong> La Cédula y Razón Social son requeridas por Hacienda para otorgar crédito fiscal de IVA.
                </span>
              </div>
            )}

            {/* Selector de Cliente Existente */}
            <div className="mb-4 space-y-2">
              <label className="block text-xs font-semibold text-muted-foreground">
                Buscar o Seleccionar Cliente Registrado
              </label>
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <select
                    value={clientId}
                    onChange={(e) => {
                      const c = allClients.find((x) => x.id === e.target.value);
                      if (c) {
                        selectClient(c);
                      } else {
                        setClientId("");
                        setRecv({
                          idType: "01",
                          idNumber: "",
                          name: "",
                          commercialName: "",
                          email: "",
                          phone: "",
                          province: "San José",
                          canton: "",
                          district: "",
                          otherSigns: "",
                          economicActivity: "",
                        });
                      }
                    }}
                    className={inputCls + " pl-9 font-medium"}
                  >
                    <option value="">-- Seleccionar cliente registrado ({allClients.length} disponibles) --</option>
                    {allClients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} · Cédula: {c.legalId} {c.email ? `(${c.email})` : ""}
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setClientId("");
                    setRecv({
                      idType: "01",
                      idNumber: "",
                      name: "",
                      commercialName: "",
                      email: "",
                      phone: "",
                      province: "San José",
                      canton: "",
                      district: "",
                      otherSigns: "",
                      economicActivity: "",
                    });
                    toast.info("Formulario de cliente limpiado");
                  }}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-xs font-medium hover:bg-muted transition-colors shrink-0"
                  title="Limpiar campos para escribir un cliente nuevo"
                >
                  <Plus className="h-3.5 w-3.5" /> Limpiar / Nuevo
                </button>
              </div>
            </div>

            {/* Ficha de cliente seleccionado */}
            {recv.name && recv.idNumber && (
              <div className="mb-4 rounded-xl border border-primary/30 bg-primary/10 p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-primary text-primary-foreground font-bold text-xs">
                    {recv.idType === "02" ? "CJ" : "CF"}
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      {recv.name}
                    </p>
                    <p className="text-[11px] text-muted-foreground font-mono">
                      {recv.idType === "02" ? "Cédula Jurídica" : "Cédula Física"}: <strong className="text-foreground">{recv.idNumber}</strong>
                      {recv.email && ` • ${recv.email}`}
                      {recv.phone && ` • ${recv.phone}`}
                    </p>
                  </div>
                </div>
                <span className="rounded bg-emerald-100 dark:bg-emerald-950/60 px-2 py-0.5 text-[11px] font-medium text-emerald-700 dark:text-emerald-300 self-start sm:self-center">
                  Datos vinculados
                </span>
              </div>
            )}

            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Tipo de identificación" required={docType === "01"}>
                <Select
                  value={recv.idType}
                  onChange={(v) => setRecv({ ...recv, idType: v })}
                  options={ID_TYPES.map((d) => ({ value: d.code, label: d.label }))}
                />
              </Field>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-muted-foreground">
                    Número de identificación {docType === "01" && <span className="text-destructive">*</span>}
                  </label>
                  <button
                    type="button"
                    onClick={() => handleConsultarReceptorHacienda()}
                    disabled={buscandoReceptorHacienda || recv.idNumber.replace(/\D/g, "").length < 9}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline disabled:opacity-40 disabled:no-underline"
                  >
                    {buscandoReceptorHacienda ? (
                      <>
                        <Loader2 className="h-3 w-3 animate-spin text-primary" /> Consultando...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-3 w-3 text-amber-500" /> Consultar Hacienda
                      </>
                    )}
                  </button>
                </div>
                <div className="relative">
                  <input
                    value={recv.idNumber}
                    onChange={(e) => {
                      const val = e.target.value;
                      setRecv((prev) => ({ ...prev, idNumber: val }));
                      const clean = val.replace(/\D/g, "");
                      if (clean.length === 10) {
                        setRecv((prev) => ({ ...prev, idType: "02", idNumber: val }));
                        handleConsultarReceptorHacienda(val);
                      } else if (clean.length === 9) {
                        setRecv((prev) => ({ ...prev, idType: "01", idNumber: val }));
                        handleConsultarReceptorHacienda(val);
                      }
                    }}
                    onBlur={() => {
                      if (recv.idNumber.replace(/\D/g, "").length >= 9 && !recv.name) {
                        handleConsultarReceptorHacienda();
                      }
                    }}
                    className={inputCls}
                    placeholder={docType === "04" ? "Opcional para Tiquete" : "3-101-123456"}
                  />
                  {buscandoReceptorHacienda && (
                    <div className="absolute right-2.5 top-1/2 -translate-y-1/2">
                      <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    </div>
                  )}
                </div>
              </div>

              {infoReceptorHacienda && (
                <div className="md:col-span-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-2.5 text-xs text-emerald-800 dark:text-emerald-200 flex items-center justify-between">
                  <span className="font-semibold flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                    Hacienda: {infoReceptorHacienda.nombre} ({infoReceptorHacienda.situacion?.estado || "Inscrito"})
                  </span>
                  <span className="rounded bg-emerald-600/20 text-emerald-800 dark:text-emerald-200 px-1.5 py-0.5 text-[10px] font-bold">
                    {infoReceptorHacienda.tipoLabel}
                  </span>
                </div>
              )}

              <Field label="Nombre / razón social" required={docType === "01"}>
                <input
                  value={recv.name}
                  onChange={(e) => setRecv({ ...recv, name: e.target.value })}
                  className={inputCls}
                  placeholder={docType === "04" ? "Consumidor Final" : "Nombre del Cliente"}
                />
              </Field>
              <Field label="Nombre comercial">
                <input
                  value={recv.commercialName}
                  onChange={(e) => setRecv({ ...recv, commercialName: e.target.value })}
                  className={inputCls}
                />
              </Field>
              <Field label="Correo electrónico" required={docType === "01"}>
                <input
                  type="email"
                  value={recv.email}
                  onChange={(e) => setRecv({ ...recv, email: e.target.value })}
                  className={inputCls}
                  placeholder="cliente@correo.cr"
                />
              </Field>
              <Field label="Teléfono">
                <input
                  value={recv.phone}
                  onChange={(e) => setRecv({ ...recv, phone: e.target.value })}
                  className={inputCls}
                />
              </Field>
              <Field label="Actividad económica receptor (Opcional)">
                {infoReceptorHacienda?.actividades && infoReceptorHacienda.actividades.length > 0 ? (
                  <select
                    value={recv.economicActivity}
                    onChange={(e) => setRecv({ ...recv, economicActivity: e.target.value })}
                    className={inputCls}
                  >
                    <option value="">-- Sin actividad / Opcional --</option>
                    {infoReceptorHacienda.actividades.map((act) => (
                      <option key={act.codigo} value={act.codigo}>
                        {act.codigo} - {act.descripcion} ({act.tipo === "P" ? "Principal" : "Secundaria"})
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    value={recv.economicActivity}
                    onChange={(e) => setRecv({ ...recv, economicActivity: e.target.value })}
                    className={inputCls}
                    placeholder="Opcional (ej: 620101)"
                  />
                )}
              </Field>
              <Field label="Provincia">
                <Select
                  value={recv.province}
                  onChange={(v) => setRecv({ ...recv, province: v })}
                  options={PROVINCES.map((p) => ({ value: p, label: p }))}
                />
              </Field>
              <Field label="Cantón">
                <input
                  value={recv.canton}
                  onChange={(e) => setRecv({ ...recv, canton: e.target.value })}
                  className={inputCls}
                />
              </Field>
              <Field label="Distrito">
                <input
                  value={recv.district}
                  onChange={(e) => setRecv({ ...recv, district: e.target.value })}
                  className={inputCls}
                />
              </Field>
              <div className="md:col-span-2">
                <Field label="Otras señas">
                  <input
                    value={recv.otherSigns}
                    onChange={(e) => setRecv({ ...recv, otherSigns: e.target.value })}
                    className={inputCls}
                    placeholder="200 m sur del parque central, casa amarilla"
                  />
                </Field>
              </div>
            </div>
          </Section>

          {/* 3. Líneas de detalle */}
          <Section
            icon={Package}
            title="Detalle de bienes y servicios"
            subtitle="CABYS, cantidad, impuestos y exoneraciones"
          >
            <div className="space-y-3">
              {calc.rows.map((l, idx) => (
                <LineItem
                  key={l.id}
                  index={idx + 1}
                  line={l}
                  companyCabys={companyCabys}
                  availableProducts={allProducts}
                  onChange={(p) => updateLine(l.id, p)}
                  onOpenCabys={() => openCabysForLine(l.id)}
                  onRemove={() => setLines((ls) => ls.filter((x) => x.id !== l.id))}
                />
              ))}
              <button
                onClick={() => setLines((l) => [...l, emptyLine()])}
                className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-muted/30 px-3 py-3 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <Plus className="h-4 w-4" /> Agregar línea
              </button>
            </div>
          </Section>

          {/* 4. Otros cargos y observaciones */}
          <Section icon={Info} title="Otros cargos y observaciones">
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Detalle otros cargos">
                <input
                  value={otherChargesDetail}
                  onChange={(e) => setOtherChargesDetail(e.target.value)}
                  className={inputCls}
                  placeholder="Flete, servicio, propina, etc."
                />
              </Field>
              <Field label="Monto otros cargos">
                <input
                  type="number"
                  min={0}
                  value={otherCharges}
                  onChange={(e) => setOtherCharges(+e.target.value)}
                  className={inputCls + " tabular-nums"}
                />
              </Field>
              <div className="md:col-span-2">
                <Field label="Observaciones / notas">
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                    className={inputCls + " min-h-[80px] py-2"}
                    placeholder="Información adicional visible en el PDF (máx. 500 caracteres)"
                  />
                </Field>
              </div>
            </div>
          </Section>

          {/* 5. Referencia (solo NC/ND) */}
          {isReference && (
            <Section
              icon={FileText}
              title="Documento de referencia"
              subtitle="Requerido para notas de crédito y débito según normativa de Hacienda"
            >
              <div className="space-y-4">
                {recentInvoices.length > 0 && (
                  <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
                    <label className="block text-xs font-semibold text-primary mb-1.5">
                      ⚡ Seleccionar comprobante original para vincular automáticamente:
                    </label>
                    <select
                      onChange={(e) => {
                        const inv = recentInvoices.find(
                          (i) => i.id === e.target.value || i.clave === e.target.value,
                        );
                        if (inv) {
                          setRef((r) => ({
                            ...r,
                            docKey: inv.clave || "",
                            reason: `Anulación de factura ${inv.consecutive_number || ""}`,
                          }));
                          if (Array.isArray(inv.items) && inv.items.length > 0) {
                            setLines(
                              inv.items.map((it: any) => ({
                                id: crypto.randomUUID(),
                                productId: "",
                                cabys: it.cabys || it.cabys_code || "8313200000100",
                                code: it.code || "",
                                detail: it.detail || it.name || "Servicio",
                                unit: it.unit || "Unid",
                                qty: Number(it.qty || it.quantity) || 1,
                                unitPrice: Number(it.unitPrice || it.unit_price) || 0,
                                discountPct: 0,
                                discountReason: "",
                                ivaCode: "08",
                                hasExemption: false,
                                exemption: {
                                  type: "04",
                                  docNumber: "",
                                  institution: "Ministerio de Hacienda",
                                  date: new Date().toISOString().slice(0, 10),
                                  pct: 100,
                                },
                              })),
                            );
                          }
                          toast.success(`Factura vinculada: ${inv.consecutive_number || inv.clave.slice(-6)}`, {
                            description: `Clave oficial de 50 dígitos vinculada con éxito.`,
                          });
                        }
                      }}
                      className={inputCls + " font-medium text-xs"}
                      defaultValue=""
                    >
                      <option value="" disabled>
                        -- Elegir factura a anular o corregir --
                      </option>
                      {recentInvoices.map((inv) => (
                        <option key={inv.id} value={inv.id}>
                          {inv.consecutive_number || "Doc"} · {inv.client_name || "Cliente"} · {formatCRC(inv.total)} (Clave: ...{inv.clave?.slice(-12)})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="Tipo de referencia" required>
                    <Select
                      value={ref.type}
                      onChange={(v) => setRef({ ...ref, type: v })}
                      options={REF_TYPES.map((d) => ({ value: d.code, label: d.label }))}
                    />
                  </Field>
                  <Field label="Clave numérica (50 dígitos)" required>
                    <input
                      value={ref.docKey}
                      onChange={(e) => setRef({ ...ref, docKey: e.target.value })}
                      className={inputCls + " font-mono text-xs"}
                      maxLength={50}
                      placeholder="506..."
                    />
                  </Field>
                  <div className="md:col-span-2">
                    <Field label="Razón / motivo" required>
                      <input
                        value={ref.reason}
                        onChange={(e) => setRef({ ...ref, reason: e.target.value })}
                        placeholder="Ej: Corrección por error material en datos de factura original"
                        className={inputCls}
                      />
                    </Field>
                  </div>

                  {["13", "14", "15"].includes(ref.type) && (
                    <div className="md:col-span-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-300 space-y-1">
                      <div className="font-semibold flex items-center gap-1.5">
                        <Info className="h-4 w-4 shrink-0" />
                        Normativa Hacienda (Vigencia 1 de Noviembre - Versión 4.4 v2):
                      </div>
                      <p className="text-[11px] leading-relaxed">
                        El código <strong>{ref.type}</strong> tipifica una corrección por <em>error material</em>. Su efecto fiscal y contable debe imputarse al <strong>periodo de emisión del comprobante original</strong> en la Declaración D-104 de Tributación.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </Section>
          )}
        </div>

        {/* Resumen lateral */}
        <div className="space-y-6">
          <Section icon={Calculator} title="Resumen de totales">
            <dl className="space-y-2 text-sm">
              <Row label="Servicios gravados" value={formatCRC(calc.taxed)} />
              <Row label="Servicios exentos" value={formatCRC(calc.exempt)} />
              <Row label="Total descuentos" value={`-${formatCRC(calc.totalDiscount)}`} muted />
              <Row label="Subtotal neto" value={formatCRC(calc.subtotal)} />
              <Row label="Total IVA" value={formatCRC(calc.totalTax)} />
              {calc.exonerated > 0 && (
                <Row label="Total exonerado" value={`-${formatCRC(calc.exonerated)}`} muted />
              )}
              {otherCharges > 0 && (
                <Row label="Otros cargos" value={formatCRC(otherCharges)} />
              )}
              <div className="border-t border-border pt-3">
                <div className="flex items-baseline justify-between">
                  <dt className="text-base font-semibold">Total a pagar</dt>
                  <dd className="text-xl font-bold text-primary tabular-nums">
                    {formatCRC(calc.grandTotal)}
                  </dd>
                </div>
              </div>
            </dl>

            <div className="mt-6 flex flex-col gap-2">
              <button
                onClick={handleEmit}
                disabled={isSubmitting}
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary py-2.5 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 transition-all disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Emitiendo a Hacienda...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    Emitir comprobante electrónico
                  </>
                )}
              </button>
              <button
                onClick={handlePreview}
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-border bg-background py-2.5 text-sm font-medium hover:bg-muted transition-colors"
              >
                <Eye className="h-4 w-4" /> Vista previa y XML
              </button>
            </div>
          </Section>
        </div>
      </div>

      {/* Modal Visor XML / Resumen de Emisión */}
      {modalData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-2xl border border-border bg-card shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between border-b border-border px-6 py-4 bg-muted/20">
              <div className="flex items-center gap-2.5">
                <div className="grid h-9 w-9 place-items-center rounded-lg bg-primary/10 text-primary">
                  <FileText className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-foreground">
                    {modalData.mode === "preview" ? "Vista Previa del Documento Electrónico" : "¡Comprobante Emitido Exitosamente!"}
                  </h3>
                  <p className="text-xs text-muted-foreground font-mono">
                    Clave: {modalData.clave}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setModalData(null)}
                className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              <div className="rounded-xl border border-border bg-muted/40 p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Detalles de Generación
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleCopyClave(modalData.clave)}
                      className="inline-flex items-center gap-1 rounded bg-background px-2 py-0.5 text-xs font-medium border border-border hover:bg-muted"
                    >
                      <Copy className="h-3 w-3" /> Copiar Clave
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-muted-foreground">Consecutivo:</span>{" "}
                    <span className="font-mono font-semibold">{modalData.consecutivo}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Total Venta:</span>{" "}
                    <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                      {formatCRC(modalData.total)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Visor XML */}
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground">
                    XML Firmado XAdES-EPES (v4.4 v2)
                  </span>
                  <button
                    onClick={() => handleDownloadXml(modalData.docNumber, modalData.xml)}
                    className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                  >
                    <Download className="h-3.5 w-3.5" /> Descargar archivo .xml
                  </button>
                </div>
                <div className="max-h-72 overflow-auto rounded-lg border border-border bg-muted/20 p-3 font-mono text-[11px]">
                  <pre className="whitespace-pre-wrap break-all text-muted-foreground">
                    {modalData.xml}
                  </pre>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-border px-6 py-4 bg-muted/10">
              <button
                onClick={() => handleDownloadXml(modalData.docNumber, modalData.xml)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-2 text-xs font-medium hover:bg-muted"
              >
                <Download className="h-4 w-4" /> Descargar XML Firmado
              </button>

              <div className="flex items-center gap-2">
                {modalData.mode === "preview" ? (
                  <button
                    onClick={() => {
                      setModalData(null);
                      handleEmit();
                    }}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow-sm hover:bg-primary/90"
                  >
                    <Send className="h-4 w-4" /> Emitir Ahora a Hacienda
                  </button>
                ) : (
                  <button
                    onClick={() => navigate({ to: "/app/invoices" })}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow-sm hover:bg-primary/90"
                  >
                    Ver en Listado de Facturas
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Buscador Oficial de CABYS BCCR / Hacienda */}
      <CabysFinderModal
        isOpen={isCabysModalOpen}
        onClose={() => setIsCabysModalOpen(false)}
        onSelect={handleSelectCabysForLine}
        actionLabel="Aplicar a la Línea"
      />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Subcomponentes
// ─────────────────────────────────────────────────────────────────────────────
const inputCls =
  "h-10 w-full rounded-lg border border-border bg-background px-3 text-sm transition-colors focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20";

function Section({
  icon: Icon,
  title,
  subtitle,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-border bg-card shadow-soft">
      <header className="flex items-center gap-3 border-b border-border px-5 py-4">
        <div className="grid h-9 w-9 place-items-center rounded-lg bg-primary/10 text-primary">
          <Icon className="h-4 w-4" />
        </div>
        <div>
          <h3 className="text-sm font-semibold">{title}</h3>
          {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
        </div>
      </header>
      <div className="p-5">{children}</div>
    </section>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-muted-foreground">
        {label} {required && <span className="text-destructive">*</span>}
      </span>
      {children}
    </label>
  );
}

function Select({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={inputCls + " appearance-none pr-9"}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
    </div>
  );
}

function Row({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <div className="flex justify-between">
      <dt className={muted ? "text-muted-foreground" : "text-muted-foreground"}>{label}</dt>
      <dd className={"tabular-nums " + (muted ? "text-muted-foreground" : "font-medium")}>
        {value}
      </dd>
    </div>
  );
}

function KV({ k, v, mono, muted }: { k: string; v: string; mono?: boolean; muted?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-muted-foreground">{k}</span>
      <span
        className={(mono ? "font-mono " : "") + (muted ? "text-muted-foreground" : "font-medium")}
      >
        {v}
      </span>
    </div>
  );
}

function LineItem({
  index,
  line,
  companyCabys = [],
  availableProducts = [],
  onChange,
  onOpenCabys,
  onRemove,
}: {
  index: number;
  line: Line & { gross: number; discount: number; net: number; tax: number; total: number };
  companyCabys?: any[];
  availableProducts?: any[];
  onChange: (p: Partial<Line>) => void;
  onOpenCabys: () => void;
  onRemove: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [isSearchingCabys, setIsSearchingCabys] = useState(false);

  const handleCabysInput = async (val: string) => {
    onChange({ cabys: val });
    const clean = val.trim().replace(/\D/g, "");

    // Si ingresa o selecciona 13 dígitos
    if (clean.length === 13) {
      // 1. Verificar primero en Mis CAByS de la empresa
      const matchLocal = companyCabys?.find((c: any) => c.cabys_code === clean);
      if (matchLocal) {
        let targetIva = "08";
        if (matchLocal.tax_rate === 0) targetIva = "01";
        else if (matchLocal.tax_rate === 1) targetIva = "02";
        else if (matchLocal.tax_rate === 2) targetIva = "03";
        else if (matchLocal.tax_rate === 4) targetIva = "04";
        else if (matchLocal.tax_rate === 13) targetIva = "08";

        onChange({
          cabys: clean,
          detail: line.detail.trim() && line.detail !== "Servicios profesionales" ? line.detail : matchLocal.description,
          ivaCode: targetIva,
        });
        toast.success(`CAByS "${clean}" reconocido (Mis CAByS)`, {
          description: `${matchLocal.description} • IVA ${matchLocal.tax_rate}%`,
        });
        return;
      }

      // 2. Si no está en Mis CAByS, consultar en vivo al catálogo oficial BCCR / Hacienda
      setIsSearchingCabys(true);
      try {
        const res = await buscarCabys(clean, 1);
        const item = res.items?.find((i) => i.codigo === clean) || res.items?.[0];
        if (item && item.codigo === clean) {
          let targetIva = "08";
          if (item.impuesto === 0) targetIva = "01";
          else if (item.impuesto === 1) targetIva = "02";
          else if (item.impuesto === 2) targetIva = "03";
          else if (item.impuesto === 4) targetIva = "04";
          else if (item.impuesto === 13) targetIva = "08";

          onChange({
            cabys: clean,
            detail: line.detail.trim() && line.detail !== "Servicios profesionales" ? line.detail : item.descripcion,
            ivaCode: targetIva,
          });
          toast.success(`CAByS oficial verificado (${res.source === "hacienda_bccr" ? "Hacienda / BCCR" : "Catálogo"})`, {
            description: `${item.descripcion} • IVA ${item.impuesto}%`,
          });
        }
      } catch (e) {
        console.error("Error buscando CABYS:", e);
      } finally {
        setIsSearchingCabys(false);
      }
    }
  };

  return (
    <div className="rounded-xl border border-border bg-background/50">
      <div className="grid grid-cols-12 items-center gap-2 p-3">
        <div className="col-span-12 flex items-center gap-2 md:col-span-5">
          <span className="grid h-6 w-6 shrink-0 place-items-center rounded-md bg-muted text-[11px] font-semibold text-muted-foreground">
            {index}
          </span>
          <input
            value={line.detail}
            onChange={(e) => {
              const val = e.target.value;
              const matchedProduct = availableProducts.find(
                (p) =>
                  p.name.toLowerCase() === val.toLowerCase() ||
                  (p.sku && p.sku.toLowerCase() === val.toLowerCase()),
              );
              if (matchedProduct) {
                let targetIva = "08";
                if (matchedProduct.tax_rate === 0) targetIva = "01";
                else if (matchedProduct.tax_rate === 1) targetIva = "02";
                else if (matchedProduct.tax_rate === 2) targetIva = "03";
                else if (matchedProduct.tax_rate === 4) targetIva = "04";
                else if (matchedProduct.tax_rate === 13) targetIva = "08";

                onChange({
                  detail: matchedProduct.name,
                  cabys: matchedProduct.cabys || "",
                  unitPrice: matchedProduct.price,
                  code: matchedProduct.sku,
                  unit: matchedProduct.unit || "Unid",
                  ivaCode: targetIva,
                });
              } else {
                onChange({ detail: val });
              }
            }}
            list="product-suggestions"
            placeholder="Descripción del bien o servicio"
            className="h-9 w-full rounded-md border border-border bg-background px-2 text-sm"
          />
          <datalist id="product-suggestions">
            {availableProducts.map((p) => (
              <option key={p.id} value={p.name}>
                {p.name} {p.sku ? `· ${p.sku}` : ""} (₡{p.price?.toLocaleString("es-CR")})
              </option>
            ))}
          </datalist>
        </div>
        <div className="col-span-4 md:col-span-2 relative flex items-center">
          <input
            value={line.cabys}
            onChange={(e) => handleCabysInput(e.target.value)}
            maxLength={13}
            list="cabys-list"
            placeholder="CABYS (13 dígitos)"
            title="Código CABYS de 13 dígitos según catálogo oficial de Hacienda / BCCR"
            className="h-9 w-full rounded-md border border-border bg-background pl-2 pr-7 font-mono text-xs focus:ring-2 focus:ring-primary/20"
          />
          <button
            type="button"
            onClick={onOpenCabys}
            className="absolute right-1 p-1 text-primary hover:bg-primary/10 rounded transition-colors"
            title="Buscar en Catálogo Oficial CABYS (BCCR / Hacienda)"
          >
            {isSearchingCabys ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
            ) : (
              <Sparkles className="h-3.5 w-3.5" />
            )}
          </button>
        </div>
        <datalist id="cabys-list">
          {companyCabys && companyCabys.length > 0 ? (
            companyCabys.map((c: any) => (
              <option key={c.id || c.cabys_code} value={c.cabys_code}>
                {c.cabys_code} · {c.description} ({c.tax_rate}% IVA)
              </option>
            ))
          ) : (
            <>
              <option value="8314100000000">8314100000000 · Servicios de diseño y desarrollo de software</option>
              <option value="7331100000000">7331100000000 · Licencias de uso de programas informáticos</option>
              <option value="8313200000100">8313200000100 · Soporte en tecnologías de información</option>
            </>
          )}
        </datalist>
        <input
          type="number"
          min={0}
          step="0.01"
          value={line.qty}
          onChange={(e) => onChange({ qty: +e.target.value })}
          className="col-span-2 h-9 rounded-md border border-border bg-background px-2 text-sm tabular-nums md:col-span-1"
        />
        <input
          type="number"
          min={0}
          step="0.01"
          value={line.unitPrice}
          onChange={(e) => onChange({ unitPrice: +e.target.value })}
          className="col-span-3 h-9 rounded-md border border-border bg-background px-2 text-sm tabular-nums md:col-span-2"
        />
        <div className="col-span-2 text-right text-sm font-semibold tabular-nums md:col-span-1">
          {formatCRC(line.total)}
        </div>
        <div className="col-span-1 flex justify-end gap-1">
          <button
            onClick={() => setOpen((o) => !o)}
            className="grid h-8 w-8 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
            title="Más detalles"
          >
            <ChevronDown className={"h-4 w-4 transition-transform " + (open ? "rotate-180" : "")} />
          </button>
          <button
            onClick={onRemove}
            className="grid h-8 w-8 place-items-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {open && (
        <div className="space-y-4 border-t border-border bg-muted/20 p-4">
          <div className="grid gap-3 md:grid-cols-4">
            <Field label="Código comercial">
              <input
                value={line.code}
                onChange={(e) => onChange({ code: e.target.value })}
                className={inputCls}
              />
            </Field>
            <Field label="Unidad de medida">
              <Select
                value={line.unit}
                onChange={(v) => onChange({ unit: v })}
                options={UNITS.map((u) => ({ value: u.code, label: `${u.code} — ${u.label}` }))}
              />
            </Field>
            <Field label="Descuento %">
              <div className="relative">
                <input
                  type="number"
                  min={0}
                  max={100}
                  step="0.01"
                  value={line.discountPct}
                  onChange={(e) => onChange({ discountPct: +e.target.value })}
                  className={inputCls + " pr-8 tabular-nums"}
                />
                <Percent className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              </div>
            </Field>
            <Field label="Razón descuento">
              <input
                value={line.discountReason}
                onChange={(e) => onChange({ discountReason: e.target.value })}
                className={inputCls}
                disabled={line.discountPct === 0}
              />
            </Field>
          </div>

          <div className="grid gap-3 md:grid-cols-4">
            <div className="md:col-span-2">
              <Field label="Tarifa IVA">
                <Select
                  value={line.ivaCode}
                  onChange={(v) => onChange({ ivaCode: v })}
                  options={IVA_RATES.map((r) => ({ value: r.code, label: r.label }))}
                />
              </Field>
            </div>
            <label className="flex items-end gap-2 pb-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={line.hasExemption}
                onChange={(e) => {
                  const checked = e.target.checked;
                  onChange({
                    hasExemption: checked,
                    exemption: {
                      ...line.exemption,
                      pct: checked && (!line.exemption.pct || line.exemption.pct === 0) ? 100 : line.exemption.pct || 100,
                      institution: line.exemption.institution || "Ministerio de Hacienda",
                      date: line.exemption.date || new Date().toISOString().slice(0, 10),
                    },
                  });
                }}
                className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
              />
              <span className="text-sm font-medium">Aplicar exoneración</span>
            </label>
          </div>

          {line.hasExemption && (
            <div className="grid gap-3 rounded-lg border border-border bg-card p-3 md:grid-cols-4">
              <Field label="Tipo de Exoneración">
                <Select
                  value={line.exemption.type}
                  onChange={(v) => onChange({ exemption: { ...line.exemption, type: v } })}
                  options={EXEMPTION_TYPES.map((e) => ({ value: e.code, label: e.label }))}
                />
              </Field>
              <Field label="N° documento / Autorización">
                <input
                  value={line.exemption.docNumber}
                  onChange={(e) =>
                    onChange({ exemption: { ...line.exemption, docNumber: e.target.value } })
                  }
                  placeholder="Ej: AL-00045892-24"
                  className={inputCls}
                />
              </Field>
              <Field label="Institución">
                <input
                  value={line.exemption.institution}
                  onChange={(e) =>
                    onChange({ exemption: { ...line.exemption, institution: e.target.value } })
                  }
                  placeholder="Ministerio de Hacienda / EXONET"
                  className={inputCls}
                />
              </Field>
              <Field label="Fecha emisión">
                <input
                  type="date"
                  value={line.exemption.date}
                  onChange={(e) =>
                    onChange({ exemption: { ...line.exemption, date: e.target.value } })
                  }
                  className={inputCls}
                />
              </Field>
              <div className="md:col-span-4">
                <Field label="% Exoneración del Impuesto (100% = No paga IVA)">
                  <div className="flex max-w-sm items-center gap-2">
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={line.exemption.pct}
                      onChange={(e) =>
                        onChange({ exemption: { ...line.exemption, pct: +e.target.value } })
                      }
                      className={inputCls + " tabular-nums"}
                      placeholder="100"
                    />
                    <button
                      type="button"
                      onClick={() => onChange({ exemption: { ...line.exemption, pct: 100 } })}
                      className="shrink-0 rounded-lg bg-primary/10 px-3 py-2 text-xs font-semibold text-primary hover:bg-primary/20 transition-colors"
                      title="Exoneración total (100% del IVA)"
                    >
                      100% Total
                    </button>
                  </div>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    Coloca <strong>100%</strong> para exonerar todo el IVA de la línea. Si el documento exonera una tarifa parcial (ej: 13%), pon 100% si el IVA es 13%.
                  </p>
                </Field>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 text-xs md:grid-cols-5">
            <Mini k="Bruto" v={formatCRC(line.gross)} />
            <Mini k="Descuento" v={`− ${formatCRC(line.discount)}`} />
            <Mini k="IVA Base" v={formatCRC((line as any).baseTax || line.tax)} />
            {line.hasExemption && (line as any).exoneration > 0 && (
              <Mini k="Exoneración (-)" v={`− ${formatCRC((line as any).exoneration)}`} highlight />
            )}
            <Mini k="Total línea" v={formatCRC(line.total)} strong />
          </div>
        </div>
      )}
    </div>
  );
}

function Mini({ k, v, strong, highlight }: { k: string; v: string; strong?: boolean; highlight?: boolean }) {
  return (
    <div
      className={`rounded-md px-3 py-2 ${
        highlight
          ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300"
          : "bg-background"
      }`}
    >
      <div
        className={`text-[10px] uppercase tracking-wide ${
          highlight ? "text-emerald-600 dark:text-emerald-400 font-semibold" : "text-muted-foreground"
        }`}
      >
        {k}
      </div>
      <div className={"tabular-nums " + (strong ? "text-sm font-semibold" : "text-sm")}>{v}</div>
    </div>
  );
}
