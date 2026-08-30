"use client";

import { FormEvent, Suspense, useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, FileText, MessageCircle, Plus, ShieldCheck, Trash2 } from "lucide-react";
import { CatalogueFooter, CatalogueHeader } from "@/components/catalogue-header";
import { TurnstileWidget } from "@/components/turnstile";
import { whatsappContactHref } from "@/lib/contact";
import { customerFetch } from "@/lib/auth/customer-client";
import { env } from "@/lib/env";
import { clearQuoteLeadDraft, parseQuoteLeadDraft, quoteLeadDraftStorageValue, type QuoteLeadDraft } from "@/lib/quotation-draft";
import {
  calculateQuoteLine,
  getQuotationVariant,
  findQuoteVariant,
  quotationProducts,
  quoteOptions,
  type CalculatedQuoteLine,
  type QuoteOrderUnit,
  type QuoteProductId,
  type QuoteVariant,
} from "@/lib/quotations/catalogue";

type Configuration = Pick<QuoteVariant, "materialClass" | "thickness" | "size" | "lamination">;
type ConfigurationRow = { id: string; productId: QuoteProductId; configuration: Configuration; quantity: string; orderUnit: QuoteOrderUnit };
type RowCalculation = { row: ConfigurationRow; variant?: QuoteVariant; line?: CalculatedQuoteLine; error?: string };
type BatchSelection = { productId: QuoteProductId; materialClass: string; thicknesses: string[]; sizes: string[]; lamination: string };
type ApprovedRate = Pick<QuoteVariant, "rate" | "rateUnit">;
type RateLookupResult = { variantId: string; rate?: number; rateUnit?: QuoteVariant["rateUnit"]; available: boolean; message?: string };
type SimilarQuotationResponse = {
  ok?: boolean;
  message?: string;
  quotation?: {
    quoteNumber: string;
    customer: { projectName?: string; projectLocation?: string; city?: string; state?: string; pinCode?: string; deliveryPreference?: string; notes?: string };
    items: Array<{ variantId: string; requestedQuantity: number; requestedUnit: string }>;
  };
};
type Customer = {
  fullName: string; company: string; mobile: string; email: string; gstin: string; projectName: string;
  projectLocation: string; city: string; state: string; pinCode: string; customerType: "end_user" | "contractor" | "consultant" | "dealer" | "other"; deliveryPreference: string; billingAddress: string; shippingAddress: string; notes: string;
};

const currency = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", minimumFractionDigits: 2, maximumFractionDigits: 2 });

function initialConfiguration(productId: QuoteProductId): Configuration {
  const materialClass = quoteOptions(productId, "materialClass")[0] || "";
  const thickness = quoteOptions(productId, "thickness", { materialClass })[0] || "";
  const size = quoteOptions(productId, "size", { materialClass, thickness })[0] || "";
  const lamination = quoteOptions(productId, "lamination", { materialClass, thickness, size })[0] || "";
  return { materialClass, thickness, size, lamination };
}

let configurationRowSequence = 0;

function isTubeProduct(productId: QuoteProductId) {
  return productId === "xlpe-tube" || productId === "nitrile-rubber-tube" || productId === "nitrile-rubber-tube-class-1";
}

function isCartonTubeProduct(productId: QuoteProductId) {
  return productId === "nitrile-rubber-tube" || productId === "nitrile-rubber-tube-class-1";
}

function orderUnitForProduct(productId: QuoteProductId): QuoteOrderUnit {
  if (isCartonTubeProduct(productId)) return "carton";
  if (productId === "xlpe-tube") return "running_metre";
  if (productId === "open-cell-nitrile-rubber-sheet") return "box";
  if (productId === "insulation-tape") return "unit";
  if (productId === "insulation-adhesive") return "drum";
  return "roll";
}

function createConfigurationRow(productId: QuoteProductId): ConfigurationRow {
  configurationRowSequence += 1;
  return {
    id: `configuration-${configurationRowSequence}`,
    productId,
    configuration: initialConfiguration(productId),
    quantity: "1",
    orderUnit: orderUnitForProduct(productId),
  };
}

