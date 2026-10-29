# 📘 Manual para Dummies: Generador y Exportador de Asientos Contables (Debe y Haber)
### FacturaCR Pro & DeclaraHub — Conciliación NIIF para Softland, QuickBooks, Contalink y Excel

---

## 🎯 ¿Qué es esto y para qué sirve? (Explicado con Manzanas)

Si alguna vez tu contador o auditor te ha dicho:
> *"Pásame las pólizas del mes con el Debe y el Haber cuadrados para meterlos a Softland / QuickBooks..."*

...y tú te quedaste con cara de signo de interrogación, este módulo es tu salvación total.

Normalmente, un contador tiene que agarrar todas tus facturas una por una, sumar los montos con calculadora, hacer cuentas T en un cuaderno o Excel y escribir a mano los asientos de diario. Si se equivoca por **1 colón**, el balance no cuadra y pierde horas buscando el error.

**FacturaCR Pro DeclaraHub hace todo eso en 1 segundo:**
1. Toma todas tus ventas y compras electrónicas de Hacienda.
2. Aplica la partida doble contable conforme a las **NIIF** y la **Ley 9635**.
3. Cuadra el **Debe** y el **Haber** con precisión matemática de **₡0.00 de diferencia**.
4. Te entrega el archivo listo para exportar a **Softland**, **QuickBooks**, **Excel** o copiar con **Ctrl+V**.

---

## ⚖️ El Secreto del "Debe" y el "Haber" (Partida Doble)

La contabilidad mundial funciona con una regla de oro simple:
```
┌─────────────────────────────────────────────────────────────┐
│                   TOTAL DEBE = TOTAL HABER                  │
│                     (Diferencia = ₡0.00)                    │
└─────────────────────────────────────────────────────────────┘
```

- **DEBE (Débitos):** Representa lo que **entra** al negocio (dinero en el banco, cuentas por cobrar a clientes, mercadería comprada, gastos en los que incurriste, o IVA pagado a Hacienda).
- **HABER (Créditos):** Representa de **dónde salió** o el **origen** de los fondos (tus ingresos por ventas, cuentas por pagar a proveedores, o el IVA que le cobraste a los clientes y le debes a Hacienda).

---

## 📑 Los 4 Asientos Generados Automáticamente

FacturaCR Pro genera automáticamente las 4 pólizas reglamentarias de cada período:

```
                                  ┌─────────────────────────────┐
                                  │   COMPROBANTES ELECTRÓNICOS │
                                  │   (Facturas + Tiquetes + NC)│
                                  └──────────────┬──────────────┘
                                                 │
                  ┌──────────────────────────────┼──────────────────────────────┐
                  ▼                              ▼                              ▼
      ┌───────────────────────┐      ┌───────────────────────┐      ┌───────────────────────┐
      │   ASIENTO 1: VENTAS   │      │  ASIENTO 2: COMPRAS   │      │ ASIENTO 3: LIQ. D-104 │
      │  Póliza de Facturación│      │   Póliza de Egresos   │      │ Cierre de Cuentas IVA │
      └───────────┬───────────┘      └───────────┬───────────┘      └───────────┬───────────┘
                  │                              │                              │
                  └──────────────────────────────┼──────────────────────────────┘
                                                 │
                                                 ▼
                                  ┌─────────────────────────────┐
                                  │     PÓLIZA CONSOLIDADA      │
                                  │   (Asiento Maestro Mensual) │
                                  │     ✓ Cuadrado al Centavo   │
                                  └─────────────────────────────┘
```

---

### 1️⃣ Asiento 1: Ventas y Facturación (Póliza de Ingresos)
Registra todo lo que facturaste a tus clientes en el mes:

| Código | Cuenta Contable | Debe (₡) | Haber (₡) | Explicación para Dummies |
|---|---|:---:|:---:|---|
| **1120-01** | Cuentas por Cobrar Clientes / Bancos | **₡1,130,000** | — | Lo que tus clientes te deben o te pagaron |
| **4010-01** | Ingresos por Ventas Gravadas 13% | — | **₡1,000,000** | La base de tus ventas (tu ingreso real) |
| **2110-01** | IVA Débito Fiscal Devengado 13% | — | **₡130,000** | El IVA que cobraste (no es tuyo, es de Hacienda) |
| **TOTALES** | **Equilibrio Perfecto** | **₡1,130,000** | **₡1,130,000** | **Diferencia: ₡0.00 (Cuadrado ✓)** |

