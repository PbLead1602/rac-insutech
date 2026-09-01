"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import { Activity, Archive, ArrowRight, BellRing, BookOpen, Boxes, BriefcaseBusiness, Building2, ChevronLeft, ChevronRight, ClipboardList, FileText, FolderCog, GalleryVerticalEnd, HandCoins, LayoutDashboard, LogOut, Menu, PackagePlus, Plus, Search, Settings, ShieldCheck, SlidersHorizontal, UserCheck, UsersRound } from "lucide-react";
import { adminFetch, getAdminSession, signInAdmin, signOutAdmin, type AdminSession } from "@/lib/auth/admin-client";
import { getAdminSupabaseBrowserClient } from "@/lib/supabase/client";
import AdminEnquiriesPanel from "@/components/admin-enquiries-panel";
import AdminQuotationsPanel from "@/components/admin-quotations-panel";
import AdminCustomersPanel from "@/components/admin-customers-panel";
import AdminProjectsPanel from "@/components/admin-projects-panel";
import AdminRatesPanel from "@/components/admin-rates-panel";
import AdminProductsPanel from "@/components/admin-products-panel";
import AdminVariantsPanel from "@/components/admin-variants-panel";
import AdminDocumentsPanel from "@/components/admin-documents-panel";
import AdminSiteContentPanel from "@/components/admin-site-content-panel";
import AdminSettingsPanel from "@/components/admin-settings-panel";
import AdminActivityPanel from "@/components/admin-activity-panel";
import AdminCategoriesPanel from "@/components/admin-categories-panel";
import AdminBrandsPanel from "@/components/admin-brands-panel";
import AdminEditorialPanel from "@/components/admin-editorial-panel";
import AdminMediaPanel from "@/components/admin-media-panel";
import AdminAccountPanel from "@/components/admin-account-panel";
import AdminAccountApprovalsPanel from "@/components/admin-account-approvals-panel";
import AdminChangeConfirmationGuard from "@/components/admin-change-confirmation-guard";

type AdminSection = "dashboard" | "enquiries" | "account_approvals" | "quotations" | "customers" | "projects" | "products" | "categories" | "brands" | "applications" | "industries" | "services" | "rates" | "documents" | "media" | "content" | "resources" | "settings" | "activity" | "account";
type AdminQuotation = { id: string; quoteNumber: string; company: string; total: number; createdAt: string; status: string };
type Enquiry = { name: string; product?: string; createdAt: string; status: string };
type Attention = { label: string; value: number; tone: "critical" | "today" | "info"; href: string; detail: string };
type DashboardData = { products: number; enquiries: number; quotations: number; pendingApprovals: number; quotedValue: number; recent: Enquiry[]; recentQuotations: AdminQuotation[]; attention: Attention[] };
type NavigationItem = { label: string; section: AdminSection; icon: LucideIcon; href: string };
type NavigationGroup = { label?: string; items: NavigationItem[] };

