# FacturaCR Pro

Quiero que construyas una aplicación SaaS moderna de facturación electrónica para Costa Rica.

La aplicación debe tener diseño PREMIUM, moderno, elegante y extremadamente fácil de usar, inspirada en Stripe, Notion, Linear y Shopify.

Debe sentirse rápida, limpia, profesional y generar confianza para negocios y empresas.

IMPORTANTE:

La aplicación debe estar preparada para integrarse con Hacienda Costa Rica mediante API externa de facturación electrónica.

NO implementar directamente XML ni Hacienda todavía.

Preparar la arquitectura para integración futura mediante servicios API.

STACK:

- React

- TypeScript

- Tailwind

- Supabase

- Arquitectura escalable y multiempresa

- Responsive mobile first

- PWA installable

ESTRUCTURA MULTIEMPRESA:

Cada empresa debe tener:

- sucursales

- usuarios

- roles

- clientes

- productos

- facturas

- reportes

ROLES:

- Super Admin

- Administrador Empresa

- Cajero

- Vendedor

- Contador

MÓDULOS PRINCIPALES:

1. Dashboard

- ventas del día

- ventas del mes

- facturas pendientes

- gráficos modernos

- indicadores KPI

- actividad reciente

2. Clientes

- CRUD completo

- búsqueda rápida

- cédula física/jurídica

- correo

- teléfono

- dirección

- historial de compras

3. Productos y servicios

- SKU

- impuestos

- categorías

- control inventario

- precio compra

- precio venta

- stock mínimo

- imágenes

4. Facturación

- crear factura

- tiquete electrónico

- notas crédito

- notas débito

- borradores

- estados:

  - pendiente

  - enviada

  - aceptada

  - rechazada

5. Integración Hacienda preparada

Crear estructura backend preparada para:

- enviar factura a API externa

- guardar XML

- guardar respuesta Hacienda

- guardar clave numérica

- guardar consecutivo

- guardar estado tributario

6. PDF profesional

Generar factura visual moderna:

- logo empresa

- QR

- desglose impuestos

- diseño elegante

7. Reportes

- ventas

- impuestos

- productos más vendidos

- clientes frecuentes

- exportar Excel/PDF

8. Configuración empresa

- logo

- correo

- teléfonos

- sucursales

- usuarios

- firma visual

DISEÑO UI/UX:

- extremadamente moderno

- minimalista

- animaciones suaves

- sombras elegantes

- tarjetas modernas

- excelente uso de espacios

- tablas modernas

- dark/light mode

- experiencia premium tipo SaaS internacional

COLORES:

Usar combinación moderna:

- azul profundo

- blanco

- gris suave

- acentos verdes de éxito

- apariencia tecnológica y confiable

EXPERIENCIA:

La aplicación debe dar sensación de:

- empresa seria

- tecnología moderna

- facilidad de uso

- rapidez

- automatización inteligente

BASE DE DATOS:

Diseñar correctamente relaciones multiempresa desde el inicio.

IMPORTANTE:

No crear archivos gigantes.

Separar componentes.

Arquitectura limpia y mantenible.

Crear:

- layouts

- componentes reutilizables

- hooks

- servicios

- contextos

- rutas protegidas

- auth completo

Agregar:

- login moderno

- recuperación contraseña

- onboarding inicial empresa

- selector de sucursal

- perfil usuario

Preparar el sistema para crecimiento futuro:

- POS

- WhatsApp

- pagos SINPE

- IA

- app móvil

- multi moneda

- multi idioma

## Development

```sh
npm install
npm run dev
```