> *(Si emitiste Notas de Crédito, el sistema aplica la reversión del ingreso y del débito fiscal automáticamente).*

---

### 2️⃣ Asiento 2: Compras y Gastos (Póliza de Egresos)
Registra todas las facturas y compras recibidas de tus proveedores:

| Código | Cuenta Contable | Debe (₡) | Haber (₡) | Explicación para Dummies |
|---|---|:---:|:---:|---|
| **5010-01** | Compras de Mercancías (Inventario) | **₡400,000** | — | Mercadería que compraste para revender |
| **5020-01** | Gastos Operativos (Alquiler, Luz, Internet) | **₡100,000** | — | Gastos administrativos del negocio |
| **1130-01** | IVA Soportado Crédito Fiscal 13% | **₡65,000** | — | El IVA que pagaste y que vas a deducir en Hacienda |
| **2105-01** | Cuentas por Pagar Proveedores | — | **₡565,000** | Lo que le debes a tus proveedores |
| **TOTALES** | **Equilibrio Perfecto** | **₡565,000** | **₡565,000** | **Diferencia: ₡0.00 (Cuadrado ✓)** |

---

### 3️⃣ Asiento 3: Liquidación Mensual de IVA (Cierre Oficial D-104)
Al final de cada mes, se deben "cerrar" las cuentas transitorias de IVA:

#### Caso A: Tuviste Impuesto a Pagar (Débito > Crédito)
- Débito Cobrado en Ventas: ₡130,000
- Crédito Pagado en Compras: ₡65,000
- **Resultado:** Debes pagarle ₡65,000 a Hacienda.

| Código | Cuenta Contable | Debe (₡) | Haber (₡) |
|---|---|:---:|:---:|
| **2110-01** | IVA Débito Fiscal (Cancela la cuenta transitoria) | **₡130,000** | — |
| **1130-01** | IVA Soportado (Cancela el crédito aplicado) | — | **₡65,000** |
| **2115-01** | IVA por Pagar Hacienda (Casilla [140] del D-104) | — | **₡65,000** |

#### Caso B: Tuviste Saldo a Favor o Prorrata Mixta
- Si tus compras superaron las ventas, se acredita la cuenta **`1135-01 Saldo a Favor IVA (Casilla 141)`** para usarlo el siguiente mes.
- Si tuviste **Prorrata Mixta (Art. 30 Ley 9635)**, la porción del IVA no deducible se manda al Debe de **`5030-01 Gasto por IVA No Deducible`** para que tu contador lo deduzca en el Impuesto sobre la Renta (D-101).

---

### 4️⃣ Póliza Consolidada Maestra
Une los 3 asientos anteriores en una sola sábana contable. Es la opción preferida por los contadores para importar el mes completo de un solo golpe.

---

## 🏢 Catálogo de Cuentas Estándar de Costa Rica

FacturaCR Pro utiliza la nomenclatura estándar homologada para empresas costarricenses:

| Código | Nombre de la Cuenta | Tipo NIIF | ¿Para qué sirve? |
|---|---|---|---|
| **`1110-01`** | Bancos y Caja General | Activo Corriente | Fondos en BAC, BCR, BNCR o caja chica |
| **`1120-01`** | Cuentas por Cobrar Clientes | Activo Corriente | Facturas de clientes pendientes de cobro |
| **`1130-01`** | IVA Soportado Crédito Fiscal 13% | Activo Transitorio | IVA pagado en facturas de proveedores |
| **`1130-02`** | IVA Soportado Tarifas Reducidas | Activo Transitorio | IVA al 4%, 2% o 1% soportado en compras |
| **`1135-01`** | Saldo a Favor IVA Hacienda | Activo Exigible | Crédito acumulado a favor (Casilla 141) |
| **`2105-01`** | Cuentas por Pagar Proveedores | Pasivo Corriente | Deudas con suplidores de bienes o servicios |
| **`2110-01`** | IVA Devengado Débito Fiscal 13% | Pasivo Transitorio | IVA del 13% cobrado a clientes |
| **`2110-02`** | IVA Devengado Tarifas Reducidas | Pasivo Transitorio | IVA cobrado en tarifas reducidas |
| **`2115-01`** | IVA por Pagar Hacienda | Pasivo Exigible | Monto líquido a pagar el día 15 (Casilla 140) |
| **`4010-01`** | Ingresos por Ventas Gravadas 13% | Ingresos | Ventas normales gravadas |
| **`4010-02`** | Ingresos por Ventas Reducidas | Ingresos | Servicios de salud, boletos, canasta básica |
| **`4010-03`** | Ingresos por Ventas Exentas | Ingresos | Exportaciones o ventas no gravadas |
| **`4015-01`** | Devoluciones sobre Ventas | Contra-Ingreso | Notas de crédito emitidas |
| **`5010-01`** | Costo de Ventas - Mercancías | Costos | Bienes adquiridos para la reventa |
| **`5020-01`** | Gastos Operativos y Administrativos | Gastos Operativos | Alquiler, servicios públicos, honorarios |
| **`5030-01`** | Gasto por IVA No Deducible | Gastos Deducibles | IVA prorrateado deducible en Renta D-101 |
| **`5090-01`** | Ajuste por Redondeo Decimal | Gastos Varios | Microcentavos residuales de redondeo |

