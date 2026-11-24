"use client";

import { useEffect, useMemo, useState } from "react";
import type { CartLine, Category, Product } from "@/lib/types";

type CatalogResponse = { products: Product[]; categories: Category[]; updatedAt?: string };
type Customer = { name: string; phone: string; email: string; city: string; address: string; reference: string; notes: string };

const initialCustomer: Customer = { name: "", phone: "", email: "", city: "", address: "", reference: "", notes: "" };
const money = (amount: number | null, currency = "PEN") => amount === null ? "Consultar precio" : new Intl.NumberFormat("es-PE", { style: "currency", currency, maximumFractionDigits: 2 }).format(amount);

function statusLabel(status: string) {
  const labels: Record<string, string> = {
    DISPONIBLE_PROVEEDOR: "Disponible según proveedor",
    POR_CONFIRMAR: "Stock por confirmar",
    BAJO_PEDIDO: "Bajo pedido",
    AGOTADO: "Agotado",
    DESCONTINUADO: "Descontinuado"
  };
  return labels[status] || "Consultar disponibilidad";
}

export default function HomePage() {
  const [catalog, setCatalog] = useState<CatalogResponse>({ products: [], categories: [] });
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [customer, setCustomer] = useState<Customer>(initialCustomer);
  const [sending, setSending] = useState(false);
  const [orderError, setOrderError] = useState("");
  const [notice, setNotice] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem("cibayona-cart-v1");
    if (saved) {
      try { setCart(JSON.parse(saved) as CartLine[]); } catch { localStorage.removeItem("cibayona-cart-v1"); }
    }
    fetch("/api/catalog", { cache: "no-store" })
      .then(async (r) => { const body = await r.json(); if (!r.ok) throw new Error(body.error || "No se pudo cargar el catálogo."); return body as CatalogResponse; })
      .then(setCatalog)
      .catch((e: Error) => setLoadError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { localStorage.setItem("cibayona-cart-v1", JSON.stringify(cart)); }, [cart]);

  const visibleProducts = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("es");
    return catalog.products.filter((p) => {
      const matchesCategory = activeCategory === "all" || p.categoryId === activeCategory;
      const haystack = [p.name, p.sku, p.manufacturerCode, p.brand, p.model, p.categoryName, p.shortDescription, p.description].join(" ").toLocaleLowerCase("es");
      return matchesCategory && (!query || haystack.includes(query));
    });
  }, [catalog.products, search, activeCategory]);

  const offers = catalog.products.filter((product) => product.promotionalPrice !== null);
  const totalUnits = cart.reduce((sum, line) => sum + line.quantity, 0);
  const totalEstimate = cart.reduce((sum, line) => {
    const price = line.product.promotionalPrice ?? line.product.price;
    return sum + (price === null ? 0 : price * line.quantity);
  }, 0);
  const hasUnpriced = cart.some((line) => (line.product.promotionalPrice ?? line.product.price) === null);

  function addToCart(product: Product) {
    if (product.availability === "AGOTADO" || product.availability === "DESCONTINUADO") return;
    const step = Math.max(1, product.minQuantity || 1);
    setCart((current) => {
      const found = current.find((line) => line.product.id === product.id);
      if (found) return current.map((line) => line.product.id === product.id ? { ...line, quantity: line.quantity + step } : line);
      return [...current, { product, quantity: step }];
    });
    setNotice(`${product.name} agregado al carrito`);
    setCartOpen(true);
    window.setTimeout(() => setNotice(""), 2800);
  }

  function changeQuantity(productId: string, delta: number) {
    setCart((current) => current.map((line) => {
      if (line.product.id !== productId) return line;
      const step = Math.max(1, line.product.minQuantity || 1);
      return { ...line, quantity: Math.max(step, line.quantity + delta * step) };
    }));
  }

  function removeLine(productId: string) { setCart((current) => current.filter((line) => line.product.id !== productId)); }

  async function submitOrder() {
    setOrderError("");
    if (!customer.name.trim() || !customer.phone.trim() || !customer.city.trim()) {
      setOrderError("Completa tu nombre, teléfono y ciudad para continuar."); return;
    }
    if (!cart.length) { setOrderError("Tu carrito está vacío."); return; }
    setSending(true);
    try {
      const response = await fetch("/api/orders", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customer, items: cart.map((line) => ({ productId: line.product.id, quantity: line.quantity })) })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "No se pudo registrar el pedido.");
      setCart([]); setCheckoutOpen(false); setCartOpen(false); setCustomer(initialCustomer);
      window.location.href = result.whatsappUrl;
    } catch (e) { setOrderError(e instanceof Error ? e.message : "Ocurrió un error al enviar el pedido."); }
    finally { setSending(false); }
  }

  const facebook = process.env.NEXT_PUBLIC_FACEBOOK_URL;
  const tiktok = process.env.NEXT_PUBLIC_TIKTOK_URL;

  return (
    <main>
      <div className="topline"><div className="container topline-inner"><span>Soluciones industriales, eléctricas y tecnológicas</span><span>Atención digital 24/7 · Envíos previa coordinación</span></div></div>
      <header className="site-header">
        <div className="container header-inner">
          <a className="brand" href="#inicio" aria-label="CIBAYONA inicio"><span className="brand-symbol">C</span><span><strong>CIBAYONA</strong><small>SUMINISTROS INDUSTRIALES</small></span></a>
          <div className="header-search"><span aria-hidden="true">⌕</span><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por producto, marca o código..." aria-label="Buscar productos" /><button onClick={() => setSearch("")} aria-label="Limpiar búsqueda">×</button></div>
          <button className="cart-trigger" onClick={() => setCartOpen(true)}><span>▣</span> Mi carrito <b>{totalUnits}</b></button>
        </div>
        <nav className="main-nav"><div className="container nav-inner"><a href="#inicio">Inicio</a><a href="#catalogo">Catálogo</a><a href="#ofertas">Ofertas</a><a href="#nosotros">Nosotros</a><a href="#contacto">Contacto</a><span className="nav-spacer"/><span className="nav-note">Compra fácil · Coordina por WhatsApp</span></div></nav>
      </header>

      <section className="hero" id="inicio"><div className="container hero-grid"><div className="hero-copy"><span className="eyebrow"><i/> COMERCIO INDUSTRIAL INTELIGENTE</span><h1>El suministro que tu proyecto <em>necesita.</em></h1><p>Encuentra productos industriales y eléctricos, consulta sus características técnicas y coordina tu pedido con nuestro equipo.</p><div className="hero-actions"><a className="btn btn-orange" href="#catalogo">Explorar catálogo <span>→</span></a><a className="btn btn-outline" href="#contacto">Conoce CIBAYONA</a></div><div className="hero-proof"><span>✓ Información técnica</span><span>✓ Atención personalizada</span><span>✓ Entrega coordinada</span></div></div><div className="hero-art" aria-label="Panel gráfico industrial"><div className="art-orbit orbit-one"/><div className="art-orbit orbit-two"/><div className="art-core"><span>CB</span><small>INDUSTRIAL<br/>SUPPLY</small></div><div className="art-tag tag-top"><b>24/7</b><small>CATÁLOGO ONLINE</small></div><div className="art-tag tag-bottom"><b>01</b><small>CONSULTA Y COTIZA</small></div><div className="art-line line-one"/><div className="art-line line-two"/></div></div></section>

      <section className="trust-strip"><div className="container trust-grid"><div><b>Catálogo digital</b><span>Productos y fichas técnicas</span></div><div><b>Compra asistida</b><span>Pedido directo por WhatsApp</span></div><div><b>Modelo flexible</b><span>Disponibilidad por proveedor</span></div><div><b>Entrega coordinada</b><span>Confirmamos costo y plazo</span></div></div></section>

      <section className="section catalog-section" id="catalogo"><div className="container"><div className="section-heading"><div><span className="eyebrow">EXPLORA NUESTRO PORTAFOLIO</span><h2>Catálogo de productos</h2><p>Busca por nombre, marca, modelo o código de fabricante.</p></div><span className="catalog-count">{catalog.products.length} productos publicados</span></div>
        <div className="category-row"><button className={activeCategory === "all" ? "category-pill active" : "category-pill"} onClick={() => setActiveCategory("all")}>Todos</button>{catalog.categories.map((c) => <button key={c.id} className={activeCategory === c.id ? "category-pill active" : "category-pill"} onClick={() => setActiveCategory(c.id)}>{c.name}</button>)}</div>
        {loading ? <div className="empty-state"><div className="loader"/><b>Cargando catálogo...</b><span>Estamos consultando los productos publicados.</span></div> : loadError ? <div className="empty-state error-state"><b>No fue posible conectar con el catálogo</b><span>{loadError}</span><small>Verifica la configuración de Google Apps Script y las variables de entorno.</small></div> : visibleProducts.length === 0 ? <div className="empty-state"><div className="empty-icon">⌕</div><b>{search || activeCategory !== "all" ? "No encontramos productos" : "Estamos preparando nuestro catálogo"}</b><span>{search || activeCategory !== "all" ? "Prueba otra palabra o selecciona otra categoría." : "Los productos se mostrarán aquí cuando sean publicados desde el panel administrativo."}</span>{(search || activeCategory !== "all") && <button className="btn btn-outline" onClick={() => { setSearch(""); setActiveCategory("all"); }}>Ver todo el catálogo</button>}</div> : <div className="product-grid">{visibleProducts.map((product) => <article className="product-card" key={product.id}><div className="product-image">{product.imageUrl ? <img src={product.imageUrl} alt={product.name} loading="lazy"/> : <div className="product-placeholder"><span>CB</span><small>PRODUCTO<br/>INDUSTRIAL</small></div>}{product.featured && <span className="featured-tag">DESTACADO</span>}</div><div className="product-content"><span className="product-brand">{product.brand || "Marca por confirmar"}</span><h3>{product.name}</h3><p className="product-code">Código: {product.sku || product.manufacturerCode || "Por asignar"}</p><p className="product-desc">{product.shortDescription || "Consulta los detalles y especificaciones de este producto."}</p><div className="product-status"><i className={product.availability === "AGOTADO" ? "dot dot-red" : "dot"}/>{statusLabel(product.availability)}</div><div className="product-price">{product.promotionalPrice !== null && product.price !== null && <del>{money(product.price, product.currency || "PEN")}</del>}<strong>{money(product.promotionalPrice ?? product.price, product.currency === "PEN" ? "PEN" : product.currency || "PEN")}</strong></div><div className="product-actions"><button className="detail-link" onClick={() => setSelectedProduct(product)}>Ver ficha</button><button className="add-button" disabled={product.availability === "AGOTADO" || product.availability === "DESCONTINUADO"} onClick={() => addToCart(product)}>Agregar +</button></div><small className="min-qty">Venta: {product.unit || "unidad"} · Mínimo: {product.minQuantity || 1}</small></div></article>)}</div>}
      </div></section>

      <section className="offers-section" id="ofertas"><div className="container"><div className="offers-inner"><div><span className="eyebrow light-eyebrow">OPORTUNIDADES PARA TU PROYECTO</span><h2>Ofertas y promociones</h2><p>Promociones publicadas con vigencia definida y sujetas a confirmación de disponibilidad.</p></div><a className="btn btn-white" href="#catalogo">Ver catálogo <span>→</span></a></div>{offers.length > 0 ? <div className="offer-grid">{offers.slice(0, 3).map((product) => <button className="offer-card" key={product.id} onClick={() => setSelectedProduct(product)}><small>PRECIO PROMOCIONAL</small><b>{product.name}</b><strong>{money(product.promotionalPrice, product.currency || "PEN")}</strong><span>Ver producto →</span></button>)}</div> : <p className="no-offers">Las promociones vigentes aparecerán aquí cuando se publiquen desde la hoja PROMOCIONES.</p>}</div></section>

      <section className="section about-section" id="nosotros"><div className="container about-grid"><div className="about-visual"><div className="about-number">CB<span>.</span></div><div className="about-caption">CORPORACIÓN<br/>INDUSTRIAL BAYONA</div></div><div className="about-copy"><span className="eyebrow">QUIÉNES SOMOS</span><h2>Conectamos tus necesidades con soluciones de suministro.</h2><p>CIBAYONA acerca productos industriales y eléctricos a empresas, técnicos y profesionales. Nuestro catálogo digital facilita la consulta de productos, códigos y documentos técnicos.</p><div className="about-points"><div><b>01</b><span><strong>Consulta clara</strong><small>Información comercial y técnica disponible en línea.</small></span></div><div><b>02</b><span><strong>Coordinación directa</strong><small>Verificamos disponibilidad con nuestros proveedores.</small></span></div><div><b>03</b><span><strong>Entrega coordinada</strong><small>Confirmamos alternativas, costos y plazos antes de cerrar.</small></span></div></div></div></div></section>

      <section className="contact-section" id="contacto"><div className="container contact-inner"><div><span className="eyebrow light-eyebrow">¿NECESITAS UN PRODUCTO ESPECÍFICO?</span><h2>Cuéntanos qué necesitas.</h2><p>Te ayudamos a identificar el producto y coordinar disponibilidad, precio y entrega.</p></div><a className="btn btn-orange" href={`mailto:ventas@cibayona.com?subject=${encodeURIComponent("Consulta comercial CIBAYONA")}`}>Escribir a ventas <span>→</span></a></div></section>

      <footer className="site-footer"><div className="container footer-grid"><div><a className="brand footer-brand" href="#inicio"><span className="brand-symbol">C</span><span><strong>CIBAYONA</strong><small>SUMINISTROS INDUSTRIALES</small></span></a><p>Soluciones de suministro industrial, eléctrico y tecnológico.</p></div><div><h4>Explora</h4><a href="#catalogo">Catálogo</a><a href="#ofertas">Ofertas y promociones</a><a href="#nosotros">Nosotros</a></div><div><h4>Contacto</h4><a href="mailto:ventas@cibayona.com">ventas@cibayona.com</a><span>Envíos previa coordinación</span>{facebook && <a href={facebook} target="_blank" rel="noreferrer">Facebook ↗</a>}{tiktok && <a href={tiktok} target="_blank" rel="noreferrer">TikTok ↗</a>}</div><div><h4>Información legal</h4><strong>Corporación Industrial Bayona E.I.R.L.</strong><span>RUC: 20613105345</span><a href="mailto:ventas@cibayona.com">ventas@cibayona.com</a></div></div><div className="container footer-bottom"><span>© {new Date().getFullYear()} CIBAYONA. Todos los derechos reservados.</span><span>Plataforma desarrollada por <a href="https://comaxion.vercel.app" target="_blank" rel="noreferrer">COMAXION</a></span></div></footer>

      {notice && <div className="toast">✓ {notice}</div>}
      {selectedProduct && <div className="overlay modal-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) setSelectedProduct(null); }}><section className="product-modal"><div className="drawer-head"><div><span className="eyebrow">FICHA DEL PRODUCTO</span><h2>{selectedProduct.name}</h2></div><button className="close-button" onClick={() => setSelectedProduct(null)}>×</button></div><div className="product-detail-grid"><div className="detail-image">{selectedProduct.imageUrl ? <img src={selectedProduct.imageUrl} alt={selectedProduct.name}/> : <span>CB</span>}</div><div className="detail-data"><p><b>Marca:</b> {selectedProduct.brand || "Por confirmar"}</p><p><b>Código:</b> {selectedProduct.sku || selectedProduct.manufacturerCode || "Por asignar"}</p><p><b>Modelo:</b> {selectedProduct.model || "No especificado"}</p><p><b>Categoría:</b> {selectedProduct.categoryName || "No especificada"}</p><p><b>Unidad:</b> {selectedProduct.unit} · <b>Mínimo:</b> {selectedProduct.minQuantity}</p><p><b>Disponibilidad:</b> {statusLabel(selectedProduct.availability)}</p><p><b>Última verificación:</b> {selectedProduct.lastVerified ? new Date(selectedProduct.lastVerified).toLocaleDateString("es-PE") : "No registrada"}</p><p className="detail-description">{selectedProduct.description || selectedProduct.shortDescription || "No se ha registrado una descripción técnica."}</p>{selectedProduct.technicalSource && <p><b>Fuente técnica:</b> {selectedProduct.technicalSource}</p>}<strong className="detail-price">{money(selectedProduct.promotionalPrice ?? selectedProduct.price, selectedProduct.currency || "PEN")}</strong><button className="btn btn-orange" disabled={selectedProduct.availability === "AGOTADO" || selectedProduct.availability === "DESCONTINUADO"} onClick={() => { addToCart(selectedProduct); setSelectedProduct(null); }}>Agregar al carrito →</button></div></div><div className="detail-pdf"><h3>Ficha técnica PDF</h3>{selectedProduct.datasheetUrl ? <><iframe src={selectedProduct.datasheetUrl} title={`Ficha técnica de ${selectedProduct.name}`} loading="lazy"/><a href={selectedProduct.datasheetUrl} target="_blank" rel="noreferrer">Abrir ficha técnica en otra pestaña ↗</a></> : <p>La ficha técnica PDF todavía no ha sido cargada.</p>}</div></section></div>}
      {cartOpen && <div className="overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) setCartOpen(false); }}><aside className="cart-drawer"><div className="drawer-head"><div><span className="eyebrow">TU SELECCIÓN</span><h2>Carrito de compras</h2></div><button className="close-button" onClick={() => setCartOpen(false)}>×</button></div>{cart.length === 0 ? <div className="drawer-empty">Tu carrito está vacío. Explora el catálogo y agrega productos.</div> : <><div className="cart-lines">{cart.map((line) => <div className="cart-line" key={line.product.id}><div className="cart-line-image">{line.product.imageUrl ? <img src={line.product.imageUrl} alt=""/> : "CB"}</div><div className="cart-line-info"><b>{line.product.name}</b><small>{line.product.sku} · {line.product.unit}</small><strong>{money(line.product.promotionalPrice ?? line.product.price, line.product.currency || "PEN")}</strong><div className="quantity-controls"><button onClick={() => changeQuantity(line.product.id, -1)} aria-label="Disminuir">−</button><span>{line.quantity}</span><button onClick={() => changeQuantity(line.product.id, 1)} aria-label="Aumentar">+</button><button className="remove-line" onClick={() => removeLine(line.product.id)}>Quitar</button></div><small>Mínimo/múltiplo: {line.product.minQuantity}</small></div></div>)}</div><div className="cart-summary"><div><span>Subtotal estimado</span><b>{money(totalEstimate, "PEN")}{hasUnpriced ? "*" : ""}</b></div>{hasUnpriced && <small>* Algunos productos requieren cotización. El total final será confirmado por ventas.</small>}<p>Envíos y entregas sujetos a coordinación previa. El costo y plazo serán confirmados por nuestro equipo.</p><button className="btn btn-orange btn-full" onClick={() => setCheckoutOpen(true)}>Continuar por WhatsApp →</button></div></>}</aside></div>}
      {checkoutOpen && <div className="overlay modal-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) setCheckoutOpen(false); }}><section className="checkout-modal"><div className="drawer-head"><div><span className="eyebrow">DATOS PARA COORDINAR</span><h2>Finalizar pedido</h2></div><button className="close-button" onClick={() => setCheckoutOpen(false)}>×</button></div><p className="modal-note">Este pedido es una solicitud de compra. La disponibilidad, precio final y envío se confirmarán antes de concretarlo.</p><div className="form-grid"><label>Nombre completo *<input value={customer.name} onChange={(e) => setCustomer({ ...customer, name: e.target.value })} /></label><label>Teléfono / WhatsApp *<input value={customer.phone} onChange={(e) => setCustomer({ ...customer, phone: e.target.value })} /></label><label>Correo electrónico<input type="email" value={customer.email} onChange={(e) => setCustomer({ ...customer, email: e.target.value })} /></label><label>Ciudad o distrito *<input value={customer.city} onChange={(e) => setCustomer({ ...customer, city: e.target.value })} /></label><label className="wide-field">Dirección de entrega<input value={customer.address} onChange={(e) => setCustomer({ ...customer, address: e.target.value })} /></label><label className="wide-field">Referencia<textarea value={customer.reference} onChange={(e) => setCustomer({ ...customer, reference: e.target.value })} rows={2}/></label><label className="wide-field">Observaciones<textarea value={customer.notes} onChange={(e) => setCustomer({ ...customer, notes: e.target.value })} rows={2}/></label></div>{orderError && <p className="form-error">{orderError}</p>}<button className="btn btn-orange btn-full" disabled={sending} onClick={submitOrder}>{sending ? "Registrando pedido..." : "Registrar y abrir WhatsApp →"}</button></section></div>}
    </main>
  );
}
