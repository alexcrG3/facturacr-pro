import * as XLSX from "xlsx";
import { ComprobanteContable } from "@/lib/accounting-reports";

export interface LineaAsiento {
  cuenta: string;
  nombreCuenta: string;
  centroCosto: string;
  debe: number;
  haber: number;
  referencia: string;
  concepto: string;
}

export interface AsientoContable {
  id: string;
  tipo: "VENTAS" | "COMPRAS" | "LIQUIDACION_IVA" | "CONSOLIDADO";
  titulo: string;
  descripcion: string;
  fecha: string;
  periodo: string;
  lineas: LineaAsiento[];
  totalDebe: number;
  totalHaber: number;
  diferencia: number;
  cuadrado: boolean;
}

export interface PaqueteAsientos {
  empresaNombre: string;
  empresaCedula: string;
  periodoDesde: string;
  periodoHasta: string;
  fechaGeneracion: string;
  asientoVentas: AsientoContable;
  asientoCompras: AsientoContable;
  asientoLiquidacionIva: AsientoContable;
  asientoConsolidado: AsientoContable;
  resumen: {
    totalVentasNetas: number;
    debitoFiscalIva: number;
    totalComprasNetas: number;
    creditoFiscalIva: number;
    prorrataAplicada: number;
    ivaNoDeducibleGasto: number;
    impuestoAPagar: number;
    saldoAFavor: number;
    totalDebeGlobal: number;
    totalHaberGlobal: number;
  };
}

/**
 * Catálogo estándar de cuentas contables para Costa Rica (NIIF / Ley 9635)
 */
export const CATALOGO_CUENTAS_DEFECTO = {
  // Activos
  BANCOS: { codigo: "1110-01", nombre: "Bancos y Caja General" },
  CLIENTES: { codigo: "1120-01", nombre: "Cuentas por Cobrar Clientes" },
  IVA_SOPORTADO_13: { codigo: "1130-01", nombre: "IVA Soportado Crédito Fiscal 13%" },
  IVA_SOPORTADO_RED: { codigo: "1130-02", nombre: "IVA Soportado Crédito Tarifas Reducidas" },
  SALDO_FAVOR_IVA: { codigo: "1135-01", nombre: "Saldo a Favor IVA Hacienda (Crédito Acumulado)" },

  // Pasivos
  PROVEEDORES: { codigo: "2105-01", nombre: "Cuentas por Pagar Proveedores" },
  IVA_DEVENGADO_13: { codigo: "2110-01", nombre: "IVA Devengado Débito Fiscal 13%" },
  IVA_DEVENGADO_RED: { codigo: "2110-02", nombre: "IVA Devengado Tarifas Reducidas" },
  IVA_POR_PAGAR: { codigo: "2115-01", nombre: "IVA por Pagar Ministerio de Hacienda (Casilla 140)" },

  // Ingresos
  VENTAS_GRAVADAS_13: { codigo: "4010-01", nombre: "Ingresos por Ventas Gravadas 13%" },
  VENTAS_REDUCIDAS: { codigo: "4010-02", nombre: "Ingresos por Ventas / Servicios Tarifas Reducidas" },
  VENTAS_EXENTAS: { codigo: "4010-03", nombre: "Ingresos por Ventas Exentas y No Sujetas" },
  DEVOLUCIONES_VENTAS: { codigo: "4015-01", nombre: "Devoluciones y Descuentos sobre Ventas (NC)" },

  // Gastos / Costos
  COMPRAS_MERCANCIA: { codigo: "5010-01", nombre: "Costo de Ventas - Compras de Mercancías" },
  GASTOS_OPERATIVOS: { codigo: "5020-01", nombre: "Gastos de Operación y Administración" },
  IVA_NO_DEDUCIBLE: { codigo: "5030-01", nombre: "Gasto por IVA No Deducible (Prorrata Art. 30)" },
  DEVOLUCIONES_COMPRAS: { codigo: "5015-01", nombre: "Devoluciones sobre Compras de Mercancías (NC)" },
  AJUSTE_REDONDEO: { codigo: "5090-01", nombre: "Ajuste por Redondeo Decimal" },
};

/**
 * Genera el paquete completo de asientos contables cuadrados (Debe = Haber)
 * a partir de los comprobantes electrónicos de ventas y compras del período.
 */
