import { NextResponse } from "next/server";
import { z } from "zod";
import { customerAccessFailure, getCustomerRequestContext } from "@/lib/auth/customer-server";
import { createCustomerRevisionRequest } from "@/lib/repositories/customer-portal";

const schema = z.object({ reason: z.string().trim().min(3).max(1000), requiredChange: z.string().trim().max(1000).optional(), quantityChange: z.string().trim().max(1000).optional(), productChange: z.string().trim().max(1000).optional(), deliveryChange: z.string().trim().max(1000).optional(), additionalNotes: z.string().trim().max(2000).optional() });
export const dynamic = "force-dynamic";
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await getCustomerRequestContext(request); const failure = customerAccessFailure(context);
  if (failure) return NextResponse.json({ ok: false, message: failure.message }, { status: failure.status });
  const parsed = schema.safeParse(await request.json()); if (!parsed.success) return NextResponse.json({ ok: false, message: parsed.error.issues[0]?.message || "Please describe the requested change." }, { status: 400 });
  try { const revisionRequest = await createCustomerRevisionRequest(context!, (await params).id, parsed.data); return NextResponse.json({ ok: true, revisionRequest }, { status: 201 }); }
  catch (error) { return NextResponse.json({ ok: false, message: error instanceof Error ? error.message : "Could not submit the revision request." }, { status: 400 }); }
}
