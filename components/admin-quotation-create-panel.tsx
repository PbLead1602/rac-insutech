"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, Plus, Trash2 } from "lucide-react";
import { adminFetch } from "@/lib/auth/admin-client";
import type { EnquiryRecord, QuotationRecord } from "@/lib/db/types";
import { calculateQuoteLine, findQuoteVariant, getQuotationVariant, quotationProducts, quoteOptions, type CalculatedQuoteLine, type QuoteOrderUnit, type QuoteProductId } from "@/lib/quotations/catalogue";

type BatchSelection = { productId: QuoteProductId; materialClass: string; thicknesses: string[]; sizes: string[]; lamination: string };
type SelectedLine = CalculatedQuoteLine & { id: string };

const currency = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", minimumFractionDigits: 2, maximumFractionDigits: 2 });

function initialBatchSelection(productId: QuoteProductId): BatchSelection {
  return { productId, materialClass: quoteOptions(productId, "materialClass")[0] || "", thicknesses: [], sizes: [], lamination: "" };
}

function toggleSelection(values: string[], value: string) {
  return values.includes(value) ? values.filter((item) => item !== value) : [...values, value];
}

function isTubeProduct(productId: QuoteProductId) {
  return productId === "xlpe-tube" || productId === "nitrile-rubber-tube" || productId === "nitrile-rubber-tube-class-1";
}

function orderUnitForProduct(productId: QuoteProductId): QuoteOrderUnit {
  if (productId === "nitrile-rubber-tube-class-1") return "carton";
  if (productId === "xlpe-tube" || productId === "nitrile-rubber-tube") return "running_metre";
  if (productId === "open-cell-nitrile-rubber-sheet") return "box";
  if (productId === "insulation-tape") return "unit";
  if (productId === "insulation-adhesive") return "drum";
  return "roll";
}

function productIdForEnquiry(enquiry: EnquiryRecord): QuoteProductId | null {
  const needle = (enquiry.product || "").toLowerCase().trim();
  if (!needle) return null;
  return quotationProducts.find((product) => {
    const label = product.name.toLowerCase();
    return needle.includes(label) || label.includes(needle);
  })?.id || null;
}

