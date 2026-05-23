import PortalFeatureGuard from '@/components/business/PortalFeatureGuard';
import BusinessProfileSettingsForm from '@/components/business/BusinessProfileSettingsForm';

export default function BusinessSettingsPage() {
  return (
    <PortalFeatureGuard
      feature="profileSettings"
      title="Profile Settings is available on active plans"
      description="Activate a plan that includes Profile Settings to save reusable business context and personalize research relative to your own business."
    >
      <BusinessProfileSettingsForm />
    </PortalFeatureGuard>
  );
}
