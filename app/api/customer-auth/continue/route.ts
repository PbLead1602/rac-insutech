import { NextResponse } from "next/server";
import { getCustomerRequestContext } from "@/lib/auth/customer-server";
import { attachContinuationToAccount } from "@/lib/repositories/customer-accounts";
import { continuationSchema } from "@/lib/validation/customer-accounts";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const context = await getCustomerRequestContext(request);
  if (!context) return NextResponse.json({ ok: false, message: "Please sign in to continue." }, { status: 401 });
  const parsed = continuationSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ ok: false, message: parsed.error.issues[0]?.message || "The quotation continuation is invalid." }, { status: 400 });
  try {
    const enquiry = await attachContinuationToAccount(parsed.data.intent, context.account);
    return NextResponse.json({ ok: true, enquiry: { id: enquiry.id, enquiryNumber: enquiry.enquiryNumber }, accountStatus: context.account.status });
  } catch (error) { return NextResponse.json({ ok: false, message: error instanceof Error ? error.message : "Could not restore this enquiry." }, { status: 400 }); }
}
