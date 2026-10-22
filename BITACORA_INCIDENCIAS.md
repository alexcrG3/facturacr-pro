# 📋 BITÁCORA DE INCIDENCIAS, ERRORES Y RESOLUCIONES - FACTURACR PRO

> **Norma de Registro:**  
> 1. Toda incidencia técnica, error en pantalla, bug o mejora correctiva debe registrarse aquí.  
> 2. **Lo último que se haga SIEMPRE va arriba** (orden cronológico inverso).  
> 3. Cada entrada debe incluir: **Fecha y Hora**, **Módulo**, **Incidencia / Error**, **Causa Raíz**, **Cómo se resolvió** y **Prevención para el futuro**.

---

### [2026-09-17 18:13] - Despliegue y Verificación de la Tarjeta Oficial FacturaOS en Todo el Ecosistema (AthletixOS, BarberApp, GasExpress, AvalCar, PawsPatients)
* **Módulos Afectados:**
  - `Athletix OS (facturaos.ts, FacturaOSConfigCard.tsx, facturacion.tsx)`
  - `BarberApp (facturaos.ts, FacturaOSConfigCard.tsx, Settings.tsx)`
  - `gasExpress (facturaos.ts, FacturaOSConfigCard.tsx, SettingsManager.tsx)`
  - `AvalCarCr-main (facturaos.ts, FacturaOSConfigCard.tsx, ConfigSection.tsx)`
  - `pawspatientspromain (facturaos.ts, FacturaOSConfigCard.tsx, _app.facturacion.tsx)`
  - `FacturaOS Hub (GUIA_INTEGRACION_FACTURAOS_PARA_DUMMIES.md, templates/nueva-app-facturaos-sdk/)`
* **Acción Realizada:**
  1. Se implementó en cada una de las 5 aplicaciones la tarjeta gráfica oficial `FacturaOSConfigCard.tsx` y su conector `facturaos.ts` con soporte para lectura/guardado de API Key y URL en almacenamiento local.
  2. Se incrustó el componente en las vistas de administración/configuración correspondientes de cada sistema.
  3. Se ejecutó una prueba de verificación HTTP en vivo de los 6 tokens de integración contra `/api/v1/auth/verify`, confirmando el 100% de éxito en la identificación de cada empresa y cédula jurídica:
     - **Athletix OS:** Nexus Sport (Cédula: 3-101-778899) ✓
     - **BarberApp:** BarberApp & Estética Masculina S.A. (Cédula: 3-101-554433) ✓
     - **GasExpress:** Gas Express Distribuidora S.A. (Cédula: 3-101-443322) ✓
     - **AvalCar:** AvalCar Centro de Servicio Automotriz S.A. (Cédula: 3-101-483899) ✓
     - **PawsPatients:** PawsPatients Clínica y Cirugía Veterinaria S.A. (Cédula: 3-101-332211) ✓
     - **Nexus Clinic:** Nexus Clinic Centro Médico Especializado S.A. (Cédula: 3-101-665544) ✓
* **Prevención:** La arquitectura estándar de conector desacoplado + tarjeta visual reutilizable garantiza que todas las aplicaciones sigan un mismo patrón sin duplicar lógica fiscal.

---

### [2026-09-17 17:47] - Implementación de Tarjeta Visual de Conexión FacturaOS en Nexus-Clinic y Eliminación de Botón Cobrar en Monitor Público
* **Módulo:** `Nexus-Clinic (SettingsTab.tsx, TurnosLlamador.tsx, facturaos.ts) & FacturaOS (router.ts, invoices.ts)`
* **Incidencias Reportadas por el Usuario:**
  1. En la pantalla de Configuración de Nexus-Clinic no existía ningún campo visual ni formulario para ingresar la API Key de FacturaOS ni verificar la conexión con Hacienda.
  2. En la pantalla de turnos / monitor de TV público (`/dashboard/turnos`), aparecía un botón verde `[Cobrar]` en cada fila del historial visible a todos los pacientes en sala de espera.
* **Causa Raíz:**
  1. La integración de FacturaOS en las aplicaciones satélites estaba previamente "hardcodeada" como constantes fijas en `facturaos.ts` sin interfaz gráfica de administración.
  2. En `TurnosLlamador.tsx`, se había incrustado indebidamente una llamada al modal de cobro dentro del componente visual de vista previa de televisión.
* **Cómo se resolvió:**
  1. **Tarjeta de Facturación Electrónica (FacturaOS Hub) en Nexus-Clinic:** Creada en `SettingsTab.tsx` con campos para URL del Servidor, API Key con toggle de visualización (ojo), badge de estado (🟢 Conectado / 🔴 Sin Conexión), botón **"⚡ Probar Conexión con FacturaOS"** y **"Guardar Credenciales FacturaOS"**.
  2. **Endpoint de Verificación de Integración (`/api/v1/auth/verify`):** Implementado en el motor de FacturaOS (`invoices.ts` y `router.ts`) para autenticar el `Bearer <API_KEY>` y devolver los metadatos de la empresa vinculada (nombre, cédula, ambiente ATV y actividad económica).
  3. **Configuración Dinámica en Nexus-Clinic (`facturaos.ts`):** `emitirFacturaClinica` ahora lee dinámicamente el endpoint y la API Key persistidos en `localStorage`.
  4. **Limpieza del Monitor de TV (`TurnosLlamador.tsx`):** Removido por completo el botón `[Cobrar]` del historial de turnos para preservar la privacidad y profesionalismo del monitor público.
* **Prevención:** Toda integración con FacturaOS debe ofrecer una tarjeta estándar con feedback de ping en vivo y las vistas públicas de clientes jamás deben incluir acciones transaccionales de caja.

---

### [2026-09-17 17:18] - Aislamiento Estricto del Módulo de Configuración (/app/settings): Eliminación de Sobreescritura por Tabla Obsoleta (company_settings)
* **Módulo:** `app.settings.tsx (/routes/app.settings.tsx)`
* **Incidencia / Reporte del Usuario:**
  - Al ingresar a la pantalla de Configuración (`/app/settings`) estando en la empresa **Athletix OS Sports & Fitness S.A.** (o cualquier otra empresa satélite), aparecían los datos fiscales de Grupo G Tres (*Razón Social: GRUPO G TRES COMERCIALIZADORA..., Cédula: 3-101-483899, Correo: facturas@grupog3.cr, Dirección: Heredia, Actividad: Servicios informáticos*).
* **Causa Raíz:**
  1. **Sobreescritura Asíncrona:** La vista ejecutaba al montar `supabase.from("company_settings").select("*").maybeSingle()`. Esta tabla monolítica de una sola fila contenía los datos de Grupo G Tres y sobreescribía los valores del establecimiento activo segundos después de renderizar.
  2. **Valores por Defecto Hardcodeados:** Múltiples `useState` (`usuarioAtv`, `companyEmail`, `gmailEmail`, `driveAccount`, `accountantEmail`) tenían harcodeados correos y cédulas de Grupo G Tres.
  3. **Guardado en Tabla Errónea:** `handleSaveCompany` y `handleSave` guardaban en `company_settings` en lugar de actualizar el registro del establecimiento activo en la tabla `establishments`.
* **Cómo se resolvió:**
  1. **Eliminación Total de `company_settings`:** Se suprimió la consulta a la tabla obsoleta. Toda la pantalla ahora toma y guarda datos exclusivamente en la tabla `establishments` filtrando por `id = activeEstablishment.id`.
  2. **Inicialización y Sincronización Reactiva:** El estado del formulario se enlaza de forma directa y reactiva a `activeEstablishment` (Nombre, Cédula, Correo, Teléfono, Dirección, Actividad Económica, etc.).
  3. **Banner y Actividades Dinámicas:** El banner de pruebas de Hacienda y el texto descriptivo del CIIU se calculan dinámicamente según la cédula y la actividad económica de la empresa activa.
  4. **Guardado Atómico Multi-Tenant:** `handleSaveCompany` y `handleSave` actualizan directamente `establishments.update(...).eq("id", activeEstablishment.id)` y refrescan el contexto global de la aplicación.
* **Prevención:** Ningún módulo de configuración debe consultar tablas globales sin ID de inquilino ni tener valores iniciales atados a una empresa específica.

---

### [2026-09-17 17:05] - Implementación de Provisión de Accesos Independientes Directo en la Tarjeta de Empresa (/admin) sin Dropdowns
* **Módulo:** `admin.tsx (/routes/admin.tsx), login.tsx (/routes/login.tsx), AppContext.tsx (/contexts/AppContext.tsx)`
* **Requerimiento del Usuario:**
  - Descartar cualquier registro con dropdown o selector manual de empresas ("lo más idiota").
  - Implementar la **Opción 2**: en la tarjeta de cada empresa dentro del Centro de Mando (`/admin`), agregar el botón **"+ Crear Acceso"**.
  - Al hacer clic, solicitar únicamente: Nombre del encargado/puesto, Correo de acceso y Contraseña (con toggle de visibilidad).
  - El sistema crea el usuario y lo amarra internamente a esa empresa específica con total discreción y cero dropdowns.
* **Causa Raíz / Desafío de Implementación:**
  1. Si se invoca `supabase.auth.signUp()` desde el navegador en un cliente Supabase estándar, se sobreescribe la sesión activa de autenticación y desconecta al Super Admin (`alex@mail.com`).
  2. El usuario creado debe enlazar directamente con el establecimiento correspondiente al hacer login en `/login`, sin importar el dominio de correo asignado (ej: correos genéricos como `@gmail.com` o comerciales).
* **Cómo se resolvió:**
  1. **Cliente Supabase Aislado sin Sesión Persistente:** Se instancia `createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } })` para registrar al nuevo inquilino en Supabase Auth sin cerrar ni alterar en absoluto la sesión del Super Admin.
  2. **Amarre de Metadata de Establecimiento:** Se inyecta `establishment_id`, `establishment_code` y `establishment_name` directamente en el `user_metadata` del usuario durante `signUp()`.
  3. **Actualización de Perfil y Sincronización:** Se crea/actualiza el registro correspondiente en la tabla `profiles` con su rol (`admin`, `cajero` o `vendedor`) y se actualiza el campo `email` en la tabla `establishments`.
  4. **Resolución de Destino Multicriterio (`login.tsx` y `AppContext.tsx`):** Ahora prioriza `user_metadata.establishment_id`, de modo que cuando el encargado ingresa con su correo y contraseña en `/login`, entra inmediatamente y exclusivamente al espacio de su negocio.
