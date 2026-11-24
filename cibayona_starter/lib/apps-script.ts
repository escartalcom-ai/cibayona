/** Server-only bridge. Never import this module into a Client Component. */
type AppsScriptResponse<T> = { ok: boolean; data?: T; error?: string };

export async function callAppsScript<T>(action: string, data: Record<string, unknown> = {}): Promise<T> {
  const url = process.env.APPS_SCRIPT_URL;
  const secret = process.env.APPS_SCRIPT_SECRET;
  if (!url || !secret || url.includes("REEMPLAZA_DEPLOYMENT_ID")) {
    throw new Error("Falta configurar APPS_SCRIPT_URL y APPS_SCRIPT_SECRET en las variables de entorno.");
  }

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify({ secret, action, data }),
    cache: "no-store",
    redirect: "follow"
  });

  if (!response.ok) throw new Error(`Apps Script respondió HTTP ${response.status}.`);
  let result: AppsScriptResponse<T>;
  try {
    result = (await response.json()) as AppsScriptResponse<T>;
  } catch {
    throw new Error("Apps Script no devolvió JSON válido. Revisa el despliegue /exec.");
  }
  if (!result.ok) throw new Error(result.error || "Error no especificado en Apps Script.");
  return result.data as T;
}
