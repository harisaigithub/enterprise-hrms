import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Funnel } from "lucide-react";
import DashboardWidgetCard from "./DashboardWidgetCard";
import { useDashboardWidget } from "../../hooks/useDashboardWidget";
import { getHRDashboardSnapshot } from "../../services/hrDashboardService";

function fetchFunnel() {
  return getHRDashboardSnapshot().then((res) => ({ data: res.data?.hiringFunnel ?? null }));
}

const STAGE_LABELS = [
  { key: "applied", label: "Applied" },
  { key: "screening", label: "Screening" },
  { key: "interview", label: "Interview" },
  { key: "offer", label: "Offer" },
  { key: "hired", label: "Hired" },
];

export default function HiringFunnelBarChart() {
  const { data, loading, error, retry } = useDashboardWidget(fetchFunnel);
  const rows = STAGE_LABELS.map((s) => ({ name: s.label, count: Number(data?.[s.key] ?? 0) }));
  const total = rows.reduce((sum, r) => sum + r.count, 0);
  return (
    <DashboardWidgetCard
      icon={Funnel}
      title="Hiring funnel"
      iconColor="#0f766e"
      iconBg="#f0fdfa"
      loading={loading}
      error={error}
      onRetry={retry}
      isEmpty={total === 0}
      emptyLabel="No applications in the pipeline yet."
    >
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={rows} margin={{ top: 4, right: 8, left: -22, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="4 3" />
          <XAxis dataKey="name" tick={{ fontSize: 10.5, fill: "var(--subtext)" }} axisLine={false} tickLine={false} />
          <YAxis allowDecimals={false} tick={{ fontSize: 10.5, fill: "var(--subtext)" }} axisLine={false} tickLine={false} />
          <Tooltip cursor={{ fill: "rgba(15,118,110,0.06)" }} contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid var(--border)" }} formatter={(value) => [value, "Applications"]} />
          <Bar dataKey="count" fill="#0f766e" radius={[4, 4, 0, 0]} maxBarSize={40} />
        </BarChart>
      </ResponsiveContainer>
      <p style={{ fontSize: "10.5px", color: "var(--subtext)" }}>Live counts from the recruitment module</p>
    </DashboardWidgetCard>
  );
}
