import { NextResponse } from "next/server";
import { createEnquiry, updateAdminEnquiry } from "@/lib/repositories/enquiries";
import { createEnquiryContinuation } from "@/lib/repositories/customer-accounts";
import { findOrCreateProjectForQuotation } from "@/lib/repositories/projects";
import { sendRfqNotifications } from "@/lib/services/brevo";
import { rfqSchema } from "@/lib/validation/rfq";
import { getCustomerRequestContext } from "@/lib/auth/customer-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;
const allowedAttachmentTypes = new Set([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel",
  "application/acad",
  "image/png",
  "image/jpeg",
]);

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const data = Object.fromEntries(
      [...formData.entries()]
        .filter(([key, value]) => key !== "attachment" && typeof value === "string")
        .map(([key, value]) => [key, String(value)]),
    );
    const payload = rfqSchema.safeParse(data);
    if (!payload.success) {
      return NextResponse.json(
        { ok: false, message: payload.error.issues[0]?.message || "Please check the form fields." },
        { status: 400 },
      );
    }

    // Enquiries are intentionally open to every visitor. Email confirmation
    // happens only when a visitor chooses to register for an account.

    const attachmentValue = formData.get("attachment");
    let attachment: { name: string; type: string; size: number; buffer: Buffer } | undefined;
    if (attachmentValue instanceof File && attachmentValue.size > 0) {
      if (attachmentValue.size > MAX_ATTACHMENT_BYTES) {
        return NextResponse.json({ ok: false, message: "Attachment must be 10 MB or smaller." }, { status: 400 });
      }
      if (attachmentValue.type && !allowedAttachmentTypes.has(attachmentValue.type)) {
        return NextResponse.json({ ok: false, message: "Upload a PDF, XLSX, DWG, PNG or JPG file." }, { status: 400 });
      }
      attachment = {
        name: attachmentValue.name,
        type: attachmentValue.type,
        size: attachmentValue.size,
        buffer: Buffer.from(await attachmentValue.arrayBuffer()),
      };
    }

    // Enquiry capture remains open to every visitor. When an approved customer
    // is already signed in, securely attach the enquiry to that account so
    // Admin can see it in that customer's complete history.
    const customerContext = await getCustomerRequestContext(request);
    const links = customerContext
      ? {
          accountId: customerContext.account.id,
          customerId: customerContext.customer?.id,
        }
      : undefined;
    // A signed-in customer's commercial identity always comes from their
    // account record. This prevents a browser from attaching a customer-owned
    // enquiry to a different name, email or mobile number.
    const canonicalInput = customerContext ? {
      ...payload.data,
      name: customerContext.customer?.fullName || customerContext.account.fullName || payload.data.name,
      company: customerContext.customer?.company || customerContext.account.companyName || customerContext.account.fullName || payload.data.company,
      mobile: customerContext.customer?.phone || customerContext.account.mobile || payload.data.mobile,
      email: customerContext.customer?.email || customerContext.account.email || payload.data.email,
      city: payload.data.city || customerContext.customer?.city || "",
      state: payload.data.state || customerContext.customer?.state || "",
      pinCode: payload.data.pinCode || customerContext.customer?.pinCode || "",
      customerType: customerContext.account.customerType,
    } : payload.data;
    const { enquiry, mode: storageMode, created } = await createEnquiry(canonicalInput, attachment, links);
    const directToQuotationBuilder = customerContext?.account.status === "active" && Boolean(customerContext.customer);

    if (directToQuotationBuilder && customerContext?.customer) {
      // Store the project as soon as a logged-in customer submits an enquiry.
      // The same project is reused when that enquiry becomes a quotation.
      try {
        const project = await findOrCreateProjectForQuotation({
          customer: {
            fullName: canonicalInput.name,
            company: canonicalInput.company,
            mobile: canonicalInput.mobile,
            email: canonicalInput.email,
            city: canonicalInput.city,
            state: canonicalInput.state,
            pinCode: canonicalInput.pinCode,
            customerType: canonicalInput.customerType,
            projectName: canonicalInput.projectName,
            projectLocation: canonicalInput.projectLocation,
            deliveryPreference: canonicalInput.deliveryPreference,
            notes: [
              canonicalInput.product ? `Product / material: ${canonicalInput.product}` : "",
              canonicalInput.application ? `Application: ${canonicalInput.application}` : "",
              canonicalInput.deliveryPreference ? `Delivery preference: ${canonicalInput.deliveryPreference}` : "",
              canonicalInput.message,
            ].filter(Boolean).join("\n"),
          },
          customerId: customerContext.customer.id,
          fallbackTitle: `${canonicalInput.company || canonicalInput.name} enquiry`,
        });
        if (project) {
          await updateAdminEnquiry(enquiry.id, {
            accountId: customerContext.account.id,
            customerId: customerContext.customer.id,
            projectId: project.project.id,
          });
        }
      } catch (projectError) {
        // The enquiry is already captured and the quotation workflow will
        // safely retry project creation. Do not make the customer resubmit.
        console.error("RFQ project link failed", {
          enquiryId: enquiry.id,
          message: projectError instanceof Error ? projectError.message : "Unknown project link error",
        });
      }
    }

    let continuationToken: string | undefined;
    if (!directToQuotationBuilder) {
      try {
        continuationToken = (await createEnquiryContinuation(enquiry.id)).token;
      } catch (error) {
        // The enquiry is already safely stored. Do not invite the visitor to
        // submit it again and create a duplicate when only the next step failed.
        console.error("RFQ continuation creation failed", {
          enquiryId: enquiry.id,
          message: error instanceof Error ? error.message : "Unknown continuation error",
        });
        return NextResponse.json(
          {
            ok: false,
            saved: true,
            id: enquiry.id,
            enquiryNumber: enquiry.enquiryNumber,
            message: "Your enquiry has been saved. We could not start quotation access right now; please sign in from My Account or contact RAC with this enquiry number.",
          },
          { status: 503 },
        );
      }
    }

    // Email is an operational notification, not a prerequisite for recording
    // a lead or permitting the visitor to continue securely.
    const email = created
      ? await sendRfqNotifications(enquiry)
      : { delivered: false, mode: storageMode };

    return NextResponse.json({
      ok: true,
      id: enquiry.id,
      enquiryNumber: enquiry.enquiryNumber,
      continuationToken,
      directToQuotationBuilder,
      message: "Thank you — RAC’s technical team will be in touch shortly.",
      integrations: { storage: storageMode, email: email.mode },
    });
  } catch (error) {
    console.error("RFQ submission failed", error);
    return NextResponse.json(
      { ok: false, message: "We could not submit your request. Please try again or contact RAC directly." },
      { status: 500 },
    );
  }
}
