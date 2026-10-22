import { TipoDocumento, TipoIdentificacion } from "./types";

export interface GenerarConsecutivoParams {
  sucursal?: number; // 1 -> 001
  terminal?: number; // 1 -> 00001
  tipoDocumento: TipoDocumento;
  secuencia: number; // 1 -> 0000000001
}

export interface GenerarClaveParams {
  codigoPais?: string; // 506
  fecha?: Date;
  cedulaEmisor: string;
  tipoIdentificacion?: TipoIdentificacion;
  consecutivo: string; // 20 dígitos
  situacion?: "1" | "2" | "3"; // 1 = Normal, 2 = Contingencia, 3 = Sin internet
  codigoSeguridad?: string; // 8 dígitos numéricos
}

/**
 * Genera el número consecutivo de 20 dígitos según el formato de Hacienda CR v4.3:
 * [Sucursal: 3 dígitos][Punto de Venta/Caja: 5 dígitos][Tipo Comprobante: 2 dígitos][Secuencia: 10 dígitos]
 */
export function generarConsecutivo({
  sucursal = 1,
  terminal = 1,
  tipoDocumento,
  secuencia,
}: GenerarConsecutivoParams): string {
  const sucursalStr = String(sucursal).padStart(3, "0").slice(0, 3);
  const terminalStr = String(terminal).padStart(5, "0").slice(0, 5);
  const tipoDocStr = tipoDocumento.padStart(2, "0").slice(0, 2);
  const secuenciaStr = String(secuencia).padStart(10, "0").slice(0, 10);

  return `${sucursalStr}${terminalStr}${tipoDocStr}${secuenciaStr}`;
}

/**
 * Genera la clave numérica de 50 dígitos según el estándar de Hacienda CR:
 * [Código País: 3][Día: 2][Mes: 2][Año: 2][Cédula Emisor: 12][Consecutivo: 20][Situación: 1][Código Seguridad: 8]
 */
export function generarClave({
  codigoPais = "506",
  fecha = new Date(),
  cedulaEmisor,
  consecutivo,
  situacion = "1",
  codigoSeguridad,
}: GenerarClaveParams): string {
  const dia = String(fecha.getDate()).padStart(2, "0");
  const mes = String(fecha.getMonth() + 1).padStart(2, "0");
  const ano = String(fecha.getFullYear()).slice(-2);

  // Limpiar guiones y espacios de la cédula y rellenar con ceros a la izquierda a 12 dígitos
  const cedulaLimpia = cedulaEmisor.replace(/\D/g, "");
  const cedulaStr = cedulaLimpia.padStart(12, "0").slice(0, 12);

  // Código de seguridad de 8 dígitos aleatorio si no se provee
  const segStr = (codigoSeguridad || String(Math.floor(10000000 + Math.random() * 90000000)))
    .padStart(8, "0")
    .slice(0, 8);

  const consecutivoStr = consecutivo.padStart(20, "0").slice(0, 20);

  return `${codigoPais}${dia}${mes}${ano}${cedulaStr}${consecutivoStr}${situacion}${segStr}`;
}

/**
 * Desglosa y valida una clave numérica de 50 dígitos
 */
export function desglosarClave(clave: string) {
  if (!clave || clave.length !== 50) {
    throw new Error("La clave debe contener exactamente 50 dígitos numéricos.");
  }

  return {
    codigoPais: clave.slice(0, 3),
    dia: clave.slice(3, 5),
    mes: clave.slice(5, 7),
    ano: "20" + clave.slice(7, 9),
    cedulaEmisor: clave.slice(9, 21),
    consecutivo: {
      completo: clave.slice(21, 41),
      sucursal: clave.slice(21, 24),
      terminal: clave.slice(24, 29),
      tipoDocumento: clave.slice(29, 31) as TipoDocumento,
      secuencia: clave.slice(31, 41),
    },
    situacion: clave.slice(41, 42),
    codigoSeguridad: clave.slice(42, 50),
  };
}
