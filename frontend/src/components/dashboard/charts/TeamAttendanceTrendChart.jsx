import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { TrendingUp } from "lucide-react";
import DashboardWidgetCard from "../DashboardWidgetCard";
import { useDashboardWidget } from "../../../hooks/useDashboardWidget";
import { getManagerDashboardSummary } from "../../../services/managerDashboardService";

function fetchTrend() {
  return getManagerDashboardSummary().then((res) => ({
    data: { trend: res.data?.attendanceTrend ?? [], teamSize: res.data?.teamSize ?? 0 },
  }));
}

const fmt = (iso) => {
  const d = new Date(`${iso}T00:00:00Z`);
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", timeZone: "UTC" });
};

export default function TeamAttendanceTrendChart() {
  const { data, loading, error, retry } = useDashboardWidget(fetchTrend);
  const trend = (data?.trend ?? []).map((row) => ({ ...row, label: fmt(row.date) }));
  return (
    <DashboardWidgetCard
      icon={TrendingUp}
      title="Team attendance trend (14 days)"
      iconColor="#0f766e"
      iconBg="#f0fdfa"
      loading={loading}
      error={error}
      onRetry={retry}
      isEmpty={trend.length === 0}
      emptyLabel="No attendance data for your team in the last 14 days."
    >
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={trend} margin={{ top: 4, right: 8, left: -18, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="4 3" />
          <XAxis dataKey="label" tick={{ fontSize: 10.5, fill: "var(--subtext)" }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
          <YAxis allowDecimals={false} tick={{ fontSize: 10.5, fill: "var(--subtext)" }} axisLine={false} tickLine={false} />
          <Tooltip
            contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid var(--border)" }}
            formatter={(value, name) => [value, name === "present" ? "Present" : name === "onLeave" ? "On leave" : "Not checked in"]}
          />
          <Legend formatter={(value) => (value === "present" ? "Present" : value === "onLeave" ? "On leave" : "Not checked in")} iconType="circle" wrapperStyle={{ fontSize: 11 }} />
          <Line type="monotone" dataKey="present" stroke="#0f766e" strokeWidth={2} dot={false} />
          <Line type="monotone" dataKey="onLeave" stroke="#d97706" strokeWidth={2} dot={false} />
          <Line type="monotone" dataKey="notCheckedIn" stroke="#94a3b8" strokeWidth={2} dot={false} strokeDasharray="4 3" />
        </LineChart>
      </ResponsiveContainer>
      <p style={{ fontSize: "10.5px", color: "var(--subtext)", marginTop: 4 }}>
        Your direct reports only — present = punched in, on leave = approved leave covering the day.
      </p>
    </DashboardWidgetCard>
  );
}
