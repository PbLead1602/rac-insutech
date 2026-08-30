import { LegalPage } from "@/components/legal-page";

export default function PrivacyPage() {
  return <LegalPage
    title="Privacy"
    intro="How this website handles the details you provide through a product enquiry or technical quote request."
    sections={[
      { heading: "Information you submit", body: "An enquiry may include your name, company, mobile number, email address, project location and material requirement. Please do not submit confidential information unless it is necessary for the enquiry." },
      { heading: "Why it is used", body: "RAC uses enquiry details to respond to your request, prepare a relevant material conversation and maintain an enquiry record. The website does not provide a public customer account or payment service." },
      { heading: "Service providers", body: "When production integrations are enabled, enquiry information may be processed through the configured database, anti-spam and email providers. During development, clearly labelled mock services are used instead." },
      { heading: "Questions", body: "Use the technical quote form to request support or ask for clarification about a submitted enquiry." },
    ]}
  />;
}
