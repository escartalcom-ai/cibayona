import { NextResponse } from "next/server";
import { createSessionToken, sessionCookie, sessionMaxAge } from "@/lib/auth";
import type { SessionRole } from "@/lib/types";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const { email, password, role } = await request.json();
    const normalizedEmail = String(email || "").trim().toLowerCase();
    const suppliedPassword = String(password || "");
    const selectedRole = role as SessionRole;
    const expectedEmail = selectedRole === "developer" ? process.env.DEVELOPER_EMAIL : process.env.ADMIN_EMAIL;
    const expectedPassword = selectedRole === "developer" ? process.env.DEVELOPER_PASSWORD : process.env.ADMIN_PASSWORD;
    if (!expectedEmail || !expectedPassword || !process.env.SESSION_SECRET) {
      return NextResponse.json({ error: "Faltan credenciales del panel en las variables de entorno." }, { status: 503 });
    }
    if ((selectedRole !== "admin" && selectedRole !== "developer") || normalizedEmail !== expectedEmail.toLowerCase() || suppliedPassword !== expectedPassword) {
      return NextResponse.json({ error: "Correo o contraseña incorrectos." }, { status: 401 });
    }
    const response = NextResponse.json({ ok: true, role: selectedRole, email: normalizedEmail });
    response.cookies.set(sessionCookie, createSessionToken(normalizedEmail, selectedRole), {
      httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict", path: "/", maxAge: sessionMaxAge
    });
    return response;
  } catch {
    return NextResponse.json({ error: "Solicitud de acceso inválida." }, { status: 400 });
  }
}
