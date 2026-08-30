import { KnowledgePage } from "@/components/knowledge-page";
import { solutions } from "@/lib/site-content";

export default function SolutionsPage() {
  return <KnowledgePage
    kicker="SOLUTIONS"
    title="Insulation systems for the"
    emphasis="whole build-up."
    intro="Explore practical material routes for hot, cold, HVAC, roof/PEB, acoustic and protective-finish requirements. Every final product choice should be confirmed against the project brief and verified manufacturer documentation."
    cards={solutions}
    note="These solution routes are a public planning guide. They help connect material families, application conditions and the finishing details that make an installation work as one system."
  />;
}
