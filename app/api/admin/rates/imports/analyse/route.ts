import { NextResponse } from "next/server";
import { getAdminRequestContext } from "@/lib/auth/admin-server";
import { analyseAdminRateImport, rateImportProfileExists } from "@/lib/repositories/rate-imports";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!await getAdminRequestContext(request)) return NextResponse.json({ ok: false, message: "Authorised Admin access is required." }, { status: 401 });
  try {
    const form = await request.formData(); const file = form.get("file"); const profile = String(form.get("profile") || "auto");
    if (!(file instanceof File)) return NextResponse.json({ ok: false, message: "Choose an XLSX rate list to analyse." }, { status: 400 });
    if (!rateImportProfileExists(profile)) return NextResponse.json({ ok: false, message: "Choose a valid RAC import profile." }, { status: 400 });
    const analysis = await analyseAdminRateImport({ fileName: file.name, bytes: new Uint8Array(await file.arrayBuffer()), profile });
    return NextResponse.json({ ok: true, analysis });
  } catch (error) { return NextResponse.json({ ok: false, message: error instanceof Error ? error.message : "Could not analyse this rate list." }, { status: 400 }); }
}
