import { NextResponse } from "next/server";
import { getAdminRequestContext } from "@/lib/auth/admin-server";
import { getAdminCustomer, updateAdminCustomer } from "@/lib/repositories/customers";
import { adminCustomerPatchSchema } from "@/lib/validation/admin-customers";

export const dynamic = "force-dynamic";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!await getAdminRequestContext(request)) return NextResponse.json({ ok: false, message: "Authorised Admin access is required." }, { status: 401 });
  try {
    const customer = await getAdminCustomer((await params).id);
    return customer ? NextResponse.json({ ok: true, ...customer }) : NextResponse.json({ ok: false, message: "Customer not found." }, { status: 404 });
  } catch (error) {
    return NextResponse.json({ ok: false, message: error instanceof Error ? error.message : "Could not load the customer." }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!await getAdminRequestContext(request)) return NextResponse.json({ ok: false, message: "Authorised Admin access is required." }, { status: 401 });
  const parsed = adminCustomerPatchSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ ok: false, message: parsed.error.issues[0]?.message || "Check the customer update." }, { status: 400 });
  try {
    const customer = await updateAdminCustomer((await params).id, parsed.data);
    return customer ? NextResponse.json({ ok: true, customer }) : NextResponse.json({ ok: false, message: "Customer not found." }, { status: 404 });
  } catch (error) {
    return NextResponse.json({ ok: false, message: error instanceof Error ? error.message : "Could not update the customer." }, { status: 500 });
  }
}