const meta: Record<AdminSection, { title: string; eyebrow: string; description: string; action: string }> = {
  dashboard: { title: "Operations dashboard", eyebrow: "RAC INSUTECH ADMIN", description: "Prioritise records that need attention today.", action: "Create quotation" },
  enquiries: { title: "Enquiries", eyebrow: "SALES", description: "Review requirements, capture internal notes and convert qualified enquiries into quotations.", action: "Add enquiry" },
  account_approvals: { title: "Account approvals", eyebrow: "SALES", description: "Verify registrations and enable commercial access only for approved RAC customers.", action: "Review accounts" },
  quotations: { title: "Quotations", eyebrow: "SALES", description: "Manage website quotes, manual quotations, follow-ups, revisions and commercial history.", action: "Create quotation" },
  customers: { title: "Customers", eyebrow: "SALES", description: "Approved customer profiles linked to their registered account, enquiries, projects and quotations.", action: "Review approvals" },
  projects: { title: "Projects", eyebrow: "SALES", description: "Track customer requirements, locations, linked products and quotation history by project.", action: "Add project" },
  products: { title: "Products", eyebrow: "CATALOGUE", description: "Manage the master catalogue used by website pages, content and quotation configuration.", action: "Add product" },
  categories: { title: "Categories", eyebrow: "CATALOGUE", description: "Organise material families and public product navigation.", action: "Add category" },
  brands: { title: "Brands", eyebrow: "CATALOGUE", description: "Maintain supplier information without publishing unverified dealership claims.", action: "Add brand" },
  applications: { title: "Applications", eyebrow: "CATALOGUE", description: "Connect HVAC, cold insulation, acoustic and other use cases to products.", action: "Add application" },
  industries: { title: "Industries", eyebrow: "CATALOGUE", description: "Manage industry pages, challenges and recommended RAC solutions.", action: "Add industry" },
  services: { title: "Services", eyebrow: "CONTENT", description: "Manage RAC service descriptions, process and public visibility.", action: "Add service" },
  rates: { title: "Rate cards", eyebrow: "COMMERCIAL", description: "Create governed price versions for product configurations. Historical quotes remain unchanged.", action: "Add rate" },
  documents: { title: "Brochures & documents", eyebrow: "CONTENT", description: "Store public and internal brochures, datasheets, certificates and archived versions.", action: "Upload document" },
  media: { title: "Media library", eyebrow: "CONTENT", description: "Upload, organise and reuse image assets with alt text and usage information.", action: "Upload media" },
  content: { title: "Website content", eyebrow: "CONTENT", description: "Manage homepage, company information and CTA sections without changing code.", action: "Edit content" },
  resources: { title: "Resources", eyebrow: "CONTENT", description: "Manage guides, technical notes, FAQs and downloadable resources.", action: "Add resource" },
  settings: { title: "Settings", eyebrow: "SYSTEM", description: "Configure company, quotation, email, WhatsApp and integration settings. Secrets remain private.", action: "Open settings" },
  activity: { title: "Activity log", eyebrow: "SYSTEM", description: "Review critical Admin actions across pricing, quotes, content and settings.", action: "View activity" },
  account: { title: "Admin account", eyebrow: "SYSTEM", description: "Manage the sole RAC Admin account, sign-in details and active sessions.", action: "Account settings" },
};

const navigation: NavigationGroup[] = [
  { items: [{ label: "Dashboard", section: "dashboard", icon: LayoutDashboard, href: "/admin" }] },
  { label: "Sales", items: [{ label: "Enquiries", section: "enquiries", icon: ClipboardList, href: "/admin/enquiries" }, { label: "Account approvals", section: "account_approvals", icon: UserCheck, href: "/admin/account-approvals" }, { label: "Quotations", section: "quotations", icon: FileText, href: "/admin/quotations" }, { label: "Customers", section: "customers", icon: UsersRound, href: "/admin/customers" }, { label: "Projects", section: "projects", icon: BriefcaseBusiness, href: "/admin/projects" }] },
  { label: "Catalogue", items: [{ label: "Products", section: "products", icon: Boxes, href: "/admin/products" }, { label: "Categories", section: "categories", icon: FolderCog, href: "/admin/categories" }, { label: "Brands", section: "brands", icon: Building2, href: "/admin/brands" }, { label: "Applications", section: "applications", icon: GalleryVerticalEnd, href: "/admin/applications" }, { label: "Industries", section: "industries", icon: BriefcaseBusiness, href: "/admin/industries" }] },
  { label: "Commercial", items: [{ label: "Rate cards", section: "rates", icon: HandCoins, href: "/admin/rates" }, { label: "Quotation terms", section: "settings", icon: SlidersHorizontal, href: "/admin/settings/quotation" }] },
  { label: "Content", items: [{ label: "Website content", section: "content", icon: LayoutDashboard, href: "/admin/content" }, { label: "Services", section: "services", icon: Settings, href: "/admin/services" }, { label: "Documents", section: "documents", icon: BookOpen, href: "/admin/documents" }, { label: "Resources", section: "resources", icon: Archive, href: "/admin/resources" }, { label: "Media", section: "media", icon: GalleryVerticalEnd, href: "/admin/media" }] },
  { label: "System", items: [{ label: "Settings", section: "settings", icon: Settings, href: "/admin/settings" }, { label: "Activity log", section: "activity", icon: Activity, href: "/admin/activity" }, { label: "Admin account", section: "account", icon: ShieldCheck, href: "/admin/account" }] },
];

