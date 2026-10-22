import { FacturaHaciendaPayload, TipoDocumento } from "./types";

function formatDateTimeCR(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  const seconds = pad(date.getSeconds());
  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}-06:00`;
}

function escapeXml(str: string): string {
  if (!str) return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function getRootElement(tipo: TipoDocumento, version: "v4.3" | "v4.4" = "v4.4") {
  const ver = version === "v4.4" ? "v4.4" : "v4.3";
  switch (tipo) {
    case "01":
      return {
        tag: "FacturaElectronica",
        schema: `https://cdn.comprobanteselectronicos.go.cr/xml-schemas/${ver}/facturaElectronica`,
      };
    case "02":
      return {
        tag: "NotaDebitoElectronica",
        schema: `https://cdn.comprobanteselectronicos.go.cr/xml-schemas/${ver}/notaDebitoElectronica`,
      };
    case "03":
      return {
        tag: "NotaCreditoElectronica",
        schema: `https://cdn.comprobanteselectronicos.go.cr/xml-schemas/${ver}/notaCreditoElectronica`,
      };
    case "04":
    default:
      return {
        tag: "TiqueteElectronico",
        schema: `https://cdn.comprobanteselectronicos.go.cr/xml-schemas/${ver}/tiqueteElectronico`,
      };
  }
}

/**
 * Construye el documento XML v4.4 (v2) / v4.3 oficial según las especificaciones técnicas del Ministerio de Hacienda de Costa Rica.
 */
