"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { ArrowRight, BriefcaseBusiness, Building2, ChevronDown, ClipboardList, Edit3, FileText, Mail, MapPin, MessageSquarePlus, Phone, RefreshCw, Search, UsersRound, X, type LucideIcon } from "lucide-react";
import { adminFetch } from "@/lib/auth/admin-client";
import { IndiaLocationFields } from "@/components/india-location-fields";
import type { CustomerNote, CustomerRecord, CustomerStatus, CustomerType, EnquiryRecord, ProjectRecord, QuotationRecord } from "@/lib/db/types";

const customerTypes: Array<{ value: CustomerType; label: string }> = [
  { value: "hvac_contractor", label: "HVAC contractor" }, { value: "consultant", label: "Consultant" }, { value: "peb_contractor", label: "PEB contractor" }, { value: "architect", label: "Architect" }, { value: "dealer", label: "Dealer" }, { value: "end_user", label: "End user" }, { value: "industrial_customer", label: "Industrial customer" }, { value: "other", label: "Other" },
];
const statuses: CustomerStatus[] = ["active", "inactive", "archived"];
type CustomerDetail = { customer: CustomerRecord; notes: CustomerNote[]; linked: { enquiries: EnquiryRecord[]; quotations: QuotationRecord[]; projects: ProjectRecord[] } };
type CustomerDraft = Omit<CustomerRecord, "id" | "createdAt">;
const typeLabel = (value: CustomerType) => customerTypes.find((item) => item.value === value)?.label || value;
const readableStatus = (value: string) => value.replaceAll("_", " ");

