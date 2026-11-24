import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { callAppsScript } from "@/lib/apps-script";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Debes iniciar sesión." }, { status: 401 });
  if (session.role !== "admin") return NextResponse.json({ error: "Acceso exclusivo del administrador comercial." }, { status: 403 });
  try {
    const product = await request.json();
    if (!String(product.name || "").trim()) return NextResponse.json({ error: "El nombre del producto es obligatorio." }, { status: 400 });
    const result = await callAppsScript<{ id: string }>("saveProduct", { product, actor: session.email, role: session.role });
    return NextResponse.json({ ok: true, id: result.id });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "No se pudo guardar el producto." }, { status: 400 });
  }
}
