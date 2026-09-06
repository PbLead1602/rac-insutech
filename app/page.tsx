"use client";

import { FormEvent, useEffect, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  ArrowUpRight,
  Award,
  Boxes,
  Building2,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  ClipboardCheck,
  Factory,
  Fan,
  Globe2,
  Headphones,
  Layers3,
  Mail,
  Menu,
  Minus,
  MapPin,
  MessageCircle,
  Phone,
  Search,
  Send,
  ShieldCheck,
  Sparkles,
  Thermometer,
  UsersRound,
  Volume2,
  Warehouse,
  Wrench,
  UserRound,
  X,
} from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { getProduct } from "@/lib/catalogue";
import { whatsappContactHref } from "@/lib/contact";
import { saveQuoteLeadDraft } from "@/lib/quotation-draft";
import { customerFetch } from "@/lib/auth/customer-client";
import { IndiaLocationFields } from "@/components/india-location-fields";

const heroSlides = [
  "/assets/hero/hero1.png",
  "/assets/hero/hero2.png",
  "/assets/hero/hero3.png",
  "/assets/hero/hero4.png",
  "/assets/hero/hero5.png",
  "/assets/hero/hero6.png",
  "/assets/hero/hero 7.png",
  "/assets/hero/hero8.png",
];

const productImages = [
  "/assets/catalogue/0cf083cf-551c-467b-83ba-88dfc8031ce3.png",
  "/assets/catalogue/2f02b80a-5d9f-4dda-beed-b01d35631888.png",
  "/assets/catalogue/46e0fa2e-1488-4d5a-b4f1-68ea4411685c.png",
  "/assets/catalogue/537ea8b6-4975-4a89-8462-fc5d05f8b6fc.png",
  "/assets/catalogue/7abf3fb9-3de0-4a4b-8527-ae665818368c.png",
  "/assets/catalogue/b9ea87de-3501-4202-9cb8-7f57017b326d.png",
];

const industryImages = [
  "/assets/catalogue/8cbc8c27-5ac5-4b5f-824e-2dae4987eba8.png",
  "/assets/catalogue/938af05c-b102-4681-b8eb-e0df3d2567a6.png",
  "/assets/catalogue/9dd4ad77-54ff-40d2-b3b2-1d6e654e9b18.png",
  "/assets/catalogue/a98ab15e-b419-447d-ac1a-1552e107947c.png",
  "/assets/catalogue/ab91d473-b00a-43fe-a7cf-90518c5ca478.png",
  "/assets/catalogue/dad86fb6-ab0e-4d0a-9bd5-c65e3085255b.png",
];

const navItems = [
  { name: "Products", href: "/products", items: [{ label: "HVAC / Cold Insulation", href: "/products?group=hvac-cold" }, { label: "Hot Insulation", href: "/products?group=hot-insulation" }, { label: "Acoustic Insulation", href: "/products?group=acoustic-insulation" }, { label: "Roof & PEB Underdeck Insulation", href: "/products?group=roof-peb-underdeck" }, { label: "Water Tank Cover", href: "/products?group=water-tank-cover" }] },
  { name: "Solutions", href: "/solutions", items: [{ label: "Cold & condensation control", href: "/solutions#cold-condensation-control" }, { label: "HVAC ducts & pipework", href: "/solutions#hvac-duct-pipe" }, { label: "Roof, underdeck & PEB", href: "/solutions#roof-peb-envelope" }, { label: "Acoustic control", href: "/solutions#acoustic-control" }] },
  { name: "Industries", href: "/industries", items: [{ label: "Pharma & life sciences", href: "/industries#pharma-life-sciences" }, { label: "Data centres", href: "/industries#data-centres" }, { label: "Industrial plants", href: "/industries#industrial-plants" }, { label: "Commercial buildings", href: "/industries#commercial-buildings" }] },
  { name: "Services", href: "/services", items: [{ label: "Technical selection", href: "/services#technical-selection" }, { label: "Material supply planning", href: "/services#material-supply" }, { label: "System detailing", href: "/services#system-detailing" }, { label: "Installation coordination", href: "/services#installation-coordination" }] },
  { name: "Resources", href: "/brochures", items: [{ label: "Product briefs", href: "/brochures" }, { label: "Material library", href: "/products" }, { label: "Solutions guide", href: "/solutions" }, { label: "RFQ support", href: "/?quote=1" }] },
];

