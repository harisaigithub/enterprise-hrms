import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Building2 } from "lucide-react";
import DashboardWidgetCard from "../DashboardWidgetCard";
import { useDashboardWidget } from "../../../hooks/useDashboardWidget";
import { getAnalyticsSnapshot } from "../../../services/adminDashboardService";

function fetchDepartments() {
  return getAnalyticsSnapshot().then((res) => ({ data: res.data?.departmentHeadcount ?? [] }));
}

export default function DepartmentHeadcountChart() {
  const { data, loading, error, retry } = useDashboardWidget(fetchDepartments);
  const rows = (data ?? []).map((row) => ({ name: row.department, headcount: row.headcount }));
  return (
    <DashboardWidgetCard
      icon={Building2}
      title="Headcount by department"
      iconColor="#7c3aed"
      iconBg="#f5f3ff"
      loading={loading}
      error={error}
      onRetry={retry}
      isEmpty={rows.length === 0}
      emptyLabel="No active employees found."
    >
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={rows} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="4 3" />
          <XAxis dataKey="name" tick={{ fontSize: 10, fill: "var(--subtext)" }} axisLine={false} tickLine={false} interval={0} angle={-18} textAnchor="end" height={46} />
          <YAxis allowDecimals={false} tick={{ fontSize: 10.5, fill: "var(--subtext)" }} axisLine={false} tickLine={false} />
          <Tooltip cursor={{ fill: "rgba(124,58,237,0.06)" }} contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid var(--border)" }} formatter={(value) => [value, "Active employees"]} />
          <Bar dataKey="headcount" fill="#7c3aed" radius={[4, 4, 0, 0]} maxBarSize={34} />
        </BarChart>
      </ResponsiveContainer>
      <p style={{ fontSize: "10.5px", color: "var(--subtext)" }}>Active, non-deleted employees per department</p>
    </DashboardWidgetCard>
  );
}