const emptyDashboard: DashboardData = { products: 0, enquiries: 0, quotations: 0, pendingApprovals: 0, quotedValue: 0, recent: [], recentQuotations: [], attention: [] };
const currency = (value: number) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(value);
const indiaDateKey = (value: Date | string) => {
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date(value));
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((item) => item.type === type)?.value || "";
  return `${part("year")}-${part("month")}-${part("day")}`;
};
const todayInIndiaRange = () => {
  const [year, month, day] = indiaDateKey(new Date()).split("-").map(Number);
  const start = Date.UTC(year, month - 1, day) - (5.5 * 60 * 60 * 1000);
  return { start: new Date(start).toISOString(), end: new Date(start + (24 * 60 * 60 * 1000)).toISOString() };
};
const destination = (section: AdminSection) => {
  if (section === "dashboard" || section === "quotations") return "/admin/quotations/new";
  if (section === "enquiries") return "/admin/enquiries/new";
  if (section === "account_approvals") return "/admin/account-approvals";
  if (section === "customers") return "/admin/account-approvals";
  if (section === "projects") return "/admin/projects/new";
  if (section === "rates") return "/admin/rates/new";
  if (section === "products") return "/admin/products/new";
  if (section === "categories") return "/admin/categories/new";
  if (section === "brands") return "/admin/brands/new";
  if (section === "documents") return "/admin/documents/new";
  if (section === "content") return "/admin/content/new";
  if (["categories", "brands", "applications", "industries", "services", "documents", "media", "content", "resources"].includes(section)) return `/admin/${section}?new=1`;
  if (section === "activity") return "/admin/activity";
  if (section === "account") return "/admin/account";
  return "/admin/settings";
};

function sectionFromPath(pathname: string): AdminSection {
  return navigation.flatMap((group) => group.items).find((item) => pathname === item.href || (item.href !== "/admin" && pathname.startsWith(`${item.href}/`)))?.section || "dashboard";
}

async function loadDashboard(): Promise<DashboardData> {
  const client = getAdminSupabaseBrowserClient();
  if (!client) {
    const [quotesResponse, enquiriesResponse, productsResponse, accountsResponse] = await Promise.all([adminFetch("/api/admin/quotations", { cache: "no-store" }), adminFetch("/api/admin/enquiries", { cache: "no-store" }), adminFetch("/api/admin/products", { cache: "no-store" }), adminFetch("/api/admin/customer-accounts?status=pending_admin_approval", { cache: "no-store" })]);
    const quoteData = quotesResponse.ok ? await quotesResponse.json() as { quotations?: Array<{ id: string; quoteNumber: string; customer: { company: string }; total: number; createdAt: string; status: string }> } : {};
    const enquiryData = enquiriesResponse.ok ? await enquiriesResponse.json() as { enquiries?: Enquiry[] } : {};
    const productData = productsResponse.ok ? await productsResponse.json() as { products?: Array<{ id: string }> } : {};
    const accountData = accountsResponse.ok ? await accountsResponse.json() as { accounts?: Array<{ id: string }> } : {};
    const quotations = quoteData.quotations || []; const enquiries = enquiryData.enquiries || []; const products = productData.products || []; const today = indiaDateKey(new Date());
    const newEnquiries = enquiries.filter((item) => indiaDateKey(item.createdAt) === today).length;
    const openQuotes = quotations.filter((item) => !["won", "lost", "expired", "cancelled"].includes(item.status)).length;
    const pendingApprovals = accountData.accounts?.length || 0;
    return { products: products.length, enquiries: enquiries.length, quotations: quotations.length, pendingApprovals, quotedValue: quotations.reduce((total, item) => total + Number(item.total || 0), 0), recent: enquiries.slice(0, 5), recentQuotations: quotations.slice(0, 6).map((item) => ({ ...item, company: item.customer.company })), attention: [{ label: "New enquiries", value: newEnquiries, tone: "today", href: "/admin/enquiries", detail: "Review the latest website requirements." }, { label: "Open quotations", value: openQuotes, tone: "info", href: "/admin/quotations", detail: "Review, send or schedule a follow-up." }, { label: "Follow-ups due", value: 0, tone: "today", href: "/admin/quotations", detail: "Set follow-up dates from a quotation or enquiry." }, { label: "Rates requiring review", value: 0, tone: "critical", href: "/admin/rates", detail: "Rate expiry monitoring activates after rate import." }, { label: "Customer approvals", value: pendingApprovals, tone: "critical", href: "/admin/account-approvals", detail: "Verify registered accounts before enabling quotation access." }] };
  }
  const todayRange = todayInIndiaRange();
  const [productResult, enquiryResult, todayEnquiryResult, accountResult, quoteResult, recentEnquiries, recentQuotes] = await Promise.all([client.from("products").select("id", { count: "exact", head: true }), client.from("enquiries").select("id", { count: "exact", head: true }), client.from("enquiries").select("id", { count: "exact", head: true }).gte("created_at", todayRange.start).lt("created_at", todayRange.end), client.from("customer_accounts").select("id", { count: "exact", head: true }).eq("approval_status", "pending_admin_approval"), client.from("quotations").select("id, total, status"), client.from("enquiries").select("name, product_name, created_at, status").order("created_at", { ascending: false }).limit(5), client.from("quotations").select("id, quote_number, customer, total, created_at, status").order("created_at", { ascending: false }).limit(6)]);
  const quotes = quoteResult.data || []; const openQuotes = quotes.filter((quote) => !["won", "lost", "expired", "cancelled"].includes(quote.status)).length;
  const pendingApprovals = accountResult.count || 0;
  return { products: productResult.count || 0, enquiries: enquiryResult.count || 0, quotations: quotes.length, pendingApprovals, quotedValue: quotes.reduce((total, quote) => total + Number(quote.total || 0), 0), recent: (recentEnquiries.data || []).map((item) => ({ name: item.name, product: item.product_name || "Technical requirement", createdAt: item.created_at, status: item.status })), recentQuotations: (recentQuotes.data || []).map((item) => ({ id: item.id, quoteNumber: item.quote_number, company: (item.customer as { company?: string })?.company || "Customer not specified", total: Number(item.total), createdAt: item.created_at, status: item.status })), attention: [{ label: "New enquiries", value: todayEnquiryResult.count || 0, tone: "today", href: "/admin/enquiries", detail: "Review the latest website requirements." }, { label: "Open quotations", value: openQuotes, tone: "info", href: "/admin/quotations", detail: "Review, send or schedule a follow-up." }, { label: "Follow-ups due", value: 0, tone: "today", href: "/admin/quotations", detail: "Set follow-up dates from a quotation or enquiry." }, { label: "Rates requiring review", value: 0, tone: "critical", href: "/admin/rates", detail: "Rate expiry monitoring activates after rate import." }, { label: "Customer approvals", value: pendingApprovals, tone: "critical", href: "/admin/account-approvals", detail: "Verify registered accounts before enabling quotation access." }] };
}

