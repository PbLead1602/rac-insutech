import { redirect } from "next/navigation";

/** Keeps legacy direct enquiry links working with the homepage quote form. */
export default function EnquiryPage() {
  redirect("/?quote=1");
}
