import { notFound } from "next/navigation";
import { FileText, MessageCircle, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { CatalogueFooter, CatalogueHeader } from "@/components/catalogue-header";
import { whatsappContactHref } from "@/lib/contact";
import { getQuotationByAccessToken } from "@/lib/repositories/quotations";
import type { QuotationLineRecord } from "@/lib/db/types";

export const dynamic = "force-dynamic";

const currency = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", minimumFractionDigits: 2, maximumFractionDigits: 2 });

function BuiltUpNbrQuoteDetails({ item }: { item: QuotationLineRecord }) {
  const custom = item.customBuiltUp;
  if (!custom) return null;
  return <div className="secure-built-up-details"><span>{custom.baseDiameterMm} mm pipe · {custom.requiredTotalThicknessMm} mm insulation · {custom.pipeLengthM} m length · {custom.materialClassSnapshot}</span><ul>{custom.layers.map((layer) => <li key={layer.layerNumber}>Layer {layer.layerNumber}: {layer.thicknessMm} mm {layer.lamination} NBR Sheet</li>)}</ul><small>Finished OD {custom.finishedOuterDiameterMm.toFixed(2)} mm · Total sheet consumption {custom.totalQuotedAreaM2.toFixed(2)} m² · Grouped basic total {currency.format(item.amount)}</small></div>;
}

function BuiltUpNbrCommercialColumns({ item }: { item: QuotationLineRecord }) {
  const layers = item.customBuiltUp?.layers || [];
  return <><span className="secure-built-up-commercial">{layers.map((layer) => <span key={layer.layerNumber}><small>Layer {layer.layerNumber}</small>{layer.quotedAreaM2.toFixed(2)} m²</span>)}</span><span className="secure-built-up-commercial">{layers.map((layer) => <span key={layer.layerNumber}><small>Layer {layer.layerNumber}</small>{currency.format(layer.rate)}<small>per m²</small></span>)}</span><span className="secure-built-up-commercial secure-built-up-amounts">{layers.map((layer) => <span key={layer.layerNumber}><small>Layer {layer.layerNumber}</small>{currency.format(layer.amount)}</span>)}</span></>;
}

export default async function SecureQuotationPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const quotation = await getQuotationByAccessToken(token);
  if (!quotation) notFound();
  return <main className="quotation-page"><CatalogueHeader /><section className="secure-quote catalogue-shell"><div className="secure-quote-top"><div><p className="catalogue-kicker"><span /> SECURE QUOTATION</p><h1>{quotation.quoteNumber}</h1><p>Prepared for {quotation.customer.company}. Valid for {quotation.validityDays} days from issue.</p></div><Link className="quotation-primary" href={`/account/quotations/${quotation.id}`}><FileText size={17} /> Open in customer portal</Link></div><div className="secure-quote-customer"><div><span>Customer</span><strong>{quotation.customer.fullName}</strong><p>{quotation.customer.company}</p></div><div><span>Project</span><strong>{quotation.customer.projectName || "To be confirmed"}</strong><p>{quotation.customer.projectLocation || quotation.customer.city || "Location to be confirmed"}</p></div><div><span>Quote status</span><strong>Generated</strong><p>Transport: At Actual</p></div></div><div className="secure-quote-lines"><div className="secure-quote-heading"><span>Sr No</span><span>Product</span><span>Supply quantity</span><span>Rate</span><span>Amount</span></div>{quotation.items.map((item, index) => <div className={`secure-quote-line${item.customBuiltUp ? " custom-built-up" : ""}`} key={`${item.variantId}-${index}`}><span className="secure-quote-serial">{index + 1}</span><span><strong>{item.productName}</strong><small>{item.configuration}</small><BuiltUpNbrQuoteDetails item={item} /></span>{item.customBuiltUp ? <BuiltUpNbrCommercialColumns item={item} /> : <><span>{item.technicalQuantity}</span><span>{currency.format(item.rate)}<small>{item.rateUnit}</small></span><strong>{currency.format(item.amount)}</strong></>}</div>)}</div><div className="secure-quote-bottom"><div className="secure-quote-note"><ShieldCheck size={19} /><p><strong>Review required before order acceptance.</strong> Sign in to your approved RAC account to download the protected PDF or request a revision.</p></div><div className="secure-quote-total"><span>Subtotal <b>{currency.format(quotation.subtotal)}</b></span><span>GST ({quotation.gstRate}%) <b>{currency.format(quotation.gstAmount)}</b></span><span>Transport <b>At Actual</b></span><strong>Total <b>{currency.format(quotation.total)}</b></strong></div></div><div className="secure-quote-actions"><Link className="quotation-primary" href={`/account/quotations/${quotation.id}`}><FileText size={17} /> Download in customer portal</Link><a className="quotation-contact" href={whatsappContactHref(`quotation ${quotation.quoteNumber}`)} target="_blank" rel="noreferrer"><MessageCircle size={17} /> Contact RAC on WhatsApp</a></div></section><CatalogueFooter /></main>;
}
