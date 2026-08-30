"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Archive, ArrowRight, Eye, FilePenLine, Globe2, PencilLine, Plus, Search, Trash2, X } from "lucide-react";
import { adminFetch } from "@/lib/auth/admin-client";
import AdminRecordPreview from "@/components/admin-record-preview";
import type { ContentStatus, EditorialKind, EditorialRecord } from "@/lib/db/types";

type Draft = Omit<EditorialRecord, "id" | "createdAt" | "kind">;

const config: Record<EditorialKind, { singular: string; plural: string; imageLabel: string }> = {
  application: { singular: "application", plural: "applications", imageLabel: "Hero image path / URL" },
  industry: { singular: "industry", plural: "industries", imageLabel: "Image path / URL" },
  service: { singular: "service", plural: "services", imageLabel: "Hero image path / URL" },
  resource: { singular: "resource", plural: "resources", imageLabel: "Cover image path / URL" },
};

export default function AdminEditorialPanel({ kind }: { kind: EditorialKind }) {
  const copy = config[kind];
  const searchParams = useSearchParams();
  const [records, setRecords] = useState<EditorialRecord[]>([]);
  const [query, setQuery] = useState("");
  const [compose, setCompose] = useState(() => searchParams.get("new") === "1");
  const [selected, setSelected] = useState<EditorialRecord | null>(null);
  const [viewing, setViewing] = useState<EditorialRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    const response = await adminFetch(`/api/admin/editorial/${kind}`);
    const data = await response.json() as { records?: EditorialRecord[]; message?: string };
    setRecords(data.records || []);
    if (!response.ok) setMessage(data.message || `Could not load ${copy.plural}.`);
    setLoading(false);
  }, [kind, copy.plural]);

  useEffect(() => {
    const timer = window.setTimeout(() => { void load(); }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  useEffect(() => {
    if (searchParams.get("new") !== "1") return;
    const timer = window.setTimeout(() => setCompose(true), 0);
    return () => window.clearTimeout(timer);
  }, [searchParams]);

  const filtered = useMemo(() => records.filter((item) => [item.name, item.slug, item.summary, item.content, item.status].join(" ").toLowerCase().includes(query.toLowerCase())), [records, query]);

  const save = async (draft: Draft, id?: string) => {
    const response = await adminFetch(id ? `/api/admin/editorial/${kind}/${id}` : `/api/admin/editorial/${kind}`, {
      method: id ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(draft),
    });
    const data = await response.json() as { record?: EditorialRecord; message?: string };
    if (!response.ok || !data.record) {
      setMessage(data.message || `Could not save ${copy.singular}.`);
      return false;
    }
    setRecords((current) => id ? current.map((item) => item.id === id ? data.record! : item) : [data.record!, ...current]);
    setSelected(null);
    setCompose(false);
    setMessage(id ? `${copy.singular[0].toUpperCase() + copy.singular.slice(1)} updated.` : `${copy.singular[0].toUpperCase() + copy.singular.slice(1)} created.`);
    return true;
  };
  const remove = async (record: EditorialRecord) => {
    const response = await adminFetch(`/api/admin/editorial/${kind}/${record.id}`, { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ record: record.name }) });
    const data = await response.json() as { message?: string };
    if (!response.ok) { setMessage(data.message || `Could not delete the ${copy.singular}.`); return; }
    setRecords((current) => current.filter((item) => item.id !== record.id));
    setMessage(`Archived ${copy.singular} permanently deleted.`);
  };

  return <div className="admin-records">
    <section className="admin-records-toolbar">
      <div className="admin-records-search"><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={`Search ${copy.plural}, URL slug or content`} /></div>
      <button type="button" onClick={() => setCompose(true)}><Plus size={14} />Add {copy.singular}</button>
      <button type="button" onClick={() => { setLoading(true); void load(); }}>Refresh</button>
    </section>
    {message && <p className="admin-records-message">{message}</p>}
    <div className="admin-records-table-wrap"><div className="admin-records-table admin-editorial-table">
      <div className="admin-records-heading"><span>Name</span><span>Summary</span><span>Content</span><span>Publication</span><span>SEO</span><span>Actions</span></div>
      {loading ? <div className="admin-records-empty">Loading {copy.plural}...</div> : filtered.length ? filtered.map((record) => <div className="admin-records-row" key={record.id}>
        <span><strong>{record.name}</strong><small>{record.slug}</small></span>
        <span>{record.summary || "No summary"}</span>
        <span><small>{record.content ? `${record.content.slice(0, 120)}${record.content.length > 120 ? "..." : ""}` : "No detail content"}</small></span>
        <span><em className={`admin-status ${record.status}`}>{record.status}</em></span>
        <span><strong>{record.seoTitle || "SEO title not set"}</strong><small>{record.seoDescription || "SEO description not set"}</small></span>
        <span className="admin-variant-actions"><button type="button" className="admin-variant-toggle" onClick={() => setViewing(record)}><Eye size={15} />View</button><button type="button" className="admin-variant-toggle" onClick={() => setSelected(record)}><PencilLine size={15} />Edit</button>{record.status !== "published" && record.status !== "archived" && <button type="button" className="admin-variant-toggle" onClick={() => void save({ ...record, status: "published" }, record.id)}><Globe2 size={15} />Publish</button>}{record.status !== "archived" ? <button type="button" className="admin-variant-toggle" onClick={() => void save({ ...record, status: "archived" }, record.id)}><Archive size={15} />Archive</button> : <button type="button" className="admin-variant-toggle admin-variant-delete" onClick={() => void remove(record)}><Trash2 size={15} />Delete</button>}</span>
      </div>) : <div className="admin-records-empty"><FilePenLine size={25} /><strong>No {copy.plural} yet</strong><p>Add and publish content when it is ready for the public website.</p></div>}
    </div></div>
    {compose && <EditorialForm copy={copy} onClose={() => setCompose(false)} onSubmit={(draft) => save(draft)} />}
    {selected && <EditorialForm copy={copy} initial={selected} onClose={() => setSelected(null)} onSubmit={(draft) => save(draft, selected.id)} />}
    {viewing && <AdminRecordPreview title={viewing.name} record={viewing as unknown as Record<string, unknown>} onClose={() => setViewing(null)} />}
  </div>;
}

