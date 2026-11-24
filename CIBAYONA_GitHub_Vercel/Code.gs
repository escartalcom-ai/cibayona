/**
 * CIBAYONA - Google Apps Script API
 * Propiedades requeridas del proyecto (Configuración > Propiedades del script):
 * SPREADSHEET_ID, API_SECRET, DRIVE_ROOT_FOLDER_ID
 * Opcional: WHATSAPP_NUMBER
 */
const SHEET_HEADERS = {
  PRODUCTOS: ['producto_id','sku','codigo_fabricante','nombre','descripcion_corta','descripcion','categoria_id','subcategoria','marca_id','modelo','precio','precio_promocional','moneda','unidad_venta','cantidad_minima','disponibilidad','stock_informado','proveedor_id','ultima_verificacion','tiempo_abastecimiento','imagen_principal','imagenes_adicionales','ficha_pdf_url','fuente_tecnica','caracteristicas_json','destacado','activo','fecha_creacion','fecha_actualizacion'],
  CATEGORIAS: ['categoria_id','nombre','slug','descripcion','imagen_url','categoria_padre_id','orden','activo'],
  MARCAS: ['marca_id','nombre','logo_url','sitio_web','activo'],
  PROVEEDORES: ['proveedor_id','nombre','contacto','whatsapp','correo','notas','activo'],
  INVENTARIO: ['inventario_id','producto_id','proveedor_id','cantidad_informada','disponibilidad','verificado_en','observaciones'],
  PROMOCIONES: ['promocion_id','producto_id','titulo','precio_regular','precio_promocional','inicio','fin','activo','destacado'],
  PEDIDOS: ['pedido_id','fecha','cliente_nombre','cliente_telefono','correo','ciudad','direccion','referencia','observaciones','subtotal_estimado','envio_estimado','total_estimado','moneda','estado','origen','whatsapp_url'],
  DETALLE_PEDIDO: ['detalle_id','pedido_id','producto_id','sku','nombre_producto','marca','cantidad','unidad_venta','precio_unitario','subtotal'],
  CLIENTES: ['cliente_id','nombre','telefono','correo','ciudad','fecha_registro','observaciones'],
  USUARIOS: ['usuario_id','nombre','correo','rol','activo','fecha_creacion'],
  CONFIGURACION: ['clave','valor','descripcion','publico'],
  AUDITORIA: ['event_id','fecha','actor','rol','accion','entidad','entidad_id','detalle']
};

function doPost(e) {
  try {
    const body = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    const props = PropertiesService.getScriptProperties();
    const expected = props.getProperty('API_SECRET');
    if (!expected || !body.secret || !constantTimeEqual(String(body.secret), expected)) return jsonResponse({ ok: false, error: 'No autorizado.' });
    const data = body.data || {};
    let result;
    switch (body.action) {
      case 'health': result = healthCheck_(); break;
      case 'publicCatalog': result = publicCatalog_(); break;
      case 'createOrder': result = createOrder_(data); break;
      case 'adminData': result = adminData_(); break;
      case 'saveProduct': result = saveProduct_(data); break;
      case 'updateOrder': result = updateOrder_(data); break;
      case 'uploadFile': result = uploadFile_(data); break;
      default: throw new Error('Acción no reconocida.');
    }
    return jsonResponse({ ok: true, data: result });
  } catch (err) {
    console.error(err && err.stack ? err.stack : err);
    return jsonResponse({ ok: false, error: err && err.message ? err.message : 'Error interno.' });
  }
}

function doGet() {
  return jsonResponse({ ok: true, data: { service: 'CIBAYONA Apps Script API', message: 'Usa POST desde el backend de Vercel.' } });
}