export default function AdminOperatingSystem() {
  const pathname = usePathname(); const router = useRouter(); const section = sectionFromPath(pathname); const [session, setSession] = useState<AdminSession | null | undefined>(); const [dashboard, setDashboard] = useState(emptyDashboard); const [collapsed, setCollapsed] = useState(false); const [mobileOpen, setMobileOpen] = useState(false); const [search, setSearch] = useState("");
  useEffect(() => { getAdminSession().then(async (nextSession) => { setSession(nextSession); if (nextSession) setDashboard(await loadDashboard()); }); }, []);
  useEffect(() => {
    if (!session) return;
    let active = true;
    const refreshDashboard = () => { if (document.visibilityState === "visible") void loadDashboard().then((next) => { if (active) setDashboard(next); }).catch(() => undefined); };
    const timer = window.setInterval(refreshDashboard, 20_000);
    document.addEventListener("visibilitychange", refreshDashboard);
    return () => { active = false; window.clearInterval(timer); document.removeEventListener("visibilitychange", refreshDashboard); };
  }, [session]);
  const results = useMemo(() => { const query = search.toLowerCase().trim(); return !query ? [] : [...dashboard.recent.map((item) => ({ label: item.name, detail: `Enquiry · ${item.product || "Requirement"}`, href: "/admin/enquiries" })), ...dashboard.recentQuotations.map((item) => ({ label: item.quoteNumber, detail: `Quotation · ${item.company}`, href: "/admin/quotations" }))].filter((item) => `${item.label} ${item.detail}`.toLowerCase().includes(query)).slice(0, 6); }, [dashboard, search]);
  if (session === undefined) return <main className="admin-loading">Loading RAC Admin…</main>;
  if (!session) return <AdminLogin onSuccess={async (nextSession) => { setSession(nextSession); setDashboard(await loadDashboard()); }} />;
  const page = meta[section]; const go = (href: string) => { setMobileOpen(false); router.push(href); };
  return <><main className={`admin-os ${collapsed ? "admin-os-collapsed" : ""}`}><aside className={`admin-os-sidebar ${mobileOpen ? "open" : ""}`}><div className="admin-os-brand"><Link href="/admin"><img src="/assets/logo/rac-logo.png" alt="RAC Insutech" /><span>ADMIN</span></Link><button type="button" onClick={() => setCollapsed((value) => !value)} aria-label="Collapse navigation">{collapsed ? <ChevronRight size={17} /> : <ChevronLeft size={17} />}</button></div><nav>{navigation.map((group) => <div className="admin-os-nav-group" key={group.label || "dashboard"}>{group.label && <p>{group.label}</p>}{group.items.map((item) => { const Icon = item.icon; return <button type="button" key={item.href} className={section === item.section ? "active" : ""} onClick={() => go(item.href)} title={item.label}><Icon size={17} /><span>{item.label}</span></button>; })}</div>)}</nav><div className="admin-os-user"><span>{session.profile.displayName.slice(0, 1).toUpperCase()}</span><div><strong>{session.profile.displayName}</strong><small>{session.isMock ? "Development Admin" : "Authorised Admin"}</small></div><button type="button" onClick={async () => { await signOutAdmin(); setSession(null); }} aria-label="Sign out"><LogOut size={16} /></button></div></aside>{mobileOpen && <button type="button" className="admin-os-scrim" onClick={() => setMobileOpen(false)} aria-label="Close navigation" />}<section className="admin-os-main"><header className="admin-os-header"><button type="button" className="admin-os-mobile-menu" onClick={() => setMobileOpen(true)} aria-label="Open navigation"><Menu size={19} /></button><div><p>{page.eyebrow}</p><h1>{pathname.endsWith("/variants") ? "Product variants" : page.title}</h1></div><div className="admin-os-header-actions"><div className="admin-os-search"><Search size={16} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search customers, quotes, products…" />{results.length > 0 && <div className="admin-os-search-results">{results.map((result) => <button type="button" key={`${result.href}-${result.label}`} onClick={() => { setSearch(""); go(result.href); }}><strong>{result.label}</strong><small>{result.detail}</small></button>)}</div>}</div><button type="button" className="admin-os-primary" onClick={() => go(destination(section))}><Plus size={16} />{page.action}</button></div></header>{session.isMock && <div className="admin-os-dev-banner"><ShieldCheck size={17} /><span>Development mode is active. Admin data uses safe local fallbacks until Supabase credentials and migrations are applied.</span></div>}{section === "dashboard" ? <Dashboard dashboard={dashboard} go={go} /> : section === "enquiries" ? <AdminEnquiriesPanel onCreateQuotation={(enquiryId) => go(`/admin/quotations/new?enquiry=${encodeURIComponent(enquiryId)}`)} /> : pathname.endsWith("/products/variants") ? <AdminVariantsPanel /> : <Module section={section} dashboard={dashboard} go={go} />}</section></main><AdminChangeConfirmationGuard /></>;
}

