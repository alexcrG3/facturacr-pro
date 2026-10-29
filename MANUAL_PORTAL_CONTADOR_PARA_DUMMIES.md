# 🏢 MANUAL DEL PORTAL DEL CONTADOR PARA DUMMIES
### *Cómo darle acceso a tu contador para que audite todas tus empresas en 1 pantalla sin riesgo de que toque datos delicados*

---

## 🧐 1. ¿Por qué creamos el Portal del Contador?

Hasta hoy, cuando contratabas a un contador o a un despacho contable externo, ocurrían dos problemas graves:

1. **El Problema de Seguridad:**  
   Para que el contador pudiera ver tus facturas, tenías que darle tu usuario y contraseña de Administrador. Eso es **peligroso**: podía modificar llaves criptográficas de Hacienda, cambiar contraseñas, ver información confidencial o emitir comprobantes por error.
2. **El Problema de la Pérdida de Tiempo (Multi-Empresa):**  
   Si manejas 3 o 5 negocios (por ejemplo: **Luxx Car Wash**, **BarberApp**, **AvalCar**, **Gas Express**), el contador tenía que salir de una cuenta, iniciar sesión en otra, volver a salir, y así sucesivamente. ¡Un dolor de cabeza total!

### 🚀 La Solución:
El **Portal del Contador (`/app/contador`)** es una consola centralizada de despacho:
- El contador entra con su propio correo.
- Ve **todas sus empresas cliente en una sola tabla** con el estado de su declaración D-104 en tiempo real.
- Tiene **Rol Auditor de Solo Lectura**: puede auditar, revisar y descargar paquetes contables en Excel, pero tiene **bloqueada la emisión de facturas y la modificación de configuraciones críticas**.

---

## 🖥️ 2. ¿Cómo se ve la Consola del Despacho?

Cuando entras a **`Portal Despacho`** en el menú lateral, verás:

### A. Los 4 Indicadores Maestros de la Cartera
1. **Ventas Totales Cartera:** La suma de lo que han facturado todas las empresas clientes este mes.
2. **Compras y Gastos Soportados:** Todo el crédito fiscal acumulado de compras.
3. **Clientes con IVA por Pagar:** Cuántas empresas tienen que hacer un pago a Hacienda antes del día 15 (Casilla [140]).
4. **Clientes con Saldo a Favor:** Cuántas empresas acumularon crédito fiscal para el próximo mes (Casilla [141]).

---

## 📋 3. La Tabla Maestra de Clientes

Cada fila representa uno de tus negocios o clientes:

```
┌──────────────────────────────┬──────────────┬──────────────┬──────────────┬─────────────┬────────────────┐
│ EMPRESA / CLIENTE            │ VENTAS       │ COMPRAS      │ ESTADO CCE   │ ESTADO D-104│ ACCIONES       │
├──────────────────────────────┼──────────────┼──────────────┼──────────────┼─────────────┼────────────────┤
│ 🚗 LUXX CAR WASH             │ ₡2,850,000   │ ₡1,120,000   │ 🟢 CCE al día│ 🔴 Paga:    │ [👁️ Auditar]   │
│    Céd: 3-102-832920         │ IVA: ₡370,500│ IVA: ₡145,600│              │    ₡224,900 │ [📊 Excel]     │
│                              │              │              │              │   [Cas. 140]│ [💬 WhatsApp]  │
├──────────────────────────────┼──────────────┼──────────────┼──────────────┼─────────────┼────────────────┤
│ 💈 BarberApp                 │ ₡1,400,000   │ ₡1,850,000   │ 🟡 3 pend.   │ 🟢 A favor: │ [👁️ Auditar]   │
│    Céd: 3-101-554433         │ IVA: ₡182,000│ IVA: ₡240,500│              │     ₡58,500 │ [📊 Excel]     │
│                              │              │              │              │   [Cas. 141]│ [💬 WhatsApp]  │
└──────────────────────────────┴──────────────┴──────────────┴──────────────┴─────────────┴────────────────┘
```

---

## 🖲️ 4. Los 3 Botones de Acción Rápida para el Contador

Al final de cada fila, el contador tiene 3 herramientas que le ahorran horas de trabajo:

### 1. Botón `👁️ Auditar`
- Conmuta la empresa activa al instante.
- Abre directamente **DeclaraHub** con todas las casillas oficiales del D-104 ([101], [110], [114], [121], [130], [131], [140]) listas para comparar y declarar en TRIBU-CR / OVI.

### 2. Botón `📊 Excel`
- Con un solo clic, descarga el archivo de Excel oficial con:
  - Libro de Ventas.
  - Libro de Compras.
  - Detalle por tarifas de IVA (13%, 4%, 2%, 1%, Exentas).
  - Claves de 50 dígitos para conciliación bancaria.

### 3. Botón `💬 WhatsApp al Cliente`
- Genera un mensaje elegante y profesional con los números finales del mes para mandárselo al dueño del negocio por WhatsApp:
  ```text
  👋 Estimado cliente de *LUXX CAR WASH*:
  📋 CIERRE TRIBUTARIO D-104 (PERÍODO 01/10/2026 AL 31/10/2026)
  Cédula: 3-102-832920

  🔹 Facturación Emitida: ₡2,850,000 (112 comprobantes)
  🔹 Débito IVA Recaudado: ₡370,500
  🔸 Compras Soportadas: ₡1,120,000 (34 facturas)
  🔸 Crédito Fiscal Deducible: ₡145,600

  ⚖️ RESULTADO DE LA DECLARACIÓN D-104:
  🔴 MONTO NETO A PAGAR A HACIENDA: ₡224,900 (Plazo: antes del día 15)

  Emitido por su Despacho Contable mediante DeclaraHub.
  ```

---

## 🛡️ 5. Cómo Invitar a tu Contador en 3 Pasos

1. Entra a **`Portal Despacho`** en el menú lateral.
2. Presiona el botón: **`Invitar Contador / Auditor`**.
3. Escribe el nombre del contador y su correo electrónico (ej: `contador@despacho.com`).
4. Presiona **`Enviar Invitación`**.

### ¿Qué puede y qué NO puede hacer el contador?
- ✅ **SÍ PUEDE:** Ver ventas, revisar compras, ver y copiar casillas del D-104, descargar reportes en Excel y enviar avisos de cobro.
- ❌ **NO PUEDE:** Emitir facturas, anular comprobantes, cambiar contraseñas ni tocar tus llaves criptográficas `.p12`.
