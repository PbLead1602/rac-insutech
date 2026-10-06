import { NextResponse } from "next/server";
import { getAdminRequestContext } from "@/lib/auth/admin-server";
import { createAdminQuotation, deleteAdminQuotations, listAdminQuotations } from "@/lib/repositories/quotations";
import { adminQuotationBulkDeleteSchema, adminQuotationCreateSchema } from "@/lib/validation/admin-quotations";
import { createQuotationEnquiry, finaliseQuotationSalesLinks, resolveSalesLinks } from "@/lib/repositories/sales-workflow";
import { priceCustomBuiltUpNbrItem } from "@/lib/quotations/built-up-nbr-pricing";
import { applyAdminQuotationDiscount, getServerPricedVariants, priceAdminStandardQuotationLines } from "@/lib/quotations/pricing";
import { getAdminCustomer } from "@/lib/repositories/customers";
import { getBuiltUpNbrWastagePercent } from "@/lib/repositories/settings";
import type { CustomerType, QuotationCustomer } from "@/lib/db/types";

// Quotation email delivery creates PDF attachments and must use the Node runtime.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function quotationCustomerType(type: CustomerType): QuotationCustomer["customerType"] {
  if (type === "consultant" || type === "dealer" || type === "end_user") return type;
  if (type === "hvac_contractor" || type === "peb_contractor") return "contractor";
  return "other";
}

export async function GET(request: Request) {
  if (!await getAdminRequestContext(request)) return NextResponse.json({ ok: false, message: "Authorised Admin access is required." }, { status: 401 });
  try {
    const quotations = await listAdminQuotations(new URL(request.url).searchParams.get("q") || "");
    return NextResponse.json({ ok: true, quotations });
  } catch (error) {
    return NextResponse.json({ ok: false, message: error instanceof Error ? error.message : "Could not load quotations." }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  if (!await getAdminRequestContext(request)) return NextResponse.json({ ok: false, message: "Authorised Admin access is required." }, { status: 401 });
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, message: "Select one or more quotations to delete." }, { status: 400 });
  }
  const parsed = adminQuotationBulkDeleteSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ ok: false, message: parsed.error.issues[0]?.message || "Check the selected quotations." }, { status: 400 });
  try {
    const result = await deleteAdminQuotations(parsed.data.ids);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    console.error("Admin quotation bulk deletion failed", {
      count: parsed.data.ids.length,
      message: error instanceof Error ? error.message : "Unknown error",
    });
    return NextResponse.json({ ok: false, message: "Could not delete the selected quotations." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  if (!await getAdminRequestContext(request)) return NextResponse.json({ ok: false, message: "Authorised Admin access is required." }, { status: 401 });
  const parsed = adminQuotationCreateSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ ok: false, message: parsed.error.issues[0]?.message || "Check the quotation details." }, { status: 400 });
  let stage = "customer resolution";
  try {
    const selectedCustomerDetail = parsed.data.customerId ? await getAdminCustomer(parsed.data.customerId) : null;
    if (parsed.data.customerId && !selectedCustomerDetail) {
      return NextResponse.json({ ok: false, message: "The selected customer record no longer exists." }, { status: 404 });
    }
    // A Customer Record is the source of truth for a quotation created from
    // Customer Record & Analysis. The Admin supplies only the project fields.
    const customer: QuotationCustomer = selectedCustomerDetail ? {
      ...parsed.data.customer,
      fullName: selectedCustomerDetail.customer.fullName,
      company: selectedCustomerDetail.customer.company || selectedCustomerDetail.customer.fullName,
      mobile: selectedCustomerDetail.customer.phone || "",
      email: selectedCustomerDetail.customer.email || "",
      gstin: selectedCustomerDetail.customer.gstin || "",
      city: selectedCustomerDetail.customer.city || "",
      state: selectedCustomerDetail.customer.state || "",
      pinCode: selectedCustomerDetail.customer.pinCode || "",
      billingAddress: selectedCustomerDetail.customer.billingAddress || "",
      shippingAddress: selectedCustomerDetail.customer.shippingAddress || "",
      customerType: quotationCustomerType(selectedCustomerDetail.customer.customerType),
      notes: selectedCustomerDetail.customer.notes || parsed.data.customer.notes,
    } : parsed.data.customer;
    stage = "sales link resolution";
    const salesLinks = await resolveSalesLinks(customer, { customerId: selectedCustomerDetail?.customer.id });
    // The browser supplies selections only. Standard lines are always rebuilt
    // from one current active Rate Card snapshot immediately before saving.
    // Loading each line independently can exceed the Worker subrequest limit
    // for a legitimate large quotation.
    stage = "active rate-card snapshot";
    const pricedVariants = await getServerPricedVariants([
      ...parsed.data.items.map((item) => item.variantId),
      ...parsed.data.customBuiltUpItems.flatMap((item) => item.layers.map((layer) => layer.variantId)),
    ]);
    stage = "standard line pricing";
    const standardItems = applyAdminQuotationDiscount(
      await priceAdminStandardQuotationLines(parsed.data.items, pricedVariants),
      parsed.data.discountPercent,
    );
    stage = "custom built-up line pricing";
    const builtUpWastagePercent = parsed.data.customBuiltUpItems.length ? await getBuiltUpNbrWastagePercent() : undefined;
    const customItems = await Promise.all(parsed.data.customBuiltUpItems.map(({ overrideAmount, overrideReason, ...selection }) => priceCustomBuiltUpNbrItem(
      selection,
      { overrideAmount, overrideReason, wastagePercent: builtUpWastagePercent, discountPercent: parsed.data.discountPercent },
      pricedVariants,
    )));
    const items = [...standardItems, ...customItems];
    stage = "enquiry creation";
    const enquiry = parsed.data.enquiryId
      ? undefined
      : await createQuotationEnquiry(customer, salesLinks, {
        product: items.map((item) => item.productName).filter(Boolean).join(", ").slice(0, 500),
        quantity: `${items.length} quotation line${items.length === 1 ? "" : "s"}`,
        source: "admin",
      });
    salesLinks.enquiryId = parsed.data.enquiryId || enquiry?.id;
    stage = "quotation storage";
    const created = await createAdminQuotation({
      customer,
      items,
      gstRate: parsed.data.gstRate,
      transportMode: parsed.data.transportMode,
      transportCharge: parsed.data.transportCharge,
      enquiryId: parsed.data.enquiryId,
      validUntil: parsed.data.validUntil || undefined,
      internalNotes: parsed.data.internalNotes,
      ...salesLinks,
    });
    stage = "sales-link finalisation";
    const quotation = await finaliseQuotationSalesLinks(created.quotation, salesLinks);
    return NextResponse.json({ ok: true, quotation, notification: { emailDelivered: false, emailMode: "awaiting_admin_confirmation" } }, { status: 201 });
  } catch (error) {
    console.error("Admin quotation creation failed", {
      stage,
      message: error instanceof Error ? error.message : "Unknown error",
    });
    return NextResponse.json({ ok: false, message: error instanceof Error ? error.message : "Could not create the quotation." }, { status: 500 });
  }
}