function Dashboard({ dashboard, go }: { dashboard: DashboardData; go: (href: string) => void }) {
  const kpis: Array<{ label: string; value: string | number; hint: string; icon: LucideIcon; href: string }> = [{ label: "New enquiries today", value: dashboard.attention[0]?.value || 0, hint: `${dashboard.enquiries} total enquiries`, icon: ClipboardList, href: "/admin/enquiries" }, { label: "New quotations today", value: 0, hint: `${dashboard.quotations} generated quotations`, icon: FileText, href: "/admin/quotations" }, { label: "Open quotations", value: dashboard.attention[1]?.value || 0, hint: "Awaiting review or follow-up", icon: HandCoins, href: "/admin/quotations" }, { label: "Follow-ups due", value: 0, hint: "Schedule from record details", icon: BellRing, href: "/admin/quotations" }, { label: "Quotes expiring soon", value: 0, hint: "Monitor quotation validity", icon: Activity, href: "/admin/quotations" }, { label: "Quoted value", value: currency(dashboard.quotedValue), hint: "All generated quotations", icon: BriefcaseBusiness, href: "/admin/quotations" }, { label: "Won value", value: currency(0), hint: "Track after outcome update", icon: ShieldCheck, href: "/admin/quotations" }, { label: "Active products", value: dashboard.products, hint: "Public catalogue records", icon: Boxes, href: "/admin/products" }];
  const quick = [{ label: "Create quotation", href: "/admin/quotations/new", icon: FileText }, { label: "Add product", href: "/admin/products/new", icon: PackagePlus }, { label: "Add customer", href: "/admin/customers/new", icon: UsersRound }, { label: "Add rate", href: "/admin/rates/new", icon: HandCoins }, { label: "Upload brochure", href: "/admin/documents?new=1", icon: BookOpen }, { label: "Add project", href: "/admin/projects/new", icon: BriefcaseBusiness }];
  const activity = [...dashboard.recentQuotations.map((item) => ({ title: `${item.quoteNumber} generated`, detail: `${item.company} · ${currency(item.total)}`, date: item.createdAt, href: "/admin/quotations" })), ...dashboard.recent.map((item) => ({ title: `New enquiry from ${item.name}`, detail: item.product || "Technical requirement", date: item.createdAt, href: "/admin/enquiries" }))].slice(0, 6);
  return <div className="admin-os-content"><section className="admin-os-welcome"><div><p>DAILY CONTROL CENTRE</p><h2>Start with what needs attention.</h2><span>Review new requirements, commercial activity and follow-ups from one place.</span></div><button type="button" onClick={() => go("/admin/enquiries")}>View new enquiries <ArrowRight size={16} /></button></section><section className="admin-os-kpis">{kpis.map((item) => { const Icon = item.icon; return <button type="button" onClick={() => go(item.href)} key={item.label}><span><Icon size={18} /></span><div><small>{item.label}</small><strong>{item.value}</strong><em>{item.hint}</em></div><ArrowRight size={15} /></button>; })}</section><div className="admin-os-grid"><section className="admin-os-card admin-os-attention"><div className="admin-os-card-heading"><div><p>PRIORITY QUEUE</p><h2>Requires attention</h2></div><span>Today</span></div>{dashboard.attention.map((item) => <button type="button" key={item.label} onClick={() => go(item.href)}><b className={item.tone}>{item.value}</b><div><strong>{item.label}</strong><small>{item.detail}</small></div><ArrowRight size={16} /></button>)}</section><section className="admin-os-card admin-os-quick"><div className="admin-os-card-heading"><div><p>QUICK ACTIONS</p><h2>Start work in one click</h2></div></div><div>{quick.map((item) => { const Icon = item.icon; return <button type="button" key={item.label} onClick={() => go(item.href)}><Icon size={17} /><span>{item.label}</span><Plus size={14} /></button>; })}</div></section></div><div className="admin-os-grid"><section className="admin-os-card admin-os-activity"><div className="admin-os-card-heading"><div><p>RECENT ACTIVITY</p><h2>Operational timeline</h2></div><button type="button" onClick={() => go("/admin/activity")}>View all <ArrowRight size={14} /></button></div>{activity.length ? <div>{activity.map((item, index) => <button type="button" key={`${item.title}-${index}`} onClick={() => go(item.href)}><time>{new Date(item.date).toLocaleDateString("en-IN")}</time><i /><div><strong>{item.title}</strong><small>{item.detail}</small></div></button>)}</div> : <Empty icon={Activity} title="No activity yet" text="New website enquiries and generated quotations appear here." />}</section><section className="admin-os-card admin-os-follow-up"><div className="admin-os-card-heading"><div><p>FOLLOW-UPS</p><h2>Keep commercial momentum</h2></div><button type="button" onClick={() => go("/admin/quotations")}>Open queue <ArrowRight size={14} /></button></div><div className="admin-os-follow-up-tabs"><span className="active">Today</span><span>Overdue</span><span>Upcoming</span></div><Empty icon={BellRing} title="No follow-ups due" text="Set a next follow-up date on a quotation or enquiry to bring it into this queue." /></section></div></div>;
}

