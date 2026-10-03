import { NextResponse } from "next/server";
import { getAdminRequestContext } from "@/lib/auth/admin-server";
import { deleteAdminCustomers, listAdminCustomers } from "@/lib/repositories/customers";
import { adminCustomerBulkDeleteSchema } from "@/lib/validation/admin-customers";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!await getAdminRequestContext(request)) return NextResponse.json({ ok: false, message: "Authorised Admin access is required." }, { status: 401 });
  try {
    const customers = await listAdminCustomers(new URL(request.url).searchParams.get("q") || "");
    return NextResponse.json({ ok: true, customers });
  } catch (error) {
    return NextResponse.json({ ok: false, message: error instanceof Error ? error.message : "Could not load customers." }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  if (!await getAdminRequestContext(request)) return NextResponse.json({ ok: false, message: "Authorised Admin access is required." }, { status: 401 });
  const parsed = adminCustomerBulkDeleteSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false, message: parsed.error.issues[0]?.message || "Check the selected customers." }, { status: 400 });
  try {
    return NextResponse.json({ ok: true, ...await deleteAdminCustomers(parsed.data.ids) });
  } catch (error) {
    console.error("Admin customer bulk deletion failed", { count: parsed.data.ids.length, message: error instanceof Error ? error.message : "Unknown error" });
    return NextResponse.json({ ok: false, message: "Could not delete the selected customers." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  if (!await getAdminRequestContext(request)) return NextResponse.json({ ok: false, message: "Authorised Admin access is required." }, { status: 401 });
  return NextResponse.json({ ok: false, message: "Customer records are created only when a registered account is approved. Use Account approvals." }, { status: 403 });
}
