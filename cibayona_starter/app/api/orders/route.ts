import { NextResponse } from "next/server";
import { callAppsScript } from "@/lib/apps-script";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const customer = body?.customer;
    const items = body?.items;
    if (!customer || !Array.isArray(items) || items.length === 0 || items.length > 40) {
      return NextResponse.json({ error: "El pedido no contiene datos válidos." }, { status: 400 });
    }
    const cleanCustomer = {
      name: String(customer.name || "").trim().slice(0, 120),
      phone: String(customer.phone || "").replace(/[^0-9+() -]/g, "").slice(0, 30),
      email: String(customer.email || "").trim().slice(0, 160),
      city: String(customer.city || "").trim().slice(0, 100),
      address: String(customer.address || "").trim().slice(0, 220),
      reference: String(customer.reference || "").trim().slice(0, 220),
      notes: String(customer.notes || "").trim().slice(0, 500)
    };
    if (!cleanCustomer.name || !cleanCustomer.phone || !cleanCustomer.city) {
      return NextResponse.json({ error: "Nombre, teléfono y ciudad son obligatorios." }, { status: 400 });
    }
    const cleanItems = items.map((item: { productId?: unknown; quantity?: unknown }) => ({
      productId: String(item.productId || "").slice(0, 80),
      quantity: Number(item.quantity)
    }));
    if (cleanItems.some((item) => !item.productId || !Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 100000)) {
      return NextResponse.json({ error: "Hay cantidades o productos inválidos en el carrito." }, { status: 400 });
    }
    const whatsappNumber = (process.env.WHATSAPP_NUMBER || "").replace(/\D/g, "");
    if (!whatsappNumber) {
      return NextResponse.json({ error: "Falta configurar WHATSAPP_NUMBER en Vercel. Completa esa variable antes de habilitar pedidos." }, { status: 503 });
    }
    const result = await callAppsScript<{ orderId: string; whatsappText: string; subtotal: number; currency: string }>("createOrder", { customer: cleanCustomer, items: cleanItems });
    const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(result.whatsappText)}`;
    return NextResponse.json({ orderId: result.orderId, whatsappUrl, subtotal: result.subtotal });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo registrar el pedido.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
