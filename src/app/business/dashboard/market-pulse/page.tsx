import PortalFeatureGuard from '@/components/business/PortalFeatureGuard';
import MarketPulseWorkspace from '@/components/business/MarketPulseWorkspace';

export default function MarketPulsePage() {
  return (
    <PortalFeatureGuard
      feature="marketPulse"
      title="Market Pulse is available on Growth OS and above"
      description="Upgrade your plan for daily Indian stock market sentiment, news, and technicals — a starting point for where to park surplus business cash."
    >
      <MarketPulseWorkspace />
    </PortalFeatureGuard>
  );
}
