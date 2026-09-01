import { NextResponse } from "next/server";
import { createEnquiry } from "@/lib/repositories/enquiries";
import { createEnquiryContinuation } from "@/lib/repositories/customer-accounts";
import { sendRfqNotifications } from "@/lib/services/brevo";
import { rfqSchema } from "@/lib/validation/rfq";

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

    const { enquiry, mode: storageMode, created } = await createEnquiry(payload.data, attachment);
    let continuation: Awaited<ReturnType<typeof createEnquiryContinuation>>;
    try {
      continuation = await createEnquiryContinuation(enquiry.id);
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

    // Email is an operational notification, not a prerequisite for recording
    // a lead or permitting the visitor to continue securely.
    const email = created
      ? await sendRfqNotifications(enquiry)
      : { delivered: false, mode: storageMode };

    return NextResponse.json({
      ok: true,
      id: enquiry.id,
      enquiryNumber: enquiry.enquiryNumber,
      continuationToken: continuation.token,
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
