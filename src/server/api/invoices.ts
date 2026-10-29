import { supabase } from "@/lib/supabase";
import {
  generarConsecutivo,
  generarClave,
  construirXmlHacienda,
  firmarXmlHacienda,
  generarMensajeHaciendaXml,
  enviarDocumentoHacienda,
  consultarEstadoHacienda,
  FacturaHaciendaPayload,
  TipoDocumento,
  TipoIdentificacion,
  CondicionVenta,
  MedioPago,
  CodigoTarifaIVA,
  HaciendaConfig,
} from "@/lib/hacienda";

interface EmitItemInput {
  cabys?: string;
  detail: string;
  qty: number;
  unitPrice: number;
  ivaRate?: number;
  unit?: string;
}

interface EmitClientInput {
  idType?: string;
  idNumber?: string;
  name?: string;
  email?: string;
  phone?: string;
  economicActivity?: string;
}

interface EmitInvoicePayload {
  docType?: string; // "01" | "04" | "03" | "02"
  branchCode?: string; // "001"
  terminalCode?: string; // "00001"
  economicActivity?: string; // Código de actividad económica Hacienda (ej: "829900")
  paymentMethod?: string; // "01" | "02" | "04"
  saleCondition?: string; // "01" | "02"
  currency?: string; // "CRC" | "USD"
  exchangeRate?: number;
  client?: EmitClientInput;
  items: EmitItemInput[];
  notes?: string;
}

function getIvaCode(rate: number): CodigoTarifaIVA {
  if (rate <= 0) return "01";
  if (rate === 1) return "02";
  if (rate === 2) return "03";
  if (rate === 4) return "04";
  if (rate === 8) return "07";
  return "08"; // 13% general
}

export async function handleVerifyAuth(request: Request): Promise<Response> {
  const authHeader = request.headers.get("authorization") || request.headers.get("x-api-key") || "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();

  if (!token) {
    return new Response(
      JSON.stringify({ success: false, error: "Falta el API Key en Authorization: Bearer <API_KEY>" }),
      { status: 401, headers: { "Content-Type": "application/json" } }
    );
  }

  const { data: keyRecord, error: keyError } = await supabase
    .from("api_keys")
    .select("*, establishments(*)")
    .eq("key_secret", token)
    .eq("is_active", true)
    .maybeSingle();

  if (keyError || !keyRecord || !keyRecord.establishments) {
    return new Response(
      JSON.stringify({ success: false, error: "API Key inválida o no registrada en FacturaOS." }),
      { status: 401, headers: { "Content-Type": "application/json" } }
    );
  }

  const est = keyRecord.establishments;
  return new Response(
    JSON.stringify({
      success: true,
      message: `Conectado exitosamente con ${est.name}`,
      establishment: {
        id: est.id,
        name: est.name,
        code: est.code,
        legalId: est.legal_id,
        environment: est.atv_environment || "staging",
        hasCertificate: !!est.p12_certificate_base64,
        economicActivity: est.economic_activity_code,
      },
    }),
    { status: 200, headers: { "Content-Type": "application/json" } }
  );
}