export function generarAsientosContables({
  comprobantes,
  empresaNombre = "Contribuyente Costa Rica",
  empresaCedula = "3-101-000000",
  periodoDesde,
  periodoHasta,
  factorProrrata = 100, // 100% = pleno crédito fiscal
}: {
  comprobantes: ComprobanteContable[];
  empresaNombre?: string;
  empresaCedula?: string;
  periodoDesde: string;
  periodoHasta: string;
  factorProrrata?: number;
}): PaqueteAsientos {
  const fechaAsiento = periodoHasta || new Date().toISOString().slice(0, 10);
  const periodoTexto = `${periodoDesde} al ${periodoHasta}`;

  // 1. FILTRAR VENTAS Y COMPRAS
  const ventas = comprobantes.filter((c) => c.tipoOperacion === "VENTA");
  const compras = comprobantes.filter((c) => c.tipoOperacion === "COMPRA");

  // Separar facturas de notas de crédito
  const ventasFacturas = ventas.filter((c) => c.tipoDoc !== "NOTA_CREDITO");
  const ventasNC = ventas.filter((c) => c.tipoDoc === "NOTA_CREDITO");

  const comprasFacturas = compras.filter((c) => c.tipoDoc !== "NOTA_CREDITO");
  const comprasNC = compras.filter((c) => c.tipoDoc === "NOTA_CREDITO");

  // ==========================================
  // ASIENTO 1: FACTURACIÓN / VENTAS DEL PERÍODO
  // ==========================================
  let vtaBase13 = 0;
  let vtaDebito13 = 0;
  let vtaBaseRed = 0;
  let vtaDebitoRed = 0;
  let vtaBaseExenta = 0;
  let vtaTotalCobrado = 0;

  ventasFacturas.forEach((v) => {
    vtaBase13 += v.totalVentaNeta || 0;
    vtaDebito13 += v.iva13 || 0;
    vtaDebitoRed += (v.iva4 || 0) + (v.iva2 || 0) + (v.iva1 || 0);
    vtaBaseExenta += (v.totalExento || 0) + (v.totalExonerado || 0);
    vtaTotalCobrado += v.totalComprobante || 0;
  });

  // Notas de crédito de ventas (reducen ingresos o van al Debe de devoluciones)
  let ncVtaBase = 0;
  let ncVtaIva = 0;
  let ncVtaTotal = 0;

  ventasNC.forEach((nc) => {
    ncVtaBase += nc.totalVentaNeta || 0;
    ncVtaIva += nc.totalIva || 0;
    ncVtaTotal += nc.totalComprobante || 0;
  });

  const lineasVentas: LineaAsiento[] = [];

  // DEBE: Cuentas por Cobrar / Bancos (Total de facturas emitidas)
  if (vtaTotalCobrado > 0) {
    lineasVentas.push({
      cuenta: CATALOGO_CUENTAS_DEFECTO.CLIENTES.codigo,
      nombreCuenta: CATALOGO_CUENTAS_DEFECTO.CLIENTES.nombre,
      centroCosto: "02-VENTAS",
      debe: Math.round(vtaTotalCobrado * 100) / 100,
      haber: 0,
      referencia: `VTA-${periodoDesde.slice(0, 7)}`,
      concepto: `Cobros y cuentas por cobrar por facturas emitidas ${periodoTexto}`,
    });
  }

  // Si hubo Notas de Crédito emitidas a clientes:
  if (ncVtaBase > 0 || ncVtaIva > 0) {
    lineasVentas.push({
      cuenta: CATALOGO_CUENTAS_DEFECTO.DEVOLUCIONES_VENTAS.codigo,
      nombreCuenta: CATALOGO_CUENTAS_DEFECTO.DEVOLUCIONES_VENTAS.nombre,
      centroCosto: "02-VENTAS",
      debe: Math.round(ncVtaBase * 100) / 100,
      haber: 0,
      referencia: `NC-VTA-${periodoDesde.slice(0, 7)}`,
      concepto: `Devoluciones y rebajos por notas de crédito emitidas a clientes`,
    });
    if (ncVtaIva > 0) {
      lineasVentas.push({
        cuenta: CATALOGO_CUENTAS_DEFECTO.IVA_DEVENGADO_13.codigo,
        nombreCuenta: `${CATALOGO_CUENTAS_DEFECTO.IVA_DEVENGADO_13.nombre} (Reversión NC)`,
        centroCosto: "02-VENTAS",
        debe: Math.round(ncVtaIva * 100) / 100,
        haber: 0,
        referencia: `NC-IVA-${periodoDesde.slice(0, 7)}`,
        concepto: `Reversión de débito fiscal por notas de crédito emitidas`,
      });
    }
  }

  // HABER: Ingresos e IVA
  if (vtaBase13 > 0) {
    lineasVentas.push({
      cuenta: CATALOGO_CUENTAS_DEFECTO.VENTAS_GRAVADAS_13.codigo,
      nombreCuenta: CATALOGO_CUENTAS_DEFECTO.VENTAS_GRAVADAS_13.nombre,
      centroCosto: "02-VENTAS",
      debe: 0,
      haber: Math.round(vtaBase13 * 100) / 100,
      referencia: `VTA-13%`,
      concepto: `Ventas y servicios gravados al 13% del período`,
    });
  }

  if (vtaBaseRed > 0) {
    lineasVentas.push({
      cuenta: CATALOGO_CUENTAS_DEFECTO.VENTAS_REDUCIDAS.codigo,
      nombreCuenta: CATALOGO_CUENTAS_DEFECTO.VENTAS_REDUCIDAS.nombre,
      centroCosto: "02-VENTAS",
      debe: 0,
      haber: Math.round(vtaBaseRed * 100) / 100,
      referencia: `VTA-RED`,
      concepto: `Ventas gravadas a tarifas reducidas (4%, 2%, 1%)`,
    });
  }

  if (vtaBaseExenta > 0) {
    lineasVentas.push({
      cuenta: CATALOGO_CUENTAS_DEFECTO.VENTAS_EXENTAS.codigo,
      nombreCuenta: CATALOGO_CUENTAS_DEFECTO.VENTAS_EXENTAS.nombre,
      centroCosto: "02-VENTAS",
      debe: 0,
      haber: Math.round(vtaBaseExenta * 100) / 100,
      referencia: `VTA-EX`,
      concepto: `Ventas exentas, no sujetas y exportaciones`,
    });
  }

  if (vtaDebito13 > 0) {
    lineasVentas.push({
      cuenta: CATALOGO_CUENTAS_DEFECTO.IVA_DEVENGADO_13.codigo,
      nombreCuenta: CATALOGO_CUENTAS_DEFECTO.IVA_DEVENGADO_13.nombre,
      centroCosto: "02-VENTAS",
      debe: 0,
      haber: Math.round(vtaDebito13 * 100) / 100,
      referencia: `IVA-DEV-13`,
      concepto: `IVA débito fiscal devengado tarifa general 13%`,
    });
  }

  if (vtaDebitoRed > 0) {
    lineasVentas.push({
      cuenta: CATALOGO_CUENTAS_DEFECTO.IVA_DEVENGADO_RED.codigo,
      nombreCuenta: CATALOGO_CUENTAS_DEFECTO.IVA_DEVENGADO_RED.nombre,
      centroCosto: "02-VENTAS",
      debe: 0,
      haber: Math.round(vtaDebitoRed * 100) / 100,
      referencia: `IVA-DEV-RED`,
      concepto: `IVA débito fiscal devengado tarifas reducidas`,
    });
  }

  if (ncVtaTotal > 0) {
    lineasVentas.push({
      cuenta: CATALOGO_CUENTAS_DEFECTO.CLIENTES.codigo,
      nombreCuenta: CATALOGO_CUENTAS_DEFECTO.CLIENTES.nombre,
      centroCosto: "02-VENTAS",
      debe: 0,
      haber: Math.round(ncVtaTotal * 100) / 100,
      referencia: `NC-CLI`,
      concepto: `Crédito a clientes por notas de crédito aplicadas`,
    });
  }

  const asientoVentas = cuadrarAsiento({
    id: "ASIENTO-01-VENTAS",
    tipo: "VENTAS",
    titulo: "Póliza de Ingresos y Facturación de Ventas",
    descripcion: `Registro mensual de ventas netas, cobros e IVA débito devengado correspondiente a ${ventas.length} comprobantes emitidos.`,
    fecha: fechaAsiento,
    periodo: periodoTexto,
    lineas: lineasVentas,
  });

  // ==========================================
  // ASIENTO 2: COMPRAS Y GASTOS OPERATIVOS
  // ==========================================
  let cpBaseMercancia = 0;
  let cpBaseGastos = 0;
  let cpCredito13 = 0;
  let cpCreditoRed = 0;
  let cpTotalPagar = 0;

  comprasFacturas.forEach((cp) => {
    const base = cp.totalVentaNeta || (cp.totalComprobante - (cp.totalIva || 0)) || 0;
    // Si el comprobante o cabys indica servicios/gastos o mercancías
    const esGastoServicio =
      (cp.detallePrincipal && /serv|honor|alqui|electric|agua|telef|inter|gas|manten/i.test(cp.detallePrincipal)) ||
      (cp.cabysPrincipal && cp.cabysPrincipal.startsWith("8"));

    if (esGastoServicio) {
      cpBaseGastos += base;
    } else {
      cpBaseMercancia += base;
    }

    cpCredito13 += cp.iva13 || (cp.tarifaIva === 13 ? cp.totalIva : 0);
    cpCreditoRed += (cp.iva4 || 0) + (cp.iva2 || 0) + (cp.iva1 || 0);
    cpTotalPagar += cp.totalComprobante || 0;
  });

  // Notas de crédito de proveedores
  let ncCpBase = 0;
  let ncCpIva = 0;
  let ncCpTotal = 0;

  comprasNC.forEach((nc) => {
    ncCpBase += nc.totalVentaNeta || 0;
    ncCpIva += nc.totalIva || 0;
    ncCpTotal += nc.totalComprobante || 0;
  });

  const lineasCompras: LineaAsiento[] = [];

  // DEBE: Compras, Gastos y Crédito Fiscal
  if (cpBaseMercancia > 0) {
    lineasCompras.push({
      cuenta: CATALOGO_CUENTAS_DEFECTO.COMPRAS_MERCANCIA.codigo,
      nombreCuenta: CATALOGO_CUENTAS_DEFECTO.COMPRAS_MERCANCIA.nombre,
      centroCosto: "01-COSTOS",
      debe: Math.round(cpBaseMercancia * 100) / 100,
      haber: 0,
      referencia: `CP-MERC`,
      concepto: `Compras de inventario y mercancías para venta del período`,
    });
  }

  if (cpBaseGastos > 0) {
    lineasCompras.push({
      cuenta: CATALOGO_CUENTAS_DEFECTO.GASTOS_OPERATIVOS.codigo,
      nombreCuenta: CATALOGO_CUENTAS_DEFECTO.GASTOS_OPERATIVOS.nombre,
      centroCosto: "01-ADMIN",
      debe: Math.round(cpBaseGastos * 100) / 100,
      haber: 0,
      referencia: `CP-GAST`,
      concepto: `Gastos de operación, servicios públicos, honorarios y mantenimiento`,
    });
  }

  if (cpCredito13 > 0) {
    lineasCompras.push({
      cuenta: CATALOGO_CUENTAS_DEFECTO.IVA_SOPORTADO_13.codigo,
      nombreCuenta: CATALOGO_CUENTAS_DEFECTO.IVA_SOPORTADO_13.nombre,
      centroCosto: "01-ADMIN",
      debe: Math.round(cpCredito13 * 100) / 100,
      haber: 0,
      referencia: `IVA-SOP-13`,
      concepto: `IVA soportado crédito fiscal 13% en compras locales`,
    });
  }

  if (cpCreditoRed > 0) {
    lineasCompras.push({
      cuenta: CATALOGO_CUENTAS_DEFECTO.IVA_SOPORTADO_RED.codigo,
      nombreCuenta: CATALOGO_CUENTAS_DEFECTO.IVA_SOPORTADO_RED.nombre,
      centroCosto: "01-ADMIN",
      debe: Math.round(cpCreditoRed * 100) / 100,
      haber: 0,
      referencia: `IVA-SOP-RED`,
      concepto: `IVA soportado en compras a tarifas reducidas`,
    });
  }

  if (ncCpTotal > 0) {
    lineasCompras.push({
      cuenta: CATALOGO_CUENTAS_DEFECTO.PROVEEDORES.codigo,
      nombreCuenta: CATALOGO_CUENTAS_DEFECTO.PROVEEDORES.nombre,
      centroCosto: "01-ADMIN",
      debe: Math.round(ncCpTotal * 100) / 100,
      haber: 0,
      referencia: `NC-PROV`,
      concepto: `Reducción de cuentas por pagar por notas de crédito recibidas`,
    });
  }

  // HABER: Cuentas por pagar proveedores
  if (cpTotalPagar > 0) {
    lineasCompras.push({
      cuenta: CATALOGO_CUENTAS_DEFECTO.PROVEEDORES.codigo,
      nombreCuenta: CATALOGO_CUENTAS_DEFECTO.PROVEEDORES.nombre,
      centroCosto: "01-ADMIN",
      debe: 0,
      haber: Math.round(cpTotalPagar * 100) / 100,
      referencia: `CXP-PROV`,
      concepto: `Cuentas por pagar a proveedores según facturas recibidas`,
    });
  }

  if (ncCpBase > 0) {
    lineasCompras.push({
      cuenta: CATALOGO_CUENTAS_DEFECTO.DEVOLUCIONES_COMPRAS.codigo,
      nombreCuenta: CATALOGO_CUENTAS_DEFECTO.DEVOLUCIONES_COMPRAS.nombre,
      centroCosto: "01-COSTOS",
      debe: 0,
      haber: Math.round(ncCpBase * 100) / 100,
      referencia: `NC-DEV`,
      concepto: `Devoluciones y rebajos obtenidos sobre compras de proveedores`,
    });
  }

  if (ncCpIva > 0) {
    lineasCompras.push({
      cuenta: CATALOGO_CUENTAS_DEFECTO.IVA_SOPORTADO_13.codigo,
      nombreCuenta: `${CATALOGO_CUENTAS_DEFECTO.IVA_SOPORTADO_13.nombre} (Reversión NC)`,
      centroCosto: "01-ADMIN",
      debe: 0,
      haber: Math.round(ncCpIva * 100) / 100,
      referencia: `NC-IVA-SOP`,
      concepto: `Reversión de crédito fiscal por notas de crédito de proveedores`,
    });
  }

  const asientoCompras = cuadrarAsiento({
    id: "ASIENTO-02-COMPRAS",
    tipo: "COMPRAS",
    titulo: "Póliza de Egresos y Compras de Bienes / Servicios",
    descripcion: `Registro de costos, gastos operacionales, pasivos con proveedores e IVA crédito fiscal soportado correspondiente a ${compras.length} comprobantes de compra.`,
    fecha: fechaAsiento,
    periodo: periodoTexto,
    lineas: lineasCompras,
  });

  // ==========================================
  // ASIENTO 3: CIERRE Y LIQUIDACIÓN MENSUAL DEL IVA D-104
  // ==========================================
  // Débito fiscal total neto
  const totalDebitoFiscalNeto = Math.max(0, vtaDebito13 + vtaDebitoRed - ncVtaIva);
  // Crédito fiscal bruto total neto
  const totalCreditoFiscalBruto = Math.max(0, cpCredito13 + cpCreditoRed - ncCpIva);

  // Prorrata
  const ratio = Math.max(0, Math.min(100, factorProrrata)) / 100;
  const creditoFiscalEfectivo = Math.round(totalCreditoFiscalBruto * ratio * 100) / 100;
  const ivaNoDeducibleGasto = Math.round((totalCreditoFiscalBruto - creditoFiscalEfectivo) * 100) / 100;

  // Resultado D-104
  const diferenciaIva = Math.round((totalDebitoFiscalNeto - creditoFiscalEfectivo) * 100) / 100;
  const impuestoAPagar = diferenciaIva > 0 ? diferenciaIva : 0;
  const saldoAFavor = diferenciaIva < 0 ? Math.abs(diferenciaIva) : 0;

  const lineasLiquidacion: LineaAsiento[] = [];

  // DEBE: Cancelación del Débito Fiscal del período
  if (totalDebitoFiscalNeto > 0) {
    lineasLiquidacion.push({
      cuenta: CATALOGO_CUENTAS_DEFECTO.IVA_DEVENGADO_13.codigo,
      nombreCuenta: `${CATALOGO_CUENTAS_DEFECTO.IVA_DEVENGADO_13.nombre} (Cierre Mensual)`,
      centroCosto: "00-TRIBUTARIO",
      debe: totalDebitoFiscalNeto,
      haber: 0,
      referencia: `LIQ-DEV`,
      concepto: `Cancelación de cuenta transitoria Débito Fiscal del mes D-104 Casilla [110]`,
    });
  }

  // Si hubo IVA No Deducible por Prorrata, se reclasifica a Gasto Deducible en Renta
  if (ivaNoDeducibleGasto > 0) {
    lineasLiquidacion.push({
      cuenta: CATALOGO_CUENTAS_DEFECTO.IVA_NO_DEDUCIBLE.codigo,
      nombreCuenta: CATALOGO_CUENTAS_DEFECTO.IVA_NO_DEDUCIBLE.nombre,
      centroCosto: "01-ADMIN",
      debe: ivaNoDeducibleGasto,
      haber: 0,
      referencia: `PRORRATA-${factorProrrata.toFixed(1)}%`,
      concepto: `Reclasificación de IVA sin derecho a crédito como gasto deducible para Renta D-101 (Art. 30 Ley 9635)`,
    });
  }

  // Si queda Saldo a Favor del Contribuyente (Activo exigible)
  if (saldoAFavor > 0) {
    lineasLiquidacion.push({
      cuenta: CATALOGO_CUENTAS_DEFECTO.SALDO_FAVOR_IVA.codigo,
      nombreCuenta: CATALOGO_CUENTAS_DEFECTO.SALDO_FAVOR_IVA.nombre,
      centroCosto: "00-TRIBUTARIO",
      debe: saldoAFavor,
      haber: 0,
      referencia: `D104-CASILLA-141`,
      concepto: `Saldo a favor del contribuyente generado en el período para compensar en meses futuros`,
    });
  }

  // HABER: Cancelación de la cuenta de Crédito Fiscal Soportado Bruto
  if (totalCreditoFiscalBruto > 0) {
    lineasLiquidacion.push({
      cuenta: CATALOGO_CUENTAS_DEFECTO.IVA_SOPORTADO_13.codigo,
      nombreCuenta: `${CATALOGO_CUENTAS_DEFECTO.IVA_SOPORTADO_13.nombre} (Cierre Mensual)`,
      centroCosto: "00-TRIBUTARIO",
      debe: 0,
      haber: totalCreditoFiscalBruto,
      referencia: `LIQ-SOP`,
      concepto: `Cancelación de cuenta transitoria Crédito Fiscal soportado Casilla [130]`,
    });
  }

  // Si queda Impuesto a Pagar a Hacienda (Pasivo exigible)
  if (impuestoAPagar > 0) {
    lineasLiquidacion.push({
      cuenta: CATALOGO_CUENTAS_DEFECTO.IVA_POR_PAGAR.codigo,
      nombreCuenta: CATALOGO_CUENTAS_DEFECTO.IVA_POR_PAGAR.nombre,
      centroCosto: "00-TRIBUTARIO",
      debe: 0,
      haber: impuestoAPagar,
      referencia: `D104-CASILLA-140`,
      concepto: `Pasivo exigible a cancelar a Hacienda antes del día 15 según Declaración D-104`,
    });
  }

  const asientoLiquidacionIva = cuadrarAsiento({
    id: "ASIENTO-03-LIQUIDACION-IVA",
    tipo: "LIQUIDACION_IVA",
    titulo: "Póliza de Cierre y Liquidación Tributaria del IVA D-104",
    descripcion: `Cancelación de cuentas transitorias de IVA Débito y Crédito, aplicación de prorrata y determinación del saldo a pagar o a favor oficial ante Hacienda.`,
    fecha: fechaAsiento,
    periodo: periodoTexto,
    lineas: lineasLiquidacion,
  });

  // ==========================================
  // ASIENTO 4: PÓLIZA CONSOLIDADA MENSUAL
  // ==========================================
  const lineasConsolidadas: LineaAsiento[] = [
    ...asientoVentas.lineas,
    ...asientoCompras.lineas,
    ...asientoLiquidacionIva.lineas,
  ];

  const asientoConsolidado = cuadrarAsiento({
    id: "ASIENTO-04-CONSOLIDADO-MENSUAL",
    tipo: "CONSOLIDADO",
    titulo: "Póliza Mensual Consolidada de Operaciones y Tributos",
    descripcion: `Asiento maestro integral que combina facturación, costos, gastos y liquidación de impuestos del período en una sola póliza cuadrada al centavo.`,
    fecha: fechaAsiento,
    periodo: periodoTexto,
    lineas: lineasConsolidadas,
  });

  const totalDebeGlobal =
    asientoVentas.totalDebe + asientoCompras.totalDebe + asientoLiquidacionIva.totalDebe;
  const totalHaberGlobal =
    asientoVentas.totalHaber + asientoCompras.totalHaber + asientoLiquidacionIva.totalHaber;

  return {
    empresaNombre,
    empresaCedula,
    periodoDesde,
    periodoHasta,
    fechaGeneracion: new Date().toISOString(),
    asientoVentas,
    asientoCompras,
    asientoLiquidacionIva,
    asientoConsolidado,
    resumen: {
      totalVentasNetas: Math.max(0, vtaBase13 + vtaBaseRed + vtaBaseExenta - ncVtaBase),
      debitoFiscalIva: totalDebitoFiscalNeto,
      totalComprasNetas: Math.max(0, cpBaseMercancia + cpBaseGastos - ncCpBase),
      creditoFiscalIva: totalCreditoFiscalBruto,
      prorrataAplicada: factorProrrata,
      ivaNoDeducibleGasto,
      impuestoAPagar,
      saldoAFavor,
      totalDebeGlobal,
      totalHaberGlobal,
    },
  };
}

