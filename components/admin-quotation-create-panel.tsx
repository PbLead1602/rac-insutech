"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, Plus, Trash2 } from "lucide-react";
import { adminFetch } from "@/lib/auth/admin-client";
import { BuiltUpNbrConfigurator, type CustomBuiltUpNbrDraft } from "@/components/built-up-nbr-configurator";
import type { CustomerRecord, EnquiryRecord, QuotationRecord } from "@/lib/db/types";
import { calculateQuoteLine, findQuoteVariant, getQuotationVariant, quotationProducts, quotationVariants, quoteOptions, type CalculatedQuoteLine, type QuoteOrderUnit, type QuoteProductId, type QuoteVariant } from "@/lib/quotations/catalogue";
import { calculateBuiltUpCylinderInsulation, thicknessMmFromRateCardLabel } from "@/lib/quotations/built-up-nbr";

type BatchSelection = { productId: QuoteProductId; materialClass: string; thicknesses: string[]; sizes: string[]; lamination: string };
type Configuration = Pick<QuoteVariant, "materialClass" | "thickness" | "size" | "lamination">;
type ConfigurationRow = { id: string; productId: QuoteProductId; configuration: Configuration; quantity: string; orderUnit: QuoteOrderUnit; rateOverride?: number };
type RowCalculation = { row: ConfigurationRow; variant?: QuoteVariant; line?: CalculatedQuoteLine; error?: string };
type AdminCustomBuiltUpDraft = CustomBuiltUpNbrDraft & { overrideAmount?: number; overrideReason?: string };

const currency = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", minimumFractionDigits: 2, maximumFractionDigits: 2 });

function initialBatchSelection(productId: QuoteProductId): BatchSelection {
  return { productId, materialClass: quoteOptions(productId, "materialClass")[0] || "", thicknesses: [], sizes: [], lamination: "" };
}

function initialConfiguration(productId: QuoteProductId): Configuration {
  const materialClass = quoteOptions(productId, "materialClass")[0] || "";
  const thickness = quoteOptions(productId, "thickness", { materialClass })[0] || "";
  const size = quoteOptions(productId, "size", { materialClass, thickness })[0] || "";
  const lamination = quoteOptions(productId, "lamination", { materialClass, thickness, size })[0] || "";
  return { materialClass, thickness, size, lamination };
}

let configurationRowSequence = 0;

function toggleSelection(values: string[], value: string) {
  return values.includes(value) ? values.filter((item) => item !== value) : [...values, value];
}

function isTubeProduct(productId: QuoteProductId) {
  return productId === "xlpe-tube" || productId === "nitrile-rubber-tube" || productId === "nitrile-rubber-tube-class-1";
}

function requiresBatchSizeSelection(productId: QuoteProductId) {
  return productId !== "xlpe-sheet" && productId !== "nitrile-rubber-sheet";
}

/** Custom build-up applies to the Class O Nitrile Tube product only. */
function isClassONitrileTube(productId: QuoteProductId) {
  return productId === "nitrile-rubber-tube";
}

function orderUnitForProduct(productId: QuoteProductId): QuoteOrderUnit {
  if (productId === "nitrile-rubber-tube-class-1") return "carton";
  if (productId === "xlpe-tube" || productId === "nitrile-rubber-tube") return "running_metre";
  if (productId === "open-cell-nitrile-rubber-sheet") return "box";
  if (productId === "insulation-tape") return "unit";
  if (productId === "insulation-adhesive") return "drum";
  return "roll";
}

function createConfigurationRow(productId: QuoteProductId): ConfigurationRow {
  configurationRowSequence += 1;
  return {
    id: `admin-configuration-${configurationRowSequence}`,
    productId,
    configuration: initialConfiguration(productId),
    quantity: "1",
    orderUnit: orderUnitForProduct(productId),
  };
}

