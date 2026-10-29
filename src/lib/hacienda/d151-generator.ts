import * as XLSX from "xlsx";
import { ComprobanteContable } from "@/lib/accounting-reports";

export interface RegistroD151 {
  tipoOperacion: "VENTA" | "COMPRA" | "SERVICIO_PROFESIONAL";
  tipoCodigo: "V" | "C" | "G";
  tipoIdentificacion: string; // 01: Física, 02: Jurídica, 03: DIMEX, 04: NITE
  numeroIdentificacion: string;
  nombreRazonSocial: string;
  montoTotalAnual: number;
  montoMercancias: number;
  montoServicios: number;
  montoImpuestoRetenido: number;
  cantidadComprobantes: number;
}

export interface ResultadoD151 {
  anoFiscal: number;
  umbralAplicado: number;
  totalProveedoresSuperan: number;
  totalClientesSuperan: number;
  montoTotalComprasD151: number;
  montoTotalVentasD151: number;
  proveedores: RegistroD151[];
  clientes: RegistroD151[];
}

/**
 * Determina el tipo de cédula para Hacienda (01, 02, 03, 04)
 */
function determinarTipoCedula(cedulaLimpia: string): string {
  if (cedulaLimpia.length === 9) return "01"; // Física
  if (cedulaLimpia.length === 10) return "02"; // Jurídica
  if (cedulaLimpia.length === 11 || cedulaLimpia.length === 12) return "03"; // DIMEX
  return "02";
}

/**
 * Genera el informe consolidado para la Declaración Informativa D-151
 * Filtrando clientes y proveedores con transacciones acumuladas >= umbral (por defecto ₡2,500,000)
 */
