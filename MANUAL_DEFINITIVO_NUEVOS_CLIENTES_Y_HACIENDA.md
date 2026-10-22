# 🚀 MANUAL DEFINITIVO: CÓMO DAR DE ALTA A CUALQUIER CLIENTE EN FACTURAOS
> **Guía maestra para Dummies:** Actualizada con el nuevo sistema **TRIBU-CR (Hacienda Digital)** que sustituyó de forma definitiva al antiguo portal ATV.  
> Todo lo que se le pide al dueño del negocio, cómo se saca en la **Oficina Virtual (OVi)** de TRIBU-CR, cómo se configura en FacturaOS y cómo se conecta a su aplicación externa (AvalCar, BarberApp, etc.).

---

## 📌 ÍNDICE RÁPIDO
1. [La Arquitectura en 30 segundos (Por qué no te enredas con código)](#-1-la-arquitectura-en-30-segundos)
2. [Checklist: Qué pedirle al Dueño del Negocio](#-2-checklist-qué-pedirle-al-dueño-del-negocio)
3. [Guía para el Cliente: Cómo sacar sus credenciales en TRIBU-CR (OVi)](#-3-guía-para-el-cliente-cómo-sacar-sus-credenciales-en-tribu-cr-ovi)
4. [Paso a Paso en FacturaOS (Tu trabajo como Administrador)](#-4-paso-a-paso-en-facturaos-tu-trabajo-como-administrador)
5. [Conectar la App del Cliente (AvalCar, BarberApp, etc.)](#-5-conectar-la-app-del-cliente-avalcar-barberapp-etc)
6. [Resolución de Dudas y Errores Frecuentes](#-6-resolución-de-dudas-y-errores-frecuentes)

---

## 🧠 1. La Arquitectura en 30 segundos

```
┌─────────────────────────────────┐           ┌──────────────────────────────────┐           ┌─────────────────────────────────┐
│     APP DEL CLIENTE             │           │          FACTURAOS HUB           │           │     MINISTERIO DE HACIENDA      │
│  (AvalCar, BarberApp, etc.)     │           │         (Tu Plataforma)          │           │       (TRIBU-CR / v4.4 v2)      │
│                                 │           │                                  │           │                                 │
│ 1. Hace un cobro normal         │           │ 1. Recibe la orden por API Key   │           │                                 │
│ 2. Envía orden de cobro ────────┼──(API)───►│ 2. Carga el .p12 del cliente     │           │                                 │
│                                 │           │ 3. Genera y firma el XML v4.4    ├─(Factura)►│ Valida en Servidores Hacienda   │
│ 3. Recibe Clave 50 dígitos ◄────┼──(Listo)──┤ 4. Genera el PDF con Código QR   │◄──(Acuse)─┤ Aprueba: "MensajeHacienda.xml"  │
│    y Link al PDF oficial        │           │ 5. Almacena histórico contable   │           │                                 │
└─────────────────────────────────┘           └──────────────────────────────────┘           └─────────────────────────────────┘
```

* **La App del cliente (ej. AvalCar):** Solo maneja **1 API Key**. Cero certificados, cero firmas, cero problemas de Hacienda.
* **FacturaOS:** Es la caja fuerte donde está la firma digital y quien habla directamente con los servidores de Hacienda Digital / TRIBU-CR.

---

## 📋 2. Checklist: Qué pedirle al Dueño del Negocio

Pásale este mensaje directo al cliente (por WhatsApp o correo):

```markdown
Estimado cliente, para dejar activa la Facturación Electrónica oficial 
ante el Ministerio de Hacienda en su sistema (con el nuevo sistema TRIBU-CR), 
requerimos estos 5 datos:

1. [ ] Nombre legal o Razón Social exacta (según su RUT en TRIBU-CR).
2. [ ] Número de Cédula (Física o Jurídica).
3. [ ] Código de Actividad Económica (CIIU de 6 dígitos, ej: 452001 para talleres/lavado).
4. [ ] Archivo de Llave Criptográfica (.p12) y su PIN.
       (Si se generó en TRIBU-CR es un PIN robusto de 14 caracteres; si era previa, de 4 dígitos).
5. [ ] Usuario y Contraseña del API de Hacienda para Comprobantes Electrónicos.
       (El usuario termina en "@prod" o "@comprobanteselectronicos.go.cr").
```

---

## 🏛️ 3. Guía para el Cliente: Cómo sacar sus credenciales en TRIBU-CR (OVi)

> [!NOTE]
> **El portal ATV y TRAVI fueron sustituidos oficialmente por TRIBU-CR** bajo el programa de Hacienda Digital. Todas las gestiones tributarias y de comprobantes se realizan ahora en la **Oficina Virtual (OVi)**.

Pásale estas instrucciones paso a paso al cliente si no sabe cómo obtener su archivo:

### Paso A: Ingresar a la Oficina Virtual (OVi)
1. Entrar al portal oficial: **[https://ovitribucr.hacienda.go.cr](https://ovitribucr.hacienda.go.cr)**.
2. Iniciar sesión con su número de identificación y contraseña de TRIBU-CR (o mediante la app móvil oficial TRIBU-CR).
3. Si administra varias empresas o es representante legal, seleccionar el **Obligado Tributario** (la empresa que va a facturar).

### Paso B: Descargar la Llave Criptográfica (`.p12`) y su PIN
1. En el menú principal, ingresar a la sección de **"Comprobantes Electrónicos"** (o módulo **"Tico Factura"**).
2. Seleccionar la opción **"Generar Llave Criptográfica de Producción"**.
3. El sistema solicitará definir un **PIN de Seguridad**.
   > ⚠️ **NUEVO ESTÁNDAR TRIBU-CR:** El nuevo portal exige un PIN de **14 caracteres** que incluya mayúsculas, minúsculas, números y al menos un carácter especial (ejemplo: `Tribu2026*Prod`).  
   > *(¡IMPORTANTE! El cliente debe guardar este PIN en un lugar seguro, ya que no se puede recuperar).*
4. Hacer clic en **"Generar"** y el navegador descargará el archivo con extensión `.p12` (ejemplo: `3101483899.p12`).
5. Ese archivo `.p12` y el PIN son los que te entrega a ti.

### Paso C: Generar las Credenciales del API (Usuario y Contraseña)
1. En el mismo módulo de Comprobantes Electrónicos, seleccionar **"Generar Contraseña en Producción"** (o Credenciales de Conexión API).
2. Hacer clic en **"Aceptar / Generar"**.
3. En pantalla se mostrarán dos datos:
   * **Usuario del API:** Cadena técnica asignada (ejemplo: `cpj-3-101-483899@prod` o `cpj-3-101-483899@comprobanteselectronicos.go.cr`).
   * **Contraseña del API:** Clave cifrada generada por Hacienda (ejemplo: `vPVwmpuo%kF3g12&CR^J`).
4. El cliente copia ambos textos y te los entrega.

---

## 💻 4. Paso a Paso en FacturaOS (Tu trabajo como Administrador)

Todo lo haces desde tu navegador en **`http://localhost:3000`** (o tu dominio de producción).

---

### Paso 1: Iniciar Sesión como Superadmin
* **URL:** `http://localhost:3000/login`
* **Correo:** `alex@mail.com`
* **Contraseña:** `marfer`
* Te llevará directamente al **Centro de Mando (`/admin`)**.

---

### Paso 2: Registrar la Empresa
1. Arriba a la derecha, haz clic en el botón azul **"+ Nueva Empresa"**.
2. Llena los datos que te dio el cliente:
   * **Nombre de la Empresa:** (ej. `LUXX CAR WASH` o `Taller Los Ángeles`).
   * **Tipo de Cédula:** `02 - Cédula Jurídica` (o `01 - Cédula Física`).
   * **Número de Cédula:** (ej. `3-101-483899`).
   * **Actividad Económica (CIIU):** (ej. `452001` para talleres/lavados, `960201` para barberías, `862001` para salud, etc.).
   * **Correo Electrónico:** Correo del cliente.
   * **Teléfono:** Teléfono comercial.
3. Haz clic en **"Registrar Empresa"**.

> ✨ **Generación Automática:** FacturaOS crea la bóveda aislada y le asigna su **API Key única** (ej: `fct_live_avalcarcr_7c9a...`).

---

### Paso 3: Darle un Acceso al Dueño o Contador (Opcional)
Si el cliente o su contador quieren entrar a FacturaOS a ver sus facturas emitidas, reportes mensuales del IVA y comprobantes:
1. En la tarjeta de la empresa en el Centro de Mando, haz clic en el botón morado **"+ Crear Acceso"**.
2. Escribe:
   * **Nombre:** (ej. `Carlos Administrador`).
   * **Correo de Ingreso:** (ej. `carlos@luxxcarwash.com`).
   * **Contraseña:** (mínimo 6 caracteres).
   * **Rol:** `Administrador de Empresa`.
3. Haz clic en **"Guardar y Crear Acceso"**.
*(Ese usuario entra por `/login` y queda 100% amarrado a su negocio, con total aislamiento fiscal).*

---

### Paso 4: Cargar la Llave de Hacienda y activar Producción
1. En la tarjeta de la empresa en el Centro de Mando, haz clic en el botón azul **"Ingresar ➔"**.
2. En el menú lateral izquierdo ve a **Configuración** ➔ **Integración Hacienda**.
3. Configura los siguientes campos:
   * **Entorno:** Cambia el botón selector de `Staging / Pruebas` a **`🟢 Producción`**.
   * **Llave Criptográfica:** Haz clic en **"Cambiar llave .p12"** y sube el archivo `.p12` que te dio el cliente.
   * **PIN de la Llave:** Escribe el PIN (admite tanto el nuevo de 14 caracteres de TRIBU-CR como el antiguo de 4 dígitos).
   * **Usuario del API:** Pega el usuario de producción.
   * **Contraseña del API:** Pega la contraseña de producción de Hacienda.
   * **Actividad Económica:** Confirma que coincida con el código de 6 dígitos del RUT.
4. Haz clic en el botón **"Probar Conexión con Hacienda"**:
   * El sistema contactará a Hacienda y mostrará confirmación en verde.
5. Haz clic en **"Guardar Cambios"**.

---

### Paso 5: Copiar la API Key
1. En el menú lateral ve a **"Conexión API & Software Externo"** (o desde el botón "Editar" en el Centro de Mando).
2. Verás el cuadro **Tu API Key Secreta**.
3. Haz clic en el botón **"Copiar Clave"** (`fct_live_...`).

---

## 🔌 5. Conectar la App del Cliente (AvalCar, BarberApp, etc.)

Ahora te vas a la app externa donde el cliente opera sus cobros.

### En AvalCar (o cualquier app del ecosistema):
1. Abre **AvalCar**.
2. Entra a **Configuración / Ajustes** ➔ Busca la tarjeta **"Facturación Electrónica (FacturaOS Hub)"**.
3. Pega los 2 valores:
   * **URL de FacturaOS:**  
     `http://localhost:3000/api/v1/invoices`  
     *(O tu dominio en la nube, ej: `https://facturaos.tudominio.com/api/v1/invoices`)*.
   * **API Key:**  
     Pega la clave copiada en el paso anterior (`fct_live_avalcarcr_...`).
4. Haz clic en **"Probar Conexión"**:
   * Se encenderá la pastilla verde confirmando:  
     `🟢 Conectado: LUXX CAR WASH (Cédula: 3-101-483899)`.
5. Haz clic en **"Guardar"**.

---

### ¡Listo! ¿Cómo se cobra una factura a partir de ahora?
1. En AvalCar vas al punto de venta o cobro de servicio (**Checkout**).
2. Cobras el servicio (ej: *"Lavado y Encerado ₡18,000"*).
3. Marcas la casilla **"¿Requieres Factura Electrónica?"**.
   * Con Cédula: persona física o jurídica (autocompleta el nombre automáticamente).
   * Rápido: **Tiquete Electrónico (04)** a consumidor final.
4. Procesas el cobro.
5. En 1 a 2 segundos:
   * AvalCar muestra: `✅ Factura Aprobada por Hacienda`.
   * **Clave de 50 dígitos oficial**.
   * Botones directos para **PDF Oficial con QR** y **XML firmado**.

---

## 🛠️ 6. Resolución de Dudas y Errores Frecuentes

### 1. ¿Qué pasa si mientras hacemos pruebas el cliente no tiene la llave de Hacienda aún?
No hay problema. Toda empresa nueva registrada en FacturaOS arranca por defecto en **Staging (Pruebas / Sandbox)**. Puedes conectar AvalCar de inmediato y hacer todos los cobros de prueba que quieras; FacturaOS generará facturas simuladas válidas para probar la impresora y el PDF sin generar obligaciones tributarias reales.

### 2. Error: *"El usuario o contraseña de Hacienda no coinciden"*
* **Causa:** El cliente suele copiar su contraseña de acceso personal a la Oficina Virtual OVi, en lugar de la **Contraseña del API de Comprobantes Electrónicos**.
* **Solución:** Recuérdale que son diferentes. Debe ingresar a OVi ➔ *Comprobantes Electrónicos* ➔ *Generar Contraseña en Producción*.

### 3. Error: *"PIN de llave criptográfica incorrecto"*
* **Causa:** El PIN digitado no coincide con el que el cliente ingresó al momento de generar el archivo `.p12` en TRIBU-CR.
* **Solución:** Como el PIN no se puede recuperar, el cliente debe entrar a OVi ➔ *Generar Llave Criptográfica*, definir un PIN nuevo de 14 caracteres (ej: `Tribu2026*Prod`), descargar el nuevo `.p12` y entregártelo.

### 4. Error: *"Código de Actividad Económica no autorizado"*
* **Causa:** Se colocó un código CIIU o CABYS que el cliente no tiene inscrito ante Tributación.
* **Solución:** En el portal TRIBU-CR ve al perfil tributario del cliente para verificar el código exacto de 6 dígitos activo en su RUT.

### 5. ¿Dónde ve el contador los libros contables mensuales y el IVA?
El contador entra a `http://localhost:3000/login` con las credenciales que le creaste. Va a **Reportes** (`/app/reports`) y tiene:
* Libro de Ventas en Excel con desglose por tarifas de IVA (13%, 4%, 2%, 1%, exento).
* Descarga masiva en un archivo `.ZIP` con todos los XMLs y acuses oficiales del mes para la presentación de la declaración **D-104**.
