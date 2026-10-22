import { obtenerTokenHacienda } from "./auth";
import { EstadoHacienda, HaciendaConfig } from "./types";
import { stringToBase64 } from "./signer";

const isBrowser = typeof window !== "undefined";

const HACIENDA_API_BASE = {
  staging: isBrowser
    ? "/api/hacienda/api-stag/recepcion/v1"
    : "https://api-sandbox.comprobanteselectronicos.go.cr/recepcion/v1",
  produccion: isBrowser
    ? "/api/hacienda/api-prod/recepcion/v1"
    : "https://api.comprobanteselectronicos.go.cr/recepcion/v1",
};

export interface RecepcionPayload {
  clave: string;
  fecha: string;
  emisor: {
    tipoIdentificacion: string;
    numeroIdentificacion: string;
  };
  receptor?: {
    tipoIdentificacion?: string;
    numeroIdentificacion?: string;
  };
  comprobanteXml: string; // XML firmado en Base64
}

export interface RespuestaConsultaHacienda {
  clave: string;
  fecha: string;
  indEstado: EstadoHacienda;
  respuestaXml?: string; // MensajeHacienda.xml decodificado
  rawResponse?: unknown;
}

/**
 * Envía un comprobante electrónico (Factura, Tiquete, NC, ND) firmado a la API de Recepción de Hacienda.
 */
export async function enviarDocumentoHacienda(
  config: HaciendaConfig,
  xmlFirmado: string,
  meta: {
    clave: string;
    fecha: Date;
    emisorTipoId: string;
    emisorNumId: string;
    receptorTipoId?: string;
    receptorNumId?: string;
  },
): Promise<{ ok: boolean; status: number; message: string }> {
  const token = await obtenerTokenHacienda(config.ambiente, config.usuarioAtv, config.claveAtv);

  const xmlBase64 = stringToBase64(xmlFirmado);

  const payload: RecepcionPayload = {
    clave: meta.clave,
    fecha: meta.fecha.toISOString(),
    emisor: {
      tipoIdentificacion: meta.emisorTipoId,
      numeroIdentificacion: meta.emisorNumId.replace(/\D/g, ""),
    },
    comprobanteXml: xmlBase64,
  };

  if (meta.receptorNumId && meta.receptorTipoId) {
    payload.receptor = {
      tipoIdentificacion: meta.receptorTipoId,
      numeroIdentificacion: meta.receptorNumId.replace(/\D/g, ""),
    };
  }

  const baseUrl = HACIENDA_API_BASE[config.ambiente];
  const response = await fetch(`${baseUrl}/recepcion`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (response.status === 202) {
    return {
      ok: true,
      status: 202,
      message: "Documento recibido por Hacienda en proceso de validación.",
    };
  }

  const errText = await response.text();
  return {
    ok: false,
    status: response.status,
    message: `Hacienda respondió con error (${response.status}): ${errText}`,
  };
}

/**
 * Consulta el estado de procesamiento de un documento en Hacienda por su clave de 50 dígitos.
 */
export async function consultarEstadoHacienda(
  config: HaciendaConfig,
  clave: string,
): Promise<RespuestaConsultaHacienda> {
  const token = await obtenerTokenHacienda(config.ambiente, config.usuarioAtv, config.claveAtv);

  const baseUrl = HACIENDA_API_BASE[config.ambiente];
  const response = await fetch(`${baseUrl}/recepcion/${clave}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  if (response.status === 404) {
    return {
      clave,
      fecha: new Date().toISOString(),
      indEstado: "procesando",
      respuestaXml: undefined,
    };
  }

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Error al consultar estado en Hacienda (${response.status}): ${errText}`);
  }

  const data = (await response.json()) as {
    clave: string;
    fecha: string;
    "ind-estado": string;
    "respuesta-xml"?: string;
  };

  let estado: EstadoHacienda = "procesando";
  const ind = (data["ind-estado"] || "").toLowerCase();
  if (ind.includes("aceptado")) estado = "aceptado";
  else if (ind.includes("rechazado")) estado = "rechazado";
  else if (ind.includes("recibido")) estado = "recibido";

  return {
    clave: data.clave,
    fecha: data.fecha,
    indEstado: estado,
    respuestaXml: data["respuesta-xml"],
    rawResponse: data,
  };
}