export default function AdminQuotationCreatePanel() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [lines, setLines] = useState<SelectedLine[]>([]);
  const [batchSelection, setBatchSelection] = useState<BatchSelection>(() => initialBatchSelection("xlpe-sheet"));
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
      setEnquiry(data.enquiry);
      const productId = productIdForEnquiry(data.enquiry);
      if (productId) setBatchSelection(initialBatchSelection(productId));
    };
    void load();
    return () => controller.abort();
  }, [enquiryId]);

  const batchMaterialClasses = quoteOptions(batchSelection.productId, "materialClass");
  const batchThicknesses = quoteOptions(batchSelection.productId, "thickness", { materialClass: batchSelection.materialClass });
  const batchSizeOptions = useMemo(() => [...new Set(batchSelection.thicknesses.flatMap((thickness) => quoteOptions(batchSelection.productId, "size", { materialClass: batchSelection.materialClass, thickness })))], [batchSelection.materialClass, batchSelection.productId, batchSelection.thicknesses]);
  const batchLaminations = useMemo(() => {
    const thicknesses = batchSelection.thicknesses.length ? batchSelection.thicknesses : batchThicknesses;
    return [...new Set(thicknesses.flatMap((thickness) => {
      const sizes = isTubeProduct(batchSelection.productId) && batchSelection.sizes.length ? batchSelection.sizes : quoteOptions(batchSelection.productId, "size", { materialClass: batchSelection.materialClass, thickness });
      return sizes.flatMap((size) => quoteOptions(batchSelection.productId, "lamination", { materialClass: batchSelection.materialClass, thickness, size }));
    }))];
  }, [batchSelection.materialClass, batchSelection.productId, batchSelection.sizes, batchSelection.thicknesses, batchThicknesses]);
  const subtotal = lines.reduce((total, line) => total + line.amount, 0);
  const gstAmount = Number((subtotal * (gstRate / 100)).toFixed(2));

  const addSelectedConfigurations = () => {
    setError(""); setMessage("");
    if (!batchSelection.thicknesses.length) { setError("Select at least one thickness before adding configurations."); return; }
    if (isTubeProduct(batchSelection.productId) && !batchSelection.sizes.length) { setError("Select at least one matching pipe or roll size before adding tube configurations."); return; }
    const createdAt = Date.now();
    const additions: SelectedLine[] = [];
    batchSelection.thicknesses.forEach((thickness) => {
      const compatibleSizes = quoteOptions(batchSelection.productId, "size", { materialClass: batchSelection.materialClass, thickness });
      const sizes = isTubeProduct(batchSelection.productId) ? batchSelection.sizes.filter((size) => compatibleSizes.includes(size)) : compatibleSizes.slice(0, 1);
      sizes.forEach((size) => {
        const availableLaminations = quoteOptions(batchSelection.productId, "lamination", { materialClass: batchSelection.materialClass, thickness, size });
        const lamination = availableLaminations.includes(batchSelection.lamination) ? batchSelection.lamination : availableLaminations[0];
        const variant = lamination ? findQuoteVariant({ productId: batchSelection.productId, materialClass: batchSelection.materialClass, thickness, size, lamination }) : undefined;
        if (!variant) return;
        try { additions.push({ ...calculateQuoteLine(variant, 1, orderUnitForProduct(variant.productId)), id: `${variant.id}-${createdAt}-${additions.length}` }); } catch { /* invalid configurations are never added */ }
      });
    });
    if (!additions.length) { setError("No valid Rate Card configurations matched that selection. Adjust the options and try again."); return; }
    setLines((current) => [...current, ...additions]);
    setMessage(`${additions.length} configuration line${additions.length === 1 ? " was" : "s were"} added from the approved Rate Card.`);
  };

  const updateLineQuantity = (id: string, quantity: string) => {
    const nextQuantity = Number(quantity);
    if (!Number.isFinite(nextQuantity) || nextQuantity <= 0) return;
    setError("");
    setLines((current) => current.map((line) => {
      if (line.id !== id) return line;
      const variant = getQuotationVariant(line.variantId);
      if (!variant) return line;
      try {
        const recalculated = calculateQuoteLine(variant, nextQuantity, line.requestedUnit);
        return { ...recalculated, id: line.id, rate: line.rate, amount: Number((recalculated.suppliedQuantity * line.rate).toFixed(2)) };
      } catch (calculationError) {
        setError(calculationError instanceof Error ? calculationError.message : "Check the quantity for this configuration.");
        return line;
      }
    }));
  };

  const updateLineRate = (id: string, rate: string) => {
    const nextRate = Number(rate);
    if (!Number.isFinite(nextRate) || nextRate < 0) return;
    setLines((current) => current.map((line) => line.id === id ? { ...line, rate: nextRate, amount: Number((line.suppliedQuantity * nextRate).toFixed(2)) } : line));
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!lines.length) { setError("Use Multiple selection to add at least one product configuration."); return; }
    const form = new FormData(event.currentTarget);
    const customer = Object.fromEntries(["fullName", "company", "mobile", "email", "gstin", "projectName", "projectLocation", "city", "pinCode", "customerType", "deliveryPreference", "notes"].map((field) => [field, String(form.get(field) || "")]));
    const payload = { customer, items: lines.map(({ id: _id, amount: _amount, provisional: _provisional, ...line }) => line), gstRate, enquiryId: enquiryId || undefined, validUntil: String(form.get("validUntil") || ""), internalNotes: String(form.get("internalNotes") || "") };
    setBusy(true); setError("");
    try {
      const response = await adminFetch("/api/admin/quotations", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const data = await response.json() as { quotation?: QuotationRecord; message?: string };
      if (!response.ok || !data.quotation) { setError(data.message || "Could not create the quotation."); return; }
      setMessage(`${data.quotation.quoteNumber} created as a draft quotation.`);
      window.setTimeout(() => router.push("/admin/quotations"), 600);
    } finally { setBusy(false); }
  };

  const prefilledCustomer = enquiry ? { fullName: enquiry.name, company: enquiry.company, mobile: enquiry.mobile, email: enquiry.email, gstin: "", projectName: enquiry.projectName, projectLocation: enquiry.projectLocation, city: enquiry.city, pinCode: enquiry.pinCode, customerType: enquiry.customerType || "end_user", deliveryPreference: enquiry.deliveryPreference } : null;
  return <div className="admin-os-content">
    <section className="admin-os-module-intro"><div><p>MANUAL QUOTATION</p><h2>Create an editable commercial draft.</h2><span>Select approved product configurations first, then save their rates and quantities as the draft snapshot.</span></div><button type="button" onClick={() => router.push("/admin/quotations")}>Back to quotations</button></section>
    {enquiryId && <p className="admin-records-message">Creating a quotation from enquiry {enquiryId.slice(0, 8)}. Confirm the prefilled customer and project information before saving.</p>}
    <form className="admin-customer-fields admin-os-card" onSubmit={submit} key={enquiry?.id || "manual-quotation"}>
      <div className="admin-customer-fields-grid"><label>Full name<input name="fullName" required autoFocus defaultValue={prefilledCustomer?.fullName} /></label><label>Company<input name="company" required defaultValue={prefilledCustomer?.company} /></label><label>Mobile number<input name="mobile" required inputMode="tel" defaultValue={prefilledCustomer?.mobile} /></label><label>Email<input name="email" type="email" required defaultValue={prefilledCustomer?.email} /></label><label>GSTIN<input name="gstin" defaultValue={prefilledCustomer?.gstin} /></label><label>Project name<input name="projectName" defaultValue={prefilledCustomer?.projectName} /></label><label>Project location<input name="projectLocation" defaultValue={prefilledCustomer?.projectLocation} /></label><label>City<input name="city" defaultValue={prefilledCustomer?.city} /></label><label>PIN code<input name="pinCode" defaultValue={prefilledCustomer?.pinCode} /></label><label>Customer type<select name="customerType" defaultValue={prefilledCustomer?.customerType || "end_user"}><option value="end_user">End user</option><option value="contractor">Contractor</option><option value="consultant">Consultant</option><option value="dealer">Dealer</option><option value="other">Other</option></select></label><label>Delivery preference<input name="deliveryPreference" defaultValue={prefilledCustomer?.deliveryPreference} /></label><label>Valid until<input name="validUntil" type="date" /></label></div>
      <section className="admin-multiple-selection" aria-labelledby="admin-multiple-selection-title">
        <div className="admin-multiple-selection-heading"><div><p>MULTIPLE SELECTION</p><h3 id="admin-multiple-selection-title">Add several configurations at once</h3></div><span>Each selected option creates an editable draft line using its approved Rate Card basis.</span></div>
        <div className="admin-multiple-selection-grid"><label>Product<select value={batchSelection.productId} onChange={(event) => setBatchSelection(initialBatchSelection(event.target.value as QuoteProductId))}>{quotationProducts.map((product) => <option value={product.id} key={product.id}>{product.name}</option>)}</select></label><label>Material class<select value={batchSelection.materialClass} onChange={(event) => setBatchSelection((current) => ({ ...current, materialClass: event.target.value, thicknesses: [], sizes: [], lamination: "" }))}>{batchMaterialClasses.map((value) => <option value={value} key={value}>{value}</option>)}</select></label><fieldset className="admin-multiple-checks"><legend>Select thicknesses <em>(one or more)</em></legend><div>{batchThicknesses.map((thickness) => <label key={thickness}><input type="checkbox" checked={batchSelection.thicknesses.includes(thickness)} onChange={() => setBatchSelection((current) => { const thicknesses = toggleSelection(current.thicknesses, thickness); const validSizes = new Set(thicknesses.flatMap((selectedThickness) => quoteOptions(current.productId, "size", { materialClass: current.materialClass, thickness: selectedThickness }))); return { ...current, thicknesses, sizes: current.sizes.filter((size) => validSizes.has(size)), lamination: "" }; })} />{thickness}</label>)}</div></fieldset>{isTubeProduct(batchSelection.productId) && <fieldset className="admin-multiple-checks"><legend>Select pipe / roll sizes <em>(one or more)</em></legend>{batchSelection.thicknesses.length ? <div>{batchSizeOptions.map((size) => <label key={size}><input type="checkbox" checked={batchSelection.sizes.includes(size)} onChange={() => setBatchSelection((current) => ({ ...current, sizes: toggleSelection(current.sizes, size), lamination: "" }))} />{size}</label>)}</div> : <p>Select a thickness first to see matching tube sizes.</p>}</fieldset>}<label>Lamination<select value={batchSelection.lamination} onChange={(event) => setBatchSelection((current) => ({ ...current, lamination: event.target.value }))}><option value="">Select lamination</option>{batchLaminations.map((value) => <option value={value} key={value}>{value}</option>)}</select></label></div>
        <button type="button" className="admin-multiple-selection-add" onClick={addSelectedConfigurations}><Plus size={16} />Add selected configurations</button>
      </section>
      <section className="admin-selected-configurations" aria-labelledby="admin-selected-configurations-title"><div className="admin-drawer-section-heading"><div><h3 id="admin-selected-configurations-title">Selected configurations</h3><span>Adjust quantity or rate only when preparing this editable commercial draft.</span></div><b>{lines.length} line{lines.length === 1 ? "" : "s"}</b></div>{lines.length ? <div className="admin-selected-configurations-scroll"><table><thead><tr><th>Product configuration</th><th>Order quantity</th><th>Supply quantity</th><th>Rate / unit</th><th>Subtotal</th><th /></tr></thead><tbody>{lines.map((line) => <tr key={line.id}><td><strong>{line.productName}</strong><small>{line.configuration}</small></td><td><input aria-label={`Order quantity for ${line.productName}`} type="number" min="1" step="1" value={line.requestedQuantity} onChange={(event) => updateLineQuantity(line.id, event.target.value)} /><span>{line.requestedUnit.replaceAll("_", " ")}</span></td><td><strong>{line.suppliedQuantity.toLocaleString("en-IN", { maximumFractionDigits: 2 })}</strong><small>{line.technicalQuantity}</small></td><td><input aria-label={`Rate for ${line.productName}`} type="number" min="0" step="0.00001" value={line.rate} onChange={(event) => updateLineRate(line.id, event.target.value)} /><span>{line.rateUnit}</span></td><td><strong>{currency.format(line.amount)}</strong></td><td><button type="button" onClick={() => setLines((current) => current.filter((item) => item.id !== line.id))} aria-label={`Remove ${line.productName}`}><Trash2 size={15} />Remove</button></td></tr>)}</tbody></table></div> : <p className="admin-selected-configurations-empty">No product configurations selected yet. Use Multiple selection above to add the first line.</p>}</section>
      <div className="admin-customer-fields-grid"><label>GST rate (%)<input type="number" min="0" max="100" step="0.01" value={gstRate} onChange={(event) => setGstRate(Number(event.target.value))} /></label><label>Internal notes<textarea name="internalNotes" placeholder="Optional private commercial note" /></label></div><div className="admin-revision-total"><span>Subtotal <b>{currency.format(subtotal)}</b></span><span>GST <b>{currency.format(gstAmount)}</b></span><strong>Draft total <b>{currency.format(subtotal + gstAmount)}</b></strong></div>{error && <p className="admin-form-error">{error}</p>}{message && <p className="admin-records-message">{message}</p>}<div className="admin-customer-form-actions"><button type="button" className="admin-drawer-secondary" onClick={() => router.push("/admin/quotations")}>Cancel</button><button className="admin-os-primary" disabled={busy}>{busy ? "Creating..." : "Create quotation"}<ArrowRight size={16} /></button></div>
    </form>
  </div>;
}
