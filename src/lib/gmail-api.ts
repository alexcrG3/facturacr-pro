/**
 * Servicio de Integración con Google Workspace / Gmail API
 * Utiliza OAuth 2.0 (Google Identity Services) para consultar mensajes y descargar XMLs de facturas
 */

import { ComprobanteContable, parsearXmlHacienda, guardarComprobanteContable } from "./accounting-reports";

export interface GmailAttachmentInfo {
  filename: string;
  attachmentId: string;
  mimeType: string;
  size: number;
}

export interface GmailMessageSummary {
  id: string;
  threadId: string;
  subject: string;
  from: string;
  date: string;
  attachments: GmailAttachmentInfo[];
}

/**
 * Inicializa el cliente de Google Identity Services y solicita autorización
 */
export async function solicitarTokenGoogleWorkspace(clientId: string): Promise<string> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined") {
      reject(new Error("Solo disponible en navegador"));
      return;
    }

    // Cargar script de Google Identity Services si no existe
    const initGis = () => {
      const google = (window as any).google;
      if (!google || !google.accounts || !google.accounts.oauth2) {
        reject(new Error("No se pudo cargar la librería de Google Identity Services"));
        return;
      }

      try {
        const tokenClient = google.accounts.oauth2.initTokenClient({
          client_id: clientId.trim(),
          scope: "https://www.googleapis.com/auth/gmail.readonly",
          callback: (tokenResponse: any) => {
            if (tokenResponse && tokenResponse.access_token) {
              // Guardar token temporalmente en sessionStorage
              sessionStorage.setItem("facturacr_google_access_token", tokenResponse.access_token);
              sessionStorage.setItem(
                "facturacr_google_token_expiry",
                String(Date.now() + (tokenResponse.expires_in || 3600) * 1000)
              );
              resolve(tokenResponse.access_token);
            } else if (tokenResponse && tokenResponse.error) {
              reject(new Error(tokenResponse.error_description || tokenResponse.error));
            } else {
              reject(new Error("No se recibió token de acceso de Google"));
            }
          },
        });

        // Abrir popup de Google
        tokenClient.requestAccessToken({ prompt: "consent" });
      } catch (err: any) {
        reject(new Error(err?.message || "Error al inicializar cliente de Google"));
      }
    };

    if ((window as any).google?.accounts?.oauth2) {
      initGis();
    } else {
      const script = document.createElement("script");
      script.src = "https://accounts.google.com/gsi/client";
      script.async = true;
      script.defer = true;
      script.onload = initGis;
      script.onerror = () => reject(new Error("Error al descargar script de Google"));
      document.body.appendChild(script);
    }
  });
}

/**
 * Obtiene el token de acceso activo o null si expiró
 */
export function obtenerTokenGoogleActivo(): string | null {
  if (typeof window === "undefined") return null;
  const token = sessionStorage.getItem("facturacr_google_access_token");
  const expiry = sessionStorage.getItem("facturacr_google_token_expiry");
  if (!token || !expiry) return null;
  if (Date.now() > Number(expiry) - 60000) {
    return null; // Expirado o próximo a expirar
  }
  return token;
}

/**
 * Cierra sesión / olvida token de Google
 */
export function revocarTokenGoogle() {
  if (typeof window === "undefined") return;
  const token = sessionStorage.getItem("facturacr_google_access_token");
  if (token && (window as any).google?.accounts?.oauth2) {
    try {
      (window as any).google.accounts.oauth2.revoke(token, () => {});
    } catch {}
  }
  sessionStorage.removeItem("facturacr_google_access_token");
  sessionStorage.removeItem("facturacr_google_token_expiry");
}

/**
 * Busca mensajes en Gmail según el query (ej: "label:oficina-administrativo-factura-electronica")
 */
export async function buscarMensajesGmail(
  accessToken: string,
  query: string,
  maxResults = 100
): Promise<{ id: string; threadId: string }[]> {
  const url = `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(
    query
  )}&maxResults=${maxResults}`;

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData?.error?.message || `Error ${res.status} al consultar mensajes de Gmail`);
  }

  const data = await res.json();
  return data.messages || [];
}

/**
 * Obtiene el detalle de un mensaje con sus partes y archivos adjuntos
 */
export async function obtenerDetalleMensaje(
  accessToken: string,
  messageId: string
): Promise<GmailMessageSummary | null> {
  const url = `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}?format=full`;

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
  });

  if (!res.ok) return null;
  const data = await res.json();

  let subject = "(Sin asunto)";
  let from = "";
  let date = "";

  const headers = data.payload?.headers || [];
  for (const h of headers) {
    if (h.name.toLowerCase() === "subject") subject = h.value;
    if (h.name.toLowerCase() === "from") from = h.value;
    if (h.name.toLowerCase() === "date") date = h.value;
  }

  const attachments: GmailAttachmentInfo[] = [];

  function extraerAdjuntos(part: any) {
    if (part.filename && part.body && part.body.attachmentId) {
      attachments.push({
        filename: part.filename,
        attachmentId: part.body.attachmentId,
        mimeType: part.mimeType || "",
        size: part.body.size || 0,
      });
    }
    if (part.parts && Array.isArray(part.parts)) {
      part.parts.forEach(extraerAdjuntos);
    }
  }

  if (data.payload) {
    extraerAdjuntos(data.payload);
  }

  return {
    id: data.id,
    threadId: data.threadId,
    subject,
    from,
    date,
    attachments,
  };
}

