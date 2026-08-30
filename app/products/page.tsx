"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { ArrowRight, BookOpen, Check, ChevronDown, Search, SlidersHorizontal } from "lucide-react";
import { CatalogueFooter, CatalogueHeader } from "@/components/catalogue-header";
import { catalogue } from "@/lib/catalogue";

const productGroups = [
  { slug: "hvac-cold", label: "HVAC / Cold Insulation", categories: ["cold-insulation", "hvac-insulation", "pipe-insulation"] },
  { slug: "hot-insulation", label: "Hot Insulation", categories: ["hot-insulation", "high-temperature-insulation"] },
  { slug: "acoustic-insulation", label: "Acoustic Insulation", categories: ["acoustic-insulation"] },
  { slug: "roof-peb-underdeck", label: "Roof & PEB Underdeck Insulation", categories: ["roof-peb-insulation"] },
  { slug: "water-tank-cover", label: "Water Tank Cover", categories: ["water-tank-cover"] },
] as const;

type ProductGroupSlug = (typeof productGroups)[number]["slug"] | "all";

function isProductGroup(value: string): value is Exclude<ProductGroupSlug, "all"> {
  return productGroups.some((group) => group.slug === value);
}

export default function ProductsPage() {
  const [typedQuery, setTypedQuery] = useState("");
  const [hasEditedQuery, setHasEditedQuery] = useState(false);
  const [chosenGroup, setChosenGroup] = useState<ProductGroupSlug>("all");
  const [hasEditedGroup, setHasEditedGroup] = useState(false);
  const [view, setView] = useState<"all" | "application">("all");
  const searchQuery = useSyncExternalStore(
    () => () => undefined,
    () => new URLSearchParams(window.location.search).get("q") ?? "",
    () => "",
  );
  const groupQuery = useSyncExternalStore(
    () => () => undefined,
    () => new URLSearchParams(window.location.search).get("group") ?? "all",
    () => "all",
  );

  const query = hasEditedQuery ? typedQuery : searchQuery;
  const activeGroup: ProductGroupSlug = hasEditedGroup
    ? chosenGroup
    : isProductGroup(groupQuery) ? groupQuery : "all";
  const activeGroupInfo = productGroups.find((group) => group.slug === activeGroup);
  const selectGroup = (group: ProductGroupSlug) => { setHasEditedGroup(true); setChosenGroup(group); };

  const results = useMemo(() => catalogue.filter((product) => {
    const haystack = `${product.name} ${product.category} ${product.family} ${product.shortDescription} ${product.idealFor.join(" ")}`.toLowerCase();
    const matchesGroup = activeGroup === "all" || activeGroupInfo?.categories.includes(product.categorySlug as never);
    return matchesGroup && (!query || haystack.includes(query.toLowerCase()));
  }), [activeGroup, activeGroupInfo, query]);

  return <main className="catalogue-page">
    <CatalogueHeader />
    <section className="catalogue-hero">
      <div className="catalogue-orbit catalogue-orbit-one" /><div className="catalogue-orbit catalogue-orbit-two" />
      <div className="catalogue-shell catalogue-hero-content">
        <div className="catalogue-kicker"><span /> MATERIAL LIBRARY</div>
        <h1>Insulation systems<br />built for <em>real projects.</em></h1>
        <p>Explore core thermal, HVAC, acoustic and industrial material options. Start with the application, then refine the specification with our technical team.</p>
        <form className="catalogue-search-field" onSubmit={(event) => event.preventDefault()}>
          <Search size={20} />
          <input value={query} onChange={(event) => { setHasEditedQuery(true); setTypedQuery(event.target.value); }} placeholder="Search material, application or system" />
          <button aria-label="Search catalogue"><ArrowRight size={19} /></button>
        </form>
        <div className="catalogue-hero-meta"><span><strong>{catalogue.length}</strong> product guides</span><span><strong>{productGroups.length}</strong> product groups</span><span><strong>1</strong> technical starting point</span></div>
      </div>
    </section>

    <section className="catalogue-main catalogue-shell">
      <div className="catalogue-intro"><div><p className="catalogue-kicker"><span /> FIND THE RIGHT BUILD-UP</p><h2>Browse the core product groups.</h2></div><p>Use the product groups below to narrow the starting point. Every product page includes applications, available forms, selection notes and a RAC product brief.</p></div>
      <div className="catalogue-toolbar">
        <div className="category-pills">
          <button className={activeGroup === "all" ? "active" : ""} onClick={() => selectGroup("all")}>All materials <span>{catalogue.length}</span></button>
          {productGroups.map((group) => <button key={group.slug} className={activeGroup === group.slug ? "active" : ""} onClick={() => selectGroup(group.slug)}>{group.label}</button>)}
        </div>
        <button className="filter-button" onClick={() => setView(view === "all" ? "application" : "all")}><SlidersHorizontal size={16} />{view === "all" ? "Show selection context" : "Hide selection context"}<ChevronDown size={14} /></button>
      </div>
      {view === "application" && <div className="selection-banner"><Check size={18} /><span><strong>Selection reminder:</strong> Choose material against the service, substrate, operating condition, facing and installation method—not a name alone.</span></div>}
      <div className="catalogue-result-line"><span>Showing <strong>{results.length}</strong> material guides{activeGroupInfo ? ` for ${activeGroupInfo.label}` : ""}</span><Link href="/brochures"><BookOpen size={15} /> Browse brochure library</Link></div>
      <div className="catalogue-grid">{results.map((product) => <article className="catalogue-card" key={product.slug}><Link href={`/products/${product.slug}`} className="catalogue-card-image"><img src={product.image} alt={product.name} /><span>{product.category}</span></Link><div className="catalogue-card-content"><p>{product.family}</p><h3><Link href={`/products/${product.slug}`}>{product.name}</Link></h3><span className="catalogue-card-description">{product.shortDescription}</span><div className="catalogue-card-tags">{product.idealFor.slice(0, 2).map((item) => <span key={item}>{item}</span>)}</div><div className="catalogue-card-actions"><Link href={`/products/${product.slug}`}>View material <ArrowRight size={16} /></Link><a href={`/brochures/${product.slug}`} download>Brief <BookOpen size={15} /></a></div></div></article>)}</div>
      {!results.length && <div className="catalogue-no-results"><Search size={26} /><h3>No materials matched that search.</h3><p>Try another product group or reset the product filters.</p><button onClick={() => { setHasEditedQuery(true); setTypedQuery(""); selectGroup("all"); }}>Reset catalogue</button></div>}
    </section>

    <section className="catalogue-process" id="solutions"><div className="catalogue-shell"><div><p className="catalogue-kicker"><span /> A CLEARER STARTING POINT</p><h2>Start with the system,<br />not just the product.</h2></div><div className="process-steps"><Step number="01" title="Tell us the service" text="Pipe, duct, roof, equipment, room or building-envelope application." /><Step number="02" title="Share the condition" text="Operating temperature, ambient environment, exposure and design intent." /><Step number="03" title="Get a material route" text="Receive a practical product family recommendation and quote path." /></div></div></section>
    <CatalogueFooter />
  </main>;
}

function Step({ number, title, text }: { number: string; title: string; text: string }) {
  return <article><span>{number}</span><h3>{title}</h3><p>{text}</p></article>;
}
