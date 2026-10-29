# 🧠 GUÍA DECLARAHUB & D-104 PARA DUMMIES
### *Cómo entender tus impuestos en Costa Rica, ahorrarte al contador y declarar en 5 minutos sin enredos*

---

## 🌟 1. ¿Qué diablos es DeclaraHub y por qué existe?

Históricamente en Costa Rica, los sistemas de facturación viejos (como GTI / Factura Electrónica CR con su módulo "Q-Declaro") le cobraban a las empresas cuotas mensuales adicionales o las hacían depender 100% de que un contador cobrara caro por sumar facturas a mano en una calculadora.

**DeclaraHub** es el "cerebro contable automático" dentro de tu sistema. Lo que hace es muy simple:
1. Toma **todas las facturas y tiquetes que le cobraste a tus clientes** en el mes.
2. Toma **todas las facturas de gastos que pagaste a tus proveedores** (alquiler, luz, agua, productos, repuestos, etc.).
3. Las mete en la licuadora tributaria de Costa Rica y te dice:
   > *"Vea don/doña: este mes usted recaudó ₡X de IVA, pero pagó ₡Y de IVA en sus gastos. La diferencia que le toca pagarle a Hacienda (o que le queda a favor) es exactamente ₡Z."*
4. Y lo mejor: **te llena las casillas oficiales del formulario D-104 de Hacienda (TRIBU-CR / OVI)** con botones para copiar y pegar en un clic.

---

## 💡 2. El IVA en Costa Rica explicado con Manzanas (101)

Para entender DeclaraHub, solo necesitas entender 3 palabras:

### A. El IVA no es tu plata (Débito Fiscal)
Cuando vendes un producto o servicio por **₡10,000 + 13% de IVA (₡1,300)**, cobras en total **₡11,300**.
- Los **₡10,000** son tuyos (tu ganancia bruta).
- Los **₡1,300** **NUNCA fueron tuyos**; el cliente te los dio para que tú se los guardes y se los entregues al Ministerio de Hacienda el mes siguiente.
- En la pantalla, esto se llama **Columna Verde: Determinación del Débito Fiscal**.

### B. El IVA que pagas te defiende (Crédito Fiscal)
Para operar tu negocio (sea el Car Wash, la Barbería, el Gimnasio o la Venta de Vehículos), tuviste que gastar plata:
- Compraste shampoos, ceras o repuestos por **₡5,000 + 13% de IVA (₡650)**.
- Pagaste la luz del local con **₡130** de IVA.
- En total pagaste **₡780 de IVA** a tus proveedores.
- En la pantalla, esto se llama **Columna Naranja: Determinación del Crédito Fiscal**.

### C. La Resta Mágica (Liquidación Final)
Hacienda te dice: *"No me des todos los ₡1,300 que cobraste. Réstale los ₡780 que ya pagaste en compras con factura electrónica a tu nombre"*.
$$\text{IVA Cobrado (₡1,300)} - \text{IVA Pagado (₡780)} = \mathbf{₡520 \text{ por pagar}}$$

- Si vendiste más de lo que compraste: **Pagas el saldo en la Casilla [140]**.
- Si compraste más de lo que vendiste (ej. invertiste en maquinaria o mercadería): **Te queda Saldo a Favor en la Casilla [141]**, y se acumula para no pagar impuestos el próximo mes.

---

## 🖥️ 3. Entendiendo la Pantalla de DeclaraHub (Paso a Paso)

