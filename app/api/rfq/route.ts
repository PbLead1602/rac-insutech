import { NextResponse } from "next/server";
import { createEnquiry } from "@/lib/repositories/enquiries";
import { createEnquiryContinuation } from "@/lib/repositories/customer-accounts";
import { sendRfqNotifications } from "@/lib/services/brevo";
import { verifyTurnstile } from "@/lib/services/turnstile";
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

    const verification = await verifyTurnstile(
      payload.data.turnstileToken,
      request.headers.get("cf-connecting-ip") || request.headers.get("x-forwarded-for")?.split(",")[0]?.trim(),
    );
    if (!verification.ok) {
      return NextResponse.json({ ok: false, message: verification.reason }, { status: 400 });
    }

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

    const { enquiry, mode: storageMode } = await createEnquiry(payload.data, attachment);
    const [continuation, email] = await Promise.all([
      createEnquiryContinuation(enquiry.id),
      sendRfqNotifications(enquiry),
    ]);

    return NextResponse.json({
      ok: true,
      id: enquiry.id,
      enquiryNumber: enquiry.enquiryNumber,
      continuationToken: continuation.token,
      message: "Thank you — RAC’s technical team will be in touch shortly.",
      integrations: { storage: storageMode, email: email.mode, captcha: verification.mode },
    });
  } catch (error) {
    console.error("RFQ submission failed", error);
    return NextResponse.json(
      { ok: false, message: "We could not submit your request. Please try again or contact RAC directly." },
      { status: 500 },
    );
  }
}
