# 🔌 GUÍA DE INTEGRACIÓN: FACTURIOCR PRO CON NEXUSSPORT Y OTRAS APPS

Este documento explica en detalle cómo conectar **NexusSport** (y cualquier otra aplicación web, móvil, e-commerce o sistema POS de tu empresa) con el motor de facturación electrónica **Facturio PRO** para emitir comprobantes de forma automática, desatendida y en tiempo real ante el Ministerio de Hacienda de Costa Rica (v4.4 / v4.3).

---

## 🏗️ 1. Arquitectura General de Integración

```
┌─────────────────────────────────────────────────────────────┐
│               TUS APLICACIONES EXTERNAS                     │
│  • NexusSport (Web / App Móvil de Membresías)              │
│  • Tienda en Línea / E-Commerce                            │
│  • Sistema de Punto de Venta (POS)                         │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               │ HTTPS POST /api/invoices/emit
                               │ Header: Authorization Bearer <API_KEY>
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                    FACTURIO PRO API                         │
│  1. Autentica la petición (API Key o Token)                 │
│  2. Obtiene Sucursal, Terminal y Próximo Consecutivo (Cajas)│
│  3. Construye el XML oficial v4.4                           │
│  4. Firma digitalmente con Llave Criptográfica (.p12)       │
│  5. Envía al API de Recepción de Hacienda                   │
│  6. Guarda registro, XML firmado y estado en Supabase       │
│  7. Genera el PDF y envía correo al cliente                 │
└──────────────────────────────┬──────────────────────────────┘
                               │
                 ┌─────────────┴─────────────┐
                 ▼                           ▼
    ┌─────────────────────────┐ ┌─────────────────────────┐
    │  MINISTERIO DE HACIENDA │ │       SUPABASE BD       │
    │  Responde: Aceptada     │ │  Guarda en tabla:       │
    │  (o Rechazada con error)│ │  invoices, cash_reg...  │
    └─────────────────────────┘ └─────────────────────────┘
```

---

## ⚡ 2. Métodos de Integración Disponibles

### Método 1: API REST mediante HTTP POST (Recomendado)
NexusSport realiza una petición `POST` en formato JSON en el momento exacto en que se procesa un pago (pasarela de tarjeta, SINPE Móvil o efectivo).

#### URL del Endpoint:
```http
POST https://tu-dominio-facturio.com/api/v1/invoices/emit
```

#### Headers Obligatorios:
```http
Content-Type: application/json
Authorization: Bearer fct_live_grupo_g3_secret_key_xxxx
X-Environment: staging  # o "produccion"
```

#### Payload (Cuerpo de la Petición que envía NexusSport):
```json
{
  "docType": "01",
  "branchCode": "001",
  "terminalCode": "00001",
  "paymentMethod": "02",
  "saleCondition": "01",
  "currency": "CRC",
  "client": {
    "idType": "01",
    "idNumber": "114340648",
    "name": "Carlos Andrés Mora Jiménez",
    "email": "carlos.mora@correo.cr",
    "phone": "+506 8888-9999",
    "economicActivity": "620101"
  },
  "items": [
    {
      "cabys": "8314100009900",
      "detail": "Membresía Mensual NexusSport - Gimnasio & Crossfit",
      "qty": 1,
      "unitPrice": 25000,
      "ivaRate": 13,
      "unit": "Sp"
    }
  ],
  "notes": "Cobro automático recurrente mensual - Membresía VIP"
}
```

#### Tipos de Documentos (`docType`):
* `"01"`: **Factura Electrónica (FE)** — Requiere cédula y nombre del receptor. Otorga crédito fiscal.
* `"04"`: **Tiquete Electrónico (TE)** — Venta rápida a consumidor final. Cédula opcional.
* `"03"`: **Nota de Crédito (NC)** — Anulación o descuento sobre una factura previa (requiere `referenceClave`).
* `"02"`: **Nota de Débito (ND)** — Ajuste hacia arriba sobre una factura previa.

#### Respuesta Inmediata que recibe NexusSport:
```json
{
  "success": true,
  "status": "aceptada",
  "consecutiveNumber": "FE-00100001010000000045",
  "clave": "50615092600310148389900100001010000000045199999999",
  "issueDate": "2026-09-15T08:30:00-06:00",
  "total": 28250.00,
  "tax": 3250.00,
  "subtotal": 25000.00,
  "xmlUrl": "https://api.tudominio.com/storage/v1/object/public/xmls/506...xml",
  "pdfUrl": "https://api.tudominio.com/invoices/506.../pdf",
  "haciendaResponse": {
    "indEstado": "aceptado",
    "mensaje": "Comprobante electrónico aceptado por la DGT"
  }
}
```