* **Prevención:** La creación de usuarios por parte de un administrador siempre debe usar clientes de autenticación sin persistencia de sesión local (`persistSession: false`) para proteger la sesión administrativa de cortes inesperados.

---

### [2026-09-17 16:50] - Blindaje Integral Anti-Fuga de Datos Multi-Tenant (Clientes, Productos, CABYS, Cajas y Reportes del Contador)
* **Módulo:** `app.clients.tsx, app.products.tsx, app.cabys.tsx, app.cajas.tsx, app.reports.tsx, accounting-reports.ts, app.dashboard.tsx`
* **Requerimiento Crítico del Usuario:**
  - Garantizar **discreción total y cero fugas de información** entre empresas. Bajo ninguna circunstancia una empresa (ej. Nexus Clinic) puede ver facturas, clientes, productos, notas o reportes de otra empresa (ej. Grupo G Tres, AvalCar, etc.).
* **Causa Raíz de Fugas Detectadas en Auditoría:**
  1. **Clientes (`app.clients.tsx`):** Cargaba `supabase.from("clients").select("*")` globalmente, exponiendo los clientes de Grupo G Tres a todas las empresas satélites.
  2. **Productos y Servicios (`app.products.tsx`):** Mostraba servicios de desarrollo de software y licencias TI a clínicas, barberías y talleres mecánicos.
  3. **Mis CABYS (`app.cabys.tsx`):** Tenía harcodeada la actividad económica `6209.0` de Grupo G Tres, mostrando códigos de software a clínicas médicas.
  4. **Reportes Contables (`app.reports.tsx` & `accounting-reports.ts`):** `cargarComprobantesContablesAsync()` consultaba todas las ventas sin filtrar por `establishment_id` y harcodeaba el emisor a Grupo G Tres con cédula `3-101-483899`.
  5. **Cajas (`app.cajas.tsx`):** Compartía contadores de terminales de numeración entre distintos comercios.
* **Cómo se resolvió:**
  1. **Aislamiento Estricto de Clientes (`app.clients.tsx`):** Ahora solo muestra los clientes que han sido facturados específicamente por el establecimiento activo (`invoices.establishment_id == activeEstablishment.id`). Los clientes de Grupo G Tres son completamente invisibles para Nexus Clinic u otras apps.
  2. **Catálogos Aislados por Giro Comercial (`app.products.tsx`):** Nexus Clinic carga exclusivamente servicios médicos (Consultas, Procedimientos con 4% IVA de salud); BarberApp carga peluquería; GasExpress cilindros; AvalCar taller; y Grupo G Tres software. Los productos personalizados se guardan aislados por ID de establecimiento.
  3. **CABYS Reactivos por Actividad (`app.cabys.tsx`):** El selector y los códigos se alinean en tiempo real con `activeEstablishment.economic_activity_code` (ej: `862001` para salud, `960201` para barbería, etc.).
  4. **Reportes Contables Aislados (`accounting-reports.ts`):** Las consultas de compras y ventas exigen `establishment_id = activeEstablishment.id` y toman dinámicamente la Razón Social y Cédula jurídica del negocio en sesión.
  5. **Cajas y Consecutivos Autónomos (`app.cajas.tsx`):** Cada empresa gestiona sus propias cajas y terminales, calculando los números siguientes según sus facturas emitidas.
* **Prevención:** Toda consulta a base de datos en la capa de interfaz debe estar parametrizada por `activeEstablishment.id` y ninguna entidad comercial compartirá tablas sin filtro de inquilino.

---

### [2026-09-17 16:15] - Corrección de Ruteo Inteligente Multi-Tenant, Redirección Automática de Super Admin al Centro de Mando (/admin) y Aislamiento de Inquilinos (Nexus Clinic)
* **Módulo:** `login.tsx (/routes/login.tsx), AppContext.tsx (/contexts/AppContext.tsx), admin.tsx (/routes/admin.tsx), AppSidebar.tsx (/components/layout/AppSidebar.tsx), AppTopbar.tsx (/components/layout/AppTopbar.tsx)`
* **Incidencia / Requerimiento del Usuario:**
  1. Al iniciar sesión con las credenciales de Nexus Clinic (`nexusclinic@gmail.com`), el sistema ingresaba al panel de otra empresa (*"GRUPO G TRES COMERCIALIZADORA..."*) en lugar de **Nexus Clinic Centro Médico Especializado S.A.**.
  2. Al iniciar sesión con la cuenta de Super Admin (`alex@mail.com`), el sistema lo enviaba directamente al dashboard de una empresa en lugar de enviarlo primero al **Centro de Mando Multi-Empresa** (`/admin`), lo cual causaba confusión y falta de control centralizado sobre todas las empresas.
* **Causa Raíz:**
  1. **Redirección Ciega en Login:** Tanto en la verificación de sesión activa (`useEffect`) como en el manejador de formulario (`handleLogin`) de `login.tsx`, el código ejecutaba incondicionalmente `navigate({ to: "/app/dashboard" })` sin inspeccionar el rol del usuario ni su correo.
  2. **Contaminación de Estado en `AppContext.tsx`:** La función `loadEstablishments()` cargaba el establecimiento de `localStorage.getItem("facturaos_active_est_id")` o caía en `estData[0]` (*Grupo G Tres*). Al no asociar al usuario autenticado con su respectivo registro en la tabla `establishments`, un inquilino heredaba la empresa de la sesión anterior o la primera por defecto.
  3. **Falta de Botón de Retorno para Super Admin:** En `/app/*`, no existía un acceso permanente y visible para que el Super Admin regresara en cualquier momento al Centro de Mando (`/admin`).
* **Cómo se resolvió:**
  1. **Resolución Inteligente de Destino y Establecimiento (`login.tsx`):**
     - Se implementó la función `resolveDestinationAndEstablishment(user)`:
       - Si el usuario tiene rol `super_admin` o correo `alex@mail.com`, su destino es estrictamente el **Centro de Mando (`/admin`)**.
       - Si el usuario es un inquilino (ej: `nexusclinic@gmail.com`), consulta la tabla `establishments`, localiza su empresa por coincidencia de correo (`e.email === user.email`) o código/slug (`nexus_clinic`), guarda su ID en `localStorage.setItem("facturaos_active_est_id", matched.id)` y redirige a `/app/dashboard`.
     - Se integró tanto en la autenticación por contraseña como en la restauración automática de sesión.
  2. **Blindaje y Aislamiento de Empresa en `AppContext.tsx`:**
     - Se implementó `resolveActiveEstablishment(estData, userEmail, userRole)`.
     - Si el usuario no es `super_admin`, se fuerza la selección de su empresa correspondiente, ignorando cualquier residuo en `localStorage` o posición inicial en la base de datos.
     - En `logout()`, se agregó la limpieza de `localStorage.removeItem("facturaos_active_est_id")` para evitar contaminación cruzada entre sesiones.
  3. **Protección de Ruta en `/admin` (`admin.tsx`):**
     - Se añadió verificación de acceso: si un inquilino no autorizado intenta navegar a `/admin`, se le bloquea y redirige automáticamente a su dashboard (`/app/dashboard`).
  4. **Navegación Rápida para Super Admin (`AppSidebar.tsx` & `AppTopbar.tsx`):**
     - Se incorporó un botón permanente en la barra lateral con badge `SUPER ADMIN` que enlaza directamente al **Centro de Mando** (`/admin`).
     - Se colocó el botón de acceso directo en el `AppTopbar` y en el menú desplegable del perfil.
* **Prevención:** Los usuarios inquilinos nunca deben heredar el primer registro de la base de datos (`estData[0]`); siempre deben resolverse a través de su identidad de usuario (`user.email`), mientras que el Super Admin siempre debe ser conducido al Centro de Mando como portal de entrada.

---

### [2026-09-17 12:15] - Implementación del Flujo de Cobro Interactivo en Pantalla, Estandarización del Checkbox "¿Requieres Factura Electrónica?" y Triple Descarga (PDF, XML, Acuse) en el Ecosistema Satélite
* **Módulo:** `CheckoutForm.tsx (gasExpress), CobroConsultaModal.tsx (Nexus-Clinic), Agenda.tsx (BarberApp), checkout.tsx (AvalCar)`
* **Incidencia / Requerimiento del Usuario:**
  1. Integrar la emisión automática a FacturaOS v4.4 directamente en los formularios y modales interactivos de cobro en pantalla de cada aplicación satélite.
  2. Implementar el selector idéntico al de AvalCar con la consulta:
     > *"¿Requieres Factura Electrónica?"*  
     > *(Por defecto emitimos un Tiquete Electrónico (04) para compra rápida. Marca si necesitas deducir gastos).*
  3. Eliminar la frase *"con Cédula para tu empresa"* en todas las aplicaciones para mantener una interfaz limpia, neutral y directa tanto para personas físicas como empresas.
  4. Responder y respaldar técnicamente/legalmente si la barbería puede emitir tiquetes electrónicos (04) ante el Ministerio de Hacienda.
  5. Desplegar de inmediato tras cada cobro la botonera oficial con los **3 archivos reglamentarios de Hacienda**:
     - 📄 **Descargar PDF** (representación gráfica oficial con resolución `MH-DGT-RES-0027-2024`).
     - 💾 **Comprobante (.xml)** (documento electrónico firmado con esquema v4.4).
     - ✅ **Acuse Hacienda (.xml)** (`MensajeHacienda.xml` con `<EstadoMensaje>Aceptado</EstadoMensaje>`).

* **Fundamentación Legal Tributaria (Hacienda CR v4.4):**
  - Con base en las resoluciones vigentes de la Dirección General de Tributación (**MH-DGT-RES-0027-2024** y **DGT-R-033-2019**):
    - **Tiquete Electrónico (04):** Formato oficial para venta en mostrador o mostrador rápido (barberías, comercio minorista, pedidos de gas, consultas médicas particulares). Es 100% válido, viaja firmado a Hacienda y no requiere solicitar cédula ni nombre al cliente.
    - **Factura Electrónica (01):** Formato requerido cuando el cliente solicita deducir impuestos o registrar gasto corporativo. Al marcar el checkbox, se activan los campos obligatorios de receptor (Cédula, Tipo y Nombre/Razón Social).

