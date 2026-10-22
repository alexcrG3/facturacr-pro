import * as XLSX from "xlsx";
import { supabase } from "@/lib/supabase";

export type TipoOperacion = "VENTA" | "COMPRA" | "NO_CLASIFICADO";
export type TipoDoc = "FACTURA" | "TIQUETE" | "NOTA_CREDITO" | "NOTA_DEBITO" | "COMPRA";
export type EstadoHacienda = "ACEPTADO" | "RECIBIDO" | "RECHAZADO" | "PENDIENTE";

export interface ComprobanteContable {
  id: string;
  tipoOperacion: TipoOperacion;
  tipoDoc: TipoDoc;
  tipoDocCodigo: string; // 01, 04, 03, 02, 08
  estadoHacienda: EstadoHacienda;
  clave: string;
  consecutivo: string;
  emisorCedula: string;
  emisorNombre: string;
  receptorCedula: string;
  receptorNombre: string;
  fechaEmision: string; // YYYY-MM-DD
  fechaHora: string;
  moneda: "CRC" | "USD";
  tipoCambio: number;
  totalComprobante: number;
  totalVentaNeta: number;
  totalExento: number;
  totalExonerado: number;
  tarifaIva: number; // Porcentaje principal ej. 13
  totalIva: number;
  iva13: number;
  iva4: number;
  iva2: number;
  iva1: number;
  respuestaHacienda: string;
  cabysPrincipal?: string;
  detallePrincipal?: string;
  origenXml?: string;
  codigoReferencia?: string; // 13, 14, 15 (Error material), 01, 04, etc.
  numeroReferencia?: string; // Clave del comprobante original
  fechaReferencia?: string;
  razonReferencia?: string;
}

export const TIPOS_REPORTE = [
  { id: "DETALLADO_COMPROBANTES", label: "REPORTE DETALLADO DE COMPROBANTES", desc: "Todos los comprobantes (compras y ventas) con detalle fiscal completo" },
  { id: "COMPRAS_DETALLADAS", label: "COMPRAS DETALLADAS", desc: "Facturas y tiquetes de proveedores con IVA crédito fiscal soportado" },
  { id: "VENTAS_DETALLADAS", label: "VENTAS DETALLADAS", desc: "Facturas y tiquetes emitidos con desglose de IVA devengado" },
  { id: "RESUMEN_COMPRAS", label: "RESUMEN DE COMPRAS", desc: "Totales de compras acumulados por proveedor y mes" },
  { id: "RESUMEN_VENTAS", label: "RESUMEN DE VENTAS", desc: "Totales de ventas agrupados por cliente y tipo de documento" },
  { id: "COMPRAS_PROVEEDOR", label: "COMPRAS POR PROVEEDOR", desc: "Agrupación acumulada por número de cédula de proveedor" },
  { id: "VENTAS_CLIENTE", label: "VENTAS POR CLIENTE", desc: "Agrupación acumulada por cliente y volumen de facturación" },
  { id: "IVA_COMPRAS", label: "IVA DE COMPRAS", desc: "Desglose de crédito fiscal por tarifa (13%, 4%, 2%, 1% y exento)" },
  { id: "IVA_VENTAS", label: "IVA DE VENTAS", desc: "Desglose de débito fiscal por tarifa (13%, 4%, 2%, 1% y exento)" },
  { id: "RESUMEN_IVA", label: "RESUMEN DE IVA", desc: "Cálculo de liquidación de IVA (Débito - Crédito = Saldo a pagar / favor)" },
  { id: "NOTAS_CREDITO", label: "NOTAS DE CREDITO", desc: "Comprobantes tipo 03 aplicados a facturas emitidas o recibidas" },
  { id: "NOTAS_DEBITO", label: "NOTAS DE DEBITO", desc: "Comprobantes tipo 02 de recargos o intereses" },
  { id: "PRODUCTOS_COMPRADOS", label: "PRODUCTOS COMPRADOS", desc: "Detalle de líneas de gasto e insumos adquiridos" },
  { id: "PRODUCTOS_VENDIDOS", label: "PRODUCTOS VENDIDOS", desc: "Ranking y detalle de bienes y servicios facturados" },
  { id: "REPORTE_CABYS", label: "REPORTE CABYS", desc: "Consolidado de ventas y compras agrupado por código CABYS oficial" },
  { id: "REPORTE_TRIBUTARIO_MENSUAL", label: "REPORTE TRIBUTARIO MENSUAL", desc: "Borrador de casillas oficiales para la Declaración D-104 de Tributación" },
  { id: "PRORRATA_IVA", label: "PRORRATA IVA (ESTIMADA)", desc: "Estimación del porcentaje de crédito fiscal con derecho a deducción" },
  { id: "RESUMEN_EJECUTIVO_CONTADOR", label: "RESUMEN EJECUTIVO CONTADOR", desc: "Informe ejecutivo consolidado con KPIs, ventas, compras y balance fiscal" },
] as const;

