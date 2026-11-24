import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { callAppsScript } from "@/lib/apps-script";

export const runtime = "nodejs";

export async function PATCH(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Debes iniciar sesión." }, { status: 401 });
  if (session.role !== "admin") return NextResponse.json({ error: "Acceso exclusivo del administrador comercial." }, { status: 403 });
  try {
    const { orderId, status, note } = await request.json();
    const result = await callAppsScript<{ updated: boolean }>("updateOrder", { orderId, status, note, actor: session.email, role: session.role });
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "No se pudo actualizar el pedido." }, { status: 400 });
  }
}