export function generarInformeD151({
  comprobantes,
  anoFiscal = new Date().getFullYear(),
  umbral = 2500000,
}: {
  comprobantes: ComprobanteContable[];
  anoFiscal?: number;
  umbral?: number;
}): ResultadoD151 {
  // Filtrar comprobantes del año fiscal seleccionado
  const comprobantesAno = comprobantes.filter((c) => {
    if (!c.fechaEmision) return false;
    const ano = parseInt(c.fechaEmision.slice(0, 4), 10);
    return ano === anoFiscal && c.estadoHacienda !== "RECHAZADO";
  });

  // 1. AGRUPAR COMPRAS (PROVEEDORES)
  const mapaProveedores: Record<
    string,
    {
      nombre: string;
      total: number;
      cantidad: number;
      servicios: number;
      mercancias: number;
    }
  > = {};

  comprobantesAno
    .filter((c) => c.tipoOperacion === "COMPRA" && c.tipoDoc !== "NOTA_CREDITO")
    .forEach((c) => {
      const ced = (c.emisorCedula || "0000000000").replace(/\D/g, "");
      if (!ced || ced === "0000000000") return;

      if (!mapaProveedores[ced]) {
        mapaProveedores[ced] = {
          nombre: c.emisorNombre || "Proveedor Nacional",
          total: 0,
          cantidad: 0,
          servicios: 0,
          mercancias: 0,
        };
      }

      const monto = c.totalVentaNeta || (c.totalComprobante - (c.totalIva || 0)) || c.totalComprobante;
      mapaProveedores[ced].total += monto;
      mapaProveedores[ced].cantidad += 1;

      // Estimación mercadería vs servicios
      const esServicio =
        (c.cabysPrincipal && c.cabysPrincipal.startsWith("8")) ||
        (c.detallePrincipal && /alquiler|honorario|asesor|servicio|limpieza|flete|luz|agua|internet/i.test(c.detallePrincipal));

      if (esServicio) {
        mapaProveedores[ced].servicios += monto;
      } else {
        mapaProveedores[ced].mercancias += monto;
      }
    });

  const proveedores: RegistroD151[] = Object.entries(mapaProveedores)
    .filter(([_, data]) => data.total >= umbral)
    .map(([cedula, data]) => ({
      tipoOperacion: "COMPRA",
      tipoCodigo: "C",
      tipoIdentificacion: determinarTipoCedula(cedula),
      numeroIdentificacion: cedula,
      nombreRazonSocial: data.nombre,
      montoTotalAnual: Math.round(data.total),
      montoMercancias: Math.round(data.mercancias),
      montoServicios: Math.round(data.servicios),
      montoImpuestoRetenido: 0,
      cantidadComprobantes: data.cantidad,
    }))
    .sort((a, b) => b.montoTotalAnual - a.montoTotalAnual);

  // 2. AGRUPAR VENTAS (CLIENTES)
  const mapaClientes: Record<
    string,
    {
      nombre: string;
      total: number;
      cantidad: number;
      servicios: number;
      mercancias: number;
    }
  > = {};

  comprobantesAno
    .filter((c) => c.tipoOperacion === "VENTA" && c.tipoDoc !== "NOTA_CREDITO")
    .forEach((c) => {
      const ced = (c.receptorCedula || "").replace(/\D/g, "");
      if (!ced || ced === "0000000000" || ced === "-" || c.receptorNombre === "Consumidor Final") return;

      if (!mapaClientes[ced]) {
        mapaClientes[ced] = {
          nombre: c.receptorNombre || "Cliente",
          total: 0,
          cantidad: 0,
          servicios: 0,
          mercancias: 0,
        };
      }

      const monto = c.totalVentaNeta || (c.totalComprobante - (c.totalIva || 0)) || c.totalComprobante;
      mapaClientes[ced].total += monto;
      mapaClientes[ced].cantidad += 1;

      mapaClientes[ced].mercancias += monto;
    });

  const clientes: RegistroD151[] = Object.entries(mapaClientes)
    .filter(([_, data]) => data.total >= umbral)
    .map(([cedula, data]) => ({
      tipoOperacion: "VENTA",
      tipoCodigo: "V",
      tipoIdentificacion: determinarTipoCedula(cedula),
      numeroIdentificacion: cedula,
      nombreRazonSocial: data.nombre,
      montoTotalAnual: Math.round(data.total),
      montoMercancias: Math.round(data.mercancias),
      montoServicios: Math.round(data.servicios),
      montoImpuestoRetenido: 0,
      cantidadComprobantes: data.cantidad,
    }))
    .sort((a, b) => b.montoTotalAnual - a.montoTotalAnual);

  const montoTotalComprasD151 = proveedores.reduce((s, p) => s + p.montoTotalAnual, 0);
  const montoTotalVentasD151 = clientes.reduce((s, c) => s + c.montoTotalAnual, 0);

  return {
    anoFiscal,
    umbralAplicado: umbral,
    totalProveedoresSuperan: proveedores.length,
    totalClientesSuperan: clientes.length,
    montoTotalComprasD151,
    montoTotalVentasD151,
    proveedores,
    clientes,
  };
}

/**
 * Exporta el libro oficial en Excel del Formulario D-151
 */
