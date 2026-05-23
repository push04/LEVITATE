import PortalFeatureGuard from '@/components/business/PortalFeatureGuard';
import LegalToolsWorkspace from '@/components/business/LegalToolsWorkspace';

export default function LegalToolsPage() {
  return (
    <PortalFeatureGuard
      feature="legalTools"
      title="Legal Tools are available on active plans"
      description="Activate a plan that includes Legal Tools to draft payment recovery notices, review delayed-payment remedies, and export legal documents."
    >
      <LegalToolsWorkspace />
    </PortalFeatureGuard>
  );
}
