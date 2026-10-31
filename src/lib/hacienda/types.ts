export type TipoDocumento =
  | "01" // Factura Electrónica
  | "02" // Nota de Débito
  | "03" // Nota de Crédito
  | "04" // Tiquete Electrónico
  | "08" // Factura Electrónica de Exportación
  | "09" // Factura Electrónica de Compra
  | "CCE" // Confirmación Comprobante Electrónico (Mensaje Receptor)
  | "CPCE" // Confirmación Parcial
  | "RCE"; // Rechazo

export type TipoIdentificacion =
  | "01" // Cédula Física (9 dígitos)
  | "02" // Cédula Jurídica (10 dígitos)
  | "03" // DIMEX (11 o 12 dígitos)
  | "04"; // NITE (10 dígitos)

export type CondicionVenta =
  | "01" // Contado
  | "02" // Crédito
  | "03" // Consignación
  | "04" // Apartado
  | "05" // Arrendamiento con opción de compra
  | "06" // Arrendamiento en función financiera
  | "07" // Cobro a favor de un tercero
  | "08" // Servicios prestados al Estado a crédito
  | "09" // Pago del servicios prestados al Estado
  | "99"; // Otros

export type MedioPago =
  | "01" // Efectivo
  | "02" // Tarjeta
  | "03" // Cheque
  | "04" // Transferencia - depósito bancario
  | "05" // Recaudado por terceros
  | "99"; // Otros

export type CodigoTarifaIVA =
  | "01" // Tarifa 0% (Exento)
  | "02" // Tarifa reducida 1%
  | "03" // Tarifa reducida 2%
  | "04" // Tarifa reducida 4%
  | "07" // Tarifa reducida 8%
  | "08"; // Tarifa general 13%

export type EstadoHacienda =
  "borrador" | "enviando" | "recibido" | "procesando" | "aceptado" | "rechazado";

export type AmbienteHacienda = "staging" | "produccion";

export interface HaciendaConfig {
  ambiente: AmbienteHacienda;
  version?: "v4.3" | "v4.4";
  usuarioAtv: string;
  claveAtv: string;
  pinP12: string;
  p12CertBase64?: string;
  p12NombreArchivo?: string;
  codigoActividad: string;
  sucursal: number;
  terminal: number;
}

export interface EmisorHacienda {
  nombre: string;
  nombreComercial?: string;
  tipoIdentificacion: TipoIdentificacion;
  numeroIdentificacion: string;
  correo: string;
  telefono?: {
    codigoPais: string;
    numero: string;
  };
  ubicacion?: {
    provincia: string;
    canton: string;
    distrito: string;
    barrio?: string;
    otrasSenas: string;
  };
}

export interface ReceptorHacienda {
  nombre: string;
  tipoIdentificacion?: TipoIdentificacion;
  numeroIdentificacion?: string;
  correo?: string;
  telefono?: {
    codigoPais: string;
    numero: string;
  };
}

export interface LineaDetalleHacienda {
  numeroLinea: number;
  codigoCabys: string; // 13 dígitos
  codigoComercial?: string;
  detalle: string;
  unidadMedida: string; // 'Unid', 'Sp', 'kg', etc.
  cantidad: number;
  precioUnitario: number;
  montoTotal: number;
  descuento?: {
    monto: number;
    naturaleza?: string;
  };
  subtotal: number;
  impuesto?: {
    codigo: "01" | "07"; // 01=IVA
    codigoTarifa: CodigoTarifaIVA;
    tarifa: number; // 0, 1, 2, 4, 8, 13
    monto: number;
    exoneracion?: {
      tipoDocumento: string;
      numeroDocumento: string;
      nombreInstitucion: string;
      fechaEmision: Date | string;
      porcentajeExoneracion: number;
      montoExoneracion: number;
    };
  };
  montoTotalLinea: number;
}

export type CodigoReferencia =
  | "01" // Anula Documento de Referencia
  | "02" // Corrige texto de Documento de Referencia
  | "03" // Corrige montos
  | "04" // Referencia a otro documento
  | "05" // Sustituye comprobante provisional por contingencia
  | "12" // Nota de crédito financiera por exoneración posterior a la facturación
  | "13" // Anula comprobante por error material (afecta periodo original - Normativa 1 Noviembre)
  | "14" // Corrige montos por error material (afecta periodo original - Normativa 1 Noviembre)
  | "15" // Sustituye comprobante por error material (afecta periodo original - Normativa 1 Noviembre)
  | "16" // Referencia a comprobante electrónico rechazado por Hacienda
  | "17" // Aplicación de pago en Recibo Electrónico de Pago (REP)
  | "19" // Factura Electrónica de Exportación
  | "20" // Recibo Electrónico de Pago
  | "99"; // Otros

export interface InformacionReferenciaHacienda {
  tipoDocumento: string; // 01=FE, 04=TE, 09=FEE, etc.
  numeroDocumento: string; // Clave de 50 dígitos
  fechaEmision: Date | string;
  codigo: CodigoReferencia | string;
  razon: string;
}

export interface FacturaHaciendaPayload {
  clave: string;
  consecutivo: string;
  fechaEmision: Date;
  tipoDocumento: TipoDocumento;
  versionEsquema?: "v4.3" | "v4.4";
  emisor: EmisorHacienda;
  receptor?: ReceptorHacienda;
  codigoActividad: string;
  condicionVenta: CondicionVenta;
  plazoCredito?: number;
  mediosPago: MedioPago[];
  moneda: "CRC" | "USD";
  tipoCambio: number;
  lineas: LineaDetalleHacienda[];
  resumen: {
    totalServGravados: number;
    totalServExentos: number;
    totalMercanciasGravadas: number;
    totalMercanciasExentas: number;
    totalGravado: number;
    totalExento: number;
    totalVenta: number;
    totalDescuentos: number;
    totalVentaNeta: number;
    totalImpuesto: number;
    totalComprobante: number;
  };
  informacionReferencia?: InformacionReferenciaHacienda[];
}

export interface CabysItem {
  codigo: string;
  descripcion: string;
  categoria: string;
  impuestoSugerido: number;
}
