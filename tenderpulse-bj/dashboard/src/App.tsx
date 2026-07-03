import { NavLink, Route, Routes } from "react-router-dom";
import TendersPage from "./pages/TendersPage";
import AnalyticsPage from "./pages/AnalyticsPage";
import ClientsPage from "./pages/ClientsPage";
import DeliveriesPage from "./pages/DeliveriesPage";

const NAV = [
  { to: "/", label: "Tenders", icon: "📋" },
  { to: "/analytics", label: "Analytics", icon: "📊" },
  { to: "/clients", label: "Clients", icon: "🏢" },
  { to: "/deliveries", label: "Deliveries", icon: "✉️" },
];

function navClass(isActive: boolean) {
  return [
    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
    isActive
      ? "bg-series-1/10 text-series-1"
      : "text-ink-secondary dark:text-ink-secondary-dark hover:bg-ink-primary/5 dark:hover:bg-white/5",
  ].join(" ");
}

export default function App() {
  return (
    <div className="min-h-screen bg-plane dark:bg-plane-dark text-ink-primary dark:text-ink-primary-dark">
      <div className="flex">
        {/* Desktop sidebar */}
        <aside className="hidden md:flex md:flex-col w-60 shrink-0 border-r border-grid dark:border-grid-dark min-h-screen p-4 gap-1">
          <div className="px-2 py-3 mb-2">
            <div className="font-semibold text-lg">TenderPulse BJ</div>
            <div className="text-xs text-ink-muted">Bihar &amp; Jharkhand tenders</div>
          </div>
          {NAV.map((n) => (
            <NavLink key={n.to} to={n.to} end={n.to === "/"} className={({ isActive }) => navClass(isActive)}>
              <span>{n.icon}</span>
              <span>{n.label}</span>
            </NavLink>
          ))}
        </aside>

        {/* Main content */}
        <main className="flex-1 min-w-0 pb-20 md:pb-0">
          <header className="md:hidden sticky top-0 z-10 bg-surface/95 dark:bg-surface-dark/95 backdrop-blur border-b border-grid dark:border-grid-dark px-4 py-3">
            <div className="font-semibold">TenderPulse BJ</div>
          </header>
          <div className="p-3 sm:p-5 md:p-6 max-w-[1400px] mx-auto">
            <Routes>
              <Route path="/" element={<TendersPage />} />
              <Route path="/analytics" element={<AnalyticsPage />} />
              <Route path="/clients" element={<ClientsPage />} />
              <Route path="/deliveries" element={<DeliveriesPage />} />
            </Routes>
          </div>
        </main>
      </div>

      {/* Mobile bottom tab bar */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-20 bg-surface dark:bg-surface-dark border-t border-grid dark:border-grid-dark flex">
        {NAV.map((n) => (
          <NavLink
            key={n.to}
            to={n.to}
            end={n.to === "/"}
            className={({ isActive }) =>
              [
                "flex-1 flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium",
                isActive ? "text-series-1" : "text-ink-muted",
              ].join(" ")
            }
          >
            <span className="text-lg leading-none">{n.icon}</span>
            {n.label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