/**
 * Función matemática que verifica el balance Debe = Haber
 * y ajusta cualquier milésima residual por redondeo en la cuenta de ajuste.
 */
function cuadrarAsiento({
  id,
  tipo,
  titulo,
  descripcion,
  fecha,
  periodo,
  lineas,
}: {
  id: string;
  tipo: "VENTAS" | "COMPRAS" | "LIQUIDACION_IVA" | "CONSOLIDADO";
  titulo: string;
  descripcion: string;
  fecha: string;
  periodo: string;
  lineas: LineaAsiento[];
}): AsientoContable {
  let sumDebe = lineas.reduce((acc, l) => acc + (l.debe || 0), 0);
  let sumHaber = lineas.reduce((acc, l) => acc + (l.haber || 0), 0);

  sumDebe = Math.round(sumDebe * 100) / 100;
  sumHaber = Math.round(sumHaber * 100) / 100;

  const diff = Math.round((sumDebe - sumHaber) * 100) / 100;

  // Si hay diferencia menor a ₡2 por redondeos de comprobantes, se ajusta automáticamente
  if (diff !== 0 && Math.abs(diff) <= 2) {
    if (diff > 0) {
      // Falta en el Haber
      lineas.push({
        cuenta: CATALOGO_CUENTAS_DEFECTO.AJUSTE_REDONDEO.codigo,
        nombreCuenta: CATALOGO_CUENTAS_DEFECTO.AJUSTE_REDONDEO.nombre,
        centroCosto: "01-ADMIN",
        debe: 0,
        haber: Math.abs(diff),
        referencia: "AJUSTE",
        concepto: "Ajuste técnico por redondeo decimal en comprobantes",
      });
      sumHaber += Math.abs(diff);
    } else {
      // Falta en el Debe
      lineas.push({
        cuenta: CATALOGO_CUENTAS_DEFECTO.AJUSTE_REDONDEO.codigo,
        nombreCuenta: CATALOGO_CUENTAS_DEFECTO.AJUSTE_REDONDEO.nombre,
        centroCosto: "01-ADMIN",
        debe: Math.abs(diff),
        haber: 0,
        referencia: "AJUSTE",
        concepto: "Ajuste técnico por redondeo decimal en comprobantes",
      });
      sumDebe += Math.abs(diff);
    }
  }

  sumDebe = Math.round(sumDebe * 100) / 100;
  sumHaber = Math.round(sumHaber * 100) / 100;
  const finalDiff = Math.round((sumDebe - sumHaber) * 100) / 100;

  return {
    id,
    tipo,
    titulo,
    descripcion,
    fecha,
    periodo,
    lineas,
    totalDebe: sumDebe,
    totalHaber: sumHaber,
    diferencia: finalDiff,
    cuadrado: Math.abs(finalDiff) < 0.01,
  };
}