function orderUnitOptions(productId: QuoteProductId, variant?: QuoteVariant): Array<{ value: QuoteOrderUnit; label: string }> {
  const unit = variant?.orderUnit || orderUnitForProduct(productId);
  if (unit === "running_metre") {
    return productId === "nitrile-rubber-tube"
      ? [{ value: "running_metre", label: "Running metres" }, { value: "carton", label: "Cartons" }]
      : [{ value: "running_metre", label: "Running metres" }];
  }
  if (unit === "carton") return [{ value: "carton", label: "Cartons" }];
  if (unit === "square_metre") return [{ value: "square_metre", label: "Square metres" }];
  if (unit === "box") return [{ value: "box", label: "Box packing" }];
  if (unit === "unit") return [{ value: "unit", label: "Tape rolls" }];
  if (unit === "drum") return [{ value: "drum", label: "Drums" }];
  return [{ value: "roll", label: "Rolls" }];
}

function productIdForEnquiry(enquiry: EnquiryRecord): QuoteProductId | null {
  const needle = (enquiry.product || "").toLowerCase().trim();
  if (!needle) return null;
  return quotationProducts.find((product) => {
    const label = product.name.toLowerCase();
    return needle.includes(label) || label.includes(needle);
  })?.id || null;
}

function quotationCustomerTypeForRecord(type: CustomerRecord["customerType"]) {
  if (type === "consultant" || type === "dealer" || type === "end_user") return type;
  if (type === "hvac_contractor" || type === "peb_contractor") return "contractor";
  return "other";
}

