"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, FileText, Plus } from "lucide-react";
import { adminFetch } from "@/lib/auth/admin-client";
import type { EnquiryRecord, QuotationRecord } from "@/lib/db/types";

type DraftLine = {
  productName: string;
  configuration: string;
  suppliedQuantity: number;
  suppliedUnit: string;
  rate: number;
  rateUnit: string;
};

const blankLine = (): DraftLine => ({ productName: "", configuration: "", suppliedQuantity: 1, suppliedUnit: "unit", rate: 0, rateUnit: "per unit" });

export default function AdminQuotationCreatePanel() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [lines, setLines] = useState<DraftLine[]>([blankLine()]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [gstRate, setGstRate] = useState(18);
  const enquiryId = searchParams.get("enquiry");
  const [enquiry, setEnquiry] = useState<EnquiryRecord | null>(null);
  useEffect(() => {
    if (!enquiryId) return;
    const controller = new AbortController();
    const load = async () => {
      const response = await adminFetch(`/api/admin/enquiries/${enquiryId}`, { signal: controller.signal });
      const data = await response.json() as { enquiry?: EnquiryRecord; message?: string };
      if (!response.ok || !data.enquiry) { setError(data.message || "Could not load the source enquiry."); return; }
      const sourceEnquiry = data.enquiry;
      setEnquiry(sourceEnquiry);
      setLines((current) => current.length === 1 && !current[0].productName ? [{ ...current[0], productName: sourceEnquiry.product || "", configuration: [sourceEnquiry.thickness, sourceEnquiry.application].filter(Boolean).join(" · ") }] : current);
    };
    void load();
    return () => controller.abort();
  }, [enquiryId]);
  const subtotal = lines.reduce((total, line) => total + Number(line.suppliedQuantity || 0) * Number(line.rate || 0), 0);
  const gstAmount = subtotal * (gstRate / 100);

  const updateLine = (index: number, patch: Partial<DraftLine>) => setLines((current) => current.map((line, lineIndex) => lineIndex === index ? { ...line, ...patch } : line));
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const customer = Object.fromEntries(["fullName", "company", "mobile", "email", "gstin", "projectName", "projectLocation", "city", "pinCode", "customerType", "deliveryPreference", "notes"].map((field) => [field, String(form.get(field) || "")]));
    const payload = {
      customer,
      items: lines.map((line, index) => ({ variantId: `admin-manual-${Date.now()}-${index + 1}`, productName: line.productName, configuration: line.configuration, requestedQuantity: line.suppliedQuantity, requestedUnit: line.suppliedUnit, suppliedQuantity: line.suppliedQuantity, suppliedUnit: line.suppliedUnit, technicalQuantity: `${line.suppliedQuantity} ${line.suppliedUnit}`, rate: line.rate, rateUnit: line.rateUnit })),
      gstRate,
      enquiryId: enquiryId || undefined,
      validUntil: String(form.get("validUntil") || ""),
      internalNotes: String(form.get("internalNotes") || ""),
    };
    setBusy(true); setError("");
    const response = await adminFetch("/api/admin/quotations", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    const data = await response.json() as { quotation?: QuotationRecord; message?: string };
    setBusy(false);
    if (!response.ok || !data.quotation) { setError(data.message || "Could not create the quotation."); return; }
    setMessage(`${data.quotation.quoteNumber} created as a draft quotation.`);
    window.setTimeout(() => router.push("/admin/quotations"), 600);
  };

  const prefilledCustomer = enquiry ? { fullName: enquiry.name, company: enquiry.company, mobile: enquiry.mobile, email: enquiry.email, gstin: "", projectName: enquiry.projectName, projectLocation: enquiry.projectLocation, city: enquiry.city, pinCode: enquiry.pinCode, customerType: enquiry.customerType || "end_user", deliveryPreference: enquiry.deliveryPreference } : null;
  return <div className="admin-os-content">
    <section className="admin-os-module-intro"><div><p>MANUAL QUOTATION</p><h2>Create an editable commercial draft.</h2><span>Rates and quantities are saved as the quotation snapshot when you create the draft.</span></div><button type="button" onClick={() => router.push("/admin/quotations")}>Back to quotations</button></section>
    {enquiryId && <p className="admin-records-message">Creating a quotation from enquiry {enquiryId.slice(0, 8)}. Confirm the prefilled customer and project information before saving.</p>}
    <form className="admin-customer-fields admin-os-card" onSubmit={submit} key={enquiry?.id || "manual-quotation"}>
      <div className="admin-customer-fields-grid"><label>Full name<input name="fullName" required autoFocus defaultValue={prefilledCustomer?.fullName} /></label><label>Company<input name="company" required defaultValue={prefilledCustomer?.company} /></label><label>Mobile number<input name="mobile" required inputMode="tel" defaultValue={prefilledCustomer?.mobile} /></label><label>Email<input name="email" type="email" required defaultValue={prefilledCustomer?.email} /></label><label>GSTIN<input name="gstin" defaultValue={prefilledCustomer?.gstin} /></label><label>Project name<input name="projectName" defaultValue={prefilledCustomer?.projectName} /></label><label>Project location<input name="projectLocation" defaultValue={prefilledCustomer?.projectLocation} /></label><label>City<input name="city" defaultValue={prefilledCustomer?.city} /></label><label>PIN code<input name="pinCode" defaultValue={prefilledCustomer?.pinCode} /></label><label>Customer type<select name="customerType" defaultValue={prefilledCustomer?.customerType || "end_user"}><option value="end_user">End user</option><option value="contractor">Contractor</option><option value="consultant">Consultant</option><option value="dealer">Dealer</option><option value="other">Other</option></select></label><label>Delivery preference<input name="deliveryPreference" defaultValue={prefilledCustomer?.deliveryPreference} /></label><label>Valid until<input name="validUntil" type="date" /></label></div>
      <section className="admin-revision-lines"><div className="admin-drawer-section-heading"><div><h3>Commercial lines</h3><span>Use the approved Rate Card value whenever a configuration is available.</span></div><button type="button" className="admin-drawer-secondary" onClick={() => setLines((current) => [...current, blankLine()])}><Plus size={15} />Add line</button></div>{lines.map((line, index) => <div className="admin-revision-line" key={index}><div><b>{index + 1}</b><label>Product<input required value={line.productName} onChange={(event) => updateLine(index, { productName: event.target.value })} placeholder="Product name" /></label><label>Configuration<input required value={line.configuration} onChange={(event) => updateLine(index, { configuration: event.target.value })} placeholder="Class, size, lamination or other specification" /></label>{lines.length > 1 && <button type="button" onClick={() => setLines((current) => current.filter((_, lineIndex) => lineIndex !== index))}>Remove</button>}</div><div className="admin-revision-line-grid"><label>Supply quantity<input required type="number" min="0.001" step="0.001" value={line.suppliedQuantity} onChange={(event) => updateLine(index, { suppliedQuantity: Number(event.target.value) })} /></label><label>Supply unit<input required value={line.suppliedUnit} onChange={(event) => updateLine(index, { suppliedUnit: event.target.value })} /></label><label>Rate<input required type="number" min="0" step="0.00001" value={line.rate} onChange={(event) => updateLine(index, { rate: Number(event.target.value) })} /></label><label>Rate unit<input required value={line.rateUnit} onChange={(event) => updateLine(index, { rateUnit: event.target.value })} /></label><strong>INR {(line.suppliedQuantity * line.rate).toLocaleString("en-IN", { maximumFractionDigits: 2 })}</strong></div></div>)}</section>
      <div className="admin-customer-fields-grid"><label>GST rate (%)<input type="number" min="0" max="100" step="0.01" value={gstRate} onChange={(event) => setGstRate(Number(event.target.value))} /></label><label>Internal notes<textarea name="internalNotes" placeholder="Optional private commercial note" /></label></div>
      <div className="admin-revision-total"><span>Subtotal <b>INR {subtotal.toLocaleString("en-IN", { maximumFractionDigits: 2 })}</b></span><span>GST <b>INR {gstAmount.toLocaleString("en-IN", { maximumFractionDigits: 2 })}</b></span><strong>Draft total <b>INR {(subtotal + gstAmount).toLocaleString("en-IN", { maximumFractionDigits: 2 })}</b></strong></div>
      {error && <p className="admin-form-error">{error}</p>}{message && <p className="admin-records-message">{message}</p>}<div className="admin-customer-form-actions"><button type="button" className="admin-drawer-secondary" onClick={() => router.push("/admin/quotations")}>Cancel</button><button className="admin-os-primary" disabled={busy}>{busy ? "Creating..." : "Create quotation"}<ArrowRight size={16} /></button></div>
    </form>
  </div>;
}
