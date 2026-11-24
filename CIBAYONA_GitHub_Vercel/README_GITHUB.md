# CIBAYONA – versión HTML para GitHub + Vercel + Google Apps Script

Esta versión está preparada para no necesitar Visual Studio Code. El repositorio se puede crear y completar desde la web de GitHub. El frontend es `index.html`; los archivos `api/` son funciones de Vercel que guardan el secreto en el servidor. El navegador nunca recibe `API_SECRET`.

## Archivos
- `index.html`: tienda pública, buscador, filtros, ficha de producto, visor PDF, carrito y formulario de solicitud.
- `api/catalog.js`: obtiene el catálogo a través de Vercel.
- `api/order.js`: registra la solicitud en Sheets y devuelve el enlace de WhatsApp.
- `lib/apps-script.js`: comunica Vercel con Apps Script.
- `Code.gs`: backend de Google Apps Script. Acepta ID o URL de Google Sheets y contiene `generarApiSecret()`.

## A. Google Sheets
1. Abre tu hoja de cálculo.
2. El ID de la hoja está entre `/d/` y `/edit` en la URL. Para el enlace proporcionado en el chat, es `15KoTDtoxj42pAvPGaUAiVwhyssXQ4mpFHhFn56rtEWU`.
3. En Apps Script, abre **Configuración del proyecto → Propiedades del script** y registra `SPREADSHEET_ID` con ese ID (no hace falta pegar la URL completa; el código también acepta URL completa).

## B. Google Apps Script
1. En Apps Script sustituye el contenido de `Código.gs` por el archivo `Code.gs` de este paquete.
2. En Propiedades del script crea `SPREADSHEET_ID` con el ID anterior.
3. Ejecuta `setupSheets()` y acepta los permisos de Google.
4. Ejecuta `generarApiSecret()` una sola vez. El secreto queda guardado en propiedades del script. Abre el registro de ejecución y copia el valor `API_SECRET`.
5. En Propiedades del script configura también `DRIVE_ROOT_FOLDER_ID` con el ID de la carpeta raíz `CIBAYONA` de Drive cuando vayas a subir archivos.
6. Ve a **Implementar → Nueva implementación → Aplicación web**. Ejecutar como: tu cuenta. Quién tiene acceso: cualquier usuario. Implementa y copia la URL terminada en `/exec`.
7. Si modificas el código después de implementar, crea una nueva versión desde **Administrar implementaciones → Editar → Nueva versión → Implementar**.

## C. GitHub desde el navegador (sin Visual Studio Code)
1. En GitHub crea un repositorio nuevo, por ejemplo `cibayona-store`.
2. En el repositorio, pulsa **Add file → Upload files**.
3. Sube los archivos y conserva las carpetas `api/`, `lib/` y `assets/`. La estructura debe quedar así:

```
index.html
api/catalog.js
api/order.js
lib/apps-script.js
assets/INSTRUCCIONES_LOGO.txt
.env.example
.gitignore
```

`Code.gs` se copia en Apps Script; también puedes guardarlo en GitHub como respaldo.

## D. Vercel
1. En Vercel selecciona **Add New → Project** e importa `cibayona-store`.
2. Framework Preset: **Other**. Root Directory: `./`.
3. Antes de desplegar, abre **Environment Variables** y crea:
   - `APPS_SCRIPT_URL`: URL `/exec` de la implementación de Apps Script.
   - `API_SECRET`: secreto generado por `generarApiSecret()`.
   - `WHATSAPP_NUMBER`: número de ventas internacional, solo dígitos. Ejemplo de formato Perú: `519XXXXXXXX`.
4. Despliega. Si agregas o modificas variables después, vuelve a desplegar para que las funciones las reciban.

## E. Pruebas
1. Abre la URL de Vercel.
2. Si el catálogo está vacío, registra primero un producto en la pestaña `PRODUCTOS` y actívalo con `TRUE`.
3. Registra categorías y marcas usando IDs coincidentes en sus respectivas pestañas.
4. Prueba búsqueda, cantidades mínimas, ficha PDF y carrito.
5. Envía una solicitud de prueba y confirma que aparece en `PEDIDOS` y `DETALLE_PEDIDO`, y que abre WhatsApp.

## Seguridad y alcance
- Nunca copies `API_SECRET` dentro de `index.html`, archivos JavaScript públicos ni GitHub.
- El secreto solo permanece en Propiedades del script y en variables de entorno privadas de Vercel.
- Esta entrega es la primera versión pública de tienda y pedidos. No incluye todavía los dashboards autenticados de administrador y desarrollador; esos se deben agregar como una segunda fase con autenticación y autorización de servidor. No se debe crear un acceso administrativo público en un archivo HTML estático.
- El stock es informativo y sujeto a verificación del proveedor. El pedido es una solicitud, no un pago ni una confirmación de disponibilidad.
