import { KnowledgePage } from "@/components/knowledge-page";
import { services } from "@/lib/site-content";

export default function ServicesPage() {
  return <KnowledgePage
    kicker="SERVICES"
    title="A more considered route from enquiry to"
    emphasis="installation."
    intro="Bring the site condition, system requirements and approval needs into one conversation. The service scope below makes the decision process clear before a material is finalised."
    cards={services}
    note="Use this route to frame an RFQ or technical conversation. Availability, exact scope and final material suitability are confirmed with RAC for the individual project."
  />;
}
