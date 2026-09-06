export type IndiaPostalLocation = {
  city: string;
  district: string;
  state: string;
  pinCodes: string[];
};

export function postalLocationLabel(location: Pick<IndiaPostalLocation, "city" | "district" | "state">) {
  return `${location.city} — ${location.district}, ${location.state}`;
}

export function groupPostalRows(rows: readonly Record<string, unknown>[]): IndiaPostalLocation[] {
  const locations = new Map<string, IndiaPostalLocation>();
  for (const row of rows) {
    const city = String(row.city || "").trim();
    const district = String(row.district || "").trim();
    const state = String(row.state || "").trim();
    const pinCode = String(row.pin_code || "").trim();
    if (!city || !district || !state || !/^\d{6}$/u.test(pinCode)) continue;
    const key = `${city}\u0000${district}\u0000${state}`;
    const existing = locations.get(key) || { city, district, state, pinCodes: [] };
    if (!existing.pinCodes.includes(pinCode)) existing.pinCodes.push(pinCode);
    locations.set(key, existing);
  }

  return [...locations.values()]
    .map((location) => ({ ...location, pinCodes: location.pinCodes.sort() }))
    .sort((left, right) => left.city.localeCompare(right.city, "en-IN") || left.district.localeCompare(right.district, "en-IN") || left.state.localeCompare(right.state, "en-IN"));
}
