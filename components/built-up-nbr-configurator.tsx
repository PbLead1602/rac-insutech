"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { calculateBuiltUpCylinderInsulation, thicknessMmFromRateCardLabel, type BuiltUpNbrSelection } from "@/lib/quotations/built-up-nbr";
import { quotationVariants, type QuoteVariant } from "@/lib/quotations/catalogue";

/** Empty numeric values keep a new build-up visibly unconfigured. */
export type CustomBuiltUpNbrDraft = Omit<BuiltUpNbrSelection, "baseDiameterMm" | "pipeLengthM" | "requiredTotalThicknessMm"> & {
  id: string;
  baseDiameterMm: number | "";
  pipeLengthM: number | "";
  requiredTotalThicknessMm: number | "";
};
type ApprovedRate = { rate: number; rateUnit: string };

const nbrSheetVariants = quotationVariants.filter((variant) => variant.productId === "nitrile-rubber-sheet");
const materialClasses = [...new Set(nbrSheetVariants.map((variant) => variant.materialClass))];
const formatArea = (value: number) => `${value.toFixed(2)} m²`;
const initialClass = materialClasses.includes("Class O") ? "Class O" : materialClasses[0] || "";

function draftForClass(materialClass = initialClass): CustomBuiltUpNbrDraft {
  return {
    id: `built-up-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    materialClass,
    baseDiameterMm: "",
    pipeLengthM: "",
    requiredTotalThicknessMm: "",
    // Keep the first layer blank until the user chooses its exact rate-card
    // thickness and facing. No configuration is implied by default.
    layers: [{ variantId: "" }],
  };
}

function variantsForClass(materialClass: string) {
  return nbrSheetVariants.filter((variant) => variant.materialClass === materialClass);
}

function optionLabel(variant: QuoteVariant) {
  return `${variant.thickness} — ${variant.lamination}`;
}

export function BuiltUpNbrConfigurator({
  rates,
  rateErrors,
  wastagePercent,
  editingItem,
  onEditConsumed,
  onPreviewVariantIdsChange,
  onAdd,
}: {
  rates: Record<string, ApprovedRate>;
  rateErrors: Record<string, string>;
  wastagePercent: number;
  editingItem?: CustomBuiltUpNbrDraft | null;
  onEditConsumed?: () => void;
  onPreviewVariantIdsChange?: (variantIds: string[]) => void;
  onAdd: (item: CustomBuiltUpNbrDraft) => void;
}) {
  const [draft, setDraft] = useState<CustomBuiltUpNbrDraft>(() => draftForClass());
  const [message, setMessage] = useState("");
  const [previousEditingItem, setPreviousEditingItem] = useState<CustomBuiltUpNbrDraft | null | undefined>(editingItem);

  // An edit request supplies a complete snapshot. Apply it while rendering so
  // the form is ready before paint, rather than scheduling a second render from
  // an Effect. The parent keeps the snapshot until this edit is saved.
  if (editingItem && editingItem !== previousEditingItem) {
    setPreviousEditingItem(editingItem);
    setDraft(editingItem);
    setMessage("Editing the selected Custom Built-Up NBR item. Layer areas recalculate as you change it.");
  }

  const variants = useMemo(() => variantsForClass(draft.materialClass), [draft.materialClass]);

  useEffect(() => {
    onPreviewVariantIdsChange?.(draft.layers.map((layer) => layer.variantId).filter(Boolean));
  }, [draft.layers, onPreviewVariantIdsChange]);

  const layersWithVariants = draft.layers.map((layer) => ({ layer, variant: nbrSheetVariants.find((item) => item.id === layer.variantId) }));
  const layerVariantsValid = layersWithVariants.every(({ variant }) => variant?.materialClass === draft.materialClass);
  const preview = useMemo(() => {
    try {
      return calculateBuiltUpCylinderInsulation({
        materialClass: draft.materialClass,
        baseDiameterMm: Number(draft.baseDiameterMm),
        pipeLengthM: Number(draft.pipeLengthM),
        requiredTotalThicknessMm: Number(draft.requiredTotalThicknessMm),
        wastagePercent,
        layers: layersWithVariants.flatMap(({ layer, variant }) => variant ? [{
          variantId: layer.variantId,
          thicknessMm: thicknessMmFromRateCardLabel(variant.thickness),
          lamination: variant.lamination,
          ...(rates[layer.variantId] ? { rate: rates[layer.variantId].rate } : {}),
        }] : []),
      });
    } catch (error) {
      return error instanceof Error ? error : null;
    }
  }, [draft, layersWithVariants, rates, wastagePercent]);
  const activeRateProblem = layersWithVariants.map(({ layer }) => rateErrors[layer.variantId]).find(Boolean);
  const allRatesAvailable = layersWithVariants.length > 0 && layersWithVariants.every(({ layer }) => rates[layer.variantId]);

  const setClass = (materialClass: string) => {
    setDraft((current) => ({ ...current, materialClass, layers: current.layers.map(() => ({ variantId: "" })) }));
    setMessage("");
  };
  const updateLayer = (index: number, variantId: string) => setDraft((current) => ({ ...current, layers: current.layers.map((layer, layerIndex) => layerIndex === index ? { variantId } : layer) }));
  const addLayer = () => {
    if (draft.layers.length >= 5) return setMessage("A Custom Built-Up NBR item can contain up to 5 layers.");
    setDraft((current) => ({ ...current, layers: [...current.layers, { variantId: "" }] }));
    setMessage("");
  };
  const moveLayer = (index: number, direction: -1 | 1) => setDraft((current) => {
    const destination = index + direction;
    if (destination < 0 || destination >= current.layers.length) return current;
    const layers = [...current.layers];
    [layers[index], layers[destination]] = [layers[destination], layers[index]];
    return { ...current, layers };
  });
  const addToQuotation = () => {
    if (!layerVariantsValid) return setMessage("Select valid Nitrile Rubber Sheet combinations for every layer.");
    if (preview instanceof Error) return setMessage(preview.message);
    if (!preview) return setMessage("Enter the required pipe details.");
    if (!allRatesAvailable) return setMessage(activeRateProblem || "Active Rate Card values are still loading. Please wait a moment.");
    onAdd(draft);
    setMessage("Custom Built-Up NBR item added. The server will recalculate every layer before issuing the quotation.");
    setDraft(draftForClass(draft.materialClass));
    onEditConsumed?.();
  };

  return <section className="built-up-nbr" aria-labelledby="built-up-nbr-title">
    <div className="built-up-nbr-heading"><div><p> NITRILE RUBBER · CUSTOM DIAMETER / BUILT-UP </p><h3 id="built-up-nbr-title">Build insulation from active NBR Sheet rates.</h3></div><span>Server-revalidated</span></div>
    <p className="built-up-nbr-intro">Use sheet layers for large or non-standard pipe diameters. Standard Nitrile Tube quotations remain unchanged.</p>
    <div className="built-up-nbr-grid">
      <label>Material class<select value={draft.materialClass} onChange={(event) => setClass(event.target.value)}>{materialClasses.map((value) => <option key={value}>{value}</option>)}</select></label>
      <label>Pipe diameter (mm)<input type="number" min="0.01" max="10000" step="0.01" value={draft.baseDiameterMm} placeholder="e.g. 200" onChange={(event) => setDraft((current) => ({ ...current, baseDiameterMm: event.target.value === "" ? "" : Number(event.target.value) }))} /></label>
      <label>Pipe length (m)<input type="number" min="0.01" max="100000" step="0.01" value={draft.pipeLengthM} placeholder="e.g. 10" onChange={(event) => setDraft((current) => ({ ...current, pipeLengthM: event.target.value === "" ? "" : Number(event.target.value) }))} /></label>
      <label>Required total thickness (mm)<input type="number" min="0.01" max="1000" step="0.01" value={draft.requiredTotalThicknessMm} placeholder="e.g. 50" onChange={(event) => setDraft((current) => ({ ...current, requiredTotalThicknessMm: event.target.value === "" ? "" : Number(event.target.value) }))} /></label>
    </div>
    <div className="built-up-nbr-layers"><div><h4>Insulation layers</h4><span>Layer order determines the next layer’s mean diameter.</span></div>{draft.layers.map((layer, index) => {
      const variant = nbrSheetVariants.find((item) => item.id === layer.variantId);
      const calculated = !(preview instanceof Error) && preview ? preview.layers[index] : undefined;
      return <article key={`${layer.variantId}-${index}`} className="built-up-nbr-layer"><div className="built-up-nbr-layer-title"><b>Layer {index + 1}</b><div><button type="button" disabled={index === 0} onClick={() => moveLayer(index, -1)} aria-label={`Move layer ${index + 1} up`}><ArrowUp size={15} /></button><button type="button" disabled={index === draft.layers.length - 1} onClick={() => moveLayer(index, 1)} aria-label={`Move layer ${index + 1} down`}><ArrowDown size={15} /></button><button type="button" disabled={draft.layers.length === 1} onClick={() => setDraft((current) => ({ ...current, layers: current.layers.filter((_, layerIndex) => layerIndex !== index) }))} aria-label={`Remove layer ${index + 1}`}><Trash2 size={15} /></button></div></div><label>Thickness and facing<select value={layer.variantId} onChange={(event) => updateLayer(index, event.target.value)}><option value="" disabled>Select thickness and facing</option>{variants.map((option) => <option key={option.id} value={option.id}>{optionLabel(option)}</option>)}</select></label><div className="built-up-nbr-layer-result"><span>{variant ? `${variant.thickness} · ${variant.lamination}` : "Choose a valid sheet configuration"}</span>{calculated && <strong>{formatArea(calculated.quotedAreaM2)} <small>quoted area</small></strong>}</div>{calculated && <p>Mean Ø {calculated.meanDiameterMm.toFixed(2)} mm · Net area {formatArea(calculated.netAreaM2)}{calculated.amount !== undefined ? ` · ${new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(calculated.amount)}` : ""}</p>}</article>;
    })}</div>
    <div className="built-up-nbr-actions"><button type="button" onClick={addLayer} disabled={draft.layers.length >= 5}><Plus size={16} /> Add layer</button><span>Wastage: {wastagePercent.toFixed(2)}% (controlled in Admin quotation settings)</span></div>
    <div className={`built-up-nbr-summary ${preview instanceof Error ? "invalid" : ""}`}>{preview instanceof Error ? <p>{preview.message}</p> : preview ? <><span>Configured thickness <b>{preview.configuredTotalThicknessMm} / {preview.requiredTotalThicknessMm} mm ✓</b></span><span>Finished OD <b>{preview.finishedOuterDiameterMm.toFixed(2)} mm</b></span><span>Total sheet consumption <b>{formatArea(preview.totalQuotedAreaM2)}</b></span>{preview.basicAmount !== undefined && <strong>Basic value <b>{new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(preview.basicAmount)}</b></strong>}</> : <p>Enter valid dimensions and layer combinations to calculate the build-up.</p>}</div>
    {message && <p className="built-up-nbr-message">{message}</p>}
    <button type="button" className="quotation-primary built-up-nbr-add" onClick={addToQuotation}><Plus size={16} /> Add Custom Built-Up NBR to quotation</button>
  </section>;
}
