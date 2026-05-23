import PortalFeatureGuard from '@/components/business/PortalFeatureGuard';
import ResearchWorkspace from '@/components/business/ResearchWorkspace';

export default function MarketResearchPage() {
  return (
    <PortalFeatureGuard
      feature="marketResearch"
      title="Market Research is available on active plans"
      description="Activate a plan that includes Market Research to run subscriber-only intelligence reports, competitor analysis, and exportable strategy dashboards."
    >
      <ResearchWorkspace />
    </PortalFeatureGuard>
  );
}
