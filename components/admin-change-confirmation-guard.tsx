"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, Archive, CheckCircle2, FilePenLine, Trash2, X } from "lucide-react";

export type AdminMutationPreview = {
  method: "PATCH" | "PUT" | "DELETE";
  url: string;
  values: Array<{ label: string; value: string }>;
};

declare global {
  interface Window {
    __racConfirmAdminMutation?: (preview: AdminMutationPreview) => Promise<boolean>;
  }
}

function readable(value: unknown) {
  if (value === null || value === undefined || value === "") return "Not set";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "object") {
    const text = JSON.stringify(value, null, 2);
    return text.length > 560 ? `${text.slice(0, 557)}...` : text;
  }
  const text = String(value);
  return text.length > 560 ? `${text.slice(0, 557)}...` : text;
}

function labelFor(key: string) {
  return key
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function actionFor(preview: AdminMutationPreview) {
  const archiveChange = preview.values.some((item) => item.label === "Archived" && item.value === "Yes")
    || preview.values.some((item) => item.label === "Status" && item.value.toLowerCase() === "archived");
  if (preview.method === "DELETE") return { title: "Delete this record?", description: "This action permanently removes the selected record. It cannot be undone.", button: "Delete permanently", danger: true, Icon: Trash2 };
  if (archiveChange) return { title: "Archive this record?", description: "The record will be removed from active use but its history will stay available for audit.", button: "Archive record", danger: true, Icon: Archive };
  return { title: "Review changes before saving", description: "Please check the proposed values. Nothing will be changed until you confirm.", button: "Confirm changes", danger: false, Icon: FilePenLine };
}

export default function AdminChangeConfirmationGuard() {
  const [pending, setPending] = useState<{ preview: AdminMutationPreview; resolve: (approved: boolean) => void } | null>(null);

  useEffect(() => {
    window.__racConfirmAdminMutation = (preview) => new Promise<boolean>((resolve) => setPending({ preview, resolve }));
    return () => { delete window.__racConfirmAdminMutation; };
  }, []);

  if (!pending) return null;
  const action = actionFor(pending.preview);
  const complete = (approved: boolean) => {
    pending.resolve(approved);
    setPending(null);
  };
  const ActionIcon = action.Icon;

  return <div className="admin-change-confirm-backdrop" role="presentation" onMouseDown={() => complete(false)}>
    <section className={`admin-change-confirm ${action.danger ? "danger" : ""}`} role="dialog" aria-modal="true" aria-labelledby="admin-change-confirm-title" onMouseDown={(event) => event.stopPropagation()}>
      <header>
        <span className="admin-change-confirm-icon"><ActionIcon size={20} /></span>
        <button type="button" onClick={() => complete(false)} aria-label="Cancel change"><X size={18} /></button>
      </header>
      <div className="admin-change-confirm-copy">
        <p>{action.danger ? "CONFIRM DESTRUCTIVE ACTION" : "CHANGE PREVIEW"}</p>
        <h2 id="admin-change-confirm-title">{action.title}</h2>
        <span>{action.description}</span>
      </div>
      {pending.preview.values.length > 0 && <section className="admin-change-preview" aria-label="Proposed values">
        <h3>Proposed values</h3>
        <dl>{pending.preview.values.map((item) => <div key={`${item.label}-${item.value}`}><dt>{item.label}</dt><dd>{item.value}</dd></div>)}</dl>
      </section>}
      {action.danger && <p className="admin-change-confirm-warning"><AlertTriangle size={15} />Review the effect carefully before continuing.</p>}
      <footer>
        <button type="button" className="admin-drawer-secondary" onClick={() => complete(false)}>Cancel</button>
        <button type="button" className={action.danger ? "admin-change-danger" : "admin-os-primary"} onClick={() => complete(true)}>{action.danger ? <AlertTriangle size={15} /> : <CheckCircle2 size={15} />}{action.button}</button>
      </footer>
    </section>
  </div>;
}

export function previewEntries(value: unknown): Array<{ label: string; value: string }> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return [];
  return Object.entries(value as Record<string, unknown>)
    .filter(([key]) => !["id", "createdAt", "updatedAt"].includes(key))
    .map(([key, item]) => ({ label: labelFor(key), value: readable(item) }));
}
