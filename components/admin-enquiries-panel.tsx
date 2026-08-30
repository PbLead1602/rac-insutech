"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ArrowRight, CalendarClock, ClipboardList, FileText, MapPin, MessageSquarePlus, Phone, Search, X } from "lucide-react";
import { adminFetch } from "@/lib/auth/admin-client";
import type { EnquiryNote, EnquiryRecord, EnquiryStatus } from "@/lib/db/types";

const statuses: Array<{ value: EnquiryStatus; label: string }> = [
  { value: "new", label: "New" }, { value: "contacted", label: "Contacted" }, { value: "requirement_received", label: "Requirement received" }, { value: "quotation_required", label: "Quotation required" }, { value: "quotation_sent", label: "Quotation sent" }, { value: "follow_up", label: "Follow-up" }, { value: "converted", label: "Converted" }, { value: "not_relevant", label: "Not relevant" }, { value: "closed", label: "Closed" }, { value: "lost", label: "Lost" },
];
type EnquiryDetail = { enquiry: EnquiryRecord; notes: EnquiryNote[] };
const statusLabel = (status: string) => statuses.find((item) => item.value === status)?.label || status.replaceAll("_", " ");
const localDateTime = (value?: string) => value ? new Date(value).toISOString().slice(0, 16) : "";