export type TipoReporteId = (typeof TIPOS_REPORTE)[number]["id"];

// Compras y ventas iniciales (0 datos harcodeados; solo datos reales descargados o emitidos)
export const defaultCompras: ComprobanteContable[] = [];
export const defaultVentas: ComprobanteContable[] = [];

/**
 * Carga todos los comprobantes contables de Supabase (compras + ventas)
 * Esta función retorna un array vacío síncrono; usa cargarComprobantesContablesAsync para datos reales.
 */
export function cargarComprobantesContables(): ComprobanteContable[] {
  // Función síncrona legacy — retorna vacío, usar la versión async
  return [];
}

/**
 * Carga todos los comprobantes contables de Supabase de forma asíncrona
 */
export async function cargarComprobantesContablesAsync(
  establishmentId?: string,
  emisorInfo?: { name?: string; legalId?: string }
): Promise<ComprobanteContable[]> {
  let listaCompras: ComprobanteContable[] = [];
  try {
    let compQuery = supabase
      .from("compras")
      .select("*")
      .order("fecha_emision", { ascending: false });

    if (establishmentId) {
      compQuery = compQuery.eq("establishment_id", establishmentId);
    }

    const { data: comprasData } = await compQuery;

    if (comprasData) {
      listaCompras = comprasData.map((row: any) => ({
        id: row.id,
        tipoOperacion: "COMPRA" as const,
        tipoDoc: "COMPRA" as const,
        tipoDocCodigo: row.tipo_documento || "01",
        estadoHacienda: row.estado === "aceptado" ? "ACEPTADO" as const : "PENDIENTE" as const,
        clave: row.clave || "",
        consecutivo: row.numero_consecutivo || "",
        emisorCedula: row.emisor_cedula || "",
        emisorNombre: row.emisor_nombre || "Proveedor Nacional",
        receptorCedula: (emisorInfo?.legalId || "3-101-483899").replace(/\D/g, ""),
        receptorNombre: emisorInfo?.name || "Empresa",
        fechaEmision: row.fecha_emision || new Date().toISOString().slice(0, 10),
        fechaHora: row.fecha_emision || new Date().toISOString(),
        moneda: (row.moneda || "CRC") as any,
        tipoCambio: Number(row.tipo_cambio) || 1,
        totalComprobante: Number(row.total_comprobante) || 0,
        totalVentaNeta: Number(row.total_neto) || 0,
        totalExento: Number(row.total_exento) || 0,
        totalExonerado: 0,
        tarifaIva: 13,
        totalIva: Number(row.total_impuesto) || 0,
        iva13: Number(row.total_impuesto) || 0,
        iva4: 0,
        iva2: 0,
        iva1: 0,
        respuestaHacienda: row.estado || "Procesado",
      }));
    }
  } catch (err) {
    console.error("Error cargando compras de Supabase:", err);
    listaCompras = [];
  }

  let listaVentas: ComprobanteContable[] = [];
  try {
    let ventQuery = supabase
      .from("invoices")
      .select("*")
      .order("issue_date", { ascending: false });

    if (establishmentId) {
      ventQuery = ventQuery.eq("establishment_id", establishmentId);
    }

    const { data: ventasData } = await ventQuery;

    const emisorNom = emisorInfo?.name || "Empresa Emisora";
    const emisorCed = (emisorInfo?.legalId || "3101483899").replace(/\D/g, "");

    if (ventasData && ventasData.length > 0) {
      listaVentas = ventasData
        .filter((p: any) => !p.id?.startsWith("v-00") && !p.id?.startsWith("demo-"))
        .map((p: any) => {
          const isMedical = p.app_name?.toLowerCase().includes("clinic") || p.items?.[0]?.tax_rate === 4;
          const taxAmt = Number(p.tax_total) || 0;
          return {
            id: p.id || "v-" + Math.random(),
            tipoOperacion: "VENTA" as const,
            tipoDoc: (p.consecutive_number?.startsWith("NC-") || p.consecutive_number?.substring(8, 10) === "03") ? "NOTA_CREDITO" as const : "FACTURA" as const,
            tipoDocCodigo: p.consecutive_number?.substring(8, 10) || "01",
            estadoHacienda: p.status === "aceptada" || p.status === "aceptado" ? "ACEPTADO" as const : "RECIBIDO" as const,
            clave: p.clave || "",
            consecutivo: p.consecutive_number || "",
            emisorCedula: emisorCed,
            emisorNombre: emisorNom,
            receptorCedula: p.client_legal_id || "",
            receptorNombre: p.client_name || "Consumidor Final",
            fechaEmision: p.issue_date ? p.issue_date.slice(0, 10) : new Date().toISOString().slice(0, 10),
            fechaHora: p.issue_date || new Date().toISOString(),
            moneda: (p.currency || "CRC") as any,
            tipoCambio: Number(p.exchange_rate) || 1,
            totalComprobante: Number(p.total) || 0,
            totalVentaNeta: Number(p.subtotal) || (Number(p.total) || 0) - taxAmt,
            totalExento: 0,
            totalExonerado: 0,
            tarifaIva: isMedical ? 4 : 13,
            totalIva: taxAmt,
            iva13: isMedical ? 0 : taxAmt,
            iva4: isMedical ? taxAmt : 0,
            iva2: 0,
            iva1: 0,
            respuestaHacienda: p.status === "aceptada" || p.status === "aceptado" ? "Aceptado por Hacienda" : "Comprobante emitido",
          };
        });
    }
  } catch (err) {
    console.error("Error cargando ventas de Supabase:", err);
    listaVentas = [];
  }

  // Combinar y deduplicar por id
  const map = new Map<string, ComprobanteContable>();
  [...listaVentas, ...listaCompras].forEach((c) => map.set(c.id, c));
  return Array.from(map.values()).sort((a, b) => b.fechaEmision.localeCompare(a.fechaEmision));
}