function createConfigurationRowsFromQuotation(items: NonNullable<SimilarQuotationResponse["quotation"]>["items"]) {
  return items.flatMap((item) => {
    const variant = getQuotationVariant(item.variantId);
    if (!variant) return [];
    const row = createConfigurationRow(variant.productId);
    return [{
      ...row,
      configuration: {
        materialClass: variant.materialClass,
        thickness: variant.thickness,
        size: variant.size,
        lamination: variant.lamination,
      },
      quantity: String(item.requestedQuantity || 1),
      orderUnit: item.requestedUnit as QuoteOrderUnit,
    }];
  });
}

function initialBatchSelection(productId: QuoteProductId): BatchSelection {
  return { productId, materialClass: quoteOptions(productId, "materialClass")[0] || "", thicknesses: [], sizes: [], lamination: "" };
}

function toggleSelection(values: string[], value: string) {
  return values.includes(value) ? values.filter((item) => item !== value) : [...values, value];
}

function customerFromDraft(draft: QuoteLeadDraft): Customer {
  return {
    fullName: draft.name, company: draft.company, mobile: draft.mobile, email: draft.email, city: draft.city,
    state: draft.state, projectLocation: draft.projectLocation, notes: draft.message, gstin: "", projectName: draft.projectName, pinCode: draft.pinCode, customerType: draft.customerType, deliveryPreference: draft.deliveryPreference, billingAddress: "", shippingAddress: "",
  };
}

export default function GenerateQuotationPage() {
  return <Suspense fallback={<main className="quotation-page"><CatalogueHeader /><section className="quotation-gate catalogue-shell"><ShieldCheck size={34} /><p className="catalogue-kicker"><span /> SECURE QUOTATION ACCESS</p><h1>Preparing quotation workspace.</h1><p>Loading your verified customer quotation configuration.</p></section><CatalogueFooter /></main>}><GenerateQuotationWorkspace /></Suspense>;
}

