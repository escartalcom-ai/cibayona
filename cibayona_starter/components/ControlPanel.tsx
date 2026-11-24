"use client";

import { useEffect, useState, type FormEvent } from "react";
import type { SessionRole } from "@/lib/types";

type Props = { role: SessionRole };
type AdminData = { products?: Array<Record<string, unknown>>; orders?: Array<Record<string, unknown>>; stats?: Record<string, number>; categories?: Array<Record<string, unknown>>; session?: { email: string; role: SessionRole } };

export default function ControlPanel({ role }: Props) {
  const [email, setEmail] = useState(role === "admin" ? "admin@cibayona.com" : "desarrollador@comaxion.com");
  const [password, setPassword] = useState("");
  const [logged, setLogged] = useState(false);
  const [data, setData] = useState<AdminData>({});
  const [health, setHealth] = useState<Record<string, string> | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [product, setProduct] = useState({ name: "", sku: "", brand: "", categoryId: "", shortDescription: "", price: "", unit: "unidad", minQuantity: "1", availability: "POR_CONFIRMAR", imageUrl: "", datasheetUrl: "", technicalSource: "" });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [pdfFile, setPdfFile] = useState<File | null>(null);

  async function loadDashboard() {
    if (role === "developer") {
      const healthResponse = await fetch("/api/admin/health", { cache: "no-store" });
      const healthResult = await healthResponse.json();
      if (!healthResponse.ok) throw new Error(healthResult.error || "Acceso exclusivo del desarrollador.");
      setHealth(healthResult.checks || {});
      setData({ session: healthResult.session });
      setLogged(true);
      return;
    }
    const response = await fetch("/api/admin/data", { cache: "no-store" });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "No se pudieron cargar los datos.");
    setData(result);
    setLogged(true);
  }

  useEffect(() => { loadDashboard().catch(() => undefined); }, []); // Revalidates the HttpOnly session when opening the panel.

  async function login(e: FormEvent) {
    e.preventDefault(); setBusy(true); setError("");
    try {
      const response = await fetch("/api/admin/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password, role }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Acceso denegado.");
      setPassword(""); await loadDashboard();
    } catch (e) { setError(e instanceof Error ? e.message : "No se pudo iniciar sesión."); }
    finally { setBusy(false); }
  }

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" }); setLogged(false); setData({}); setHealth(null);
  }

  async function upload(file: File, kind: "image" | "pdf") {
    const form = new FormData(); form.append("file", file); form.append("kind", kind);
    const response = await fetch("/api/admin/upload", { method: "POST", body: form });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Error subiendo archivo.");
    return result as { viewUrl: string; previewUrl: string; downloadUrl: string };
  }

  async function saveProduct(e: FormEvent) {
    e.preventDefault(); setBusy(true); setError(""); setMessage("");
    try {
      let imageUrl = product.imageUrl;
      let datasheetUrl = product.datasheetUrl;
      if (imageFile) { const uploaded = await upload(imageFile, "image"); imageUrl = uploaded.viewUrl; }
      if (pdfFile) { const uploaded = await upload(pdfFile, "pdf"); datasheetUrl = uploaded.previewUrl; }
      const payload = { ...product, imageUrl, datasheetUrl, price: product.price === "" ? null : Number(product.price), minQuantity: Number(product.minQuantity) };
      const response = await fetch("/api/admin/products", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "No se pudo guardar el producto.");
      setMessage(`Producto guardado. ID: ${result.id}`); setProduct({ name: "", sku: "", brand: "", categoryId: "", shortDescription: "", price: "", unit: "unidad", minQuantity: "1", availability: "POR_CONFIRMAR", imageUrl: "", datasheetUrl: "", technicalSource: "" }); setImageFile(null); setPdfFile(null); await loadDashboard();
    } catch (e) { setError(e instanceof Error ? e.message : "No se pudo guardar el producto."); }
    finally { setBusy(false); }
  }

  async function changeOrderStatus(orderId: string, status: string) {
    setError("");
    const response = await fetch("/api/admin/orders", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ orderId, status }) });
    const result = await response.json();
    if (!response.ok) { setError(result.error || "No se pudo actualizar el pedido."); return; }
    setMessage(`Pedido ${orderId} actualizado.`); await loadDashboard();
  }

  const title = role === "admin" ? "Panel administrativo" : "Centro de control COMAXION";
  const stats = data.stats || {};

  if (!logged) return <main className="control-shell"><a className="control-back" href="/">← Volver a CIBAYONA</a><section className="login-card"><span className="control-eyebrow">CIBAYONA · ACCESO RESTRINGIDO</span><div className="control-mark">{role === "admin" ? "CB" : "CX"}</div><h1>{title}</h1><p>{role === "admin" ? "Gestiona productos, pedidos y disponibilidad comercial." : "Supervisa integraciones, accesos y estado técnico de la plataforma."}</p><form onSubmit={login}><label>Correo electrónico<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" required/></label><label>Contraseña<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required/></label>{error && <div className="control-error">{error}</div>}<button className="control-primary" disabled={busy}>{busy ? "Verificando acceso..." : "Ingresar al panel"}</button></form><small>El acceso se valida en el servidor. No compartas estas credenciales.</small></section></main>;

  return <main className="control-shell"><header className="control-top"><a className="control-back" href="/">← Tienda CIBAYONA</a><div><span>{title}</span><b>{data.session?.email}</b><button onClick={logout}>Cerrar sesión</button></div></header><div className="control-container"><div className="control-heading"><div><span className="control-eyebrow">{role === "admin" ? "OPERACIÓN COMERCIAL" : "SUPERVISIÓN TÉCNICA"}</span><h1>{title}</h1><p>{role === "admin" ? "Administra el catálogo y verifica los pedidos recibidos." : "Estado de servicios e integraciones conectadas."}</p></div><button className="control-refresh" onClick={() => loadDashboard().catch((e) => setError(e.message))}>↻ Actualizar</button></div>
    {error && <div className="control-error">{error}</div>}{message && <div className="control-success">{message}</div>}
    {role === "admin" && <div className="stats-grid"><div><span>Productos</span><b>{stats.totalProducts ?? data.products?.length ?? 0}</b></div><div><span>Activos</span><b>{stats.activeProducts ?? "—"}</b></div><div><span>Pedidos</span><b>{stats.totalOrders ?? data.orders?.length ?? 0}</b></div><div><span>Pendientes</span><b>{stats.pendingOrders ?? "—"}</b></div></div>}
    {role === "developer" ? <><section className="control-card"><h2>Estado de integraciones</h2><p className="control-muted">Comprobación en tiempo real desde el servidor.</p><div className="health-grid">{Object.entries(health || {}).map(([key, value]) => <div key={key}><span>{key === "appsScript" ? "Google Apps Script" : key === "sheets" ? "Google Sheets" : key === "drive" ? "Google Drive" : "Vercel"}</span><b className={value === "operativo" || value === "conectado" || value === "configurado" ? "health-ok" : "health-warn"}>{value}</b></div>)}</div><p className="control-muted">Las comprobaciones confirman conectividad básica; no sustituyen pruebas completas ni monitoreo externo de disponibilidad.</p></section><section className="control-card"><h2>Responsabilidades del desarrollador</h2><ul><li>Administrar variables de entorno en Vercel.</li><li>Proteger y rotar los secretos de Apps Script.</li><li>Administrar permisos y despliegues de Google Drive.</li><li>Realizar copias de seguridad de Google Sheets.</li><li>Revisar los registros de Vercel y Apps Script.</li></ul><a className="control-link" href="https://vercel.com/dashboard" target="_blank" rel="noreferrer">Abrir Vercel ↗</a></section></> : <><section className="control-card"><h2>Registrar producto</h2><p className="control-muted">Completa la información verificada. Los campos de precio pueden dejarse vacíos para cotizar.</p><form className="product-form" onSubmit={saveProduct}><label>Nombre del producto *<input value={product.name} onChange={(e) => setProduct({ ...product, name: e.target.value })} required/></label><label>SKU / Código<input value={product.sku} onChange={(e) => setProduct({ ...product, sku: e.target.value })}/></label><label>Marca<input value={product.brand} onChange={(e) => setProduct({ ...product, brand: e.target.value })}/></label><label>ID de categoría<input value={product.categoryId} onChange={(e) => setProduct({ ...product, categoryId: e.target.value })}/></label><label>Precio (S/)<input type="number" min="0" step="0.01" value={product.price} onChange={(e) => setProduct({ ...product, price: e.target.value })}/></label><label>Unidad de venta<input value={product.unit} onChange={(e) => setProduct({ ...product, unit: e.target.value })}/></label><label>Cantidad mínima<input type="number" min="1" step="1" value={product.minQuantity} onChange={(e) => setProduct({ ...product, minQuantity: e.target.value })}/></label><label>Disponibilidad<select value={product.availability} onChange={(e) => setProduct({ ...product, availability: e.target.value })}><option value="POR_CONFIRMAR">Stock por confirmar</option><option value="DISPONIBLE_PROVEEDOR">Disponible según proveedor</option><option value="BAJO_PEDIDO">Bajo pedido</option><option value="AGOTADO">Agotado</option><option value="DESCONTINUADO">Descontinuado</option></select></label><label>Descripción corta<input value={product.shortDescription} onChange={(e) => setProduct({ ...product, shortDescription: e.target.value })}/></label><label className="full-control-field">URL de imagen (opcional)<input value={product.imageUrl} onChange={(e) => setProduct({ ...product, imageUrl: e.target.value })}/></label><label>Subir imagen a Drive (JPG/PNG/WebP, máx. 3 MB)<input type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => setImageFile(e.target.files?.[0] || null)}/></label><label>Subir ficha técnica PDF (máx. 3 MB)<input type="file" accept="application/pdf" onChange={(e) => setPdfFile(e.target.files?.[0] || null)}/></label><label className="full-control-field">Fuente técnica / fabricante<input value={product.technicalSource} onChange={(e) => setProduct({ ...product, technicalSource: e.target.value })}/></label><button className="control-primary" disabled={busy}>{busy ? "Guardando..." : "Guardar producto"}</button></form></section><section className="control-card"><h2>Productos registrados</h2><div className="table-wrap"><table><thead><tr><th>Producto</th><th>SKU</th><th>Disponibilidad</th><th>Precio</th></tr></thead><tbody>{(data.products || []).slice(0, 30).map((p, i) => <tr key={String(p.id || i)}><td>{String(p.name || "—")}</td><td>{String(p.sku || "—")}</td><td>{String(p.availability || "—")}</td><td>{p.price === null || p.price === undefined || p.price === "" ? "Consultar" : `S/ ${String(p.price)}`}</td></tr>)}</tbody></table></div></section><section className="control-card"><h2>Pedidos recientes</h2><div className="table-wrap"><table><thead><tr><th>Código</th><th>Cliente</th><th>Fecha</th><th>Estado</th><th>Actualizar</th></tr></thead><tbody>{(data.orders || []).slice(0, 30).map((o, i) => <tr key={String(o.orderId || i)}><td>{String(o.orderId || "—")}</td><td>{String(o.customerName || "—")}</td><td>{String(o.date || "—")}</td><td>{String(o.status || "—")}</td><td><select value={String(o.status || "RECIBIDO")} onChange={(e) => changeOrderStatus(String(o.orderId), e.target.value)}><option value="RECIBIDO">Recibido</option><option value="PENDIENTE_DISPONIBILIDAD">Pendiente disponibilidad</option><option value="EN_COORDINACION">En coordinación</option><option value="CONFIRMADO">Confirmado</option><option value="EN_PREPARACION">En preparación</option><option value="ENVIADO">Enviado</option><option value="ENTREGADO">Entregado</option><option value="CANCELADO">Cancelado</option></select></td></tr>)}</tbody></table></div></section></>}
  </div></main>;
}