/**
 * Descarga y decodifica un archivo adjunto en Base64 URL
 */
export async function descargarAdjuntoBase64(
  accessToken: string,
  messageId: string,
  attachmentId: string
): Promise<string> {
  const url = `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}/attachments/${attachmentId}`;

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
  });

  if (!res.ok) {
    throw new Error(`Error ${res.status} al descargar archivo adjunto`);
  }

  const data = await res.json();
  const base64Data = data.data;
  if (!base64Data) throw new Error("Adjunto vacío");

  // Reemplazar caracteres URL-safe de Base64 de Google (- por + y _ por /)
  const normalized = base64Data.replace(/-/g, "+").replace(/_/g, "/");

  // Decodificar Base64 a texto UTF-8
  const binaryString = atob(normalized);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  const decoder = new TextDecoder("utf-8");
  return decoder.decode(bytes);
}

/**
 * Procesa un mensaje de correo, extrae los archivos XML y los almacena en el sistema contable
 */
export async function procesarMensajeFacturaXml(
  accessToken: string,
  message: GmailMessageSummary,
  onLog?: (log: string) => void
): Promise<ComprobanteContable[]> {
  const xmlAttachments = message.attachments.filter((a) =>
    a.filename.toLowerCase().endsWith(".xml")
  );

  if (xmlAttachments.length === 0) {
    onLog?.(`ℹ Mensaje "${message.subject}" no contiene adjuntos .xml`);
    return [];
  }

  const comprobantesProcesados: ComprobanteContable[] = [];

  for (const att of xmlAttachments) {
    try {
      onLog?.(`⬇ Descargando archivo XML: ${att.filename}...`);
      const xmlContent = await descargarAdjuntoBase64(accessToken, message.id, att.attachmentId);

      // Parsear con el analizador oficial de Hacienda v4.3
      const parsed = parsearXmlHacienda(xmlContent);

      if (parsed && parsed.clave) {
        const comp: ComprobanteContable = {
          id: "compra-gmail-" + message.id + "-" + att.attachmentId.slice(0, 8),
          tipoOperacion: "COMPRA",
          tipoDoc: (parsed.tipoDoc as any) || "FACTURA",
          tipoDocCodigo: parsed.tipoDocCodigo || "01",
          estadoHacienda: "RECIBIDO",
          clave: parsed.clave,
          consecutivo: parsed.consecutivo || "",
          emisorCedula: parsed.emisorCedula || "",
          emisorNombre: parsed.emisorNombre || message.from.split("<")[0].trim() || "Emisor Comercial",
          receptorCedula: parsed.receptorCedula || "3101483899",
          receptorNombre: parsed.receptorNombre || "GRUPO G TRES COMERCIALIZADORA INTERAMERICANA S.A.",
          fechaEmision: parsed.fechaEmision || new Date().toISOString().slice(0, 10),
          fechaHora: parsed.fechaHora || new Date().toISOString(),
          moneda: parsed.moneda || "CRC",
          tipoCambio: parsed.tipoCambio || 1,
          totalComprobante: parsed.totalComprobante || 0,
          totalVentaNeta: parsed.totalVentaNeta || 0,
          totalExento: parsed.totalExento || 0,
          totalExonerado: parsed.totalExonerado || 0,
          tarifaIva: parsed.tarifaIva || 13,
          totalIva: parsed.totalIva || 0,
          iva13: parsed.iva13 || 0,
          iva4: parsed.iva4 || 0,
          iva2: parsed.iva2 || 0,
          iva1: parsed.iva1 || 0,
          respuestaHacienda: parsed.respuestaHacienda || "Aceptado",
          cabysPrincipal: parsed.cabysPrincipal || "",
          detallePrincipal: parsed.detallePrincipal || message.subject,
          origenXml: att.filename,
        };

        guardarComprobanteContable(comp);
        comprobantesProcesados.push(comp);
        onLog?.(`✓ Factura extraída con éxito: ${comp.emisorNombre} - ₡${comp.totalComprobante.toLocaleString("es-CR")}`);
      } else {
        onLog?.(`⚠ El archivo ${att.filename} es un acuse de confirmación o XML no fiscal.`);
      }
    } catch (err: any) {
      onLog?.(`✕ Error al procesar ${att.filename}: ${err?.message || "Error desconocido"}`);
    }
  }

  return comprobantesProcesados;
}
