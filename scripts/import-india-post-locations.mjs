import { readFile, readdir } from "node:fs/promises";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

const projectRoot = process.cwd();
const sourceDirectory = resolve(projectRoot, "public", "data", "india-post");
const batchSize = 500;

function parseEnv(contents) {
  for (const line of contents.split(/\r?\n/u)) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/u);
    if (!match || process.env[match[1]] !== undefined) continue;
    const rawValue = match[2].replace(/^['"]|['"]$/gu, "");
    process.env[match[1]] = rawValue;
  }
}

async function loadLocalEnvironment() {
  for (const filename of [".env.local", ".env"]) {
    try {
      parseEnv(await readFile(resolve(projectRoot, filename), "utf8"));
    } catch (error) {
      if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") continue;
      throw error;
    }
  }
}

function normaliseSearchValue(value) {
  return value.trim().replace(/\s+/gu, " ").toLocaleLowerCase("en-IN");
}

await loadLocalEnvironment();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
if (!supabaseUrl || !serviceRoleKey) {
  throw new Error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required. They are read from .env.local or the current environment and are never printed.");
}

const manifest = JSON.parse(await readFile(resolve(sourceDirectory, "manifest.json"), "utf8"));
if (manifest.sourceUrl !== "https://www.data.gov.in/resource/all-india-pincode-directory-till-last-month" || !Array.isArray(manifest.shards) || Number(manifest.localityCount) < 100000) {
  throw new Error("The local postal source is not a complete official Department of Posts data export. Regenerate it before importing.");
}

const shardFilenames = (await readdir(sourceDirectory)).filter((filename) => /^[a-z]+\.json$/u.test(filename));
const records = [];
for (const filename of shardFilenames) {
  const shard = JSON.parse(await readFile(resolve(sourceDirectory, filename), "utf8"));
  for (const record of shard) {
    const [city, district, state, pinCodes] = record;
    if (typeof city !== "string" || typeof district !== "string" || typeof state !== "string" || !Array.isArray(pinCodes)) continue;
    for (const pinCode of pinCodes) {
      if (typeof pinCode !== "string" || !/^\d{6}$/u.test(pinCode)) continue;
      records.push({
        city: city.trim(),
        district: district.trim(),
        state: state.trim(),
        pin_code: pinCode,
        city_search: normaliseSearchValue(city),
        source_name: "Department of Posts, Government of India",
        source_url: manifest.sourceUrl,
        source_version: String(manifest.generatedAt),
        imported_at: new Date().toISOString(),
      });
    }
  }
}

if (records.length < 100000) throw new Error("The postal import contains too few City/PIN rows to be an India-wide master.");

const client = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
for (let index = 0; index < records.length; index += batchSize) {
  const batch = records.slice(index, index + batchSize);
  const { error } = await client.from("india_postal_locations").upsert(batch, { onConflict: "city,district,state,pin_code" });
  if (error) throw new Error(`Postal import stopped at row ${index + 1}: ${error.message}`);
  if ((index / batchSize) % 25 === 0 || index + batch.length === records.length) {
    console.log(`Imported ${Math.min(index + batch.length, records.length)} of ${records.length} City/PIN rows.`);
  }
}

const { error: staleRecordError } = await client
  .from("india_postal_locations")
  .delete()
  .neq("source_version", String(manifest.generatedAt));
if (staleRecordError) throw new Error(`Postal import completed, but stale rows could not be reconciled: ${staleRecordError.message}`);

console.log(`Imported and reconciled ${records.length} India Post City/PIN rows from ${manifest.sourceUrl}.`);
