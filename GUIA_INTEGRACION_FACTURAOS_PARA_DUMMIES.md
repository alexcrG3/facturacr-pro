# 📘 GUÍA PARA DUMMIES: CÓMO CONECTAR CUALQUIER APP A FACTURAOS
> **Objetivo:** Si mañana creas una app nueva (restaurante, abogados, escuela, taller, etc.), con esta guía puedes dejarle **Facturación Electrónica oficial con Hacienda de Costa Rica** lista en 5 minutos.  
> **Cero enredos:** No tienes que programar nada de Hacienda, ni llaves criptográficas `.p12`, ni XMLs, ni firmas raras. Todo eso lo hace FacturaOS.

---

## 🧠 1. La Idea Básica (En cristiano)

Imagina que **FacturaOS es como un datafono de Stripe**:
* Tu nueva aplicación solo le dice a FacturaOS: *"Cobré ₡15,000 por una consulta a Juan Pérez"*.
* FacturaOS se encarga de todo el dolor de cabeza: toma el certificado de Hacienda, genera el XML oficial v4.4, lo firma digitalmente, lo manda a Hacienda, espera la aprobación y genera el PDF con el código QR.
* FacturaOS le regresa a tu app: *"Listo, aprobado. Aquí está la Clave de 50 dígitos y el link del PDF"*.

```
┌─────────────────────────┐          ┌──────────────────────────┐          ┌─────────────────────────┐
│     TU NUEVA APP        │          │       FACTURAOS HUB      │          │  MINISTERIO DE HACIENDA │
│  (Restaurante, etc.)    │          │     (Motor Central)      │          │       (Costa Rica)      │
│                         │          │                          │          │                         │
│ [Botón Cobrar ₡15,000] ─┼─────────►│ 1. Firma XML con .p12   ─┼─────────►│ Recibe y aprueba        │
│                         │  (JSON)  │ 2. Sella con Hacienda    │  (v4.4)  │ comprobante             │
│ Recibe Clave + PDF      │◄─────────┼─ 3. Genera PDF con QR   │◄─────────┼─ Devuelve estado        │
└─────────────────────────┘          └──────────────────────────┘          └─────────────────────────┘
```

---

## 🚀 2. Los 3 Pasos para Conectar una App Nueva

---

### PASO 1: Registrar el negocio en FacturaOS (Toma 2 minutos)
1. Abre FacturaOS en tu navegador: `http://localhost:3000/admin`
2. Presiona el botón verde **"+ Registrar Nueva Empresa"**.
3. Escribe los datos del negocio:
   * Nombre (ej: *Soda La Esquina*)
   * Cédula Jurídica o Física (ej: *3-101-123456*)
   * Código de Actividad Económica (CIIU)
4. Entra a la empresa creada y sube su llave de Hacienda:
   * Archivo `.p12` y su contraseña.
   * Usuario y contraseña del ATV de Hacienda.
5. En la pestaña **"Conexión API"**, copia la **API Key** que FacturaOS te genera automáticamente (ejemplo: `fct_live_sodalaesquina_8a9f...`).

---

### PASO 2: Copiar 2 archivos a tu Nueva App

En la carpeta de tu nueva app, solo vas a crear estos **dos archivos listos para copiar y pegar**:

#### 📄 Archivo 1: `src/lib/facturaos.ts` (El Conector)
Crea el archivo `src/lib/facturaos.ts` y pega este código tal cual:

```typescript
/**
 * Conector Estándar FacturaOS para Nuevas Apps
 */

export const DEFAULT_FACTURAOS_API_URL = "http://localhost:3000/api/v1/invoices";

// Lee las credenciales guardadas en la terminal/navegador
export function getFacturaOSConfig() {
  const apiUrl = localStorage.getItem("facturaos_api_url") || DEFAULT_FACTURAOS_API_URL;
  const apiKey = localStorage.getItem("facturaos_api_key") || "";
  return { apiUrl, apiKey };
}

// Guarda las credenciales
export function saveFacturaOSConfig(apiUrl: string, apiKey: string) {
  localStorage.setItem("facturaos_api_url", apiUrl.trim());
  localStorage.setItem("facturaos_api_key", apiKey.trim());
}

// Prueba si la conexión con FacturaOS y Hacienda está viva
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
  docType?: "01" | "04"; // 01 = Factura con Cédula, 04 = Tiquete Electrónico Rápido
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

// Emite la factura electrónica a Hacienda en 1 sola llamada
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
    saleCondition: "01", // Contado
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

  return data; // Devuelve { clave, consecutiveNumber, pdfUrl, xmlUrl }
}
```

---

#### 📄 Archivo 2: `src/components/FacturaOSConfigCard.tsx` (La Tarjeta Visual)
Crea este componente en `src/components/FacturaOSConfigCard.tsx`:

```tsx
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { KeyRound, ShieldCheck, CheckCircle2, AlertCircle, Eye, EyeOff, Zap, Loader2 } from "lucide-react";
import { getFacturaOSConfig, saveFacturaOSConfig, probarConexionFacturaOS } from "@/lib/facturaos";

export function FacturaOSConfigCard() {
  const [apiUrl, setApiUrl] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<"idle" | "ok" | "error">("idle");
  const [details, setDetails] = useState<any>(null);

  useEffect(() => {
    const cfg = getFacturaOSConfig();
    setApiUrl(cfg.apiUrl);
    setApiKey(cfg.apiKey);
  }, []);

  const handleProbar = async () => {
    setLoading(true);
    try {
      const res = await probarConexionFacturaOS(apiUrl, apiKey);
      setStatus("ok");
      setDetails(res.establishment);
      alert(`¡Conectado exitosamente con ${res.establishment.name}!`);
    } catch (err: any) {
      setStatus("error");
      alert(err.message || "Error al conectar con FacturaOS");
    } finally {
      setLoading(false);
    }
  };

  const handleGuardar = () => {
    saveFacturaOSConfig(apiUrl, apiKey);
    alert("¡Credenciales de FacturaOS guardadas!");
  };

  return (
    <Card className="border-indigo-500/30 bg-gradient-to-br from-indigo-50/20 via-white to-slate-50/50">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-indigo-600/10 text-indigo-600 flex items-center justify-center">
            <KeyRound className="h-5 w-5" />
          </div>
          <div>
            <CardTitle className="text-base font-bold">Facturación Electrónica (FacturaOS)</CardTitle>
            <CardDescription className="text-xs">Conexión con Ministerio de Hacienda Costa Rica (v4.4)</CardDescription>
          </div>
        </div>

        <div>
          {status === "ok" ? (
            <Badge className="bg-emerald-600 text-white font-bold gap-1 text-xs">
              <CheckCircle2 className="h-3 w-3" /> Conectado
            </Badge>
          ) : status === "error" ? (
            <Badge variant="destructive" className="font-bold gap-1 text-xs">
              <AlertCircle className="h-3 w-3" /> Sin Conexión
            </Badge>
          ) : (
            <Badge variant="outline" className="text-slate-600 border-slate-300 gap-1 text-xs">
              <ShieldCheck className="h-3 w-3 text-indigo-600" /> Bóveda FacturaOS
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4 pt-0">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1">
            <Label className="text-xs font-bold text-slate-700">URL del Servidor FacturaOS</Label>
            <Input
              value={apiUrl}
              onChange={(e) => setApiUrl(e.target.value)}
              className="font-mono text-xs"
              placeholder="http://localhost:3000/api/v1/invoices"
            />
          </div>

          <div className="space-y-1">
            <Label className="text-xs font-bold text-slate-700">Clave API Secreta (API Key)</Label>
            <div className="relative">
              <Input
                type={showKey ? "text" : "password"}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="font-mono text-xs pr-10"
                placeholder="fct_live_..."
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
              >
                {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
        </div>

        {details && (
          <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-900">
            <strong>Vinculado a:</strong> {details.name} (Cédula: {details.legalId}) | Ambiente: {details.environment}
          </div>
        )}

        <div className="flex items-center justify-between pt-2 border-t">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleProbar}
            disabled={loading}
            className="text-indigo-700 border-indigo-200 gap-1.5"
          >
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Zap className="h-3.5 w-3.5 text-amber-500 fill-amber-500" />}
            {loading ? "Probando..." : "⚡ Probar Conexión con FacturaOS"}
          </Button>

          <Button type="button" size="sm" onClick={handleGuardar} className="bg-indigo-600 text-white font-bold">
            Guardar Configuración
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
```

---

### PASO 3: Cómo usarlo en tu pantalla de Configuración y de Cobro

#### En la pantalla de Ajustes de tu nueva app:
Solo importas la tarjeta y la colocas donde quieras:
```tsx
import { FacturaOSConfigCard } from "@/components/FacturaOSConfigCard";

export function PantallaConfiguracion() {
  return (
    <div className="space-y-6">
      <h2>Ajustes del Sistema</h2>
      {/* Tu tarjeta de FacturaOS lista: */}
      <FacturaOSConfigCard />
    </div>
  );
}
```

#### En tu botón de Cobrar (POS / Caja / Checkout):
```tsx
import { emitirFactura } from "@/lib/facturaos";

async function handleCobrar() {
  try {
    const factura = await emitirFactura({
      monto: 25000,
      detalle: "Almuerzo Ejecutivo con Bebida",
      metodo: "tarjeta", // "efectivo" | "tarjeta" | "sinpe"
      cliente: {
        idNumber: "115000222",
        name: "María Fernández",
        email: "maria@correo.com",
      },
    });

    console.log("¡Factura aprobada por Hacienda!");
    console.log("Clave oficial:", factura.clave);
    console.log("Consecutivo:", factura.consecutiveNumber);

    // Abrir o imprimir el PDF oficial con código QR
    window.open(factura.pdfUrl, "_blank");

  } catch (error: any) {
    alert("Error al facturar: " + error.message);
  }
}
```

---

## 📋 Resumen Checklist (Para no equivocarse)

| Paso | ¿Qué haces? | ¿Dónde? |
| :--- | :--- | :--- |
| **1** | Registrar la empresa y subir llaves `.p12` | En FacturaOS (`http://localhost:3000/admin`) |
| **2** | Copiar `facturaos.ts` y `FacturaOSConfigCard.tsx` | En la carpeta `src/` de tu nueva app |
| **3** | Pegar el API Key en la pantalla de Configuración | En la nueva app |
| **4** | Presionar **"⚡ Probar Conexión"** | En la nueva app (debe salir 🟢 Conectado) |
| **5** | Llamar `emitirFactura(...)` al cobrar | En el botón de cobro de tu nueva app |

---

## 🛡️ Preguntas Frecuentes

**¿Qué pasa si tengo 20 apps distintas?**  
Cada una tiene su propio API Key. Ninguna ve las facturas de la otra. Todo está blindado en FacturaOS.

**¿Y si Hacienda cambia de versión (ej: a v4.5)?**  
Tus 20 apps satélites siguen funcionando exactamente igual sin cambiarles ni una sola línea de código. Solo se actualiza FacturaOS.