function GenerateQuotationWorkspace() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const draftValue = useSyncExternalStore(() => () => undefined, quoteLeadDraftStorageValue, () => null);
  const draft = useMemo(() => parseQuoteLeadDraft(draftValue), [draftValue]);
  const similarQuoteId = searchParams.get("similar")?.trim() || "";
  const copiedQuoteRef = useRef<string | null>(null);
  const [configuredRows, setConfiguredRows] = useState<ConfigurationRow[]>([]);
  const [batchSelection, setBatchSelection] = useState<BatchSelection>(() => initialBatchSelection("xlpe-sheet"));
  const [customerOverride, setCustomerOverride] = useState<Customer | null>(null);
  const [turnstileToken, setTurnstileToken] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [approvedRates, setApprovedRates] = useState<Record<string, ApprovedRate>>({});
  const [rateErrors, setRateErrors] = useState<Record<string, string>>({});
  const [accessState, setAccessState] = useState<"checking" | "allowed" | "blocked">("checking");

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const response = await customerFetch("/api/customer-auth/me", { cache: "no-store" });
        const result = await response.json() as { ok?: boolean; message?: string; account?: { status?: string; fullName: string; companyName?: string; mobile: string; email: string; gstin?: string; customerType: Customer["customerType"] }; customer?: { fullName?: string; company?: string; phone?: string; email?: string; gstin?: string; city?: string; state?: string; pinCode?: string } };
        if (!response.ok || !result.account) throw new Error(result.message || "Please sign in to continue.");
        if (result.account.status !== "active") { router.replace("/account/pending-approval"); return; }
        if (!active) return;
        const lead = draft ? customerFromDraft(draft) : { fullName: "", company: "", mobile: "", email: "", gstin: "", projectName: "", projectLocation: "", city: "", state: "", pinCode: "", customerType: "end_user" as const, deliveryPreference: "", billingAddress: "", shippingAddress: "", notes: "" };
        setCustomerOverride({ ...lead, fullName: result.customer?.fullName || result.account.fullName, company: result.customer?.company || result.account.companyName || result.account.fullName, mobile: result.customer?.phone || result.account.mobile, email: result.customer?.email || result.account.email, gstin: result.customer?.gstin || result.account.gstin || "", city: lead.city || result.customer?.city || "", state: lead.state || result.customer?.state || "", pinCode: lead.pinCode || result.customer?.pinCode || "", customerType: result.account.customerType || lead.customerType });
        setAccessState("allowed");
      } catch (error) {
        if (!active) return;
        setAccessState("blocked");
        setMessage(error instanceof Error ? error.message : "Please sign in to continue.");
      }
    })();
    return () => { active = false; };
  }, [draft, router]);

  useEffect(() => {
    if (accessState !== "allowed" || !similarQuoteId || copiedQuoteRef.current === similarQuoteId) return;
    copiedQuoteRef.current = similarQuoteId;
    let active = true;
    (async () => {
      try {
        const response = await customerFetch(`/api/customer-portal/quotations/${encodeURIComponent(similarQuoteId)}`, { cache: "no-store" });
        const result = await response.json() as SimilarQuotationResponse;
        if (!response.ok || !result.quotation) throw new Error(result.message || "Could not load the quotation to copy.");
        const copiedRows = createConfigurationRowsFromQuotation(result.quotation.items);
        if (!copiedRows.length) throw new Error("The previous quotation no longer has active product configurations. Please select the product again.");
        if (!active) return;
        setConfiguredRows(copiedRows);
        setBatchSelection(initialBatchSelection(copiedRows[0].productId));
        setApprovedRates({});
        setRateErrors({});
        setCustomerOverride((current) => current ? {
          ...current,
          projectName: result.quotation!.customer.projectName || current.projectName,
          projectLocation: result.quotation!.customer.projectLocation || current.projectLocation,
          city: result.quotation!.customer.city || current.city,
          state: result.quotation!.customer.state || current.state,
          pinCode: result.quotation!.customer.pinCode || current.pinCode,
          deliveryPreference: result.quotation!.customer.deliveryPreference || current.deliveryPreference,
          notes: result.quotation!.customer.notes || current.notes,
        } : current);
        setMessage(`${result.quotation.quoteNumber} was copied. Current Rate Card values are now being applied.`);
      } catch (error) {
        if (active) setMessage(error instanceof Error ? error.message : "Could not copy the quotation.");
      }
    })();
    return () => { active = false; };
  }, [accessState, similarQuoteId]);

  const customer = customerOverride || (draft ? customerFromDraft(draft) : null);
  const configurationRows = configuredRows;
  const updateRows = (updater: (rows: ConfigurationRow[]) => ConfigurationRow[]) => {
    setConfiguredRows((current) => updater(current));
  };
  const loadApprovedRates = useCallback(async (variantIds: string[]) => {
    const ids = [...new Set(variantIds)];
    if (!ids.length) return;
    try {
      const response = await fetch("/api/quotation-rates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({ variantIds: ids }),
      });
      const result = await response.json() as { ok?: boolean; message?: string; rates?: RateLookupResult[] };
      if (!response.ok || !result.ok || !result.rates) throw new Error(result.message || "Could not load the active Rate Card values.");
      const nextRates: Record<string, ApprovedRate> = {};
      const nextErrors: Record<string, string> = {};
      result.rates.forEach((rate) => {
        if (rate.available && rate.rate !== undefined && rate.rateUnit) nextRates[rate.variantId] = { rate: rate.rate, rateUnit: rate.rateUnit };
        else nextErrors[rate.variantId] = rate.message || "No approved active Rate Card is available.";
      });
      setApprovedRates((current) => {
        const next = { ...current };
        ids.forEach((id) => delete next[id]);
        return { ...next, ...nextRates };
      });
      setRateErrors((current) => {
        const next = { ...current };
        ids.forEach((id) => delete next[id]);
        return { ...next, ...nextErrors };
      });
    } catch (error) {
      const detail = error instanceof Error ? error.message : "Could not load the active Rate Card values.";
      setRateErrors((current) => ({ ...current, ...Object.fromEntries(ids.map((id) => [id, detail])) }));
    }
  }, []);
  const rowCalculations = useMemo<RowCalculation[]>(() => configurationRows.map((row) => {
    const catalogueVariant = findQuoteVariant({ productId: row.productId, ...row.configuration });
    if (!catalogueVariant) return { row, error: "Choose a valid configuration." };
    const approvedRate = approvedRates[catalogueVariant.id];
    if (!approvedRate) return { row, variant: catalogueVariant, error: rateErrors[catalogueVariant.id] || "Checking the active Rate Card..." };
    const variant = { ...catalogueVariant, ...approvedRate };
    try {
      return { row, variant, line: calculateQuoteLine(variant, Number(row.quantity), row.orderUnit) };
    } catch (error) {
      return { row, variant, error: error instanceof Error ? error.message : "Check this configuration." };
    }
  }), [approvedRates, configurationRows, rateErrors]);
  const configuredVariantIds = useMemo(() => configurationRows.flatMap((row) => {
    const variant = findQuoteVariant({ productId: row.productId, ...row.configuration });
    return variant ? [variant.id] : [];
  }), [configurationRows]);
  const configuredVariantKey = configuredVariantIds.join("|");
  useEffect(() => {
    if (!configuredVariantIds.length) return;
    const timer = window.setTimeout(() => { void loadApprovedRates(configuredVariantIds); }, 0);
    return () => window.clearTimeout(timer);
  }, [configuredVariantKey, configuredVariantIds, loadApprovedRates]);
  useEffect(() => {
    const refreshOnFocus = () => { if (configuredVariantIds.length) void loadApprovedRates(configuredVariantIds); };
    window.addEventListener("focus", refreshOnFocus);
    return () => window.removeEventListener("focus", refreshOnFocus);
  }, [configuredVariantKey, configuredVariantIds, loadApprovedRates]);
  const configuredLines = rowCalculations.flatMap((entry) => entry.line ? [entry.line] : []);
  const subtotal = configuredLines.reduce((total, item) => total + item.amount, 0);
  const gst = Number((subtotal * (env.quotationGstRate / 100)).toFixed(2));
  const total = subtotal + gst;
  const batchMaterialClasses = quoteOptions(batchSelection.productId, "materialClass");
  const batchThicknesses = quoteOptions(batchSelection.productId, "thickness", { materialClass: batchSelection.materialClass });
  const batchSizeOptions = useMemo(() => [...new Set(batchSelection.thicknesses.flatMap((thickness) => quoteOptions(batchSelection.productId, "size", { materialClass: batchSelection.materialClass, thickness })))], [batchSelection.materialClass, batchSelection.productId, batchSelection.thicknesses]);
  const batchLaminations = useMemo(() => {
    const thicknesses = batchSelection.thicknesses.length ? batchSelection.thicknesses : batchThicknesses;
    const values = thicknesses.flatMap((thickness) => {
      const sizes = isTubeProduct(batchSelection.productId) && batchSelection.sizes.length ? batchSelection.sizes : quoteOptions(batchSelection.productId, "size", { materialClass: batchSelection.materialClass, thickness });
      return sizes.flatMap((size) => quoteOptions(batchSelection.productId, "lamination", { materialClass: batchSelection.materialClass, thickness, size }));
    });
    return [...new Set(values)];
  }, [batchSelection.materialClass, batchSelection.productId, batchSelection.sizes, batchSelection.thicknesses, batchThicknesses]);

  const updateRowConfiguration = (rowId: string, field: keyof Configuration, value: string) => {
    updateRows((current) => current.map((row) => {
      if (row.id !== rowId) return row;
      const next = { ...row.configuration, [field]: value };
      if (field === "materialClass") {
        next.thickness = quoteOptions(row.productId, "thickness", { materialClass: value })[0] || "";
        next.size = quoteOptions(row.productId, "size", { materialClass: value, thickness: next.thickness })[0] || "";
        next.lamination = quoteOptions(row.productId, "lamination", { materialClass: value, thickness: next.thickness, size: next.size })[0] || "";
      }
      if (field === "thickness") {
        next.size = quoteOptions(row.productId, "size", { materialClass: next.materialClass, thickness: value })[0] || "";
        next.lamination = quoteOptions(row.productId, "lamination", { materialClass: next.materialClass, thickness: value, size: next.size })[0] || "";
      }
      if (field === "size") next.lamination = quoteOptions(row.productId, "lamination", { materialClass: next.materialClass, thickness: next.thickness, size: value })[0] || "";
      return { ...row, configuration: next };
    }));
  };

  const changeRowProduct = (rowId: string, productId: QuoteProductId) => {
    updateRows((current) => current.map((row) => row.id === rowId ? {
      ...row, productId, configuration: initialConfiguration(productId),
      orderUnit: orderUnitForProduct(productId),
    } : row));
  };
  const updateRow = (rowId: string, updates: Partial<Pick<ConfigurationRow, "quantity" | "orderUnit">>) => {
    updateRows((current) => current.map((row) => row.id === rowId ? { ...row, ...updates } : row));
  };
  const removeRow = (rowId: string) => {
    updateRows((current) => current.filter((row) => row.id !== rowId));
  };
  const addBatchRows = () => {
    setMessage("");
    if (!batchSelection.thicknesses.length) return setMessage("Select at least one thickness to add configuration rows.");
    const rows = batchSelection.thicknesses.flatMap((thickness) => {
      const availableSizes = quoteOptions(batchSelection.productId, "size", { materialClass: batchSelection.materialClass, thickness });
      const selectedSizes = isTubeProduct(batchSelection.productId) ? batchSelection.sizes.filter((size) => availableSizes.includes(size)) : availableSizes.slice(0, 1);
      return selectedSizes.flatMap((size) => {
        const laminations = quoteOptions(batchSelection.productId, "lamination", { materialClass: batchSelection.materialClass, thickness, size });
        const lamination = laminations.includes(batchSelection.lamination) ? batchSelection.lamination : laminations[0];
        if (!lamination) return [];
        const row = createConfigurationRow(batchSelection.productId);
        return [{ ...row, configuration: { materialClass: batchSelection.materialClass, thickness, size, lamination } }];
      });
    });
    if (!rows.length) return setMessage("For Nitrile Rubber Tube, select at least one pipe or roll size that matches the selected thickness.");
    updateRows((current) => [...current, ...rows]);
    setMessage(`${rows.length} configuration line${rows.length === 1 ? " was" : "s were"} added.`);
  };
  const updateCustomer = (key: keyof Customer, value: string) => {
    if (customer) setCustomerOverride({ ...customer, [key]: value });
  };
  const verifyTurnstile = useCallback((token: string) => setTurnstileToken(token), []);

  const submitQuotation = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!customer) return;
    const invalidRow = rowCalculations.find((entry) => entry.error);
    if (invalidRow || !configuredLines.length) return setMessage(invalidRow?.error || "Add at least one product configuration before generating the quotation.");
    setSubmitting(true); setMessage("");
    try {
      const response = await customerFetch("/api/quotations", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: configuredLines.map((item) => ({ variantId: item.variantId, quantity: item.requestedQuantity, orderUnit: item.requestedUnit })), customer, enquiryId: draft?.enquiryId || undefined, turnstileToken }),
      });
      const result = await response.json() as { ok: boolean; message?: string; quotation?: { id: string; accessToken: string } };
      if (!response.ok || !result.ok || !result.quotation) throw new Error(result.message || "We could not generate the quotation.");
      clearQuoteLeadDraft();
      router.push(`/quotation/success/${result.quotation.id}?token=${encodeURIComponent(result.quotation.accessToken)}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "We could not generate the quotation.");
    } finally {
      setSubmitting(false);
    }
  };

  if (accessState === "checking") return <main className="quotation-page"><CatalogueHeader /><section className="quotation-gate catalogue-shell"><ShieldCheck size={34} /><p className="catalogue-kicker"><span /> SECURE QUOTATION ACCESS</p><h1>Checking customer access.</h1><p>RAC verifies the signed-in account before opening commercial quotation configuration.</p></section><CatalogueFooter /></main>;
  if (accessState === "blocked") return <main className="quotation-page"><CatalogueHeader /><section className="quotation-gate catalogue-shell"><ShieldCheck size={34} /><p className="catalogue-kicker"><span /> SECURE QUOTATION ACCESS</p><h1>Sign-in or approval is required.</h1><p>{message || "Only active RAC Insutech customer accounts can generate commercial quotations."}</p><Link href="/account/sign-in" className="quotation-primary">Sign in <ArrowRight size={17} /></Link></section><CatalogueFooter /></main>;
  if (!customer) return <main className="quotation-page"><CatalogueHeader /><section className="quotation-gate catalogue-shell"><FileText size={34} /><p className="catalogue-kicker"><span /> QUOTATION WORKFLOW</p><h1>Preparing your quotation workspace.</h1><p>Please sign in with your approved RAC customer account to configure a quotation.</p><Link href="/account/sign-in" className="quotation-primary">Sign in <ArrowRight size={17} /></Link></section><CatalogueFooter /></main>;

  return <main className="quotation-page">
    <CatalogueHeader />
    <section className="quotation-hero"><div className="catalogue-shell"><p className="catalogue-kicker"><span /> PHASE 1 QUOTATION BUILDER</p><h1>Configure material. Generate a clear quote.</h1><p>Only valid product combinations can be selected. Rates are calculated on the server again before a quotation is issued.</p><div className="quotation-stepper"><span className="active">1. Configure</span><span className={configuredLines.length ? "active" : ""}>2. Review</span><span>3. Customer details</span><span>4. Generate PDF</span></div></div></section>

    <section className="quotation-main catalogue-shell">
      <div className="quotation-workspace">
        <section className="quotation-config-card">
          <div className="quotation-card-heading"><div><p className="catalogue-kicker"><span /> PRODUCT CONFIGURATION</p><h2>Configure each quotation line.</h2></div><span className="provisional-label">Rate-card data</span></div>
          <p className="quotation-config-intro">Sheets are ordered in rolls, open-cell sheets in box packing, Nitrile tubes in cartons, XLPE tubes in running metres, tape by roll and adhesive by drum. Each line uses its approved rate basis.</p>
          <section className="quotation-batch-builder" aria-labelledby="multiple-configurations-heading">
            <div className="quotation-batch-heading"><div><span>Multiple selection</span><h3 id="multiple-configurations-heading">Add several configurations at once</h3></div><p>Each selected option becomes its own editable quotation line with the correct rate and subtotal.</p></div>
            <div className="quotation-batch-grid">
              <label>Product<select value={batchSelection.productId} onChange={(event) => setBatchSelection(initialBatchSelection(event.target.value as QuoteProductId))}>{quotationProducts.map((product) => <option value={product.id} key={product.id}>{product.name}</option>)}</select></label>
              <label>Material class<select value={batchSelection.materialClass} onChange={(event) => setBatchSelection((current) => ({ ...current, materialClass: event.target.value, thicknesses: [], sizes: [], lamination: "" }))}>{batchMaterialClasses.map((value) => <option value={value} key={value}>{value}</option>)}</select></label>
              <fieldset className="quotation-checkbox-group"><legend>Select thicknesses <em>(one or more)</em></legend><div>{batchThicknesses.map((thickness) => <label key={thickness}><input type="checkbox" checked={batchSelection.thicknesses.includes(thickness)} onChange={() => setBatchSelection((current) => {
                const thicknesses = toggleSelection(current.thicknesses, thickness);
                const validSizes = new Set(thicknesses.flatMap((selectedThickness) => quoteOptions(current.productId, "size", { materialClass: current.materialClass, thickness: selectedThickness })));
                return { ...current, thicknesses, sizes: current.sizes.filter((size) => validSizes.has(size)), lamination: "" };
              })} />{thickness}</label>)}</div></fieldset>
              {isTubeProduct(batchSelection.productId) && <fieldset className="quotation-checkbox-group quotation-size-checkboxes"><legend>Select pipe / roll sizes <em>(one or more)</em></legend>{batchSelection.thicknesses.length ? <div>{batchSizeOptions.map((size) => <label key={size}><input type="checkbox" checked={batchSelection.sizes.includes(size)} onChange={() => setBatchSelection((current) => ({ ...current, sizes: toggleSelection(current.sizes, size), lamination: "" }))} />{size}</label>)}</div> : <p>Select a thickness first to see matching tube sizes.</p>}</fieldset>}
              <label>Lamination<select value={batchSelection.lamination} onChange={(event) => setBatchSelection((current) => ({ ...current, lamination: event.target.value }))}><option value="">Select lamination</option>{batchLaminations.map((value) => <option value={value} key={value}>{value}</option>)}</select></label>
            </div>
            <div className="quotation-batch-actions"><button type="button" className="quotation-primary" onClick={addBatchRows}><Plus size={16} /> Add selected configurations</button>{isTubeProduct(batchSelection.productId) && <span>Only compatible thickness and pipe-size pairs are added.</span>}</div>
          </section>
          <div className="quotation-config-table-scroll" tabIndex={0} aria-label="Product configuration table">
            <table className="quotation-config-table">
              <thead><tr><th>Sr no</th><th>Thickness</th><th>Product</th><th>Lamination</th><th>Material class</th><th>Size / packing</th><th>Order quantity</th><th>Quantity unit</th><th>Rate / unit</th><th>Subtotal</th></tr></thead>
              <tbody>{rowCalculations.length ? rowCalculations.map((entry, index) => {
                const { row, variant, line, error } = entry;
                const { configuration } = row;
                const materialClasses = quoteOptions(row.productId, "materialClass");
                const thicknesses = quoteOptions(row.productId, "thickness", { materialClass: configuration.materialClass });
                const sizes = quoteOptions(row.productId, "size", { materialClass: configuration.materialClass, thickness: configuration.thickness });
                const laminations = quoteOptions(row.productId, "lamination", configuration);
                const isTube = isTubeProduct(row.productId);
                const isCartonTube = isCartonTubeProduct(row.productId);
                const isSquareMetreSheet = variant?.orderUnit === "square_metre";
                const isBoxPacking = variant?.orderUnit === "box";
                return <tr key={row.id}>
                  <td className="quotation-row-number">{index + 1}</td>
                  <td><select aria-label={`Thickness for row ${index + 1}`} value={configuration.thickness} onChange={(event) => updateRowConfiguration(row.id, "thickness", event.target.value)}>{thicknesses.map((value) => <option key={value} value={value}>{value}</option>)}</select></td>
                  <td><select aria-label={`Product for row ${index + 1}`} value={row.productId} onChange={(event) => changeRowProduct(row.id, event.target.value as QuoteProductId)}>{quotationProducts.map((product) => <option value={product.id} key={product.id}>{product.name}</option>)}</select></td>
                  <td><select aria-label={`Lamination for row ${index + 1}`} value={configuration.lamination} onChange={(event) => updateRowConfiguration(row.id, "lamination", event.target.value)}>{laminations.map((value) => <option key={value} value={value}>{value}</option>)}</select></td>
                  <td><select aria-label={`Material class for row ${index + 1}`} value={configuration.materialClass} onChange={(event) => updateRowConfiguration(row.id, "materialClass", event.target.value)}>{materialClasses.map((value) => <option key={value} value={value}>{value}</option>)}</select></td>
                  <td><select aria-label={`${isTube ? "Pipe size" : "Sheet or roll size"} for row ${index + 1}`} value={configuration.size} onChange={(event) => updateRowConfiguration(row.id, "size", event.target.value)}>{sizes.map((value) => <option key={value} value={value}>{value}</option>)}</select></td>
                  <td><input aria-label={`Order quantity for row ${index + 1}`} type="number" min="1" step="1" value={row.quantity} onChange={(event) => updateRow(row.id, { quantity: event.target.value })} /></td>
                  <td><select aria-label={`Quantity unit for row ${index + 1}`} value={row.orderUnit} onChange={(event) => updateRow(row.id, { orderUnit: event.target.value as QuoteOrderUnit })}>{isCartonTube ? <option value="carton">Cartons</option> : variant?.orderUnit === "running_metre" ? <option value="running_metre">Running metres</option> : variant?.orderUnit === "drum" ? <option value="drum">Drums</option> : variant?.orderUnit === "unit" ? <option value="unit">Tape rolls</option> : isBoxPacking ? <option value="box">Box packing</option> : isSquareMetreSheet ? <option value="square_metre">Square metres</option> : <option value="roll">Rolls</option>}</select></td>
                  <td className="quotation-row-rate"><strong>{line ? currency.format(variant?.rate || 0) : "-"}</strong><small>{line ? `per ${variant?.rateUnit}` : error || "Select configuration"}</small></td>
                  <td className="quotation-row-subtotal"><strong>{line ? currency.format(line.amount) : "-"}</strong>{error ? <small>{error}</small> : <small>{line?.technicalQuantity}</small>}{configurationRows.length > 1 && <button type="button" onClick={() => removeRow(row.id)} aria-label={`Remove configuration row ${index + 1}`}><Trash2 size={14} /> Remove</button>}</td>
                </tr>;
              }) : <tr className="quotation-config-empty-row"><td colSpan={10}>No product configurations yet. Use <strong>Multiple selection</strong> above to select thicknesses and add your first quotation line.</td></tr>}</tbody>
            </table>
          </div>
          <div className="quotation-config-actions"><span>{configurationRows.length} configuration line{configurationRows.length === 1 ? "" : "s"}</span><span>Select options in Multiple selection to add configuration rows.</span></div>
        </section>

        <aside className="quotation-summary-card">
          <div className="quotation-card-heading"><div><p className="catalogue-kicker"><span /> LIVE SUMMARY</p><h2>Quotation total</h2></div><span>{configuredLines.length} valid line{configuredLines.length === 1 ? "" : "s"}</span></div>
          <p className="quotation-empty">Each product line, rate and subtotal is shown in the configuration table above.</p>
          <div className="quotation-totals"><span>Subtotal <b>{currency.format(subtotal)}</b></span><span>GST ({env.quotationGstRate}%) <b>{currency.format(gst)}</b></span><span>Transport <b>At Actual</b></span><strong>Estimated total <b>{currency.format(total)}</b></strong></div>
          <p className="quotation-summary-note"><ShieldCheck size={15} /> Quantity conversion, pack rounding and prices are recalculated on the server before issue.</p>
        </aside>
      </div>

      <form className="quotation-customer-card" onSubmit={submitQuotation}>
        <div className="quotation-card-heading"><div><p className="catalogue-kicker"><span /> CUSTOMER & PROJECT DETAILS</p><h2>Confirm the quotation recipient.</h2><p>The four essential fields were collected before opening this builder. Add project information to make the quote more useful.</p></div></div>
        <div className="quotation-form-grid customer-fields">
          <label>Full name<input required value={customer.fullName} readOnly aria-readonly="true" /></label><label>Company<input required value={customer.company} readOnly aria-readonly="true" /></label>
          <label>Mobile<input required type="tel" value={customer.mobile} readOnly aria-readonly="true" /></label><label>Email<input required type="email" value={customer.email} readOnly aria-readonly="true" /></label>
          <label>Project name<input value={customer.projectName} onChange={(event) => updateCustomer("projectName", event.target.value)} placeholder="Optional" /></label><label>Project location<input value={customer.projectLocation} onChange={(event) => updateCustomer("projectLocation", event.target.value)} placeholder="Optional" /></label>
          <label>City<input value={customer.city} onChange={(event) => updateCustomer("city", event.target.value)} placeholder="Optional" /></label><label>State<input value={customer.state || ""} onChange={(event) => updateCustomer("state", event.target.value)} placeholder="Optional" /></label>
          <label>PIN code<input value={customer.pinCode} onChange={(event) => updateCustomer("pinCode", event.target.value)} placeholder="Optional" /></label><label>GSTIN<input value={customer.gstin} readOnly aria-readonly="true" /></label>
          <label>Customer type<select value={customer.customerType} disabled><option value="end_user">End user</option><option value="contractor">Contractor</option><option value="consultant">Consultant</option><option value="dealer">Dealer</option><option value="other">Other</option></select></label>
          <label>Delivery preference<input value={customer.deliveryPreference} onChange={(event) => updateCustomer("deliveryPreference", event.target.value)} placeholder="Optional" /></label><label className="quotation-notes">Project notes<textarea value={customer.notes} onChange={(event) => updateCustomer("notes", event.target.value)} placeholder="Application, temperature range, delivery or drawing reference" rows={3} /></label>
          <label className="quotation-notes">Billing address<textarea value={customer.billingAddress || ""} onChange={(event) => updateCustomer("billingAddress", event.target.value)} placeholder="Optional billing address" rows={3} /></label><label className="quotation-notes">Shipping address<textarea value={customer.shippingAddress || ""} onChange={(event) => updateCustomer("shippingAddress", event.target.value)} placeholder="Optional delivery address" rows={3} /></label>
        </div>
        <TurnstileWidget onVerify={verifyTurnstile} />
        {message && <p className="quotation-message" role="status">{message}</p>}
        <div className="quotation-submit-row"><a href={whatsappContactHref("a quotation configuration")} className="quotation-contact" target="_blank" rel="noreferrer"><MessageCircle size={17} /> Contact RAC on WhatsApp</a><button type="submit" className="quotation-primary" disabled={submitting}>{submitting ? "Generating quotation..." : "Generate quotation"}<ArrowRight size={17} /></button></div>
      </form>
    </section>
    <CatalogueFooter />
  </main>;
}