---

## 🚀 ¿Cómo se usa en la Pantalla? (Paso a Paso)

### Paso 1: Ingresa a Reportes / DeclaraHub
En el menú lateral, ve a **DeclaraHub** o **Reportes**.

### Paso 2: Selecciona el Período
Elige el mes que vas a cerrar (ej. `01/10/2026` al `31/10/2026`).

### Paso 3: Haz Clic en "Asientos Contables (Debe/Haber)"
En la parte superior verás el botón con el ícono de la balanza **`Asientos Contables`**. Haz clic ahí.

### Paso 4: Revisa las Pestañas
Se abrirá la ventana con el sello:
`✓ Debe = Haber (Cuadrado ₡0)`

Puedes navegar entre las 4 pestañas:
1. **Póliza Consolidada (Maestra)**
2. **Asiento 1: Ventas y Facturación**
3. **Asiento 2: Compras y Gastos**
4. **Asiento 3: Liquidación IVA D-104**

---

## 💾 Opciones de Exportación para el Contador

En la esquina superior derecha tienes 4 botones:

1. **`Exportar Todo (.xlsx)`**:
   Descarga un libro completo de Microsoft Excel con **6 hojas de trabajo**:
   - Hoja 1: *Resumen General y Control de Pólizas*
   - Hoja 2: *Asiento Ventas*
   - Hoja 3: *Asiento Compras*
   - Hoja 4: *Liquidación IVA D104*
   - Hoja 5: *Softland ERP (Formato importador)*
   - Hoja 6: *QuickBooks (Journal format)*

2. **`Softland .CSV`**:
   Genera el archivo delimitado por punto y coma listo para el importador de pólizas de **Softland**:
   ```csv
   CUENTA;CENTRO_COSTO;FECHA;REFERENCIA;DESCRIPCION;DEBITO;CREDITO
   112001;02;2026/10/31;VTA-2026-10;"Cobros por facturas emitidas";1130000.00;0.00
   401001;02;2026/10/31;VTA-13%;"Ventas gravadas al 13%";0.00;1000000.00
   211001;02;2026/10/31;IVA-DEV-13;"IVA débito devengado";0.00;130000.00
   ```

3. **`QuickBooks .CSV`**:
   Genera el archivo estándar con columnas `Date`, `Journal No`, `Account`, `Debit`, `Credit` y `Memo`.

4. **`Copiar (Ctrl+V)`**:
   Copia todo el asiento tabulado al portapapeles. Solo abres tu Excel o Google Sheets, presionas `Ctrl + V` y ¡aparece la tabla perfectamente alineada con sus fórmulas de suma!

---

## 💡 Preguntas Frecuentes de Contadores

### ¿Qué pasa si una factura tiene un redondeo de ₡0.01 colón?
El motor de cuadratura de FacturaCR Pro detecta diferencias microscópicas causadas por decimales de Hacienda y las imputa automáticamente a la cuenta **`5090-01 Ajuste por Redondeo Decimal`**. **Ningún asiento saldrá jamás con un centavo de descuadre.**

### ¿Tiene en cuenta la Prorrata del IVA?
**Sí.** Si tu negocio vende productos exentos y gravados a la vez, FacturaCR Pro toma el factor de prorrata de la **Casilla [114]**, calcula el crédito efectivo de la **Casilla [131]** y el resto lo envía a la cuenta **`5030-01 Gasto por IVA No Deducible`** para que sea escudo fiscal en la declaración anual de Renta (D-101).

---

*FacturaCR Pro & DeclaraHub — Diseñado para hacer felices a los contadores de Costa Rica.*
