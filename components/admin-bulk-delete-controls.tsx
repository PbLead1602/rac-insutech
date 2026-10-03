"use client";

import { Trash2 } from "lucide-react";

type AdminBulkDeleteControlsProps = {
  label: string;
  total: number;
  selected: number;
  allSelected: boolean;
  deleting: boolean;
  note: string;
  onToggleAll: () => void;
  onDelete: () => void;
};

/** Shared, Admin-only controls for explicit permanent record deletion. */
export default function AdminBulkDeleteControls({ label, total, selected, allSelected, deleting, note, onToggleAll, onDelete }: AdminBulkDeleteControlsProps) {
  if (!total) return null;
  return <section className="admin-bulk-delete-actions" aria-label={`Bulk ${label.toLowerCase()} deletion controls`}>
    <label><input type="checkbox" checked={allSelected} onChange={onToggleAll} />Select {label.toLowerCase()} ({total})</label>
    <button type="button" disabled={!selected || deleting} onClick={onDelete}><Trash2 size={15} />{deleting ? "Deleting..." : `Delete selected (${selected})`}</button>
    <span>{note}</span>
  </section>;
}
