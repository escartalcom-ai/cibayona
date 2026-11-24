# CIBAYONA — Tienda virtual (starter funcional)

Paquete inicial de implementación para CIBAYONA con Next.js, Vercel, Google Apps Script, Google Sheets y Google Drive.

## Qué incluye

- Portada corporativa responsive con paleta celeste/naranja.
- Catálogo conectado a Google Sheets mediante Apps Script.
- Búsqueda por texto y filtro por categoría.
- Carrito persistente en el navegador, cantidad mínima y múltiplos del mínimo.
- Registro de solicitud de pedido en Sheets y enlace de WhatsApp.
- Aviso de disponibilidad por proveedor y envío previa coordinación.
- Panel comercial `/admin` con acceso, carga de productos, subida de imagen/PDF a Drive y actualización de estado de pedidos.
- Panel técnico `/desarrollador` con chequeo de Vercel, Apps Script, Sheets y Drive.
- Plantilla de Sheets incluida por separado: `CIBAYONA_Plantilla_Google_Sheets.xlsx`.

> Es un starter desplegable, pero no está listo para producción hasta completar los secretos, desplegar Apps Script, configurar WhatsApp, probar los permisos de Drive y cargar datos reales. No incluye pasarela de pagos.

## Requisitos

- Node.js 20.9 o superior (recomendado Node 22 LTS).
- Cuenta Google con Sheets, Apps Script y Drive.
- Cuenta GitHub y Vercel.

## Fase 1 — Crear Google Sheets

1. Sube `CIBAYONA_Plantilla_Google_Sheets.xlsx` a Google Drive.
2. Ábrelo con Google Sheets y conviértelo a formato Google Sheets si Drive lo solicita (Archivo → Guardar como Hojas de cálculo de Google).
3. Copia el ID de la hoja desde la URL: `https://docs.google.com/spreadsheets/d/ID_DE_LA_HOJA/edit`.
4. Mantén exactamente los nombres de pestañas y encabezados. No cambies nombres de columnas usados por el backend.
5. Completa categorías, marcas y productos reales. No inventes stock ni características técnicas.

## Fase 2 — Preparar Google Drive

1. Crea una carpeta raíz llamada `CIBAYONA`.
2. Dentro crea `PRODUCTOS` y `FICHAS_TECNICAS` (si no existen, Apps Script las crea al subir el primer archivo).
3. Copia el ID de la carpeta raíz desde la URL de Drive.
4. Solo los documentos comerciales que deban ser públicos se compartirán como “Cualquier persona con el enlace: lector”. El script aplica ese permiso a los archivos que se suben desde el panel. No subas documentos internos.
5. Algunas cuentas de Google Workspace bloquean compartir públicamente. En ese caso, usa un repositorio/CDN de archivos público y guarda sus URL en PRODUCTOS.

## Fase 3 — Configurar Apps Script

1. En Google Sheets abre Extensiones → Apps Script.
2. Borra el código de ejemplo y pega el contenido completo de `AppsScript/Code.gs`.
3. En Apps Script abre Configuración del proyecto → Propiedades del script.
4. Añade estas propiedades:
   - `SPREADSHEET_ID` = ID de Google Sheets.
   - `API_SECRET` = secreto aleatorio largo (mínimo 32 caracteres).
   - `DRIVE_ROOT_FOLDER_ID` = ID de la carpeta raíz `CIBAYONA`.
5. Guarda el proyecto.
6. Ejecuta manualmente `setupSheets()` desde el editor. Autoriza permisos de Sheets y Drive. Si usaste la plantilla, validará las pestañas; si usas una hoja vacía, creará las pestañas y encabezados.
7. Ejecuta `healthCheck_()` solo desde el editor si necesitas diagnóstico; la API externa usa la acción `health`.
8. Implementar → Nueva implementación → Tipo: Aplicación web.
9. Ejecutar como: tu cuenta (propietario).
10. Quién tiene acceso: Cualquier usuario. La API queda protegida por `API_SECRET`; Vercel es el único cliente previsto. Si tu organización no permite acceso anónimo, debes adaptar la autenticación antes de usarla.
11. Implementa y copia la URL que termina en `/exec`.
12. Cada vez que modifiques Apps Script, crea una nueva versión del despliegue (Administrar implementaciones → Editar → Nueva versión).