const capabilities = [
  { label: "Thermal Insulation", icon: Thermometer, href: "/solutions#hot-process-insulation" },
  { label: "Acoustic Solutions", icon: Volume2, href: "/solutions#acoustic-control" },
  { label: "HVAC Insulation", icon: Fan, href: "/solutions#hvac-duct-pipe" },
  { label: "Industrial Insulation", icon: Factory, href: "/solutions#hot-process-insulation" },
  { label: "Roofing & PEB", icon: Warehouse, href: "/solutions#roof-peb-envelope" },
  { label: "Technical Support", icon: Headphones, href: "/services#technical-selection" },
];

const featuredProductSlugs = [
  "nitrile-rubber-sheet",
  "xlpe-sheet-insulation",
  "xlpe-underdeck-insulation",
  "foil-bubble-insulation",
  "rock-wool-slab",
  "glass-wool-acoustic-board",
];
const products = featuredProductSlugs.flatMap((slug) => {
  const product = getProduct(slug);
  return product ? [product] : [];
});

const industries = [
  { name: "Commercial\nBuildings", image: industryImages[0], slug: "commercial-buildings" },
  { name: "Industrial\nPlants", image: industryImages[1], slug: "industrial-plants" },
  { name: "Pharma &\nHealthcare", image: industryImages[2], slug: "pharma-life-sciences" },
  { name: "Data\nCentres", image: industryImages[3], slug: "data-centres" },
  { name: "HVAC\nSystems", image: industryImages[4], slug: "commercial-buildings" },
  { name: "Roofing &\nPEB", image: industryImages[5], slug: "warehousing-peb" },
];

const quickChips = ["HVAC", "Cold insulation", "PEB", "Acoustic", "High temperature", "Pipe insulation"];

const fadeUp = {
  hidden: { opacity: 0, y: 22 },
  show: { opacity: 1, y: 0 },
};

