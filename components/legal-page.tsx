import Link from "next/link";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { CatalogueFooter, CatalogueHeader } from "@/components/catalogue-header";

type LegalSection = { heading: string; body: string };

export function LegalPage({ title, intro, sections }: { title: string; intro: string; sections: LegalSection[] }) {
  return <main className="legal-page">
    <CatalogueHeader />
    <section className="legal-hero"><div className="catalogue-shell"><p className="catalogue-kicker"><span /> RAC INSUTECH</p><h1>{title}</h1><p>{intro}</p></div></section>
    <section className="legal-content catalogue-shell"><div><ShieldCheck size={25} /><p className="catalogue-kicker"><span /> WEBSITE INFORMATION</p><h2>Clear information for visitors.</h2></div><div className="legal-sections">{sections.map((section) => <article key={section.heading}><h3>{section.heading}</h3><p>{section.body}</p></article>)}<Link href="/?quote=1">Request a technical quote <ArrowRight size={16} /></Link></div></section>
    <CatalogueFooter />
  </main>;
}