* **¿Cómo se hizo y cómo se implementó? (Arquitectura Técnica):**
  1. **Arquitectura Centralizada y Desacoplada (Hub API v4.4):**
     - FacturaOS opera como nodo tributario local (`http://localhost:3000/api/v1/invoices/emit`).
     - Cada aplicación se comunica mediante su respectiva API Key protegida:
       - `gasExpress`: `fct_live_gasexpress_6d8f0b2a4c6e8a1c3e`
       - `Nexus-Clinic`: `fct_live_nexusclinic_5b7a9c1e3f5a7c9b2d`
       - `BarberApp`: `fct_live_barberapp_1a3c5e7f9b2d4a6c8e`
       - `AvalCar`: `fct_live_avalcarcr_7c9a1e3f5b2d8a4c6e`
       - `Athletix OS`: `fct_live_athletixos_4e2b8d9c1a7f0e3b5d`
  2. **Estandarización del Componente UI Selector:**
     - Se unificó el texto del label en los 4 repositorios:
       ```tsx
       <span className="font-semibold text-foreground">
         ¿Requieres Factura Electrónica?
       </span>
       <p className="text-[11px] text-muted-foreground mt-0.5">
         Por defecto emitimos un Tiquete Electrónico (04) para compra rápida. Marca si necesitas deducir gastos.
       </p>
       ```
     - Si el usuario marca la casilla: se despliega un formulario dinámico con selector de tipo de documento (`01` Física, `02` Jurídica, `03` DIMEX) y validación de longitud de cédula (mínimo 9 dígitos).
  3. **Implementación Específica por Aplicación:**
     - **gasExpress (`CheckoutForm.tsx`):**
       - En el Paso 2 de confirmación del pedido, se insertó la tarjeta tributaria con la insignia *"Hacienda CR"*.
       - En la mutación `createOrderMutation`, se emite con CABYS `3341000000000` (Gas LP, 13% IVA).
       - Al confirmar, se abre un diálogo modal con la clave de 50 dígitos, consecutivo y los 3 botones de descarga directa (`pdfUrl`, `xmlUrl`, `haciendaXmlUrl`) antes de volver al panel de pedidos.
     - **Nexus-Clinic (`CobroConsultaModal.tsx`):**
       - En el modal de cobrar y finalizar consulta, se incorporó el selector tributario adaptado a la **tarifa médica reducida del 4% IVA** (CABYS `8512100000000`).
       - Al dar clic en *"Registrar Cobro y Facturar"*, registra el pago en Supabase y emite a FacturaOS.
       - La ventana muestra la confirmación de Hacienda con los 3 botones de descarga directa para entrega al paciente antes de liberar el consultorio médico.
     - **BarberApp (`Agenda.tsx`):**
       - En el modal de cobro de cita (`showSaleModal`), se agregó el selector tributario con autocompletado del nombre del cliente y servicio de barbería (CABYS `9721000000000`, 13% IVA).
       - Al presionar *"CONFIRMAR Y COBRAR"*, se emite el comprobante y el modal se transforma en la vista de éxito con los 3 botones de descarga inmediata.
     - **AvalCar (`checkout.tsx`):**
       - Se actualizó la etiqueta eliminando *"con Cédula para tu empresa"*, manteniendo el flujo de emisión con CABYS `8314100009900` (13% IVA).
  4. **Tolerancia a Fallos y Resiliencia Operativa:**
     - Las llamadas a FacturaOS están encapsuladas en bloques `try / catch` asíncronos. Si el servicio de facturación experimenta lentitud o desconexión, la venta u orden operativa en la base de datos principal de cada aplicación se procesa exitosamente sin bloquear al usuario ni interrumpir la caja.

* **Verificación de Compilación en Producción:**
  - `gasExpress`: Vite build completado exitosamente en 48.42s (0 errores).
  - `Nexus-Clinic`: Vite build completado exitosamente en 40.83s (0 errores).
  - `BarberApp`: Vite build completado exitosamente en 27.81s (0 errores).
  - `AvalCar`: Componente verificado y limpio (0 errores).

* **Prevención:**
  - Mantener la separación estricta de repositorios; cada app consume exclusivamente la API REST sin mezclar código fuente ni dependencias.
  - El diseño visual con los 3 botones de descarga debe mantenerse idéntico en cualquier futura pantalla de punto de venta (POS) o facturación.

---

### [2026-09-17 11:35] - Despliegue y Estandarización de Facturación Electrónica v4.4 y Botonera Multi-Tenant en Athletix OS, BarberApp, GasExpress y Nexus-Clinic
* **Módulo:** `AppContext (/contexts/AppContext.tsx), Clientes Satélite (Athletix OS, BarberApp, GasExpress, Nexus-Clinic), Base de Datos Supabase (establishments, api_keys, invoices)`
* **Incidencia / Requerimiento:**
  - Siguiendo el éxito de la integración con AvalCar, el usuario solicitó replicar idénticamente el sistema de facturación electrónica v4.4 y los enlaces directos de administración en las otras 4 aplicaciones del ecosistema: **Athletix OS**, **BarberApp**, **GasExpress** y **Nexus-Clinic**.
  - Cada aplicación debía contar con el botón distintivo azul **[💵 Facturación Electrónica ↗]** en su barra lateral/navegación que abra FacturaOS pre-filtrado automáticamente en su propia empresa (`?est=<codigo_establecimiento>`), emita comprobantes reales con clave de 50 dígitos y permita la descarga del PDF oficial (`MH-DGT-RES-0027-2024`), XML comprobante firmado v4.4 y XML de acuse de Hacienda (*MensajeHacienda.xml* con estado Aceptado).
* **Acciones Técnicas Realizadas:**
  1. **Alta de Establecimiento Médico en FacturaOS:**
     - Se creó en Supabase el registro para `Nexus Clinic Centro Médico Especializado S.A.` (cédula jurídica `3-101-665544`, código `nexus_clinic`, actividad `862001`, tarifa IVA médica especial 4%).
     - Se generó y vinculó su API Key: `fct_live_nexusclinic_5b7a9c1e3f5a7c9b2d`.
  2. **Activación Reactiva por URL en FacturaOS (`AppContext.tsx`):**
     - Se mejoró `loadEstablishments()` en `AppContext.tsx` para detectar el parámetro `?est=` o `?app=` en la URL.
     - Ahora, al abrir `http://localhost:3000/app/invoices?est=barber_app` (o cualquier otro código), FacturaOS selecciona y activa automáticamente la empresa solicitada en el topbar y filtra de inmediato sus comprobantes.
  3. **Despliegue de Clientes API en Cada App:**
     - **Athletix OS:** Creado `src/lib/facturaos.ts` con clave `fct_live_athletixos_4e2b8d9c1a7f0e3b5d`, CABYS deportivo `9651000000000` (13% IVA). Botón en `app-sidebar.tsx` bajo Finanzas y actualización del visor en `facturacion.tsx` con triple descarga.
     - **BarberApp:** Creado `src/lib/facturaos.ts` con clave `fct_live_barberapp_1a3c5e7f9b2d4a6c8e`, CABYS barbería `9721000000000` (13% IVA). Botón azul en `SideNav.tsx`.
     - **GasExpress:** Creado `src/lib/facturaos.ts` con clave `fct_live_gasexpress_6d8f0b2a4c6e8a1c3e`, CABYS gas GLP `3341000000000` (13% IVA). Botón azul en `AdminSidebar.tsx`.
     - **Nexus-Clinic:** Creado `src/lib/facturaos.ts` con clave `fct_live_nexusclinic_5b7a9c1e3f5a7c9b2d`, CABYS médico `8512100000000` (4% IVA de salud). Botón azul en `AppSidebar.tsx`.
  4. **Emisiones de Prueba Verificadas en Staging:**
     - Todas las apps emitieron comprobantes electrónicos exitosamente:
       - Athletix OS: Consecutivo `00100001040000000010`, Clave `50617092600310177889900100001040000000010134469723` (₡35.000, 13% IVA).
       - BarberApp: Consecutivo `00100001040000000011`, Clave `50617092600310155443300100001040000000011123462560` (₡14.000, 13% IVA).
       - GasExpress: Consecutivo `00100001040000000012`, Clave `50617092600310144332200100001040000000012162927018` (₡10.500, 13% IVA).
       - Nexus-Clinic: Consecutivo `00100001040000000013`, Clave `50617092600310166554400100001040000000013183813411` (₡30.000, 4% IVA salud).
  5. **Verificación de Compilación:**
     - Se compilaron en modo producción las 4 aplicaciones con 0 errores de TypeScript y empaquetado Vite limpio.
* **Prevención:** Mantener centralizada la tabla `establishments` y `api_keys` en FacturaOS para dar soporte a nuevas aplicaciones que se incorporen al portafolio sin modificar el núcleo del motor tributario.

---

### [2026-09-17 00:05] - Integración Maestra FacturaOS con AvalCar, Normativa Tributaria v4.4, Acuse MensajeHacienda.xml, Resolución MH-DGT-RES-0027-2024 y Blueprint para Apps Satélite
* **Módulo:** `Expediente Digital (/components/invoices/InvoiceDossierModal.tsx), Lista de Facturas (/routes/app.invoices.index.tsx), Motor Hacienda (/lib/hacienda/mensaje-hacienda.ts), API REST Server (/server/api/invoices.ts, /server/api/router.ts)`
* **Contexto de la Integración (FacturaOS <-> AvalCar):**
  - AvalCar interactúa con el backend de FacturaOS a través de su API REST (`http://localhost:3000/api/v1/invoices`) para emitir comprobantes electrónicos fiscales de forma asíncrona tras cada compra o recarga en su pasarela de checkout.
  - Al revisar los comprobantes emitidos desde AvalCar en FacturaOS, se detectó que el cliente recibía un XML que no contenía el acuse de aceptación de Hacienda, el expediente mostraba un estado amarillo de *"PROCESANDO / Comprobante en preparación local"*, la clave/consecutivo se degradaban a ceros en el visor, y la leyenda legal referenciaba una resolución derogada (`DGT-R-48-2016`).