function Module({ section, dashboard, go }: { section: AdminSection; dashboard: DashboardData; go: (href: string) => void }) {
  if (section === "account_approvals") return <AdminAccountApprovalsPanel />;
  if (section === "quotations") return <AdminQuotationsPanel />;
  if (section === "customers") return <AdminCustomersPanel />;
  if (section === "projects") return <AdminProjectsPanel />;
  if (section === "rates") return <AdminRatesPanel />;
  if (section === "products") return <AdminProductsPanel />;
  if (section === "documents") return <AdminDocumentsPanel />;
  if (section === "content") return <AdminSiteContentPanel />;
  if (section === "settings") return <AdminSettingsPanel />;
  if (section === "activity") return <AdminActivityPanel />;
  if (section === "categories") return <AdminCategoriesPanel />;
  if (section === "brands") return <AdminBrandsPanel />;
  if (section === "applications") return <AdminEditorialPanel kind="application" />;
  if (section === "industries") return <AdminEditorialPanel kind="industry" />;
  if (section === "services") return <AdminEditorialPanel kind="service" />;
  if (section === "resources") return <AdminEditorialPanel kind="resource" />;
  if (section === "media") return <AdminMediaPanel />;
  if (section === "account") return <AdminAccountPanel />;
  const facts: Record<Exclude<AdminSection, "quotations" | "customers" | "projects" | "rates" | "products" | "account_approvals">, string[]> = { dashboard: [], enquiries: ["Add notes and next follow-up", "Link each enquiry to a customer and project", "Convert qualified enquiries into quotations"], categories: ["Manage public navigation, sort order, images and SEO"], brands: ["Publish verified supplier information only"], applications: ["Connect products, industries and public use cases"], industries: ["Manage industry challenges, services and recommendations"], services: ["Manage RAC service content and publication"], documents: ["Separate public and internal files", "Archive superseded versions instead of replacing history"], media: ["Track alt text, dimensions and reuse"], content: ["Manage homepage, company and CTA content"], resources: ["Maintain guides, technical notes, FAQs and downloads"], settings: ["Control company and quotation values used by PDFs", "Keep integration secrets out of Admin settings"], activity: ["Audit commercial and publishing changes"], account: ["Only one authorised Admin can access RAC operations"] };
  const page = meta[section]; const linked = section === "enquiries" ? dashboard.enquiries : 0;
  return <div className="admin-os-content"><section className="admin-os-module-intro"><div><p>{page.eyebrow}</p><h2>{page.description}</h2></div><button type="button" className="admin-os-primary" onClick={() => go(destination(section))}>{page.action}<ArrowRight size={16} /></button></section><section className="admin-os-module-grid"><article className="admin-os-card"><p>WORKFLOW</p><h2>{page.title}</h2><ul>{facts[section].map((fact) => <li key={fact}><ShieldCheck size={15} />{fact}</li>)}</ul></article><article className="admin-os-card"><p>ADMIN STATUS</p><h2>Ready for governed data</h2><span className="admin-os-status">Single Admin access</span><p className="admin-os-card-copy">The operational data migration is included. Apply it in Supabase to activate live records, history and protected persistence.</p></article></section>{linked > 0 && <section className="admin-os-linked"><div><span>{linked}</span><div><p>CONNECTED RECORDS</p><h2>All enquiries</h2></div></div><button type="button" onClick={() => go("/admin/enquiries")}>Open <ArrowRight size={16} /></button></section>}</div>;
}

