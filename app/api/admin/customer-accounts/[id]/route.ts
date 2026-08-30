import { NextResponse } from "next/server";
import { getAdminRequestContext } from "@/lib/auth/admin-server";
import { approveCustomerAccount, getAdminCustomerAccount, updateCustomerAccountStatus } from "@/lib/repositories/customer-accounts";
import { customerAccountActionSchema } from "@/lib/validation/customer-accounts";
import { recordAdminActivity } from "@/lib/repositories/activity";
import { sendCustomerAccountApprovalNotification } from "@/lib/services/brevo";

export const dynamic = "force-dynamic";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!await getAdminRequestContext(request)) return NextResponse.json({ ok: false, message: "Authorised Admin access is required." }, { status: 401 });
  try { const record = await getAdminCustomerAccount((await params).id); return record ? NextResponse.json({ ok: true, ...record }) : NextResponse.json({ ok: false, message: "Account request not found." }, { status: 404 }); }
  catch (error) { return NextResponse.json({ ok: false, message: error instanceof Error ? error.message : "Could not load the account request." }, { status: 500 }); }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getAdminRequestContext(request);
  if (!admin) return NextResponse.json({ ok: false, message: "Authorised Admin access is required." }, { status: 401 });
  const parsed = customerAccountActionSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ ok: false, message: parsed.error.issues[0]?.message || "Choose a valid account action." }, { status: 400 });
  const id = (await params).id;
  try {
    const account = parsed.data.action === "approve"
      ? await approveCustomerAccount(id, admin.id)
      : await updateCustomerAccountStatus(
        id,
        parsed.data.action === "restore_pending" ? "pending_admin_approval" : parsed.data.action === "reject" ? "rejected" : "suspended",
        parsed.data.reason,
      );
    await recordAdminActivity({ action: parsed.data.action === "approve" ? "approved" : "updated", entityType: "customer_account", entityId: account.id, summary: `${parsed.data.action === "approve" ? "Approved" : "Updated"} customer account: ${account.email}` });
    if (parsed.data.action === "approve") await sendCustomerAccountApprovalNotification(account);
    return NextResponse.json({ ok: true, account });
  } catch (error) { return NextResponse.json({ ok: false, message: error instanceof Error ? error.message : "Could not update the customer account." }, { status: 400 }); }
}