function normalizeSpreadsheetId_(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  // Acepta tanto el ID puro como la URL completa de Google Sheets.
  const match = raw.match(/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
  return match ? match[1] : raw.split(/[?#]/)[0].trim();
}

function setupSheets() {
  const configured = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
  const id = normalizeSpreadsheetId_(configured);
  if (!id) throw new Error('Configura SPREADSHEET_ID con el ID o URL de tu hoja de cálculo.');
  const ss = SpreadsheetApp.openById(id);
  Object.keys(SHEET_HEADERS).forEach(function(name) {
    let sh = ss.getSheetByName(name);
    if (!sh) sh = ss.insertSheet(name);
    if (sh.getLastRow() === 0) sh.getRange(1, 1, 1, SHEET_HEADERS[name].length).setValues([SHEET_HEADERS[name]]);
    else {
      const current = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0].map(String);
      const missing = SHEET_HEADERS[name].filter(function(h) { return current.indexOf(h) === -1; });
      if (missing.length) throw new Error('La hoja ' + name + ' tiene encabezados incompatibles. Faltan: ' + missing.join(', '));
    }
    sh.setFrozenRows(1);
  });
  return 'Hojas creadas o verificadas correctamente.';
}

function spreadsheet_() {
  const configured = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
  const id = normalizeSpreadsheetId_(configured);
  if (!id) throw new Error('Falta SPREADSHEET_ID en las propiedades del script.');
  return SpreadsheetApp.openById(id);
}

/**
 * Ejecuta esta función UNA SOLA VEZ para generar y guardar API_SECRET.
 * Copia el valor que aparece en el registro de ejecución y guárdalo también
 * en Vercel como variable de entorno API_SECRET. Nunca lo pongas en index.html.
 */
function generarApiSecret() {
  const secret = Utilities.getUuid().replace(/-/g, '') + Utilities.getUuid().replace(/-/g, '') + Utilities.getUuid().replace(/-/g, '');
  PropertiesService.getScriptProperties().setProperty('API_SECRET', secret);
  Logger.log('API_SECRET (cópialo a Vercel; no lo publiques en GitHub): ' + secret);
  return 'API_SECRET generado y guardado en las propiedades del script. Revisa el registro de ejecución.';
}
function sheet_(name) {
  const sh = spreadsheet_().getSheetByName(name);
  if (!sh) throw new Error('No existe la hoja ' + name + '. Ejecuta setupSheets().');
  return sh;
}
function rows_(name) {
  const sh = sheet_(name);
  const range = sh.getDataRange();
  const values = range.getValues();
  if (values.length < 2) return [];
  const richValues = range.getRichTextValues();
  const formulas = range.getFormulas();
  const headers = values[0].map(String);
  const linkHeaders = ['imagen_principal','imagenes_adicionales','ficha_pdf_url','imagen_url','logo_url'];
  return values.slice(1).filter(function(row) {
    return row.some(function(v) { return v !== '' && v !== null; });
  }).map(function(row, dataIndex) {
    const sheetRow = dataIndex + 1;
    const obj = {};
    headers.forEach(function(h, i) {
      let value = row[i];
      // Si se usó Insertar enlace (texto visible + URL oculta), recuperar la URL real.
      if (linkHeaders.indexOf(h) >= 0) {
        const rich = richValues[sheetRow] && richValues[sheetRow][i];
        const richUrl = rich && typeof rich.getLinkUrl === 'function' ? rich.getLinkUrl() : '';
        const formula = formulas[sheetRow] ? String(formulas[sheetRow][i] || '') : '';
        const hyperlinkMatch = formula.match(/^\s*=\s*HYPERLINK\(\s*"([^"]+)"/i);
        if (richUrl) value = richUrl;
        else if (hyperlinkMatch && hyperlinkMatch[1]) value = hyperlinkMatch[1];
      }
      obj[h] = value;
    });
    return obj;
  });
}
function append_(name, obj) {
  const sh = sheet_(name);
  const headers = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0].map(String);
  sh.appendRow(headers.map(function(h) { return Object.prototype.hasOwnProperty.call(obj, h) ? obj[h] : ''; }));
}
function upsert_(name, key, obj) {
  const sh = sheet_(name);
  const headers = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0].map(String);
  const keyCol = headers.indexOf(key) + 1;
  if (!keyCol) throw new Error('No existe la columna ' + key + ' en ' + name);
  const last = sh.getLastRow();
  const keyValues = last > 1 ? sh.getRange(2, keyCol, last - 1, 1).getValues().flat() : [];
  const target = keyValues.findIndex(function(v) { return String(v) === String(obj[key]); });
  const row = headers.map(function(h) { return Object.prototype.hasOwnProperty.call(obj, h) ? obj[h] : ''; });
  if (target >= 0) sh.getRange(target + 2, 1, 1, headers.length).setValues([row]);
  else sh.appendRow(row);
}
function bool_(value) {
  if (value === true) return true;
  const s = String(value == null ? '' : value).trim().toLowerCase();
  return ['true','verdadero','1','sí','si','yes'].indexOf(s) >= 0;
}
function num_(value, fallback) {
  if (value === '' || value === null || value === undefined) return fallback;
  const n = Number(value); return Number.isFinite(n) ? n : fallback;
}
function iso_(value) {
  if (!value) return '';
  const d = value instanceof Date ? value : new Date(value);
  return isNaN(d.getTime()) ? String(value) : d.toISOString();
}
function id_() { return Utilities.getUuid(); }
function jsonResponse(obj) { return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON); }
function constantTimeEqual(a, b) {
  if (a.length !== b.length) return false;
  let out = 0; for (let i = 0; i < a.length; i++) out |= a.charCodeAt(i) ^ b.charCodeAt(i); return out === 0;
}
function audit_(actor, role, action, entity, entityId, detail) {
  append_('AUDITORIA', { event_id: id_(), fecha: new Date(), actor: actor || 'sistema', rol: role || 'sistema', accion: action, entidad: entity, entidad_id: entityId || '', detalle: String(detail || '').slice(0, 1000) });
}
function healthCheck_() {
  const ss = spreadsheet_();
  const root = PropertiesService.getScriptProperties().getProperty('DRIVE_ROOT_FOLDER_ID');
  let driveOk = false;
  if (root) { DriveApp.getFolderById(root).getName(); driveOk = true; }
  return { spreadsheet: !!ss.getId(), drive: driveOk, timestamp: new Date().toISOString() };
}

