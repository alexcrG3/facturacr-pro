# Roadmap de Mejoras Futuras: FacturaOS (Normativa Hacienda CR v4.4)
### Inspirado en las mejores prácticas de la comunidad y el SDK de `DojoCodingLabs/hacienda-cr`

---

## 📌 Contexto
FacturaOS se encuentra actualmente **100% operativo y en cumplimiento con la normativa v4.4 (v2)** del Ministerio de Hacienda obligatoria a partir del **1.º de noviembre de 2026** (Factura `01`, Tiquete `04`, Notas de Crédito `03` y Débito `02`, claves de 50 dígitos, referencias `13-16` y cédulas alfanuméricas).

Este documento recopila las **ampliaciones estratégicas** que podemos incorporar en fases posteriores para transformar FacturaOS en el ERP tributario más avanzado de Costa Rica.

---

## 🚀 Módulos y Funcionalidades para Próximas Versiones

### 1. Régimen Especial de Bienes Usados (`FactorCalculoIVA`)
* **¿Qué es?** 
  En la venta de vehículos usados, consignaciones o repuestos de segunda mano, la Ley del IVA permite calcular el impuesto **únicamente sobre el margen comercial (utilidad)** y no sobre el precio total del vehículo.
* **Impacto para AvalCar:**
  Si AvalCar comercializa o intermedia vehículos usados, este cálculo evita que el comprador y el vendedor paguen un 13% sobre el valor total del carro, liquidando el IVA exacto según el factor de margen.
* **Implementación técnica:**
  Incorporar en las líneas de factura el campo `<FactorCalculoIVA>` en el nodo `<Impuesto>` (tarifa código `08` factorizada).

---

### 2. Aceptación Automatizada de Facturas de Proveedores (Mensaje Receptor - MR v4.4)
* **¿Qué es?** 
  Cuando un proveedor le factura a la empresa (repuestos, insumos, alquiler, electricidad), Hacienda exige que el contribuyente "acepte" la factura para poder deducir el gasto y el crédito de IVA en su declaración D-104.
* **Funcionalidad en FacturaOS:**
  - Agregar un botón **"Aceptar Factura"** en el módulo de *Descargar de Gmail* o en la lista de gastos.
  - Generar automáticamente el XML firmado del mensaje receptor:
    - `05`: Aceptación Total
    - `06`: Aceptación Parcial
    - `07`: Rechazo
  - Transmitir a Hacienda y guardar el acuse de aprobación.

---

### 3. Factura Electrónica de Compra (FEC - Tipo 08)
* **¿Qué es?** 
  Comprobante que la empresa emite a sí misma cuando le compra bienes o servicios a una persona física o pequeño productor que **no está inscrito en el régimen tradicional** (por ejemplo: compras a agricultores, artesanos o servicios informales).
* **Beneficio:** 
  Permite que el gasto sea deducible de renta aunque el vendedor no tenga sistema de factura electrónica.

---

### 4. Factura Electrónica de Exportación (FEE - Tipo 09)
* **¿Qué es?** 
  Factura oficial para servicios o productos vendidos a clientes fuera de Costa Rica (clientes en EE.UU., Panamá, Europa, etc.).
* **Beneficio:** 
  Venta 100% exenta de IVA por principio de territorialidad, con validación de partidas arancelarias o exportación de servicios intangibles.

---

### 5. Recibo Electrónico de Pago (REP - Tipo 10)
* **¿Qué es?** 
  Comprobante electrónico oficial para registrar abonos o cancelaciones de facturas emitidas a **crédito** (Condición de venta `02 - Crédito`).
* **Relación v4.4:**
  Utiliza el nuevo código de referencia oficial **`17 - Aplicación de pago en REP`** para vincular el abono directamente a la clave de la factura pendiente.

---

### 6. Mecanismo de Reintentos con Backoff Exponencial y Cola de Contingencia
* **¿Qué es?** 
  A veces los servidores del Ministerio de Hacienda se saturan o caen temporalmente (error 500 o 504).
* **Mejora:**
  Implementar una cola en segundo plano (background worker) que reintente la transmisión cada 30 segundos, 2 minutos y 5 minutos, emitiendo mientras tanto el comprobante en estado *Pendiente de Envío (Contingencia)* sin detener la caja del negocio.

---

## 📊 Matriz de Priorización Sugerida

| Módulo / Mejora | Prioridad | Complejidad | Negocio Beneficiado |
| :--- | :---: | :---: | :--- |
| **Aceptación de Facturas de Gastos (Mensaje Receptor)** | 🟡 Alta | Media | Luxx Car Wash, AvalCar y todas las empresas |
| **Bienes Usados (`FactorCalculoIVA`)** | 🟡 Alta | Baja | AvalCar (compra/venta de vehículos) |
| **Reintentos Automáticos ante caídas de Hacienda** | 🟢 Media | Media | Todas las cajas y puntos de venta |
| **Factura de Compra (FEC 08)** | ⚪ Opcional | Baja | Negocios con compras a régimen simplificado |
| **Factura de Exportación (FEE 09)** | ⚪ Opcional | Baja | Clientes internacionales |
| **Recibos Electrónicos de Pago (REP 10)** | ⚪ Opcional | Media | Operaciones de crédito a 30/60 días |
