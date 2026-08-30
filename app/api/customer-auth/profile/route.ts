import { NextResponse } from "next/server";
import { customerAccessFailure, getCustomerRequestContext } from "@/lib/auth/customer-server";
import { updateCustomerProfile } from "@/lib/repositories/customer-accounts";
import { customerProfileSchema } from "@/lib/validation/customer-accounts";

export const dynamic = "force-dynamic";

export async function PATCH(request: Request) {
  const context = await getCustomerRequestContext(request);
  const failure = customerAccessFailure(context);
  if (failure) return NextResponse.json({ ok: false, message: failure.message }, { status: failure.status });
  const parsed = customerProfileSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ ok: false, message: parsed.error.issues[0]?.message || "Please check your profile details." }, { status: 400 });
  try { const updated = await updateCustomerProfile(context!, parsed.data); return NextResponse.json({ ok: true, account: updated.account, customer: updated.customer }); }
  catch (error) { return NextResponse.json({ ok: false, message: error instanceof Error ? error.message : "Could not update your profile." }, { status: 400 }); }
}
