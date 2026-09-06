import { NextResponse } from "next/server";
import { groupPostalRows } from "@/lib/india-postal-locations";
import { getSupabaseServiceClient } from "@/lib/supabase/server";

const responseHeaders = { "Cache-Control": "public, max-age=300, s-maxage=3600" };

function normalise(value: string) {
  return value.trim().replace(/\s+/gu, " ").toLocaleLowerCase("en-IN");
}

function queryValue(value: string) {
  return value.replace(/[\\%_]/gu, "\\$&");
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const kind = url.searchParams.get("kind");
  const query = normalise(url.searchParams.get("q") || "");
  const state = url.searchParams.get("state")?.trim() || "";
  const pinCode = (url.searchParams.get("pin") || "").trim();
  const client = getSupabaseServiceClient();

  if (!client) {
    return NextResponse.json({ message: "The postal master has not been configured yet." }, { status: 503, headers: responseHeaders });
  }

  if (kind === "states") {
    if (!query) return NextResponse.json({ states: [] }, { headers: responseHeaders });
    const { data, error } = await client.from("india_postal_locations").select("state").ilike("state", `%${queryValue(query)}%`).limit(500);
    if (error) return NextResponse.json({ message: "Could not search states." }, { status: 500 });
    const states = [...new Set((data || []).map((row) => String(row.state || "").trim()).filter(Boolean))].sort((left, right) => left.localeCompare(right, "en-IN")).slice(0, 12);
    return NextResponse.json({ states }, { headers: responseHeaders });
  }

  if (kind === "cities") {
    if (query.length < 2 || !state) return NextResponse.json({ locations: [] }, { headers: responseHeaders });
    const { data, error } = await client.from("india_postal_locations").select("city, district, state, pin_code").eq("state", state).ilike("city_search", `%${queryValue(query)}%`).limit(400);
    if (error) return NextResponse.json({ message: "Could not search cities." }, { status: 500 });
    return NextResponse.json({ locations: groupPostalRows((data || []) as Record<string, unknown>[]).slice(0, 12) }, { headers: responseHeaders });
  }

  if (kind === "pin") {
    if (!/^\d{6}$/u.test(pinCode)) return NextResponse.json({ locations: [] }, { headers: responseHeaders });
    const { data, error } = await client.from("india_postal_locations").select("city, district, state, pin_code").eq("pin_code", pinCode).limit(500);
    if (error) return NextResponse.json({ message: "Could not search PIN codes." }, { status: 500 });
    return NextResponse.json({ locations: groupPostalRows((data || []) as Record<string, unknown>[]).slice(0, 24) }, { headers: responseHeaders });
  }

  return NextResponse.json({ message: "Unknown postal lookup." }, { status: 400 });
}