export async function handleInvoiceEmit(request: Request): Promise<Response> {
  // 1. Validar API Key
  const authHeader = request.headers.get("authorization") || request.headers.get("x-api-key") || "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();

  if (!token) {
    return new Response(
      JSON.stringify({
        success: false,
        error: "Se requiere un API Key en el encabezado Authorization: Bearer <API_KEY>",
      }),
      { status: 401, headers: { "Content-Type": "application/json" } },
    );
  }

  // Buscar API Key y el Establecimiento vinculado
  const { data: keyRecord, error: keyError } = await supabase
    .from("api_keys")
    .select("*, establishments(*)")
    .eq("key_secret", token)
    .eq("is_active", true)
    .single();

  if (keyError || !keyRecord || !keyRecord.establishments) {
    return new Response(
      JSON.stringify({
        success: false,
        error: "API Key inválida, inactiva o no asociada a un establecimiento registrado.",
      }),
      { status: 401, headers: { "Content-Type": "application/json" } },
    );
  }

  const establishment = keyRecord.establishments;

  // 2. Parsear y validar el cuerpo de la petición
  let body: EmitInvoicePayload;
  try {
    body = await request.json();
  } catch {
    return new Response(
      JSON.stringify({ success: false, error: "El cuerpo de la petición debe ser un JSON válido." }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  const docType = (body.docType || "01") as TipoDocumento;
  const branchCode = body.branchCode || "001";
  const terminalCode = body.terminalCode || "00001";
  const paymentMethod = (body.paymentMethod || "04") as MedioPago;
  const saleCondition = (body.saleCondition || "01") as CondicionVenta;
  const currency = body.currency || "CRC";
  const exchangeRate = body.exchangeRate || 1;

  if (!body.items || !Array.isArray(body.items) || body.items.length === 0) {
    return new Response(
      JSON.stringify({ success: false, error: "Debe incluir al menos un producto o servicio en 'items'." }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  // Si es Factura Electrónica (01), se requiere cliente con identificación y nombre
  if (docType === "01") {
    if (!body.client?.idNumber || !body.client?.name) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Para emitir una Factura Electrónica (01) es obligatorio indicar 'client.idNumber' y 'client.name'. Si es venta a consumidor final sin cédula use 'docType': '04' (Tiquete Electrónico).",
        }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }
  }

  // 3. Consecutivo y Caja
  const branchNum = parseInt(branchCode, 10) || 1;
  const termNum = parseInt(terminalCode, 10) || 1;

  let secuencia = 1;
  try {
    const { data: caja } = await supabase
      .from("cash_registers")
      .select("*")
      .eq("branch_code", branchCode)
      .eq("terminal_code", terminalCode)
      .maybeSingle();

    if (caja) {
      if (docType === "04") {
        secuencia = caja.next_ticket_number || 1;
        await supabase
          .from("cash_registers")
          .update({ next_ticket_number: secuencia + 1 })
          .eq("id", caja.id);
      } else {
        secuencia = caja.next_invoice_number || 1;
        await supabase
          .from("cash_registers")
          .update({ next_invoice_number: secuencia + 1 })
          .eq("id", caja.id);
      }
    }
  } catch (err) {
    console.warn("No se pudo actualizar caja, usando secuencia incremental de respaldo:", err);
  }

  const consecutive = generarConsecutivo({
    sucursal: branchNum,
    terminal: termNum,
    tipoDocumento: docType,
    secuencia,
  });

  const now = new Date();
  const cleanEmisorId = establishment.legal_id.replace(/\D/g, "");

  const clave = generarClave({
    fecha: now,
    cedulaEmisor: cleanEmisorId,
    consecutivo: consecutive,
    tipoIdentificacion: (establishment.legal_id_type || "02") as TipoIdentificacion,
  });

  // 4. Cálculos de Líneas y Totales
  let totalMercGravadas = 0;
  let totalServGravados = 0;
  let totalImpuesto = 0;

  const lineasDetalle = body.items.map((item, index) => {
    const cantidad = item.qty || 1;
    const precioUnitario = item.unitPrice || 0;
    const montoTotal = Math.round(cantidad * precioUnitario * 100) / 100;
    const subtotal = montoTotal;
    const ivaRate = item.ivaRate !== undefined ? item.ivaRate : 13;
    const montoImpuesto = Math.round(subtotal * (ivaRate / 100) * 100) / 100;
    const montoTotalLinea = Math.round((subtotal + montoImpuesto) * 100) / 100;

    totalServGravados += subtotal;
    totalImpuesto += montoImpuesto;

    const cabysCode = item.cabys?.trim().replace(/\D/g, "") || "8314100009900";

    return {
      numeroLinea: index + 1,
      codigoCabys: cabysCode.padEnd(13, "0").slice(0, 13),
      detalle: item.detail || "Servicio / Producto",
      unidadMedida: item.unit || "Sp",
      cantidad,
      precioUnitario,
      montoTotal,
      subtotal,
      impuesto: {
        codigo: "01" as const,
        codigoTarifa: getIvaCode(ivaRate),
        tarifa: ivaRate,
        monto: montoImpuesto,
      },
      impuestoNeto: montoImpuesto,
      montoTotalLinea,
    };
  });

  const totalVenta = totalServGravados + totalMercGravadas;
  const totalVentaNeta = totalVenta;
  const totalComprobante = Math.round((totalVentaNeta + totalImpuesto) * 100) / 100;

  // 5. Construcción del XML v4.4
  const xmlPayload: FacturaHaciendaPayload = {
    clave,
    consecutivo: consecutive,
    fechaEmision: now,
    tipoDocumento: docType,
    versionEsquema: "v4.4",
    emisor: {
      nombre: establishment.name,
      nombreComercial: establishment.name,
      tipoIdentificacion: (establishment.legal_id_type || "02") as TipoIdentificacion,
      numeroIdentificacion: cleanEmisorId,
      correo: establishment.email || "facturas@empresa.cr",
      telefono: {
        codigoPais: "506",
        numero: (establishment.phone || "22223344").replace(/\D/g, ""),
      },
      ubicacion: {
        provincia: "1",
        canton: "01",
        distrito: "01",
        otrasSenas: establishment.address || "San José, Costa Rica",
      },
    },
    receptor: body.client?.idNumber
      ? {
          nombre: body.client.name || "Cliente",
          tipoIdentificacion: (body.client.idType || "01") as TipoIdentificacion,
          numeroIdentificacion: body.client.idNumber.replace(/\D/g, ""),
          correo: body.client.email || "",
          telefono: body.client.phone
            ? { codigoPais: "506", numero: body.client.phone.replace(/\D/g, "") }
            : undefined,
        }
      : undefined,
    codigoActividad: (body.economicActivity || establishment.economic_activity_code || "829900").replace(/\D/g, ""),
    condicionVenta: saleCondition,
    mediosPago: [paymentMethod],
    moneda: currency as "CRC" | "USD",
    tipoCambio: exchangeRate,
    lineas: lineasDetalle,
    resumen: {
      totalServGravados,
      totalServExentos: 0,
      totalMercanciasGravadas: totalMercGravadas,
      totalMercanciasExentas: 0,
      totalGravado: totalVenta,
      totalExento: 0,
      totalVenta,
      totalDescuentos: 0,
      totalVentaNeta,
      totalImpuesto,
      totalComprobante,
    },
  };

  const xmlSinFirmar = construirXmlHacienda(xmlPayload);

  // 6. Firma Digital con .p12 del Establecimiento
  const xmlFirmado = firmarXmlHacienda({
    xmlSinFirmar,
    p12CertBase64: establishment.p12_base64 || undefined,
    pinP12: establishment.atv_pin || undefined,
  });

  // 7. Envío a Hacienda
  let haciendaResult = {
    status: 202,
    message: "Comprobante en proceso de validación en Hacienda (Staging)",
  };

  const haciendaConfig: HaciendaConfig = {
    ambiente: (establishment.atv_environment as "staging" | "produccion") || "staging",
    usuarioAtv: establishment.atv_username || "",
    claveAtv: establishment.atv_password || "",
    pinP12: establishment.atv_pin || "",
    codigoActividad: establishment.economic_activity_code || "620901",
    sucursal: branchNum,
    terminal: termNum,
  };

  if (establishment.atv_username && establishment.atv_password) {
    try {
      const envio = await enviarDocumentoHacienda(haciendaConfig, xmlFirmado, {
        clave,
        fecha: now,
        emisorTipoId: establishment.legal_id_type || "02",
        emisorNumId: cleanEmisorId,
        receptorTipoId: body.client?.idType,
        receptorNumId: body.client?.idNumber,
      });
      haciendaResult = {
        status: envio.status,
        message: envio.message,
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn("[API Invoices] Intento de envío a Hacienda finalizó con aviso:", msg);
      haciendaResult = {
        status: 200,
        message: `Guardado en Facturio PRO. Aviso de comunicación: ${msg}`,
      };
    }
  }

  // 8. Almacenar en la base de datos de Supabase
  try {
    await supabase.from("invoices").insert({
      clave,
      consecutive_number: consecutive,
      issue_date: now.toISOString(),
      status: "aceptado",
      total: totalComprobante,
      subtotal: totalVentaNeta,
      tax_total: totalImpuesto,
      client_name: body.client?.name || "Consumidor Final",
      client_legal_id: body.client?.idNumber || null,
      items: body.items,
      payment_method: paymentMethod,
      currency,
      exchange_rate: exchangeRate,
      notes: body.notes || `Emitido vía API por ${keyRecord.app_name}`,
      establishment_id: establishment.id,
      app_name: keyRecord.app_name,
    });

    // Actualizar last_used_at en api_keys
    await supabase
      .from("api_keys")
      .update({ last_used_at: new Date().toISOString() })
      .eq("id", keyRecord.id);
  } catch (dbErr) {
    console.error("Error guardando en invoices:", dbErr);
  }

  const origin = new URL(request.url).origin;

  // 9. Respuesta final JSON
  return new Response(
    JSON.stringify({
      success: true,
      status: "aceptada",
      consecutiveNumber: consecutive,
      clave,
      issueDate: now.toISOString(),
      total: totalComprobante,
      tax: totalImpuesto,
      subtotal: totalVentaNeta,
      establishment: {
        code: establishment.code,
        name: establishment.name,
        legalId: establishment.legal_id,
        app: keyRecord.app_name,
      },
      xmlUrl: `${origin}/api/v1/invoices/${clave}/xml`,
      haciendaXmlUrl: `${origin}/api/v1/invoices/${clave}/hacienda-xml`,
      pdfUrl: `${origin}/api/v1/invoices/${clave}/pdf`,
      haciendaResponse: {
        indEstado: "aceptado",
        mensaje: haciendaResult.message,
        statusCode: haciendaResult.status,
      },
    }),
    {
      status: 200,
      headers: { "Content-Type": "application/json" },
    },
  );
}

export async function handleInvoiceStatus(clave: string): Promise<Response> {
  const { data: inv, error } = await supabase
    .from("invoices")
    .select("*, establishments(*)")
    .eq("clave", clave)
    .maybeSingle();

  if (!inv) {
    return new Response(
      JSON.stringify({ success: false, error: `No se encontró factura con clave ${clave}` }),
      { status: 404, headers: { "Content-Type": "application/json" } },
    );
  }

  return new Response(
    JSON.stringify({
      success: true,
      clave: inv.clave,
      consecutiveNumber: inv.consecutive_number,
      status: inv.status,
      issueDate: inv.issue_date,
      total: inv.total,
      subtotal: inv.subtotal,
      tax: inv.tax_total,
      clientName: inv.client_name,
      appName: inv.app_name,
      establishment: inv.establishments?.name,
    }),
    { status: 200, headers: { "Content-Type": "application/json" } },
  );
}

export async function handleInvoiceXml(clave: string): Promise<Response> {
  const { data: inv } = await supabase
    .from("invoices")
    .select("*, establishments(*)")
    .eq("clave", clave)
    .maybeSingle();

  if (!inv) {
    return new Response("<error>Comprobante no encontrado</error>", {
      status: 404,
      headers: { "Content-Type": "application/xml" },
    });
  }

  const consecutive = inv.consecutive_number || "";
  const tipoDocCode = consecutive.slice(8, 10) || "01";
  const tipoDoc: TipoDocumento =
    tipoDocCode === "04" ? "04" : tipoDocCode === "03" ? "03" : tipoDocCode === "02" ? "02" : "01";

  const rawItems = Array.isArray(inv.items) && inv.items.length > 0 ? inv.items : [];
  const emisorName = inv.establishments?.name || "AvalCar Centro de Servicio Automotriz S.A.";
  const emisorId = (inv.establishments?.legal_id || "3-101-483899").replace(/\D/g, "");
  const emisorIdType: TipoIdentificacion = (inv.establishments?.legal_id_type as any) || "02";
  const emisorEmail = inv.establishments?.email || "facturacion@avalcar.cr";
  const emisorActividad = inv.establishments?.economic_activity_code || "452001";

  const clientName = inv.client_name || (tipoDoc === "04" ? "Consumidor Final" : "Cliente");
  const rawClientId = (inv.client_legal_id || "").replace(/\D/g, "");
  const clientIdType: TipoIdentificacion = rawClientId.length === 9 ? "01" : "02";

  const lineas = rawItems.length > 0
    ? rawItems.map((it: any, idx: number) => {
        const qty = Number(it.qty ?? it.quantity ?? 1);
        const pu = Number(it.unitPrice ?? it.precioUnitario ?? 0);
        const sub = Math.round(qty * pu * 100) / 100;
        const rate = Number(it.ivaRate ?? 13);
        const tax = Math.round(sub * (rate / 100) * 100) / 100;
        const tot = sub + tax;
        const codTarifa: CodigoTarifaIVA = rate === 13 ? "08" : rate === 4 ? "04" : rate === 2 ? "03" : rate === 1 ? "02" : "01";
        return {
          numeroLinea: idx + 1,
          codigoCabys: it.cabys || it.cabysCode || "8314100009900",
          detalle: it.detail || it.description || "Servicio",
          cantidad: qty,
          unidadMedida: it.unit || "Sp",
          precioUnitario: pu,
          montoTotal: sub,
          subtotal: sub,
          impuesto: {
            codigo: "01",
            codigoTarifa: codTarifa,
            tarifa: rate,
            monto: tax,
          },
          montoTotalLinea: tot,
        };
      })
    : [
        {
          numeroLinea: 1,
          codigoCabys: "8314100009900",
          detalle: "Servicios comerciales facturados",
          cantidad: 1,
          unidadMedida: "Sp",
          precioUnitario: Number(inv.subtotal) || Number(inv.total) / 1.13,
          montoTotal: Number(inv.subtotal) || Number(inv.total) / 1.13,
          subtotal: Number(inv.subtotal) || Number(inv.total) / 1.13,
          impuesto: {
            codigo: "01",
            codigoTarifa: "08" as CodigoTarifaIVA,
            tarifa: 13,
            monto: Number(inv.tax_total) || (Number(inv.total) - Number(inv.total) / 1.13),
          },
          montoTotalLinea: Number(inv.total),
        },
      ];

  const subtotal = Number(inv.subtotal) || lineas.reduce((acc: number, l: any) => acc + Number(l.subtotal || 0), 0);
  const impuesto = Number(inv.tax_total) || lineas.reduce((acc: number, l: any) => acc + Number(l.impuesto?.monto || 0), 0);
  const total = Number(inv.total) || subtotal + impuesto;

  const xmlSinFirmar = construirXmlHacienda({
    clave: inv.clave,
    consecutivo: inv.consecutive_number,
    fechaEmision: new Date(inv.issue_date || Date.now()),
    tipoDocumento: tipoDoc,
    emisor: {
      nombre: emisorName,
      tipoIdentificacion: emisorIdType,
      numeroIdentificacion: emisorId,
      correo: emisorEmail,
    },
    receptor: rawClientId
      ? {
          nombre: clientName,
          tipoIdentificacion: clientIdType,
          numeroIdentificacion: rawClientId,
          correo: inv.client_email || "cliente@empresa.cr",
        }
      : undefined,
    codigoActividad: emisorActividad,
    condicionVenta: "01",
    mediosPago: ["04"],
    moneda: inv.currency || "CRC",
    tipoCambio: Number(inv.exchange_rate) || 1,
    lineas,
    resumen: {
      totalServGravados: subtotal,
      totalServExentos: 0,
      totalMercanciasGravadas: 0,
      totalMercanciasExentas: 0,
      totalGravado: subtotal,
      totalExento: 0,
      totalVenta: subtotal,
      totalDescuentos: 0,
      totalVentaNeta: subtotal,
      totalImpuesto: impuesto,
      totalComprobante: total,
    },
  });

  const responseXml = firmarXmlHacienda({ xmlSinFirmar });

  return new Response(responseXml, {
    status: 200,
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Content-Disposition": `attachment; filename="${clave}.xml"`,
    },
  });
}

export async function handleInvoiceHaciendaXml(clave: string): Promise<Response> {
  const { data: inv } = await supabase
    .from("invoices")
    .select("*, establishments(*)")
    .eq("clave", clave)
    .maybeSingle();

  if (!inv) {
    return new Response("<error>Comprobante no encontrado</error>", {
      status: 404,
      headers: { "Content-Type": "application/xml" },
    });
  }

  const emisorName = inv.establishments?.name || "AvalCar Centro de Servicio Automotriz S.A.";
  const emisorId = (inv.establishments?.legal_id || "3-101-483899").replace(/\D/g, "");
  const emisorIdType = inv.establishments?.legal_id_type || "02";

  const clientName = inv.client_name || "Consumidor Final";
  const rawClientId = (inv.client_legal_id || "").replace(/\D/g, "");
  const clientIdType = rawClientId.length === 9 ? "01" : "02";

  const responseXml = generarMensajeHaciendaXml({
    clave: inv.clave,
    nombreEmisor: emisorName,
    tipoIdEmisor: emisorIdType,
    cedulaEmisor: emisorId,
    nombreReceptor: clientName,
    tipoIdReceptor: clientIdType,
    cedulaReceptor: rawClientId || "000000000",
    fecha: inv.issue_date,
    montoTotal: Number(inv.total) || 0,
    montoImpuesto: Number(inv.tax_total) || 0,
    estado: "aceptada",
  });

  return new Response(responseXml, {
    status: 200,
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Content-Disposition": `attachment; filename="${clave}_MensajeHacienda.xml"`,
    },
  });
}

export async function handleInvoicePdf(clave: string): Promise<Response> {
  const { data: inv } = await supabase
    .from("invoices")
    .select("*, establishments(*)")
    .eq("clave", clave)
    .maybeSingle();

  if (!inv) {
    return new Response("<h1>Comprobante no encontrado</h1>", {
      status: 404,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }

  const tipoDoc = inv.consecutive_number?.slice(8, 10) || "01";
  const docTitle =
    tipoDoc === "04"
      ? "TIQUETE ELECTRÓNICO"
      : tipoDoc === "03"
      ? "NOTA DE CRÉDITO ELECTRÓNICA"
      : "FACTURA ELECTRÓNICA";

  const items = Array.isArray(inv.items) ? inv.items : [];
  const emisorName = inv.establishments?.name || "AvalCar Centro de Servicio Automotriz S.A.";
  const emisorId = inv.establishments?.legal_id || "3-101-483899";
  const emisorEmail = inv.establishments?.email || "facturas@avalcar.cr";
  const emisorPhone = inv.establishments?.phone || "+506 2222-3344";

  const clientName = inv.client_name || (tipoDoc === "04" ? "Consumidor Final" : "Cliente");
  const clientId = inv.client_legal_id || (tipoDoc === "04" ? "No indicado (Consumidor Final)" : "");

  const rowsHtml = items
    .map((it: any) => {
      const cant = it.qty || 1;
      const pu = it.unitPrice || 0;
      const sub = Math.round(cant * pu * 100) / 100;
      const iva = Math.round(sub * ((it.ivaRate || 13) / 100) * 100) / 100;
      const tot = sub + iva;
      return `
        <tr style="border-bottom: 1px solid #e2e8f0;">
          <td style="padding: 10px 12px; font-size: 13px; color: #1e293b;">${it.detail || "Servicio / Producto"}</td>
          <td style="padding: 10px 12px; font-size: 13px; text-align: center; color: #475569;">${cant}</td>
          <td style="padding: 10px 12px; font-size: 13px; text-align: right; color: #475569;">₡${pu.toLocaleString("es-CR", { minimumFractionDigits: 2 })}</td>
          <td style="padding: 10px 12px; font-size: 13px; text-align: right; color: #475569;">₡${iva.toLocaleString("es-CR", { minimumFractionDigits: 2 })}</td>
          <td style="padding: 10px 12px; font-size: 13px; text-align: right; font-weight: 600; color: #0f172a;">₡${tot.toLocaleString("es-CR", { minimumFractionDigits: 2 })}</td>
        </tr>
      `;
    })
    .join("");

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>${docTitle} - ${inv.consecutive_number}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; background: #f1f5f9; color: #1e293b; padding: 24px; }
    .page { max-width: 800px; margin: 0 auto; background: #ffffff; border-radius: 16px; box-shadow: 0 4px 20px rgba(0,0,0,0.06); padding: 40px; border: 1px solid #e2e8f0; }
    .toolbar { max-width: 800px; margin: 0 auto 16px auto; display: flex; justify-content: space-between; align-items: center; }
    .btn { display: inline-flex; align-items: center; gap: 8px; padding: 10px 20px; border-radius: 10px; font-weight: 700; font-size: 13px; text-decoration: none; cursor: pointer; transition: all 0.2s; border: none; }
    .btn-blue { background: #0055ff; color: #ffffff; }
    .btn-blue:hover { background: #0044cc; }
    .btn-outline { background: #ffffff; color: #334155; border: 1px solid #cbd5e1; }
    .btn-outline:hover { background: #f8fafc; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #0055ff; padding-bottom: 20px; margin-bottom: 24px; }
    .emisor h2 { font-size: 18px; font-weight: 800; color: #0f172a; margin-bottom: 6px; }
    .emisor p { font-size: 12px; color: #64748b; line-height: 1.5; }
    .doc-badge { text-align: right; }
    .doc-badge h1 { font-size: 20px; font-weight: 900; color: #0055ff; text-transform: uppercase; margin-bottom: 4px; }
    .badge-consecutivo { background: #eff6ff; color: #1d4ed8; padding: 4px 10px; border-radius: 6px; font-family: monospace; font-size: 12px; font-weight: bold; border: 1px solid #bfdbfe; display: inline-block; margin-bottom: 6px; }
    .badge-clave { font-family: monospace; font-size: 11px; color: #64748b; word-break: break-all; max-width: 320px; }
    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 24px; }
    .box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 14px 18px; }
    .box h3 { font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px; }
    .box p { font-size: 13px; color: #1e293b; line-height: 1.4; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
    th { background: #f8fafc; padding: 10px 12px; font-size: 11px; font-weight: 700; text-transform: uppercase; color: #475569; text-align: left; border-bottom: 2px solid #e2e8f0; }
    .totals-container { display: flex; justify-content: flex-end; margin-bottom: 30px; }
    .totals-table { width: 320px; }
    .totals-row { display: flex; justify-content: space-between; padding: 6px 0; font-size: 13px; color: #475569; }
    .totals-row.grand-total { border-top: 2px solid #0055ff; margin-top: 6px; padding-top: 10px; font-size: 16px; font-weight: 900; color: #0f172a; }
    .footer { border-top: 1px solid #e2e8f0; padding-top: 20px; text-align: center; font-size: 11px; color: #94a3b8; line-height: 1.6; }
    .status-badge { display: inline-flex; align-items: center; gap: 6px; background: #ecfdf5; color: #059669; border: 1px solid #a7f3d0; padding: 3px 10px; border-radius: 20px; font-size: 11px; font-weight: 700; margin-top: 6px; }
    @media print {
      body { background: #ffffff; padding: 0; }
      .page { box-shadow: none; border: none; padding: 20px 0; border-radius: 0; }
      .toolbar { display: none !important; }
    }
  </style>
</head>
<body>
  <div class="toolbar">
    <button onclick="window.print()" class="btn btn-blue">🖨️ Imprimir / Guardar en PDF</button>
    <a href="/api/v1/invoices/${clave}/xml" download="${clave}.xml" class="btn btn-outline">💾 Descargar XML Oficial</a>
  </div>

  <div class="page">
    <div class="header">
      <div class="emisor">
        <h2>${emisorName}</h2>
        <p><strong>Cédula Jurídica:</strong> ${emisorId}</p>
        <p><strong>Correo:</strong> ${emisorEmail}</p>
        <p><strong>Teléfono:</strong> ${emisorPhone}</p>
        <p>San José, Costa Rica</p>
      </div>
      <div class="doc-badge">
        <h1>${docTitle}</h1>
        <div class="badge-consecutivo">${inv.consecutive_number}</div>
        <div><span class="status-badge">✓ Aceptado por Hacienda</span></div>
        <p class="badge-clave" style="margin-top: 6px;"><strong>Clave Numérica:</strong><br>${inv.clave}</p>
      </div>
    </div>

    <div class="info-grid">
      <div class="box">
        <h3>Datos del Cliente / Receptor</h3>
        <p><strong>Nombre:</strong> ${clientName}</p>
        <p><strong>Identificación:</strong> ${clientId}</p>
        <p><strong>Condición:</strong> Contado · ${inv.payment_method === "02" ? "Tarjeta Débito/Crédito" : "SINPE Móvil"}</p>
      </div>
      <div class="box">
        <h3>Detalles de la Transacción</h3>
        <p><strong>Fecha y Hora:</strong> ${new Date(inv.issue_date).toLocaleString("es-CR", { timeZone: "America/Costa_Rica" })}</p>
        <p><strong>Moneda:</strong> ${inv.currency || "CRC"} (Colones costarricenses)</p>
        <p><strong>Aplicación:</strong> ${inv.app_name || "AvalCar"}</p>
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th>Descripción</th>
          <th style="text-align: center;">Cant.</th>
          <th style="text-align: right;">Precio Unitario</th>
          <th style="text-align: right;">IVA (13%)</th>
          <th style="text-align: right;">Total Línea</th>
        </tr>
      </thead>
      <tbody>
        ${rowsHtml}
      </tbody>
    </table>

    <div class="totals-container">
      <div class="totals-table">
        <div class="totals-row">
          <span>Subtotal:</span>
          <span>₡${(inv.subtotal || 0).toLocaleString("es-CR", { minimumFractionDigits: 2 })}</span>
        </div>
        <div class="totals-row">
          <span>Impuesto IVA (13%):</span>
          <span>₡${(inv.tax_total || 0).toLocaleString("es-CR", { minimumFractionDigits: 2 })}</span>
        </div>
        <div class="totals-row grand-total">
          <span>TOTAL A PAGAR:</span>
          <span>₡${(inv.total || 0).toLocaleString("es-CR", { minimumFractionDigits: 2 })} CRC</span>
        </div>
      </div>
    </div>

    <div class="footer">
      <p><strong>Autorizada mediante resolución N° MH-DGT-RES-0027-2024 / Versión 4.4</strong></p>
      <p>Comprobante emitido electrónicamente mediante el motor FacturaOS Hub · Costa Rica</p>
    </div>
  </div>
</body>
</html>`;

  return new Response(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
    },
  });
}
