import { NextResponse } from "next/server";
import { getAdminRequestContext } from "@/lib/auth/admin-server";
import { listAdminActivity } from "@/lib/repositories/activity";
export const dynamic = "force-dynamic";
export async function GET(request: Request) { if (!await getAdminRequestContext(request)) return NextResponse.json({ ok: false, message: "Authorised Admin access is required." }, { status: 401 }); try { return NextResponse.json({ ok: true, activity: await listAdminActivity(new URL(request.url).searchParams.get("q") || "") }); } catch (error) { return NextResponse.json({ ok: false, message: error instanceof Error ? error.message : "Could not load activity." }, { status: 500 }); } }
