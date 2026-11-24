import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { callAppsScript } from "@/lib/apps-script";

export const runtime = "nodejs";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Debes iniciar sesión." }, { status: 401 });
  if (session.role !== "admin") return NextResponse.json({ error: "Acceso exclusivo del administrador comercial." }, { status: 403 });
  try {
    const data = await callAppsScript<Record<string, unknown>>("adminData");
    return NextResponse.json({ ...data, session: { role: session.role, email: session.email } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Error consultando datos." }, { status: 503 });
  }
}
