import Link from "next/link";
import { ArrowRight, BookOpen, Download, FileText, Search, ShieldCheck } from "lucide-react";
import { CatalogueFooter, CatalogueHeader } from "@/components/catalogue-header";
import { catalogue } from "@/lib/catalogue";

const brochureGroups = [
  {
    name: "HVAC / Cold Insulation",
    productSlugs: [
      "nitrile-rubber-tube",
      "nitrile-rubber-sheet",
      "xlpe-tube-insulation",
      "xlpe-sheet-insulation",
      "glass-wool-duct-board",
      "glass-wool-flexible-duct",
      "xps-insulation-board",
      "pir-pur-insulation-panel",
      "eps-insulation-board",
      "insulation-adhesive",
      "insulation-tapes",
    ],
  },
  {
    name: "Hot Insulation",
    productSlugs: [
      "glass-wool-blanket",
      "glass-wool-pipe-wrap",
      "rock-wool-slab",
      "rock-wool-pipe-section",
      "ceramic-fibre-blanket",
      "aerogel-insulation-blanket",
      "aluminium-gi-ss-cladding",
      "thermal-insulation-jacket",
    ],
  },
  {
    name: "Acoustic Insulation",
    productSlugs: [
      "nitrile-acoustic-foam",
      "glass-wool-acoustic-board",
      "rock-wool-acoustic-panel",
      "mass-loaded-vinyl-barrier",
      "polyester-acoustic-panel",
    ],
  },
  {
    name: "Roof & PEB Underdeck Insulation",
    productSlugs: [
      "xlpe-underdeck-insulation",
      "foil-bubble-insulation",
      "epe-foil-foam",
    ],
  },
  {
    name: "Water Tank Cover",
    productSlugs: ["water-tank-cover"],
  },
];

export default function BrochuresPage() {
  return (
    <main className="brochure-page">
      <CatalogueHeader />
      <section className="brochure-hero">
        <div className="catalogue-shell">
          <div className="catalogue-kicker"><span /> RAC INSUTECH RESOURCE LIBRARY</div>
          <h1>Product briefs made<br />for project <em>conversations.</em></h1>
          <p>Visual, project-friendly guides for the core material range. Each brief captures purpose, applications, forms and selection prompts without replacing verified manufacturer specification sheets.</p>
          <div className="brochure-hero-actions">
            <Link href="/products"><Search size={17} /> Explore products</Link>
            <a href="#library"><BookOpen size={17} /> Browse library</a>
          </div>
        </div>
        <div className="brochure-hero-card"><FileText size={28} /><span>{catalogue.length}</span><p>product<br />briefs</p></div>
      </section>
      <section className="brochure-library catalogue-shell" id="library">
        <div className="brochure-intro">
          <div><p className="catalogue-kicker"><span /> ORGANIZED BY MATERIAL FAMILY</p><h2>Build your early-stage material pack.</h2></div>
          <div className="brochure-protection"><ShieldCheck size={19} /><span>RAC visual guides use non-numeric selection guidance. Verify final technical data with the approved manufacturer document.</span></div>
        </div>
        {brochureGroups.map((group) => {
          const items = catalogue.filter((product) => group.productSlugs.includes(product.slug));
          return <section className="brochure-group" key={group.name}>
            <div className="brochure-group-title"><span>{group.name}</span><small>{items.length} guides</small></div>
            <div className="brochure-list">
              {items.map((product) => <article key={product.slug}>
                <div className="brochure-thumb"><img src={product.image} alt="" /></div>
                <div><p>{product.brochureCompany} PRODUCT BRIEF</p><h3>{product.name}</h3><span>{product.shortDescription}</span></div>
                <div className="brochure-list-actions"><Link href={`/products/${product.slug}`}>Preview <ArrowRight size={16} /></Link><a href={`/brochures/${product.slug}`} download><Download size={16} /> PDF</a></div>
              </article>)}
            </div>
          </section>;
        })}
      </section>
      <section className="brochure-bottom"><div className="catalogue-shell"><div><p className="catalogue-kicker"><span /> NEED A PRODUCT-SPECIFIC SUBMITTAL?</p><h2>Request the right supporting document.</h2><p>For final approvals, RAC can help route you to the relevant verified manufacturer data sheet, test certificate or installation guide for the selected product.</p></div><Link href="/#contact">Request technical support <ArrowRight size={18} /></Link></div></section>
      <CatalogueFooter />
    </main>
  );
}
