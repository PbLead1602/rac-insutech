"use client";

import { Suspense } from "react";
import AdminQuotationCreatePanel from "@/components/admin-quotation-create-panel";

export default function AdminQuotationCreatePage() {
  return <main className="admin-create-page"><Suspense fallback={<div className="admin-loading">Loading quotation creator...</div>}><AdminQuotationCreatePanel /></Suspense></main>;
}
