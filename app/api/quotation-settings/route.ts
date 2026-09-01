import { NextResponse } from "next/server";
import { customerAccessFailure, getCustomerRequestContext } from "@/lib/auth/customer-server";
import { getBuiltUpNbrWastagePercent } from "@/lib/repositories/settings";

export const dynamic = "force-dynamic";

/** Safe customer-facing subset of commercial configuration for a live preview. */
export async function GET(request: Request) {
  const context = await getCustomerRequestContext(request);
  const failure = customerAccessFailure(context);
  if (failure) return NextResponse.json({ ok: false, message: failure.message }, { status: failure.status });
  try {
    return NextResponse.json({ ok: true, builtUpNbrWastagePercent: await getBuiltUpNbrWastagePercent() }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return NextResponse.json({ ok: false, message: error instanceof Error ? error.message : "Could not load quotation settings." }, { status: 500 });
  }
}
