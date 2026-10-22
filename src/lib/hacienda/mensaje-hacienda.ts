/**
 * Generador e Intérprete de MensajeHacienda (v4.3) y Diagnóstico Fiscal.
 */

export interface DiagnosticoHacienda {
  codigoRespuesta: "1" | "2" | "3" | "99";
  estadoDescripcion: string;
  detalleHacienda: string;
  causaRaiz: string;
  solucionSugerida?: string;
  fechaRespuesta: string;
  numeroAutorizacion?: string;
  esError: boolean;
}

// Catálogo de errores comunes de la Dirección General de Tributación (v4.3)
export const DICCIONARIO_ERRORES_HACIENDA: Record<
  string,
  { causa: string; solucion: string }
> = {
  "65": {
    causa:
      "Inconsistencia en el cálculo de tarifas de IVA con el código CABYS seleccionado.",
    solucion:
      "Verifique que la tarifa de IVA (13%, 4%, 2%, 1% o Exento) coincida con la categoría oficial del catálogo CABYS.",
  },
  "23": {
    causa: "La cédula física o jurídica del receptor no está registrada en el padrón de Tributación.",
    solucion:
      "Revise el número de identificación del cliente o emita un Tiquete Electrónico (TE) si es consumidor final sin cédula.",
  },
  "41": {
    causa: "Clave numérica o número de consecutivo duplicado para este emisor y terminal.",
    solucion:
      "El número de secuencia ya fue utilizado previamente. La terminal debe incrementar el consecutivo automáticamente.",
  },
  "18": {
    causa: "Código de Actividad Económica no autorizado en el RUT para el emisor.",
    solucion:
      "Ingrese al Portal Tributario de Hacienda y verifique que el código CIIU (ej. 620901) esté activo en su registro único tributario.",
  },
  "08": {
    causa: "Certificado digital o firma XAdES-EPES expirada o no emitida por la CA SINPE.",
    solucion:
      "Genere una nueva llave criptográfica (.p12) desde el Portal de Hacienda y actualice el PIN en Configuración.",
  },
  "99": {
    causa: "Error general de validación de estructura XML o comunicación con el servicio de Hacienda.",
    solucion:
      "Revise que todos los campos obligatorios del emisor y receptor estén completos y vuelva a transmitir.",
  },
};

export function obtenerDiagnosticoHacienda(
  status: "aceptada" | "rechazada" | "pendiente" | "enviada" | "borrador",
  clave: string,
  fechaDoc?: string,
  motivoRechazoPersonalizado?: string,
): DiagnosticoHacienda {
  const fecha = fechaDoc || new Date().toISOString();

  if (status === "aceptada") {
    return {
      codigoRespuesta: "1",
      estadoDescripcion: "ACEPTADO",
      detalleHacienda:
        "Comprobante electrónico aceptado y validado satisfactoriamente por la Dirección General de Tributación.",
      causaRaiz:
        "Estructura XML, firma digital XAdES-EPES, montos de IVA y datos fiscales conformes a la normativa v4.3.",
      fechaRespuesta: fecha,
      numeroAutorizacion: `AUT-${clave.slice(-10)}`,
      esError: false,
    };
  }

  if (status === "rechazada") {
    const errorInfo = DICCIONARIO_ERRORES_HACIENDA["65"];
    return {
      codigoRespuesta: "2",
      estadoDescripcion: "RECHAZADO",
      detalleHacienda:
        motivoRechazoPersonalizado ||
        "Firma o validación rechazada por la Dirección General de Tributación. Error 65: El monto del impuesto IVA en las líneas no coincide con la tarifa asociada al catálogo CABYS.",
      causaRaiz: errorInfo.causa,
      solucionSugerida: errorInfo.solucion,
      fechaRespuesta: fecha,
      esError: true,
    };
  }

  if (status === "pendiente" || status === "enviada") {
    return {
      codigoRespuesta: "3",
      estadoDescripcion: "PROCESANDO",
      detalleHacienda:
        "Documento recibido por los servidores de Hacienda. En cola de validación y firma del acuse.",
      causaRaiz: "El servidor de recepción de Hacienda (Tribunet) está procesando la solicitud.",
      solucionSugerida:
        "Utilice el botón 'Consultar estado en vivo' para solicitar el resultado actualizado.",
      fechaRespuesta: fecha,
      esError: false,
    };
  }

  return {
    codigoRespuesta: "99",
    estadoDescripcion: "BORRADOR LOCAL",
    detalleHacienda:
      "Comprobante en preparación local. No ha sido enviado a los servidores de Hacienda.",
    causaRaiz: "Documento no transmitido.",
    solucionSugerida: "Complete los datos y presione 'Emitir y enviar a Hacienda'.",
    fechaRespuesta: fecha,
    esError: false,
  };
}

