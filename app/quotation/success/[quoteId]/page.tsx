import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { CatalogueFooter, CatalogueHeader } from "@/components/catalogue-header";
import { CustomerQuotationSuccessActions } from "@/components/customer-quotation-success-actions";
import { getQuotationByAccessToken } from "@/lib/repositories/quotations";

export const dynamic = "force-dynamic";

export default async function QuotationSuccessPage({ params, searchParams }: { params: Promise<{ quoteId: string }>; searchParams: Promise<{ token?: string }> }) {
  const [{ quoteId }, { token = "" }] = await Promise.all([params, searchParams]);
  const quotation = await getQuotationByAccessToken(token);
  const validQuote = quotation?.id === quoteId ? quotation : null;

  const emailSent = Boolean(validQuote?.lastSentAt);
  return <main className="quotation-page"><CatalogueHeader /><section className="quotation-success catalogue-shell"><CheckCircle2 size={48} /><p className="catalogue-kicker"><span /> QUOTATION GENERATED</p><h1>{validQuote ? `${validQuote.quoteNumber} is ready.` : "Your quotation request is ready for review."}</h1><p>{validQuote ? emailSent ? "Your quotation has been added to your RAC customer portal and sent to your registered email address." : "Your quotation has been added to your RAC customer portal. Review it now, then choose Send quotation to email the PDF to your registered address." : "For privacy, reopen the quotation from your approved customer account."}</p>{validQuote && <CustomerQuotationSuccessActions quoteId={validQuote.id} quoteNumber={validQuote.quoteNumber} initiallySent={emailSent} />}<Link className="quotation-back-link" href="/account">Go to customer dashboard</Link></section><CatalogueFooter /></main>;
}