function scrollToId(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

export default function Home() {
  const [slide, setSlide] = useState(0);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [quoteOpen, setQuoteOpen] = useState(false);
  const [quoteDismissed, setQuoteDismissed] = useState(false);
  const [query, setQuery] = useState("");
  const [notice, setNotice] = useState("");
  const reduceMotion = useReducedMotion();
  const router = useRouter();
  const quoteRequested = useSyncExternalStore(
    () => () => undefined,
    () => new URLSearchParams(window.location.search).get("quote") === "1" || window.location.hash === "#contact",
    () => false,
  );
  const quoteProduct = useSyncExternalStore(
    () => () => undefined,
    () => new URLSearchParams(window.location.search).get("product") || "",
    () => "",
  );

  useEffect(() => {
    const timer = window.setInterval(() => setSlide((current) => (current + 1) % heroSlides.length), 6000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(""), 4200);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const submitSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!query.trim()) return setNotice("Choose a category or enter a product requirement to begin.");
    router.push(`/products?q=${encodeURIComponent(query.trim())}`);
    setNotice(`We can help source ${query.trim()} — our team will tailor a recommendation.`);
    scrollToId("products");
  };

  return (
    <main>
      <header className="site-header">
        <a className="brand" href="#top" aria-label="RAC Insutech home">
          <img src="/assets/logo/rac-logo.png" alt="RAC Insutech" />
        </a>

        <nav className="desktop-nav" aria-label="Main navigation">
          <Link className="nav-link simple" href="/">Home</Link>
          {navItems.map((item) => (
            <div className="nav-dropdown" key={item.name}>
              <button
                className="nav-link"
                onClick={() => setActiveMenu(activeMenu === item.name ? null : item.name)}
                aria-expanded={activeMenu === item.name}
              >
                {item.name}<ChevronDown size={14} />
              </button>
              <AnimatePresence>
                {activeMenu === item.name && (
                  <motion.div
                    className="dropdown-panel"
                    initial={{ opacity: 0, y: -8, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -5, scale: 0.98 }}
                    transition={{ duration: 0.2 }}
                  >
                    {item.items.map((entry) => <Link href={entry.href} key={entry.label} onClick={() => setActiveMenu(null)}>{entry.label}<ArrowUpRight size={14} /></Link>)}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
          <Link className="nav-link simple" href="/about">About Us</Link>
        </nav>

        <div className="header-actions">
          <Link className="header-contact" href="/account"><UserRound size={16} /> My account</Link>
          <a className="header-contact" href={whatsappContactHref("an insulation requirement")} target="_blank" rel="noreferrer"><MessageCircle size={16} /> Contact us</a>
          <button className="button button-gradient header-quote" onClick={() => setQuoteOpen(true)}>Request a Quote <ArrowRight size={17} /></button>
          <Link className="mobile-account-shortcut" href="/account" aria-label="Open My account"><UserRound size={19} /></Link>
          <button className="menu-toggle" onClick={() => setIsMenuOpen(true)} aria-label="Open menu"><Menu size={21} /></button>
        </div>
      </header>

      <section className="hero" id="top">
        <AnimatePresence mode="wait">
          <motion.img
            key={heroSlides[slide]}
            src={heroSlides[slide]}
            alt="RAC Insutech industrial insulation installation"
            className="hero-image"
            initial={{ opacity: 0.62, scale: reduceMotion ? 1 : 1.045 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduceMotion ? 0.15 : 1.2, ease: [0.22, 1, 0.36, 1] }}
          />
        </AnimatePresence>
        <div className="hero-overlay" />
        <div className="hero-grid" />

        <motion.div className="hero-content shell" initial="hidden" animate="show" variants={{ show: { transition: { staggerChildren: 0.1, delayChildren: 0.2 } } }}>
          <motion.div className="eyebrow hero-eyebrow" variants={fadeUp}><span /> INSULATE. OPTIMISE. PERFORM.</motion.div>
          <motion.h1 variants={fadeUp}>
            Engineered insulation<br />solutions for <span>better<br />performance.</span>
          </motion.h1>
          <motion.p className="hero-copy" variants={fadeUp}>Advanced thermal, acoustic and industrial insulation solutions for HVAC, commercial and infrastructure projects. Built for efficiency. Designed for durability.</motion.p>
          <motion.div className="hero-buttons" variants={fadeUp}>
            <button className="button button-gradient" onClick={() => scrollToId("products")}>Explore products <ArrowRight size={18} /></button>
            <button className="button button-glass" onClick={() => setQuoteOpen(true)}>Request a quote <ArrowRight size={18} /></button>
            <a className="button button-contact-glass" href={whatsappContactHref("an insulation requirement")} target="_blank" rel="noreferrer"><MessageCircle size={18} /> Contact us</a>
          </motion.div>
          <motion.div className="trust-row" variants={fadeUp}>
            <div className="avatar-stack" aria-label="Trusted customer representatives"><span>R</span><span>A</span><span>C</span><span>+</span></div>
            <p>Trusted by <strong>500+ companies</strong> worldwide</p>
          </motion.div>
        </motion.div>

        <motion.aside className="excellence-card" initial={{ opacity: 0, y: 28, filter: "blur(10px)" }} animate={{ opacity: 1, y: 0, filter: "blur(0px)" }} transition={{ delay: 0.75, duration: 0.75 }}>
          <Award size={34} strokeWidth={1.5} />
          <strong>15<span>+</span></strong>
          <p>Years of industry<br />excellence</p>
        </motion.aside>

        <div className="hero-controls" aria-label="Hero image controls">
          <button onClick={() => setSlide((slide - 1 + heroSlides.length) % heroSlides.length)} aria-label="Previous hero image"><ChevronLeft size={18} /></button>
          <div className="hero-dots">
            {heroSlides.map((image, index) => <button key={image} onClick={() => setSlide(index)} className={index === slide ? "active" : ""} aria-label={`View hero image ${index + 1}`} />)}
          </div>
          <button onClick={() => setSlide((slide + 1) % heroSlides.length)} aria-label="Next hero image"><ChevronRight size={18} /></button>
        </div>

        <form className="hero-search shell" onSubmit={submitSearch}>
          <Search size={20} />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="What are you looking for?" aria-label="Search insulation products" />
          <button type="submit">Find your solution <ArrowRight size={17} /></button>
        </form>

        <div className="quick-chips shell">
          <span>Popular:</span>
          {quickChips.map((chip) => <button key={chip} onClick={() => router.push(`/products?q=${encodeURIComponent(chip)}`)}>{chip}</button>)}
        </div>

        <div className="capability-wrap shell">
          <div className="capability-strip">
          {capabilities.map(({ label, icon: Icon, href }) => <Link key={label} className="capability" href={href}><Icon size={24} /><span>{label}</span></Link>)}
          </div>
        </div>
      </section>

      <section className="section products-section" id="products">
        <div className="shell">
          <SectionHeading eyebrow="FEATURED PRODUCTS" title="High performance insulation materials" link="View all products" href="/products" />
          <motion.div className="product-grid" initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.2 }} variants={{ show: { transition: { staggerChildren: 0.08 } } }}>
            {products.map((product, index) => (
              <motion.article className="product-card" key={`${product.slug}-${index}`} variants={fadeUp}>
                <Link href={`/products/${product.slug}`} className="product-image"><img src={product.image} alt={product.name} /></Link>
                <div className="featured-product-content"><p className="product-tag">{product.family}</p><h3><Link href={`/products/${product.slug}`}>{product.name}</Link></h3><p>{product.shortDescription}</p><Link className="round-arrow" aria-label={`View product information for ${product.name}`} title={`View product information for ${product.name}`} href={`/products/${product.slug}`} onClick={(event) => event.stopPropagation()}><ArrowRight size={17} /></Link></div>
              </motion.article>
            ))}
          </motion.div>
        </div>
      </section>

      <section className="solutions-section" id="solutions">
        <div className="shell solutions-layout">
          <motion.div className="solutions-copy" initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.35 }} variants={{ show: { transition: { staggerChildren: 0.1 } } }}>
            <motion.div variants={fadeUp} className="eyebrow"><span /> OUR SOLUTIONS</motion.div>
            <motion.h2 variants={fadeUp}>End-to-end<br />insulation solutions.</motion.h2>
            <motion.p variants={fadeUp}>From product supply to installation and maintenance, we deliver complete insulation solutions tailored to your requirements.</motion.p>
            <motion.div variants={fadeUp}><Link className="button button-outline" href="/solutions">Explore solutions <ArrowRight size={17} /></Link></motion.div>
          </motion.div>
          <motion.div className="solution-grid" initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.25 }} variants={{ show: { transition: { staggerChildren: 0.08, delayChildren: 0.15 } } }}>
            <SolutionCard href="/services#material-supply" icon={Boxes} name="Supply" text="A coordinated material list covering core insulation and accessories." />
            <SolutionCard href="/services#technical-selection" icon={UsersRound} name="Consultation" text="Application-led material guidance for a clearer starting point." />
            <SolutionCard href="/services#installation-coordination" icon={Wrench} name="Installation" text="Installation priorities, sequencing and compatible accessory guidance." />
            <SolutionCard href="/services#project-documentation" icon={Headphones} name="Documentation" text="Product briefs and verified manufacturer documents for review." />
          </motion.div>
        </div>
      </section>

      <section className="section industries-section" id="industries">
        <div className="shell">
          <SectionHeading eyebrow="INDUSTRIES WE SERVE" title="Built for demanding environments" link="View all industries" href="/industries" />
          <motion.div className="industry-grid" initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.2 }} variants={{ show: { transition: { staggerChildren: 0.08 } } }}>
            {industries.map((industry) => (
              <motion.div className="industry-card" key={industry.name} variants={{ hidden: { opacity: 0, y: 28, clipPath: "inset(100% 0 0 0 round 16px)" }, show: { opacity: 1, y: 0, clipPath: "inset(0 0 0 0 round 16px)" } }}>
                <Link href={`/industries#${industry.slug}`} aria-label={`Explore ${industry.name.replace("\n", " ")}`}>
                  <img src={industry.image} alt="" />
                  <span className="industry-shade" />
                  <strong>{industry.name.split("\n").map((line) => <span key={line}>{line}</span>)}</strong>
                  <i><ArrowRight size={17} /></i>
                </Link>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      <section className="stat-section" aria-label="RAC Insutech statistics">
        <div className="shell stat-grid">
          <Stat icon={Boxes} number="200+" label="Products" />
          <Stat icon={ClipboardCheck} number="500+" label="Successful projects" />
          <Stat icon={Sparkles} number="15+" label="Years of expertise" />
          <Stat icon={Award} number="4.9/5" label="Client rating" />
          <Stat icon={ShieldCheck} number="100%" label="Customer focused" />
        </div>
      </section>

      <section className="section why-section" id="about">
        <div className="shell why-layout">
          <div className="why-visual"><img src="/assets/hero/hero 7.png" alt="Insulated industrial infrastructure" /><div className="why-stamp"><Check size={18} /><span>Engineered<br />for confidence</span></div></div>
          <div className="why-copy">
            <div className="eyebrow"><span /> WHY RAC INSUTECH</div>
            <h2>Technical thinking, delivered with care.</h2>
            <p>RAC Insutech supports HVAC and insulation projects with application-led material guidance, tailored system thinking and dependable coordination from enquiry to execution.</p>
            <div className="benefit-list">
              <Benefit text="Material recommendations for real site conditions" />
              <Benefit text="Dependable supply for project timelines" />
              <Benefit text="Support from specification through installation" />
            </div>
            <Link className="text-link" href="/about">Learn about RAC Insutech <ArrowRight size={17} /></Link>
          </div>
        </div>
      </section>

      <section className="section cta-section" id="contact">
        <div className="shell"><div className="cta-panel"><div className="cta-lines" aria-hidden="true"><span /><span /><span /><span /><span /></div><div><div className="eyebrow on-dark"><span /> PROJECT SUPPORT, SIMPLIFIED</div><h2>Ready to optimise efficiency<br />and performance?</h2><p>Let&apos;s build a better, more efficient future together.</p></div><div className="cta-action"><button className="button button-gradient" onClick={() => setQuoteOpen(true)}>Request a quote today <ArrowRight size={18} /></button><a className="cta-contact" href={whatsappContactHref("a project requirement")} target="_blank" rel="noreferrer"><MessageCircle size={16} /> Contact us</a><div><span>Quick response</span><span>Expert support</span><span>Reliable solutions</span></div></div></div></div>
      </section>

      <footer className="footer">
        <div className="shell footer-grid">
          <div className="footer-brand"><img src="/assets/logo/rac-logo.png" alt="RAC Insutech" /><p>Engineered thermal, acoustic and HVAC insulation solutions for better-performing spaces and systems.</p></div>
          <FooterColumn title="Products" links={["Cold insulation", "HVAC insulation", "Acoustic insulation", "Roof & PEB"]} />
          <FooterColumn title="Solutions" links={["Technical consultation", "Supply & installation", "Project support", "Maintenance"]} />
          <FooterColumn title="Company" links={["About RAC", "Industries", "Resources", "Contact us"]} />
          <div className="footer-contact"><h3>Contact RAC</h3><a href="tel:+919130958594"><Phone size={15} /> +91 91309 58594</a><a href="mailto:racinsutech@gmail.com"><Mail size={15} /> racinsutech@gmail.com</a><a href="http://www.racinsutech.com" target="_blank" rel="noreferrer"><Globe2 size={15} /> www.racinsutech.com</a><a className="footer-whatsapp" href={whatsappContactHref("an insulation requirement")} target="_blank" rel="noreferrer"><MessageCircle size={15} /> Contact us on WhatsApp</a><address className="footer-address"><MapPin size={15} /> <span>Rukhmini Niwas, Near Vrundavan Garden Appt. Behind Tulshan Bungalow, Geeta Nagar, Akola</span></address><p className="footer-registration"><strong>GSTIN: 27AKLPL9475H1ZH</strong><br />State: 27-Maharashtra</p></div>
        </div>
        <div className="shell footer-bottom"><span>© {new Date().getFullYear()} RAC Insutech. All rights reserved.</span><div><Link href="/privacy">Privacy</Link><Link href="/terms">Terms</Link></div></div>
      </footer>

      <button className="mobile-quote" onClick={() => setQuoteOpen(true)}><Phone size={17} /> Request a Quote <ArrowRight size={17} /></button>

      <AnimatePresence>{isMenuOpen && <MobileMenu onClose={() => setIsMenuOpen(false)} onQuote={() => { setIsMenuOpen(false); setQuoteOpen(true); }} />}</AnimatePresence>
      <AnimatePresence>{(quoteOpen || (quoteRequested && !quoteDismissed)) && <QuoteModal initialProduct={quoteProduct || query} onClose={() => { setQuoteOpen(false); setQuoteDismissed(true); }} />}</AnimatePresence>
      <AnimatePresence>{notice && <motion.div className="toast" initial={{ opacity: 0, y: 18, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 18 }}><Check size={18} />{notice}</motion.div>}</AnimatePresence>
    </main>
  );
}

function SectionHeading({ eyebrow, title, link, href }: { eyebrow: string; title: string; link: string; href?: string }) {
  return <div className="section-heading"><div><div className="eyebrow"><span /> {eyebrow}</div><h2>{title}</h2></div>{href ? <Link className="text-link" href={href}>{link} <ArrowRight size={17} /></Link> : <button className="text-link" onClick={() => scrollToId("contact")}>{link} <ArrowRight size={17} /></button>}</div>;
}

function SolutionCard({ href, icon: Icon, name, text }: { href: string; icon: typeof Boxes; name: string; text: string }) {
  return <motion.div variants={fadeUp}><Link className="solution-card" href={href}><Icon size={31} strokeWidth={1.5} /><h3>{name}</h3><p>{text}</p></Link></motion.div>;
}

function Stat({ icon: Icon, number, label }: { icon: typeof Boxes; number: string; label: string }) {
  return <div className="stat"><Icon size={29} strokeWidth={1.5} /><div><strong>{number}</strong><span>{label}</span></div></div>;
}

function Benefit({ text }: { text: string }) { return <div className="benefit"><span><Check size={15} /></span>{text}</div>; }

const footerDestinations: Record<string, string> = {
  "Cold insulation": "/products", "HVAC insulation": "/products", "Acoustic insulation": "/products", "Roof & PEB": "/products",
  "Technical consultation": "/services#technical-selection", "Supply & installation": "/services#installation-coordination", "Project support": "/services", "Maintenance": "/services",
  "About RAC": "/about", "Industries": "/industries", "Resources": "/brochures",
};

function FooterColumn({ title, links }: { title: string; links: string[] }) { return <div className="footer-column"><h3>{title}</h3>{links.map((link) => link === "Contact us" ? <a href={whatsappContactHref("an insulation requirement")} target="_blank" rel="noreferrer" key={link}>Contact us</a> : <Link href={footerDestinations[link] || "/"} key={link}>{link}</Link>)}</div>; }

function MobileMenu({ onClose, onQuote }: { onClose: () => void; onQuote: () => void }) {
  const links = [{ label: "Home", href: "/" }, ...navItems.map((item) => ({ label: item.name, href: item.href })), { label: "About Us", href: "/about" }, { label: "My account", href: "/account" }];
  return <motion.div className="mobile-menu" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
    <motion.div className="mobile-panel" initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }} transition={{ type: "tween", ease: [0.22, 1, 0.36, 1] }}>
      <div className="mobile-menu-head"><img src="/assets/logo/rac-logo.png" alt="RAC Insutech" /><button onClick={onClose} aria-label="Close menu"><X /></button></div>
      {links.map((item) => <Link className="mobile-nav-link" key={item.label} href={item.href} onClick={onClose}>{item.label}<ArrowUpRight size={18} /></Link>)}
      <button className="button button-gradient full-width" onClick={onQuote}>Request a quote <ArrowRight size={18} /></button>
      <a className="mobile-contact" href={whatsappContactHref("an insulation requirement")} target="_blank" rel="noreferrer"><MessageCircle size={17} /> Contact us on WhatsApp</a>
      <div className="mobile-help"><CircleHelp size={18} /> Need assistance? <a href={whatsappContactHref("an insulation requirement")} target="_blank" rel="noreferrer">Contact RAC</a></div>
    </motion.div>
  </motion.div>;
}

