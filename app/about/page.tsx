import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BadgeCheck, Building2, Check, Compass, Factory, Mail, MapPin, Phone, ShieldCheck, Wrench } from "lucide-react";
import { CatalogueFooter, CatalogueHeader } from "@/components/catalogue-header";

export const metadata: Metadata = {
  title: "About RAC Insutech | HVAC & Insulation Project Support",
  description: "Learn how RAC Insutech supports HVAC, thermal, acoustic and industrial insulation projects across India.",
};

const businessAreas = [
  { icon: Compass, title: "Application-led guidance", text: "We begin with the service: heat load, ventilation needs, operating temperature, geometry, exposure and the performance objective." },
  { icon: Building2, title: "HVAC & insulation solutions", text: "RAC supports thermal, acoustic, HVAC, roof/PEB and industrial insulation requirements with practical material routes." },
  { icon: Factory, title: "Project supply coordination", text: "Material cores, facings, vapour-control components and outer protection can be considered together for a more complete build-up." },
  { icon: Wrench, title: "Execution-focused support", text: "Selection notes, installation priorities and verified technical documentation help teams move from enquiry toward a reviewable project solution." },
];

const workingPrinciples = [
  "Understand the operating condition before proposing a material family.",
  "Balance thermal efficiency, moisture control, acoustic needs, safety and maintainability.",
  "Coordinate insulation cores, joints, facings and protective finishes as one system.",
  "Confirm final product performance against current approved technical documentation.",
];

export default function AboutPage() {
  return <main className="about-page">
    <CatalogueHeader />

    <section className="about-hero">
      <div className="about-hero-grid" aria-hidden="true" />
      <div className="catalogue-shell about-hero-content">
        <p className="catalogue-kicker"><span /> ABOUT RAC INSUTECH</p>
        <h1>Practical HVAC and insulation support for <em>better-performing facilities.</em></h1>
        <p>RAC Insutech is an Akola, Maharashtra-based partner for HVAC and insulation requirements across India. We bring technical thinking to thermal, acoustic, industrial and building-envelope projects so that material choices respond to the real service condition.</p>
        <div className="about-hero-actions"><Link href="/products">Explore materials <ArrowRight size={17} /></Link><Link href="/?quote=1">Discuss a project <ArrowRight size={17} /></Link></div>
      </div>
      <div className="about-hero-orbit about-hero-orbit-one" aria-hidden="true" /><div className="about-hero-orbit about-hero-orbit-two" aria-hidden="true" />
    </section>

    <section className="about-intro catalogue-shell">
      <div><p className="catalogue-kicker"><span /> OUR ROLE</p><h2>Turn operating conditions into a clearer insulation route.</h2></div>
      <div className="about-intro-copy"><p>RAC Insutech works at the intersection of HVAC performance, thermal protection and practical project execution. Our public company information describes a capability to study complex heat-load, ventilation and comfort requirements, then shape tailored HVAC and insulation solutions.</p><p>That means looking beyond an individual product: the insulation core, thickness, joint treatment, vapour control, outer protection and installation approach all influence the final result.</p></div>
    </section>

    <section className="about-business-section">
      <div className="catalogue-shell">
        <div className="about-section-heading"><p className="catalogue-kicker"><span /> NATURE OF BUSINESS</p><h2>What RAC Insutech helps project teams do.</h2><p>From early selection through project coordination, the focus is on efficient, durable and workable HVAC and insulation systems.</p></div>
        <div className="about-business-grid">{businessAreas.map(({ icon: Icon, title, text }) => <article key={title}><Icon size={27} strokeWidth={1.55} /><h3>{title}</h3><p>{text}</p></article>)}</div>
      </div>
    </section>

    <section className="about-method catalogue-shell">
      <div className="about-method-image"><img src="/assets/hero/hero 7.png" alt="Industrial insulation installation" /><div><BadgeCheck size={19} /><span>Integrity<br />towards quality</span></div></div>
      <div className="about-method-copy"><p className="catalogue-kicker"><span /> HOW WE WORK</p><h2>Technical clarity, practical coordination and accountable advice.</h2><p>Every project has its own service condition and construction constraints. RAC helps create a technically considered starting point that teams can validate against the final design brief and approved product submittals.</p><ul>{workingPrinciples.map((principle) => <li key={principle}><span><Check size={14} /></span>{principle}</li>)}</ul><Link href="/?quote=1">Start a technical conversation <ArrowRight size={17} /></Link></div>
    </section>

    <section className="about-coverage-section">
      <div className="catalogue-shell about-coverage-layout">
        <div><p className="catalogue-kicker"><span /> WHERE WE HELP</p><h2>Industrial, commercial and infrastructure applications.</h2><p>RAC supports material selection and project requirements for HVAC services, chilled-water and refrigeration systems, process and utility insulation, acoustic treatment, pre-engineered buildings, roofs and industrial facilities.</p></div>
        <div className="about-coverage-list"><span>HVAC ducts & equipment</span><span>Cold-service & condensation control</span><span>Hot-process & utility insulation</span><span>Acoustic enclosures & spaces</span><span>Metal roofs, PEB & underdeck systems</span><span>Protective cladding & finish details</span></div>
      </div>
    </section>

    <section className="about-contact-section catalogue-shell">
      <div className="about-contact-copy"><p className="catalogue-kicker"><span /> COMPANY DETAILS</p><h2>Talk to RAC Insutech about your next requirement.</h2><p>Share the application, dimensions, operating condition and project location. We can help you start with the appropriate material family and required details.</p><Link href="/?quote=1">Request a technical quote <ArrowRight size={17} /></Link></div>
      <address className="about-contact-card"><h3>RAC INSUTECH</h3><p><MapPin size={17} /> <span>Rukhmini Niwas, Near Vrundavan Garden Appt. Behind Tulshan Bungalow, Geeta Nagar, Akola</span></p><a href="tel:+919130958594"><Phone size={16} /> +91 91309 58594</a><a href="mailto:racinsutech@gmail.com"><Mail size={16} /> racinsutech@gmail.com</a><p className="about-registration"><ShieldCheck size={16} /> <span><strong>GSTIN: 27AKLPL9475H1ZH</strong><br />State: 27-Maharashtra</span></p></address>
    </section>

    <CatalogueFooter />
  </main>;
}
