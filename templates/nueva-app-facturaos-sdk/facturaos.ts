/**
 * Conector Estándar FacturaOS para Nuevas Apps
 * FacturaOS Hub v4.4 (Hacienda Costa Rica)
 */

export const DEFAULT_FACTURAOS_API_URL = "http://localhost:3000/api/v1/invoices";

export function getFacturaOSConfig() {
  const apiUrl = localStorage.getItem("facturaos_api_url") || DEFAULT_FACTURAOS_API_URL;
  const apiKey = localStorage.getItem("facturaos_api_key") || "";
  return { apiUrl, apiKey };
}

export function saveFacturaOSConfig(apiUrl: string, apiKey: string) {
  localStorage.setItem("facturaos_api_url", apiUrl.trim());
  localStorage.setItem("facturaos_api_key", apiKey.trim());
}

export async function probarConexionFacturaOS(apiUrl?: string, apiKey?: string) {
  const current = getFacturaOSConfig();
  const rawUrl = (apiUrl || current.apiUrl).trim();
  const token = (apiKey || current.apiKey).trim();

  let baseApi = rawUrl.replace(/\/emit\/?$/, "").replace(/\/invoices\/?$/, "");
  if (!baseApi.endsWith("/api/v1")) {
    baseApi = `${baseApi.replace(/\/$/, "")}/api/v1`;
  }

  const response = await fetch(`${baseApi}/auth/verify`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || `Error al conectar con FacturaOS (${response.status})`);
  }
  return data;
}

export interface FacturaParams {
  monto: number;
  detalle: string;
  docType?: "01" | "04"; // 01 = Factura con Cédula, 04 = Tiquete Electrónico
  metodo?: "efectivo" | "tarjeta" | "sinpe";
  ivaRate?: number; // 13 general, 4 salud, 0 exento
  cabys?: string;
  cliente?: {
    idNumber: string;
    name: string;
    email?: string;
    idType?: string; // 01 física, 02 jurídica, 03 dimex
  };
}

export async function emitirFactura(params: FacturaParams) {
  const { apiUrl, apiKey } = getFacturaOSConfig();

  if (!apiKey) {
    throw new Error("No has configurado tu API Key de FacturaOS en Configuración.");
  }

  const subtotal = Math.round((params.monto / (1 + (params.ivaRate ?? 13) / 100)) * 100) / 100;

  let paymentMethod = "01"; // Efectivo
  if (params.metodo === "tarjeta") paymentMethod = "02";
  if (params.metodo === "sinpe") paymentMethod = "04";

  const payload = {
    docType: params.docType || (params.cliente ? "01" : "04"),
    paymentMethod,
    saleCondition: "01",
    currency: "CRC",
    client: params.cliente
      ? {
          idType: params.cliente.idType || "01",
          idNumber: params.cliente.idNumber,
          name: params.cliente.name,
          email: params.cliente.email,
        }
      : undefined,
    items: [
      {
        cabys: params.cabys || "0000000000000",
        detail: params.detalle,
        qty: 1,
        unitPrice: subtotal,
        ivaRate: params.ivaRate ?? 13,
        unit: "Unid",
      },
    ],
  };

  const emitEndpoint = apiUrl.endsWith("/emit") ? apiUrl : `${apiUrl.replace(/\/$/, "")}/emit`;

  const response = await fetch(emitEndpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json();
  if (!response.ok || !data.success) {
    throw new Error(data.error || "Hacienda rechazó el comprobante");
  }

  return data;
}