function activePromotions_() {
  const now = new Date();
  return rows_('PROMOCIONES').filter(function(promo) {
    if (!bool_(promo.activo) || !promo.producto_id || promo.precio_promocional === '') return false;
    const start = promo.inicio ? new Date(promo.inicio) : new Date(0);
    const end = promo.fin ? new Date(promo.fin) : new Date('2999-12-31T23:59:59');
    if (promo.fin && !isNaN(end.getTime())) end.setHours(23, 59, 59, 999);
    return !isNaN(start.getTime()) && !isNaN(end.getTime()) && now >= start && now <= end;
  });
}
function promotionFor_(promotions, productId) {
  return promotions.find(function(promo) { return String(promo.producto_id) === String(productId); }) || null;
}
function publicCatalog_() {
  const categoryRows = rows_('CATEGORIAS');
  const brandRows = rows_('MARCAS');
  const promotions = activePromotions_();
  const products = rows_('PRODUCTOS').filter(function(p) { return bool_(p.activo) && p.nombre; }).map(function(p) {
    const category = categoryRows.find(function(c) { return String(c.categoria_id) === String(p.categoria_id); });
    const brand = brandRows.find(function(b) { return String(b.marca_id) === String(p.marca_id); });
    const promo = promotionFor_(promotions, p.producto_id);
    return {
      id: String(p.producto_id || ''), sku: String(p.sku || ''), manufacturerCode: String(p.codigo_fabricante || ''),
      name: String(p.nombre || ''), shortDescription: String(p.descripcion_corta || ''), description: String(p.descripcion || ''),
      categoryId: String(p.categoria_id || ''), categoryName: category ? String(category.nombre || '') : '',
      brand: brand ? String(brand.nombre || '') : String(p.marca_id || ''), model: String(p.modelo || ''), price: p.precio === '' ? null : num_(p.precio, null),
      promotionalPrice: promo ? num_(promo.precio_promocional, null) : null, currency: String(p.moneda || 'PEN'),
      unit: String(p.unidad_venta || 'unidad'), minQuantity: Math.max(1, num_(p.cantidad_minima, 1)),
      availability: String(p.disponibilidad || 'POR_CONFIRMAR'), stockReported: p.stock_informado === '' ? null : num_(p.stock_informado, null),
      lastVerified: iso_(p.ultima_verificacion), leadTime: String(p.tiempo_abastecimiento || ''),
      imageUrl: driveViewUrl_(String(p.imagen_principal || p.imagen_url || p.imagen_producto || '')),
      gallery: String(p.imagenes_adicionales || '').split(/[\n,;]/).map(function(x) { return driveViewUrl_(x.trim()); }).filter(Boolean),
      datasheetUrl: drivePreviewUrl_(String(p.ficha_pdf_url || p.ficha_tecnica || p.pdf_url || '')), technicalSource: String(p.fuente_tecnica || ''),
      featured: bool_(p.destacado)
    };
  });
  const categories = rows_('CATEGORIAS').filter(function(c) { return bool_(c.activo) && c.nombre; }).map(function(c) {
    return { id: String(c.categoria_id || ''), name: String(c.nombre || ''), slug: String(c.slug || ''), description: String(c.descripcion || ''), imageUrl: driveViewUrl_(String(c.imagen_url || '')) };
  });
  return { products: products, categories: categories, updatedAt: new Date().toISOString() };
}
/**
 * Extrae IDs de archivos de los formatos habituales de Google Drive:
 * - ID pegado directamente
 * - https://drive.google.com/file/d/ID/view
 * - https://drive.google.com/open?id=ID
 * - https://drive.google.com/uc?id=ID
 * También deja intactas las URL públicas de otros servidores.
 */
