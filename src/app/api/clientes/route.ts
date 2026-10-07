import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { handle, parseBody, requireApiAuth } from "@/lib/api";
import { listCustomers, updateCustomer } from "@/lib/repo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const denied = await requireApiAuth(request);
  if (denied) return denied;
  try {
    const items = await listCustomers();
    return NextResponse.json({ items });
  } catch (err) {
    return handle(err);
  }
}

const Patch = z.object({
  id: z.string().min(1),
  name: z.string().optional(),
  notes: z.string().optional(),
});

export async function PATCH(request: NextRequest) {
  const denied = await requireApiAuth(request);
  if (denied) return denied;

  const parsed = await parseBody(request, Patch);
  if (parsed.error) return parsed.error;

  try {
    await updateCustomer(parsed.data.id, {
      name: parsed.data.name,
      notes: parsed.data.notes,
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handle(err);
  }
}