![Captura DeclaraHub](file:///C:/Users/AlexG3/.gemini/antigravity/brain/23e8b728-46b7-4b58-9d71-27ddef3bc436/.user_uploaded/media_1793288085455_16eb01ec.png)

### 1. La Barra Superior (Pestañas y Fechas)
- **`DeclaraHub (Borrador D-104)`**: La vista donde estás. Es el simulador interactivo de impuestos.
- **`Libro de Comprobantes & Excel`**: La vista tradicional donde ves la lista larga de todas las facturas una por una con su clave de 50 dígitos para exportar a Excel.
- **Botones de Período Rápido (`Este mes`, `Mes anterior`, `Este año`)**: Cambian el rango de fechas en 1 segundo. En Costa Rica, el IVA se declara del **1 al 15 de cada mes** (correspondiente al mes vencido anterior).

### 2. El Banner Central (El Veredicto)
Es la tarjeta grande con el escudo:
- **Verde / Azul (Saldo a Favor)**: Significa que Hacienda no te puede cobrar nada este mes porque tus gastos deducibles superaron tus ventas.
- **Ámbar / Esmeralda (Impuesto Neto por Pagar - Casilla 140)**: Te muestra en números gigantes y en colones exactos el cheque o transferencia que debes hacer antes del día 15.

---

## 📑 4. ¿Qué significa cada Casilla de Hacienda?

Cuando entras al portal de Hacienda (**ATV**, o el nuevo sistema **TRIBU-CR / OVI**), Hacienda te muestra un formulario con números entre corchetes. La gente se asusta porque parecen códigos de la NASA, pero DeclaraHub los traduce así:

### Columna Izquierda: Ventas (Lo que cobraste)
| Casilla | Nombre Oficial en Hacienda | Explicación para Dummies |
| :--- | :--- | :--- |
| **`[101]`** | **Ventas y Servicios Gravados (13%)** | El dinero total que entró a tu negocio por ventas al 13% (sin contar el impuesto). |
| **`[102]`** | **Ventas a Tarifas Reducidas (4%, 2%, 1%)** | Si vendes salud (4%), boletos aéreos, medicamentos o canasta básica (1%). |
| **`[103]`** | **Ventas Exentas / No Sujetas** | Ventas de exportación o productos que por ley no pagan IVA. |
| **`[110]`** | **TOTAL DÉBITO FISCAL (A)** | **La suma de todo el IVA que tus clientes te pagaron.** |

### Columna Derecha: Compras y Gastos (Lo que gastaste)
| Casilla | Nombre Oficial en Hacienda | Explicación para Dummies |
| :--- | :--- | :--- |
| **`[121]`** | **Compras y Gastos Gravados (13%)** | Total de compras con derecho a descontar IVA (alquiler, internet, mercadería). |
| **`[122]`** | **Compras a Tarifas Reducidas** | Gastos en insumos médicos, agropecuarios o canasta básica. |
| **`[123]`** | **Compras Exentas** | Compras que hiciste a proveedores que no cobran IVA. |
| **`[130]`** | **TOTAL CRÉDITO FISCAL DEDUCIBLE (B)** | **La suma de todo el IVA que ya pagaste y que te descuenta impuestos.** |

### Resultado Final:
- **`[140]`**: Si **[110]** es mayor que **[130]** $\rightarrow$ **TOTAL IMPUESTO A PAGAR**.
- **`[141]`**: Si **[130]** es mayor que **[110]** $\rightarrow$ **SALDO A FAVOR DEL PERÍODO**.

---

## 🖲️ 5. Los Botones Especiales de DeclaraHub

### 📋 El Botoncito de "Copiar" al lado de cada Casilla
Cada casilla tiene un pequeño icono de portapapeles.
- Cuando haces clic, copia el **monto oficial redondeado sin decimales** (exactamente como Hacienda lo exige).
- Te vas a la página de Hacienda, te paras en la casilla [101], presionas `Ctrl + V` (Pegar), y listo. **Cero errores de digitación.**

### 💬 Botón `Copiar Resumen (WhatsApp)`
¿Tienes un contador externo y no quieres darle tu contraseña de Hacienda ni complicarte?
1. Haces clic en este botón.
2. Abres el chat de WhatsApp de tu contador.
3. Presionas Pegar.
4. Tu contador recibe un mensaje súper profesional y estructurado con todos los montos de las casillas, la cédula de la empresa y el período. Tu contador te amará porque le ahorraste 3 horas de trabajo.

### 📊 Botón `Exportar Paquete D-104 (.xlsx)`
Descarga un archivo de Microsoft Excel profesional con 4 hojas:
- Hoja 1: Resumen ejecutivo del D-104.
- Hoja 2: Todas las facturas y tiquetes de ventas con sus números de consecutivo y fechas.
- Hoja 3: Todos los gastos y compras con el nombre y cédula de tus proveedores.
- Hoja 4: Conciliación de notas de crédito.

---

## 📥 6. ¿Cómo se alimenta DeclaraHub? (De dónde saca la información)

DeclaraHub no inventa números. Lee la realidad jurídica de tu empresa a través de 3 vías:

1. **Ventas Automáticas (Tus Facturas y Tiquetes):**
   - Cada vez que emites una Factura Electrónica (`FE`), un Tiquete (`TE`) o una Nota de Crédito (`NC`) en el sistema y Hacienda la acepta, **DeclaraHub la suma al instante**. No tienes que hacer nada.

2. **Compras vía `Analizar / Importar carpeta de XML`:**
   - Tus proveedores te envían las facturas por correo en archivos `.xml`.
   - Guardas esos archivos en una carpeta en tu computadora.
   - Haces clic en **`Analizar / Importar carpeta de XML`**, seleccionas la carpeta y el sistema lee 10, 50 o 500 facturas en 2 segundos, extrayendo el IVA deducible automáticamente.

3. **Compras vía `Descargar de Gmail`:**
   - El sistema puede conectarse a tu correo donde recibes las facturas electrónicas de compras y bajarlas automáticamente sin que tengas que descargarlas a mano.

---

## 🏢 7. Multi-Empresa Inteligente (Multi-Tenant)

Si administras varios negocios (por ejemplo: **LUXX CAR WASH**, **BarberApp**, **Gas Express**, **Grupo G Tres**, **AvalCar**):

- Simplemente conmutas de empresa en el selector superior.
- **DeclaraHub cambia al instante**:
  - Cambia la razón social.
  - Cambia la cédula jurídica.
  - Calcula únicamente las facturas y gastos que le pertenecen a esa empresa específica.
  - **Cero fugas de información:** Los gastos del car wash jamás se mezclarán con las ventas de la barbería ni con los carros de AvalCar.

---

## 🏁 En Resumen: La Rutina Mensual de 3 Minutos

Cada **1 de mes**:
1. Entras a **DeclaraHub** en el menú lateral.
2. Seleccionas el botón **`Mes anterior`**.
3. Presionas **`Copiar Resumen (WhatsApp)`** y se lo mandas a tu contador, **o** entras tú mismo a Hacienda y copias casilla por casilla con el botoncito.
4. ¡Listo! Has cumplido con el Ministerio de Hacienda sin dolores de cabeza, sin pagar sistemas externos y con la tranquilidad de que tus números son 100% exactos.
