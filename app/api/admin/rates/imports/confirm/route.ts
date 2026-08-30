import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminRequestContext } from "@/lib/auth/admin-server";
import { confirmAdminRateImport } from "@/lib/repositories/rate-imports";

export const dynamic = "force-dynamic";
const schema = z.object({ importId: z.string().trim().min(1), selectedRowIds: z.array(z.string().trim().min(1)).min(1).max(1000) });

export async function POST(request: Request) {
  const admin = await getAdminRequestContext(request); if (!admin) return NextResponse.json({ ok: false, message: "Authorised Admin access is required." }, { status: 401 });
  const parsed = schema.safeParse(await request.json()); if (!parsed.success) return NextResponse.json({ ok: false, message: "Select at least one valid Rate Card change." }, { status: 400 });
  try { return NextResponse.json({ ok: true, result: await confirmAdminRateImport({ ...parsed.data, adminId: admin.mode === "live" ? admin.id : undefined }) }); } catch (error) { return NextResponse.json({ ok: false, message: error instanceof Error ? error.message : "Could not confirm this rate import." }, { status: 400 }); }
}