---

### Método 2: Cola de Facturación Asíncrona en Supabase (Cero Código Frontend)

Si **NexusSport** comparte la misma base de datos de Supabase con Facturio PRO:

1. **NexusSport no necesita llamar a Hacienda directamente.** Simplemente inserta una fila en una tabla de cola:
```sql
INSERT INTO public.invoice_queue (
  order_id,
  client_id_number,
  client_name,
  client_email,
  total,
  items_json,
  status
) VALUES (
  'nx-ord-9842',
  '114340648',
  'Carlos Mora',
  'carlos@correo.cr',
  28250,
  '[{"cabys": "8314100009900", "detail": "Membresía", "price": 25000, "iva": 13}]',
  'pending'
);
```
2. Un **Postgres Trigger** o una **Supabase Edge Function** se dispara automáticamente al detectar la nueva fila, procesa la factura ante Hacienda y actualiza el estado a `facturado` con la clave y consecutivo oficial.
3. NexusSport consulta esa fila y sabe de inmediato si la factura ya está lista.

---

## 💻 3. Ejemplos de Implementación en NexusSport

### Ejemplo en Node.js / TypeScript / React / Next.js:
```typescript
// services/billing.ts en NexusSport
export async function emitirFacturaNexus(orderData: any) {
  const response = await fetch("https://facturio.tuempresa.cr/api/v1/invoices/emit", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${process.env.FACTURIO_API_KEY}`,
    },
    body: JSON.stringify({
      docType: orderData.requiereFacturaCredito ? "01" : "04",
      branchCode: "001",
      terminalCode: "00001",
      paymentMethod: "02", // Tarjeta
      currency: "CRC",
      client: {
        idType: orderData.clientCedula.length === 10 ? "02" : "01",
        idNumber: orderData.clientCedula,
        name: orderData.clientNombre,
        email: orderData.clientEmail,
      },
      items: orderData.items.map((item: any) => ({
        cabys: item.cabysCode, // ej: 8314100009900
        detail: item.descripcion,
        qty: item.cantidad,
        unitPrice: item.precio,
        ivaRate: 13,
      })),
    }),
  });

  const data = await response.json();
  if (!data.success) {
    throw new Error(`Error en facturación: ${data.message}`);
  }
  return data; // Contiene clave, consecutivo, PDF y XML
}
```

### Ejemplo en PHP / Laravel:
```php
$response = Http::withToken(config('services.facturio.key'))
    ->post('https://facturio.tuempresa.cr/api/v1/invoices/emit', [
        'docType' => '01',
        'branchCode' => '001',
        'terminalCode' => '00001',
        'paymentMethod' => '02',
        'currency' => 'CRC',
        'client' => [
            'idType' => '01',
            'idNumber' => $user->cedula,
            'name' => $user->name,
            'email' => $user->email,
        ],
        'items' => [
            [
                'cabys' => '8314100009900',
                'detail' => 'Mensualidad Gimnasio NexusSport',
                'qty' => 1,
                'unitPrice' => 25000,
                'ivaRate' => 13
            ]
        ]
    ]);

$factura = $response->json();
$order->update([
    'hacienda_clave' => $factura['clave'],
    'consecutivo' => $factura['consecutiveNumber'],
    'factura_pdf' => $factura['pdfUrl']
]);
```

---

## 🔒 4. Seguridad y Buenas Prácticas

1. **Gestión de API Keys:**
   * Nunca colocar la API Key de Facturio en el frontend o aplicación móvil directamente; las peticiones deben salir siempre desde el backend/servidor de NexusSport para proteger tus credenciales.
2. **Idempotencia:**
   * Incluir siempre un identificador único de orden de NexusSport (`orderId` o `externalId`). Si se pierde la conexión de red y NexusSport reintenta la petición, Facturio PRO no duplicará la factura, sino que retornará el comprobante ya emitido previamente.
3. **Ambiente de Pruebas (Staging):**
   * Durante el desarrollo de la conexión de NexusSport, utilizar el header `X-Environment: staging` para que todas las pruebas se envíen al Sandbox de Tributación sin efecto fiscal.
