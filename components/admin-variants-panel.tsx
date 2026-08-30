"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { ArrowRight, Boxes, Eye, PencilLine, Plus, Search, ToggleLeft, X } from "lucide-react";
import { adminFetch } from "@/lib/auth/admin-client";
import AdminRecordPreview from "@/components/admin-record-preview";
import type { ProductMasterRecord, ProductVariantRecord } from "@/lib/db/types";

type Draft = Omit<ProductVariantRecord, "id" | "createdAt">;

export default function AdminVariantsPanel() {
  const [records, setRecords] = useState<ProductVariantRecord[]>([]);
  const [products, setProducts] = useState<ProductMasterRecord[]>([]);
  const [query, setQuery] = useState("");
  const [compose, setCompose] = useState(false);
  const [selected, setSelected] = useState<ProductVariantRecord | null>(null);
  const [viewing, setViewing] = useState<ProductVariantRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const load = useCallback(async () => {
    const [variantResponse, productResponse] = await Promise.all([adminFetch("/api/admin/variants"), adminFetch("/api/admin/products")]);
    const variants = await variantResponse.json() as { variants?: ProductVariantRecord[]; message?: string };
    const productData = await productResponse.json() as { products?: ProductMasterRecord[] };
    setRecords(variants.variants || []); setProducts(productData.products || []);
    if (!variantResponse.ok) setMessage(variants.message || "Could not load variants.");
    setLoading(false);
  }, []);
  useEffect(() => { const timer = window.setTimeout(() => { void load(); }, 0); return () => window.clearTimeout(timer); }, [load]);

  const productName = useCallback((id: string) => products.find((item) => item.id === id || item.slug === id)?.name || id, [products]);
  const filtered = useMemo(() => records.filter((item) => [productName(item.productId), item.name, item.sku, item.thickness, item.dimensions, item.materialClass, item.lamination].join(" ").toLowerCase().includes(query.toLowerCase())), [records, query, productName]);
  const create = async (draft: Draft) => {
    const response = await adminFetch("/api/admin/variants", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(draft) });
    const data = await response.json() as { variant?: ProductVariantRecord; message?: string };
    if (!response.ok || !data.variant) { setMessage(data.message || "Could not create the variant."); return false; }
    setRecords((current) => [data.variant!, ...current]); setCompose(false); setMessage("Variant created."); return true;
  };
  const update = async (draft: Draft) => {
    if (!selected) return false;
    const response = await adminFetch(`/api/admin/variants/${selected.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(draft) });
    const data = await response.json() as { variant?: ProductVariantRecord; message?: string };
    if (!response.ok || !data.variant) { setMessage(data.message || "Could not update the variant."); return false; }
    setRecords((current) => current.map((item) => item.id === data.variant!.id ? data.variant! : item)); setSelected(null); setMessage("Variant updated."); return true;
  };
  const toggle = async (variant: ProductVariantRecord) => {
    const response = await adminFetch(`/api/admin/variants/${variant.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ active: !variant.active }) });
    const data = await response.json() as { variant?: ProductVariantRecord; message?: string };
    if (!response.ok || !data.variant) { setMessage(data.message || "Could not update the variant."); return; }
    setRecords((current) => current.map((item) => item.id === variant.id ? data.variant! : item)); setMessage(`Variant ${data.variant.active ? "activated" : "deactivated"}.`);
  };

  return <div className="admin-records">
    <section className="admin-records-toolbar"><div className="admin-records-search"><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search product, thickness, dimensions or lamination" /></div><button type="button" onClick={() => setCompose(true)}><Plus size={14} />Add variant</button><button type="button" onClick={() => { setLoading(true); void load(); }}>Refresh</button></section>
    {message && <p className="admin-records-message">{message}</p>}
    <div className="admin-records-table-wrap"><div className="admin-records-table admin-variants-table">
      <div className="admin-records-heading"><span>Product</span><span>Variant</span><span>Dimensions / thickness</span><span>Class / lamination</span><span>Packing</span><span>Status</span><span>Actions</span></div>
      {loading ? <div className="admin-records-empty">Loading variants...</div> : filtered.length ? filtered.map((item) => <div className="admin-records-row" key={item.id}>
        <span><strong>{productName(item.productId)}</strong><small>{item.productId}</small></span><span><strong>{item.name}</strong><small>{item.sku || "No SKU"}</small></span><span><strong>{item.thickness || "-"}</strong><small>{item.dimensions || "Dimensions not set"}</small></span><span>{[item.materialClass, item.lamination].filter(Boolean).join(" | ") || "-"}</span><span>{item.packRunningMetres ? `${item.packRunningMetres} rm` : item.tubesPerCarton ? `${item.tubesPerCarton} tubes / carton` : item.rollAreaM2 ? `${item.rollAreaM2} m2 / roll` : "Standard"}</span><span><em className={`admin-status ${item.active ? "active" : "archived"}`}>{item.active ? "Active" : "Inactive"}</em></span>
        <span className="admin-variant-actions"><button type="button" className="admin-variant-toggle" onClick={() => setViewing(item)}><Eye size={15} />View</button><button type="button" className="admin-variant-toggle" onClick={() => setSelected(item)}><PencilLine size={15} />Edit</button><button type="button" className="admin-variant-toggle" onClick={() => void toggle(item)}><ToggleLeft size={15} />{item.active ? "Disable" : "Enable"}</button></span>
      </div>) : <div className="admin-records-empty"><Boxes size={25} /><strong>No matching variants</strong><p>Add a technical configuration before creating its governed rate card.</p></div>}
    </div></div>
    {compose && <VariantForm title="Add technical variant" products={products} onClose={() => setCompose(false)} onSubmit={create} />}
    {selected && <VariantForm title="Edit technical variant" initial={selected} products={products} onClose={() => setSelected(null)} onSubmit={update} />}
    {viewing && <AdminRecordPreview title={viewing.name} record={viewing as unknown as Record<string, unknown>} onClose={() => setViewing(null)} />}
  </div>;
}