export default function AdminCustomersPanel() {
  const [records, setRecords] = useState<CustomerRecord[]>([]);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [selected, setSelected] = useState<CustomerDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const response = await adminFetch("/api/admin/customers", { cache: "no-store" });
      const data = await response.json() as { customers?: CustomerRecord[]; message?: string };
      if (!response.ok) throw new Error(data.message || "Could not load customers.");
      setRecords(data.customers || []);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not load customers.");
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => { const timer = window.setTimeout(() => { void load(); }, 0); return () => window.clearTimeout(timer); }, [load]);
  useEffect(() => {
    const refreshWhenVisible = () => { if (document.visibilityState === "visible") void load(true); };
    const timer = window.setInterval(refreshWhenVisible, 20_000);
    document.addEventListener("visibilitychange", refreshWhenVisible);
    return () => { window.clearInterval(timer); document.removeEventListener("visibilitychange", refreshWhenVisible); };
  }, [load]);

  const filtered = useMemo(() => records.filter((record) => (
    (status === "all" || record.status === status)
    && [record.fullName, record.company, record.phone, record.email, record.gstin, record.city].join(" ").toLowerCase().includes(query.toLowerCase())
  )), [records, query, status]);

  const open = async (id: string) => {
    setMessage("");
    try {
      const response = await adminFetch(`/api/admin/customers/${id}`, { cache: "no-store" });
      const data = await response.json() as { customer?: CustomerRecord; notes?: CustomerNote[]; linked?: CustomerDetail["linked"]; message?: string };
      if (!response.ok || !data.customer || !data.linked) throw new Error(data.message || "Could not open this customer.");
      setSelected({ customer: data.customer, notes: data.notes || [], linked: data.linked });
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not open this customer.");
    }
  };

  const update = async (patch: Partial<CustomerDraft>) => {
    if (!selected) return false;
    const response = await adminFetch(`/api/admin/customers/${selected.customer.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(patch) });
    const data = await response.json() as { customer?: CustomerRecord; message?: string };
    if (!response.ok || !data.customer) { setMessage(data.message || "Could not update the customer."); return false; }
    setSelected((current) => current ? { ...current, customer: data.customer! } : current);
    setRecords((current) => current.map((item) => item.id === data.customer!.id ? data.customer! : item));
    setMessage("Customer updated.");
    return true;
  };

  const addNote = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selected) return;
    const note = String(new FormData(event.currentTarget).get("note") || "").trim();
    if (!note) return;
    const response = await adminFetch(`/api/admin/customers/${selected.customer.id}/notes`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ note }) });
    const data = await response.json() as { note?: CustomerNote; message?: string };
    if (!response.ok || !data.note) { setMessage(data.message || "Could not add the note."); return; }
    setSelected((current) => current ? { ...current, notes: [data.note!, ...current.notes] } : current);
    event.currentTarget.reset();
    setMessage("Internal note added.");
  };

  return <div className="admin-records">
    <section className="admin-records-toolbar">
      <div className="admin-records-search"><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search customer, company, phone, email or GSTIN" /></div>
      <select value={status} onChange={(event) => setStatus(event.target.value)}><option value="all">All statuses</option>{statuses.map((item) => <option key={item} value={item}>{item}</option>)}</select>
      <button type="button" onClick={() => void load()}><RefreshCw size={14} />Refresh</button>
    </section>
    {message && <p className="admin-records-message" role="status">{message}</p>}
    <div className="admin-records-table-wrap"><div className="admin-records-table admin-customers-table">
      <div className="admin-records-heading"><span>Created</span><span>Customer / company</span><span>Contact</span><span>Type</span><span>GSTIN</span><span>Status</span><span>Location</span><span /></div>
      {loading ? <div className="admin-records-empty">Loading customers...</div> : filtered.length ? filtered.map((record) => <button type="button" className="admin-records-row" key={record.id} onClick={() => void open(record.id)}><span>{new Date(record.createdAt).toLocaleDateString("en-IN")}</span><span><strong>{record.fullName}</strong><small>{record.company || "Company not provided"}</small></span><span><strong>{record.phone || "No phone"}</strong><small>{record.email || "No email"}</small></span><span>{typeLabel(record.customerType)}</span><span>{record.gstin || "-"}</span><span><em className={`admin-status ${record.status}`}>{record.status}</em></span><span>{[record.city, record.state].filter(Boolean).join(", ") || "-"}</span><ArrowRight size={16} /></button>) : <div className="admin-records-empty"><UsersRound size={25} /><strong>No matching customers</strong><p>Approved registered accounts appear here after review.</p></div>}
    </div></div>
    {selected && <CustomerDrawer detail={selected} onClose={() => setSelected(null)} onUpdate={update} onAddNote={addNote} />}
  </div>;
}

function CustomerForm({ initial, onClose, onSubmit }: { initial: CustomerRecord; onClose: () => void; onSubmit: (draft: CustomerDraft) => Promise<boolean> }) {
  const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); const form = new FormData(event.currentTarget);
    const draft: CustomerDraft = { fullName: String(form.get("fullName") || ""), company: String(form.get("company") || ""), phone: String(form.get("phone") || ""), email: String(form.get("email") || ""), gstin: String(form.get("gstin") || ""), billingAddress: String(form.get("billingAddress") || ""), shippingAddress: String(form.get("shippingAddress") || ""), city: String(form.get("city") || ""), district: String(form.get("district") || ""), state: String(form.get("state") || ""), pinCode: String(form.get("pinCode") || ""), customerType: String(form.get("customerType") || "other") as CustomerType, notes: String(form.get("notes") || ""), status: String(form.get("status") || "active") as CustomerStatus };
    setBusy(true); setError(""); const saved = await onSubmit(draft); if (!saved) setError("Check the customer details. A matching phone, email or GSTIN may already exist."); setBusy(false);
  };
  return <div className="admin-drawer-backdrop" role="presentation" onMouseDown={onClose}><aside className="admin-enquiry-drawer admin-customer-form" role="dialog" aria-modal="true" aria-label="Edit customer" onMouseDown={(event) => event.stopPropagation()}><header><div><p>CUSTOMER MASTER</p><h2>Edit customer</h2><span>Review the changed values before confirming this update.</span></div><button type="button" onClick={onClose} aria-label="Close customer form"><X size={18} /></button></header><form className="admin-drawer-body admin-customer-fields" onSubmit={submit}><div className="admin-customer-fields-grid"><label>Contact name<input name="fullName" required defaultValue={initial.fullName} /></label><label>Company<input name="company" defaultValue={initial.company} /></label><label>Phone<input name="phone" defaultValue={initial.phone} /></label><label>Email<input name="email" type="email" defaultValue={initial.email} /></label><label>GSTIN<input name="gstin" defaultValue={initial.gstin} /></label><label>Customer type<select name="customerType" defaultValue={initial.customerType}>{customerTypes.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label><IndiaLocationFields defaultValue={{ state: initial.state, district: initial.district, city: initial.city, pinCode: initial.pinCode }} /><label>Status<select name="status" defaultValue={initial.status}>{statuses.map((item) => <option key={item} value={item}>{item}</option>)}</select></label></div><label>Billing address<textarea name="billingAddress" defaultValue={initial.billingAddress} /></label><label>Shipping address<textarea name="shippingAddress" defaultValue={initial.shippingAddress} /></label><label>Internal customer notes<textarea name="notes" defaultValue={initial.notes} /></label>{error && <p className="admin-form-error">{error}</p>}<div className="admin-customer-form-actions"><button type="button" className="admin-drawer-secondary" onClick={onClose}>Cancel</button><button className="admin-os-primary" disabled={busy}>{busy ? "Saving..." : "Review and save"}<ArrowRight size={15} /></button></div></form></aside></div>;
}

function CustomerDrawer({ detail, onClose, onUpdate, onAddNote }: { detail: CustomerDetail; onClose: () => void; onUpdate: (patch: Partial<CustomerDraft>) => Promise<boolean>; onAddNote: (event: FormEvent<HTMLFormElement>) => void }) {
  const [editing, setEditing] = useState(false); const { customer, notes, linked } = detail;
  return <div className="admin-drawer-backdrop" role="presentation" onMouseDown={onClose}><aside className="admin-enquiry-drawer admin-customer-drawer" role="dialog" aria-modal="true" aria-label={customer.fullName} onMouseDown={(event) => event.stopPropagation()}><header><div><p>CUSTOMER RECORD & ANALYSIS</p><h2>{customer.fullName}</h2><span>{customer.company || "Company not provided"}</span></div><button type="button" onClick={onClose} aria-label="Close customer"><X size={18} /></button></header><div className="admin-drawer-body"><section className="admin-drawer-summary">{customer.phone && <a href={`tel:${customer.phone}`}><Phone size={15} />{customer.phone}</a>}{customer.email && <a href={`mailto:${customer.email}`}><Mail size={15} />{customer.email}</a>}<span><MapPin size={15} />{[customer.city, customer.state, customer.pinCode].filter(Boolean).join(", ") || "Location not provided"}</span></section><section className="admin-customer-linked"><div><strong>{linked.enquiries.length}</strong><span>Enquiries</span></div><div><strong>{linked.projects.length}</strong><span>Projects</span></div><div><strong>{linked.quotations.length}</strong><span>Quotations</span></div></section><section><h3>Customer information</h3><dl><div><dt>Type</dt><dd>{typeLabel(customer.customerType)}</dd></div><div><dt>GSTIN</dt><dd>{customer.gstin || "Not provided"}</dd></div><div><dt>Status</dt><dd><em className={`admin-status ${customer.status}`}>{customer.status}</em></dd></div></dl>{customer.notes && <p className="admin-drawer-message">{customer.notes}</p>}</section><CustomerHistory linked={linked} /><section className="admin-drawer-controls"><h3>Record control</h3><label>Status<select value={customer.status} onChange={(event) => void onUpdate({ status: event.target.value as CustomerStatus })}>{statuses.map((item) => <option key={item} value={item}>{item}</option>)}</select></label><button type="button" className="admin-customer-edit" onClick={() => setEditing(true)}><Edit3 size={15} />Edit customer details</button></section><section className="admin-drawer-notes"><div><h3>Internal notes</h3><span>{notes.length}</span></div><form onSubmit={onAddNote}><textarea name="note" required placeholder="Add an internal note for this customer" /><button type="submit"><MessageSquarePlus size={15} />Add note</button></form>{notes.length ? <ol>{notes.map((note) => <li key={note.id}><time>{new Date(note.createdAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</time><p>{note.note}</p></li>)}</ol> : <p className="admin-drawer-muted">No internal notes yet.</p>}</section></div><footer><button type="button" className="admin-drawer-secondary" onClick={onClose}>Close</button><button type="button" className="admin-drawer-secondary" onClick={() => setEditing(true)}><Building2 size={16} />Manage record</button><Link className="admin-os-primary admin-create-quotation-link" href={`/admin/quotations/new?customer=${encodeURIComponent(customer.id)}`}><FileText size={16} />Create quotation</Link></footer>{editing && <CustomerForm initial={customer} onClose={() => setEditing(false)} onSubmit={async (draft) => { const updated = await onUpdate(draft); if (updated) setEditing(false); return updated; }} />}</aside></div>;
}

function CustomerHistory({ linked }: { linked: CustomerDetail["linked"] }) {
  return <section className="admin-customer-history"><div><h3>Complete customer history</h3><span>All linked records</span></div><HistoryGroup icon={ClipboardList} title="Enquiries" count={linked.enquiries.length}>{linked.enquiries.length ? linked.enquiries.map((enquiry) => <details key={enquiry.id}><summary><span><strong>{enquiry.enquiryNumber}</strong><small>{enquiry.product || "General enquiry"} · {new Date(enquiry.createdAt).toLocaleDateString("en-IN")}</small></span><em className={`admin-status ${enquiry.status}`}>{readableStatus(enquiry.status)}</em><ChevronDown size={15} /></summary><dl><div><dt>Application</dt><dd>{enquiry.application || "Not supplied"}</dd></div><div><dt>Quantity / thickness</dt><dd>{[enquiry.quantity, enquiry.thickness].filter(Boolean).join(" · ") || "Not supplied"}</dd></div><div><dt>Project</dt><dd>{[enquiry.projectName, enquiry.projectLocation, enquiry.city].filter(Boolean).join(" · ") || "Not supplied"}</dd></div><div><dt>Delivery preference</dt><dd>{enquiry.deliveryPreference || "Not supplied"}</dd></div><div><dt>Requirement</dt><dd>{enquiry.message || "No additional requirement"}</dd></div>{enquiry.attachment && <div><dt>Attachment</dt><dd>{enquiry.attachment.name}</dd></div>}</dl></details>) : <p>No linked enquiries yet.</p>}</HistoryGroup><HistoryGroup icon={FileText} title="Quotations" count={linked.quotations.length}>{linked.quotations.length ? linked.quotations.map((quotation) => <details key={quotation.id}><summary><span><strong>{quotation.quoteNumber}</strong><small>{new Date(quotation.createdAt).toLocaleDateString("en-IN")} · ₹{quotation.total.toLocaleString("en-IN")}</small></span><em className={`admin-status ${quotation.status}`}>{readableStatus(quotation.status)}</em><ChevronDown size={15} /></summary><dl><div><dt>Project</dt><dd>{quotation.customer.projectName || quotation.customer.projectLocation || "Not supplied"}</dd></div><div><dt>Validity</dt><dd>{quotation.validUntil ? new Date(quotation.validUntil).toLocaleDateString("en-IN") : "Not supplied"}</dd></div><div><dt>Products</dt><dd>{quotation.items.map((item) => `${item.productName} (${item.requestedQuantity} ${item.requestedUnit})`).join(", ") || "No line items"}</dd></div><div><dt>Notes</dt><dd>{quotation.customer.notes || quotation.internalNotes || "No notes"}</dd></div></dl></details>) : <p>No linked quotations yet.</p>}</HistoryGroup><HistoryGroup icon={BriefcaseBusiness} title="Projects" count={linked.projects.length}>{linked.projects.length ? linked.projects.map((project) => <details key={project.id}><summary><span><strong>{project.title}</strong><small>{project.location || "Location not supplied"} · {new Date(project.createdAt).toLocaleDateString("en-IN")}</small></span><em className={`admin-status ${project.projectStatus}`}>{readableStatus(project.projectStatus)}</em><ChevronDown size={15} /></summary><dl><div><dt>Requirement</dt><dd>{project.requirement || "Not supplied"}</dd></div><div><dt>Solution</dt><dd>{project.solution || "Not supplied"}</dd></div><div><dt>Scope / notes</dt><dd>{project.scope || project.internalNotes || "Not supplied"}</dd></div><div><dt>Expected delivery</dt><dd>{project.expectedDeliveryDate ? new Date(project.expectedDeliveryDate).toLocaleDateString("en-IN") : "Not supplied"}</dd></div></dl></details>) : <p>No linked projects yet.</p>}</HistoryGroup></section>;
}

function HistoryGroup({ icon: Icon, title, count, children }: { icon: LucideIcon; title: string; count: number; children: ReactNode }) {
  return <div className="admin-customer-history-group"><h4><Icon size={15} />{title}<span>{count}</span></h4>{children}</div>;
}
