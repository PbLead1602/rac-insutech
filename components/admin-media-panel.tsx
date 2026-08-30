"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Archive, ArrowRight, Eye, ImagePlus, PencilLine, Plus, Search, Trash2, X } from "lucide-react";
import { adminFetch } from "@/lib/auth/admin-client";
import AdminRecordPreview from "@/components/admin-record-preview";
import type { MediaAssetRecord } from "@/lib/db/types";

type Draft = Omit<MediaAssetRecord, "id" | "createdAt" | "archivedAt">;

export default function AdminMediaPanel() {
  const searchParams = useSearchParams();
  const [assets, setAssets] = useState<MediaAssetRecord[]>([]);
  const [query, setQuery] = useState("");
  const [compose, setCompose] = useState(() => searchParams.get("new") === "1");
  const [selected, setSelected] = useState<MediaAssetRecord | null>(null);
  const [viewing, setViewing] = useState<MediaAssetRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    const response = await adminFetch("/api/admin/media");
    const data = await response.json() as { assets?: MediaAssetRecord[]; message?: string };
    setAssets(data.assets || []);
    if (!response.ok) setMessage(data.message || "Could not load media.");
    setLoading(false);
  }, []);

  useEffect(() => { const timer = window.setTimeout(() => { void load(); }, 0); return () => window.clearTimeout(timer); }, [load]);

  useEffect(() => {
    if (searchParams.get("new") !== "1") return;
    const timer = window.setTimeout(() => setCompose(true), 0);
    return () => window.clearTimeout(timer);
  }, [searchParams]);

  const filtered = useMemo(() => assets.filter((asset) => [asset.fileName, asset.storagePath, asset.altText, asset.visibility].join(" ").toLowerCase().includes(query.toLowerCase())), [assets, query]);

  const save = async (draft: Draft, id?: string) => {
    const response = await adminFetch(id ? `/api/admin/media/${id}` : "/api/admin/media", { method: id ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(draft) });
    const data = await response.json() as { asset?: MediaAssetRecord; message?: string };
    if (!response.ok || !data.asset) { setMessage(data.message || "Could not save the media asset."); return false; }
    setAssets((current) => id ? current.map((asset) => asset.id === id ? data.asset! : asset) : [data.asset!, ...current]);
    setSelected(null);
    setCompose(false);
    setMessage(id ? "Media asset updated." : "Media asset registered.");
    return true;
  };

  const archive = async (id: string) => {
    const response = await adminFetch(`/api/admin/media/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ archived: true }) });
    const data = await response.json() as { asset?: MediaAssetRecord; message?: string };
    if (!response.ok || !data.asset) { setMessage(data.message || "Could not archive the media asset."); return; }
    setAssets((current) => current.map((asset) => asset.id === id ? data.asset! : asset));
    setMessage("Media asset archived. Existing URLs remain unchanged.");
  };
  const remove = async (asset: MediaAssetRecord) => {
    const response = await adminFetch(`/api/admin/media/${asset.id}`, { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ record: asset.fileName }) });
    const data = await response.json() as { message?: string };
    if (!response.ok) { setMessage(data.message || "Could not delete the media asset."); return; }
    setAssets((current) => current.filter((item) => item.id !== asset.id));
    setMessage("Archived media record permanently deleted. The original file is not removed from storage automatically.");
  };

  return <div className="admin-records admin-media">
    <p className="admin-media-note">Register approved public paths or HTTPS URLs here. Supabase Storage upload is activated only after production credentials are configured; no files are silently copied in development.</p>
    <section className="admin-records-toolbar"><div className="admin-records-search"><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search file name, path, alt text or visibility" /></div><button type="button" onClick={() => setCompose(true)}><Plus size={14} />Register media</button><button type="button" onClick={() => { setLoading(true); void load(); }}>Refresh</button></section>
    {message && <p className="admin-records-message">{message}</p>}
    <div className="admin-records-table-wrap"><div className="admin-records-table admin-media-table"><div className="admin-records-heading"><span>Preview</span><span>Asset</span><span>Alt text</span><span>Access</span><span>Metadata</span><span>Actions</span></div>
      {loading ? <div className="admin-records-empty">Loading media library...</div> : filtered.length ? filtered.map((asset) => <div className="admin-records-row" key={asset.id}>
        <span className="admin-media-preview">{asset.mimeType.startsWith("image/") ? <img src={asset.storagePath} alt={asset.altText || asset.fileName} /> : <ImagePlus size={22} />}</span>
        <span><strong>{asset.fileName}</strong><small>{asset.storagePath}</small></span>
        <span>{asset.altText || "Alt text not set"}</span>
        <span><em className={`admin-status ${asset.archivedAt ? "archived" : "published"}`}>{asset.archivedAt ? "archived" : asset.visibility}</em></span>
        <span><strong>{asset.mimeType}</strong><small>{asset.width && asset.height ? `${asset.width} × ${asset.height}px` : "Dimensions not recorded"}</small></span>
        <span className="admin-variant-actions"><button type="button" className="admin-variant-toggle" onClick={() => setViewing(asset)}><Eye size={15} />View</button><button type="button" className="admin-variant-toggle" onClick={() => setSelected(asset)}><PencilLine size={15} />Edit</button>{!asset.archivedAt ? <button type="button" className="admin-variant-toggle" onClick={() => void archive(asset.id)}><Archive size={15} />Archive</button> : <button type="button" className="admin-variant-toggle admin-variant-delete" onClick={() => void remove(asset)}><Trash2 size={15} />Delete</button>}</span>
      </div>) : <div className="admin-records-empty"><ImagePlus size={25} /><strong>No media matches your search</strong><p>Register a public image path, document path or managed HTTPS URL.</p></div>}
    </div></div>
    {compose && <MediaForm onClose={() => setCompose(false)} onSubmit={(draft) => save(draft)} />}
    {selected && <MediaForm initial={selected} onClose={() => setSelected(null)} onSubmit={(draft) => save(draft, selected.id)} />}
    {viewing && <AdminRecordPreview title={viewing.fileName} record={viewing as unknown as Record<string, unknown>} onClose={() => setViewing(null)} />}
  </div>;
}

function MediaForm({ initial, onClose, onSubmit }: { initial?: MediaAssetRecord; onClose: () => void; onSubmit: (draft: Draft) => Promise<boolean> }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const draft: Draft = { fileName: String(form.get("fileName") || ""), storagePath: String(form.get("storagePath") || ""), mimeType: String(form.get("mimeType") || ""), sizeBytes: String(form.get("sizeBytes") || "") ? Number(form.get("sizeBytes")) : undefined, width: String(form.get("width") || "") ? Number(form.get("width")) : undefined, height: String(form.get("height") || "") ? Number(form.get("height")) : undefined, altText: String(form.get("altText") || ""), visibility: String(form.get("visibility") || "public") as Draft["visibility"] };
    setBusy(true); setError(""); const saved = await onSubmit(draft); if (!saved) setError("Use an approved public path or HTTPS URL and check the media details."); setBusy(false);
  };
  return <div className="admin-drawer-backdrop" onMouseDown={onClose}><aside className="admin-enquiry-drawer admin-customer-form" onMouseDown={(event) => event.stopPropagation()}>
    <header><div><p>MEDIA LIBRARY</p><h2>{initial ? "Edit media asset" : "Register media asset"}</h2><span>Keep accessible alt text and correct usage information with every reusable asset.</span></div><button type="button" onClick={onClose}><X size={18} /></button></header>
    <form className="admin-drawer-body admin-customer-fields" onSubmit={submit}>
      <div className="admin-customer-fields-grid"><label>File name<input required name="fileName" defaultValue={initial?.fileName} /></label><label>Visibility<select name="visibility" defaultValue={initial?.visibility || "public"}><option value="public">Public</option><option value="internal">Internal</option></select></label><label>Mime type<input required name="mimeType" defaultValue={initial?.mimeType || "image/png"} /></label><label>Size in bytes<input min="0" inputMode="numeric" name="sizeBytes" defaultValue={initial?.sizeBytes} /></label><label>Width (px)<input min="0" inputMode="numeric" name="width" defaultValue={initial?.width} /></label><label>Height (px)<input min="0" inputMode="numeric" name="height" defaultValue={initial?.height} /></label></div>
      <label>Public asset path or HTTPS URL<input required name="storagePath" defaultValue={initial?.storagePath} placeholder="/assets/products/example.png" /></label>
      <label>Alt text<textarea name="altText" defaultValue={initial?.altText} placeholder="Describe the image for visitors using assistive technology." /></label>
      {error && <p className="admin-form-error">{error}</p>}
      <div className="admin-customer-form-actions"><button type="button" className="admin-drawer-secondary" onClick={onClose}>Cancel</button><button className="admin-os-primary" disabled={busy}>{busy ? "Saving..." : "Save media asset"}<ArrowRight size={15} /></button></div>
    </form>
  </aside></div>;
}
