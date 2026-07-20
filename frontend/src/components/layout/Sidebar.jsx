import {
  LayoutDashboard,
  Users,
  CalendarCheck,
  CalendarDays,
  Wallet,
  TrendingUp,
  FileBarChart,
  Settings,
  Menu,
} from "lucide-react";

const menus = [
  { icon: LayoutDashboard, title: "Dashboard", active: true },
  { icon: Users, title: "Employees" },
  { icon: CalendarCheck, title: "Attendance" },
  { icon: CalendarDays, title: "Leave" },
  { icon: Wallet, title: "Payroll" },
  { icon: TrendingUp, title: "Performance" },
  { icon: FileBarChart, title: "Reports" },
  { icon: Settings, title: "Settings" },
];

export default function Sidebar() {
  return (
    <aside className="w-55 bg-white border-r border-gray-200 h-screen flex flex-col shadow-sm hover:translate-x-2
hover:bg-orange-50
transition-all
duration-300">

      {/* Logo */}
      <div className="h-20 flex items-center justify-between px-6 border-b">
        <div>
          <h1 className="text-2xl font-bold text-orange-500">
            HRMS
          </h1>
          <p className="text-xs text-gray-400">
            Workforce Hub
          </p>
        </div>

        <button className="bg-orange-500 text-white px-4 py-2 rounded-xl
hover:bg-orange-600 hover:scale-105 transition-all duration-300">
          <Menu size={20} />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-6 space-y-2">

        {menus.map((item) => (
          <div
            key={item.title}
            className={`flex items-center gap-4 px-4 py-3 rounded-xl cursor-pointer transition-all duration-200 hover:bg-orange-50 hover:text-orange-600 hover:translate-x-2
            ${
              item.active
                ? "bg-orange-50 text-orange-600 font-semibold border-l-4 border-orange-500"
                : "text-gray-600 hover:bg-gray-100 hover:text-orange-500"
            }`}
          >
            <item.icon size={20} />
            <span>{item.title}</span>
          </div>
        ))}

      </nav>

      

    </aside>
  );
}