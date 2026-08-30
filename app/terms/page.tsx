import { LegalPage } from "@/components/legal-page";

export default function TermsPage() {
  return <LegalPage
    title="Website terms"
    intro="Important information about using RAC Insutech product guides, brochures and technical-enquiry tools."
    sections={[
      { heading: "Selection guidance", body: "Product pages and downloadable briefs are early-stage selection guidance. They are not a substitute for an approved manufacturer data sheet, project specification, test certificate or installation method statement." },
      { heading: "Final specification", body: "Material suitability, dimensions, operating conditions, fire performance and compliance must be confirmed against the actual project requirements and verified manufacturer documentation before ordering or installation." },
      { heading: "Availability", body: "Catalogued products and forms are subject to project review and availability. A quote request begins a technical conversation; it does not itself create an order or supply commitment." },
      { heading: "External references", body: "Links to manufacturer and market websites are supplied for reference. RAC is not represented as an authorised distributor of an external brand unless confirmed separately in writing." },
    ]}
  />;
}
