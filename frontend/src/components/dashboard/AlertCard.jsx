import { AlertCircle, MoreVertical } from "lucide-react";

import { alerts } from "../../data/alerts";

export default function AlertCard() {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:-translate-y-1 hover:shadow-xl transition-all duration-300">

      {alerts.map((item, index) => (
        <div
          key={index}
          className={`flex items-center justify-between p-5 ${
            index !== alerts.length - 1 ? "border-b" : ""
          }`}
        >
          <div className="flex items-center gap-3">

            <AlertCircle
              className="text-orange-500"
              size={20}
            />

            <p className="text-gray-700 text-[15px] max-w-md">
              {item.title}
            </p>

          </div>

          <div className="flex items-center gap-3">

            <button className="bg-[#ff7a1a] hover:bg-[#ff8d3a] text-white px-6 py-3 rounded-xl font-semibold hover:scale-105 transition-all duration-300 shadow-sm">
              {item.button}
            </button>

            <MoreVertical size={18} />

          </div>

        </div>
      ))}

    </div>
  );
}