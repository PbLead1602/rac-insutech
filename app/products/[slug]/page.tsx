import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowRight,
  BookOpen,
  Check,
  ChevronRight,
  CircleHelp,
  Download,
  FileText,
  Layers3,
  MessageCircle,
  PackageCheck,
  ShieldCheck,
} from "lucide-react";
import { CatalogueFooter, CatalogueHeader } from "@/components/catalogue-header";
import { catalogue, getProduct } from "@/lib/catalogue";
import { whatsappContactHref } from "@/lib/contact";

type ProductPageProps = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return catalogue.map((product) => ({ slug: product.slug }));
}

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const { slug } = await params;
  const product = getProduct(slug);
  if (!product) return { title: "Product not found | RAC Insutech" };

  return {
    title: `${product.name} | RAC Insutech`,
    description: product.shortDescription,
    alternates: { canonical: `/products/${product.slug}` },
    openGraph: {
      title: `${product.name} | RAC Insutech`,
      description: product.shortDescription,
      url: `/products/${product.slug}`,
      images: [{ url: product.image, alt: product.name }],
    },
  };
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { slug } = await params;
  const product = getProduct(slug);
  if (!product) notFound();

  const related = catalogue
    .filter((item) => item.categorySlug === product.categorySlug && item.slug !== product.slug)
    .slice(0, 3);
  const quoteHref = `/?quote=1&product=${encodeURIComponent(product.name)}`;

  return (
    <main className="product-page">
      <CatalogueHeader />

      <div className="catalogue-shell product-breadcrumb">
        <Link href="/">Home</Link><ChevronRight size={14} />
        <Link href="/products">Products</Link><ChevronRight size={14} />
        <span>{product.name}</span>
      </div>

      <section className="product-hero">
        <div className="catalogue-shell product-hero-grid">
          <div className="product-visual">
            <span className="product-visual-badge"><PackageCheck size={15} /> {product.category}</span>
            <img src={product.image} alt={product.name} />
            <div className="product-visual-grid" />
          </div>
          <div className="product-summary">
            <p className="catalogue-kicker"><span /> {product.family.toUpperCase()}</p>
            <h1>{product.name}</h1>
            <p className="product-summary-copy">{product.overview}</p>
            <div className="product-actions">
              <Link href={quoteHref} className="product-primary">Request a quote <ArrowRight size={18} /></Link>
              <a href={whatsappContactHref(`${product.name} for a project`)} target="_blank" rel="noreferrer" className="product-contact"><MessageCircle size={17} /> Contact us</a>
              <a href={`/brochures/${product.slug}`} download className="product-secondary"><Download size={17} /> Download product brief</a>
            </div>
            <div className="product-trust"><ShieldCheck size={19} /><span>Selection guidance with final specification confirmed against verified manufacturer documentation.</span></div>
          </div>
        </div>
      </section>

      <section className="product-content catalogue-shell">
        <aside className="product-side-nav">
          <span>ON THIS PAGE</span>
          <a href="#overview">Overview</a>
          <a href="#benefits">Key benefits</a>
          <a href="#forms">Available forms</a>
          {product.technicalData && <a href="#technical-data">Technical reference</a>}
          <a href="#selection">Selection notes</a>
          <a href="#brochure">Product brief</a>
        </aside>

        <div className="product-article">
          <section id="overview">
            <p className="catalogue-kicker"><span /> MATERIAL OVERVIEW</p>
            <h2>Where this material belongs.</h2>
            <p>{product.overview}</p>
            <div className="use-grid">{product.idealFor.map((item) => <div key={item}><Check size={16} /><span>{item}</span></div>)}</div>
          </section>

          <section id="benefits">
            <div className="section-label-row"><div><p className="catalogue-kicker"><span /> KEY BENEFITS</p><h2>Designed to support the right build-up.</h2></div><Layers3 size={30} /></div>
            <div className="detail-grid">{product.keyBenefits.map((benefit, index) => <article key={benefit}><span>0{index + 1}</span><h3>{benefit}</h3><p>Review this advantage against the overall system design, installation method and project requirements.</p></article>)}</div>
          </section>

          <section id="forms">
            <p className="catalogue-kicker"><span /> AVAILABLE FORMS</p>
            <h2>Specify the delivery format.</h2>
            <div className="forms-list">{product.availableForms.map((form) => <div key={form}><PackageCheck size={18} /><span>{form}</span><ChevronRight size={17} /></div>)}</div>
          </section>

          {product.technicalData && <section id="technical-data" className="technical-reference">
            <p className="catalogue-kicker"><span /> TECHNICAL REFERENCE</p>
            <h2>Reference data for early selection.</h2>
            <div className="technical-table-scroll" tabIndex={0} aria-label={`${product.name} technical specifications`}>
              <div className="technical-spec-table" role="table">
                <div className="technical-spec-heading" role="row"><span role="columnheader">Description</span><span role="columnheader">Test standard</span><span role="columnheader">UOM</span><span role="columnheader">Reference value</span></div>
                {product.technicalData.map((item) => item.isSection
                  ? <div key={item.description} className="technical-spec-section">{item.description}</div>
                  : <div className="technical-spec-row" role="row" key={item.description}><span role="cell">{item.description}</span><span role="cell">{item.standard}</span><span role="cell">{item.unit}</span><strong role="cell">{item.value}</strong></div>)}
              </div>
            </div>
            {product.technicalDataNote && <p className="technical-data-note">{product.technicalDataNote}</p>}
          </section>}

          <section id="selection" className="selection-note">
            <CircleHelp size={24} />
            <div><p className="catalogue-kicker"><span /> TECHNICAL SELECTION</p><h2>What to confirm before ordering.</h2><ul>{product.selectionNotes.map((note) => <li key={note}>{note}</li>)}</ul></div>
          </section>

          <section id="brochure" className="brochure-callout">
            <div><FileText size={26} /><p className="catalogue-kicker"><span /> {product.brochureCompany.toUpperCase()} PRODUCT BRIEF</p><h2>Take the material guide with you.</h2><p>Download this product&apos;s visual brief for project conversations and early-stage material planning.</p></div>
            <a href={`/brochures/${product.slug}`} download><BookOpen size={18} /> Download PDF <ArrowRight size={17} /></a>
          </section>

          <section className="product-request">
            <div><p className="catalogue-kicker"><span /> NEXT STEP</p><h2>Need help narrowing the specification?</h2><p>Your RFQ will include {product.name}, so the technical conversation starts with the correct product context.</p></div>
            <div className="product-request-actions"><Link href={quoteHref} className="product-primary">Request a technical quote <MessageCircle size={18} /></Link><a href={whatsappContactHref(`${product.name} selection`)} target="_blank" rel="noreferrer" className="product-contact">Contact us <ArrowRight size={17} /></a></div>
          </section>
        </div>
      </section>

      <section className="related-products">
        <div className="catalogue-shell">
          <div className="related-heading"><div><p className="catalogue-kicker"><span /> EXPLORE RELATED MATERIALS</p><h2>Continue the material review.</h2></div><Link href="/products">View all products <ArrowRight size={17} /></Link></div>
          <div className="related-grid">{related.map((item) => <Link href={`/products/${item.slug}`} key={item.slug}><img src={item.image} alt="" /><div><span>{item.family}</span><h3>{item.name}</h3><p>{item.shortDescription}</p><b>View guide <ArrowRight size={15} /></b></div></Link>)}</div>
        </div>
      </section>

      <CatalogueFooter />
    </main>
  );
}
