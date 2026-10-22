/**
 * Consulta pública oficial de contribuyentes del Ministerio de Hacienda de Costa Rica.
 * Endpoint CORS oficial y público: https://api.hacienda.go.cr/fe/ae?identificacion=...
 */

export interface TaxpayerInfo {
  nombre: string;
  tipoIdentificacion: "01" | "02" | "03" | "04";
  tipoLabel: string;
  regimen?: {
    codigo: number;
    descripcion: string;
  };
  situacion?: {
    moroso: "SI" | "NO" | string;
    omiso: "SI" | "NO" | string;
    estado: string;
    administracionTributaria?: string;
  };
  actividades?: Array<{
    estado: string;
    tipo: string;
    codigo: string;
    descripcion: string;
  }>;
}

export async function consultarContribuyenteHacienda(
  cedula: string,
): Promise<TaxpayerInfo | null> {
  const cleanId = cedula.trim().replace(/[^a-zA-Z0-9]/g, "");
  // Cédula física (9), jurídica numérica o alfanumérica (10), DIMEX (11-12)
  if (cleanId.length < 9 || cleanId.length > 12) {
    return null;
  }

  try {
    const res = await fetch(
      `https://api.hacienda.go.cr/fe/ae?identificacion=${cleanId}`,
      {
        headers: {
          Accept: "application/json",
        },
      },
    );

    if (!res.ok) {
      return null;
    }

    const data = await res.json();
    if (!data || !data.nombre) {
      return null;
    }

    const tipoId =
      data.tipoIdentificacion === "02" || cleanId.length === 10
        ? "02"
        : data.tipoIdentificacion === "03" || cleanId.length === 11 || cleanId.length === 12
        ? "03"
        : "01";

    return {
      nombre: data.nombre.trim(),
      tipoIdentificacion: tipoId,
      tipoLabel:
        tipoId === "02"
          ? "Cédula Jurídica"
          : tipoId === "03"
          ? "DIMEX"
          : "Cédula Física",
      regimen: data.regimen,
      situacion: data.situacion,
      actividades: data.actividades,
    };
  } catch (err) {
    console.error("Error al consultar contribuyente en Hacienda:", err);
    return null;
  }
}
