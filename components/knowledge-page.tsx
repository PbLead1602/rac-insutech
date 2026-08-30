import Link from "next/link";
import { ArrowRight, Check, ClipboardList, Layers3, Quote, Sparkles } from "lucide-react";
import { CatalogueFooter, CatalogueHeader } from "@/components/catalogue-header";
import type { ContentCard } from "@/lib/site-content";

type KnowledgePageProps = {
  kicker: string;
  title: string;
  emphasis: string;
  intro: string;
  cards: ContentCard[];
  note: string;
};

export function KnowledgePage({ kicker, title, emphasis, intro, cards, note }: KnowledgePageProps) {
  return <main className="knowledge-page">
    <CatalogueHeader />
    <section className="knowledge-hero">
      <div className="catalogue-shell">
        <p className="catalogue-kicker"><span /> {kicker}</p>
        <h1>{title} <em>{emphasis}</em></h1>
        <p>{intro}</p>
        <div className="knowledge-hero-actions"><Link href="/products">Explore materials <ArrowRight size={17} /></Link><Link href="/?quote=1">Discuss a requirement <Quote size={16} /></Link></div>
      </div>
      <div className="knowledge-orbit knowledge-orbit-one" /><div className="knowledge-orbit knowledge-orbit-two" />
    </section>
    <section className="knowledge-main catalogue-shell">
      <div className="knowledge-intro"><div><p className="catalogue-kicker"><span /> RAC PUBLIC GUIDE</p><h2>Clearer paths for project decisions.</h2></div><p>{note}</p></div>
      <div className="knowledge-grid">
        {cards.map((card, index) => <article key={card.slug} id={card.slug}>
          <div className="knowledge-card-index">0{index + 1}</div>
          <h2>{card.title}</h2>
          <p>{card.summary}</p>
          <div className="knowledge-card-columns">
            <div><h3><Layers3 size={16} /> Material families</h3><ul>{card.materials.map((material) => <li key={material}><Check size={14} /> {material}</li>)}</ul></div>
            <div><h3><ClipboardList size={16} /> Typical applications</h3><ul>{card.applications.map((application) => <li key={application}><Check size={14} /> {application}</li>)}</ul></div>
          </div>
          <Link href="/?quote=1">Talk through this route <ArrowRight size={16} /></Link>
        </article>)}
      </div>
    </section>
    <section className="knowledge-next"><div className="catalogue-shell"><div><p className="catalogue-kicker"><span /> NEXT STEP</p><h2>Start with the application, not a guess.</h2><p>Share your operating conditions, dimensions and project priorities. We’ll help shape an appropriate material shortlist for review.</p></div><Link href="/?quote=1">Request a quote <Sparkles size={17} /><ArrowRight size={17} /></Link></div></section>
    <CatalogueFooter />
  </main>;
}