/**
 * Limpia todos los comprobantes de compras almacenados
 */
export function limpiarComprobantesContables() {
  if (typeof window === "undefined") return;
  localStorage.removeItem("facturacr_compras_recibidas");
}

/**
 * Guarda una nueva compra o gasto importado en Supabase
 */
export async function guardarComprobanteContable(c: ComprobanteContable) {
  try {
    // Verificar si ya existe por clave en Supabase
    if (c.clave && c.clave !== "") {
      const { data: existing } = await supabase
        .from("compras")
        .select("id")
        .eq("clave", c.clave)
        .maybeSingle();
      if (existing) {
        console.log("Comprobante ya existe en Supabase, saltando:", c.clave);
        return;
      }
    }

    // Insertar en Supabase
    const { error } = await supabase.from("compras").insert({
      clave: c.clave || null,
      numero_consecutivo: c.consecutivo,
      fecha_emision: c.fechaHora || new Date().toISOString(),
      emisor_nombre: c.emisorNombre,
      emisor_cedula: c.emisorCedula,
      receptor_nombre: c.receptorNombre,
      receptor_cedula: c.receptorCedula,
      total_comprobante: c.totalComprobante,
      total_impuesto: c.totalIva,
      total_gravado: c.totalVentaNeta,
      total_exento: c.totalExento,
      moneda: c.moneda,
      tipo_cambio: c.tipoCambio,
      tipo_documento: c.tipoDocCodigo,
      estado: c.estadoHacienda === "ACEPTADO" ? "aceptado" : "pendiente",
      processed_at: new Date().toISOString(),
    });

    if (error) {
      console.error("Error guardando comprobante en Supabase:", error);
      // Fallback a localStorage si Supabase falla
      if (typeof window !== "undefined") {
        const actuales = JSON.parse(localStorage.getItem("facturacr_compras_recibidas") || "[]");
        const existe = actuales.some((x: ComprobanteContable) => x.clave === c.clave && x.clave !== "");
        if (!existe) {
          localStorage.setItem("facturacr_compras_recibidas", JSON.stringify([c, ...actuales.filter((x: ComprobanteContable) => x.tipoOperacion === "COMPRA")]));
        }
      }
    }
  } catch (err) {
    console.error("Error al guardar comprobante contable:", err);
  }
}