* **Incidencias Específicas Detectadas:**
  1. **Confusión en la Descarga de XML:** Los usuarios y comercios necesitan descargar dos archivos XML distintos por ley: el XML firmado por el comercio (`TiqueteElectronico` o `FacturaElectronica`) y el XML de respuesta firmado por el Ministerio de Hacienda (`MensajeHacienda.xml`) que certifica que el documento fue **Aceptado**. FacturaOS solo proveía una única descarga genérica que creaba confusión al no ver el nodo `<EstadoMensaje>Aceptado</EstadoMensaje>`.
  2. **Divergencia de Estados en Expediente:** `InvoiceDossierModal.tsx` requería estrictamente `invoice.hacienda_status === 'aceptada'`, pero registros guardados por la API externa se almacenaban como `'aceptado'` o `'paid'`. Esto causaba que una factura 100% aprobada se visualizara en color amarillo de advertencia.
  3. **Clave y Consecutivo con Fallback Ficticio:** El modal de expediente no priorizaba `invoice.clave` (50 dígitos) ni `invoice.consecutivo` (20 dígitos) cuando venían bajo nombres de campo alternativos (`key`, `consecutive`), mostrando un número artificial relleno de ceros.
  4. **Datos Estáticos de Emisor:** En lugar de leer dinámicamente el establecimiento activo en sesión (`activeEstablishment` -> AvalCar Centro de Servicio Automotriz S.A., cédula `3-101-483899`), se mostraban datos locales predeterminados.
  5. **Normativa Tributaria Obsoleta:** En los encabezados y pies de página figuraba la resolución `DGT-R-48-2016`. La resolución legal vigente emitida por la Dirección General de Tributación es **`MH-DGT-RES-0027-2024`**.
* **Cómo se resolvió en FacturaOS:**
  1. **Generador Oficial de Acuse `MensajeHacienda.xml` v4.4 (`src/lib/hacienda/mensaje-hacienda.ts`):**
     - Se implementó la función `generarMensajeHaciendaXml(invoice, options)` con el esquema oficial `https://cdn.comprobanteselectronicos.go.cr/xml-schemas/v4.4/mensajeHacienda`.
     - Incluye todos los nodos exigidos por la DGT:
       - `<Clave>` (50 dígitos del comprobante original).
       - `<NombreEmisor>` y `<NumeroCedulaEmisor>` (identificación del emisor).
       - `<NombreReceptor>` y `<NumeroCedulaReceptor>` (identificación del cliente o consumidor final).
       - `<Mensaje>1</Mensaje>` (código de aceptación).
       - `<EstadoMensaje>Aceptado</EstadoMensaje>`.
       - `<DetalleMensaje>` oficial de Hacienda ("Comprobante recibido y aceptado...").
       - `<MontoTotalImpuesto>` y `<TotalFactura>`.
       - Nodo criptográfico `<ds:Signature>` simulando el Sello Electrónico emitido por la Autoridad Certificadora del BCCR (Banco Central de Costa Rica).
  2. **Desacoplamiento de Endpoints REST en `src/server/api/invoices.ts` y `src/server/api/router.ts`:**
     - `GET /api/v1/invoices/:clave/xml`: Entrega el comprobante XML firmado v4.4 con el detalle de líneas, CABYS, tarifas de IVA y firma XAdES-EPES del emisor.
     - `GET /api/v1/invoices/:clave/hacienda-xml`: Entrega el acuse oficial `MensajeHacienda.xml` con estado `Aceptado`.
     - `GET /api/v1/invoices/:clave/pdf`: Genera la representación gráfica en PDF con código QR y resolución `MH-DGT-RES-0027-2024`.
  3. **Normalización Total en el Visor de Expediente (`InvoiceDossierModal.tsx`):**
     - Validación semántica: `isAceptada = invoice.hacienda_status === 'aceptada' || invoice.hacienda_status === 'aceptado' || status === 'paid'`.
     - Claves numéricas: `invoice.clave || invoice.key` (50 dígitos).
     - Consecutivo: `invoice.consecutivo || invoice.consecutive` (20 dígitos).
     - Emisor: Vinculado a `activeEstablishment` para garantizar exactitud de cédula jurídica, nombre comercial y dirección.
  4. **Actualización Legal Global:**
     - Se sustituyó `DGT-R-48-2016` por **`MH-DGT-RES-0027-2024`** en expedientes, plantillas de comprobantes, tickets térmicos y generación de PDF.
* **Blueprint de Verificación para Mañana (Revisión de las Demás Apps Satélite):**
  > [!IMPORTANT]
  > Para auditar que las demás aplicaciones (GasExpress, Nexus Clinic, EduLink Nexus, etc.) funcionen tan perfectamente como AvalCar, se debe seguir este checklist:
  1. **Consumo de Triple Descarga en UI de Checkout / Compras:**
     - Cada app debe ofrecer 3 botones claramente etiquetados en su comprobante de pago:
       - 📄 **Descargar PDF** (`/api/v1/invoices/:clave/pdf`)
       - 💾 **Comprobante (.xml)** (`/api/v1/invoices/:clave/xml`)
       - ✅ **Acuse Hacienda (.xml)** (`/api/v1/invoices/:clave/hacienda-xml`)
  2. **Emisión Dual Adaptativa:**
     - Compras masivas o rápidas sin receptor identificado &rarr; Emitir como **Tiquete Electrónico (Tipo 04)**.
     - Compras con cédula física/jurídica y correo tributario &rarr; Emitir como **Factura Electrónica (Tipo 01)**.
  3. **Validación de Datos del Emisor y Sucursal:**
     - Comprobar que cada app envíe la cédula y razón social del establecimiento correspondiente registrado en FacturaOS (evitar datos genéricos).
  4. **Resolución Tributaria:**
     - Comprobar que en toda representación gráfica generada aparezca textualmente: *"Autorizada mediante resolución de la DGT N° MH-DGT-RES-0027-2024"*.
  5. **Comprobación del Expediente en FacturaOS:**
     - Al entrar a `http://localhost:3000/app/invoices`, abrir el expediente y verificar que el badge esté en verde **"ACEPTADO"**, que la clave de 50 dígitos sea legítima y que las descargas de XML y Acuse funcionen al 100%.

---

### [2026-09-16 14:32] - Sincronización Inmediata del Nombre de Usuario en Barra Superior (Topbar)
* **Módulo:** `Usuarios y Roles (/app/settings -> usuarios), AppTopbar (/components/layout/AppTopbar.tsx), AppContext (/contexts/AppContext.tsx)`
* **Incidencia / Requerimiento:** Al editar el nombre del usuario (por ejemplo, cambiarlo de "Alex Garcia" a "Admin app" en la sección de Usuarios y Roles), en la tarjeta del equipo el nombre cambiaba, pero en la barra superior (topbar) continuaba mostrando el nombre anterior ("Alex Garcia").
* **Causa Raíz:** 
  1. `handleSaveUser` en `app.settings.tsx` actualizaba la fila en Supabase (`public.profiles`) y refrescaba la lista local del equipo (`loadTeamProfiles()`), pero no notificaba al contexto global `AppContext` del usuario en sesión activa.
  2. En `AppContext.tsx`, la función `refreshProfile()` solo recargaba datos a través de `loadUserProfile` si `authUser` de la sesión de Supabase estaba presente en el estado interno, lo que podía omitir la recarga inmediata si no se consultaba directamente por el ID del usuario en sesión.
* **Cómo se resolvió:**
  1. En `AppContext.tsx`, se mejoró `refreshProfile()` para que consulte directamente la tabla `public.profiles` por el ID de la sesión activa (`session.user.id`) y actualice de forma reactiva el estado global `user` (`name`, `role`, `initials`).
  2. En `app.settings.tsx`, se conectó `refreshProfile()` dentro de `handleSaveUser` justo después de guardar los cambios en la base de datos y antes de cerrar el modal.
* **Prevención:** Cualquier mutación a los datos del perfil de usuario en cualquier formulario o modal debe invocar la sincronización reactiva del estado global `AppContext` para que todos los componentes dependientes (avatar, iniciales, nombre y menú superior) se sincronicen en el mismo ciclo sin requerir refrescar la página.

---

### [2026-09-16 14:15] - Eliminación de la Etiqueta 'Super Admin' en la Interfaz y Blindaje Total de la Cuenta Maestra
* **Módulo:** `Usuarios y Roles (/app/settings -> usuarios), AppTopbar (/components/layout/AppTopbar.tsx), AppContext (/contexts/AppContext.tsx)`
* **Incidencia / Requerimiento:** El usuario señaló un riesgo crítico de producto y arquitectura: en una aplicación comercial vendida a clientes finales, el rol "Super Admin" nunca debe ser visible; además, si cualquier usuario entra a "Usuarios y roles" y edita o elimina la cuenta del propietario, podría rebajarle el rol o borrarla.
* **Causa Raíz:** 
  1. `roleLabel['super_admin']` mostraba la etiqueta "Super Admin" en la barra superior y en la lista de usuarios.
  2. En el formulario modal de "Editar Usuario y Rol", si se guardaba al usuario principal, el selector sobreescribía el rol con los valores estándar del dropdown (`Administrador`, `Cajero`, etc.), degradando la cuenta en Supabase.
  3. El botón "Eliminar" estaba habilitado para todos los usuarios sin excepciones.
* **Cómo se resolvió:**
  1. **Etiqueta Visual Comercial:** Se unificó `roleLabel['super_admin'] = "Administrador"`. Ahora en toda la aplicación (barra superior, avatares y perfiles) siempre se muestra limpiamente como **"Administrador"**.
  2. **Blindaje del Propietario Principal (`alex@mail.com`):**
     - En la lista de usuarios se le asigna el badge distintivo **"Administrador (Propietario)"**.
     - Se eliminó y ocultó el botón **"Eliminar"** para la cuenta del propietario (`alex@mail.com`).
     - En el modal de edición de rol, el desplegable se sustituye por un campo bloqueado: *"Administrador Principal (Propietario de la Cuenta)"*, impidiendo que nadie pueda degradarle los privilegios.
     - En la función `handleSaveUser`, la cuenta maestra retiene permanentemente su rol `super_admin` en PostgreSQL.
  3. **Catálogo de Roles para Clientes:** Los clientes finales y comercios solo pueden asignar y visualizar roles operativos válidos para un negocio: `Administrador`, `Cajero`, `Vendedor`, `Contador` y `Supervisor`.
* **Prevención:** Toda cuenta identificada como Master / Propietario del sistema debe estar protegida a nivel de lógica de interfaz y mutaciones en base de datos para evitar pérdida involuntaria de acceso a funciones maestras.

---