export function construirXmlHacienda(data: FacturaHaciendaPayload): string {
  const version = data.versionEsquema || "v4.4";
  const { tag, schema } = getRootElement(data.tipoDocumento, version);
  const fechaStr = formatDateTimeCR(data.fechaEmision);

  let xml = `<?xml version="1.0" encoding="utf-8"?>\n`;
  xml += `<${tag} xmlns="${schema}" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">\n`;
  xml += `  <Clave>${data.clave}</Clave>\n`;
  xml += `  <CodigoActividad>${data.codigoActividad}</CodigoActividad>\n`;
  xml += `  <NumeroConsecutivo>${data.consecutivo}</NumeroConsecutivo>\n`;
  xml += `  <FechaEmision>${fechaStr}</FechaEmision>\n`;

  // Emisor
  xml += `  <Emisor>\n`;
  xml += `    <Nombre>${escapeXml(data.emisor.nombre)}</Nombre>\n`;
  if (data.emisor.nombreComercial) {
    xml += `    <NombreComercial>${escapeXml(data.emisor.nombreComercial)}</NombreComercial>\n`;
  }
  xml += `    <Identificacion>\n`;
  xml += `      <Tipo>${data.emisor.tipoIdentificacion}</Tipo>\n`;
  xml += `      <Numero>${data.emisor.numeroIdentificacion.replace(/\D/g, "")}</Numero>\n`;
  xml += `    </Identificacion>\n`;
  if (data.emisor.telefono) {
    xml += `    <Telefono>\n`;
    xml += `      <CodigoPais>${data.emisor.telefono.codigoPais}</CodigoPais>\n`;
    xml += `      <NumTelefono>${data.emisor.telefono.numero.replace(/\D/g, "")}</NumTelefono>\n`;
    xml += `    </Telefono>\n`;
  }
  xml += `    <CorreoElectronico>${escapeXml(data.emisor.correo)}</CorreoElectronico>\n`;
  xml += `  </Emisor>\n`;

  // Receptor (Opcional en Tiquete Electrónico si es anónimo)
  if (data.receptor && data.receptor.nombre) {
    xml += `  <Receptor>\n`;
    xml += `    <Nombre>${escapeXml(data.receptor.nombre)}</Nombre>\n`;
    if (data.receptor.tipoIdentificacion && data.receptor.numeroIdentificacion) {
      xml += `    <Identificacion>\n`;
      xml += `      <Tipo>${data.receptor.tipoIdentificacion}</Tipo>\n`;
      // Soporte alfanumérico según normativa Hacienda CR 1 de Noviembre (v4.4 v2)
      xml += `      <Numero>${escapeXml(data.receptor.numeroIdentificacion.trim())}</Numero>\n`;
      xml += `    </Identificacion>\n`;
    }
    if (data.receptor.correo) {
      xml += `    <CorreoElectronico>${escapeXml(data.receptor.correo)}</CorreoElectronico>\n`;
    }
    xml += `  </Receptor>\n`;
  }

  // Condicion de Venta
  xml += `  <CondicionVenta>${data.condicionVenta}</CondicionVenta>\n`;
  if (data.condicionVenta === "02" && data.plazoCredito) {
    xml += `  <PlazoCredito>${data.plazoCredito}</PlazoCredito>\n`;
  }

  // Medios de Pago
  data.mediosPago.forEach((medio) => {
    xml += `  <MedioPago>${medio}</MedioPago>\n`;
  });

  // Detalle de Lineas
  xml += `  <DetalleServicio>\n`;
  data.lineas.forEach((linea) => {
    xml += `    <LineaDetalle>\n`;
    xml += `      <NumeroLinea>${linea.numeroLinea}</NumeroLinea>\n`;
    xml += `      <CodigoCabys>${linea.codigoCabys}</CodigoCabys>\n`;
    if (linea.codigoComercial) {
      xml += `      <Codigo>\n`;
      xml += `        <Tipo>04</Tipo>\n`;
      xml += `        <Codigo>${escapeXml(linea.codigoComercial)}</Codigo>\n`;
      xml += `      </Codigo>\n`;
    }
    xml += `      <Cantidad>${linea.cantidad.toFixed(3)}</Cantidad>\n`;
    xml += `      <UnidadMedida>${escapeXml(linea.unidadMedida || "Unid")}</UnidadMedida>\n`;
    xml += `      <Detalle>${escapeXml(linea.detalle)}</Detalle>\n`;
    xml += `      <PrecioUnitario>${linea.precioUnitario.toFixed(5)}</PrecioUnitario>\n`;
    xml += `      <MontoTotal>${linea.montoTotal.toFixed(5)}</MontoTotal>\n`;

    if (linea.descuento && linea.descuento.monto > 0) {
      xml += `      <Descuento>\n`;
      xml += `        <MontoDescuento>${linea.descuento.monto.toFixed(5)}</MontoDescuento>\n`;
      xml += `        <NaturalezaDescuento>${escapeXml(linea.descuento.naturaleza || "Descuento Comercial")}</NaturalezaDescuento>\n`;
      xml += `      </Descuento>\n`;
    }

    xml += `      <SubTotal>${linea.subtotal.toFixed(5)}</SubTotal>\n`;

    if (linea.impuesto && linea.impuesto.monto > 0) {
      xml += `      <Impuesto>\n`;
      xml += `        <Codigo>${linea.impuesto.codigo}</Codigo>\n`;
      xml += `        <CodigoTarifa>${linea.impuesto.codigoTarifa}</CodigoTarifa>\n`;
      xml += `        <Tarifa>${linea.impuesto.tarifa.toFixed(2)}</Tarifa>\n`;
      xml += `        <Monto>${linea.impuesto.monto.toFixed(5)}</Monto>\n`;
      if (linea.impuesto.exoneracion && linea.impuesto.exoneracion.montoExoneracion > 0) {
        xml += `        <Exoneracion>\n`;
        xml += `          <TipoDocumento>${linea.impuesto.exoneracion.tipoDocumento || "04"}</TipoDocumento>\n`;
        xml += `          <NumeroDocumento>${escapeXml(linea.impuesto.exoneracion.numeroDocumento || "EX-0001")}</NumeroDocumento>\n`;
        xml += `          <NombreInstitucion>${escapeXml(linea.impuesto.exoneracion.nombreInstitucion || "Ministerio de Hacienda")}</NombreInstitucion>\n`;
        xml += `          <FechaEmision>${new Date(linea.impuesto.exoneracion.fechaEmision || Date.now()).toISOString()}</FechaEmision>\n`;
        xml += `          <PorcentajeExoneracion>${linea.impuesto.exoneracion.porcentajeExoneracion}</PorcentajeExoneracion>\n`;
        xml += `          <MontoExoneracion>${linea.impuesto.exoneracion.montoExoneracion.toFixed(5)}</MontoExoneracion>\n`;
        xml += `        </Exoneracion>\n`;
      }
      xml += `      </Impuesto>\n`;
    }

    xml += `      <MontoTotalLinea>${linea.montoTotalLinea.toFixed(5)}</MontoTotalLinea>\n`;
    xml += `    </LineaDetalle>\n`;
  });
  xml += `  </DetalleServicio>\n`;

  // Resumen de Factura
  const res = data.resumen;
  xml += `  <ResumenFactura>\n`;
  xml += `    <CodigoTipoMoneda>\n`;
  xml += `      <CodigoMoneda>${data.moneda}</CodigoMoneda>\n`;
  xml += `      <TipoCambio>${data.tipoCambio.toFixed(5)}</TipoCambio>\n`;
  xml += `    </CodigoTipoMoneda>\n`;
  xml += `    <TotalServGravados>${res.totalServGravados.toFixed(5)}</TotalServGravados>\n`;
  xml += `    <TotalServExentos>${res.totalServExentos.toFixed(5)}</TotalServExentos>\n`;
  xml += `    <TotalMercanciasGravadas>${res.totalMercanciasGravadas.toFixed(5)}</TotalMercanciasGravadas>\n`;
  xml += `    <TotalMercanciasExentas>${res.totalMercanciasExentas.toFixed(5)}</TotalMercanciasExentas>\n`;
  xml += `    <TotalGravado>${res.totalGravado.toFixed(5)}</TotalGravado>\n`;
  xml += `    <TotalExento>${res.totalExento.toFixed(5)}</TotalExento>\n`;
  xml += `    <TotalVenta>${res.totalVenta.toFixed(5)}</TotalVenta>\n`;
  xml += `    <TotalDescuentos>${res.totalDescuentos.toFixed(5)}</TotalDescuentos>\n`;
  xml += `    <TotalVentaNeta>${res.totalVentaNeta.toFixed(5)}</TotalVentaNeta>\n`;
  xml += `    <TotalImpuesto>${res.totalImpuesto.toFixed(5)}</TotalImpuesto>\n`;
  xml += `    <TotalComprobante>${res.totalComprobante.toFixed(5)}</TotalComprobante>\n`;
  xml += `  </ResumenFactura>\n`;

  // Informacion de Referencia (Obligatorio en Notas de Crédito 03, Notas de Débito 02 o sustituciones)
  if (data.informacionReferencia && data.informacionReferencia.length > 0) {
    data.informacionReferencia.forEach((ref) => {
      const refFechaStr =
        typeof ref.fechaEmision === "string"
          ? ref.fechaEmision
          : formatDateTimeCR(ref.fechaEmision);
      xml += `  <InformacionReferencia>\n`;
      xml += `    <TipoDoc>${ref.tipoDocumento || "01"}</TipoDoc>\n`;
      xml += `    <Numero>${escapeXml(ref.numeroDocumento)}</Numero>\n`;
      xml += `    <FechaEmision>${refFechaStr}</FechaEmision>\n`;
      xml += `    <Codigo>${ref.codigo}</Codigo>\n`;
      xml += `    <Razon>${escapeXml(ref.razon || "Ajuste contable")}</Razon>\n`;
      xml += `  </InformacionReferencia>\n`;
    });
  }

  xml += `</${tag}>`;
  return xml;
}
