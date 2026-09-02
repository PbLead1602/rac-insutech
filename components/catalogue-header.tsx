"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, BookOpen, Globe2, Mail, MapPin, Menu, MessageCircle, Phone, Search, UserRound, X } from "lucide-react";
import { whatsappContactHref } from "@/lib/contact";

export function CatalogueHeader() {
  const [menuOpen, setMenuOpen] = useState(false);
  const links = [
    { label: "Home", href: "/" },
    { label: "Products", href: "/products" },
    { label: "Solutions", href: "/solutions" },
    { label: "Industries", href: "/industries" },
    { label: "Services", href: "/services" },
    { label: "Brochures", href: "/brochures" },
    { label: "About Us", href: "/about" },
  ];
  return <header className="catalogue-header">
    <div className="catalogue-shell catalogue-header-inner">
      <Link href="/" className="catalogue-logo" aria-label="RAC Insutech home"><img src="/assets/logo/rac-logo.png" alt="RAC Insutech" /></Link>
      <nav aria-label="Public catalogue navigation">{links.map((link) => <Link href={link.href} key={link.href}>{link.label}</Link>)}</nav>
      <div className="catalogue-header-actions"><Link href="/products" className="catalogue-search"><Search size={17} /><span>Search products</span></Link><Link href="/account" className="catalogue-contact-action"><UserRound size={15} /> My account</Link><a href={whatsappContactHref("an insulation requirement")} target="_blank" rel="noreferrer" className="catalogue-contact-action"><MessageCircle size={15} /> Contact us</a><Link href="/?quote=1" className="catalogue-quote">Request a quote <ArrowRight size={16} /></Link><Link href="/account" className="catalogue-mobile-account" aria-label="Open My account"><UserRound size={18} /></Link><button type="button" className="catalogue-menu" onClick={() => setMenuOpen((open) => !open)} aria-label={menuOpen ? "Close menu" : "Open menu"} aria-controls="rac-mobile-navigation" aria-expanded={menuOpen}>{menuOpen ? <X size={20} /> : <Menu size={20} />}</button></div>
    </div>
    {menuOpen && <nav id="rac-mobile-navigation" className="catalogue-mobile-nav" aria-label="Mobile catalogue navigation"><Link href="/account" onClick={() => setMenuOpen(false)}>My account <UserRound size={16} /></Link>{links.map((link) => <Link href={link.href} key={link.href} onClick={() => setMenuOpen(false)}>{link.label}<ArrowUpRight size={16} /></Link>)}<a href={whatsappContactHref("an insulation requirement")} target="_blank" rel="noreferrer" onClick={() => setMenuOpen(false)}>Contact us on WhatsApp <MessageCircle size={16} /></a><Link href="/?quote=1" onClick={() => setMenuOpen(false)}>Request a quote <ArrowRight size={16} /></Link></nav>}
  </header>;
}

export function CatalogueFooter() {
  return <footer className="catalogue-footer"><div className="catalogue-shell"><div><img src="/assets/logo/rac-logo.png" alt="RAC Insutech" /><p>Material guidance for thermal, acoustic, HVAC and industrial insulation applications.</p></div><div className="catalogue-footer-links"><Link href="/products">All products</Link><Link href="/solutions">Solutions</Link><Link href="/industries">Industries</Link><Link href="/services">Services</Link><Link href="/brochures"><BookOpen size={14} /> Product brochures</Link><Link href="/?quote=1">Request a quote</Link></div><div className="catalogue-contact"><h3>Contact RAC</h3><a href="tel:+919130958594"><Phone size={14} /> +91 91309 58594</a><a href="mailto:racinsutech@gmail.com"><Mail size={14} /> racinsutech@gmail.com</a><a href="http://www.racinsutech.com" target="_blank" rel="noreferrer"><Globe2 size={14} /> www.racinsutech.com</a><a className="footer-whatsapp" href={whatsappContactHref("an insulation requirement")} target="_blank" rel="noreferrer"><MessageCircle size={14} /> Contact us on WhatsApp</a><address><MapPin size={14} /><span>Rukhmini Niwas, Near Vrundavan Garden Appt. Behind Tulshan Bungalow, Geeta Nagar, Akola</span></address><p><strong>GSTIN: 27AKLPL9475H1ZH</strong><br />State: 27-Maharashtra</p></div><p className="catalogue-disclaimer">Product information is selection guidance. Confirm the final specification against verified manufacturer documentation.</p></div></footer>;
}
