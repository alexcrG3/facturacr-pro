# 🏢 MANUAL DEL PORTAL DEL CONTADOR PARA DUMMIES
### *Cómo auditar las diferentes actividades económicas de tu empresa sin mezclar clientes ajenos ni comprometer datos confidenciales*

---

> 🎯 **¿PARA QUÉ SIRVE ESTE MÓDULO?**  
> Es la consola del contador para supervisar en una sola pantalla todas las **actividades económicas de su cliente**, el estado de aceptación de facturas de compras (CCE) y el borrador de declaración mensual D-104 ante Hacienda.
> 
> 🚨 **¿POR QUÉ ES 100% INDISPENSABLE?**  
> 1. **Privacidad y Aislamiento Estricto:** Cada empresa tiene un contador diferente. El contador de **Luxx** NUNCA debe ver a **Gas Express** ni a **Grupo G Tres** porque no son clientes suyos.
> 2. **Multi-Actividad en una misma empresa:** Empresas como **Luxx** tienen múltiples actividades ante Hacienda (Lavado de vehículos, Venta de repuestos, etc.). El contador debe ver cada actividad desglosada y el consolidado de la cédula jurídica para presentar el D-104.
> 3. **Seguridad:** El contador tiene Rol Auditor de solo lectura: no puede alterar configuraciones críticas ni emitir facturas por error.

---

## 🔒 1. La Regla de Oro: Aislamiento Total de Clientes

En Costa Rica, un despacho contable o contador independiente solo debe tener acceso a las empresas que han firmado un contrato de servicios con él.

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                        MAPA DE PRIVACIDAD MULTI-TENANT                                 │
├────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                        │
│   👨‍💼 CONTADOR DE LUXX (Cédula 3-102-832920):                                           │
│   ├── ✅ Actividad 452001: Mantenimiento y Lavado de Vehículos (Luxx Car Wash)         │
│   ├── ✅ Actividad 453001: Comercio de Repuestos y Accesorios (Luxx Repuestos)        │
│   ├── ✅ Consolidado Cédula 3-102-832920 (Total D-104 de Hacienda)                    │
│   └── ❌ BLOQUEADO: Gas Express (Cédula 3-101-443922) -> ¡Tiene otro contador!         │
│   └── ❌ BLOQUEADO: Grupo G Tres (Cédula 3-101-483899) -> ¡Tiene otro contador!       │
│                                                                                        │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

Si el contador entra a **Portal Despacho** mientras está en **Luxx**, el sistema **oculta automáticamente** cualquier empresa con cédula jurídica distinta que no forme parte de su cartera autorizada.

---

## 🚗 2. El Caso Específico de Luxx: ¿Por qué tiene varias actividades?

En el Ministerio de Hacienda (formulario RUT / ATV), una empresa puede inscribir varias **actividades económicas secundarias**:

1. **Actividad Principal (`452001`):** Mantenimiento, lavado y embellecimiento de vehículos automotores (Car Wash).
2. **Actividad Secundaria (`453001`):** Venta al por menor de repuestos, accesorios, lubricantes y suministros para vehículos.

### ¿Qué ve el Contador de Luxx en Pantalla?
En la pestaña **"Desglose por Actividad Económica"**, el contador ve una tabla con cada actividad separada:

| Código Actividad | Nombre Oficial Hacienda | Ventas Netas | IVA Débito (13%) | Compras | Saldo D-104 |
|:---:|---|:---:|:---:|:---:|:---:|
| **`452001`** *(Principal)* | Mantenimiento y Lavado de Vehículos | **₡2,400,000** | +₡312,000 | ₡900,000 | Paga: ₡195,000 |
| **`453001`** *(Secundaria)* | Venta de Repuestos y Accesorios | **₡450,000** | +₡58,500 | ₡220,000 | Paga: ₡29,900 |
| **TOTAL CONSOLIDADO** | **Cédula Jurídica 3-102-832920 (Oficial D-104)** | **₡2,850,000** | **+₡370,500** | **₡1,120,000** | **🔴 Paga: ₡224,900 [Cas. 140]** |

De esta manera, el contador sabe exactamente cuánto facturó el autolavado vs cuánto facturó la venta de repuestos, y cuenta con el número exacto para copiar y pegar en la Casilla [101] del formulario D-104 en el portal TRIBU-CR / OVI de Hacienda.

---

## 🎛️ 3. Modos de Visualización del Portal

En la barra de herramientas superior tienes dos botones para alternar la vista:

1. **`Desglose por Actividad Económica` (Recomendado para Luxx):**  
   Muestra cada una de las líneas de negocio de la empresa con su código CIIU de Hacienda y el total consolidado al pie de la tabla.
2. **`Consolidado Cédula Jurídica`:**  
   Muestra la fila global de la empresa como persona jurídica frente a Hacienda.

---

## 👮 4. Control de Acceso para el SuperAdmin (Alex / Soporte)

Si quien está conectado es el **Super Administrador de la plataforma FacturaOS**:
- En la parte superior derecha del banner de seguridad verá el interruptor:
  - `🛡️ Solo Este Cliente`: Muestra únicamente la empresa activa (modo simulación de contador de cliente).
  - `🌐 Soporte Global`: Permite auditar el estado técnico de todos los inquilinos de la plataforma con fines de mantenimiento.
- Para cualquier otro usuario o contador, el botón global **no existe**: el aislamiento es hermético.

---

## 📲 5. Enviar Resumen al Cliente por WhatsApp en 1 Clic

Al final de cada fila, el contador tiene el botón del avioncito **`Send`**.  
Al hacer clic, se copia automáticamente al portapapeles un mensaje formateado y profesional:

```text
👋 Estimado cliente de SRL 3102832920 (LUXX):
📋 CIERRE TRIBUTARIO D-104 (PERÍODO 01/10/2026 AL 31/10/2026)
Cédula: 3102832920

🔹 Facturación Emitida: ₡2,850,000 (45 comprobantes)
🔹 Débito IVA Recaudado: ₡370,500
🔸 Compras Soportadas: ₡1,120,000 (18 facturas)
🔸 Crédito Fiscal Deducible: ₡145,600
📊 Coeficiente de Prorrata Aplicado: 100.00%

⚖️ RESULTADO DE LA DECLARACIÓN D-104:
🔴 MONTO NETO A PAGAR A HACIENDA: ₡224,900 (Plazo: antes del día 15)

Emitido por su Despacho Contable mediante DeclaraHub.
```

---

*FacturaCR Pro & DeclaraHub — Privacidad, Seguridad y Precisión Tributaria para Costa Rica.*
