"use client";

import { Eye, X } from "lucide-react";
import { previewEntries } from "@/components/admin-change-confirmation-guard";

export default function AdminRecordPreview({ title, record, onClose }: { title: string; record: Record<string, unknown>; onClose: () => void }) {
  const values = previewEntries(record);
  return <div className="admin-change-confirm-backdrop" role="presentation" onMouseDown={onClose}>
    <section className="admin-record-preview-dialog" role="dialog" aria-modal="true" aria-labelledby="admin-record-preview-title" onMouseDown={(event) => event.stopPropagation()}>
      <header><span><Eye size={20} /></span><button type="button" onClick={onClose} aria-label="Close record preview"><X size={18} /></button></header>
      <div><p>RECORD VIEW</p><h2 id="admin-record-preview-title">{title}</h2><span>Read-only details. Choose Edit only when you need to change this record.</span></div>
      <dl>{values.map((item) => <div key={`${item.label}-${item.value}`}><dt>{item.label}</dt><dd>{item.value}</dd></div>)}</dl>
      <footer><button type="button" className="admin-os-primary" onClick={onClose}>Done</button></footer>
    </section>
  </div>;
}