export function exportarExcelD151(
  resultado: ResultadoD151,
  empresa: { nombre: string; identificacion: string }
) {
  const wb = XLSX.utils.book_new();

  // Hoja 1: Resumen Ejecutivo
  const resumenData = [
    ["MINISTERIO DE HACIENDA DE COSTA RICA - DIRECCIÓN GENERAL DE TRIBUTACIÓN"],
    ["DECLARACIÓN INFORMATIVA ANUAL DE CLIENTES, PROVEEDORES Y GASTOS ESPECÍFICOS (FORMULARIO D-151)"],
    [""],
    ["Razón Social Emisor:", empresa.nombre],
    ["Cédula Jurídica / Física:", empresa.identificacion],
    ["Año Fiscal:", resultado.anoFiscal.toString()],
    ["Umbral Legal Aplicado:", `₡${resultado.umbralAplicado.toLocaleString()} (Operaciones acumuladas en el período)`],
    ["Fecha de Generación:", new Date().toLocaleString("es-CR")],
    [""],
    ["RESUMEN CONSOLIDADO DE OBLIGADOS A DECLARAR D-151:"],
    ["Total Proveedores que superan el umbral:", resultado.totalProveedoresSuperan],
    ["Monto Acumulado en Compras Reportables:", resultado.montoTotalComprasD151],
    ["Total Clientes que superan el umbral:", resultado.totalClientesSuperan],
    ["Monto Acumulado en Ventas Reportables:", resultado.montoTotalVentasD151],
  ];
  const wsResumen = XLSX.utils.aoa_to_sheet(resumenData);
  XLSX.utils.book_append_sheet(wb, wsResumen, "Resumen General D-151");

  // Hoja 2: Proveedores (Compras - Código C)
  const proveedoresRows = resultado.proveedores.map((p, idx) => ({
    N: idx + 1,
    TIPO_REGISTRO: p.tipoCodigo,
    TIPO_IDENTIFICACION: p.tipoIdentificacion,
    NUMERO_CEDULA: p.numeroIdentificacion,
    RAZON_SOCIAL_PROVEEDOR: p.nombreRazonSocial,
    MONTO_TOTAL_ANUAL: p.montoTotalAnual,
    MONTO_MERCANCIAS: p.montoMercancias,
    MONTO_SERVICIOS: p.montoServicios,
    COMPROBANTES_RECIBIDOS: p.cantidadComprobantes,
  }));
  const wsProveedores = XLSX.utils.json_to_sheet(proveedoresRows);
  XLSX.utils.book_append_sheet(wb, wsProveedores, "Proveedores (>2.5M)");

  // Hoja 3: Clientes (Ventas - Código V)
  const clientesRows = resultado.clientes.map((c, idx) => ({
    N: idx + 1,
    TIPO_REGISTRO: c.tipoCodigo,
    TIPO_IDENTIFICACION: c.tipoIdentificacion,
    NUMERO_CEDULA: c.numeroIdentificacion,
    RAZON_SOCIAL_CLIENTE: c.nombreRazonSocial,
    MONTO_TOTAL_ANUAL: c.montoTotalAnual,
    MONTO_MERCANCIAS: c.montoMercancias,
    MONTO_SERVICIOS: c.montoServicios,
    COMPROBANTES_EMITIDOS: c.cantidadComprobantes,
  }));
  const wsClientes = XLSX.utils.json_to_sheet(clientesRows);
  XLSX.utils.book_append_sheet(wb, wsClientes, "Clientes (>2.5M)");

  const cleanName = empresa.nombre.replace(/[^a-zA-Z0-9]/g, "_").slice(0, 25);
  const fileName = `D151_${resultado.anoFiscal}_${cleanName}.xlsx`;
  XLSX.writeFile(wb, fileName);
}

/**
 * Exporta el archivo de texto plano / CSV para el importador de Tributación
 */
export function exportarTextoHaciendaD151(resultado: ResultadoD151): string {
  // Formato estándar delimitado por comas según especificación de Tributación DGT
  let lineas = ["TIPO_REG,TIPO_ID,NUM_ID,NOMBRE_RAZON_SOCIAL,MONTO_ANUAL,MERCANCIAS,SERVICIOS"];

  resultado.proveedores.forEach((p) => {
    lineas.push(
      `${p.tipoCodigo},${p.tipoIdentificacion},${p.numeroIdentificacion},"${p.nombreRazonSocial}",${p.montoTotalAnual},${p.montoMercancias},${p.montoServicios}`
    );
  });

  resultado.clientes.forEach((c) => {
    lineas.push(
      `${c.tipoCodigo},${c.tipoIdentificacion},${c.numeroIdentificacion},"${c.nombreRazonSocial}",${c.montoTotalAnual},${c.montoMercancias},${c.montoServicios}`
    );
  });

  return lineas.join("\n");
}
