import { NextResponse } from "next/server";
import { callAppsScript } from "@/lib/apps-script";
import type { Category, Product } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const data = await callAppsScript<{ products: Product[]; categories: Category[]; updatedAt: string }>("publicCatalog");
    return NextResponse.json(data, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo consultar el catálogo.";
    return NextResponse.json({ error: message }, { status: 503 });
  }
}