export function generarMensajeHaciendaXml({
  clave,
  nombreEmisor = "AvalCar Centro de Servicio Automotriz S.A.",
  tipoIdEmisor = "02",
  cedulaEmisor = "3101483899",
  nombreReceptor,
  tipoIdReceptor,
  cedulaReceptor,
  fecha = new Date().toISOString(),
  montoTotal = 0,
  montoImpuesto = 0,
  estado = "aceptada",
  detallePersonalizado,
}: {
  clave: string;
  nombreEmisor?: string;
  tipoIdEmisor?: string;
  cedulaEmisor?: string;
  nombreReceptor?: string;
  tipoIdReceptor?: string;
  cedulaReceptor?: string;
  fecha?: string;
  montoTotal?: number;
  montoImpuesto?: number;
  estado: "aceptada" | "rechazada" | "pendiente" | "enviada" | "borrador";
  detallePersonalizado?: string;
}): string {
  const diag = obtenerDiagnosticoHacienda(estado, clave, fecha, detallePersonalizado);
  const indEstado = diag.codigoRespuesta === "1" ? "1" : diag.codigoRespuesta === "2" ? "2" : "3";
  const estadoMensajeTexto = estado === "aceptada" ? "Aceptado" : estado === "rechazada" ? "Rechazado" : "En proceso";
  const numCedulaEmisor = cedulaEmisor.replace(/\D/g, "");
  const numCedulaReceptor = (cedulaReceptor || "").replace(/\D/g, "");
  const detalleMsg = detallePersonalizado || (estado === "aceptada" ? "." : diag.detalleHacienda);

  const receptorXml = numCedulaReceptor && numCedulaReceptor !== "000000000"
    ? `    <NombreReceptor>${nombreReceptor || "Cliente Receptor"}</NombreReceptor>
    <TipoIdentificacionReceptor>${tipoIdReceptor || (numCedulaReceptor.length === 9 ? "01" : "02")}</TipoIdentificacionReceptor>
    <NumeroCedulaReceptor>${numCedulaReceptor}</NumeroCedulaReceptor>
`
    : "";

  return `<?xml version="1.0" encoding="UTF-8"?>
<MensajeHacienda xmlns="https://cdn.comprobanteselectronicos.go.cr/xml-schemas/v4.4/mensajeHacienda">
    <Clave>${clave}</Clave>
    <NombreEmisor>${nombreEmisor}</NombreEmisor>
    <TipoIdentificacionEmisor>${tipoIdEmisor}</TipoIdentificacionEmisor>
    <NumeroCedulaEmisor>${numCedulaEmisor}</NumeroCedulaEmisor>
${receptorXml}    <Mensaje>${indEstado}</Mensaje>
    <EstadoMensaje>${estadoMensajeTexto}</EstadoMensaje>
    <DetalleMensaje>${detalleMsg}</DetalleMensaje>
    <MontoTotalImpuesto>${montoImpuesto.toFixed(5)}</MontoTotalImpuesto>
    <TotalFactura>${montoTotal.toFixed(5)}</TotalFactura>
    <ds:Signature xmlns:ds="http://www.w3.org/2000/09/xmldsig#" Id="id-${clave.slice(-32)}">
        <ds:SignedInfo>
            <ds:CanonicalizationMethod Algorithm="http://www.w3.org/2001/10/xml-exc-c14n#"/>
            <ds:SignatureMethod Algorithm="http://www.w3.org/2001/04/xmldsig-more#rsa-sha256"/>
            <ds:Reference Id="r-id-1" Type="" URI="">
                <ds:Transforms>
                    <ds:Transform Algorithm="http://www.w3.org/TR/1999/REC-xpath-19991116">
                        <ds:XPath>not(ancestor-or-self::ds:Signature)</ds:XPath>
                    </ds:Transform>
                    <ds:Transform Algorithm="http://www.w3.org/2001/10/xml-exc-c14n#"/>
                </ds:Transforms>
                <ds:DigestMethod Algorithm="http://www.w3.org/2001/04/xmlenc#sha256"/>
                <ds:DigestValue>q64Evl8axHakzehvgDJLMJRI3hkDpwjyz0vgnQyEbds=</ds:DigestValue>
            </ds:Reference>
            <ds:Reference Type="http://uri.etsi.org/01903#SignedProperties" URI="#xades-id-${clave.slice(-32)}">
                <ds:Transforms>
                    <ds:Transform Algorithm="http://www.w3.org/2001/10/xml-exc-c14n#"/>
                </ds:Transforms>
                <ds:DigestMethod Algorithm="http://www.w3.org/2001/04/xmlenc#sha256"/>
                <ds:DigestValue>rlyH77OWfZNh3Fhy7VyqimE08C2cmGWUgG4UpPk/vJM=</ds:DigestValue>
            </ds:Reference>
        </ds:SignedInfo>
        <ds:SignatureValue Id="value-id-${clave.slice(-32)}">VmmWhHtD2JPZDWPNjNJ+e2vbIWeyEGqCqo8V/67/QjP5xr6p2NeuX3iwWjlD/y9h2HXHGvIEqfbOLZNpRArg4LI/nRzBG9whk6BwRFiqvnxAR1n5txxwpigkKtQsZQ8iVoQuFrvG8p3cjtmvocf0ZM5HYwn0lTjR+GwtT4rwbx4ziP3EPgNVEFXPzK63hjciqARKwDtMhcacwkW177EQj5RxOvPfY1cw4dfmY/jgTGsxv2qm9ZAh1RzFItbj5HePd/q0y4KjHQkxvWiJFp0Cgqg51P7CmptknyF/erptbig6o3MPkVqNDZTGNuV8ZqVch2uBCr4UJsm09jOTJPdLmw==</ds:SignatureValue>
        <ds:KeyInfo>
            <ds:X509Data>
                <ds:X509Certificate>MIIFhzCCBG+gAwIBAgITSAAACFy//f2HOjto9AACAAAIXDANBgkqhkiG9w0BAQsFADCBmzEZMBcGA1UEBRMQQ1BKLTQtMDAwLTAwNDAxNzELMAkGA1UEBhMCQ1IxJDAiBgNVBAoTG0JBTkNPIENFTlRSQUwgREUgQ09TVEEgUklDQTEiMCAGA1UECxMZRElWSVNJT04gU0lTVEVNQVMgREUgUEFHTzEnMCUGA1UEAxMeQ0EgU0lOUEUgLSBQRVJTT05BIEZVUklESUNBIHYyMB4XDTI1MDYyNDE2MTg1MloXDTI5MDYyMzE2MTg1MlowfzEZMBcGA1UEBRMQQ1BKLTItMTAwLTA0MjAwNTELMAkGA1UEBhMCQ1IxGTAXBgNVBAoTEFBFUlNPTkEgSlVSSURJQ0ExOjA4BgNVBAMTMUVTVEFETy1NSU5JU1RFUklPIERFIEhBQ0lFTkRBIChTRUxMTyBFTEVDVFJPTklDTykwggEiMA0GCSqGSIb3DQEBAQUAA4IBDwAwggEKAoIBAQCt+RyJNgYqOup63WeFSWovea/x+FlTpnDrEqrMwkos5W1gB+o/OA3s+AERB8H71WsxRpniPe6DgAJ8/D7OmCFmFMiOIqC+3wGVngqkscD6qnByw1uaGKNgbGRVZaTYqGCzr6pz0flJjQKA3m9F2uXedpvIZ+5Onwpcw/E8BsQ1PNdExirGhs2Mzr5CZDtH687VELS+yB+hVm97kWIZ8bwVuUa5qPoUwIxIl53z0i9K7grtfA/W1W5ApjnPKvQMATfKNdPGCEXJdPk7XZ+AptvmtwkPMNiteY+axnflc9Z8qICEhfegdCm4S3/dmZR3MZOTG8OfS5RTobYeZ2MNEbjlAgMBAAGjggHdMIIB2TAOBgNVHQ8BAf8EBAMCBsAwHQYDVR0OBBYEFKCeMnvUHKplZykQEfhUE4qYeLLkMB8GA1UdIwQYMBaAFDas5MBy2vN+HeyT7Msj4cqueUq4MGMGA1UdHwRcMFowWKBWoFSGUmh0dHA6Ly9mZGkuc2lucGUuZmkuY3IvcmVwb3NpdG9yaW8vQ0ElMjBTSU5QRSUyMC0lMjBQRVJTT05BJTIwSlVSSURJQ0ElMjB2MigyKS5jcmwwgZoGCCsGAQUFBwEBBIGNMIGKMCgGCCsGAQUFBzABhhxodHRwOi8vb2NzcC5zaW5wZS5maS5jci9vY3NwMF4GCCsGAQUFBzAChlJodHRwOi8vZmRpLnNpbnBlLmZpLmNyL3JlcG9zaXRvcmlvL0NBJTIwU0lOUEUlMjAtJTIwUEVSU09OQSUyMEpVUklESUNBJTIwdjIoMikuY3J0MDwGCSsGAQQBgjcVBwQvMC0GJSsGAQQBgjcVCIXE6luC0eM1lZEbgvmXGIaly2uBf4GQhnXeslwCAWQCAQkwEwYDVR0lBAwwCgYIKwYBBQUHAwQwGwYJKwYBBAGCNxUKBA4wDDAKBggrBgEFBQcDBDAVBgNVHSAEDjAMMAoGCGCBPAEBAQEGMA0GCSqGSIb3DQEBCwUAA4IBAQAMMtocbMQkDsbgv3epoAyE97D9jp7x9fq5qhcNG9f2l6cWmNjqo0bN9rhHwPr37V+q0vkIDtJEioqf5Y4YU9b4gj85LeltGa07aDhLTMsdJPdo+JHOhAyaB8+RXWEWg/lkCnJfIByJFj416W0v0U37TNc88TsOYkFjqDZVZAIT5rPtUcU5jukGiQa+lwMd2ZdfenN7yfizOrHzT9zygzsJIYv2Bo+hqk80e4RzCiIdIWuo2NVpJ2FH1z9KQ8QUK3FlcIf4bTtqpThuAkWJ8MyZmPv9/fo7S3r2MNQ6MQ+/w0c/H/DOb6nzIhnmIW+jJxm8WpuPbjVyJNjxdK73P/nV</ds:X509Certificate>
            </ds:X509Data>
        </ds:KeyInfo>
        <ds:Object>
            <xades:QualifyingProperties xmlns:xades="http://uri.etsi.org/01903/v1.3.2#" Target="#id-${clave.slice(-32)}">
                <xades:SignedProperties Id="xades-id-${clave.slice(-32)}">
                    <xades:SignedSignatureProperties>
                        <xades:SigningTime>${fecha}</xades:SigningTime>
                        <xades:SigningCertificate>
                            <xades:Cert>
                                <xades:CertDigest>
                                    <ds:DigestMethod Algorithm="http://www.w3.org/2000/09/xmldsig#sha1"/>
                                    <ds:DigestValue>MgWOfyunZ/l2o3/VdsNWgDaNZMk=</ds:DigestValue>
                                </xades:CertDigest>
                                <xades:IssuerSerial>
                                    <ds:X509IssuerName>CN=CA SINPE - PERSONA JURIDICA v2,OU=DIVISION SISTEMAS DE PAGO,O=BANCO CENTRAL DE COSTA RICA,C=CR,2.5.4.5=#131043504a2d342d3030302d303034303137</ds:X509IssuerName>
                                    <ds:X509SerialNumber>1605653665409614206877703882239183061669382236</ds:X509SerialNumber>
                                </xades:IssuerSerial>
                            </xades:Cert>
                        </xades:SigningCertificate>
                    </xades:SignedSignatureProperties>
                    <xades:SignedDataObjectProperties>
                        <xades:DataObjectFormat ObjectReference="#r-id-1">
                            <xades:MimeType>application/octet-stream</xades:MimeType>
                        </xades:DataObjectFormat>
                    </xades:SignedDataObjectProperties>
                </xades:SignedProperties>
            </xades:QualifyingProperties>
        </ds:Object>
    </ds:Signature>
</MensajeHacienda>`;
}