/**
 * Parsea un archivo XML de factura electrónica de Costa Rica (v4.3)
 */
export function parsearXmlHacienda(xmlText: string): Partial<ComprobanteContable> | null {
  try {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlText, "application/xml");

    // Verificar si es MensajeHacienda
    const mensajeHacienda = xmlDoc.getElementsByTagName("MensajeHacienda")[0];
    if (mensajeHacienda) {
      const clave = mensajeHacienda.getElementsByTagName("Clave")[0]?.textContent || "";
      const mensaje = mensajeHacienda.getElementsByTagName("Mensaje")[0]?.textContent || "";
      const detalle = mensajeHacienda.getElementsByTagName("DetalleMensaje")[0]?.textContent || "";
      return {
        clave,
        estadoHacienda: mensaje === "1" ? "ACEPTADO" : "RECHAZADO",
        respuestaHacienda: detalle || (mensaje === "1" ? "Aceptado por Hacienda" : "Rechazado"),
      };
    }

    // Comprobante electrónico (FE, TE, NC, ND, FEC)
    const rootTag = xmlDoc.documentElement.nodeName;
    let tipoDoc: TipoDoc = "FACTURA";
    let tipoDocCodigo = "01";
    if (rootTag.includes("Tiquete")) {
      tipoDoc = "TIQUETE";
      tipoDocCodigo = "04";
    } else if (rootTag.includes("NotaCredito")) {
      tipoDoc = "NOTA_CREDITO";
      tipoDocCodigo = "03";
    } else if (rootTag.includes("NotaDebito")) {
      tipoDoc = "NOTA_DEBITO";
      tipoDocCodigo = "02";
    } else if (rootTag.includes("Compra")) {
      tipoDoc = "COMPRA";
      tipoDocCodigo = "08";
    }

    const clave = xmlDoc.getElementsByTagName("Clave")[0]?.textContent || "";
    const numeroConsecutivo = xmlDoc.getElementsByTagName("NumeroConsecutivo")[0]?.textContent || "";
    const fechaEmision = xmlDoc.getElementsByTagName("FechaEmision")[0]?.textContent || new Date().toISOString();

    const emisorEl = xmlDoc.getElementsByTagName("Emisor")[0];
    const emisorNombre = emisorEl?.getElementsByTagName("Nombre")[0]?.textContent || "";
    const emisorCedula = emisorEl?.getElementsByTagName("Numero")[0]?.textContent || "";

    const receptorEl = xmlDoc.getElementsByTagName("Receptor")[0];
    const receptorNombre = receptorEl?.getElementsByTagName("Nombre")[0]?.textContent || "Consumidor Final";
    const receptorCedula = receptorEl?.getElementsByTagName("Numero")[0]?.textContent || "";

    const resumenEl = xmlDoc.getElementsByTagName("ResumenFactura")[0];
    const moneda = (resumenEl?.getElementsByTagName("CodigoTipoMoneda")[0]?.getElementsByTagName("CodigoMoneda")[0]?.textContent || "CRC") as "CRC" | "USD";
    const tipoCambio = parseFloat(resumenEl?.getElementsByTagName("CodigoTipoMoneda")[0]?.getElementsByTagName("TipoCambio")[0]?.textContent || "1");

    const totalComprobante = parseFloat(resumenEl?.getElementsByTagName("TotalComprobante")[0]?.textContent || "0");
    const totalVentaNeta = parseFloat(resumenEl?.getElementsByTagName("TotalVentaNeta")[0]?.textContent || "0");
    const totalImpuesto = parseFloat(resumenEl?.getElementsByTagName("TotalImpuesto")[0]?.textContent || "0");
    const totalExento = parseFloat(resumenEl?.getElementsByTagName("TotalExento")[0]?.textContent || "0");
    const totalExonerado = parseFloat(resumenEl?.getElementsByTagName("TotalExonerado")[0]?.textContent || "0");

    // Primera línea detalle y cabys
    const primeraLinea = xmlDoc.getElementsByTagName("LineaDetalle")[0];
    const cabysPrincipal = primeraLinea?.getElementsByTagName("CodigoCabys")[0]?.textContent || primeraLinea?.getElementsByTagName("Codigo")[0]?.textContent || "";
    const detallePrincipal = primeraLinea?.getElementsByTagName("Detalle")[0]?.textContent || "";

    // Clasificar si es COMPRA o VENTA según la cédula de la empresa actual
    let tipoOperacion: TipoOperacion = "NO_CLASIFICADO";
    const myId = "3101483899";
    if (emisorCedula.includes(myId) || emisorCedula.replace(/\D/g, "") === myId) {
      tipoOperacion = "VENTA";
    } else if (receptorCedula.includes(myId) || receptorCedula.replace(/\D/g, "") === myId) {
      tipoOperacion = "COMPRA";
    } else {
      tipoOperacion = "COMPRA"; // Por defecto al importar gastos
    }

    // Informacion de Referencia (NC, ND, etc.)
    const infoRefEl = xmlDoc.getElementsByTagName("InformacionReferencia")[0];
    const codigoReferencia = infoRefEl?.getElementsByTagName("Codigo")[0]?.textContent || "";
    const numeroReferencia = infoRefEl?.getElementsByTagName("Numero")[0]?.textContent || "";
    const fechaReferencia = infoRefEl?.getElementsByTagName("FechaEmision")[0]?.textContent || "";
    const razonReferencia = infoRefEl?.getElementsByTagName("Razon")[0]?.textContent || "";

    return {
      id: "xml-" + (clave || Date.now()),
      tipoOperacion,
      tipoDoc,
      tipoDocCodigo,
      estadoHacienda: "ACEPTADO",
      clave,
      consecutivo: numeroConsecutivo,
      emisorCedula,
      emisorNombre,
      receptorCedula,
      receptorNombre,
      fechaEmision: fechaEmision.slice(0, 10),
      fechaHora: fechaEmision,
      moneda,
      tipoCambio,
      totalComprobante,
      totalVentaNeta: totalVentaNeta || totalComprobante - totalImpuesto,
      totalExento,
      totalExonerado,
      tarifaIva: totalImpuesto > 0 ? 13 : 0,
      totalIva: totalImpuesto,
      iva13: totalImpuesto,
      iva4: 0,
      iva2: 0,
      iva1: 0,
      respuestaHacienda: "Importado desde archivo XML oficial",
      cabysPrincipal,
      detallePrincipal,
      origenXml: xmlText,
      codigoReferencia,
      numeroReferencia,
      fechaReferencia,
      razonReferencia,
    };
  } catch (err) {
    console.error("Error al parsear XML de Hacienda:", err);
    return null;
  }
}