/**
 * Exporta el libro de asientos contables a un archivo Excel (.xlsx) con múltiples pestañas
 */
export function exportarExcelAsientos(paquete: PaqueteAsientos) {
  const wb = XLSX.utils.book_new();

  // Hoja 1: Resumen General y Cuadro de Mando
  const resumenRows = [
    ["DESPACHO CONTABLE - EXPORTADOR DE ASIENTOS Y PÓLIZAS DE DIARIO"],
    ["EMPRESA / CONTRIBUYENTE:", paquete.empresaNombre],
    ["CÉDULA JURÍDICA / IDENTIFICACIÓN:", paquete.empresaCedula],
    ["PERÍODO FISCAL:", `${paquete.periodoDesde} al ${paquete.periodoHasta}`],
    ["FECHA DE PROCESO:", new Date().toLocaleString("es-CR")],
    ["ESTADO DE CUADRATURA GLOBAL:", paquete.asientoConsolidado.cuadrado ? "✓ BALANCEADO AL CENTAVO (CUADRADO)" : "⚠️ DESCUADRADO"],
    [""],
    ["CUADRO DE CONTROL DE POLIZAS:"],
    ["PÓLIZA", "DESCRIPCIÓN", "FECHA", "TOTAL DEBE (₡)", "TOTAL HABER (₡)", "DIFERENCIA", "ESTADO"],
    [
      paquete.asientoVentas.titulo,
      paquete.asientoVentas.descripcion,
      paquete.asientoVentas.fecha,
      paquete.asientoVentas.totalDebe,
      paquete.asientoVentas.totalHaber,
      paquete.asientoVentas.diferencia,
      paquete.asientoVentas.cuadrado ? "CUADRADO" : "DESCUADRADO",
    ],
    [
      paquete.asientoCompras.titulo,
      paquete.asientoCompras.descripcion,
      paquete.asientoCompras.fecha,
      paquete.asientoCompras.totalDebe,
      paquete.asientoCompras.totalHaber,
      paquete.asientoCompras.diferencia,
      paquete.asientoCompras.cuadrado ? "CUADRADO" : "DESCUADRADO",
    ],
    [
      paquete.asientoLiquidacionIva.titulo,
      paquete.asientoLiquidacionIva.descripcion,
      paquete.asientoLiquidacionIva.fecha,
      paquete.asientoLiquidacionIva.totalDebe,
      paquete.asientoLiquidacionIva.totalHaber,
      paquete.asientoLiquidacionIva.diferencia,
      paquete.asientoLiquidacionIva.cuadrado ? "CUADRADO" : "DESCUADRADO",
    ],
    [
      "TOTAL CONSOLIDADO",
      "Suma de todas las pólizas del período",
      paquete.periodoHasta,
      paquete.resumen.totalDebeGlobal,
      paquete.resumen.totalHaberGlobal,
      paquete.asientoConsolidado.diferencia,
      paquete.asientoConsolidado.cuadrado ? "CUADRADO" : "DESCUADRADO",
    ],
    [""],
    ["RESUMEN TRIBUTARIO CONCILIADO CON D-104:"],
    ["Ventas Netas Totales:", paquete.resumen.totalVentasNetas],
    ["Débito Fiscal IVA Cobrado:", paquete.resumen.debitoFiscalIva],
    ["Compras y Gastos Netos Totales:", paquete.resumen.totalComprasNetas],
    ["Crédito Fiscal IVA Soportado Bruto:", paquete.resumen.creditoFiscalIva],
    ["Porcentaje de Prorrata Aplicada [Casilla 114]:", `${paquete.resumen.prorrataAplicada.toFixed(2)}%`],
    ["Gasto por IVA No Deducible (Renta D-101):", paquete.resumen.ivaNoDeducibleGasto],
    ["Impuesto a Pagar a Hacienda [Casilla 140]:", paquete.resumen.impuestoAPagar],
    ["Saldo a Favor del Contribuyente [Casilla 141]:", paquete.resumen.saldoAFavor],
  ];
  const wsResumen = XLSX.utils.aoa_to_sheet(resumenRows);
  XLSX.utils.book_append_sheet(wb, wsResumen, "Resumen General");

  // Función auxiliar para agregar hojas de asiento
  const agregarHojaAsiento = (asiento: AsientoContable, nombreHoja: string) => {
    const rows = asiento.lineas.map((l, idx) => ({
      LINEA: idx + 1,
      CODIGO_CUENTA: l.cuenta,
      NOMBRE_CUENTA: l.nombreCuenta,
      CENTRO_COSTO: l.centroCosto,
      DEBE: l.debe > 0 ? l.debe : "",
      HABER: l.haber > 0 ? l.haber : "",
      REFERENCIA: l.referencia,
      CONCEPTO: l.concepto,
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, nombreHoja);
  };

  agregarHojaAsiento(paquete.asientoVentas, "Asiento Ventas");
  agregarHojaAsiento(paquete.asientoCompras, "Asiento Compras");
  agregarHojaAsiento(paquete.asientoLiquidacionIva, "Liquidación IVA D104");
  agregarHojaAsiento(paquete.asientoConsolidado, "Póliza Consolidada");

  // Hoja Formato Softland ERP
  const softlandRows = paquete.asientoConsolidado.lineas.map((l) => ({
    CUENTA: l.cuenta.replace(/-/g, ""),
    CENTRO_COSTO: l.centroCosto || "00",
    FECHA: paquete.periodoHasta.replace(/-/g, "/"),
    REFERENCIA: l.referencia,
    DESCRIPCION: l.concepto.slice(0, 50),
    DEBITO: l.debe || 0,
    CREDITO: l.haber || 0,
  }));
  const wsSoftland = XLSX.utils.json_to_sheet(softlandRows);
  XLSX.utils.book_append_sheet(wb, wsSoftland, "Softland ERP");

  // Hoja Formato QuickBooks Online / Desktop
  const quickbooksRows = paquete.asientoConsolidado.lineas.map((l) => ({
    Date: paquete.periodoHasta,
    "Journal No": `POL-${paquete.periodoDesde.slice(0, 7)}`,
    Account: `${l.cuenta} - ${l.nombreCuenta}`,
    Description: l.concepto,
    Debit: l.debe || "",
    Credit: l.haber || "",
    "Class / Department": l.centroCosto,
    Memo: `FacturaCR Pro - Ref: ${l.referencia}`,
  }));
  const wsQuickbooks = XLSX.utils.json_to_sheet(quickbooksRows);
  XLSX.utils.book_append_sheet(wb, wsQuickbooks, "QuickBooks");

  const cleanName = paquete.empresaNombre.replace(/[^a-zA-Z0-9]/g, "_").slice(0, 25);
  const fileName = `Asientos_Contables_${paquete.periodoHasta.slice(0, 7)}_${cleanName}.xlsx`;
  XLSX.writeFile(wb, fileName);
}

/**
 * Exporta el asiento en formato CSV para Softland ERP
 */
export function exportarCsvSoftland(asiento: AsientoContable, fecha: string): string {
  const lineas = ["CUENTA;CENTRO_COSTO;FECHA;REFERENCIA;DESCRIPCION;DEBITO;CREDITO"];
  asiento.lineas.forEach((l) => {
    const cuentaLimpia = l.cuenta.replace(/-/g, "");
    const centro = l.centroCosto || "00";
    const desc = l.concepto.replace(/;/g, ",").slice(0, 60);
    lineas.push(`${cuentaLimpia};${centro};${fecha};${l.referencia};"${desc}";${l.debe.toFixed(2)};${l.haber.toFixed(2)}`);
  });
  return lineas.join("\r\n");
}

/**
 * Exporta el asiento en formato CSV para QuickBooks
 */
export function exportarCsvQuickBooks(asiento: AsientoContable, fecha: string): string {
  const lineas = ["Date,Journal No,Account,Description,Debit,Credit,Class"];
  asiento.lineas.forEach((l, i) => {
    const desc = l.concepto.replace(/"/g, '""');
    const acc = `"${l.cuenta} ${l.nombreCuenta}"`;
    lineas.push(`${fecha},POL-${fecha.slice(0, 7)},${acc},"${desc}",${l.debe > 0 ? l.debe.toFixed(2) : ""},${l.haber > 0 ? l.haber.toFixed(2) : ""},"${l.centroCosto}"`);
  });
  return lineas.join("\r\n");
}

/**
 * Genera texto tabulado (TSV) para pegar directamente con Ctrl+V en Excel o Google Sheets
 */
export function generarTextoTabuladoAsiento(asiento: AsientoContable): string {
  const lineas = ["Línea\tCódigo Cuenta\tNombre de Cuenta\tCentro Costo\tDebe (₡)\tHaber (₡)\tReferencia\tConcepto"];
  asiento.lineas.forEach((l, i) => {
    lineas.push(
      `${i + 1}\t${l.cuenta}\t${l.nombreCuenta}\t${l.centroCosto}\t${l.debe > 0 ? l.debe.toFixed(2) : "0.00"}\t${l.haber > 0 ? l.haber.toFixed(2) : "0.00"}\t${l.referencia}\t${l.concepto}`
    );
  });
  lineas.push(`\t\tTOTALES:\t\t${asiento.totalDebe.toFixed(2)}\t${asiento.totalHaber.toFixed(2)}\tDiferencia:\t${asiento.diferencia.toFixed(2)}`);
  return lineas.join("\n");
}
