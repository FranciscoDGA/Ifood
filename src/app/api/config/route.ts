import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { handle, parseBody, requireApiAuth } from "@/lib/api";
import { getSettings, updateSettings } from "@/lib/settings";
import { shortId } from "@/lib/ids";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const denied = await requireApiAuth(request);
  if (denied) return denied;
  try {
    const s = await getSettings();
    const origin = request.nextUrl.origin;
    return NextResponse.json({
      settings: s,
      webhookUrl: `${origin}/api/webhook/uazapi/${s.webhookSecret}`,
    });
  } catch (err) {
    return handle(err);
  }
}

const Patch = z.object({
  storeName: z.string().optional(),
  uazapiUrl: z.string().url("URL inválida.").optional(),
  uazapiToken: z.string().optional(),
  templateConfirmado: z.string().optional(),
  templateACaminho: z.string().optional(),
  templateEntregue: z.string().optional(),
  templateCancelado: z.string().optional(),
  notifyConfirmado: z.boolean().optional(),
  notifyEntregue: z.boolean().optional(),
  notifyCancelado: z.boolean().optional(),
  alarmSound: z.enum(["beep", "chime", "siren", "off"]).optional(),
  alarmEnabled: z.boolean().optional(),
  ignoreGroups: z.boolean().optional(),
  ignoreFromMe: z.boolean().optional(),
  deliveryFee: z.number().min(0).optional(),
  rotateSecret: z.boolean().optional(),
});

export async function PUT(request: NextRequest) {
  const denied = await requireApiAuth(request);
  if (denied) return denied;

  const parsed = await parseBody(request, Patch);
  if (parsed.error) return parsed.error;

  try {
    const patch: Record<string, unknown> = { ...parsed.data };
    const rotate = patch.rotateSecret;
    delete patch.rotateSecret;
    if (rotate) patch.webhookSecret = shortId(24);

    const settings = await updateSettings(patch as never);
    const origin = request.nextUrl.origin;
    return NextResponse.json({
      settings,
      webhookUrl: `${origin}/api/webhook/uazapi/${settings.webhookSecret}`,
    });
  } catch (err) {
    return handle(err);
  }
}