export default function AdminQuotationCreatePanel() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [configurationRows, setConfigurationRows] = useState<ConfigurationRow[]>([]);
  const [batchSelection, setBatchSelection] = useState<BatchSelection>(() => initialBatchSelection("xlpe-sheet"));
  const [nitrileMode, setNitrileMode] = useState<"standard" | "custom">("standard");
  const [customBuiltUpItems, setCustomBuiltUpItems] = useState<AdminCustomBuiltUpDraft[]>([]);
  const [editingBuiltUpItem, setEditingBuiltUpItem] = useState<CustomBuiltUpNbrDraft | null>(null);
  const [builtUpNbrWastagePercent, setBuiltUpNbrWastagePercent] = useState(5);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [gstRate, setGstRate] = useState(18);
  const enquiryId = searchParams.get("enquiry");
  const customerId = searchParams.get("customer");
  const [enquiry, setEnquiry] = useState<EnquiryRecord | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerRecord | null>(null);
  const [customerLoading, setCustomerLoading] = useState(Boolean(customerId));

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

  useEffect(() => {
    if (!customerId) return;
    const controller = new AbortController();
    const load = async () => {
      setCustomerLoading(true);
      const response = await adminFetch(`/api/admin/customers/${customerId}`, { signal: controller.signal });
      const data = await response.json() as { customer?: CustomerRecord; message?: string };
      if (!response.ok || !data.customer) { setError(data.message || "Could not load the selected customer record."); setCustomerLoading(false); return; }
      setSelectedCustomer(data.customer);
      setCustomerLoading(false);
    };
    void load();
    return () => controller.abort();
  }, [customerId]);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const response = await adminFetch("/api/admin/settings", { cache: "no-store" });
        const data = await response.json() as { settings?: Array<{ key: string; value: Record<string, unknown> }> };
        const value = Number(data.settings?.find((item) => item.key === "quotation_terms")?.value.builtUpNbrWastagePercent);
        if (active && response.ok && Number.isFinite(value) && value >= 0 && value <= 50) setBuiltUpNbrWastagePercent(value);
      } catch { /* server calculation remains authoritative */ }
    })();
    return () => { active = false; };
  }, []);

  const batchMaterialClasses = quoteOptions(batchSelection.productId, "materialClass");
  const batchThicknesses = quoteOptions(batchSelection.productId, "thickness", { materialClass: batchSelection.materialClass });
  const batchSizeOptions = useMemo(() => [...new Set(batchSelection.thicknesses.flatMap((thickness) => quoteOptions(batchSelection.productId, "size", { materialClass: batchSelection.materialClass, thickness })))], [batchSelection.materialClass, batchSelection.productId, batchSelection.thicknesses]);
  const batchLaminations = useMemo(() => {
    const thicknesses = batchSelection.thicknesses.length ? batchSelection.thicknesses : batchThicknesses;
    return [...new Set(thicknesses.flatMap((thickness) => {
      const sizes = batchSelection.sizes.length ? batchSelection.sizes : quoteOptions(batchSelection.productId, "size", { materialClass: batchSelection.materialClass, thickness });
      return sizes.flatMap((size) => quoteOptions(batchSelection.productId, "lamination", { materialClass: batchSelection.materialClass, thickness, size }));
    }))];
  }, [batchSelection.materialClass, batchSelection.productId, batchSelection.sizes, batchSelection.thicknesses, batchThicknesses]);
  const builtUpPreviewRates = useMemo(() => Object.fromEntries(quotationVariants.filter((variant) => variant.productId === "nitrile-rubber-sheet").map((variant) => [variant.id, { rate: variant.rate, rateUnit: variant.rateUnit }])), []);
  const customBuiltUpEntries = useMemo(() => customBuiltUpItems.map((item) => {
    try {
      const calculation = calculateBuiltUpCylinderInsulation({ materialClass: item.materialClass, baseDiameterMm: Number(item.baseDiameterMm), pipeLengthM: Number(item.pipeLengthM), requiredTotalThicknessMm: Number(item.requiredTotalThicknessMm), wastagePercent: builtUpNbrWastagePercent, layers: item.layers.map((layer) => { const variant = getQuotationVariant(layer.variantId); if (!variant) throw new Error("Invalid NBR Sheet layer"); return { variantId: variant.id, thicknessMm: thicknessMmFromRateCardLabel(variant.thickness), lamination: variant.lamination, rate: variant.rate }; }) });
      return { item, calculation };
    } catch (error) { return { item, error: error instanceof Error ? error.message : "Could not calculate this Custom Built-Up NBR item." }; }
  }), [builtUpNbrWastagePercent, customBuiltUpItems]);
  const customBuiltUpSubtotal = customBuiltUpEntries.reduce((total, entry) => total + (entry.item.overrideAmount !== undefined ? entry.item.overrideAmount : (entry.calculation?.basicAmount || 0)), 0);
  const rowCalculations = useMemo<RowCalculation[]>(() => configurationRows.map((row) => {
    const variant = findQuoteVariant({ productId: row.productId, ...row.configuration });
    if (!variant) return { row, error: "Choose a valid approved Rate Card configuration." };
    try {
      const calculated = calculateQuoteLine(variant, Number(row.quantity), row.orderUnit);
      const rate = row.rateOverride ?? calculated.rate;
      return { row, variant, line: { ...calculated, rate, amount: Number((calculated.suppliedQuantity * rate).toFixed(2)) } };
    } catch (calculationError) {
      return { row, variant, error: calculationError instanceof Error ? calculationError.message : "Check this configuration." };
    }
  }), [configurationRows]);
  const configuredLines = rowCalculations.flatMap((entry) => entry.line ? [entry.line] : []);
  const subtotal = configuredLines.reduce((total, line) => total + line.amount, 0) + customBuiltUpSubtotal;
  const gstAmount = Number((subtotal * (gstRate / 100)).toFixed(2));

  const addSelectedConfigurations = () => {
    setError(""); setMessage("");
    if (!batchSelection.thicknesses.length) { setError("Select at least one thickness before adding configurations."); return; }
    if (requiresBatchSizeSelection(batchSelection.productId) && batchSizeOptions.length > 1 && !batchSelection.sizes.length) { setError("Select at least one matching size or packing before adding configurations."); return; }
    const additions: ConfigurationRow[] = [];
    batchSelection.thicknesses.forEach((thickness) => {
      const compatibleSizes = quoteOptions(batchSelection.productId, "size", { materialClass: batchSelection.materialClass, thickness });
      const sizes = requiresBatchSizeSelection(batchSelection.productId) && batchSelection.sizes.length ? batchSelection.sizes.filter((size) => compatibleSizes.includes(size)) : compatibleSizes;
      sizes.forEach((size) => {
        const availableLaminations = quoteOptions(batchSelection.productId, "lamination", { materialClass: batchSelection.materialClass, thickness, size });
        const lamination = availableLaminations.includes(batchSelection.lamination) ? batchSelection.lamination : availableLaminations[0];
        if (!lamination) return;
        const variant = findQuoteVariant({ productId: batchSelection.productId, materialClass: batchSelection.materialClass, thickness, size, lamination });
        if (variant) additions.push({ ...createConfigurationRow(batchSelection.productId), configuration: { materialClass: batchSelection.materialClass, thickness, size, lamination } });
      });
    });
    if (!additions.length) { setError("No valid Rate Card configurations matched that selection. Adjust the options and try again."); return; }
    setConfigurationRows((current) => [...current, ...additions]);
    setMessage(`${additions.length} configuration line${additions.length === 1 ? " was" : "s were"} added from the approved Rate Card.`);
  };

  const updateRowConfiguration = (rowId: string, field: keyof Configuration, value: string) => {
    setError("");
    setConfigurationRows((current) => current.map((row) => {
      if (row.id !== rowId) return row;
      const configuration = { ...row.configuration, [field]: value };
      if (field === "materialClass") {
        configuration.thickness = quoteOptions(row.productId, "thickness", { materialClass: value })[0] || "";
        configuration.size = quoteOptions(row.productId, "size", { materialClass: value, thickness: configuration.thickness })[0] || "";
        configuration.lamination = quoteOptions(row.productId, "lamination", configuration)[0] || "";
      }
      if (field === "thickness") {
        configuration.size = quoteOptions(row.productId, "size", { materialClass: configuration.materialClass, thickness: value })[0] || "";
        configuration.lamination = quoteOptions(row.productId, "lamination", configuration)[0] || "";
      }
      if (field === "size") configuration.lamination = quoteOptions(row.productId, "lamination", { ...configuration, size: value })[0] || "";
      return { ...row, configuration, rateOverride: undefined };
    }));
  };

  const changeRowProduct = (rowId: string, productId: QuoteProductId) => {
    setError("");
    setConfigurationRows((current) => current.map((row) => row.id === rowId ? {
      ...createConfigurationRow(productId), id: row.id,
    } : row));
  };

  const updateRow = (rowId: string, updates: Partial<Pick<ConfigurationRow, "quantity" | "orderUnit" | "rateOverride">>) => {
    setError("");
    setConfigurationRows((current) => current.map((row) => {
      if (row.id !== rowId) return row;
      if (updates.rateOverride !== undefined && (!Number.isFinite(updates.rateOverride) || updates.rateOverride < 0)) return row;
      return { ...row, ...updates };
    }));
  };

  const removeRow = (rowId: string) => {
    setConfigurationRows((current) => current.filter((row) => row.id !== rowId));
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (customerLoading || (customerId && !selectedCustomer)) { setError("Wait for the selected customer record to load before creating the quotation."); return; }
    const invalidRow = rowCalculations.find((entry) => entry.error);
    if (invalidRow || (!configuredLines.length && !customBuiltUpItems.length)) { setError(invalidRow?.error || "Use Multiple selection or Custom Built-Up NBR to add at least one product configuration."); return; }
    const form = new FormData(event.currentTarget);
    const customer = Object.fromEntries(["fullName", "company", "mobile", "email", "gstin", "projectName", "projectLocation", "city", "pinCode", "customerType", "deliveryPreference", "notes"].map((field) => [field, String(form.get(field) || "")]));
    const payload = { customerId: selectedCustomer?.id, customer, items: configuredLines.map(({ amount: _amount, provisional: _provisional, ...line }) => line), customBuiltUpItems: customBuiltUpItems.map(({ id: _id, ...item }) => item), gstRate, enquiryId: enquiryId || undefined, validUntil: String(form.get("validUntil") || ""), internalNotes: String(form.get("internalNotes") || "") };
    setBusy(true); setError("");
    try {
      const response = await adminFetch("/api/admin/quotations", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const data = await response.json() as { quotation?: QuotationRecord; message?: string };
      if (!response.ok || !data.quotation) { setError(data.message || "Could not create the quotation."); return; }
      setMessage(`${data.quotation.quoteNumber} has been generated and linked to its customer, project and enquiry records. Review it, then use Send to customer when ready.`);
      window.setTimeout(() => router.push(`/admin/quotations?quotation=${encodeURIComponent(data.quotation!.id)}`), 600);
    } finally { setBusy(false); }
  };

  const prefilledCustomer = selectedCustomer ? { fullName: selectedCustomer.fullName, company: selectedCustomer.company || selectedCustomer.fullName, mobile: selectedCustomer.phone, email: selectedCustomer.email, gstin: selectedCustomer.gstin, projectName: enquiry?.projectName || "", projectLocation: enquiry?.projectLocation || "", city: selectedCustomer.city, pinCode: selectedCustomer.pinCode, customerType: quotationCustomerTypeForRecord(selectedCustomer.customerType), deliveryPreference: "" } : enquiry ? { fullName: enquiry.name, company: enquiry.company, mobile: enquiry.mobile, email: enquiry.email, gstin: "", projectName: enquiry.projectName, projectLocation: enquiry.projectLocation, city: enquiry.city, pinCode: enquiry.pinCode, customerType: enquiry.customerType || "end_user", deliveryPreference: enquiry.deliveryPreference } : null;
  const customerIsLocked = Boolean(selectedCustomer);
  return <div className="admin-os-content">
    <section className="admin-os-module-intro admin-manual-quotation-hero"><div><p>MANUAL QUOTATION BUILDER</p><h2>Configure material. Generate a clear quote.</h2><span>Use approved product combinations. Customer, price and status details are saved as an immutable quotation snapshot.</span></div><button type="button" onClick={() => router.push("/admin/quotations")}>Back to quotations</button></section>
    {enquiryId && <p className="admin-records-message">Creating a quotation from enquiry {enquiryId.slice(0, 8)}. Confirm the prefilled customer and project information before saving.</p>}
    {customerId && customerLoading && <p className="admin-records-message">Loading the selected Customer Record…</p>}
    <form className="admin-customer-fields admin-os-card admin-manual-quotation" onSubmit={submit} key={selectedCustomer?.id || enquiry?.id || "manual-quotation"}>
      <div className="admin-customer-fields-grid admin-manual-customer-details">
        <div className="admin-manual-section-heading"><p>Customer &amp; project details</p><h3>{customerIsLocked ? "Set the project for this customer." : "Confirm the quotation recipient."}</h3><span>{customerIsLocked ? "Customer information is securely fetched from Customer Record & Analysis. Enter the project name and project location for this quotation." : "For an existing RAC customer, the quotation is linked to that customer account. A new contact is added to the RAC customer register without creating login credentials."}</span></div>
        <label>Full name<input name="fullName" required autoFocus={!customerIsLocked} readOnly={customerIsLocked} defaultValue={prefilledCustomer?.fullName} /></label>
        <label>Company<input name="company" required readOnly={customerIsLocked} defaultValue={prefilledCustomer?.company} /></label>
        <label>Mobile number<input name="mobile" required inputMode="tel" readOnly={customerIsLocked} defaultValue={prefilledCustomer?.mobile} /></label>
        <label>Email<input name="email" type="email" required readOnly={customerIsLocked} defaultValue={prefilledCustomer?.email} /></label>
        <label>GSTIN<input name="gstin" readOnly={customerIsLocked} defaultValue={prefilledCustomer?.gstin} /></label>
        <label>Project name<input name="projectName" required autoFocus={customerIsLocked} defaultValue={prefilledCustomer?.projectName} placeholder="Required" /></label>
        <label>Project location<input name="projectLocation" required defaultValue={prefilledCustomer?.projectLocation} placeholder="Required" /></label>
        <label>City<input name="city" readOnly={customerIsLocked} defaultValue={prefilledCustomer?.city} /></label>
        <label>PIN code<input name="pinCode" readOnly={customerIsLocked} defaultValue={prefilledCustomer?.pinCode} /></label>
        <label>Customer type{customerIsLocked ? <input name="customerType" readOnly defaultValue={prefilledCustomer?.customerType || "end_user"} /> : <select name="customerType" defaultValue={prefilledCustomer?.customerType || "end_user"}><option value="end_user">End user</option><option value="contractor">Contractor</option><option value="consultant">Consultant</option><option value="dealer">Dealer</option><option value="other">Other</option></select>}</label>
        <label>Delivery preference<input name="deliveryPreference" readOnly={customerIsLocked} defaultValue={prefilledCustomer?.deliveryPreference} /></label>
        <label>Valid until<input name="validUntil" type="date" /></label>
      </div>
      {isClassONitrileTube(batchSelection.productId) && <fieldset className="nitrile-insulation-type admin-nitrile-insulation-type" aria-label="Nitrile Rubber insulation type"><legend>Insulation type</legend><label><input type="radio" name="admin-nitrile-mode" checked={nitrileMode === "standard"} onChange={() => setNitrileMode("standard")} /> Standard Tube</label><label><input type="radio" name="admin-nitrile-mode" checked={nitrileMode === "custom"} onChange={() => setNitrileMode("custom")} /> Custom Diameter / Built-Up</label><p>Custom Diameter / Built-Up uses active Nitrile Rubber Sheet Rate Cards layer by layer; it never creates a fabricated tube SKU.</p></fieldset>}
      {isClassONitrileTube(batchSelection.productId) && nitrileMode === "custom" && <BuiltUpNbrConfigurator rates={builtUpPreviewRates} rateErrors={{}} wastagePercent={builtUpNbrWastagePercent} editingItem={editingBuiltUpItem} onEditConsumed={() => setEditingBuiltUpItem(null)} onAdd={(item) => setCustomBuiltUpItems((current) => current.some((entry) => entry.id === item.id) ? current.map((entry) => entry.id === item.id ? { ...entry, ...item } : entry) : [...current, item])} />}
      <section className="admin-multiple-selection" hidden={isClassONitrileTube(batchSelection.productId) && nitrileMode === "custom"} aria-labelledby="admin-multiple-selection-title">
        <div className="admin-multiple-selection-heading"><div><p>MULTIPLE SELECTION</p><h3 id="admin-multiple-selection-title">Add several configurations at once</h3></div><span>Each selected option becomes its own editable quotation line with the correct rate and subtotal.</span></div>
        <div className="admin-multiple-selection-grid">
          <label>Product<select value={batchSelection.productId} onChange={(event) => { setBatchSelection(initialBatchSelection(event.target.value as QuoteProductId)); setNitrileMode("standard"); }}>{quotationProducts.map((product) => <option value={product.id} key={product.id}>{product.name}</option>)}</select></label>
          <label>Material class<select value={batchSelection.materialClass} onChange={(event) => setBatchSelection((current) => ({ ...current, materialClass: event.target.value, thicknesses: [], sizes: [], lamination: "" }))}>{batchMaterialClasses.map((value) => <option value={value} key={value}>{value}</option>)}</select></label>
          <fieldset className="admin-multiple-checks admin-thickness-checks"><legend>Select thicknesses <em>(one or more)</em></legend><div>{batchThicknesses.map((thickness) => <label key={thickness}><input type="checkbox" checked={batchSelection.thicknesses.includes(thickness)} onChange={() => setBatchSelection((current) => { const thicknesses = toggleSelection(current.thicknesses, thickness); const validSizes = new Set(thicknesses.flatMap((selectedThickness) => quoteOptions(current.productId, "size", { materialClass: current.materialClass, thickness: selectedThickness }))); return { ...current, thicknesses, sizes: current.sizes.filter((size) => validSizes.has(size)), lamination: "" }; })} />{thickness}</label>)}</div></fieldset>
          {requiresBatchSizeSelection(batchSelection.productId) && batchSizeOptions.length > 1 && <fieldset className="admin-multiple-checks admin-size-packing-checks"><legend>Select {isTubeProduct(batchSelection.productId) ? "pipe / roll sizes" : "size / packing"} <em>(one or more)</em></legend><div>{batchSizeOptions.map((size) => <label key={size}><input type="checkbox" checked={batchSelection.sizes.includes(size)} onChange={() => setBatchSelection((current) => ({ ...current, sizes: toggleSelection(current.sizes, size), lamination: "" }))} />{size}</label>)}</div></fieldset>}
          <label>Lamination<select value={batchSelection.lamination} onChange={(event) => setBatchSelection((current) => ({ ...current, lamination: event.target.value }))}><option value="">Select lamination</option>{batchLaminations.map((value) => <option value={value} key={value}>{value}</option>)}</select></label>
        </div>
        <button type="button" className="admin-multiple-selection-add" onClick={addSelectedConfigurations}><Plus size={16} />Add selected configurations</button>
      </section>
      {customBuiltUpEntries.length > 0 && <section className="built-up-nbr-basket"><div><p className="catalogue-kicker"><span /> CUSTOM BUILT-UP NBR</p><h3>Custom sheet-built quotation items</h3></div>{customBuiltUpEntries.map((entry) => { const { item, calculation } = entry; return <article key={item.id}><div><strong>Custom {item.baseDiameterMm} mm Dia × {item.requiredTotalThicknessMm} mm Built-Up NBR</strong><span>{item.pipeLengthM} m · {item.materialClass} · Admin setting wastage {builtUpNbrWastagePercent}%</span></div><div className="built-up-nbr-layer-pricing" aria-label="Layer-wise supply quantity, rate and amount">{item.layers.map((layer, index) => { const variant = getQuotationVariant(layer.variantId); const calculated = calculation?.layers[index]; return <div key={`${layer.variantId}-${index}`}><strong>Layer {index + 1}<small>{variant ? `${variant.thickness} · ${variant.lamination}` : "Sheet configuration pending"}</small></strong><span>Supply qty <b>{calculated ? `${calculated.quotedAreaM2.toFixed(2)} m²` : "—"}</b></span><span>Rate <b>{calculated?.rate !== undefined ? `${currency.format(calculated.rate)} / m²` : "Pending"}</b></span><span>Amount <b>{calculated?.amount !== undefined ? currency.format(calculated.amount) : "Pending"}</b></span></div>; })}</div><div className="built-up-nbr-basket-total"><span>{calculation ? `Finished OD ${calculation.finishedOuterDiameterMm.toFixed(2)} mm · ${calculation.totalQuotedAreaM2.toFixed(2)} m² sheet` : entry.error}</span><strong>Grouped total: {item.overrideAmount !== undefined ? currency.format(item.overrideAmount) : calculation?.basicAmount !== undefined ? currency.format(calculation.basicAmount) : "Rate pending"}</strong></div><div className="admin-built-up-override"><label>Admin override basic amount (optional)<input type="number" min="0" step="0.01" value={item.overrideAmount ?? ""} onChange={(event) => setCustomBuiltUpItems((current) => current.map((currentItem) => currentItem.id === item.id ? { ...currentItem, overrideAmount: event.target.value === "" ? undefined : Number(event.target.value) } : currentItem))} placeholder="Use calculated amount" /></label>{item.overrideAmount !== undefined && <label>Override reason<textarea value={item.overrideReason || ""} onChange={(event) => setCustomBuiltUpItems((current) => current.map((currentItem) => currentItem.id === item.id ? { ...currentItem, overrideReason: event.target.value } : currentItem))} required placeholder="Why is this commercial amount different?" /></label>}</div><footer><button type="button" onClick={() => setEditingBuiltUpItem(item)}>Edit</button><button type="button" onClick={() => setCustomBuiltUpItems((current) => [...current, { ...item, id: `built-up-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, layers: item.layers.map((layer) => ({ ...layer })) }])}>Duplicate</button><button type="button" onClick={() => setCustomBuiltUpItems((current) => current.filter((currentItem) => currentItem.id !== item.id))}><Trash2 size={14} />Remove</button></footer></article>; })}</section>}
      <section className="admin-selected-configurations" aria-labelledby="admin-selected-configurations-title">
        <div className="admin-drawer-section-heading"><div><p className="catalogue-kicker"><span /> CONFIGURATION LINES</p><h3 id="admin-selected-configurations-title">Selected configurations</h3><span>Select a valid product, class, size and facing for each line. Quantity and the Admin rate can be adjusted before generating the quotation.</span></div><b>{configurationRows.length} line{configurationRows.length === 1 ? "" : "s"}</b></div>
        {configurationRows.length ? <div className="admin-selected-configurations-scroll" tabIndex={0} aria-label="Editable quotation configuration table"><table><thead><tr><th>Sr no</th><th>Thickness</th><th>Product</th><th>Lamination</th><th>Material class</th><th>Size / packing</th><th>Order quantity</th><th>Quantity unit</th><th>Rate / unit</th><th>Subtotal</th></tr></thead><tbody>{rowCalculations.map((entry, index) => {
          const { row, variant, line, error } = entry;
          const { configuration } = row;
          const materialClasses = quoteOptions(row.productId, "materialClass");
          const thicknesses = quoteOptions(row.productId, "thickness", { materialClass: configuration.materialClass });
          const sizes = quoteOptions(row.productId, "size", { materialClass: configuration.materialClass, thickness: configuration.thickness });
          const laminations = quoteOptions(row.productId, "lamination", configuration);
          const units = orderUnitOptions(row.productId, variant);
          const rate = row.rateOverride ?? variant?.rate;
          return <tr key={row.id}>
            <td className="admin-configuration-row-number">{index + 1}</td>
            <td><select aria-label={`Thickness for row ${index + 1}`} value={configuration.thickness} onChange={(event) => updateRowConfiguration(row.id, "thickness", event.target.value)}>{thicknesses.map((value) => <option key={value} value={value}>{value}</option>)}</select></td>
            <td><select aria-label={`Product for row ${index + 1}`} value={row.productId} onChange={(event) => changeRowProduct(row.id, event.target.value as QuoteProductId)}>{quotationProducts.map((product) => <option value={product.id} key={product.id}>{product.name}</option>)}</select></td>
            <td><select aria-label={`Lamination for row ${index + 1}`} value={configuration.lamination} onChange={(event) => updateRowConfiguration(row.id, "lamination", event.target.value)}>{laminations.map((value) => <option key={value} value={value}>{value}</option>)}</select></td>
            <td><select aria-label={`Material class for row ${index + 1}`} value={configuration.materialClass} onChange={(event) => updateRowConfiguration(row.id, "materialClass", event.target.value)}>{materialClasses.map((value) => <option key={value} value={value}>{value}</option>)}</select></td>
            <td><select aria-label={`Size or packing for row ${index + 1}`} value={configuration.size} onChange={(event) => updateRowConfiguration(row.id, "size", event.target.value)}>{sizes.map((value) => <option key={value} value={value}>{value}</option>)}</select></td>
            <td><input aria-label={`Order quantity for row ${index + 1}`} type="number" min="1" step="1" value={row.quantity} onChange={(event) => updateRow(row.id, { quantity: event.target.value })} /></td>
            <td><select aria-label={`Quantity unit for row ${index + 1}`} value={row.orderUnit} onChange={(event) => updateRow(row.id, { orderUnit: event.target.value as QuoteOrderUnit })}>{units.map((unit) => <option value={unit.value} key={unit.value}>{unit.label}</option>)}</select></td>
            <td className="admin-configuration-rate"><input aria-label={`Rate for row ${index + 1}`} type="number" min="0" step="0.00001" value={rate ?? ""} onChange={(event) => updateRow(row.id, { rateOverride: event.target.value === "" ? undefined : Number(event.target.value) })} /><small>{variant ? `per ${variant.rateUnit}` : error || "Select configuration"}</small></td>
            <td className="admin-configuration-subtotal"><strong>{line ? currency.format(line.amount) : "-"}</strong><small>{error || line?.technicalQuantity}</small><button type="button" onClick={() => removeRow(row.id)} aria-label={`Remove configuration row ${index + 1}`}><Trash2 size={14} />Remove</button></td>
          </tr>;
        })}</tbody></table></div> : <p className="admin-selected-configurations-empty">No product configurations yet. Use <strong>Multiple selection</strong> above to select thicknesses and add your first quotation line.</p>}
      </section>
      <div className="admin-customer-fields-grid admin-manual-commercial-details"><label>GST rate (%)<input type="number" min="0" max="100" step="0.01" value={gstRate} onChange={(event) => setGstRate(Number(event.target.value))} /></label><label>Internal notes<textarea name="internalNotes" placeholder="Optional private commercial note" /></label></div><div className="admin-revision-total"><span>Subtotal <b>{currency.format(subtotal)}</b></span><span>GST <b>{currency.format(gstAmount)}</b></span><strong>Quotation total <b>{currency.format(subtotal + gstAmount)}</b></strong></div>{error && <p className="admin-form-error">{error}</p>}{message && <p className="admin-records-message">{message}</p>}<div className="admin-customer-form-actions"><button type="button" className="admin-drawer-secondary" onClick={() => router.push("/admin/quotations")}>Cancel</button><button className="admin-os-primary" disabled={busy || customerLoading}>{busy ? "Creating..." : "Generate quotation"}<ArrowRight size={16} /></button></div>
    </form>
  </div>;
}
