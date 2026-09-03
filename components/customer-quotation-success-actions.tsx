"use client";

import { useState } from "react";
import Link from "next/link";
import { FileText, MailCheck, MessageCircle } from "lucide-react";
import { customerFetch } from "@/lib/auth/customer-client";
import { whatsappContactHref } from "@/lib/contact";

export function CustomerQuotationSuccessActions({ quoteId, quoteNumber, initiallySent }: { quoteId: string; quoteNumber: string; initiallySent: boolean }) {
  const [sent, setSent] = useState(initiallySent);
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState("");

  const sendQuotation = async () => {
    setSending(true);
    setMessage("");
    try {
      const response = await customerFetch(`/api/customer-portal/quotations/${quoteId}/send`, { method: "POST" });
      const result = await response.json() as { ok?: boolean; message?: string };
      if (!response.ok || !result.ok) throw new Error(result.message || "Could not send the quotation email.");
      setSent(true);
      setMessage("Quotation sent to your registered email address.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not send the quotation email.");
    } finally {
      setSending(false);
    }
  };

  return <>
    {message && <p className={`quotation-send-message ${sent ? "success" : "error"}`} role="status">{message}</p>}
    <div className="quotation-success-actions">
      <button type="button" className="quotation-primary" onClick={() => void sendQuotation()} disabled={sending || sent}>
        <MailCheck size={17} />{sending ? "Sending quotation..." : sent ? "Quotation sent to your email" : "Send quotation to my email"}
      </button>
      <Link className="quotation-outline" href={`/account/quotations/${quoteId}`}><FileText size={17} />View and download quote</Link>
      <Link className="quotation-outline" href="/account/quotations">My quotations</Link>
      <a className="quotation-contact" href={whatsappContactHref(`quotation ${quoteNumber}`)} target="_blank" rel="noreferrer"><MessageCircle size={17} />Contact RAC</a>
    </div>
  </>;
}