function VariantForm({ title, initial, products, onClose, onSubmit }: { title: string; initial?: ProductVariantRecord; products: ProductMasterRecord[]; onClose: () => void; onSubmit: (draft: Draft) => Promise<boolean> }) {
  const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); const form = new FormData(event.currentTarget); const number = (key: string) => { const value = String(form.get(key) || ""); return value ? Number(value) : undefined; };
    const draft: Draft = { productId: String(form.get("productId") || ""), name: String(form.get("name") || ""), sku: String(form.get("sku") || ""), thickness: String(form.get("thickness") || ""), dimensions: String(form.get("dimensions") || ""), density: String(form.get("density") || ""), materialClass: String(form.get("materialClass") || ""), lamination: String(form.get("lamination") || ""), widthM: number("widthM"), lengthM: number("lengthM"), rollAreaM2: number("rollAreaM2"), tubeLengthMm: number("tubeLengthMm"), tubesPerCarton: number("tubesPerCarton"), packRunningMetres: number("packRunningMetres"), active: form.get("active") === "on" };
    setBusy(true); setError(""); const saved = await onSubmit(draft); if (!saved) setError("Check the product, variant name and numeric values."); setBusy(false);
  };
  return <div className="admin-drawer-backdrop" onMouseDown={onClose}><aside className="admin-enquiry-drawer admin-customer-form" onMouseDown={(event) => event.stopPropagation()}>
    <header><div><p>PRODUCT VARIANT</p><h2>{title}</h2><span>Technical configuration remains separate from commercial rate cards.</span></div><button type="button" onClick={onClose}><X size={18} /></button></header>
    <form className="admin-drawer-body admin-customer-fields" onSubmit={submit}><div className="admin-customer-fields-grid">
      <label>Product<select name="productId" required defaultValue={initial?.productId || ""}><option value="" disabled>Select product</option>{products.map((product) => <option value={product.id} key={product.id}>{product.name}</option>)}</select></label><label>Variant name<input name="name" required defaultValue={initial?.name} placeholder="Class I | 19 mm | AL foil" /></label><label>SKU<input name="sku" defaultValue={initial?.sku} /></label><label>Thickness<input name="thickness" defaultValue={initial?.thickness} placeholder="19 mm" /></label><label>Dimensions<input name="dimensions" defaultValue={initial?.dimensions} placeholder="1.2 m x 10 m" /></label><label>Density<input name="density" defaultValue={initial?.density} /></label><label>Material class<input name="materialClass" defaultValue={initial?.materialClass} placeholder="Class I" /></label><label>Lamination<input name="lamination" defaultValue={initial?.lamination} placeholder="AL foil" /></label><label>Width (m)<input name="widthM" type="number" step="0.001" defaultValue={initial?.widthM} /></label><label>Length (m)<input name="lengthM" type="number" step="0.001" defaultValue={initial?.lengthM} /></label><label>Roll area (m2)<input name="rollAreaM2" type="number" step="0.001" defaultValue={initial?.rollAreaM2} /></label><label>Tube length (mm)<input name="tubeLengthMm" type="number" defaultValue={initial?.tubeLengthMm} /></label><label>Tubes / carton<input name="tubesPerCarton" type="number" defaultValue={initial?.tubesPerCarton} /></label><label>Pack running metres<input name="packRunningMetres" type="number" step="0.001" defaultValue={initial?.packRunningMetres} /></label>
    </div><div className="admin-product-checks"><label><input name="active" type="checkbox" defaultChecked={initial?.active ?? true} /> Active and eligible for rate-card selection</label></div>{error && <p className="admin-form-error">{error}</p>}<div className="admin-customer-form-actions"><button type="button" className="admin-drawer-secondary" onClick={onClose}>Cancel</button><button className="admin-os-primary" disabled={busy}>{busy ? "Saving..." : "Save variant"}<ArrowRight size={15} /></button></div></form>
  </aside></div>;
}
