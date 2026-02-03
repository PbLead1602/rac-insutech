import xlpeImg from "../images/insu sheild cross linked polyethalene Insulations.jpg";
import bubbleImg from "../images/Insu reflective bubble insulation sheet.jpeg";
import nitrileImg from "../images/nitrile rubber sheet.jpg";
import glasswoolImg from "../images/Glasswool(Fiber glass Insulation 2).jpg";
import rockwoolImg from "../images/Rockwool (mineral wool insulation).jpg";



const products = [
  {
    id: "xlpe",
    name: "Chemically Crosslinked Polyethylene Insulation (XLPE/XLC)",
    shortDesc:
      "Fire-retardant, closed-cell insulation foam ideal for HVAC ducts, roofs, and pipes.",
    image: xlpeImg,
    description:
      "Chemically Crosslinked Polyethylene (XLPE) is a non-fibrous, fire retardant, closed-cell insulation material certified Class O and Class 1 as per BS 476 standards. It is an environment-friendly alternative to conventional glass wool insulation.",
    features: [
      "Class O fire propagation and Class 1 surface spread of flame",
      "More than 90% closed-cell structure",
      "Operating temperature from -40°C to +115°C",
      "Low and stable thermal conductivity (K-value)",
      "Non-toxic, non-carcinogenic and chemically inert",
      "Ease of installation",
    ],
    applications: [
      "HVAC duct insulation",
      "AC & humidification duct insulation",
      "Underdeck insulation",
      "Pipe insulation",
    ],
    idealFor: [
      "Pharmaceuticals and textile mills",
      "Hospitals and airports",
      "Shopping malls and multiplexes",
      "IT parks and commercial buildings",
      "Industrial and factory sheds",
      "Data centers and server rooms",
    ],
    availability: [
      "Thickness: 6mm, 9mm, 13mm, 19mm, 25mm",
      "Class: Class 1 and Class O",
      "Foil: Al foil, Metpet foil, GC cloth, Plain",
      "Flange: With or without 2” flange",
    ],
  },

  {
    id: "bubble",
    name: "Bubble Insulation",
    shortDesc:
      "Radiant heat reflective insulation laminated with aluminum foil.",
    image: bubbleImg,
    description:
      "Bubble Insulation is a radiant heat reflective insulation material made of polyethylene air bubble film laminated with aluminum foil. It reflects up to 99% of infrared radiation and reduces heat transfer effectively.",
    features: [
      "Reflects 96% to 99% radiant heat",
      "Non-toxic and fiber-free",
      "Negligible water vapor transmission",
      "Fire rated Class O and Class 1",
      "Excellent tensile and tear resistance",
    ],
    applications: ["Underdeck insulation", "Wall insulation"],
    idealFor: [
      "Industrial and poultry sheds",
      "Warehouses and logistics centers",
      "Airports and PEB structures",
    ],
    availability: [
      "Thickness: 4mm, 8mm, 10mm, 12mm",
      "Class: Class 1 and Class O",
      "Foil combinations available",
    ],
  },

  {
    id: "nbr",
    name: "Nitrile Rubber Sheet (NBR Sheet Insulation)",
    shortDesc:
      "Flexible closed-cell elastomeric insulation for HVAC and refrigeration.",
    image: nitrileImg,
    description:
      "Nitrile Rubber Sheet is a flexible closed-cell elastomeric insulation designed to prevent condensation and heat loss. Manufactured without CFCs and HCFCs, it is safe and efficient for HVAC and industrial use.",
    features: [
      "Low thermal conductivity",
      "Prevents condensation",
      "Dust and fiber-free",
      "Operating temperature from -50°C to 105°C",
      "Class O fire performance",
    ],
    applications: [
      "HVAC insulation",
      "Cold storage",
      "Chilled water systems",
      "Pipe and tank insulation",
    ],
    idealFor: [
      "Hospitals and airports",
      "Commercial buildings",
      "Food processing industry",
      "Server rooms and control rooms",
    ],
    availability: [
      "Thickness: 6mm to 32mm",
      "Class: Class 1 and Class O",
      "Foil: Plain, Al foil, Glass cloth",
    ],
  },
  {
    id: "glasswool",
    name: "Glass Wool Insulation",
    shortDesc: "Lightweight thermal and acoustic insulation with excellent resilience.",
    image: glasswoolImg,

    description:
        "Glass wool insulation is one of the most widely used insulation materials worldwide due to its excellent thermal and acoustic properties. It is lightweight, chemically inert, and offers high tensile strength with long-term durability.",

    features: [
        "Excellent acoustic insulation – reduces noise pollution",
        "High tear strength – does not sag or settle",
        "Stable under varying temperature and humidity conditions",
        "Does not emit dense smoke or toxic gases",
        "Inorganic – resistant to fungi and vermin growth",
        "Corrosion free and odourless"
    ],

    applications: [
        "HVAC insulation",
        "Over false ceiling insulation",
        "Metal roof insulation",
        "Wall cladding and cavity walls",
        "Acoustic insulation",
        "Underdeck insulation",
        "AC buses and railway coaches",
        "Cold storage insulation"
    ],

    idealFor: [
        "HVAC industries",
        "Textile industries",
        "Pre-engineered metal buildings",
        "Multiplexes, theatres and studios",
        "Refineries and petrochemical units",
        "Process industries"
    ],

    availability: [
        "Available in rolls and slabs",
        "Various thicknesses and densities",
        "With aluminium foil paper",
        "Without aluminium foil (plain)"
    ],
 },
    {
    id: "rockwool",
    name: "Rockwool Insulation",
    shortDesc: "Fire-resistant mineral wool insulation with superior sound absorption.",
    image: rockwoolImg,

    description:
        "Rockwool insulation, also known as stone wool or mineral wool, is made from natural rocks and minerals. It offers excellent thermal insulation, sound absorption, and fire resistance, making it ideal for industrial and commercial applications.",

    features: [
        "Excellent thermal and acoustic insulation",
        "Non-combustible and fire resistant up to 1400°C",
        "Water and moisture resistant",
        "Does not rot or promote fungi or mildew growth",
        "Made from natural and sustainable materials",
        "Long-lasting performance without degradation",
        "CFC and HCFC free"
    ],

    applications: [
        "HVAC insulation",
        "False ceiling insulation",
        "Metal roof insulation",
        "Wall cladding and cavity walls",
        "Acoustic insulation",
        "Underdeck insulation",
        "Cold storage insulation"
    ],

    idealFor: [
        "HVAC industries",
        "Textile industries",
        "Pre-engineered metal buildings",
        "Multiplexes, theatres and studios",
        "Refineries and petrochemical units",
        "Process industries",
        "Thermal power stations"
    ],

    availability: [
        "Available in slabs and rolls",
        "Various thicknesses and densities",
        "Industrial and commercial grades"
    ]
   },

];

export default products;