**Seguridad:** `API_SECRET` se almacena en las propiedades del script y como variable privada de Vercel. Nunca lo pongas en una variable `NEXT_PUBLIC_`, en GitHub, ni en el código del navegador.

## Fase 4 — Ejecutar la tienda localmente

1. Descomprime el paquete.
2. Abre la carpeta `cibayona_starter` en Visual Studio Code.
3. Copia `.env.example` como `.env.local`.
4. Completa:
   - `APPS_SCRIPT_URL` = URL `/exec`.
   - `APPS_SCRIPT_SECRET` = el mismo valor de `API_SECRET`.
   - `SESSION_SECRET` = otro secreto aleatorio distinto (32+ caracteres).
   - `ADMIN_EMAIL` y `ADMIN_PASSWORD`.
   - `DEVELOPER_EMAIL` y `DEVELOPER_PASSWORD`.
   - `WHATSAPP_NUMBER` = número de ventas en formato internacional, solo dígitos (Perú: `51` + número).
   - URLs reales de Facebook/TikTok si ya existen.
5. No compartas `.env.local` ni lo subas a GitHub.
6. En una terminal ejecuta:

```bash
npm install
npm run dev
```

7. Abre `http://localhost:3000`.
8. Prueba el catálogo. Si aparece error de integración revisa `APPS_SCRIPT_URL`, `APPS_SCRIPT_SECRET`, permisos y despliegue.
9. Entra en `http://localhost:3000/admin` para administrar productos y pedidos.
10. Entra en `http://localhost:3000/desarrollador` con credenciales de desarrollador.

## Fase 5 — Subir a GitHub

1. Crea un repositorio privado llamado `cibayona-store` (recomendado mientras configuras la tienda).
2. Sube el contenido de esta carpeta, no el ZIP.
3. Confirma que `.env.local` no figure en los archivos ni en los commits.
4. Si un secreto llegó a subirse por error, rótalo inmediatamente; borrarlo en un commit posterior no elimina el secreto del historial.

Comandos básicos:

```bash
git init
git add .
git commit -m "Initial CIBAYONA store"
git branch -M main
git remote add origin https://github.com/TU_USUARIO/cibayona-store.git
git push -u origin main
```

## Fase 6 — Desplegar en Vercel

1. Entra a Vercel y selecciona Add New → Project.
2. Importa el repositorio de GitHub.
3. Framework: Next.js (detección automática).
4. Agrega las mismas variables de `.env.local` en Settings → Environment Variables:
   - `APPS_SCRIPT_URL`
   - `APPS_SCRIPT_SECRET`
   - `SESSION_SECRET`
   - `ADMIN_EMAIL`
   - `ADMIN_PASSWORD`
   - `DEVELOPER_EMAIL`
   - `DEVELOPER_PASSWORD`
   - `WHATSAPP_NUMBER`
   - `NEXT_PUBLIC_FACEBOOK_URL`
   - `NEXT_PUBLIC_TIKTOK_URL`
   - `NEXT_PUBLIC_SITE_URL`
5. Asigna variables a Production, Preview y Development según corresponda. Evita poner contraseñas de producción en entornos Preview no confiables.
6. Haz Deploy. Cada cambio de variables requiere un nuevo despliegue.
7. Comprueba la URL de producción, `/admin` y `/desarrollador`.
8. Conecta el dominio `cibayona.com` cuando tengas acceso a su DNS; verifica el correo `ventas@cibayona.com` por separado.

## Fase 7 — Identidad visual

