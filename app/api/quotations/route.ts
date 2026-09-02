import { NextResponse } from "next/server";
import { createQuotation, updateAdminQuotation } from "@/lib/repositories/quotations";
import { sendQuotationNotifications } from "@/lib/services/brevo";
import { verifyTurnstile } from "@/lib/services/turnstile";
import { serverEnv } from "@/lib/env/server";
import { calculateQuoteLine } from "@/lib/quotations/catalogue";
import { getServerPricedVariant } from "@/lib/quotations/pricing";
import { priceCustomBuiltUpNbrItem } from "@/lib/quotations/built-up-nbr-pricing";
import { quotationSubmissionSchema } from "@/lib/validation/quotation";
import { finaliseQuotationSalesLinks, resolveSalesLinks } from "@/lib/repositories/sales-workflow";
import { customerAccessFailure, getCustomerRequestContext } from "@/lib/auth/customer-server";
import { ensureEnquiryBelongsToCustomerAccount } from "@/lib/repositories/customer-accounts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = quotationSubmissionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ ok: false, message: parsed.error.issues[0]?.message || "Please check the quotation fields." }, { status: 400 });
    }

    // Never rely on a hidden button or a client-side redirect for commercial
    // access. The protected route verifies the authenticated account and its
    // RAC approval state before any price can be issued.
    const customerContext = await getCustomerRequestContext(request);
    const accessFailure = customerAccessFailure(customerContext);
    if (accessFailure) return NextResponse.json({ ok: false, message: accessFailure.message }, { status: accessFailure.status });
    if (!customerContext?.customer) return NextResponse.json({ ok: false, message: "Your customer profile is not ready yet. Please contact RAC." }, { status: 403 });
    const sourceEnquiry = parsed.data.enquiryId
      ? await ensureEnquiryBelongsToCustomerAccount(parsed.data.enquiryId, customerContext)
      : undefined;

    const verification = await verifyTurnstile(
      parsed.data.turnstileToken,
      request.headers.get("cf-connecting-ip") || request.headers.get("x-forwarded-for")?.split(",")[0]?.trim(),
    );
    if (!verification.ok) return NextResponse.json({ ok: false, message: verification.reason }, { status: 400 });

    // The browser submits only variant IDs and requested quantities. Price,
    // supply quantity, rate-card unit rules, carton rounding, GST and totals are always recomputed here.
    const standardItems = await Promise.all(parsed.data.items.map(async (item) => {
      const variant = await getServerPricedVariant(item.variantId);
      if (!variant) throw new Error("One selected product configuration is no longer available. Please configure it again.");
      return calculateQuoteLine(variant, item.quantity, item.orderUnit);
    }));
    // Custom-diameter NBR supplies only dimensions and sheet variant IDs. The
    // service re-reads active rate cards, derives thickness/facing, applies
    // Admin-configured wastage, and ignores all browser pricing values.
    const customItems = await Promise.all(parsed.data.customBuiltUpItems.map((item) => priceCustomBuiltUpNbrItem(item)));
    const itemResults = [...standardItems, ...customItems];
    const subtotal = itemResults.reduce((total, item) => total + item.amount, 0);
    const gstRate = serverEnv.quotationGstRate;
    const gstAmount = Number((subtotal * (gstRate / 100)).toFixed(2));
    const total = Number((subtotal + gstAmount).toFixed(2));
    // Account-owned identity is canonical. Project fields remain editable per
    // quotation, but a browser cannot create a quote under another customer.
    const customer = {
      ...parsed.data.customer,
      fullName: customerContext.customer.fullName || customerContext.account.fullName,
      company: customerContext.customer.company || customerContext.account.companyName || customerContext.account.fullName,
      mobile: customerContext.customer.phone || customerContext.account.mobile,
      email: customerContext.customer.email || customerContext.account.email,
      gstin: customerContext.customer.gstin || customerContext.account.gstin || "",
      customerType: customerContext.account.customerType,
    };
    const salesLinks = await resolveSalesLinks(customer, { enquiryId: sourceEnquiry?.id });
    if (salesLinks.customerId !== customerContext.customer.id) {
      return NextResponse.json({ ok: false, message: "Your customer profile could not be matched safely. Please contact RAC." }, { status: 409 });
    }
    const { quotation: createdQuotation, mode: storageMode } = await createQuotation({
      customer,
      items: itemResults,
      subtotal,
      gstRate,
      gstAmount,
      total,
      customerId: customerContext.customer.id,
      accountId: customerContext.account.id,
      projectId: salesLinks.projectId,
      enquiryId: salesLinks.enquiryId,
      source: salesLinks.enquiryId ? "enquiry_converted" : "website_auto_quote",
    });
    let quotation = await finaliseQuotationSalesLinks(createdQuotation, salesLinks);
    const email = await sendQuotationNotifications(quotation);
    // A quote is generated first; it becomes Sent only when Brevo accepts the
    // customer-only email. The status is therefore operationally truthful in
    // both the Admin panel and the customer portal.
    if (email.delivered) quotation = (await updateAdminQuotation(quotation.id, { status: "sent" })) || quotation;

    return NextResponse.json({
      ok: true,
      quotation: {
        id: quotation.id,
        quoteNumber: quotation.quoteNumber,
        accessToken: quotation.accessToken,
        status: quotation.status,
      },
      notification: { emailDelivered: email.delivered, emailMode: email.mode },
      integrations: { storage: storageMode, email: email.mode, captcha: verification.mode },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "We could not generate this quotation.";
    console.error("Quotation generation failed", error);
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}
