# CAMBIOS OBLIGATORIOS MINISTERIO DE HACIENDA COSTA RICA
## Versión 4.4 (v2) de Comprobantes Electrónicos — Vigencia: 1 de Noviembre de 2026

Este documento detalla la normativa técnica y tributaria emitida por la Dirección General de Tributación (DGT) del Ministerio de Hacienda de Costa Rica, de acatamiento obligatorio a partir del **1.º de noviembre de 2026**, así como su implementación en **Facturio PRO**.

---

### 1. Resumen Ejecutivo de la Normativa

El Ministerio de Hacienda actualizó los Anexos y Estructuras de Comprobantes Electrónicos (versión 4.4 v2) con el propósito de:
1. Fortalecer la **trazabilidad fiscal** entre comprobantes originales y sus notas de corrección.
2. Distinguir formalmente entre **devoluciones comerciales corrientes** y **anulaciones por error material**.
3. Admitir las **nuevas cédulas jurídicas alfanuméricas** emitidas por el Registro Nacional.
4. Mejorar el control sobre los **Recibos Electrónicos de Pago (REP)** en operaciones a crédito.

---

### 2. Nuevos Códigos de Referencia Oficiales (Notas 9 y 10)

Al emitir **Notas de Crédito (03)**, **Notas de Débito (02)** o **Facturas de Sustitución**, se incorporan los siguientes códigos en el nodo `<Codigo>` de `<InformacionReferencia>`:

| Código | Denominación Oficial | Aplicación y Uso |
| :---: | :--- | :--- |
| **`13`** | **Anulación por error material** | Anula totalmente el comprobante por un error sustancial o evidente (datos del receptor, descripción, etc.). |
| **`14`** | **Corrección de montos por error material** | Modifica importes, cantidades o precios producto de un error de digitación o cálculo. |
| **`15`** | **Sustitución de comprobante por error material** | Emite un nuevo comprobante en reemplazo directo del documento erróneo. |
| **`16`** | **Referencia a comprobante rechazado** | Vincula un nuevo comprobante con la clave del documento previamente rechazado por ATV. |
| **`17`** | **Aplicación de pago en REP** | Uso exclusivo para imputación de abonos o cancelaciones en Recibos Electrónicos de Pago. |
| **`19`** | **Factura Electrónica de Exportación (FEE)** | Referencia expresa a comprobantes tipo 09 de exportación. |
| **`20`** | **Recibo Electrónico de Pago (REP)** | Referencia expresa a comprobantes tipo 10 de pago. |

#### Códigos Tradicionales que se Mantienen:
* **`01`**: Anula documento de referencia (Devolución comercial ordinaria).
* **`02`**: Corrige texto del documento de referencia.
* **`03`**: Corrige montos (Ajuste comercial ordinario).
* **`04`**: Referencia a otro documento.
* **`05`**: Sustituye comprobante provisional por contingencia.
* **`99`**: Otros.

---

### 3. Impacto Contable y Fiscal Crítico (Declaración D-104 del IVA)

> [!WARNING]
> **REGLA TRIBUTARIA FUNDAMENTAL (Códigos 13, 14 y 15):**
> A diferencia de las notas de crédito ordinarias por devolución comercial (código `01`) cuyo efecto se aplica en el mes de emisión de la nota, **las notas emitidas bajo los códigos `13`, `14` y `15` por error material deben reflejar su efecto contable y tributario en el periodo fiscal en que se emitió el comprobante original**.

* **Ejemplo práctico:** Si en noviembre de 2026 se emite una Nota de Crédito con código `13` para anular una factura emitida en agosto de 2026, el débito fiscal se elimina de la declaración de **agosto**, lo que puede requerir la presentación de una declaración rectificativa del IVA (D-104) de dicho periodo.

---

### 4. Cédulas Jurídicas Alfanuméricas

Debido a que el Registro Nacional agotó la numeración tradicional de 10 dígitos numéricos para personas jurídicas:
* Los esquemas XSD y validadores de Hacienda admiten **caracteres alfanuméricos** en el campo `<Numero>` del nodo `<Identificacion>` tanto para el Emisor como para el Receptor.
* Los sistemas informáticos ya no deben filtrar ni eliminar caracteres alfabéticos en la cédula jurídica.

---

### 5. Estructura XML Oficial Implementada

En cumplimiento de la norma, la aplicación genera el nodo `<InformacionReferencia>` dentro del XML firmado:

```xml
<InformacionReferencia>
  <TipoDoc>01</TipoDoc>
  <Numero>50601012600310148389900100001010000000001100000001</Numero>
  <FechaEmision>2026-10-15T08:30:00-06:00</FechaEmision>
  <Codigo>13</Codigo>
  <Razon>Anulación por error material en datos de factura original</Razon>
</InformacionReferencia>
```

---

### 6. Implementación en el Código de Facturio PRO

Los siguientes archivos del sistema fueron actualizados para garantizar compatibilidad total:

1. **`src/lib/hacienda/types.ts`**:
   - Incorporación del tipo `CodigoReferencia` con los códigos `13`, `14`, `15`, `16`, `17`, `19`, `20`.
   - Definición de la interfaz `InformacionReferenciaHacienda`.
   - Integración de `informacionReferencia` dentro del payload de facturas.

2. **`src/lib/hacienda/xml-builder.ts`**:
   - Generación automática del bloque XML `<InformacionReferencia>`.
   - Admisión de números de identificación alfanuméricos en el nodo `<Receptor>`.

3. **`src/lib/taxpayer.ts`**:
   - Adaptación de la consulta pública de contribuyentes para soportar cédulas alfanuméricas (`[^a-zA-Z0-9]`).

4. **`src/routes/app.invoices.new.tsx`**:
   - Actualización del selector `REF_TYPES` con todos los códigos oficiales de Hacienda.
   - Validación obligatoria de la clave de 50 dígitos para Notas de Crédito y Débito.
   - Banner de advertencia tributaria cuando el usuario selecciona códigos de error material (`13`, `14` o `15`).

5. **`src/lib/accounting-reports.ts`**:
   - Extracción de `codigoReferencia`, `numeroReferencia` y `razonReferencia` al parsear XMLs para auditoría contable.

---
*Documento elaborado para GRUPO G TRES COMERCIALIZADORA INTERAMERICANA S.A. — Facturio PRO*