export default function AdminEnquiriesPanel({ onCreateQuotation }: { onCreateQuotation: (enquiryId: string) => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const [records, setRecords] = useState<EnquiryRecord[]>([]);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [selected, setSelected] = useState<EnquiryDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [compose, setCompose] = useState(() => pathname.endsWith("/new"));

  const load = useCallback(async () => {
    const response = await adminFetch("/api/admin/enquiries");
    const data = await response.json() as { enquiries?: EnquiryRecord[]; message?: string };
    setRecords(data.enquiries || []);
    if (!response.ok) setMessage(data.message || "Could not load enquiries.");
    setLoading(false);
  }, []);
  useEffect(() => { const timer = window.setTimeout(() => { void load(); }, 0); return () => window.clearTimeout(timer); }, [load]);
  useEffect(() => {
    if (!pathname.endsWith("/new")) return;
    const timer = window.setTimeout(() => setCompose(true), 0);
    return () => window.clearTimeout(timer);
  }, [pathname]);
  const closeCompose = () => { setCompose(false); if (pathname.endsWith("/new")) router.replace("/admin/enquiries"); };
  const filtered = useMemo(() => records.filter((record) => (status === "all" || record.status === status) && [record.name, record.company, record.mobile, record.email, record.product, record.application, record.city].join(" ").toLowerCase().includes(query.toLowerCase())), [records, query, status]);

  const open = async (id: string) => {
    const response = await adminFetch(`/api/admin/enquiries/${id}`);
    const data = await response.json() as { enquiry?: EnquiryRecord; notes?: EnquiryNote[]; message?: string };
    if (!response.ok || !data.enquiry) { setMessage(data.message || "Could not open this enquiry."); return; }
    setSelected({ enquiry: data.enquiry, notes: data.notes || [] });
  };
  const applyUpdate = async (patch: Record<string, string>) => {
    if (!selected) return;
    const response = await adminFetch(`/api/admin/enquiries/${selected.enquiry.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(patch) });
    const data = await response.json() as { enquiry?: EnquiryRecord; message?: string };
    if (!response.ok || !data.enquiry) { setMessage(data.message || "Could not update the enquiry."); return; }
    setSelected((current) => current ? { ...current, enquiry: data.enquiry! } : current);
    setRecords((current) => current.map((item) => item.id === data.enquiry!.id ? data.enquiry! : item));
    setMessage("Enquiry updated.");
  };
  const addNote = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); if (!selected) return;
    const note = String(new FormData(event.currentTarget).get("note") || "").trim(); if (!note) return;
    const response = await adminFetch(`/api/admin/enquiries/${selected.enquiry.id}/notes`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ note }) });
    const data = await response.json() as { note?: EnquiryNote; message?: string };
    if (!response.ok || !data.note) { setMessage(data.message || "Could not save the note."); return; }
    setSelected((current) => current ? { ...current, notes: [data.note!, ...current.notes] } : current);
    event.currentTarget.reset(); setMessage("Internal note added.");
  };
  const create = async (draft: Record<string, string>) => {
    const response = await adminFetch("/api/admin/enquiries", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(draft) });
    const data = await response.json() as { enquiry?: EnquiryRecord; message?: string };
    if (!response.ok || !data.enquiry) { setMessage(data.message || "Could not create the enquiry."); return false; }
    setRecords((current) => [data.enquiry!, ...current]); setSelected({ enquiry: data.enquiry, notes: [] }); setMessage("Enquiry created and ready for review."); closeCompose(); return true;
  };

  return <div className="admin-records">
    <section className="admin-records-toolbar"><div className="admin-records-search"><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search name, company, phone, email or product" /></div><select value={status} onChange={(event) => setStatus(event.target.value)}><option value="all">All statuses</option>{statuses.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select><button type="button" className="admin-os-primary" onClick={() => setCompose(true)}><MessageSquarePlus size={15} />Add enquiry</button><button type="button" onClick={() => { setLoading(true); void load(); }}>Refresh</button></section>
    {message && <p className="admin-records-message" role="status">{message}</p>}
    <div className="admin-records-table-wrap"><div className="admin-records-table admin-enquiries-table"><div className="admin-records-heading"><span>Date</span><span>Customer</span><span>Contact</span><span>Product / application</span><span>Location</span><span>Status</span><span>Follow-up</span><span /></div>{loading ? <div className="admin-records-empty">Loading enquiries...</div> : filtered.length ? filtered.map((record) => <button type="button" className="admin-records-row" key={record.id} onClick={() => void open(record.id)}><span>{new Date(record.createdAt).toLocaleDateString("en-IN")}</span><span><strong>{record.name}</strong><small>{record.company || "Company not provided"}</small></span><span><strong>{record.mobile}</strong><small>{record.email || "No email"}</small></span><span><strong>{record.product || "General enquiry"}</strong><small>{record.application || "Application to be confirmed"}</small></span><span>{record.city || record.projectLocation || "Not provided"}</span><span><em className={`admin-status ${record.status}`}>{statusLabel(record.status)}</em></span><span>{record.followUpAt ? new Date(record.followUpAt).toLocaleDateString("en-IN") : "-"}</span><ArrowRight size={16} /></button>) : <div className="admin-records-empty"><ClipboardList size={25} /><strong>No matching enquiries</strong><p>New website requirements will appear here.</p></div>}</div></div>
    {compose && <EnquiryForm onClose={closeCompose} onSubmit={create} />}
    {selected && <EnquiryDrawer detail={selected} onClose={() => setSelected(null)} onUpdate={applyUpdate} onAddNote={addNote} onCreateQuotation={onCreateQuotation} />}
  </div>;
}

function EnquiryForm({ onClose, onSubmit }: { onClose: () => void; onSubmit: (draft: Record<string, string>) => Promise<boolean> }) {
  const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  const submit = async (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); const form = new FormData(event.currentTarget); const draft = Object.fromEntries(["name", "company", "mobile", "email", "city", "state", "pinCode", "projectName", "projectLocation", "product", "brand", "quantity", "thickness", "application", "customerType", "deliveryPreference", "message"].map((field) => [field, String(form.get(field) || "")])); setBusy(true); setError(""); const saved = await onSubmit(draft); if (!saved) setError("Check the customer contact details and try again."); setBusy(false); };
  return <div className="admin-drawer-backdrop" role="presentation" onMouseDown={onClose}><aside className="admin-enquiry-drawer admin-customer-form" role="dialog" aria-modal="true" aria-label="Add enquiry" onMouseDown={(event) => event.stopPropagation()}><header><div><p>ENQUIRY MANAGEMENT</p><h2>Add enquiry</h2><span>Record an offline or phone enquiry and route it into the quotation workflow.</span></div><button type="button" onClick={onClose} aria-label="Close add enquiry"><X size={18} /></button></header><form className="admin-drawer-body admin-customer-fields" onSubmit={submit}><div className="admin-customer-fields-grid"><label>Full name<input name="name" required autoFocus /></label><label>Company<input name="company" /></label><label>Mobile number<input name="mobile" required inputMode="tel" /></label><label>Email<input name="email" type="email" /></label><label>City<input name="city" /></label><label>State<input name="state" /></label><label>PIN code<input name="pinCode" /></label><label>Customer type<select name="customerType" defaultValue="end_user"><option value="end_user">End user</option><option value="contractor">Contractor</option><option value="consultant">Consultant</option><option value="dealer">Dealer</option><option value="other">Other</option></select></label><label>Project name<input name="projectName" /></label><label>Project location<input name="projectLocation" /></label><label>Product / material<input name="product" /></label><label>Application<input name="application" /></label><label>Brand (if specified)<input name="brand" /></label><label>Quantity<input name="quantity" /></label><label>Thickness / size<input name="thickness" /></label><label>Delivery preference<input name="deliveryPreference" /></label></div><label>Requirement<textarea name="message" placeholder="Project details, specification, timeline or other useful information." /></label>{error && <p className="admin-form-error">{error}</p>}<div className="admin-customer-form-actions"><button type="button" className="admin-drawer-secondary" onClick={onClose}>Cancel</button><button className="admin-os-primary" disabled={busy}>{busy ? "Saving..." : "Create enquiry"}<ArrowRight size={15} /></button></div></form></aside></div>;
}

function EnquiryDrawer({ detail, onClose, onUpdate, onAddNote, onCreateQuotation }: { detail: EnquiryDetail; onClose: () => void; onUpdate: (patch: Record<string, string>) => void; onAddNote: (event: FormEvent<HTMLFormElement>) => void; onCreateQuotation: (id: string) => void }) {
  const { enquiry, notes } = detail;
  return <div className="admin-drawer-backdrop" role="presentation" onMouseDown={onClose}><aside className="admin-enquiry-drawer" role="dialog" aria-modal="true" aria-label={`Enquiry from ${enquiry.name}`} onMouseDown={(event) => event.stopPropagation()}><header><div><p>ENQUIRY MANAGEMENT</p><h2>{enquiry.name}</h2><span>{enquiry.company || "Company not provided"}</span></div><button type="button" onClick={onClose} aria-label="Close enquiry"><X size={18} /></button></header><div className="admin-drawer-body"><section className="admin-drawer-summary"><a href={`tel:${enquiry.mobile}`}><Phone size={15} />{enquiry.mobile}</a>{enquiry.email && <a href={`mailto:${enquiry.email}`}>{enquiry.email}</a>}<span><MapPin size={15} />{[enquiry.projectLocation, enquiry.city].filter(Boolean).join(", ") || "Location not provided"}</span></section><section><h3>Requirement</h3><dl><div><dt>Product</dt><dd>{enquiry.product || "To be confirmed"}</dd></div><div><dt>Application</dt><dd>{enquiry.application || "To be confirmed"}</dd></div><div><dt>Quantity / thickness</dt><dd>{[enquiry.quantity, enquiry.thickness].filter(Boolean).join(" | ") || "Not provided"}</dd></div></dl>{enquiry.message && <p className="admin-drawer-message">{enquiry.message}</p>}</section><section className="admin-drawer-controls"><h3>Admin review</h3><label>Status<select value={enquiry.status} onChange={(event) => onUpdate({ status: event.target.value })}>{statuses.map((item) => <option value={item.value} key={item.value}>{item.label}</option>)}</select></label><label><CalendarClock size={15} />Next follow-up<input type="datetime-local" value={localDateTime(enquiry.followUpAt)} onChange={(event) => onUpdate({ followUpAt: event.target.value ? new Date(event.target.value).toISOString() : "" })} /></label><label>Follow-up note<textarea defaultValue={enquiry.followUpNote} placeholder="What should happen next?" onBlur={(event) => { if (event.target.value !== (enquiry.followUpNote || "")) onUpdate({ followUpNote: event.target.value }); }} /></label></section><section className="admin-drawer-notes"><div><h3>Internal notes</h3><span>{notes.length}</span></div><form onSubmit={onAddNote}><textarea name="note" required placeholder="Add an internal note for the Admin timeline" /><button type="submit"><MessageSquarePlus size={15} />Add note</button></form>{notes.length ? <ol>{notes.map((note) => <li key={note.id}><time>{new Date(note.createdAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</time><p>{note.note}</p></li>)}</ol> : <p className="admin-drawer-muted">No internal notes yet.</p>}</section></div><footer><button type="button" className="admin-drawer-secondary" onClick={onClose}>Close</button><button type="button" className="admin-os-primary" onClick={() => onCreateQuotation(enquiry.id)}><FileText size={16} />Create quotation</button></footer></aside></div>;
}
