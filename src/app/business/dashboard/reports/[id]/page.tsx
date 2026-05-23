import PortalFeatureGuard from '@/components/business/PortalFeatureGuard';
import ResearchReportView from '@/components/business/ResearchReportView';

export default async function BusinessReportDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <PortalFeatureGuard
      feature="reportHistory"
      title="Report History is available on active plans"
      description="Activate a plan that includes Report History to review saved intelligence reports, exports, and shared links."
    >
      <ResearchReportView reportId={id} />
    </PortalFeatureGuard>
  );
}