- Sustituye el texto provisional del encabezado por el logotipo oficial cuando lo subas a `public/brand/`.
- Añade el favicon oficial y decláralo en `metadata.icons` en `app/layout.tsx`.
- Completa Facebook y TikTok con sus URLs reales.
- Revisa la visualización del logo en móvil y escritorio.

## Fase 8 — Carga del catálogo y pruebas

1. En Sheets, crea categorías y marcas. Usa IDs únicos sencillos (por ejemplo, `CAT-001`, `MAR-001`).
2. En PRODUCTOS agrega productos reales y comprueba los valores `activo` y `disponibilidad`.
3. En `PRODUCTOS.categoria_id` escribe el ID exacto de CATEGORIAS. En `PRODUCTOS.marca_id` escribe el ID exacto de MARCAS; si aún no administras la tabla MARCAS, el texto escrito se mostrará tal cual.
4. La cantidad mínima se aplica como múltiplo: mínimo 5 permite 5, 10, 15, etc.
5. Para promociones, registra una fila en `PROMOCIONES`: `promocion_id`, `producto_id` (ID exacto de PRODUCTOS), `titulo`, `precio_regular`, `precio_promocional`, `inicio`, `fin`, `activo` y `destacado`. Usa fechas válidas y `TRUE` en `activo`. El precio de oferta solo se publica y aplica al pedido dentro de las fechas indicadas; al vencer, el producto vuelve al precio normal.
6. Las fichas Sonepar deben tener fuente y datos verificados; preferir PDF oficial del fabricante y respetar permisos de uso. Este starter permite adjuntar el PDF y registrar su fuente, pero no extrae ni rastrea automáticamente el catálogo de Sonepar.
7. Prueba la carga de imágenes/PDF desde `/admin`. Tamaño máximo por archivo: 3 MB (límite conservador para las solicitudes serverless de Vercel).
8. Prueba un pedido con precios y otro sin precio; verifica PEDIDOS y DETALLE_PEDIDO y el mensaje de WhatsApp.
9. Comprueba que el número de WhatsApp esté correcto y activo.
10. Prueba cada estado de pedido y verifica que se guarde.
11. Verifica errores de consola, responsive, links y fichas desde un teléfono real.

## Rutas

- `/` — tienda pública.
- `/admin` — panel comercial.
- `/desarrollador` — panel técnico.
- `/api/catalog` — catálogo público.
- `/api/orders` — registro de pedido.

## Limitaciones y mejoras antes de producción

- Este starter usa Google Sheets como base operativa inicial. Sheets/Apps Script tienen límites de cuotas y concurrencia; para catálogos y tráfico elevados migra datos transaccionales a una base de datos (por ejemplo PostgreSQL/Supabase) y deja Drive como repositorio documental.
- La aplicación registra la solicitud y abre WhatsApp; no procesa pagos ni confirma la venta automáticamente.
- El panel utiliza credenciales iniciales almacenadas en variables de entorno. Para varios administradores, recuperación de contraseña, MFA y auditoría avanzada, integra un proveedor de identidad (por ejemplo Firebase Auth o Auth.js) antes de ampliar usuarios.
- Añade limitación de frecuencia (rate limiting), CAPTCHA/antibot y alertas de errores antes de campañas con tráfico alto.
- Drive con permiso “cualquiera con el enlace” es público. No subir documentos privados, listas de precios internas ni información confidencial.
- La disponibilidad 24/7 depende de los servicios y cuotas de terceros; el panel de salud es una comprobación básica, no un SLA.
- La interfaz de panel incluida permite crear productos, subir archivos y actualizar pedidos, pero categorías, marcas, usuarios, promociones y textos corporativos se pueden mantener directamente en Sheets en esta primera versión. Deben añadirse sus formularios al panel en una iteración posterior si quieres gestión completa desde interfaz.

## Versiones

El proyecto usa Next.js 16 (App Router) y React 19. Comprueba la versión compatible de Node indicada por Next.js antes de instalar. `npm install` generará `package-lock.json`; consérvalo en GitHub para instalaciones reproducibles.
