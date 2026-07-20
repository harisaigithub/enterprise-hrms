import HiringChart from "./HiringChart";

const stats = [
  {
    title: "Applicants",
    value: "158",
    growth: "+15.7%",
  },
  {
    title: "Interviewing",
    value: "58",
    growth: "+7.3%",
  },
  {
    title: "Offer Extended",
    value: "32",
    growth: "+12.6%",
  },
  {
    title: "Onboarded",
    value: "5",
    growth: "+89.5%",
  },
];

export default function HiringInsights() {
  return (
    <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8 hover:-translate-y-1 hover:shadow-xl transition-all duration-300">

      <h2 className="text-xl font-semibold">
        Hiring Insights
      </h2>

      <div className="grid grid-cols-4 gap-10 mt-8">

        {stats.map((item) => (
          <div key={item.title}>
            <p className="text-gray-500 text-sm">
              {item.title}
            </p>

            <h2 className="text-5xl font-bold mt-2">
              {item.value}
            </h2>

            <span className="text-green-600 text-sm font-medium">
              ↗ {item.growth}
            </span>
          </div>
        ))}

      </div>

      <HiringChart />

    </div>
  );
}