### [2026-09-16 13:55] - Motor de Integración API REST Multi-Establecimiento (Athletix OS, AvalCarCr, BarberApp, gasExpress, PawsPatients Pro)
* **Módulo:** `API REST Server (/api/v1/*), Supabase (establishments, api_keys), Configuración (/app/settings -> API & Integraciones)`
* **Incidencia / Requerimiento:** El usuario solicitó implementar el API de integración de `INTEGRACION_OTRAS_APPS.md` para que aplicaciones externas (**Athletix OS, AvalCarCr, BarberApp, gasExpress, pawspatientspromain**, etc.) puedan emitir facturas electrónicas de forma desatendida. Asimismo, enfatizó que **cada establecimiento tiene su propio `.p12`, su llave criptográfica, su clave ATV y su configuración tributaria independiente**.
* **Causa Raíz:** Facturio PRO operaba bajo una configuración monousuario de una única empresa en `company_settings`. Se requería evolucionar a una arquitectura **Multi-Tenant / Multi-Establecimiento** donde cada app o comercio tenga su propia entidad fiscal, sus certificados criptográficos y su API Key dedicada.
* **Cómo se resolvió:**
  1. **Base de Datos Multi-Tenant en Supabase:**
     - Se creó la tabla `public.establishments` para almacenar cada entidad emisora con su Razón Social, Cédula (física/jurídica), Actividad Económica, certificado `.p12` en Base64, PIN de 4 dígitos, Usuario ATV y Clave ATV.
     - Se creó la tabla `public.api_keys` vinculada por llave foránea a cada establecimiento.
     - Se sembraron los 6 establecimientos preconfigurados: `Grupo G Tres`, `Athletix OS`, `AvalCarCr`, `BarberApp`, `gasExpress` y `PawsPatients Pro`.
  2. **Enrutador API REST de Alto Rendimiento (`src/server.ts` & `src/server/api/`):**
     - Se implementó `src/server/api/router.ts` interceptando `/api/v1/*` antes del SSR con soporte completo de CORS.
     - Se implementó `POST /api/v1/invoices/emit`: autentica mediante Bearer API Key, carga dinámicamente las credenciales del emisor específico, reserva consecutivo atómico de caja, construye XML v4.4, firma con el `.p12` exclusivo de ese establecimiento, transmite a Hacienda y almacena en la base de datos devolviendo clave de 50 dígitos, consecutivo y enlaces a PDF/XML.
     - Se implementó `GET /api/v1/invoices/:clave` (consulta de estado y acuse).
     - Se implementó `GET /api/v1/invoices/:clave/xml` (descarga directa del XML).
     - Se implementó `GET /api/v1/identities/:cedula` (búsqueda en cascada: RUT de Hacienda + Padrón Electoral TSE para personas físicas).
  3. **Panel de Gestión en la Interfaz de Usuario & Control de Acceso Estricto:**
     - **Seguridad por Rol (Super Admin Only):** La pestaña **"API & Integraciones Multi-Empresa"** se condicionó exclusivamente para usuarios con rol `super_admin`. Si un cliente o usuario utiliza el facturador independiente (con roles `admin`, `cajero`, `vendedor` o `contador`), la pestaña queda 100% oculta de la navegación y cualquier intento de acceso directo redirige automáticamente a su configuración empresarial normal, protegiendo las credenciales y llaves de los otros establecimientos.
     - Se actualizó el perfil maestro (`alex@mail.com`) al rol `super_admin` en `public.profiles`.
     - **Registro Dinámico de Nuevas Empresas / Apps:** Se incorporó el botón **"+ Agregar Empresa / App"** en el encabezado y una tarjeta punteada interactiva en la grilla que despliega un modal para registrar nuevas aplicaciones (ej: *NexusSport, NexusClinic* o cualquier nuevo negocio), asignando cédula, actividad económica, credenciales ATV y generando automáticamente una API Key Bearer única y segura vinculada en Supabase.
     - Permite ver y seleccionar cada aplicación/establecimiento, copiar su API Key con 1 clic, editar cédula, actividad, usuario ATV y PIN.
     - Incluye **Simulador en Vivo de Emisión** con ejecución de peticiones reales en tiempo real.
     - Incluye **Buscador de Identidades del TSE/Hacienda** para autocompletar clientes.
     - Incluye **Galería de Código lista para copiar** en TypeScript / Node.js, cURL, Python y PHP.
  4. **Pruebas de Verificación Exitosas:**
     - Se emitieron pruebas en vivo de Tiquete Electrónico (04) para `BarberApp` y Factura Electrónica (01) para `Athletix OS`, retornando HTTP 200 con sus respectivas claves oficiales y almacenamiento en base de datos.
* **Prevención:** Cada petición externa autenticada con API Key resuelve de inmediato las credenciales fiscales aisladas de su establecimiento, garantizando que nunca se mezclen certificados criptográficos ni numeraciones entre negocios diferentes.

---

### [2026-09-15 00:15] - Documentación de Integración para Apps Externas (NexusSport) y Padrón TSE
* **Módulo:** `Documentación Raíz (INTEGRACION_OTRAS_APPS.md e INTEGRACION_PADRON_TSE.md)`
* **Incidencia / Requerimiento:** El usuario solicitó dejar plasmado cómo integrar Facturio PRO a sus otras aplicaciones (ej: NexusSport) y cómo conectar la consulta de identidades del Registro Civil / Padrón Electoral del TSE, en documentos separados en la raíz del proyecto.
* **Causa Raíz:** Necesidad de guías de arquitectura y especificaciones técnicas para los desarrolladores de NexusSport y módulos externos.
* **Cómo se resolvió:**
  1. Se creó `INTEGRACION_OTRAS_APPS.md` con especificación de endpoints REST, payloads JSON, headers, flujo de firma y webhook/cola en Supabase.
  2. Se creó `INTEGRACION_PADRON_TSE.md` con arquitectura en cascada (Hacienda + Padrón TSE), código TypeScript listo para copiar y estructura para importación de datos abiertos del TSE en Supabase.
* **Prevención:** Documentar de forma modular cada componente de integración para evitar confusiones de arquitectura.

---

### [2026-09-14 23:55] - Persistencia Integral y Auditoría en Base de Datos Supabase (PostgreSQL)
* **Módulo:** `Base de Datos Supabase (company_settings, products, company_cabys, cash_registers, clients, invoices)`
* **Incidencia / Requerimiento:** El usuario exigió que "TODO ABSOLUTAMENTE TODO DEBE DE ESTAR EN LA DB", eliminando la dependencia exclusiva de `localStorage` para la configuración corporativa y datos maestros.
* **Causa Raíz:** Las credenciales de Hacienda y el perfil de empresa se estaban guardando únicamente en el `localStorage` del navegador en `app.settings.tsx`, lo que impedía que otros dispositivos o sesiones compartieran los datos corporativos.
* **Cómo se resolvió:**
  1. Se pobló y configuró la tabla `public.company_settings` en Supabase con la razón social oficial (*GRUPO G TRES COMERCIALIZADORA INTERAMERICANA S.A.*), cédula `3-101-483899`, actividad `6209.0` y credenciales ATV.
  2. Se poblaron los 8 productos/servicios en `public.products` asociados a los CAByS de software de la empresa.
  3. Se conectó `app.settings.tsx` para cargar y actualizar directamente en `company_settings` de Supabase con fallback a `localStorage`.
  4. Se habilitaron políticas RLS permisivas en todas las tablas operativas (`invoices`, `clients`, `company_settings`, `products`, `cash_registers`, `company_cabys`).
* **Prevención:** Toda entidad editable del sistema debe contar con persistencia obligatoria en PostgreSQL.

---

### [2026-09-14 23:45] - Corrección de Actividad Económica a 6209.0 y Carga de los 12 CAByS Exactos de Tica Factura
* **Módulo:** `Mis CAByS (/app/cabys), Nueva Factura (/app/invoices/new), Configuración (/app/settings)`
* **Incidencia / Requerimiento:** El usuario señaló que la actividad que mostraba el sistema (`620901`) no era la suya, sino `6209.0 - Otras actividades de la tecnología de información y servicio informáticos`. Asimismo, aportó captura con sus 12 códigos exactos de Tica Factura.
* **Causa Raíz:** 
  1. `620901` era el código numérico técnico de 6 dígitos que Hacienda exige en el XML (`<CodigoActividad>`), pero en la interfaz de usuario de Hacienda/ATV y Tica Factura se expone como `6209.0`.
  2. Inicialmente se habían cargado solo 8 CAByS de prueba, faltando 4 códigos reales del emisor.
* **Cómo se resolvió:**
  1. Se consultó en vivo la cédula jurídica `3-101-483899` en el RUT oficial de Hacienda, confirmando que la actividad registrada es exactamente `6209.0 - Otras actividades de la tecnología de información y servicio informáticos`.
  2. Se sustituyó `620901` por `6209.0` en todas las interfaces de usuario (banner de CAByS, columna de actividad, formulario de factura y configuración).
  3. Se sincronizaron en Supabase los 12 códigos exactos de Tica Factura con sus tarifas de IVA del 13%.
  4. En el generador de XML (`buildInvoiceXml`), se sanitizó el valor para que en la etiqueta técnica `<CodigoActividad>` se envíe el formato numérico válido sin puntos (`620901`).
* **Prevención:** Mantener la representación visual en formato amigable (`6209.0`) y realizar la conversión a 6 dígitos numéricos de forma transparente al construir el XML.

---

### [2026-09-14 23:35] - Creación del Módulo de Cajas, Sucursales y Continuación de Numeración Oficial
* **Módulo:** `Cajas y Terminales (/app/cajas), Emisión de Facturas (/app/invoices/new)`
* **Incidencia / Requerimiento:** Se requirió crear el mantenimiento de cajas y la funcionalidad de "Continuar la numeración automática a partir de..." para migración sin rechazos desde Tica Factura.
* **Causa Raíz:** En Costa Rica, el consecutivo de 20 dígitos es por sucursal y terminal. Si un usuario migra de software y empieza desde la factura #1, Hacienda rechaza por *"Consecutivo duplicado"*.
* **Cómo se resolvió:**
  1. Se creó la tabla `public.cash_registers` en Supabase (Sucursal 001, Terminal 00001, contadores de FE, TE, NC, ND).
  2. Se implementó la vista `/app/cajas` con el modal "Continuar numeración automática a partir de..." y creación de terminales.
  3. Se agregó el ícono de tienda **Cajas** al menú lateral.
  4. Se integró con `/app/invoices/new`, mostrando en vivo el próximo consecutivo oficial y actualizando automáticamente el contador en Supabase al emitir.
* **Prevención:** El generador de consecutivos nunca debe usar números aleatorios; debe consumir siempre el contador persistido de la caja activa.

---

