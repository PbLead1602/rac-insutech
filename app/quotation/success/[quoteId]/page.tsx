import Link from "next/link";
import { CheckCircle2, FileText, MessageCircle } from "lucide-react";
import { CatalogueFooter, CatalogueHeader } from "@/components/catalogue-header";
import { whatsappContactHref } from "@/lib/contact";
import { getQuotationByAccessToken } from "@/lib/repositories/quotations";

export const dynamic = "force-dynamic";

export default async function QuotationSuccessPage({ params, searchParams }: { params: Promise<{ quoteId: string }>; searchParams: Promise<{ token?: string; email?: string }> }) {
  const [{ quoteId }, { token = "", email = "" }] = await Promise.all([params, searchParams]);
  const quotation = await getQuotationByAccessToken(token);
  const validQuote = quotation?.id === quoteId ? quotation : null;

  const emailSent = email === "sent" || Boolean(validQuote?.lastSentAt);
  return <main className="quotation-page"><CatalogueHeader /><section className="quotation-success catalogue-shell"><CheckCircle2 size={48} /><p className="catalogue-kicker"><span /> QUOTATION GENERATED</p><h1>{validQuote ? `${validQuote.quoteNumber} is ready.` : "Your quotation request is ready for review."}</h1><p>{validQuote ? emailSent ? "Your quotation has been added to your RAC customer portal and sent to your registered email address. You will see the quotation confirmation in your email." : "Your quotation has been added to your RAC customer portal. We could not yet confirm email delivery, so please also access it securely from My quotations." : "For privacy, reopen the quotation from your approved customer account."}</p>{validQuote && <div className="quotation-success-actions"><Link className="quotation-primary" href={`/account/quotations/${validQuote.id}`}><FileText size={17} /> View and download quote</Link><Link className="quotation-outline" href="/account/quotations">My quotations</Link><a className="quotation-contact" href={whatsappContactHref(`quotation ${validQuote.quoteNumber}`)} target="_blank" rel="noreferrer"><MessageCircle size={17} /> Contact RAC</a></div>}<Link className="quotation-back-link" href="/account">Go to customer dashboard</Link></section><CatalogueFooter /></main>;
}
