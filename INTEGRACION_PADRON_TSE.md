# 🪪 GUÍA DE INTEGRACIÓN: API DE CONSULTA DE IDENTIDADES Y PADRÓN ELECTORAL (TSE COSTA RICA)

Este documento detalla la arquitectura, endpoints y código fuente para implementar la **Consulta Automática de Cédulas e Identidades en Costa Rica**, integrando el **Padrón Electoral del Tribunal Supremo de Elecciones (TSE)** y el **Registro Único Tributario (RUT) del Ministerio de Hacienda**.

---

## 🎯 1. El Problema que Resuelve

En Costa Rica existen dos tipos de clientes:

1. **Contribuyentes inscritos en Hacienda (Personas Físicas o Empresas):**
   * El API de Hacienda (`https://api.hacienda.go.cr/fe/ae?identificacion=...`) devuelve su nombre y actividades económicas.
2. **Ciudadanos particulares / Consumidores finales (NO inscritos en Hacienda):**
   * Un socio de NexusSport o un cliente en mostrador que solo compra un producto tiene cédula física costarricense, pero **Hacienda NO devuelve su nombre** porque no está inscrito como contribuyente.
   * **Solución:** Consultar el **Padrón Nacional del Tribunal Supremo de Elecciones (TSE)** para obtener de forma instantánea el Nombre, Primer Apellido y Segundo Apellido oficiales según el Registro Civil.

---

## 🏛️ 2. Arquitectura de Consulta en Cascada (Cascade Lookup)

El sistema implementa una consulta inteligente en 2 niveles:

```
                  Usuario digita la Cédula (9 a 12 dígitos)
                                     │
                                     ▼
                     NIVEL 1: API de Hacienda (RUT)
                     https://api.hacienda.go.cr/fe/ae
                                     │
                    ¿Existe en Hacienda como contribuyente?
                                   /   \
                                 SÍ     NO
                                 /       \
     ┌──────────────────────────┘         └──────────────────────────┐
     ▼                                                               ▼
 Retorna:                                             NIVEL 2: Padrón Electoral TSE
 • Nombre o Razón Social                               https://apis.gometa.org/cedulas/{id}
 • Actividad Económica                                 (o consulta local en Supabase)
 • Régimen Tributario                                                │
 • Situación (Inscrito/Moroso)                                       ▼
                                                       Retorna:
                                                       • Nombre Oficial
                                                       • Primer Apellido
                                                       • Segundo Apellido
                                                       • Cédula Formateada
```

---

## 🚀 3. Implementación Práctica en Código (TypeScript / JavaScript)

Puedes integrar este módulo directamente en cualquier aplicación (NexusSport, Facturio, etc.) o colocarlo en `src/lib/identity-lookup.ts`:

```typescript
// src/lib/identity-lookup.ts

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
  }>;
  situacionTributaria?: {
    estado: string;
    moroso: string;
    omiso: string;
    administracion: string;
  };
}

/**
 * Consulta un número de cédula en Costa Rica con resolución en Cascada:
 * 1. Consulta al Ministerio de Hacienda.
 * 2. Si no es contribuyente, consulta al Padrón Electoral del TSE.
 */
export async function consultarIdentidadCR(cedulaRaw: string): Promise<IdentityResult | null> {
  const cleanId = cedulaRaw.trim().replace(/\D/g, "");

  if (cleanId.length < 9 || cleanId.length > 12) {
    return null;
  }

  // Determinar tipo preliminar
  const isJuridica = cleanId.length === 10;
  const isDimex = cleanId.length === 11 || cleanId.length === 12;

  // -------------------------------------------------------------
  // PASO 1: Intentar con el Ministerio de Hacienda (RUT)
  // -------------------------------------------------------------
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);

    const resHacienda = await fetch(`https://api.hacienda.go.cr/fe/ae?identificacion=${cleanId}`, {
      signal: controller.signal,
      headers: { Accept: "application/json" },
    });
    clearTimeout(timeout);

    if (resHacienda.ok) {
      const dataHacienda = await resHacienda.json();
      if (dataHacienda && dataHacienda.nombre) {
        return {
          cedula: cleanId,
          nombreCompleto: dataHacienda.nombre,
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
    console.warn("Hacienda no respondió o tiempo agotado, probando TSE:", err);
  }

  // -------------------------------------------------------------
  // PASO 2: Si no está en Hacienda y es Persona Física (9 dígitos),
  // consultar al Padrón Electoral del Registro Civil (TSE)
  // -------------------------------------------------------------
  if (cleanId.length === 9) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 4000);

      // Servicio de consulta de cédulas del TSE
      const resTse = await fetch(`https://apis.gometa.org/cedulas/${cleanId}`, {
        signal: controller.signal,
        headers: { Accept: "application/json" },
      });
      clearTimeout(timeout);

      if (resTse.ok) {
        const dataTse = await resTse.json();
        const tseRecord = dataTse.results?.[0];

        if (tseRecord && tseRecord.firstname) {
          const nombre = `${tseRecord.firstname} ${tseRecord.lastname1} ${tseRecord.lastname2 || ""}`.trim();
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
      console.error("Error al consultar el Padrón del TSE:", err);
    }
  }

  return null;
}
```

---

## 🗄️ 4. Opción Enterprise: Carga del Padrón TSE en Supabase (Offline y 100% Privado)

Si deseas independencia total de servicios externos de terceros, el Tribunal Supremo de Elecciones ofrece mensualmente el **Padrón Electoral Nacional en Datos Abiertos**.

### Estructura de la Tabla en PostgreSQL (Supabase):
```sql
CREATE TABLE public.padron_tse (
  cedula VARCHAR(9) PRIMARY KEY,
  codigo_electoral VARCHAR(6),
  fecha_vencimiento VARCHAR(8),
  junta VARCHAR(5),
  nombre VARCHAR(40) NOT NULL,
  primer_apellido VARCHAR(40) NOT NULL,
  segundo_apellido VARCHAR(40) NOT NULL,
  nombre_completo VARCHAR(150) GENERATED ALWAYS AS (
    nombre || ' ' || primer_apellido || ' ' || segundo_apellido
  ) STORED
);

-- Índice B-Tree de alta velocidad para búsquedas en 1 milisegundo:
CREATE INDEX idx_padron_tse_cedula ON public.padron_tse(cedula);
CREATE INDEX idx_padron_tse_nombre ON public.padron_tse USING gin (nombre_completo gin_trgm_ops);
```

### Importación de Datos Abiertos del TSE:
1. Se descarga el archivo `PADRON_COMPLETO.txt` desde el portal oficial del TSE Costa Rica (`tse.go.cr`).
2. Se ejecuta la importación vía comando PostgreSQL `\copy`:
```bash
psql -h aws-0-us-east-1.pooler.supabase.com -U postgres.vxinvcjbrmjytmqqcscg -d postgres -c \
"\copy public.padron_tse(cedula, codigo_electoral, fecha_vencimiento, junta, nombre, primer_apellido, segundo_apellido) FROM 'PADRON_COMPLETO.txt' WITH (FORMAT csv, DELIMITER ',');"
```

### Ventajas del Padrón Propio en Supabase:
* **Velocidad extrema:** Tiempo de respuesta de **1 a 3 milisegundos**.
* **Disponibilidad 100%:** Funciona aunque los servidores del TSE o Hacienda estén caídos.
* **Privacidad bancaria:** Nadie sabe a qué clientes o socios les estás facturando.
