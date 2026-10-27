# Guía Operativa y Tributaria: Facturación Electrónica Multi-Caja
## Sociedad: Barberías BOSS Limitada
### Líneas de Negocio: Luxx Car Wash & AvalCar

---

## 1. Datos Fiscales de la Empresa ante Ministerio de Hacienda

| Parámetro | Valor Registrado en Hacienda |
| :--- | :--- |
| **Razón Social Legal** | **Barberías BOSS Limitada** |
| **Cédula Jurídica** | **3-102-832920** (Tipo 02) |
| **Régimen Tributario** | Régimen Tradicional / General |
| **Administración Tributaria** | Heredia |
| **Entorno de Facturación** | **PRODUCCIÓN (Oficial Hacienda CR)** |
| **Usuario ATV API** | `cpf-04-0226-0544@prod.comprobanteselectronicos.go.cr` |
| **PIN Llave Criptográfica** | `2026` |
| **Archivo Criptográfico** | `Download_certificado.p12` |

---

## 2. Estructura de Cajas y Actividades Económicas

Para cumplir con la normativa tributaria del Ministerio de Hacienda de Costa Rica y mantener total orden contable y financiero entre ambos negocios sin mezclar ingresos, se configuraron dos terminales de cobro independientes bajo la misma personería jurídica:

```
                              ┌────────────────────────────────────────┐
                              │  Sociedad: Barberías BOSS Limitada     │
                              │  Cédula: 3-102-832920                  │
                              └──────────────────┬─────────────────────┘
                                                 │
                        ┌────────────────────────┴────────────────────────┐
                        ▼                                                 ▼
             ┌─────────────────────┐                           ┌─────────────────────┐
             │      CAJA 1         │                           │      CAJA 2         │
             │   Luxx Car Wash     │                           │      AvalCar        │
             ├─────────────────────┤                           ├─────────────────────┤
             │ Sucursal: 001       │                           │ Sucursal: 002 (o 001)│
             │ Terminal: 00001     │                           │ Terminal: 00002     │
             │ Actividad: 452001   │                           │ Actividad: 829900   │
             │ Lavado y Mecánica   │                           │ Servicios y Avalúos │
             └─────────────────────┘                           └─────────────────────┘
```

### Detalle de cada Caja:

### 🔹 Caja 1: Luxx Car Wash
* **Punto de Venta / Terminal:** `00001`
* **Código de Actividad Económica (CIIU):** `452001` — *Mantenimiento, diagnóstico y reparación de vehículos automotores (Car Wash / Lavado).*
* **Prefijo Consecutivo Hacienda:** `...00001...`
* **Numeración Consecutiva:** Continúa desde el consecutivo del sistema anterior (ejemplo: si la última emitida fue `#564`, FacturaOS continuará en `#565`).

### 🔹 Caja 2: AvalCar
* **Punto de Venta / Terminal:** `00002`
* **Código de Actividad Económica (CIIU):** `829900` — *Otras actividades de servicios de apoyo a las empresas n.c.p. (Servicios y Avalúos).*
* **Prefijo Consecutivo Hacienda:** `...00002...`
* **Numeración Consecutiva:** Comienza desde **`1`** (`FE: #1`, `TE: #1`), al ser una caja nueva oficial.

---

## 3. Factura Electrónica (FE) vs Tiquete Electrónico (TE)

Ambas cajas pueden emitir ambos comprobantes de acuerdo con las necesidades del cliente:

| Tipo de Comprobante | Código Hacienda | ¿Cuándo se utiliza? | Requisitos del Cliente |
| :--- | :---: | :--- | :--- |
| **Factura Electrónica (FE)** | `01` | Cuando el cliente solicita crédito fiscal para deducir gastos o IVA en su declaración. | Requiere Cédula (Física, Jurídica o DIMEX), Nombre fiscal y Correo Electrónico. |
| **Tiquete Electrónico (TE)** | `04` | Ventas al mostrador a consumidores finales (lavado express, servicios particulares). | No requiere datos fiscales del cliente. Se emite a "Consumidor Final" al instante. |

---

## 4. Beneficios y Trazabilidad para el Contador

> [!NOTE] 
> **¿Por qué este esquema es ideal para el Contador de la empresa?**
> Hacienda exige en la **Declaración Mensual D-104 (IVA)** desglosar los ingresos y el débito fiscal por cada código de actividad económica registrado.

1. **Separación Automática en el XML:**
   Cada factura y tiquete emitido lleva en su XML ante Hacienda la etiqueta `<CodigoActividad>` (`452001` para lavacar y `829900` para avalcar). El contador no tiene que clasificar comprobantes a mano.
2. **Trazabilidad por Consecutivo:**
   El número consecutivo oficial de 20 dígitos identifica de inmediato a qué negocio corresponde cada venta:
   - Factura Luxx Car Wash: `0010000101XXXXXXXXXX` (Caja 00001)
   - Factura AvalCar: `0010000201XXXXXXXXXX` (Caja 00002)
3. **Módulo de Reportes para el Contador:**
   En FacturaOS, el contador puede acceder a la sección **Reportes Contador** para:
   - Filtrar y exportar a Excel las ventas de cada caja por separado.
   - Ver el IVA cobrado (13%) agrupado por actividad económica listo para la **D-104**.
   - Descargar el consolidado mensual de la sociedad `3-102-832920`.

---

## 5. Instrucciones Rápidas para los Cajeros y Operadores

1. **Al ingresar al sistema:**
   Seleccionar la caja correspondiente antes de cobrar (**Caja 1 - Luxx Car Wash** o **Caja 2 - AvalCar**).
2. **Si el cliente pide factura con cédula:**
   - Seleccionar tipo **Factura Electrónica**.
   - Digitar la cédula del cliente (el sistema autocompleta el nombre desde el padrón del Registro Nacional).
   - Ingresar el correo del cliente y dar clic en **Emitir Factura**.
3. **Si el cliente paga y no requiere factura con datos:**
   - Seleccionar tipo **Tiquete Electrónico**.
   - Cobrar en efectivo, tarjeta o Sinpe Móvil y dar clic en **Emitir Tiquete**.
