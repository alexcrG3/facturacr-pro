import { AmbienteHacienda } from "./types";

export interface TokenHacienda {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  obtainedAt: number;
}

const isBrowser = typeof window !== "undefined";

const HACIENDA_AUTH_ENDPOINTS = {
  staging: {
    tokenUrl: isBrowser
      ? "/api/hacienda/idp/auth/realms/rut-stag/protocol/openid-connect/token"
      : "https://idp.comprobanteselectronicos.go.cr/auth/realms/rut-stag/protocol/openid-connect/token",
    clientId: "api-stag",
  },
  produccion: {
    tokenUrl: isBrowser
      ? "/api/hacienda/idp/auth/realms/rut/protocol/openid-connect/token"
      : "https://idp.comprobanteselectronicos.go.cr/auth/realms/rut/protocol/openid-connect/token",
    clientId: "api-prod",
  },
};

// Token cache en memoria
const tokenCache: Record<string, TokenHacienda> = {};

/**
 * Obtiene un token Bearer JWT desde el Identity Provider de Hacienda Costa Rica.
 */
export async function obtenerTokenHacienda(
  ambiente: AmbienteHacienda,
  usuarioAtv: string,
  claveAtv: string,
): Promise<string> {
  const cacheKey = `${ambiente}:${usuarioAtv}`;
  const now = Date.now();

  const cached = tokenCache[cacheKey];
  if (cached && now < cached.obtainedAt + (cached.expiresIn - 30) * 1000) {
    return cached.accessToken;
  }

  const endpoint = HACIENDA_AUTH_ENDPOINTS[ambiente];
  const params = new URLSearchParams();
  params.append("client_id", endpoint.clientId);
  params.append("grant_type", "password");
  params.append("username", usuarioAtv);
  params.append("password", claveAtv);

  const response = await fetch(endpoint.tokenUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(
      `Error de autenticación con Hacienda (${response.status}): Credenciales de Hacienda inválidas o servidor no disponible. Detalle: ${errText}`,
    );
  }

  const data = (await response.json()) as {
    access_token: string;
    refresh_token: string;
    expires_in: number;
  };

  tokenCache[cacheKey] = {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresIn: data.expires_in,
    obtainedAt: now,
  };

  return data.access_token;
}

/**
 * Valida si las credenciales de Hacienda son válidas intentando obtener un token.
 */
export async function probarConexionHacienda(
  ambiente: AmbienteHacienda,
  usuarioAtv: string,
  claveAtv: string,
): Promise<{ ok: boolean; mensaje: string }> {
  try {
    const token = await obtenerTokenHacienda(ambiente, usuarioAtv, claveAtv);
    if (token) {
      return {
        ok: true,
        mensaje: `Conexión exitosa con el servidor de Hacienda (${ambiente.toUpperCase()}).`,
      };
    }
    return { ok: false, mensaje: "No se recibió token de Hacienda." };
  } catch (error) {
    return {
      ok: false,
      mensaje:
        error instanceof Error ? error.message : "Error desconocido al conectar con Hacienda.",
    };
  }
}
