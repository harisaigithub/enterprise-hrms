import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { TrendingUp } from "lucide-react";
import DashboardWidgetCard from "../DashboardWidgetCard";
import { useDashboardWidget } from "../../../hooks/useDashboardWidget";
import { getAnalyticsSnapshot } from "../../../services/adminDashboardService";

function fetchTrend() {
  return getAnalyticsSnapshot().then((res) => ({ data: res.data?.payrollCostTrend ?? [] }));
}

export default function PayrollTrendArea() {
  const { data, loading, error, retry } = useDashboardWidget(fetchTrend);
  const rows = data ?? [];
  return (
    <DashboardWidgetCard
      icon={TrendingUp}
      title="Payroll cost trend"
      iconColor="#d97706"
      iconBg="#fffbeb"
      loading={loading}
      error={error}
      onRetry={retry}
      isEmpty={rows.length === 0}
      emptyLabel="No payroll runs recorded yet."
    >
      <ResponsiveContainer width="100%" height={200}>
        <AreaChart data={rows} margin={{ top: 4, right: 8, left: -8, bottom: 0 }}>
          <defs>
            <linearGradient id="payrollFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0f766e" stopOpacity={0.25} />
              <stop offset="100%" stopColor="#0f766e" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="4 3" />
          <XAxis dataKey="month" tick={{ fontSize: 10.5, fill: "var(--subtext)" }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 10.5, fill: "var(--subtext)" }} axisLine={false} tickLine={false} />
          <Tooltip formatter={(value) => [`₹${value} Cr`, "Gross payroll"]} contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid var(--border)" }} />
          <Area type="monotone" dataKey="cost" stroke="#0f766e" strokeWidth={2} fill="url(#payrollFill)" />
        </AreaChart>
      </ResponsiveContainer>
      <p style={{ fontSize: "10.5px", color: "var(--subtext)" }}>Gross payroll per run, in ₹ crore</p>
    </DashboardWidgetCard>
  );
}
