"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Building2 } from "lucide-react";
import { adminFetch } from "@/lib/auth/admin-client";
import type { BrandRecord, ContentStatus } from "@/lib/db/types";

export default function AdminBrandCreatePanel() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const payload = {
      name: String(form.get("name") || ""), slug: String(form.get("slug") || ""), description: String(form.get("description") || ""), logoUrl: String(form.get("logoUrl") || ""), websiteUrl: String(form.get("websiteUrl") || ""), authorizationNote: String(form.get("authorizationNote") || ""), status: String(form.get("status") || "draft") as ContentStatus, seoTitle: String(form.get("seoTitle") || ""), seoDescription: String(form.get("seoDescription") || ""),
    };
    setBusy(true); setError("");
    const response = await adminFetch("/api/admin/brands", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    const data = await response.json() as { brand?: BrandRecord; message?: string };
    setBusy(false);
    if (!response.ok || !data.brand) { setError(data.message || "Could not create the brand record."); return; }
    router.push("/admin/brands");
  };
  return <div className="admin-os-content"><section className="admin-os-module-intro"><div><p>BRAND CONTROL</p><h2>Add brand record</h2><span>Only publish supplier wording after RAC has verified it and obtained the right approval.</span></div><button type="button" onClick={() => router.push("/admin/brands")}>Back to brands</button></section><form className="admin-customer-fields admin-os-card" onSubmit={submit}><div className="admin-customer-fields-grid"><label>Name<input name="name" required autoFocus /></label><label>URL slug<input name="slug" required placeholder="supplier-name" /></label><label>Website URL<input name="websiteUrl" type="url" /></label><label>Logo path / URL<input name="logoUrl" /></label><label>Status<select name="status" defaultValue="draft"><option value="draft">Draft</option><option value="published">Published</option><option value="archived">Archived</option></select></label><label>SEO title<input name="seoTitle" /></label></div><label>Description<textarea name="description" /></label><label>Authorization note<textarea name="authorizationNote" placeholder="Keep private unless legally approved for public display." /></label><label>SEO description<textarea name="seoDescription" /></label>{error && <p className="admin-form-error">{error}</p>}<div className="admin-customer-form-actions"><button type="button" className="admin-drawer-secondary" onClick={() => router.push("/admin/brands")}>Cancel</button><button className="admin-os-primary" disabled={busy}><Building2 size={16} />{busy ? "Saving..." : "Save brand"}<ArrowRight size={15} /></button></div></form></div>;
}
