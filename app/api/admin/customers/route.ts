import { NextResponse } from "next/server";
import { getAdminRequestContext } from "@/lib/auth/admin-server";
import { listAdminCustomers } from "@/lib/repositories/customers";

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

export async function POST(request: Request) {
  if (!await getAdminRequestContext(request)) return NextResponse.json({ ok: false, message: "Authorised Admin access is required." }, { status: 401 });
  return NextResponse.json({ ok: false, message: "Customer records are created only when a registered account is approved. Use Account approvals." }, { status: 403 });
}
