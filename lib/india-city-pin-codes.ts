export type IndiaCityPinCodeOption = {
  state: string;
  city: string;
  pinCodes: readonly string[];
  aliases?: readonly string[];
};

type IndiaCityPinCodeSeed = Omit<IndiaCityPinCodeOption, "state">;

export const indiaStates = [
  "Andaman and Nicobar Islands", "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chandigarh", "Chhattisgarh", "Dadra and Nagar Haveli and Daman and Diu", "Delhi", "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jammu and Kashmir", "Jharkhand", "Karnataka", "Kerala", "Ladakh", "Lakshadweep", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Puducherry", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal",
] as const;

const stateByCity: Record<string, (typeof indiaStates)[number]> = {
  Agra: "Uttar Pradesh", Ahmedabad: "Gujarat", Ajmer: "Rajasthan", Akola: "Maharashtra", Aligarh: "Uttar Pradesh", Amravati: "Maharashtra", Amritsar: "Punjab", Aurangabad: "Maharashtra", Bengaluru: "Karnataka", Bhopal: "Madhya Pradesh", Bhubaneswar: "Odisha", Chandigarh: "Chandigarh", Chennai: "Tamil Nadu", Coimbatore: "Tamil Nadu", Daman: "Dadra and Nagar Haveli and Daman and Diu", Dehradun: "Uttarakhand", Delhi: "Delhi", Faridabad: "Haryana", Gangtok: "Sikkim", Ghaziabad: "Uttar Pradesh", Gurugram: "Haryana", Guwahati: "Assam", Hyderabad: "Telangana", Imphal: "Manipur", Indore: "Madhya Pradesh", Itanagar: "Arunachal Pradesh", Jaipur: "Rajasthan", Jammu: "Jammu and Kashmir", Jamshedpur: "Jharkhand", Jodhpur: "Rajasthan", Kanpur: "Uttar Pradesh", Kavaratti: "Lakshadweep", Kochi: "Kerala", Kohima: "Nagaland", Kolkata: "West Bengal", Kozhikode: "Kerala", Leh: "Ladakh", Lucknow: "Uttar Pradesh", Ludhiana: "Punjab", Madurai: "Tamil Nadu", Meerut: "Uttar Pradesh", Mumbai: "Maharashtra", Mysuru: "Karnataka", Nagpur: "Maharashtra", Nashik: "Maharashtra", "Navi Mumbai": "Maharashtra", "New Delhi": "Delhi", Noida: "Uttar Pradesh", Panaji: "Goa", Patna: "Bihar", "Port Blair": "Andaman and Nicobar Islands", Prayagraj: "Uttar Pradesh", Puducherry: "Puducherry", Pune: "Maharashtra", Raipur: "Chhattisgarh", Rajkot: "Gujarat", Ranchi: "Jharkhand", Shillong: "Meghalaya", Shimla: "Himachal Pradesh", Srinagar: "Jammu and Kashmir", Surat: "Gujarat", Thane: "Maharashtra", Tiruchirappalli: "Tamil Nadu", Vadodara: "Gujarat", Varanasi: "Uttar Pradesh", Vijayawada: "Andhra Pradesh", Visakhapatnam: "Andhra Pradesh", Aizawl: "Mizoram", Agartala: "Tripura",
};

