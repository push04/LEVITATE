import PortalFeatureGuard from '@/components/business/PortalFeatureGuard';
import ReportHistoryClient from '@/components/business/ReportHistoryClient';

export default function ReportHistoryPage() {
  return (
    <PortalFeatureGuard
      feature="reportHistory"
      title="Report History is available on active plans"
      description="Activate a plan that includes Report History to review saved intelligence reports, exports, and read-only shared links."
    >
      <ReportHistoryClient />
    </PortalFeatureGuard>
  );
}
