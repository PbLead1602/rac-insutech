import { NextResponse } from "next/server";
import { getAdminRequestContext } from "@/lib/auth/admin-server";
import { listAdminCustomerAccounts } from "@/lib/repositories/customer-accounts";
import type { CustomerAccountStatus } from "@/lib/db/types";

const allowedStatuses: CustomerAccountStatus[] = ["pending_email_verification", "pending_admin_approval", "active", "rejected", "suspended", "archived"];
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!await getAdminRequestContext(request)) return NextResponse.json({ ok: false, message: "Authorised Admin access is required." }, { status: 401 });
  try {
    const value = new URL(request.url).searchParams.get("status") || "";
    const status = allowedStatuses.includes(value as CustomerAccountStatus) ? value as CustomerAccountStatus : undefined;
    return NextResponse.json({ ok: true, accounts: await listAdminCustomerAccounts(status) });
  } catch (error) { return NextResponse.json({ ok: false, message: error instanceof Error ? error.message : "Could not load account approvals." }, { status: 500 }); }
}
