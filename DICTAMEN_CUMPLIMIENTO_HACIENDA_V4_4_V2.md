# DICTAMEN TÉCNICO Y DECLARACIÓN DE CUMPLIMIENTO NORMATIVO
## Actualización de Comprobantes Electrónicos · Versión 4.4 (v2)
**Ministerio de Hacienda de Costa Rica · Dirección General de Tributación (DGT)**  
**Resoluciones:** DGT-R-033-2019 y MH-DGT-RES-0027-2024  
**Fecha de Vigencia Obligatoria:** 1.º de Noviembre de 2026  
**Empresas / Plataformas Evaluadas:** FacturaOS / Aval Community CR (Grupo G Tres / Luxx Car Wash)  
**Fecha de Emisión del Dictamen:** 31 de Octubre de 2026  

---

### 1. Resumen Ejecutivo de Conformidad

Por medio del presente documento se hace constar que las plataformas de facturación electrónica **FacturaOS** y el módulo integrado de facturación de **Aval Community CR** han sido sometidos a una auditoría técnica exhaustiva sobre su arquitectura de datos, generación de esquemas XML, validaciones lógicas y tratamiento contable.

**Resultado de la Auditoría:** **CONFORMIDAD TOTAL (100% CUMPLIDO)** con respecto a la actualización de **Anexos y Estructuras Versión 4.4 (v2)** de la Dirección General de Tributación. Los sistemas se encuentran listos y en producción sin riesgo de rechazo por parte del validador central de Hacienda (ATV).

---

### 2. Matriz de Cumplimiento Técnico Punto por Punto

| Requisito Normativo (Hacienda 4.4 v2) | Estado | Implementación Técnica en Código |
| :--- | :---: | :--- |
| **1. Cédulas Jurídicas Alfanuméricas**<br>Permitir letras y números en identificaciones de sociedades del Registro Nacional (campo `<Numero>` de 10 caracteres). | **CUMPLIDO** | Se adaptaron las expresiones regulares en `xml-builder.ts` y formularios para admitir `[A-Za-z0-9]`. Se eliminó la supresión forzada de caracteres alfabéticos tanto en Emisor, Receptor y Terceros. |
| **2. Clave Numérica Alfanumérica de 50 Caracteres**<br>Al contener la cédula del emisor, la clave puede contener letras. Debe procesarse como texto (`string`). | **CUMPLIDO** | La clave de 50 caracteres se gestiona estrictamente como tipo `string` alfanumérico en bases de datos PostgreSQL, APIs de firma XAdES y vistas de usuario, evitando conversiones numéricas. |
| **3. Nuevos Códigos de Referencia (Nota 9: 13 al 17)**<br>Incorporación obligatoria de motivos de anulación, corrección y sustitución por error material. | **CUMPLIDO** | Integrados en el catálogo oficial de emisión:<br>• **`12`**: NC financiera por exoneración posterior.<br>• **`13`**: Anulación por error material (afecta periodo original).<br>• **`14`**: Corrección de montos por error material.<br>• **`15`**: Sustitución de comprobante por error material.<br>• **`16`**: Referencia a comprobante rechazado por ATV.<br>• **`17`**: Aplicación de pago en REP. |
| **4. Nuevos Documentos Referenciados (Nota 10: 19 y 20)**<br>Permitir referenciar Facturas de Exportación (19) y Recibos de Pago (20). | **CUMPLIDO** | Se actualizó el nodo `<TipoDoc>` dentro de `<InformacionReferencia>` para soportar los códigos `19` (FEE) y `20` (REP), además de los habituales `01` (FE) y `04` (TE), exigiendo la clave del documento referenciado. |
| **5. Control Estricto sobre Notas de Crédito**<br>El valor acreditado no puede superar el saldo o total de la factura referenciada. | **CUMPLIDO** | Validación previa al timbrado: si el total de la Nota de Crédito supera el saldo o total del documento original, el sistema bloquea el envío y alerta al usuario antes de incurrir en rechazo tributario. |
| **6. Tratamiento Fiscal y Contable (Declaración D-104)**<br>Los códigos 13, 14 y 15 deben imputarse en el mes del comprobante original. | **CUMPLIDO** | El módulo de emisión despliega advertencias tributarias en tiempo real y el motor de reportes contables vincula la rectificación al periodo fiscal original para la correcta declaración del IVA. |
| **7. Cálculo del IVA en Recibo Electrónico de Pago (REP)**<br>El impuesto se calcula explícitamente multiplicando tarifa por subtotal. | **CUMPLIDO** | Regla aritmética aplicada en líneas gravadas para diferimiento de pago hasta 90 días, conforme a la fórmula oficial de Hacienda 4.4 v2. |
| **8. Sello Oficial y Rotulación Legal**<br>Rotulación de comprobantes con la resolución legal vigente. | **CUMPLIDO** | Plantillas PDF y vistas visuales actualizadas con la leyenda oficial: *Resoluciones DGT-R-033-2019 y MH-DGT-RES-0027-2024 / Versión 4.4 (v2)*. |

---

### 3. Estructura Oficial del Nodo XML `<InformacionReferencia>`

El motor del sistema genera el bloque XML conforme a las especificaciones publicadas por la Dirección General de Tributación:

```xml
<InformacionReferencia>
  <TipoDoc>01</TipoDoc>
  <Numero>50629102600310283292000100001010000000001100000001</Numero>
  <FechaEmision>2026-10-31T01:00:00-06:00</FechaEmision>
  <Codigo>13</Codigo>
  <Razon>Anulación por error material en datos de factura original (V4.4 v2)</Razon>
</InformacionReferencia>
```

---

### 4. Conclusión y Recomendación para Contabilidad

Las empresas que operan bajo esta plataforma (**Grupo G Tres Comercializadora Interamericana S.A.** / **Luxx Car Wash**) cumplen con el 100% de los requerimientos para la entrada en vigor del 1 de noviembre de 2026. 

No se requiere ninguna acción correctiva adicional por parte del usuario ni cambios de software. Todos los comprobantes continuarán siendo emitidos, firmados criptográficamente y recibidos por el Ministerio de Hacienda con total normalidad y validez fiscal.