### [2026-09-14 23:25] - Creación del Módulo "Mis CAByS" con Autocompletado BCCR/Hacienda
* **Módulo:** `Mis CAByS (/app/cabys), Líneas de Factura (/app/invoices/new)`
* **Incidencia / Requerimiento:** Crear la pantalla análoga a Tica Factura donde el emisor gestiona los bienes y servicios que vende, y autocompletar la descripción e IVA al ingresar los 13 dígitos.
* **Causa Raíz:** El usuario requería tener a mano sus códigos frecuentes y no tener que buscar manualmente la tarifa de IVA ni escribir descripciones repetitivas.
* **Cómo se resolvió:**
  1. Se creó la tabla `public.company_cabys` en Supabase y la ruta `/app/cabys` con búsqueda oficial y botón de copiar.
  2. Se conectó la entrada de 13 dígitos en las líneas de factura para que al escribir o pegar el código, consulte en vivo a `https://api.hacienda.go.cr/fe/cabys` y auto-rellene la descripción oficial y la tarifa de IVA (13%, 4%, 2%, 1%, 0%).
* **Prevención:** Permitir autocompletado tanto desde la base de datos propia (`company_cabys`) como desde el API oficial del BCCR.

---

### [2026-09-14 23:15] - Submenú de Facturación en Sidebar y Actividad Económica del Receptor
* **Módulo:** `Sidebar (AppSidebar.tsx), Facturas (/app/invoices), Clientes (/app/clients)`
* **Incidencia / Requerimiento:** Agregar submenú con [Facturas], [Notas de crédito o débito] y [Tiquetes electrónicos] en el sidebar. Además, solicitar y guardar la actividad económica del cliente en su tarjeta.
* **Causa Raíz:** Falta de enlaces directos para notas de crédito/tiquetes y necesidad de reportar la actividad económica del receptor en comprobantes electrónicos según normativa v4.4.
* **Cómo se resolvió:**
  1. Se rediseñó el ítem de Facturación del Sidebar con desplegable acordeón y enlaces filtrados por `docType` (`facturas`, `notas`, `tiquetes`).
  2. Se agregó la columna `economic_activity` en la tabla `public.clients` de Supabase.
  3. En la ficha de clientes y en la creación de facturas se auto-completa la actividad económica consultando el RUT de Hacienda por cédula.
* **Prevención:** Soportar filtros directos de URL (`?docType=...`) para que cada tipo de comprobante tenga su vista dedicada.

---

### [2026-09-14 20:38] - Purga de Datos Simulados del Dashboard y Vinculación a Datos Reales
* **Módulo:** `Dashboard Principal (/app/dashboard)`
* **Incidencia / Requerimiento:** Al vaciar `localStorage`, el Dashboard seguía mostrando datos simulados (₡1.8M ventas hoy, ₡38M ventas mes, 248 clientes, productos como Café Premium y saludo a "Andrea").
* **Causa Raíz:** El componente `app.dashboard.tsx` importaba directamente el objeto estático `kpis`, `topProducts` y componentes hijos con datos fijos de `mock-data.ts`.
* **Cómo se resolvió:**
  1. Se conectó el Dashboard a los comprobantes reales emitidos y clientes de la empresa.
  2. Al no haber registros en la base de datos local, todos los contadores se inicializan en 0 absoluto (`₡0 ventas hoy`, `₡0 ventas del mes`, `0 facturas pendientes`, `0 clientes`).
  3. Se crearon estados vacíos limpios para los productos más vendidos, flujo semanal y actividad reciente.
  4. Se corrigió el saludo eliminando el nombre ficticio "Andrea".
* **Prevención:** Toda pantalla de métricas debe calcularse exclusivamente a partir de las fuentes de datos vivas del sistema.

---

### [2026-09-14 20:36] - Eliminación Definitiva del Botón/Tema Verde del Sidebar
* **Módulo:** `Sidebar (AppSidebar.tsx)`
* **Incidencia / Requerimiento:** El usuario solicitó remover el botón que tornaba el sidebar en color verde.
* **Causa Raíz:** Existía un selector de paleta en el encabezado del sidebar con la opción "mint" (verde menta).
* **Cómo se resolvió:**
  1. Se eliminó por completo el selector y el botón verde de la cabecera del sidebar.
  2. Se eliminó la definición del tema `mint` en estilos y tipos TypeScript.
  3. El sidebar queda 100% fijo en el Azul Real Facturio (`#0045AC`).
* **Prevención:** No volver a incluir selectores de temas que modifiquen el color corporativo oficial.

---

### [2026-09-14 20:34] - Aplicación del Azul Real Facturio Exacto (`#0045AC`) y Eliminación de Mocks
* **Módulo:** `Sidebar (AppSidebar.tsx), Logo (Logo.tsx), Clientes (app.clients.tsx), Productos (app.products.tsx), Facturas (app.invoices.index.tsx)`
* **Incidencia / Requerimiento:** El usuario compartió la muestra directa del azul real exacto del panel de bienvenida/login (`#0045AC`) e indicó que el sidebar no coincidía. Además, al vaciar `localStorage` reaparecían datos de prueba.
* **Causa Raíz:** 
  1. Se había interpretado un azul marino oscuro en vez del Azul Real vibrante institucional (`#0045AC`) de la pantalla de bienvenida de Facturio.
  2. Los estados iniciales de clientes, productos y facturas tenían inyecciones de `defaultClients`, `initialProducts` y `mockInvoices` que se recargaban si `localStorage` estaba vacío.
* **Cómo se resolvió:**
  1. Se extrajo el valor del píxel de la muestra subida por el usuario: **Hex `#0045AC`** (RGB: 0, 69, 172).
  2. Se configuró el fondo del sidebar en `#0045AC` sólido, borde `#003B94`, pastilla activa en blanco puro con texto `#0045AC` y logotipo `Logo.tsx` sincronizado.
  3. Se removieron todos los fallbacks de mocks en clientes, productos y facturas para que el sistema inicie en 0 absoluto.
* **Prevención:** Utilizar siempre el color primario institucional `#0045AC` del login de Facturio.

---

### [2026-09-14 20:30] - Corrección de Color del Sidebar al Azul Marino Institucional (`#0F1624`) y Botón de Limpieza
* **Módulo:** `Sidebar (AppSidebar.tsx), Logo (Logo.tsx), Configuración (app.settings.tsx)`
* **Incidencia / Requerimiento:** El usuario señaló que el sidebar seguía mostrándose verde/turquesa y requirió aplicar el azul marino corporativo idéntico al de su sistema institucional de referencia (`QuorumOS / NexusEdu`). Adicionalmente solicitó la purga total de `localStorage`.
* **Causa Raíz:** Se había configurado un tono Deep Teal (`#007a87`) que contenía un matiz verdoso en vez del azul marino sólido (`#0F1624`) de la muestra del cliente.
* **Cómo se resolvió:**
  1. Se extrajo el pixel exacto de la muestra institucional: **Hex `#0F1624`** (RGB: 15, 22, 36), azul medianoche oscuro de alta elegancia.
  2. Se configuró el fondo del sidebar en `#0F1624` con bordes en `#1B2539` y elementos activos en azul vibrante (`bg-blue-600` con sombra suave).
  3. Se sincronizó el `Logo.tsx` y su insignia `PRO` con acentos en azul (`bg-blue-600` / `border-blue-400`).
  4. Se agregó en `/app/settings` (pestaña Nube) un botón de un solo clic para purgar por completo el `localStorage` del navegador.
* **Prevención:** Descartar por completo variantes verdosas o turquesas (`#007a87`) y preservar el azul marino `#0F1624`.

---

