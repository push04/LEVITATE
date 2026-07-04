import PortalFeatureGuard from '@/components/business/PortalFeatureGuard';
import MarketplaceWorkspace from '@/components/business/MarketplaceWorkspace';

export default function MarketplacePage() {
  return (
    <PortalFeatureGuard
      feature="marketplace"
      title="Marketplace Listings is available on active plans"
      description="Activate a plan to get your products listed on Amazon, Flipkart, and Meesho."
    >
      <MarketplaceWorkspace />
    </PortalFeatureGuard>
  );
}