function Empty({ icon: Icon, title, text }: { icon: LucideIcon; title: string; text: string }) { return <div className="admin-os-empty"><Icon size={25} /><strong>{title}</strong><p>{text}</p></div>; }

function AdminLogin({ onSuccess }: { onSuccess: (session: AdminSession) => void }) {
  const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  const submit = async (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); const data = new FormData(event.currentTarget); setBusy(true); setError(""); try { onSuccess(await signInAdmin(String(data.get("email") || ""), String(data.get("password") || ""))); } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not sign in."); } finally { setBusy(false); } };
  return <main className="admin-login"><Link href="/" className="admin-login-brand"><img src="/assets/logo/rac-logo.png" alt="RAC Insutech" /></Link><form onSubmit={submit}><div className="modal-kicker"><span /> ADMIN ACCESS</div><h1>Welcome back.</h1><p>Sign in to operate RAC products, rates, enquiries, quotations, content and settings.</p><label>Admin email<input name="email" type="email" required placeholder="admin@racinsutech.test" /></label><label>Password<input name="password" type="password" required placeholder="Your password" /></label>{error && <p className="admin-form-error">{error}</p>}<button className="button button-gradient full-width" disabled={busy}>{busy ? "Signing in…" : "Sign in"}<ArrowRight size={18} /></button><small>Only the configured sole RAC Admin can sign in. Set local development credentials in <code>.env.local</code>; production verifies the sole Admin profile through Supabase.</small></form></main>;
}
