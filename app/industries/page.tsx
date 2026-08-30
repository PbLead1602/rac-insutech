import { KnowledgePage } from "@/components/knowledge-page";
import { industries } from "@/lib/site-content";

export default function IndustriesPage() {
  return <KnowledgePage
    kicker="INDUSTRIES"
    title="Material thinking for demanding"
    emphasis="environments."
    intro="Different sites create different insulation priorities—from controlled temperatures and acoustic comfort to process heat, maintenance access and roof-envelope performance."
    cards={industries}
    note="The sectors shown here reflect common insulation applications in commercial, industrial and infrastructure projects. The final system should always be reviewed against the actual service environment and project standards."
  />;
}
