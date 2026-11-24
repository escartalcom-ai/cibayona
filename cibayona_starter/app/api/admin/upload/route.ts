import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { callAppsScript } from "@/lib/apps-script";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Debes iniciar sesión." }, { status: 401 });
  if (session.role !== "admin") return NextResponse.json({ error: "Acceso exclusivo del administrador comercial." }, { status: 403 });
  try {
    const form = await request.formData();
    const file = form.get("file");
    const kind = String(form.get("kind") || "image");
    if (!(file instanceof File)) return NextResponse.json({ error: "Selecciona un archivo." }, { status: 400 });
    if (file.size > 3 * 1024 * 1024) return NextResponse.json({ error: "El archivo supera el máximo de 3 MB." }, { status: 413 });
    const allowed = kind === "pdf" ? ["application/pdf"] : ["image/jpeg", "image/png", "image/webp"];
    if (!allowed.includes(file.type)) return NextResponse.json({ error: kind === "pdf" ? "Solo se permiten archivos PDF." : "Usa una imagen JPG, PNG o WebP." }, { status: 400 });
    const bytes = Buffer.from(await file.arrayBuffer());
    const result = await callAppsScript<{ fileId: string; viewUrl: string; previewUrl: string; downloadUrl: string }>("uploadFile", {
      name: file.name.slice(0, 120), mimeType: file.type, base64: bytes.toString("base64"), kind
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "No se pudo subir el archivo a Drive." }, { status: 400 });
  }
}