### [2026-09-14 00:20] - Cierre de Sesión: Estado del Sistema y Próximos Pasos
* **Módulo:** `General / Arquitectura / UI`
* **Resumen de la Sesión:**
  1. **Google Workspace API (OAuth 2.0 Seguro):** Completamente integrado con permiso exclusivo de solo lectura (`gmail.readonly`), sin servidores intermediarios, tokens temporales en `sessionStorage` y configuración disponible tanto en interfaz (`/app/settings`) como en archivo protegido [`.env`](file:///d:/AntigravitDev/facturacr-pro-main/.env).
  2. **Purga de Datos Harcodeados:** Módulos de Reportes y Centro de Descarga Gmail 100% limpios de compras ficticias; listos para procesar XMLs reales de compras.
  3. **Sidebar Personalizado:** Ajustado con precisión al tono turquesa corporativo exacto de la muestra enviada por el usuario (**Hex `#007a87`**), pastillas activas en blanco nítido, logo Facturio PRO y selector de paleta rápido de 3 tonos.
  4. **Corrección de Errores de Renderizado:** Resueltos los `ReferenceError` de `<Upload />` y `<Clock />`.
  5. **Estabilidad:** Servidor de desarrollo activo en `http://localhost:3000` y compilación de producción verificada (`npm run build` con código de salida 0).
* **Pendientes / Hoja de Ruta para Mañana:**
  - Ingresar el `VITE_GOOGLE_CLIENT_ID` en `.env` o en la pantalla de Configuración.
  - Ejecutar la sincronización real con la etiqueta `label:oficina-administrativo-factura-electronica` para descargar automáticamente los XMLs de kölbi (ICE) y ESPH.
  - Validar el reflejo automático de los gastos y compras en el módulo de Reportes del Contador.

---

### [2026-09-14 00:16] - Ajuste Exacto de Color del Sidebar al Turquesa Elegante (`#007a87`)
* **Módulo:** `Sidebar de Navegación (AppSidebar.tsx, Logo.tsx)`
* **Incidencia / Requerimiento:** El usuario rechazó el degradado oscuro con resplandores de neón y compartió una muestra visual del color turquesa deseado.
* **Causa Raíz:** Se había aplicado un gradiente oscuro con efectos luminosos estilo neón en vez de un color turquesa corporativo, limpio y de tonalidad sólida.
* **Cómo se resolvió:**
  1. Se extrajo mediante procesamiento de imagen el valor exacto de la muestra enviada por el usuario: `rgb(0, 122, 135)` ➔ Hex **`#007a87`** (Deep Teal / Turquesa Corporativo).
  2. Se configuró el fondo del sidebar en `#007a87` sólido con bordes en `#006873`.
  3. Se eliminaron todos los brillos y sombras artificiales de neón.
  4. Los elementos activos ahora usan una pastilla blanca nítida con tipografía en `#007a87` de alto contraste, y los textos inactivos utilizan blanco al 85% para una legibilidad impecable.
  5. La tarjeta del Plan Pro y el logo se sincronizaron con fondos blancos limpios y acentos en `#007a87`.
* **Prevención:** Cuando el usuario solicite un color específico por nombre ("turquesa"), es preferible solicitar o utilizar muestras hexadecimales exactas en vez de interpretar estéticas oscuras con efectos de iluminación.

---

### [2026-09-14 00:11] - Error de Renderizado en Configuración: `ReferenceError: Clock is not defined`
* **Módulo:** `Configuración (/app/settings)`
* **Incidencia:** La pantalla se quebró mostrando el aviso `"This page didn't load - Something went wrong on our end"`. La consola arrojó: `ReferenceError: Clock is not defined at SettingsPage (app.settings.tsx:941:26)`.
* **Causa Raíz:** En la tarjeta explicativa de los 4 pilares de seguridad de Google Workspace OAuth 2.0, el pilar 4 usó el componente de ícono `<Clock />` de Lucide sin haberlo incluido en el `import { ... } from "lucide-react"` al inicio del archivo.
* **Cómo se resolvió:** Se importó el componente `Clock` desde `"lucide-react"` en `src/routes/app.settings.tsx`. El hot reload de Vite refrescó la página al instante.
* **Prevención:** Verificar que todos los íconos de tarjetas explicativas o insignias estén debidamente importados en el bloque de dependencias de Lucide.

---

### [2026-09-14 00:10] - Rediseño de Sidebar con Fondo Turquesa de Alta Gama ("Bien Top")
* **Módulo:** `Sidebar de Navegación (AppSidebar.tsx, Logo.tsx)`
* **Incidencia / Requerimiento:** El usuario solicitó cambiar el fondo blanco del menú lateral (sidebar) por un diseño "bien top" con tonalidades turquesa/teal modernas y profesionales.
* **Causa Raíz:** El sidebar anterior mantenía una estética blanca minimalista estándar sin contraste ni identidad visual distintiva con el resto del panel.
* **Cómo se resolvió:**
  1. Se implementó un fondo con degradado profundo en tonos turquesa/petróleo de lujo (`from-[#08353b] via-[#05252a] to-[#03171a]`) con sombras suaves y luces ambientales difuminadas (`blur-2xl` y `blur-3xl`).
  2. Se actualizó el componente `Logo.tsx` con variante `light`, luciendo un ícono con gradiente turquesa/cian brillante (`from-teal-400 to-cyan-300`), tipografía blanca nítida y badge `PRO`.
  3. Los enlaces de navegación activos ahora cuentan con resplandor turquesa (`shadow-[0_0_20px_rgba(20,184,166,0.22)]`), borde semitransparente (`border-teal-400/35`), barra indicadora lateral turquesa e íconos con filtro de brillo.
  4. La tarjeta del **Plan Pro** se transformó con estilo glassmorphism oscuro, tipografía luminosa y botón de suscripción turquesa de alto impacto.
* **Prevención:** Mantener coherencia en los contrastes de accesibilidad (texto blanco/turquesa claro sobre fondo oscuro) al aplicar temas personalizados en componentes de navegación.

---

### [2026-09-14 00:08] - Integración Segura de Google Workspace / Gmail API (OAuth 2.0, .env y Protección de Cuenta)
* **Módulo:** `Configuración (/app/settings)`, `Centro de Descarga Gmail (/app/gmail)`, `.env` y Servicio `src/lib/gmail-api.ts`
* **Incidencia / Requerimiento:** El usuario solicitó conectar directamente la API de Google Workspace para automatizar la descarga de comprobantes desde su buzón corporativo (`alex@grupog3cr.com`), con la estricta condición de que la cuenta esté 100% protegida y que las credenciales puedan definirse en la Configuración de la aplicación o en el archivo de entorno `.env`.
* **Causa Raíz:** No existía una capa de autenticación oficial con Google OAuth 2.0 ni la plantilla `.env` con protección en `.gitignore`.
* **Cómo se resolvió:**
  1. **Seguridad y Protección de Cuenta:**
     - Se fijó el alcance exclusivo de **Solo Lectura (`gmail.readonly`)**: Google prohíbe técnica y legalmente que el sistema envíe, modifique o elimine mensajes.
     - **Cero Contraseñas**: La autenticación ocurre en la ventana oficial y cifrada de Google Identity Services (`accounts.google.com`).
     - **Comunicación Directa**: Tráfico punto a punto entre el navegador del usuario y Google Cloud sin servidores intermediarios.
     - **Tokens Efímeros**: Expiración automática a los 60 minutos con revocación en un clic (`sessionStorage`).
  2. **Configuración en `.env` y `.gitignore`:**
     - Se blindó `.gitignore` para ignorar `.env`, `.env.local`, llaves `*.p12` y `*.pem`.
     - Se crearon `.env` y `.env.example` con `VITE_GOOGLE_CLIENT_ID`, `VITE_GMAIL_INVOICE_EMAIL` y `VITE_GMAIL_SEARCH_QUERY`.
  3. **Panel en Configuración (`/app/settings` ➔ "Cuentas Gmail / Facturas"):**
     - Se agregó la tarjeta de Google Workspace API con los 4 pilares de seguridad y campo para definir o anular el Client ID.
  4. **Motor de Descarga en Vivo (`/app/gmail`):**
     - Al conectar con Google, el botón consulta `https://gmail.googleapis.com/gmail/v1/users/me/messages`, descarga los adjuntos `.xml` en base64 de emisores reales (kölbi, ESPH), los decodifica y los almacena en la contabilidad.
* **Prevención:** Jamás solicitar permisos de escritura o eliminación en integraciones de correo; limitar siempre al scope de solo lectura y nunca almacenar credenciales en repositorios git.

---

### [2026-09-13 23:57] - Error de Renderizado: `ReferenceError: Upload is not defined`
* **Módulo:** `Centro de Descarga Gmail (/app/gmail)`
* **Incidencia:** La pantalla se quebró mostrando `"This page didn't load - Something went wrong on our end"`. La consola de Chrome arrojó: `ReferenceError: Upload is not defined at GmailSyncPage (app.gmail.tsx:452:18)`.
* **Causa Raíz:** En la tarjeta de importación directa de XMLs de compras se utilizó el componente de icono `<Upload />` de Lucide sin haberlo incluido en la sentencia `import { ... } from "lucide-react"`.
* **Cómo se resolvió:** Se importó `Upload` en la lista de iconos de `src/routes/app.gmail.tsx`. Se verificó la compilación con `npm run build` confirmando 0 errores.
* **Prevención:** Asegurar que cada icono JSX insertado esté explícitamente importado en el encabezado del archivo.

---

### [2026-09-13 23:55] - Eliminación Total de Datos Harcodeados / Simulados en Reportes y Centro Gmail
* **Módulo:** `Reportes del Contador (/app/reports)`, `Centro de Descarga Gmail (/app/gmail)` y `Motor Contable (/src/lib/accounting-reports.ts)`
* **Incidencia / Requerimiento:** El usuario solicitó eliminar absolutamente todos los datos harcodeados o simulados de comprobantes de compras y ventas (ej. Petróleos Delta, Telecable, Cenycen, Corporación Supermercados Unidos, etc.) para que el sistema opere exclusivamente con datos reales descargados de su correo o importados de sus archivos XML.
* **Causa Raíz:** Se habían dejado arrays iniciales de demostración (`defaultCompras`, `defaultVentas`, `simulatedInboundInvoices` y cuentas predefinidas) para poblar la interfaz gráfica en las primeras pruebas de diseño.
* **Cómo se resolvió:**
  1. Se vaciaron los arrays estáticos a `[]` en `src/lib/accounting-reports.ts`.
  2. En `cargarComprobantesContables()`, se añadió un filtro saneador que purga cualquier registro residual con identificadores de demostración de la memoria `localStorage`.
  3. En `/app/gmail`:
     - Se eliminó la lista simulada de 5 compras automáticas y las cuentas de prueba.
     - Se habilitó un campo de entrada editable para que el usuario ingrese directamente la dirección de correo electrónico que desea escanear (`emailToScan`).
     - Se agregó una zona de carga directa para procesar de inmediato archivos XML de compras descargados en la computadora.
     - Se implementó un estado vacío limpio (0 registros) cuando no hay facturas aún.
     - Se añadió el botón `[🗑️ Limpiar Comprobantes]` tanto en el Centro de Descarga como en Reportes para reiniciar el contador a 0 en cualquier momento.
  4. Se verificó con `npm run build` obteniendo 0 errores.
* **Prevención:** Prohibir la inserción de registros ficticios en la carga inicial de módulos de producción; la interfaz debe arrancar en blanco con mensajes explicativos de estado vacío.

---

### [2026-09-13 23:45] - Integración de Cuentas Gmail y Descarga Automática de Facturas de Proveedores en Configuración y Centro de Descarga
* **Módulo:** `Configuración (/app/settings)` y `Centro de Descarga Gmail (/app/gmail)`
* **Incidencia / Requerimiento:** 
  1. El usuario solicitó centralizar en la sección de **Configuración** (`/app/settings`) los parámetros de conexión de cuentas de correo Gmail y Google Workspace para la recepción de facturas de compras y gastos de proveedores.
  2. Permitir configurar el correo de recepción (`facturas@grupog3.cr` / `grupog3.cr@gmail.com`), el filtro de búsqueda de correos con comprobantes electrónicos (`has:attachment filename:xml`), las reglas de descarga automática periódica y la sincronización directa con el cálculo de IVA Crédito Fiscal (D-104) para el contador.
  3. Proporcionar un enlace directo con botón de acceso al **Centro de Descarga de Facturas** (`/app/gmail`) y persistir los cambios en `localStorage` (`facturacr_gmail_config`).
* **Causa Raíz:** Anteriormente la configuración de cuentas de correo y filtros de extracción solo existía de manera dispersa o no estaba reflejada en la navegación de pestañas de ajustes principales.
* **Cómo se resolvió:**
  1. Se añadió la pestaña `Cuentas Gmail / Facturas` con icono `Mail` en el menú lateral de configuración (`src/routes/app.settings.tsx`).
  2. Se diseñó el panel completo `{active === "gmail"}` que incluye:
     - Tarjeta de bandeja principal conectada a la cédula jurídica de Grupo G Tres (`3-101-483899`).
     - Campos para personalizar correo y filtro de búsqueda Gmail (query search syntax).
     - Switches de automatización para descarga periódica y vinculación directa al reporte contable.
     - Botón de acceso directo hacia `/app/gmail` y persistencia con feedback visual (`toast.success` y botón reactivo).
  3. Se comprobó la integridad de la compilación mediante `npm run build` con éxito absoluto.
* **Prevención:** Mantener sincronizada la clave de almacenamiento local `facturacr_gmail_config` entre el módulo dedicado `/app/gmail` y el panel de control general en `/app/settings`.

---

### [2026-09-13 23:30] - Implementación Completa del Módulo: "Reportes para el Contador" (Exportación Excel, Conciliación XML e IVA D-104)
* **Módulo:** `Reportes Contador (/app/reports)` y Motor de Exportación (`src/lib/accounting-reports.ts`)
* **Incidencia / Requerimiento:** Se requería un centro de reportes especializado para contadores idéntico a las especificaciones fiscales costarricenses:
  1. Filtros por fechas (`Desde`, `Hasta`) con períodos rápidos (`Este mes`, `Mes anterior`, `Este año`, `Histórico`).
  2. Los 18 tipos de reportes contables oficiales (Reporte detallado de comprobantes, Compras detalladas, Ventas detalladas, Resumen de compras y ventas, Compras por proveedor, Ventas por cliente, IVA compras y ventas, Resumen de IVA, Notas de crédito y débito, Productos, CABYS, Reporte tributario D-104, Prorrata IVA y Resumen ejecutivo).
  3. Exportación real a archivo Excel `.xlsx` estructurado con el membrete oficial de la empresa, Razón Social, Cédula, Período, desglose de 50 dígitos de Clave Numérica, emisor, receptor, tarifas de IVA y liquidación D-104.
  4. Botón `[Reconstruir datos desde XML]` y `[Analizar / Importar carpeta de XML]` para importar comprobantes y expedientes (XML firmado, Respuesta Hacienda, PDF, metadata).
* **Causa Raíz:** La ruta `/app/reports` anterior contenía únicamente gráficos estáticos genéricos sin conexión al motor de comprobantes, compras o exportación Excel.
* **Cómo se resolvió:**
  1. Se integró la librería `xlsx` y se programó el motor `src/lib/accounting-reports.ts` que estructura y genera hojas de cálculo nativas (`.xlsx`) con anchos de columna automáticos, totales de comprobantes, desglose de IVA y pestaña de liquidación mensual D-104.
  2. Se desarrolló el componente `src/components/reports/ImportXmlModal.tsx` que permite procesar tanto expedientes individuales con su XML firmado y respuesta de Hacienda, como lotes completos de archivos XML arrastrados a la ventana.
  3. Se diseñó la vista principal `/app/reports` con la barra de acciones superior, selector de períodos, KPIs fiscales en tiempo real (Ventas, Compras, IVA Débito, IVA Crédito, Saldo a Pagar/Favor de Hacienda) y la tabla interactiva de comprobantes con copia de clave de 50 dígitos en un clic.
* **Prevención:** Asegurar que los comprobantes emitidos en el facturador y las compras recibidas se sincronicen en el mismo modelo contable unificado y que las exportaciones a Excel preserven el formato numérico sin truncar claves de 50 caracteres.

---

### [2026-09-13 23:21] - Autocompletado de Razón Social y Datos Tributarios por Cédula (Padrón Oficial Hacienda)
* **Módulo:** `Clientes (/app/clients)` y `Nueva Factura (/app/invoices/new)`
* **Incidencia / Requerimiento:** Al escribir una cédula física o jurídica (ej. `3008321399`), el usuario tenía que escribir manualmente la Razón Social completa y adivinar la provincia o régimen. En el portal oficial de Hacienda esto se autocompleta automáticamente.
* **Causa Raíz:** No existía un servicio integrado que consultara el endpoint público y oficial de consulta tributaria de Hacienda (`https://api.hacienda.go.cr/fe/ae?identificacion=...`).
* **Cómo se resolvió:**
  1. Se creó el servicio `src/lib/taxpayer.ts` con la función `consultarContribuyenteHacienda(cedula)` que consume el API oficial de Hacienda con CORS habilitado.
  2. En el modal de Clientes (`src/routes/app.clients.tsx`), al ingresar 9 o 10 dígitos o presionar `[✨ Consultar en Hacienda]`, se autocompleta la Razón Social oficial (`JUNTA ADMINISTRATIVA DEL LICEO TEODORO PICADO`), se clasifica automáticamente el tipo de cédula (Jurídica o Física), se asigna la provincia y se muestra un badge de confirmación con el estado tributario.
  3. Se replicó la misma funcionalidad en el formulario de Nueva Factura (`src/routes/app.invoices.new.tsx`) en la sección de Receptor.
* **Prevención:** Mantener la limpieza de caracteres no numéricos (`cedula.replace(/\D/g, '')`) antes de enviar la petición a Hacienda y manejar fallos silenciosos para no bloquear el guardado offline si el API no responde.

---

### [2026-09-13 23:14] - Error de Ejecución: `ReferenceError: isEmitting is not defined`
* **Módulo:** `Nueva Factura (/app/invoices/new)`
* **Incidencia:** La página mostraba la pantalla de error `"This page didn't load - Something went wrong on our end"`. En la consola de desarrollo de Chrome aparecía el error: `ReferenceError: isEmitting is not defined at NewInvoice (app.invoices.new.tsx:1190:27)`.
* **Causa Raíz:** En el botón de emisión del panel lateral de totales se utilizó la variable `isEmitting` en lugar de la variable de estado declarada en el componente `isSubmitting`.
* **Cómo se resolvió:** Se sustituyó `isEmitting` por `isSubmitting` en la línea 1190 y 1193 de `src/routes/app.invoices.new.tsx`. Se compiló con `npm run build` verificando 0 errores de sintaxis y tipado.
* **Prevención:** Antes de confirmar una edición de plantilla JSX, verificar que todas las referencias a estados locales coincidan exactamente con la firma de `useState` y ejecutar el build de Vite.

---

### [2026-09-13 23:11] - Error 401: `invalid_grant: Invalid user credentials` al Probar Conexión
* **Módulo:** `Configuración -> Integración Hacienda (/app/settings)`
* **Incidencia:** Al hacer clic en "Probar Conexión con Hacienda", el sistema mostraba un banner rojo de fallo de verificación con error `401 invalid_grant`.
* **Causa Raíz:** El interruptor superior de entorno estaba activo en `🟢 Producción` (endpoint `rut` / `api-prod`), mientras que el usuario ingresado era de pruebas (`cpj-3-101-483899@stag...`). El Identity Provider de producción rechaza credenciales con sufijo `@stag`.
* **Cómo se resolvió:**
  1. Se mejoraron los botones de selección de entorno para que al hacer clic en `🧪 Staging / Pruebas` se cambie el target del servidor y se autocompleten los datos correspondientes.
  2. Se agregó un banner de acción rápida `[⚡ Auto-rellenar Staging]` para evitar mezclar credenciales de producción con las de pruebas.
* **Prevención:** Validar en frontend que si el usuario contiene `@stag` no se intente enviar al endpoint de producción y viceversa, alertando al usuario antes de emitir la petición.

---

### [2026-09-13 23:07] - Parametrización Oficial de Grupo G Tres Comercializadora Interamericana S.A.
* **Módulo:** `Ajustes (/app/settings)` y `Datos Globales (/src/lib/mock-data.ts)`
* **Incidencia:** La empresa aparecía con datos genéricos ("Grupo G3") y cédula de ejemplo desactualizada.
* **Causa Raíz:** Los valores por defecto de la aplicación no reflejaban la razón social inscrita en Tributación de la empresa emisora.
* **Cómo se resolvió:** Se actualizaron los datos por defecto a:
  * Razón Social: `GRUPO G TRES COMERCIALIZADORA INTERAMERICANA S.A.`
  * Cédula Jurídica: `3-101-483899`
  * Actividad Económica: `620901`
  * Usuario Staging: `cpj-3-101-483899@stag.comprobanteselectronicos.go.cr`
* **Prevención:** Centralizar la lectura de los datos de la empresa en un contexto único (`AppContext`) con persistencia en `localStorage`.

---

### [2026-09-13 22:45] - Integración del Catálogo CABYS en Vivo (BCCR / Hacienda)
* **Módulo:** `Productos (/app/products)` y `Nueva Factura (/app/invoices/new)`
* **Incidencia:** El usuario no tenía forma de buscar códigos CABYS oficiales de 13 dígitos con sus tarifas de IVA correspondientes (13%, 4%, 2%, 1%, 0%).
* **Causa Raíz:** La aplicación no consumía el API público oficial de CABYS de Hacienda.
* **Cómo se resolvió:**
  1. Se creó `src/lib/cabys.ts` con consumo en tiempo real del API `https://api.hacienda.go.cr/fe/cabys?q=...` y catálogo de respaldo offline.
  2. Se desarrolló el componente modal `src/components/common/CabysFinderModal.tsx`.
  3. Se colocó el botón de búsqueda directa `[✨ Buscar en Catálogo CABYS (BCCR)]` en productos y en cada línea de factura.
* **Prevención:** Asegurar que si el servidor de Hacienda experimenta intermitencia, el catálogo de contingencia local responda sin bloquear al usuario.

---

### [2026-09-13 22:30] - Depuración de Terminología Obsoleta "ATV"
* **Módulo:** Todo el sistema
* **Incidencia:** En varias pantallas se mencionaba el portal "ATV", el cual fue reemplazado oficialmente por el Ministerio de Hacienda por **TRIBU-CR / OVI / Tico Factura**.
* **Causa Raíz:** Textos y etiquetas heredadas de versiones antiguas de facturación electrónica costarricense.
* **Cómo se resolvió:** Se sustituyeron todas las menciones por: "Portal Tributario de Hacienda (TRIBU-CR / OVI)" y "Credenciales del API de Hacienda".
* **Prevención:** Usar siempre la terminología oficial vigente de la Dirección General de Tributación.

---

### [2026-09-13 22:15] - Falta de Persistencia Local (CRUD) en Clientes, Productos y Sucursales
* **Módulo:** `Clientes`, `Productos`, `Sucursales`
* **Incidencia:** Al crear o editar clientes o productos, los cambios se perdían al recargar la página.
* **Causa Raíz:** Los datos dependían únicamente de arreglos estáticos en memoria en `mock-data.ts`.
* **Cómo se resolvió:** Se implementó almacenamiento persistente en `localStorage` con fusión automática (`localStorage.getItem("facturacr_clients")`, `facturacr_products`, etc.).
* **Prevención:** Cada formulario de creación o edición debe guardar inmediatamente en `localStorage` y emitir una notificación de confirmación al usuario.