function EditorialForm({ copy, initial, onClose, onSubmit }: { copy: { singular: string; plural: string; imageLabel: string }; initial?: EditorialRecord; onClose: () => void; onSubmit: (draft: Draft) => Promise<boolean> }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const draft: Draft = { name: String(form.get("name") || ""), slug: String(form.get("slug") || ""), summary: String(form.get("summary") || ""), content: String(form.get("content") || ""), imageUrl: String(form.get("imageUrl") || ""), icon: String(form.get("icon") || ""), status: String(form.get("status") || "draft") as ContentStatus, seoTitle: String(form.get("seoTitle") || ""), seoDescription: String(form.get("seoDescription") || "") };
    setBusy(true);
    setError("");
    const saved = await onSubmit(draft);
    if (!saved) setError(`Check the ${copy.singular} name and URL slug.`);
    setBusy(false);
  };
  return <div className="admin-drawer-backdrop" onMouseDown={onClose}><aside className="admin-enquiry-drawer admin-customer-form" onMouseDown={(event) => event.stopPropagation()}>
    <header><div><p>EDITORIAL CONTENT</p><h2>{initial ? `Edit ${copy.singular}` : `Add ${copy.singular}`}</h2><span>Draft first, review then publish. Live page binding activates with the configured content store.</span></div><button type="button" onClick={onClose}><X size={18} /></button></header>
    <form className="admin-drawer-body admin-customer-fields" onSubmit={submit}>
      <div className="admin-customer-fields-grid"><label>Name<input name="name" required defaultValue={initial?.name} /></label><label>URL slug<input name="slug" required defaultValue={initial?.slug} /></label><label>Status<select name="status" defaultValue={initial?.status || "draft"}><option value="draft">Draft</option><option value="published">Published</option><option value="archived">Archived</option></select></label><label>Icon name (services optional)<input name="icon" defaultValue={initial?.icon} /></label><label>{copy.imageLabel}<input name="imageUrl" defaultValue={initial?.imageUrl} /></label><label>SEO title<input name="seoTitle" defaultValue={initial?.seoTitle} /></label></div>
      <label>Summary<textarea name="summary" defaultValue={initial?.summary} /></label>
      <label>Detailed content<textarea className="admin-editorial-content" name="content" defaultValue={initial?.content} /></label>
      <label>SEO description<textarea name="seoDescription" defaultValue={initial?.seoDescription} /></label>
      {error && <p className="admin-form-error">{error}</p>}
      <div className="admin-customer-form-actions"><button type="button" className="admin-drawer-secondary" onClick={onClose}>Cancel</button><button className="admin-os-primary" disabled={busy}>{busy ? "Saving..." : `Save ${copy.singular}`}<ArrowRight size={15} /></button></div>
    </form>
  </aside></div>;
}
