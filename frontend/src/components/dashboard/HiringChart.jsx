import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  Tooltip,
  Legend,
} from "recharts";

import { HiringChart } from "../../data/hiringChart";

export default function HiringChart() {
  return (
    <div className="h-105 mt-10">
      <ResponsiveContainer width="100%" height={400}>
        <BarChart data={data}>
          <XAxis dataKey="day" />

          <Tooltip />

          <Legend />

          <Bar
            dataKey="Applied"
            fill="#E5E7EB"
            radius={[5, 5, 0, 0]}
          />

          <Bar
            dataKey="Interviewing"
            fill="#8B5CF6"
            radius={[5, 5, 0, 0]}
          />

          <Bar
            dataKey="Offer"
            fill="#2563EB"
            radius={[5, 5, 0, 0]}
          />

          <Bar
            dataKey="Onboarded"
            fill="#1D4ED8"
            radius={[5, 5, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}