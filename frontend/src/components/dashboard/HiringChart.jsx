import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from "recharts";
import { hiringChartData } from "../../mock/HiringChart";

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-sm)",
        padding: "10px 14px",
        boxShadow: "var(--shadow-md)",
        fontSize: "12.5px",
        lineHeight: 1.8,
      }}
    >
      <p style={{ fontWeight: 700, color: "var(--text)", marginBottom: "4px" }}>
        {label}
      </p>
      {payload.map((entry) => (
        <p key={entry.name} style={{ color: entry.color }}>
          {entry.name}: <strong>{entry.value}</strong>
        </p>
      ))}
    </div>
  );
};

export default function HiringChart() {
  return (
    <div style={{ marginTop: "28px" }}>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart
          data={hiringChartData}
          barSize={10}
          barGap={3}
          margin={{ top: 0, right: 0, left: -10, bottom: 0 }}
        >
          <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="4 3" />
          <XAxis
            dataKey="day"
            tick={{ fontSize: 12, fill: "var(--subtext)", fontFamily: "Inter, sans-serif" }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 11, fill: "var(--subtext)", fontFamily: "Inter, sans-serif" }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(99,102,241,0.05)" }} />
          <Legend
            wrapperStyle={{ fontSize: "12px", paddingTop: "12px", fontFamily: "Inter, sans-serif" }}
          />
          <Bar dataKey="Applied"      fill="#c7d2fe" radius={[4, 4, 0, 0]} />
          <Bar dataKey="Interviewing" fill="#818cf8" radius={[4, 4, 0, 0]} />
          <Bar dataKey="Offer"        fill="#4f46e5" radius={[4, 4, 0, 0]} />
          <Bar dataKey="Onboarded"    fill="#312e81" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}