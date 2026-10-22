export interface IdentityResult {
  cedula: string;
  nombreCompleto: string;
  nombre?: string;
  primerApellido?: string;
  segundoApellido?: string;
  tipoPersona: "fisica" | "juridica" | "dimex";
  source: "hacienda" | "tse_padron" | "no_encontrado";
  actividadesEconomicas?: Array<{
    codigo: string;
    descripcion: string;
    tipo: string;
    estado?: string;
  }>;
  situacionTributaria?: {
    estado: string;
    moroso: string;
    omiso: string;
    administracion: string;
  };
}

export async function consultarIdentidadCR(cedulaRaw: string): Promise<IdentityResult | null> {
  const cleanId = (cedulaRaw || "").trim().replace(/\D/g, "");

  if (cleanId.length < 9 || cleanId.length > 12) {
    return null;
  }

  const isJuridica = cleanId.length === 10;
  const isDimex = cleanId.length === 11 || cleanId.length === 12;

  // 1. NIVEL 1: API de Hacienda (RUT)
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);

    const resHacienda = await fetch(`https://api.hacienda.go.cr/fe/ae?identificacion=${cleanId}`, {
      signal: controller.signal,
      headers: { Accept: "application/json" },
    });
    clearTimeout(timeout);

    if (resHacienda.ok) {
      const dataHacienda = (await resHacienda.json()) as {
        nombre?: string;
        actividades?: Array<{ codigo: string; descripcion: string; tipo: string; estado?: string }>;
        situacion?: {
          estado?: string;
          moroso?: string;
          omiso?: string;
          administracionTributaria?: string;
        };
      };

      if (dataHacienda && dataHacienda.nombre) {
        return {
          cedula: cleanId,
          nombreCompleto: dataHacienda.nombre.trim(),
          tipoPersona: isJuridica ? "juridica" : isDimex ? "dimex" : "fisica",
          source: "hacienda",
          actividadesEconomicas: dataHacienda.actividades || [],
          situacionTributaria: {
            estado: dataHacienda.situacion?.estado || "Inscrito",
            moroso: dataHacienda.situacion?.moroso || "NO",
            omiso: dataHacienda.situacion?.omiso || "NO",
            administracion: dataHacienda.situacion?.administracionTributaria || "",
          },
        };
      }
    }
  } catch (err) {
    console.warn("[API Identities] Hacienda query failed or timed out, trying TSE:", err);
  }

  // 2. NIVEL 2: Padrón Electoral TSE (para Personas Físicas)
  if (cleanId.length === 9) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 4000);

      const resTse = await fetch(`https://apis.gometa.org/cedulas/${cleanId}`, {
        signal: controller.signal,
        headers: { Accept: "application/json" },
      });
      clearTimeout(timeout);

      if (resTse.ok) {
        const dataTse = (await resTse.json()) as {
          results?: Array<{
            firstname?: string;
            lastname1?: string;
            lastname2?: string;
          }>;
        };
        const tseRecord = dataTse.results?.[0];

        if (tseRecord && tseRecord.firstname) {
          const nombre = `${tseRecord.firstname} ${tseRecord.lastname1 || ""} ${tseRecord.lastname2 || ""}`.trim();
          return {
            cedula: cleanId,
            nombreCompleto: nombre,
            nombre: tseRecord.firstname,
            primerApellido: tseRecord.lastname1,
            segundoApellido: tseRecord.lastname2 || "",
            tipoPersona: "fisica",
            source: "tse_padron",
          };
        }
      }
    } catch (err) {
      console.warn("[API Identities] TSE lookup failed or timed out:", err);
    }
  }

  return null;
}

export async function handleIdentityRequest(cedula: string): Promise<Response> {
  if (!cedula) {
    return new Response(
      JSON.stringify({ success: false, error: "Parámetro cédula requerido." }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  const result = await consultarIdentidadCR(cedula);

  if (!result) {
    return new Response(
      JSON.stringify({
        success: false,
        error: `No se encontró información para la cédula ${cedula} en Hacienda ni en el Padrón Electoral.`,
      }),
      { status: 404, headers: { "Content-Type": "application/json" } },
    );
  }

  return new Response(
    JSON.stringify({
      success: true,
      data: result,
    }),
    { status: 200, headers: { "Content-Type": "application/json" } },
  );
}
