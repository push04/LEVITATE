import { useEffect, useState } from "react";
import { fetchAnalytics, type Analytics } from "../api";
import { StatTile } from "../components/StatTile";
import { BarChart } from "../components/BarChart";
import { TrendChart } from "../components/TrendChart";

export default function AnalyticsPage() {
  const [data, setData] = useState<Analytics | null>(null);

  useEffect(() => {
    fetchAnalytics().then(setData);
  }, []);

  if (!data) return <div className="text-sm text-ink-muted">Loading analytics…</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Analytics</h1>
        <p className="text-sm text-ink-secondary dark:text-ink-secondary-dark">
          Live breakdown of everything the crawler has found.
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <StatTile label="Active tenders" value={data.total} />
        <StatTile label="Deadlines &lt; 7 days" value={data.upcomingDeadlines7d} tone="warning" />
        <StatTile label="Expired" value={data.expired} tone="critical" />
        <StatTile label="No deadline listed" value={data.noDeadline} />
        <StatTile label="Hidden/archived" value={data.hidden} />
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <Card title="New tenders per day">
          <TrendChart data={data.byDay.slice(-30)} />
        </Card>
        <Card title="Deadline urgency">
          <BarChart data={data.deadlineBuckets} />
        </Card>
        <Card title="By category">
          <BarChart data={data.byCategory} />
        </Card>
        <Card title="By district (top 20)">
          <BarChart data={data.byDistrict} maxRows={12} />
        </Card>
        <Card title="By state">
          <BarChart data={data.byState} />
        </Card>
        <Card title="By source engine">
          <BarChart data={data.bySource} maxRows={10} />
        </Card>
        <Card title="Top publishing organizations">
          <BarChart data={data.topOrganizations} maxRows={10} />
        </Card>
      </div>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-surface dark:bg-surface-dark border border-grid dark:border-grid-dark rounded-xl p-4">
      <div className="text-sm font-medium mb-3">{title}</div>
      {children}
    </div>
  );
}
