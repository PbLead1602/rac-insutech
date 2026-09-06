export type IndiaLocalityOption = {
  city: string;
  district: string;
  state: string;
  pinCodes: readonly string[];
};

type IndiaPostLocationRow = [string, string, string, string[]];

export const indiaStates = [
  "Andaman and Nicobar Islands", "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chandigarh", "Chhattisgarh", "Dadra and Nagar Haveli and Daman and Diu", "Delhi", "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jammu and Kashmir", "Jharkhand", "Karnataka", "Kerala", "Ladakh", "Lakshadweep", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Puducherry", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal",
] as const;

const localityAliases: Record<string, readonly string[]> = {
  Ahmednagar: ["Ahilyanagar"],
};
const stateAliases: Record<string, string> = {
  "andaman & nicobar islands": "Andaman and Nicobar Islands",
  "dadra & nagar haveli": "Dadra and Nagar Haveli and Daman and Diu",
  "daman & diu": "Dadra and Nagar Haveli and Daman and Diu",
  "daman and diu": "Dadra and Nagar Haveli and Daman and Diu",
  orissa: "Odisha",
  pondicherry: "Puducherry",
  uttaranchal: "Uttarakhand",
};
const shardCache = new Map<string, Promise<readonly IndiaLocalityOption[]>>();

function normalized(value: string) {
  return value.trim().normalize("NFKD").replace(/[\u0300-\u036f]/gu, "").toLocaleLowerCase("en-IN");
}

function searchValue(value: string) {
  return normalized(value).replace(/[^a-z0-9]+/gu, "");
}

function canonicalState(value: string) {
  const direct = indiaStates.find((option) => normalized(option) === normalized(value));
  return direct || stateAliases[normalized(value)] || value.trim();
}

function locationShard(query: string) {
  const initial = searchValue(query).charAt(0);
  return /^[a-z]$/u.test(initial) ? initial : "other";
}

function aliasesFor(city: string) {
  return localityAliases[city] || [];
}

function isCityMatch(option: IndiaLocalityOption, query: string) {
  const needle = searchValue(query);
  if (!needle) return false;
  return [option.city, option.district, ...aliasesFor(option.city)].some((value) => searchValue(value).startsWith(needle));
}

function isExactCityMatch(option: IndiaLocalityOption, city: string) {
  const needle = searchValue(city);
  return Boolean(needle) && [option.city, ...aliasesFor(option.city)].some((value) => searchValue(value) === needle);
}

async function loadShard(shard: string): Promise<readonly IndiaLocalityOption[]> {
  const existing = shardCache.get(shard);
  if (existing) return existing;
  const request = fetch(`/data/india-post/${shard}.json`, { cache: "force-cache" })
    .then(async (response) => {
      if (!response.ok) throw new Error(`India Post locality directory could not load (${response.status})`);
      const rows = await response.json() as unknown;
      if (!Array.isArray(rows)) throw new Error("India Post locality directory returned invalid data");
      return rows.flatMap((row): IndiaLocalityOption[] => {
        if (!Array.isArray(row) || row.length !== 4 || typeof row[0] !== "string" || typeof row[1] !== "string" || typeof row[2] !== "string" || !Array.isArray(row[3])) return [];
        const [city, district, state, pinCodes] = row as IndiaPostLocationRow;
        return [{ city, district, state, pinCodes: pinCodes.filter((pinCode): pinCode is string => typeof pinCode === "string") }];
      });
    })
    .catch((error) => {
      shardCache.delete(shard);
      throw error;
    });
  shardCache.set(shard, request);
  return request;
}

export function findIndiaState(state: string) {
  const canonical = canonicalState(state);
  return indiaStates.find((option) => option === canonical);
}

export function searchIndiaStates(query: string) {
  const needle = normalized(query);
  if (!needle) return [];
  return indiaStates.filter((option) => normalized(option).includes(needle));
}

export async function searchIndiaLocalities(query: string, state = "") {
  const needle = query.trim();
  if (!needle) return [];
  const selectedState = canonicalState(state);
  const options = await loadShard(locationShard(needle));
  return options
    .filter((option) => (!selectedState || canonicalState(option.state) === selectedState) && isCityMatch(option, needle))
    .sort((left, right) => left.city.localeCompare(right.city, "en-IN") || left.district.localeCompare(right.district, "en-IN"));
}

export function pinCodesForCity(options: readonly IndiaLocalityOption[], city: string, state = "") {
  const selectedState = canonicalState(state);
  return [...new Set(options.filter((option) => (!selectedState || canonicalState(option.state) === selectedState) && isExactCityMatch(option, city)).flatMap((option) => option.pinCodes))].sort();
}
