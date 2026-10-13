import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Briefcase } from "lucide-react";
import DashboardWidgetCard from "../DashboardWidgetCard";
import { useDashboardWidget } from "../../../hooks/useDashboardWidget";
import { getAnalyticsSnapshot } from "../../../services/adminDashboardService";

const STAGES = [
  { key: "applied", label: "Applied", color: "#6366f1" },
  { key: "screening", label: "Screening", color: "#8b5cf6" },
  { key: "interview", label: "Interview", color: "#0ea5e9" },
  { key: "offer", label: "Offer", color: "#0f766e" },
  { key: "hired", label: "Hired", color: "#059669" },
];

function fetchFunnel() {
  return getAnalyticsSnapshot().then((res) => ({ data: res.data?.hiringFunnel ?? null }));
}

export default function HiringFunnelDonut() {
  const { data, loading, error, retry } = useDashboardWidget(fetchFunnel);
  const rows = STAGES.map((s) => ({ name: s.label, value: Number(data?.[s.key] ?? 0), color: s.color }));
  const total = rows.reduce((sum, r) => sum + r.value, 0);
  return (
    <DashboardWidgetCard
      icon={Briefcase}
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
        <PieChart>
          <Pie data={rows} dataKey="value" nameKey="name" innerRadius={52} outerRadius={78} paddingAngle={2} strokeWidth={0}>
            {rows.map((row) => <Cell key={row.name} fill={row.color} />)}
          </Pie>
          <Tooltip formatter={(value, name) => [value, name]} contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid var(--border)" }} />
          <Legend iconType="circle" wrapperStyle={{ fontSize: 11 }} />
        </PieChart>
      </ResponsiveContainer>
      <p style={{ fontSize: "10.5px", color: "var(--subtext)" }}>{total} applications across all requisitions</p>
    </DashboardWidgetCard>
  );
}
