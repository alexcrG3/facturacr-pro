import { ComprobanteContable } from "@/lib/accounting-reports";

export type NivelRiesgoTributario = "BAJO" | "MEDIO" | "ALTO";
export type TipoAlerta = "CRITICO" | "ADVERTENCIA" | "INFORMATIVO";

export interface AlertaFiscal {
  id: string;
  tipo: TipoAlerta;
  titulo: string;
  descripcion: string;
  solucionSugerida: string;
  casillaAfectada?: string;
}

export interface DiagnosticoRiesgoFiscal {
  puntuacionSalud: number; // 0 a 100
  nivelRiesgo: NivelRiesgoTributario;
  alertas: AlertaFiscal[];
  totalVentas: number;
  totalCompras: number;
  margenOperativoPct: number;
  proveedoresD151: { nombre: string; cedula: string; total: number }[];
  clientesD151: { nombre: string; cedula: string; total: number }[];
  comprasSinCCE: number;
  notasCreditoPorcentaje: number;
}

/**
 * Motor de Auditoría Preventiva y Semáforo de Riesgo Tributario para Hacienda Costa Rica.
 * Analiza comprobantes emitidos y recibidos detectando contingencias fiscales antes de presentar el D-104.
 */
export function evaluarRiesgoTributario({
  comprobantes,
  actividadEconomicaCodigo = "620901",
  empresaCedula = "",
}: {
  comprobantes: ComprobanteContable[];
  actividadEconomicaCodigo?: string;
  empresaCedula?: string;
}): DiagnosticoRiesgoFiscal {
  const alertas: AlertaFiscal[] = [];
  let puntosDescuento = 0;

  const ventas = comprobantes.filter((c) => c.tipoOperacion === "VENTA");
  const compras = comprobantes.filter((c) => c.tipoOperacion === "COMPRA");

  const totalVentas = ventas.reduce((s, c) => s + c.totalComprobante, 0);
  const totalCompras = compras.reduce((s, c) => s + c.totalComprobante, 0);

  // 1. EVALUAR CONFIRMACIÓN CCE (MENSAJE RECEPTOR EN COMPRAS)
  const comprasSinCCE = compras.filter(
    (c) => c.estadoHacienda !== "ACEPTADO"
  ).length;

  if (comprasSinCCE > 0) {
    puntosDescuento += Math.min(25, comprasSinCCE * 5);
    alertas.push({
      id: "alerta-cce-pendiente",
      tipo: comprasSinCCE > 3 ? "CRITICO" : "ADVERTENCIA",
      titulo: `${comprasSinCCE} facturas de compra sin confirmación oficial (CCE)`,
      descripcion:
        "Tributación exige la emisión del Mensaje Receptor (Doc 05) antes del día 8 hábil del mes siguiente para que el crédito fiscal sea legalmente deducible.",
      solucionSugerida:
        "Abre la 'Bandeja de Aceptación Masiva (CCE)' y transmite la aceptación en lote para blindar tu crédito fiscal.",
      casillaAfectada: "Casilla [121] / [130]",
    });
  }

  // 2. EVALUAR PRORRATA DEL IVA (VENTAS EXENTAS VS GRAVADAS)
  const ventasExentas = ventas
    .filter((c) => (c.totalIva || 0) === 0)
    .reduce((s, c) => s + c.totalComprobante, 0);

  if (totalVentas > 0 && ventasExentas > 0) {
    const pctExento = (ventasExentas / totalVentas) * 100;
    if (pctExento > 10) {
      alertas.push({
        id: "alerta-prorrata",
        tipo: "INFORMATIVO",
        titulo: `Operaciones Mixtas Detectadas (${pctExento.toFixed(1)}% ventas exentas)`,
        descripcion:
          "Tienes facturación exenta de IVA. Hacienda prohíbe descontarse el 100% del IVA en gastos comunes sin aplicar el coeficiente de proporcionalidad.",
        solucionSugerida:
          "DeclaraHub ya calculó tu Casilla [114] y ajustó tu crédito deducible en la Casilla [131]. Asegúrate de usar la Casilla [131] en TRIBU-CR.",
        casillaAfectada: "Casilla [114] / [131]",
      });
    }
  }

  // 3. EVALUAR NOTAS DE CRÉDITO Y ANULACIONES
  const notasCredito = ventas.filter((c) => c.tipoDoc === "NOTA_CREDITO");
  const totalNotasCredito = notasCredito.reduce(
    (s, c) => s + c.totalComprobante,
    0
  );
  const notasCreditoPorcentaje =
    totalVentas > 0 ? (totalNotasCredito / totalVentas) * 100 : 0;

  if (notasCreditoPorcentaje > 15) {
    puntosDescuento += 15;
    alertas.push({
      id: "alerta-anulaciones-altas",
      tipo: "ADVERTENCIA",
      titulo: `Volumen inusual de notas de crédito (${notasCreditoPorcentaje.toFixed(1)}% de las ventas)`,
      descripcion:
        "Un porcentaje de anulaciones mayor al 15% mensual es uno de los disparadores automáticos de fiscalización de Hacienda por sospecha de ventas no reportadas.",
      solucionSugerida:
        "Verifica que las notas de crédito hagan referencia válida al comprobante original con códigos de error material (13, 14, 15).",
      casillaAfectada: "Casilla [104]",
    });
  }

  // 4. EVALUAR MARGEN OPERATIVO (COMPRAS SUPERIORES A VENTAS)
  let margenOperativoPct = 0;
  if (totalVentas > 0) {
    margenOperativoPct = ((totalVentas - totalCompras) / totalVentas) * 100;
  }

  if (totalCompras > totalVentas && totalVentas > 0) {
    puntosDescuento += 10;
    alertas.push({
      id: "alerta-margen-negativo",
      tipo: "ADVERTENCIA",
      titulo: "Compras del período superan a las ventas emitidas",
      descripcion:
        "Tus gastos soportados superaron la facturación del mes, generando saldo a favor (Casilla 141). Si esta condición se repite más de 3 meses consecutivos, Hacienda puede auditar inventarios.",
      solucionSugerida:
        "Conserva todos los XML de compras y comprobantes de pago bancario que demuestren adquisición de activos o inventario estacional.",
      casillaAfectada: "Casilla [141]",
    });
  }

  // 5. EVALUAR COMPROBANTES CON ESTADO RECHAZADO POR HACIENDA
  const rechazosHacienda = comprobantes.filter(
    (c) => c.estadoHacienda === "RECHAZADO"
  ).length;

  if (rechazosHacienda > 0) {
    puntosDescuento += Math.min(30, rechazosHacienda * 10);
    alertas.push({
      id: "alerta-rechazos-hacienda",
      tipo: "CRITICO",
      titulo: `${rechazosHacienda} comprobante(s) rechazado(s) por Hacienda`,
      descripcion:
        "Existen documentos transmitidos que fueron rechazados por Hacienda (error en CAByS, cédula o firma). No son válidos tributariamente.",
      solucionSugerida:
        "Revisa el detalle del error en la lista de comprobantes y sustituye el documento con la corrección respectiva.",
    });
  }

  // 6. DETECCIÓN DE OPERACIONES SUJETAS A REPORTE D-151 (> ₡2,500,000)
  const acumuladoProveedores: Record<string, { nombre: string; total: number }> = {};
  compras.forEach((c) => {
    const ced = c.emisorCedula || "0000000000";
    if (!acumuladoProveedores[ced]) {
      acumuladoProveedores[ced] = { nombre: c.emisorNombre, total: 0 };
    }
    acumuladoProveedores[ced].total += c.totalComprobante;
  });

  const proveedoresD151 = Object.entries(acumuladoProveedores)
    .filter(([_, data]) => data.total >= 2500000)
    .map(([cedula, data]) => ({ cedula, nombre: data.nombre, total: data.total }));

  const acumuladoClientes: Record<string, { nombre: string; total: number }> = {};
  ventas.forEach((v) => {
    const ced = v.receptorCedula || "0000000000";
    if (ced && ced !== "0000000000" && ced !== "-") {
      if (!acumuladoClientes[ced]) {
        acumuladoClientes[ced] = { nombre: v.receptorNombre, total: 0 };
      }
      acumuladoClientes[ced].total += v.totalComprobante;
    }
  });

  const clientesD151 = Object.entries(acumuladoClientes)
    .filter(([_, data]) => data.total >= 2500000)
    .map(([cedula, data]) => ({ cedula, nombre: data.nombre, total: data.total }));

  if (proveedoresD151.length > 0 || clientesD151.length > 0) {
    alertas.push({
      id: "alerta-d151-limite",
      tipo: "INFORMATIVO",
      titulo: `Alerta D-151: ${proveedoresD151.length + clientesD151.length} tercero(s) superan los ₡2.5M`,
      descripcion:
        `Tienes operaciones acumuladas que superan el umbral informativo de ₡2,500,000 colones establecido por la DGT.`,
      solucionSugerida:
        "Verifica que las cédulas y razones sociales estén completas para el reporte anual D-151.",
    });
  }

  // Puntuación Final de Salud Fiscal (0 a 100)
  const puntuacionSalud = Math.max(0, Math.min(100, 100 - puntosDescuento));
  const nivelRiesgo: NivelRiesgoTributario =
    puntuacionSalud >= 85 ? "BAJO" : puntuacionSalud >= 60 ? "MEDIO" : "ALTO";

  return {
    puntuacionSalud,
    nivelRiesgo,
    alertas,
    totalVentas,
    totalCompras,
    margenOperativoPct,
    proveedoresD151,
    clientesD151,
    comprasSinCCE,
    notasCreditoPorcentaje,
  };
}
