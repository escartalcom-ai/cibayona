import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { callAppsScript } from "@/lib/apps-script";

export const runtime = "nodejs";

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "developer") return NextResponse.json({ error: "Acceso exclusivo del desarrollador." }, { status: 403 });
  const checks: Record<string, string> = { vercel: "operativo", appsScript: "no verificado", sheets: "no verificado", drive: "no verificado" };
  try {
    const response = await callAppsScript<{ spreadsheet: boolean; drive: boolean; timestamp: string }>("health");
    checks.appsScript = "operativo";
    checks.sheets = response.spreadsheet ? "conectado" : "no configurado";
    checks.drive = response.drive ? "configurado" : "no configurado";
    return NextResponse.json({ checks, timestamp: response.timestamp, session: { role: session.role, email: session.email } });
  } catch (error) {
    checks.appsScript = error instanceof Error ? error.message : "error de conexión";
    return NextResponse.json({ checks, timestamp: new Date().toISOString(), session: { role: session.role, email: session.email } });
  }
}
