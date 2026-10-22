import {
  handleInvoiceEmit,
  handleVerifyAuth,
  handleInvoiceStatus,
  handleInvoiceXml,
  handleInvoiceHaciendaXml,
  handleInvoicePdf,
} from "./invoices";
import { handleIdentityRequest } from "./identities";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, Content-Type, X-Environment, X-Api-Key",
};

export async function handleApiRouter(request: Request): Promise<Response | null> {
  const url = new URL(request.url);
  const pathname = url.pathname;

  // Solo procesar rutas que inicien con /api/v1/
  if (!pathname.startsWith("/api/v1")) {
    return null;
  }

  // Manejo de CORS preflight (OPTIONS)
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: CORS_HEADERS,
    });
  }

  let response: Response;

  // 1. Health check
  if (pathname === "/api/v1" || pathname === "/api/v1/health") {
    response = new Response(
      JSON.stringify({
        status: "ok",
        version: "1.0.0",
        service: "Facturio PRO - Costa Rica Electronic Invoicing Hub",
        timestamp: new Date().toISOString(),
        supportedDocTypes: ["01 (FE)", "04 (TE)", "03 (NC)", "02 (ND)"],
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  }
  // 1b. Verificación de Autenticación / API Key
  else if (pathname === "/api/v1/auth/verify") {
    response = await handleVerifyAuth(request);
  }
  // 2. Emisión de Facturas (POST /api/v1/invoices/emit)
  else if (pathname === "/api/v1/invoices/emit" && request.method === "POST") {
    response = await handleInvoiceEmit(request);
  }
  // 3. Descarga de XML de Factura/Tiquete (GET /api/v1/invoices/:clave/xml)
  else if (pathname.match(/^\/api\/v1\/invoices\/([0-9]{50})\/xml$/) && request.method === "GET") {
    const match = pathname.match(/^\/api\/v1\/invoices\/([0-9]{50})\/xml$/);
    const clave = match ? match[1] : "";
    response = await handleInvoiceXml(clave);
  }
  // 3b. Descarga de MensajeHacienda.xml (GET /api/v1/invoices/:clave/hacienda-xml)
  else if (pathname.match(/^\/api\/v1\/invoices\/([0-9]{50})\/hacienda-xml$/) && request.method === "GET") {
    const match = pathname.match(/^\/api\/v1\/invoices\/([0-9]{50})\/hacienda-xml$/);
    const clave = match ? match[1] : "";
    response = await handleInvoiceHaciendaXml(clave);
  }
  // 4. Descarga de PDF / Representación Gráfica (GET /api/v1/invoices/:clave/pdf)
  else if (pathname.match(/^\/api\/v1\/invoices\/([0-9]{50})\/pdf$/) && request.method === "GET") {
    const match = pathname.match(/^\/api\/v1\/invoices\/([0-9]{50})\/pdf$/);
    const clave = match ? match[1] : "";
    response = await handleInvoicePdf(clave);
  }
  // 5. Consulta de Factura por Clave (GET /api/v1/invoices/:clave)
  else if (pathname.match(/^\/api\/v1\/invoices\/([0-9]{50})$/) && request.method === "GET") {
    const match = pathname.match(/^\/api\/v1\/invoices\/([0-9]{50})$/);
    const clave = match ? match[1] : "";
    response = await handleInvoiceStatus(clave);
  }
  // 5. Consulta de Identidad / Padrón (GET /api/v1/identities/:cedula)
  else if (pathname.startsWith("/api/v1/identities/") && request.method === "GET") {
    const cedula = pathname.replace("/api/v1/identities/", "").trim();
    response = await handleIdentityRequest(cedula);
  }
  // Ruta no encontrada dentro de /api/v1
  else {
    response = new Response(
      JSON.stringify({
        success: false,
        error: `Endpoint no encontrado en API v1: ${request.method} ${pathname}`,
      }),
      { status: 404, headers: { "Content-Type": "application/json" } },
    );
  }

  // Inyectar headers CORS en la respuesta
  const finalHeaders = new Headers(response.headers);
  Object.entries(CORS_HEADERS).forEach(([key, value]) => {
    finalHeaders.set(key, value);
  });

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: finalHeaders,
  });
}