// Common service cities and their primary delivery PIN codes. Keeping this
// directory in the client bundle makes selection reliable even when the user
// is offline; the quotation API still receives the existing city/pinCode keys.
const indiaCityPinCodeSeeds: readonly IndiaCityPinCodeSeed[] = [
  { city: "Agra", pinCodes: ["282001", "282002", "282005"] },
  { city: "Ahmedabad", pinCodes: ["380001", "380009", "380015"] },
  { city: "Ajmer", pinCodes: ["305001", "305003"] },
  { city: "Akola", pinCodes: ["444001", "444002", "444004"] },
  { city: "Aligarh", pinCodes: ["202001", "202002"] },
  { city: "Amravati", pinCodes: ["444601", "444602"] },
  { city: "Amritsar", pinCodes: ["143001", "143002"] },
  { city: "Aurangabad", pinCodes: ["431001", "431005"] },
  { city: "Bengaluru", pinCodes: ["560001", "560034", "560066", "560100"], aliases: ["Bangalore"] },
  { city: "Bhopal", pinCodes: ["462001", "462003", "462016"] },
  { city: "Bhubaneswar", pinCodes: ["751001", "751003", "751024"] },
  { city: "Chandigarh", pinCodes: ["160017", "160019", "160022"] },
  { city: "Chennai", pinCodes: ["600001", "600017", "600096"], aliases: ["Madras"] },
  { city: "Coimbatore", pinCodes: ["641001", "641018", "641035"] },
  { city: "Daman", pinCodes: ["396210"] },
  { city: "Dehradun", pinCodes: ["248001", "248002"] },
  { city: "Delhi", pinCodes: ["110001", "110017", "110020"] },
  { city: "Faridabad", pinCodes: ["121001", "121003", "121006"] },
  { city: "Gangtok", pinCodes: ["737101"] },
  { city: "Ghaziabad", pinCodes: ["201001", "201010"] },
  { city: "Gurugram", pinCodes: ["122001", "122002", "122018"], aliases: ["Gurgaon"] },
  { city: "Guwahati", pinCodes: ["781001", "781005", "781021"] },
  { city: "Hyderabad", pinCodes: ["500001", "500032", "500081"] },
  { city: "Imphal", pinCodes: ["795001"] },
  { city: "Indore", pinCodes: ["452001", "452010", "452016"] },
  { city: "Itanagar", pinCodes: ["791111"] },
  { city: "Jaipur", pinCodes: ["302001", "302015", "302017"] },
  { city: "Jammu", pinCodes: ["180001", "180004"] },
  { city: "Jamshedpur", pinCodes: ["831001", "831004"] },
  { city: "Jodhpur", pinCodes: ["342001", "342003"] },
  { city: "Kanpur", pinCodes: ["208001", "208002", "208017"] },
  { city: "Kavaratti", pinCodes: ["682555"] },
  { city: "Kochi", pinCodes: ["682001", "682016", "682030"], aliases: ["Cochin"] },
  { city: "Kohima", pinCodes: ["797001"] },
  { city: "Kolkata", pinCodes: ["700001", "700019", "700091"], aliases: ["Calcutta"] },
  { city: "Kozhikode", pinCodes: ["673001", "673004"], aliases: ["Calicut"] },
  { city: "Leh", pinCodes: ["194101"] },
  { city: "Lucknow", pinCodes: ["226001", "226010", "226021"] },
  { city: "Ludhiana", pinCodes: ["141001", "141003"] },
  { city: "Madurai", pinCodes: ["625001", "625002"] },
  { city: "Meerut", pinCodes: ["250001", "250002"] },
  { city: "Mumbai", pinCodes: ["400001", "400050", "400070", "400093"], aliases: ["Bombay"] },
  { city: "Mysuru", pinCodes: ["570001", "570017"], aliases: ["Mysore"] },
  { city: "Nagpur", pinCodes: ["440001", "440010", "440022"] },
  { city: "Nashik", pinCodes: ["422001", "422005", "422009"], aliases: ["Nasik"] },
  { city: "Navi Mumbai", pinCodes: ["400614", "400705", "400708"] },
  { city: "New Delhi", pinCodes: ["110001", "110021", "110029"] },
  { city: "Noida", pinCodes: ["201301", "201303", "201304"] },
  { city: "Panaji", pinCodes: ["403001", "403002"], aliases: ["Panjim"] },
  { city: "Patna", pinCodes: ["800001", "800004", "800014"] },
  { city: "Port Blair", pinCodes: ["744101"] },
  { city: "Prayagraj", pinCodes: ["211001", "211002"], aliases: ["Allahabad"] },
  { city: "Puducherry", pinCodes: ["605001"] },
  { city: "Pune", pinCodes: ["411001", "411007", "411045", "411057"], aliases: ["Poona"] },
  { city: "Raipur", pinCodes: ["492001", "492004", "492015"] },
  { city: "Rajkot", pinCodes: ["360001", "360005"] },
  { city: "Ranchi", pinCodes: ["834001", "834002"] },
  { city: "Shillong", pinCodes: ["793001"] },
  { city: "Shimla", pinCodes: ["171001"] },
  { city: "Srinagar", pinCodes: ["190001", "190008"] },
  { city: "Surat", pinCodes: ["395003", "395007", "395009"] },
  { city: "Thane", pinCodes: ["400601", "400604", "400607"] },
  { city: "Tiruchirappalli", pinCodes: ["620001", "620017"], aliases: ["Trichy"] },
  { city: "Vadodara", pinCodes: ["390001", "390007", "390011"], aliases: ["Baroda"] },
  { city: "Varanasi", pinCodes: ["221001", "221005", "221010"], aliases: ["Banaras", "Benares"] },
  { city: "Vijayawada", pinCodes: ["520001", "520008"] },
  { city: "Visakhapatnam", pinCodes: ["530001", "530017", "530041"], aliases: ["Vizag"] },
  { city: "Aizawl", pinCodes: ["796001"] },
  { city: "Agartala", pinCodes: ["799001"] },
];

export const indiaCityPinCodeOptions: readonly IndiaCityPinCodeOption[] = indiaCityPinCodeSeeds.map((option) => ({ ...option, state: stateByCity[option.city] }));

function normalized(value: string) {
  return value.trim().toLocaleLowerCase("en-IN");
}

export function findIndiaCityPinCodeOption(city: string) {
  const query = normalized(city);
  return indiaCityPinCodeOptions.find((option) => normalized(option.city) === query || option.aliases?.some((alias) => normalized(alias) === query));
}

export function findIndiaState(state: string) {
  const query = normalized(state);
  return indiaStates.find((option) => normalized(option) === query);
}

export function searchIndiaStates(query: string) {
  const needle = normalized(query);
  if (!needle) return [];
  return indiaStates.filter((option) => normalized(option).includes(needle));
}

export function searchIndiaCities(query: string, state = "") {
  const needle = normalized(query);
  if (!needle) return [];
  const selectedState = findIndiaState(state);
  return indiaCityPinCodeOptions.filter((option) => (!selectedState || option.state === selectedState) && (normalized(option.city).startsWith(needle) || option.aliases?.some((alias) => normalized(alias).startsWith(needle))));
}
