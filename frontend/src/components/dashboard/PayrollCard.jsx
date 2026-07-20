import { Wallet } from "lucide-react";
import { payroll } from "../../data/payroll";

export default function PayrollCard() {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:-translate-y-1 hover:shadow-xl transition-all duration-300">

      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">
          {payroll.title}
        </h2>

        <Wallet className="text-green-600" />
      </div>

      <h1 className="text-5xl font-bold mt-6">
        {payroll.totalPayroll}
      </h1>

      <p className="text-gray-500 mt-2">
        {payroll.description}
      </p>

      <button
        className="mt-6 bg-[#ff7a1a] hover:bg-[#ff8d3a] text-white px-6 py-3 rounded-xl font-semibold hover:scale-105 transition-all duration-300"
      >
        {payroll.buttonText}
      </button>

    </div>
  );
}