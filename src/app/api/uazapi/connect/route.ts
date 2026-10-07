import { NextRequest, NextResponse } from "next/server";
import { handle, parseBody, requireApiAuth } from "@/lib/api";
import { getSettings } from "@/lib/settings";
import { connectInstance, getInstanceStatus, UazapiError } from "@/lib/uazapi";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ConnectBody = z.object({
  phone: z
    .string()
    .trim()
    .regex(/^\d{10,15}$/, "Número inválido. Use DDI+DDD+número, ex.: 5511999998888.")
    .optional(),
});

/**
 * GET  → estado atual da instância (também devolve QR/código se estiver conectando)
 * POST → inicia o pareamento (com {phone} gera código, sem phone gera QR code)
 */
export async function GET(request: NextRequest) {
  const denied = await requireApiAuth(request);
  if (denied) return denied;

  try {
    const settings = await getSettings();
    return NextResponse.json(await getInstanceStatus(settings));
  } catch (err) {
    if (err instanceof UazapiError) {
      return NextResponse.json({ ok: false, error: err.message }, { status: 502 });
    }
    return handle(err);
  }
}

export async function POST(request: NextRequest) {
  const denied = await requireApiAuth(request);
  if (denied) return denied;

  const parsed = await parseBody(request, ConnectBody);
  if (parsed.error) return parsed.error;

  try {
    const settings = await getSettings();
    const result = await connectInstance(settings, parsed.data.phone);
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof UazapiError) {
      return NextResponse.json({ ok: false, error: err.message }, { status: 502 });
    }
    return handle(err);
  }
}
