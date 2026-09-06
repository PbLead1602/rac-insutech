import { mkdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";

const sourceBaseUrl = "https://indiapost.org/data/pincodes/by-prefix";
const outputDirectory = join(process.cwd(), "public", "data", "india-post");
const prefixes = Array.from({ length: 90 }, (_, index) => String(index + 10).padStart(2, "0"));
const concurrentRequests = 8;

function locationName(officeName) {
  return String(officeName).replace(/\s+(?:B|S|H)\.O\b/iu, "").replace(/\s+/gu, " ").trim();
}

function initialFor(name) {
  const initial = name.trim().normalize("NFKD").replace(/[\u0300-\u036f]/gu, "").charAt(0).toLocaleLowerCase("en-IN");
  return /^[a-z]$/u.test(initial) ? initial : "other";
}

async function fetchPrefix(prefix) {
  const response = await fetch(`${sourceBaseUrl}/${prefix}.json`);
  if (response.status === 404) return [];
  if (!response.ok) throw new Error(`Could not download PIN prefix ${prefix}: ${response.status} ${response.statusText}`);
  const records = await response.json();
  if (!Array.isArray(records)) throw new Error(`PIN prefix ${prefix} was not an array`);
  return records;
}

async function mapWithConcurrency(values, callback) {
  const results = new Array(values.length);
  let nextIndex = 0;
  await Promise.all(Array.from({ length: Math.min(concurrentRequests, values.length) }, async () => {
    while (nextIndex < values.length) {
      const index = nextIndex++;
      results[index] = await callback(values[index]);
    }
  }));
  return results;
}

const downloaded = await mapWithConcurrency(prefixes, fetchPrefix);
const locations = new Map();
let sourceRecordCount = 0;

for (const records of downloaded) {
  for (const record of records) {
    if (!Array.isArray(record) || record.length < 6) continue;
    const [officeName, pinCode, , , district, state] = record;
    const name = locationName(officeName);
    const pin = String(pinCode || "").trim();
    const districtName = String(district || "").trim();
    const stateName = String(state || "").trim();
    if (!name || !/^\d{6}$/u.test(pin) || !districtName || !stateName) continue;
    sourceRecordCount += 1;
    const key = `${stateName}\u0000${districtName}\u0000${name}`;
    const existing = locations.get(key) || { name, district: districtName, state: stateName, pinCodes: new Set() };
    existing.pinCodes.add(pin);
    locations.set(key, existing);
  }
}

const byInitial = new Map();
for (const location of locations.values()) {
  const initial = initialFor(location.name);
  const bucket = byInitial.get(initial) || [];
  bucket.push([location.name, location.district, location.state, [...location.pinCodes].sort()]);
  byInitial.set(initial, bucket);
}

const districts = new Map();
for (const location of locations.values()) {
  const key = `${location.state}\u0000${location.district}`;
  const existing = districts.get(key) || { city: location.district, district: location.district, state: location.state, pinCodes: new Set() };
  for (const pinCode of location.pinCodes) existing.pinCodes.add(pinCode);
  districts.set(key, existing);
}
for (const district of districts.values()) {
  const localityKey = `${district.state}\u0000${district.district}\u0000${district.city}`;
  if (locations.has(localityKey)) continue;
  const initial = initialFor(district.city);
  const bucket = byInitial.get(initial) || [];
  bucket.push([district.city, district.district, district.state, [...district.pinCodes].sort()]);
  byInitial.set(initial, bucket);
}

await rm(outputDirectory, { recursive: true, force: true });
await mkdir(outputDirectory, { recursive: true });
for (const [initial, records] of byInitial) {
  records.sort(([leftName, leftDistrict, leftState], [rightName, rightDistrict, rightState]) => leftName.localeCompare(rightName, "en-IN") || leftDistrict.localeCompare(rightDistrict, "en-IN") || leftState.localeCompare(rightState, "en-IN"));
  await writeFile(join(outputDirectory, `${initial}.json`), JSON.stringify(records));
}

const manifest = {
  source: "Department of Posts, Government of India — All India Pincode Directory",
  sourceUrl: "https://www.data.gov.in/resource/all-india-pincode-directory-till-last-month",
  generatedAt: new Date().toISOString(),
  sourceRecordCount,
  localityCount: locations.size,
  districtAliasCount: [...districts.values()].filter((district) => !locations.has(`${district.state}\u0000${district.district}\u0000${district.city}`)).length,
  stateCount: new Set([...locations.values()].map((location) => location.state)).size,
  shards: [...byInitial.keys()].sort(),
};
await writeFile(join(outputDirectory, "manifest.json"), JSON.stringify(manifest, null, 2));
console.log(`Generated ${locations.size} locality records from ${sourceRecordCount} India Post records into ${byInitial.size} searchable shards.`);
