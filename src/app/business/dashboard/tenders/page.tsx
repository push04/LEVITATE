import PortalFeatureGuard from '@/components/business/PortalFeatureGuard';
import TendersWorkspace from '@/components/business/TendersWorkspace';

export default function TendersPage() {
  return (
    <PortalFeatureGuard
      feature="tenders"
      title="Government Tenders is available on Scale Suite and above"
      description="Upgrade your plan to browse live government tender listings matched to your industry and district."
    >
      <TendersWorkspace />
    </PortalFeatureGuard>
  );
}
