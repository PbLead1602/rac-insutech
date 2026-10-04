import { NextResponse } from "next/server";
import { getAdminRequestContext } from "@/lib/auth/admin-server";
import { approveCustomerAccount, getAdminCustomerAccount, permanentlyDeleteCustomerAccount, updateCustomerAccountStatus } from "@/lib/repositories/customer-accounts";
import { customerAccountActionSchema, customerAccountDeleteSchema } from "@/lib/validation/customer-accounts";
import { recordAdminActivity, recordRequiredAdminActivity } from "@/lib/repositories/activity";
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

/** A separate, deliberately confirmed action for removal of one customer login. */
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getAdminRequestContext(request);
  if (!admin) return NextResponse.json({ ok: false, message: "Authorised Admin access is required." }, { status: 401 });
  const parsed = customerAccountDeleteSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false, message: parsed.error.issues[0]?.message || "Type the account email address to confirm permanent deletion." }, { status: 400 });

  const id = (await params).id;
  try {
    const record = await getAdminCustomerAccount(id);
    if (!record) return NextResponse.json({ ok: false, message: "Customer account was not found." }, { status: 404 });
    if (record.account.email.trim().toLowerCase() !== parsed.data.confirmationEmail.trim().toLowerCase()) {
      return NextResponse.json({ ok: false, message: "Type the exact account email address to confirm permanent deletion." }, { status: 400 });
    }

    // The deletion does not proceed if its mandatory audit entry cannot be
    // recorded. The entity ID remains in activity history after auth removal.
    await recordRequiredAdminActivity({
      action: "deletion_authorised",
      entityType: "customer_account",
      entityId: record.account.id,
      summary: `Permanent deletion authorised for customer account: ${record.account.email}`,
    });
    const deleted = await permanentlyDeleteCustomerAccount(id, parsed.data.confirmationEmail);
    await recordAdminActivity({
      action: "deleted",
      entityType: "customer_account",
      entityId: deleted.id,
      summary: `Permanently deleted customer login and account record: ${deleted.email}`,
    });
    return NextResponse.json({ ok: true, deletedAccountId: deleted.id });
  } catch (error) {
    return NextResponse.json({ ok: false, message: error instanceof Error ? error.message : "Could not permanently delete the customer account." }, { status: 400 });
  }
}
