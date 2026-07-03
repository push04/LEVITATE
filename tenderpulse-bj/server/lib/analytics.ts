import type { Tender } from "./store.js";

export function buildAnalytics(tenders: Tender[]) {
  const visible = tenders.filter((t) => !t.is_hidden);
  const now = Date.now();

  const byCategory: Record<string, number> = {};
  const byDistrict: Record<string, number> = {};
  const bySource: Record<string, number> = {};
  const byState: Record<string, number> = {};
  const byDay: Record<string, number> = {};

  let upcomingDeadlines7d = 0;
  let expired = 0;
  let noDeadline = 0;

  const DAY = 24 * 60 * 60 * 1000;
  const deadlineBuckets = {
    overdue: 0,
    "due_0_2d": 0,
    "due_3_7d": 0,
    "due_8_30d": 0,
    "due_30d_plus": 0,
    no_deadline: 0,
  };

  for (const t of visible) {
    const cat = t.category || "other";
    byCategory[cat] = (byCategory[cat] || 0) + 1;

    const district = t.district || "Unknown";
    byDistrict[district] = (byDistrict[district] || 0) + 1;

    bySource[t.source_name] = (bySource[t.source_name] || 0) + 1;

    const state = (t as any).state || "Unknown";
    byState[state] = (byState[state] || 0) + 1;

    const day = (t.first_seen_at || "").slice(0, 10);
    if (day) byDay[day] = (byDay[day] || 0) + 1;

    if (!t.bid_submission_deadline) {
      noDeadline++;
      deadlineBuckets.no_deadline++;
    } else {
      const deadline = new Date(t.bid_submission_deadline).getTime();
      const daysLeft = (deadline - now) / DAY;
      if (deadline < now) {
        expired++;
        deadlineBuckets.overdue++;
      } else {
        if (daysLeft < 7) upcomingDeadlines7d++;
        if (daysLeft <= 2) deadlineBuckets.due_0_2d++;
        else if (daysLeft <= 7) deadlineBuckets.due_3_7d++;
        else if (daysLeft <= 30) deadlineBuckets.due_8_30d++;
        else deadlineBuckets.due_30d_plus++;
      }
    }
  }

  const topOrganizations = Object.entries(
    visible.reduce<Record<string, number>>((acc, t) => {
      const org = t.organization || "Unknown";
      acc[org] = (acc[org] || 0) + 1;
      return acc;
    }, {})
  )
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([name, count]) => ({ name, count }));

  return {
    total: visible.length,
    hidden: tenders.length - visible.length,
    upcomingDeadlines7d,
    expired,
    noDeadline,
    byCategory: sortEntries(byCategory),
    byDistrict: sortEntries(byDistrict).slice(0, 20),
    byState: sortEntries(byState),
    bySource: sortEntries(bySource),
    byDay: Object.entries(byDay).sort(([a], [b]) => a.localeCompare(b)),
    topOrganizations,
    deadlineBuckets: [
      { name: "Overdue", count: deadlineBuckets.overdue },
      { name: "Due in 0-2 days", count: deadlineBuckets.due_0_2d },
      { name: "Due in 3-7 days", count: deadlineBuckets.due_3_7d },
      { name: "Due in 8-30 days", count: deadlineBuckets.due_8_30d },
      { name: "Due in 30+ days", count: deadlineBuckets.due_30d_plus },
      { name: "No deadline listed", count: deadlineBuckets.no_deadline },
    ],
  };
}

function sortEntries(obj: Record<string, number>) {
  return Object.entries(obj)
    .sort((a, b) => b[1] - a[1])
    .map(([name, count]) => ({ name, count }));
}
