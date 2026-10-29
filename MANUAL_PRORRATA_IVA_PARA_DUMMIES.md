# 📊 MANUAL DE LA PRORRATA DEL IVA (PROPORCIONALIDAD) PARA DUMMIES
### *Cómo entender las Casillas [114] y [131] del D-104 en Costa Rica y blindar tu crédito fiscal sin enredos matemáticos*

---

## 🧐 1. ¿Qué diablos es la Prorrata del IVA y por qué Hacienda te la pide?

Imagina que tienes un negocio y este mes pagaste el **recibo de la luz** del local comercial. La factura de la luz vino con **₡130,000 de IVA**.

- Si todo lo que vendes en tu negocio tiene **IVA al 13%**, Hacienda te dice:
  > *"Perfecto, dedúzcase el 100% de esos ₡130,000 de IVA en la Casilla [130]. Usted tiene **Crédito Pleno (100%)**."*

- **PERO**, ¿qué pasa si tu negocio tiene **VENTAS MIXTAS**?
  Por ejemplo:
  - Cobraste servicios al **13% de IVA** (lavado de autos, cortes de barbería, comisiones).
  - Pero también tuviste ventas **EXENTAS DE IVA** (exportaciones de software, venta de vehículos exonerados, alquileres bajo el tope de ley, o servicios médicos).

Hacienda te dice:
> ⚠️ *"Un momento: esa luz del local también sirvió para generar las ventas exentas. Como en las ventas exentas tú no me cobraste IVA, **NO tienes derecho a descontarte todo el IVA de la luz**. Solo puedes descontarte el porcentaje que le corresponde a tus ventas gravadas."*

Ese porcentaje matemático oficial se llama **FACTOR DE PROPORCIONALIDAD O PRORRATA (Art. 30 a 34 Ley 9635)**.

---

## 🧮 2. La Fórmula explicada con Números Reales (₡)

Supongamos los siguientes números de un mes:
- **Ventas Gravadas al 13%:** ₡8,000,000
- **Ventas Exentas (0% IVA):** ₡2,000,000
- **Total de Ventas:** ₡10,000,000

### Paso A: Calcular el Factor de Prorrata (Casilla [114])
$$\text{Factor de Prorrata (\%)} = \frac{\text{Ventas con Derecho a Crédito (₡8M)}}{\text{Total de Ventas (₡10M)}} \times 100 = \mathbf{80.00\%}$$

El sistema te coloca automáticamente **`80.00%`** en la **Casilla [114]**.

### Paso B: Aplicar la Prorrata a tus Compras (Casilla [131])
Si en compras y gastos comunes (alquiler, luz, internet, asesorías) pagaste **₡130,000 de IVA bruto**:
$$\text{Crédito Real Deducible} = ₡130,000 \times 80\% = \mathbf{₡104,000}$$

- **Casilla [130] (Crédito Bruto):** ₡130,000
- **Casilla [131] (Crédito Aplicable tras Prorrata):** **₡104,000** $\leftarrow$ *Este es el monto que realmente te resta del impuesto a pagar*.

### Paso C: ¿Y qué pasa con los ₡26,000 que sobraron?
¡No se pierden! La ley de Costa Rica establece que el IVA que no te puedes deducir en el D-104 se convierte automáticamente en un **Gasto Deducible para el Impuesto sobre la Renta (Declaración Anual D-101)**. DeclaraHub te lo calcula y te lo separa de inmediato.

---

## 🖥️ 3. Cómo se ve en DeclaraHub

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ I. Determinación del Débito Fiscal                                                     │
│ ────────────────────────────────────────────────────────────────────────────────────── │
│ [Casilla 101] Ventas y Servicios Gravados (13%)                           ₡8,000,000   │
│ [Casilla 103] Ventas Exentas / No Sujetas de IVA                          ₡2,000,000   │
│                                                                                        │
│ 🟩 CASILLA [110] TOTAL DÉBITO FISCAL (A)                                  ₡1,040,000   │
│                                                                                        │
│ 🟦 CASILLA [114] COEFICIENTE DE PROPORCIONALIDAD (PRORRATA) [Ventas Mixtas]    80.00%  │
└────────────────────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────────────────────┐
│ II. Determinación del Crédito Fiscal                                                   │
│ ────────────────────────────────────────────────────────────────────────────────────── │
│ [Casilla 121] Compras y Gastos Gravados (Crédito Pleno 13%)               ₡1,000,000   │
│                                                                                        │
│ 🟧 CASILLA [130] TOTAL CRÉDITO FISCAL BRUTO (B)                             ₡130,000   │
│                                                                                        │
│ 🟪 CASILLA [131] CRÉDITO FISCAL POR PROPORCIONALIDAD                        ₡104,000   │
│                  Aplica el 80.00%. Resto (₡26,000) pasa a gasto en Renta.              │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 🔍 4. El Auditor Visual de Proporcionalidad

Debajo de las dos columnas de casillas oficiales, encontrarás una tarjeta interactiva llamada:
**`Auditor de Proporcionalidad y Prorrata del IVA (Art. 30 a 34 Ley 9635)`**

Te muestra 4 tarjetas de diagnóstico instantáneo:
1. **Ventas con Crédito Pleno:** La suma de tus facturas gravadas al 13%, 4%, 2% y 1%.
2. **Ventas Exentas:** Total de facturación exenta o sin derecho a crédito.
3. **Crédito D-104 [Casilla 131]:** El dinero exacto que se le resta a tu IVA mensual.
4. **Gasto en Renta [D-101]:** El IVA no acreditable que te servirá para pagar menos Impuesto sobre la Renta al cierre del período fiscal.

---

## 📋 5. Cómo Presentar la Prorrata en TRIBU-CR / OVI

1. Entras a **DeclaraHub** en el menú de la aplicación.
2. Si el sistema detecta que tuviste ventas exentas, verás la etiqueta ámbar **`Ventas Mixtas Detectadas`**.
3. En el portal de Hacienda:
   - Vas a la **Casilla [114]**: Haces clic en el botón de copiar al lado de `Casilla [114]` en DeclaraHub y pegas el porcentaje (ej. `80.00`).
   - Vas a la **Casilla [131]**: Haces clic en el botón de copiar y pegas el monto en colones (ej. `104000`).
4. **Resumen de WhatsApp:**
   - Si usas el botón **`Copiar Resumen (WhatsApp)`**, el mensaje incluirá el desglose exacto de la prorrata para tu contador:
     ```text
     📊 PRORRATA DEL IVA (PROPORCIONALIDAD):
     • Coeficiente de Prorrata [Casilla 114]: 80.00%
     • Crédito Fiscal Aplicable [Casilla 131]: ₡104,000
     • IVA No Deducible (Gasto en Renta D-101): ₡26,000
     ```

---

## 💡 6. Preguntas Frecuentes

### ¿Qué pasa si en mi negocio NUNCA hago ventas exentas?
El sistema lo detecta al instante y te asigna automáticamente:
- **Casilla [114]:** `100.00%` con distintivo verde **`Crédito Pleno (100%)`**.
- **Casilla [131]:** Equivale exactamente al 100% de tus compras. No pierdes ni un solo colón de IVA deducible.

### ¿Puedo tener problemas con Hacienda si no calculo la prorrata?
Sí. Si vendes exento y te descuentas el 100% del IVA en compras, los algoritmos de Hacienda detectan la discrepancia y emiten una **notificación de cobro retroactivo con recargo por mora del 1% mensual y multas por inexactitud**. Con DeclaraHub estás 100% blindado porque el cálculo sigue fielmente la fórmula legal de la Ley 9635.
