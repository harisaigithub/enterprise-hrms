import {
  Calendar,
  Clock3,
  Wallet,
  MapPin,
  HeartHandshake,
  Phone,
} from "lucide-react";

const actions = [
  { icon: Calendar, title: "Accrual History" },
  { icon: Clock3, title: "Time Tracking" },
  { icon: Wallet, title: "Estimate Balance" },
  { icon: MapPin, title: "Add Location" },
  { icon: HeartHandshake, title: "Benefits Review" },
  { icon: Phone, title: "Contact HR" },
];

export default function QuickActions() {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:-translate-y-1 hover:shadow-xl transition-all duration-300">

      <h2 className="font-bold text-lg mb-6">
        Quick Actions
      </h2>

     <div className="grid grid-cols-3 gap-y-8 gap-x-4">

        {actions.map((item, index) => (
          <div
            key={index}
            className="flex flex-col items-center text-center cursor-pointer hover:-translate-y-2 transition-all duration-300 "
          >
<div className="w-14 h-14 rounded-full bg-orange-50 flex items-center justify-center hover:-translate-y-1 hover:shadow-xl transition-all duration-300">
              <item.icon
                size={24}
                className="text-orange-500"
              />

            </div>

           <p className="text-sm mt-3 font-medium text-gray-700">
              {item.title}
            </p>

          </div>
        ))}

      </div>

    </div>
  );
}