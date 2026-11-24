# CIBAYONA — tienda HTML para GitHub + Vercel + Google Apps Script

## 1. Identidad visual: logotipo y favicon

El logotipo y el favicon no se registran en Google Sheets. Súbelos como archivos del repositorio GitHub dentro de `assets/`:

- `assets/logo.png` — logotipo que aparece en el encabezado.
- `assets/favicon.png` — favicon PNG de 32×32 o 48×48.
- `assets/favicon.png` — icono provisional incluido; reemplázalo por el favicon oficial PNG. También puedes reemplazar `assets/favicon.svg` si tienes la versión SVG.

El `index.html` busca `/assets/logo.png`. Si todavía no subes el logotipo, muestra una letra C provisional. El PNG y el SVG incluidos son iconos provisionales; reemplázalos por el favicon oficial. GitHub conserva la carpeta cuando subes archivos dentro de ella.

## 2. Archivos de productos y fichas técnicas

Las imágenes de productos y los PDF sí pueden almacenarse en Google Drive. Comparte cada archivo como **Cualquier persona con el enlace — Lector**. No basta con compartir la carpeta: los archivos publicados deben tener permiso de lectura. Las cuentas Google Workspace pueden tener restricciones para compartir públicamente.

En la hoja `PRODUCTOS`, utiliza exactamente estas columnas:

- `imagen_principal` (columna U en la plantilla): enlace de archivo de imagen o ID de Drive.
- `ficha_pdf_url` (columna W en la plantilla): enlace de un archivo PDF o ID de Drive.
- `imagenes_adicionales` (columna V): enlaces separados por coma, punto y coma o salto de línea.

No pegues enlaces de carpetas. Debe ser el enlace de cada archivo. El backend reconoce enlaces `drive.google.com/file/d/ID/view`, `drive.google.com/open?id=ID`, `drive.google.com/uc?id=ID` y el ID puro. Las imágenes se convierten a una URL de miniatura y los PDF a una URL `/preview`. Las URL públicas externas se conservan. El backend también recupera el destino real cuando la celda de Sheets usa Insertar enlace o una fórmula HYPERLINK (no solo el texto visible).

La pestaña `PRODUCTOS` debe conservar sus encabezados originales. No agregues los enlaces en otra columna con un nombre distinto.

## 3. Diagnóstico de Drive

Después de copiar el nuevo `Code.gs` a Apps Script y guardar, ejecuta `diagnosticarArchivosDrive()` desde el editor. Abre **Ver → Registros**. El diagnóstico informa archivo, MIME type, ID detectado y errores de acceso. No cambia los permisos ni publica archivos automáticamente.

Comprueba que las fotos tengan un MIME type que empiece con `image/` y las fichas `application/pdf`. Si muestra un error de acceso, revisa el ID y el permiso Lector del archivo en Drive.

## 4. Google Apps Script

Propiedades del script requeridas:

- `SPREADSHEET_ID`: ID de tu hoja de cálculo.
- `API_SECRET`: secreto largo generado por `generarApiSecret()`.
- `DRIVE_ROOT_FOLDER_ID`: ID de la carpeta raíz CIBAYONA en Drive.

Ejecuta `setupSheets()` una vez. Para imágenes y PDF subidos manualmente, verifica sus permisos de lector por enlace. Tras actualizar `Code.gs`, crea una nueva versión del despliegue de Apps Script y conserva la URL `/exec`.

## 5. GitHub desde navegador

Crea el repositorio y sube el contenido de esta carpeta, no el ZIP. Conserva exactamente `api/`, `lib/` y `assets/`. No publiques secretos.

Estructura mínima:

```text
index.html
api/catalog.js
api/order.js
lib/apps-script.js
Code.gs
assets/favicon.svg
assets/INSTRUCCIONES_LOGO.txt
assets/logo.png       (tu archivo)
assets/favicon.png    (tu archivo, opcional)
```

## 6. Vercel

Framework preset: `Other`. Configura estas variables privadas:

- `APPS_SCRIPT_URL`: URL de implementación `/exec`.
- `API_SECRET`: el mismo secreto guardado en Apps Script.
- `WHATSAPP_NUMBER`: número internacional solo con dígitos (Perú: 51 + número).

Después de agregar o cambiar variables, vuelve a desplegar. No coloques `API_SECRET` en `index.html`, JavaScript público o GitHub.

## 7. Si no aparecen imagen o PDF

1. Asegúrate de que en la celda haya una URL pegada o un enlace enriquecido válido; el backend intenta leer ambos formatos.
2. Revisa que la URL esté en la columna correcta (`imagen_principal` o `ficha_pdf_url`).
3. Abre la URL del archivo en una ventana incógnita. Si pide iniciar sesión, el archivo no está compartido públicamente.
4. Confirma que es un enlace de archivo y no de carpeta.
5. Ejecuta `diagnosticarArchivosDrive()` y revisa `Ver → Registros`.
6. Publica una nueva versión de Apps Script después de cualquier cambio en `Code.gs`.
7. Actualiza la tienda con Ctrl+F5. El catálogo puede mantenerse en caché hasta 60 segundos.

## Alcance

Esta es la versión inicial pública de tienda. No incluye todavía paneles completos de administración. El pedido es una solicitud y la disponibilidad debe confirmarse; no procesa pagos electrónicos.


## Ajustes de catálogo y carrito (versión actualizada)

- La hoja `PRODUCTOS` es la fuente de productos, precios, precio promocional, imágenes y fichas técnicas. `precio_promocional` de esta hoja tiene prioridad; `PROMOCIONES` queda como alternativa si esa celda está vacía.
- `setupSheets()` añade la columna `metodo_pago` al final de `PEDIDOS` si todavía no existe. También agrega la fila `banner_url` en `CONFIGURACION` si falta. No borra ni mueve las columnas o los registros actuales.
- En `CONFIGURACION`, completa `banner_url`, `facebook_url` y `tiktok_url`. `banner_url` puede ser una URL directa de imagen o un enlace de archivo de Google Drive.
- En cada fila de `PRODUCTOS`, pega el enlace de archivo (no el de carpeta) en `imagen_principal` y `ficha_pdf_url`. Para el PDF, la ficha abre una vista previa y ofrece un enlace separado de descarga.
- Comparte cada imagen y cada PDF como **Cualquier persona con el enlace — Lector**. No es necesario publicar toda la carpeta.
- El carrito usa la misma cantidad en la tarjeta del producto y en el panel del carrito. La cantidad debe respetar `cantidad_minima` y sus múltiplos.
- Los pedidos guardan nombres, WhatsApp, método de pago y nota; el método queda en `PEDIDOS.metodo_pago` y los demás datos en sus columnas existentes.

### Importante sobre los identificadores

Cada fila de `PRODUCTOS` debe tener un `producto_id` propio y no repetido. La versión actual identifica temporalmente cada registro también por su número de fila para no mezclar tarjetas si hubiera IDs duplicados; el pedido verificará que esa fila siga correspondiendo al producto elegido. Para producción, asigna IDs únicos y estables.

### Publicación

1. Sustituye los archivos del repositorio por el contenido de esta carpeta.
2. Copia `Code.gs` completo en el proyecto de Apps Script.
3. En Apps Script ejecuta `setupSheets()` una vez y autoriza los permisos solicitados.
4. Despliega una nueva versión de Apps Script conservando la URL `/exec`.
5. En Vercel conserva `APPS_SCRIPT_URL`, `API_SECRET` y `WHATSAPP_NUMBER`; vuelve a desplegar después de cambiar el proyecto.
6. Actualiza la tienda con `Ctrl + F5`.