function QuoteModal({ initialProduct, onClose }: { initialProduct: string; onClose: () => void }) {
  const [product, setProduct] = useState(initialProduct);
  const router = useRouter();
  const [submissionId] = useState(() => globalThis.crypto?.randomUUID?.() || "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    let current = true;
    (async () => {
      try {
        const response = await customerFetch("/api/customer-auth/me", { cache: "no-store" });
        const result = await response.json() as {
          account?: { fullName?: string; companyName?: string; mobile?: string; email?: string };
          customer?: { fullName?: string; company?: string; phone?: string; email?: string };
        };
        if (!response.ok || !result.account || !current) return;
        const values = {
          name: result.customer?.fullName || result.account.fullName || "",
          company: result.customer?.company || result.account.companyName || result.account.fullName || "",
          mobile: result.customer?.phone || result.account.mobile || "",
          email: result.customer?.email || result.account.email || "",
        };
        (Object.entries(values) as Array<[keyof typeof values, string]>).forEach(([field, value]) => {
          const input = document.querySelector<HTMLInputElement>(`.quote-modal input[name="${field}"]`);
          if (input) input.value = value;
        });
      } catch {
        // Enquiries are public, so a visitor without a valid session simply
        // continues with the blank form.
      }
    })();
    return () => { current = false; };
  }, []);

  const submitQuote = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    if (!form.reportValidity()) return;
    const values = new FormData(form);
    values.set("submissionId", submissionId);
    setBusy(true);
    setError("");
    try {
      // Uses a customer token only when one exists. Visitors can still submit
      // without an account; signed-in customers get the enquiry linked to
      // their existing customer record automatically.
      const response = await customerFetch("/api/rfq", { method: "POST", body: values });
      const result = await response.json() as { ok?: boolean; id?: string; enquiryNumber?: string; continuationToken?: string; directToQuotationBuilder?: boolean; message?: string };
      if (!response.ok || !result.ok || !result.id || (!result.directToQuotationBuilder && !result.continuationToken)) throw new Error(result.message || "We could not save your enquiry.");
      saveQuoteLeadDraft({
        enquiryId: result.id,
        enquiryNumber: result.enquiryNumber || result.id,
        continuationToken: result.continuationToken || "",
        name: String(values.get("name") || "").trim(), company: String(values.get("company") || "").trim(),
        mobile: String(values.get("mobile") || "").trim(), email: String(values.get("email") || "").trim(),
        city: String(values.get("city") || "").trim(), district: String(values.get("district") || "").trim(), state: String(values.get("state") || "").trim(), pinCode: String(values.get("pinCode") || "").trim(),
        projectLocation: String(values.get("projectLocation") || "").trim(), projectName: String(values.get("projectName") || "").trim(),
        product: String(values.get("product") || "").trim(), brand: String(values.get("brand") || "").trim(), quantity: String(values.get("quantity") || "").trim(),
        thickness: String(values.get("thickness") || "").trim(), application: String(values.get("application") || "").trim(), customerType: String(values.get("customerType") || "end_user") as "end_user" | "contractor" | "consultant" | "dealer" | "other", deliveryPreference: String(values.get("deliveryPreference") || "").trim(), message: String(values.get("message") || "").trim(),
      });
      onClose();
      router.push(result.directToQuotationBuilder ? "/generate-quotation" : `/account/continue?intent=${encodeURIComponent(result.continuationToken || "")}`);
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : "We could not save your enquiry.");
    } finally {
      setBusy(false);
    }
  };
  return <motion.div className="modal-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={onClose}><motion.div className="quote-modal" initial={{ opacity: 0, y: 18, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10, scale: 0.98 }} onMouseDown={(event) => event.stopPropagation()}><button className="modal-close" onClick={onClose} aria-label="Close enquiry form"><X size={20} /></button><div className="modal-kicker"><span /> START AN ENQUIRY</div><h2>Tell us about your requirement.</h2><p>Anyone can submit an enquiry directly. Register only when you want secure quotation access.</p><form onSubmit={submitQuote}><div className="form-row"><label>Full name<input name="name" required placeholder="Your name" /></label><label>Company<input name="company" required placeholder="Company name" /></label></div><div className="form-row"><label>Mobile number<input name="mobile" required type="tel" placeholder="+91" /></label><label>Email <small>Optional — required later only if you register.</small><input name="email" type="email" placeholder="you@company.com" /></label></div><div className="form-row"><IndiaLocationFields /><label>Customer type<select name="customerType" defaultValue="end_user"><option value="end_user">End user</option><option value="contractor">Contractor</option><option value="consultant">Consultant</option><option value="dealer">Dealer</option><option value="other">Other</option></select></label></div><div className="form-row"><label>Project name<input name="projectName" placeholder="Optional project name" /></label><label>Project location<input name="projectLocation" placeholder="Site location" /></label></div><div className="form-row"><label>Product or material<input name="product" value={product} onChange={(event) => setProduct(event.target.value)} placeholder="e.g. XLPE sheet insulation" /></label><label>Application<input name="application" placeholder="e.g. HVAC ducting" /></label></div><div className="form-row"><label>Brand preference<input name="brand" placeholder="Optional" /></label><label>Delivery preference<input name="deliveryPreference" placeholder="Optional timeline / location" /></label></div><div className="form-row"><label>Quantity<input name="quantity" placeholder="e.g. 250 m²" /></label><label>Thickness / size<input name="thickness" placeholder="e.g. 25 mm" /></label></div><label>Supporting file <small>Optional: PDF, BOQ, XLSX, DWG, PNG or JPG — up to 10 MB.</small><input className="file-input" name="attachment" type="file" accept=".pdf,.xlsx,.xls,.dwg,image/png,image/jpeg" /></label><label>Tell us about your requirement<textarea name="message" placeholder="Operating temperature, timeline, delivery needs or other helpful details." rows={3} /></label>{error && <p className="form-error" role="alert">{error}</p>}<button className="button button-gradient full-width" type="submit" disabled={busy}>{busy ? "Saving enquiry..." : "Submit enquiry"}<ArrowRight size={18} /></button></form></motion.div></motion.div>;
}