function driveFileId_(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  if (/^[A-Za-z0-9_-]{20,}$/.test(raw)) return raw;
  const patterns = [
    /\/file\/d\/([A-Za-z0-9_-]{20,})/,
    /\/document\/d\/([A-Za-z0-9_-]{20,})/,
    /\/spreadsheets\/d\/([A-Za-z0-9_-]{20,})/,
    /[?&]id=([A-Za-z0-9_-]{20,})/,
    /[?&]export=download&?[^#]*id=([A-Za-z0-9_-]{20,})/
  ];
  for (let i = 0; i < patterns.length; i++) {
    const match = raw.match(patterns[i]);
    if (match && match[1]) return match[1];
  }
  return '';
}
function driveResourceKey_(value) {
  const match = String(value || '').match(/[?&]resourcekey=([^&#]+)/i);
  if (!match || !match[1]) return '';
  try { return decodeURIComponent(match[1]); } catch (err) { return match[1]; }
}
function getDriveFileFromLink_(value) {
  const fileId = driveFileId_(value);
  if (!fileId) throw new Error('No se pudo identificar el ID del archivo de Drive.');
  const resourceKey = driveResourceKey_(value);
  // Algunos enlaces de Drive requieren la clave de recurso del enlace compartido.
  return resourceKey ? DriveApp.getFileByIdAndResourceKey(fileId, resourceKey) : DriveApp.getFileById(fileId);
}
function appendResourceKey_(url, value) {
  const key = driveResourceKey_(value);
  return key ? url + (url.indexOf('?') >= 0 ? '&' : '?') + 'resourcekey=' + encodeURIComponent(key) : url;
}
function driveViewUrl_(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  const fileId = driveFileId_(raw);
  // thumbnail se utiliza para miniaturas/imágenes en la tienda.
  return fileId ? appendResourceKey_('https://drive.google.com/thumbnail?id=' + encodeURIComponent(fileId) + '&sz=w1200', raw) : raw;
}
function drivePreviewUrl_(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  const fileId = driveFileId_(raw);
  return fileId ? appendResourceKey_('https://drive.google.com/file/d/' + encodeURIComponent(fileId) + '/preview', raw) : raw;
}

/**
 * Diagnóstico de archivos ya registrados en PRODUCTOS.
 * Ejecuta manualmente desde Apps Script y consulta Ver > Registros.
 * No cambia permisos ni publica documentos automáticamente.
 */
function diagnosticarArchivosDrive() {
  const products = rows_('PRODUCTOS').filter(function(p) { return p.nombre; }).slice(0, 30);
  const report = [];
  products.forEach(function(p) {
    [
      { field: 'imagen_principal', value: p.imagen_principal, expected: 'image' },
      { field: 'ficha_pdf_url', value: p.ficha_pdf_url, expected: 'pdf' }
    ].forEach(function(item) {
      const raw = String(item.value || '').trim();
      if (!raw) return;
      const fileId = driveFileId_(raw);
      const entry = { product: String(p.nombre), field: item.field, fileId: fileId || 'no detectado', urlType: fileId ? 'Google Drive' : 'URL directa' };
      if (fileId) {
        try {
          const file = getDriveFileFromLink_(raw);
          entry.fileName = file.getName();
          entry.mimeType = file.getMimeType();
          entry.sharing = String(file.getSharingAccess());
          entry.resourceKeyPresent = !!driveResourceKey_(raw);
          entry.expectedTypeOk = item.expected === 'pdf' ? entry.mimeType === 'application/pdf' : /^image\//.test(entry.mimeType);
        } catch (err) {
          entry.driveError = String(err.message || err);
        }
        entry.renderUrl = item.expected === 'pdf' ? drivePreviewUrl_(raw) : driveViewUrl_(raw);
      } else {
        entry.renderUrl = raw;
      }
      report.push(entry);
      Logger.log(JSON.stringify(entry));
    });
  });
  Logger.log('Archivos revisados: ' + report.length);
  return 'Diagnóstico terminado. Archivos revisados: ' + report.length + '. Revisa Ver > Registros.';
}

function createOrder_(data) {
  const lock = LockService.getScriptLock(); lock.waitLock(20000);
  try {
    const customer = data.customer || {};
    const items = Array.isArray(data.items) ? data.items : [];
    if (!String(customer.name || '').trim() || !String(customer.phone || '').trim() || !String(customer.city || '').trim() || !items.length) throw new Error('Faltan datos obligatorios del pedido.');
    const products = rows_('PRODUCTOS');
    const promotions = activePromotions_();
    const lines = []; let subtotal = 0; let hasUnpriced = false;
    items.forEach(function(item) {
      const p = products.find(function(x) { return String(x.producto_id) === String(item.productId) && bool_(x.activo); });
      if (!p) throw new Error('Un producto del carrito ya no está publicado. Actualiza el catálogo.');
      const minimum = Math.max(1, num_(p.cantidad_minima, 1));
      const quantity = num_(item.quantity, 0);
      if (!Number.isInteger(quantity) || quantity < minimum || quantity % minimum !== 0) throw new Error('La cantidad de ' + p.nombre + ' debe ser un múltiplo de ' + minimum + '.');
      const availability = String(p.disponibilidad || 'POR_CONFIRMAR');
      if (availability === 'AGOTADO' || availability === 'DESCONTINUADO') throw new Error('El producto ' + p.nombre + ' no está disponible para pedido.');
      const promo = promotionFor_(promotions, p.producto_id);
      const price = promo ? num_(promo.precio_promocional, null) : (p.precio === '' ? null : num_(p.precio, null));
      if (price === null) hasUnpriced = true;
      const lineSubtotal = price === null ? null : price * quantity;
      if (lineSubtotal !== null) subtotal += lineSubtotal;
      lines.push({ p: p, quantity: quantity, price: price, lineSubtotal: lineSubtotal });
    });
    const orderId = 'CB-' + Utilities.getUuid().substring(0, 8).toUpperCase();
    const orderStatus = 'PENDIENTE_DISPONIBILIDAD';
    const orderDate = new Date();
    append_('PEDIDOS', { pedido_id: orderId, fecha: orderDate, cliente_nombre: String(customer.name).trim(), cliente_telefono: String(customer.phone).trim(), correo: String(customer.email || '').trim(), ciudad: String(customer.city).trim(), direccion: String(customer.address || '').trim(), referencia: String(customer.reference || '').trim(), observaciones: String(customer.notes || '').trim(), subtotal_estimado: subtotal, envio_estimado: '', total_estimado: hasUnpriced ? '' : subtotal, moneda: 'PEN', estado: orderStatus, origen: 'TIENDA_WEB', whatsapp_url: '' });
    lines.forEach(function(line) {
      append_('DETALLE_PEDIDO', { detalle_id: id_(), pedido_id: orderId, producto_id: line.p.producto_id, sku: line.p.sku, nombre_producto: line.p.nombre, marca: line.p.marca_id, cantidad: line.quantity, unidad_venta: line.p.unidad_venta, precio_unitario: line.price === null ? '' : line.price, subtotal: line.lineSubtotal === null ? '' : line.lineSubtotal });
    });
    const customerRows = rows_('CLIENTES');
    const existing = customerRows.find(function(c) { return String(c.telefono) === String(customer.phone); });
    if (!existing) append_('CLIENTES', { cliente_id: id_(), nombre: String(customer.name).trim(), telefono: String(customer.phone).trim(), correo: String(customer.email || '').trim(), ciudad: String(customer.city).trim(), fecha_registro: orderDate, observaciones: '' });
    audit_('cliente_web', 'cliente', 'CREAR_PEDIDO', 'PEDIDOS', orderId, 'Solicitud recibida desde la tienda.');
    const linesText = lines.map(function(line, index) {
      const value = line.price === null ? 'Precio por confirmar' : 'S/ ' + line.price.toFixed(2) + ' · Subtotal S/ ' + line.lineSubtotal.toFixed(2);
      return (index + 1) + '. ' + line.p.nombre + ' | Código: ' + (line.p.sku || 'N/D') + ' | Marca: ' + (line.p.marca_id || 'N/D') + ' | Cantidad: ' + line.quantity + ' ' + (line.p.unidad_venta || 'unidad') + ' | ' + value;
    }).join('\n');
    const totalText = hasUnpriced ? 'Total parcial estimado: S/ ' + subtotal.toFixed(2) + ' (hay productos con precio por confirmar)' : 'Subtotal estimado: S/ ' + subtotal.toFixed(2);
    const message = 'Hola, CIBAYONA. Deseo coordinar este pedido.\n\nCódigo de solicitud: ' + orderId + '\nCliente: ' + customer.name + '\nTeléfono: ' + customer.phone + '\nCorreo: ' + (customer.email || 'No indicado') + '\nCiudad: ' + customer.city + '\nDirección: ' + (customer.address || 'Por coordinar') + '\nReferencia: ' + (customer.reference || 'Ninguna') + '\n\nPRODUCTOS\n' + linesText + '\n\n' + totalText + '\nEnvío: previa coordinación.\nObservaciones: ' + (customer.notes || 'Ninguna') + '\n\nEntiendo que la disponibilidad, precio final y entrega deben ser confirmados por CIBAYONA.';
    return { orderId: orderId, whatsappText: message, subtotal: subtotal, currency: 'PEN' };
  } finally { lock.releaseLock(); }
}

function adminData_() {
  const products = rows_('PRODUCTOS').map(function(p) { return { id: String(p.producto_id || ''), name: String(p.nombre || ''), sku: String(p.sku || ''), price: p.precio === '' ? null : num_(p.precio, null), availability: String(p.disponibilidad || ''), active: bool_(p.activo) }; });
  const orders = rows_('PEDIDOS').map(function(o) { return { orderId: String(o.pedido_id || ''), date: iso_(o.fecha), customerName: String(o.cliente_nombre || ''), customerPhone: String(o.cliente_telefono || ''), total: num_(o.total_estimado, null), status: String(o.estado || '') }; }).reverse();
  const activeProducts = products.filter(function(p) { return p.active; }).length;
  const pendingOrders = orders.filter(function(o) { return ['RECIBIDO','PENDIENTE_DISPONIBILIDAD','EN_COORDINACION'].indexOf(o.status) >= 0; }).length;
  return { products: products, orders: orders, stats: { totalProducts: products.length, activeProducts: activeProducts, unavailableProducts: products.filter(function(p) { return p.availability === 'AGOTADO'; }).length, totalOrders: orders.length, pendingOrders: pendingOrders } };
}

function saveProduct_(data) {
  const product = data.product || {};
  if (!String(product.name || '').trim()) throw new Error('El nombre del producto es obligatorio.');
  const productId = String(product.id || id_());
  const now = new Date();
  const record = {
    producto_id: productId, sku: String(product.sku || '').trim(), codigo_fabricante: String(product.manufacturerCode || '').trim(),
    nombre: String(product.name).trim(), descripcion_corta: String(product.shortDescription || '').trim(), descripcion: String(product.description || '').trim(),
    categoria_id: String(product.categoryId || '').trim(), subcategoria: String(product.subcategory || '').trim(), marca_id: String(product.brand || '').trim(),
    modelo: String(product.model || '').trim(), precio: product.price === null || product.price === '' ? '' : num_(product.price, ''),
    precio_promocional: '',
    moneda: 'PEN', unidad_venta: String(product.unit || 'unidad'), cantidad_minima: Math.max(1, num_(product.minQuantity, 1)),
    disponibilidad: String(product.availability || 'POR_CONFIRMAR'), stock_informado: '', proveedor_id: '', ultima_verificacion: '', tiempo_abastecimiento: '',
    imagen_principal: String(product.imageUrl || ''), imagenes_adicionales: '', ficha_pdf_url: String(product.datasheetUrl || ''),
    fuente_tecnica: String(product.technicalSource || ''), caracteristicas_json: '', destacado: product.featured ? 'TRUE' : 'FALSE', activo: 'TRUE',
    fecha_creacion: product.createdAt || now, fecha_actualizacion: now
  };
  upsert_('PRODUCTOS', 'producto_id', record);
  audit_(data.actor, data.role, 'GUARDAR_PRODUCTO', 'PRODUCTOS', productId, record.nombre);
  return { id: productId };
}

function updateOrder_(data) {
  const allowed = ['RECIBIDO','PENDIENTE_DISPONIBILIDAD','EN_COORDINACION','CONFIRMADO','EN_PREPARACION','ENVIADO','ENTREGADO','CANCELADO'];
  const orderId = String(data.orderId || ''); const status = String(data.status || '');
  if (allowed.indexOf(status) < 0) throw new Error('Estado de pedido inválido.');
  const sh = sheet_('PEDIDOS'); const values = sh.getDataRange().getValues(); const headers = values[0].map(String);
  const idCol = headers.indexOf('pedido_id'); const stateCol = headers.indexOf('estado');
  const rowIndex = values.findIndex(function(row, i) { return i > 0 && String(row[idCol]) === orderId; });
  if (rowIndex < 1) throw new Error('No se encontró el pedido.');
  sh.getRange(rowIndex + 1, stateCol + 1).setValue(status);
  audit_(data.actor, data.role, 'CAMBIAR_ESTADO_PEDIDO', 'PEDIDOS', orderId, status + ' ' + String(data.note || ''));
  return { updated: true };
}

function uploadFile_(data) {
  const rootId = PropertiesService.getScriptProperties().getProperty('DRIVE_ROOT_FOLDER_ID');
  if (!rootId) throw new Error('Configura DRIVE_ROOT_FOLDER_ID en las propiedades del script.');
  const mime = String(data.mimeType || ''); const kind = String(data.kind || 'image');
  const allowed = kind === 'pdf' ? ['application/pdf'] : ['image/jpeg','image/png','image/webp'];
  if (allowed.indexOf(mime) < 0) throw new Error('Tipo de archivo no permitido.');
  const base64 = String(data.base64 || '');
  if (!base64 || base64.length > 4.2 * 1024 * 1024) throw new Error('Archivo vacío o demasiado grande. Máximo aproximado: 3 MB.');
  const root = DriveApp.getFolderById(rootId);
  const folderName = kind === 'pdf' ? 'FICHAS_TECNICAS' : 'PRODUCTOS';
  const iterator = root.getFoldersByName(folderName);
  const folder = iterator.hasNext() ? iterator.next() : root.createFolder(folderName);
  const bytes = Utilities.base64Decode(base64);
  const safeName = String(data.name || 'archivo').replace(/[\\/:*?"<>|#%{}~&]/g, '_').slice(0, 100);
  const blob = Utilities.newBlob(bytes, mime, safeName);
  const file = folder.createFile(blob);
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  const id = file.getId();
  return { fileId: id, viewUrl: 'https://drive.google.com/uc?export=view&id=' + id, previewUrl: 'https://drive.google.com/file/d/' + id + '/preview', downloadUrl: 'https://drive.google.com/uc?export=download&id=' + id };
}
