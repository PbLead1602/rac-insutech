import { NextResponse } from "next/server";
import { getAdminRequestContext } from "@/lib/auth/admin-server";
import { addAdminEnquiryNote } from "@/lib/repositories/enquiries";
import { adminEnquiryNoteSchema } from "@/lib/validation/admin-enquiries";

export const dynamic = "force-dynamic";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getAdminRequestContext(request);
  if (!admin) return NextResponse.json({ ok: false, message: "Authorised Admin access is required." }, { status: 401 });
  const parsed = adminEnquiryNoteSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ ok: false, message: parsed.error.issues[0]?.message || "Check the internal note." }, { status: 400 });
  try {
    const note = await addAdminEnquiryNote((await params).id, parsed.data.note, admin.mode === "live" ? admin.id : undefined);
    return NextResponse.json({ ok: true, note }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ ok: false, message: error instanceof Error ? error.message : "Could not add the note." }, { status: 500 });
  }
}
