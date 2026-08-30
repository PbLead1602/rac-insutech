export type ContentCard = {
  slug: string;
  title: string;
  summary: string;
  materials: string[];
  applications: string[];
};

export const solutions: ContentCard[] = [
  {
    slug: "hot-process-insulation",
    title: "Hot & process insulation",
    summary: "A material route for heated pipework, equipment and process areas where the operating temperature, outer protection and safe installation sequence must be considered together.",
    materials: ["Rock wool slabs and pipe sections", "Glass wool wraps", "Ceramic fibre", "Aerogel blankets", "Metal cladding"],
    applications: ["Utility and process pipework", "Vessels and equipment", "Heated services and plant areas"],
  },
  {
    slug: "cold-condensation-control",
    title: "Cold insulation & condensation control",
    summary: "Closed-cell materials, compatible vapour barriers and sealed joints help shape a continuous cold-service insulation build-up.",
    materials: ["Nitrile rubber tubes and sheets", "XLPE foam", "XPS boards", "PIR / PUR panels", "Vapour barriers and tapes"],
    applications: ["Chilled-water and refrigerant lines", "Cold rooms and cool rooms", "Tanks, valves and equipment details"],
  },
  {
    slug: "hvac-duct-pipe",
    title: "HVAC ducts & pipework",
    summary: "A practical selection path for duct insulation, piping runs, air-handling units and plant-room services.",
    materials: ["Glass wool duct boards", "Nitrile rubber", "XLPE tubes and sheets", "Foil facings", "Adhesives and joint tapes"],
    applications: ["Air-handling ducts", "Chilled water and plumbing", "AHU and equipment insulation"],
  },
  {
    slug: "roof-peb-envelope",
    title: "Roof, underdeck & PEB envelope",
    summary: "Layered roof and wall assemblies for sheds, warehouses and pre-engineered buildings, planned around the deck, overlaps and moisture conditions.",
    materials: ["Foil bubble insulation", "XLPE underdeck rolls", "Glass wool blankets", "EPE foil foam", "Roofing tapes and facings"],
    applications: ["Metal roofs", "Warehouse sheds", "PEB wall and roof details"],
  },
  {
    slug: "acoustic-control",
    title: "Acoustic control",
    summary: "Sound-control material families selected within a complete assembly, based on whether the project needs absorption, isolation or vibration treatment.",
    materials: ["Rock wool acoustic panels", "Nitrile acoustic foam", "Mass loaded vinyl", "Polyester acoustic boards", "Acoustic facings"],
    applications: ["Plant and pump rooms", "Duct and AHU lining", "Partitions, ceilings and enclosures"],
  },
  {
    slug: "protective-finishing",
    title: "Protective finishes & accessories",
    summary: "The details that make an insulation build-up continuous and durable: facings, joint treatments, jackets, bands and external cladding.",
    materials: ["Aluminium, GI and SS cladding", "Insulation jackets", "Foil facings", "Vapour barriers", "Tapes, mastics and adhesives"],
    applications: ["Outdoor pipework", "Equipment insulation", "Roof and cold-service joints"],
  },
];

export const industries: ContentCard[] = [
  { slug: "commercial-buildings", title: "Commercial buildings", summary: "Comfort, HVAC efficiency and practical envelope detailing for offices, retail and mixed-use spaces.", materials: ["HVAC insulation", "Roof and wall materials"], applications: ["Ducts", "Plant rooms", "Roofs and partitions"] },
  { slug: "industrial-plants", title: "Industrial plants", summary: "Thermal protection and maintainable outer finishes for operational utilities, equipment and production areas.", materials: ["Mineral wool", "Cladding and jackets"], applications: ["Process pipes", "Vessels", "Utility systems"] },
  { slug: "pharma-life-sciences", title: "Pharma & life sciences", summary: "Clean, controlled and documented insulation choices for temperature-sensitive spaces and services.", materials: ["Closed-cell insulation", "Duct boards"], applications: ["HVAC", "Cold rooms", "Clean-area services"] },
  { slug: "data-centres", title: "Data centres", summary: "HVAC and service insulation planning that supports controlled operating conditions and clear maintenance access.", materials: ["Pipe insulation", "Raised-floor materials"], applications: ["Chilled water", "Ducts", "Technical rooms"] },
  { slug: "cold-storage-food", title: "Food & cold storage", summary: "Moisture-conscious thermal layers for cold rooms, refrigerated areas and temperature-controlled logistics.", materials: ["Nitrile rubber", "XPS", "PIR / PUR"], applications: ["Cool rooms", "Cold stores", "Refrigerated services"] },
  { slug: "oil-gas-chemicals", title: "Oil, gas & chemicals", summary: "Industrial insulation assemblies selected against the service condition, surface protection and access needs.", materials: ["Rock wool", "Ceramic fibre", "Metal cladding"], applications: ["Pipes", "Vessels", "Process equipment"] },
  { slug: "manufacturing", title: "Manufacturing", summary: "Thermal and acoustic control for factories, utilities, equipment enclosures and worker-comfort areas.", materials: ["Glass wool", "Acoustic panels"], applications: ["Plant rooms", "Enclosures", "Roofing"] },
  { slug: "warehousing-peb", title: "Warehousing & PEB", summary: "Lightweight roof and wall insulation layers for large-span sheds and pre-engineered building assemblies.", materials: ["Foil bubble", "XLPE", "Glass wool"], applications: ["Underdeck", "Metal roofs", "Wall linings"] },
  { slug: "marine-transport", title: "Marine & transport", summary: "Specialist material review for applications with movement, vibration and demanding exposure conditions.", materials: ["Acoustic foam", "Mineral wool"], applications: ["Equipment spaces", "Service lines", "Enclosures"] },
];

export const services: ContentCard[] = [
  { slug: "technical-selection", title: "Technical selection support", summary: "Start with the application, operating conditions, geometry and project priorities to narrow the appropriate material family.", materials: ["Application review", "Material comparison"], applications: ["Early-stage planning", "RFQ clarification", "Specification alignment"] },
  { slug: "material-supply", title: "Material supply planning", summary: "Build a coordinated material list covering insulation cores, facings, adhesives, tapes and protection layers.", materials: ["Core insulation", "Accessories"], applications: ["BOQ support", "Phased deliveries", "Material schedules"] },
  { slug: "system-detailing", title: "System detailing", summary: "Review joints, penetrations, fittings, outer finishes and maintenance access as part of the insulation system—not as afterthoughts.", materials: ["Vapour barriers", "Cladding"], applications: ["Cold services", "Outdoor systems", "Complex equipment"] },
  { slug: "installation-coordination", title: "Installation coordination", summary: "Translate the selected material route into clear installation priorities, including sequencing, compatible accessories and finish expectations.", materials: ["Installation guidance", "Compatible accessories"], applications: ["Site coordination", "Quality checkpoints", "Hand-over planning"] },
  { slug: "project-documentation", title: "Product briefs & documentation", summary: "Use material briefs and verified manufacturer documents to keep product selections reviewable from enquiry through final approval.", materials: ["Product briefs", "Manufacturer documentation"], applications: ["Submittals", "Project reviews", "Close-out records"] },
];