/**
 * Genera y descarga el archivo Excel oficial con encabezado idéntico al sistema contable
 */
export function generarExcelContador(
  tipoReporteId: TipoReporteId,
  desde: string,
  hasta: string,
  datos: ComprobanteContable[],
  empresa = {
    nombre: "GRUPO G TRES COMERCIALIZADORA INTERAMERICANA SOCIEDAD ANONIMA",
    identificacion: "3101483899",
  },
) {
  const reporteInfo = TIPOS_REPORTE.find((r) => r.id === tipoReporteId) || TIPOS_REPORTE[0];

  // Filtrar comprobantes por rango de fechas
  let filtrados = datos.filter((d) => d.fechaEmision >= desde && d.fechaEmision <= hasta);

  // Filtrar por tipo de reporte si aplica
  if (tipoReporteId === "COMPRAS_DETALLADAS" || tipoReporteId === "RESUMEN_COMPRAS" || tipoReporteId === "IVA_COMPRAS" || tipoReporteId === "COMPRAS_PROVEEDOR") {
    filtrados = filtrados.filter((d) => d.tipoOperacion === "COMPRA");
  } else if (tipoReporteId === "VENTAS_DETALLADAS" || tipoReporteId === "RESUMEN_VENTAS" || tipoReporteId === "IVA_VENTAS" || tipoReporteId === "VENTAS_CLIENTE") {
    filtrados = filtrados.filter((d) => d.tipoOperacion === "VENTA");
  } else if (tipoReporteId === "NOTAS_CREDITO") {
    filtrados = filtrados.filter((d) => d.tipoDoc === "NOTA_CREDITO");
  } else if (tipoReporteId === "NOTAS_DEBITO") {
    filtrados = filtrados.filter((d) => d.tipoDoc === "NOTA_DEBITO");
  }

  const nowStr = new Date().toISOString().replace("T", " ").slice(0, 19);

  // Construcción de filas AOA (Array of Arrays) exactamente como en la imagen del usuario
  const rows: any[][] = [
    [`FACTURAOS - ${reporteInfo.label}`],
    [`Empresa:`, empresa.nombre],
    [`Identificación:`, empresa.identificacion],
    [`Periodo:`, `${desde} al ${hasta}`],
    [`Generado:`, nowStr],
    [], // Fila en blanco
    [
      "TIPO OPERACIÓN",
      "TIPO DOC",
      "ESTADO HACIENDA",
      "CLAVE NUMÉRICA (50 DÍGITOS)",
      "CÉDULA EMISOR",
      "RAZÓN SOCIAL EMISOR",
      "CÉDULA RECEPTOR",
      "RAZÓN SOCIAL RECEPTOR",
      "FECHA EMISIÓN",
      "MONEDA",
      "TOTAL COMPROBANTE",
      "TOTAL EXENTO",
      "TOTAL EXONERADO",
      "TOTAL IVA",
      "VENTA NETA / SUB-TOTAL",
      "CABYS",
      "DETALLE PRINCIPAL",
      "RESPUESTA HACIENDA",
    ],
  ];

  // Añadir cada registro
  filtrados.forEach((item) => {
    rows.push([
      item.tipoOperacion,
      item.tipoDoc,
      item.estadoHacienda,
      item.clave,
      item.emisorCedula,
      item.emisorNombre,
      item.receptorCedula,
      item.receptorNombre,
      item.fechaEmision,
      item.moneda,
      item.totalComprobante,
      item.totalExento,
      item.totalExonerado,
      item.totalIva,
      item.totalVentaNeta,
      item.cabysPrincipal || "",
      item.detallePrincipal || "",
      item.respuestaHacienda,
    ]);
  });

  // Fila de Totales al final
  const totalGeneral = filtrados.reduce((sum, x) => sum + (x.totalComprobante || 0), 0);
  const totalIvaGeneral = filtrados.reduce((sum, x) => sum + (x.totalIva || 0), 0);
  const totalNetoGeneral = filtrados.reduce((sum, x) => sum + (x.totalVentaNeta || 0), 0);
  const totalExentoGeneral = filtrados.reduce((sum, x) => sum + (x.totalExento || 0), 0);

  rows.push([]);
  rows.push([
    "TOTALES GENERALES:",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "CRC",
    totalGeneral,
    totalExentoGeneral,
    0,
    totalIvaGeneral,
    totalNetoGeneral,
    "",
    "",
    `Comprobantes procesados: ${filtrados.length}`,
  ]);

  // Si es Reporte de IVA o D-104, añadir hoja adicional de Liquidación de Impuestos
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(rows);

  // Formato de anchos de columna
  ws["!cols"] = [
    { wch: 16 }, // Tipo Operación
    { wch: 14 }, // Tipo Doc
    { wch: 16 }, // Estado
    { wch: 54 }, // Clave
    { wch: 16 }, // Cédula Emisor
    { wch: 38 }, // Nombre Emisor
    { wch: 16 }, // Cédula Receptor
    { wch: 38 }, // Nombre Receptor
    { wch: 14 }, // Fecha
    { wch: 8 },  // Moneda
    { wch: 18 }, // Total Comprobante
    { wch: 15 }, // Exento
    { wch: 15 }, // Exonerado
    { wch: 15 }, // Total IVA
    { wch: 18 }, // Venta Neta
    { wch: 16 }, // CABYS
    { wch: 35 }, // Detalle
    { wch: 30 }, // Respuesta
  ];

  XLSX.utils.book_append_sheet(wb, ws, "Comprobantes");

  // Si es reporte de IVA, añadir hoja con resumen D-104
  const ventas = filtrados.filter((x) => x.tipoOperacion === "VENTA");
  const compras = filtrados.filter((x) => x.tipoOperacion === "COMPRA");

  const ivaVentas13 = ventas.reduce((s, x) => s + (x.iva13 || x.totalIva || 0), 0);
  const ivaCompras13 = compras.reduce((s, x) => s + (x.iva13 || x.totalIva || 0), 0);
  const saldoIva = ivaVentas13 - ivaCompras13;

  const d104Rows = [
    ["FACTURAOS - LIQUIDACIÓN MENSUAL DE IVA (BORRADOR D-104)"],
    [`Contribuyente:`, empresa.nombre],
    [`Cédula:`, empresa.identificacion],
    [`Periodo Fiscal:`, `${desde} al ${hasta}`],
    [],
    ["CONCEPTO TRIBUTARIO", "BASE IMPONIBLE (VENTA NETA)", "IVA GENERADO / CRÉDITO"],
    ["1. DÉBITO FISCAL (VENTAS FACTURADAS 13%)", ventas.reduce((s, x) => s + x.totalVentaNeta, 0), ivaVentas13],
    ["2. CRÉDITO FISCAL (COMPRAS Y GASTOS AUTORIZADOS 13%)", compras.reduce((s, x) => s + x.totalVentaNeta, 0), ivaCompras13],
    [],
    ["RESULTADO FISCAL ESTIMADO D-104:"],
    [saldoIva >= 0 ? "IMPUESTO A PAGAR A FAVOR DE HACIENDA:" : "SALDO A FAVOR DEL CONTRIBUYENTE (CRÉDITO FISCAL):", "", Math.abs(saldoIva)],
  ];

  const wsD104 = XLSX.utils.aoa_to_sheet(d104Rows);
  wsD104["!cols"] = [{ wch: 50 }, { wch: 25 }, { wch: 25 }];
  XLSX.utils.book_append_sheet(wb, wsD104, "Liquidacion_D104");

  // Nombre de archivo limpio
  const cleanFileName = `Reporte_${tipoReporteId}_${desde}_${hasta}.xlsx`;
  XLSX.writeFile(wb, cleanFileName);
}
