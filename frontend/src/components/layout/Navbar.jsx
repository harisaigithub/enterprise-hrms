import {
  Bell,
  Search,
  ChevronDown,
} from "lucide-react";

export default function Navbar() {
  return (
    <header className="sticky top-0 z-50 bg-white/90 backdrop-blur h-20 border-b border-gray-200 flex items-center justify-between px-8 shadow-sm">

      {/* Search */}
      <div className="relative">
        <Search
          size={20}
          className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400"
        />

        <input
          type="text"
          placeholder="Search employees..."
          className="
            max-w-md w-full
            h-14
            rounded-2xl
            border
            border-gray-200
            bg-white
            pl-14
            pr-5
            outline-none
            transition-all
            duration-300
            focus:ring-2
            focus:ring-orange-300
            focus:border-orange-300
          "
        />
      </div>

      {/* Right Section */}
      <div className="flex items-center gap-8">

        {/* Notification */}
        <div className="relative cursor-pointer hover:scale-110 transition-all duration-300">
          <Bell size={24} />

          <span className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full text-xs w-5 h-5 flex items-center justify-center">
            3
          </span>
        </div>

        {/* User */}
        <div className="flex items-center gap-3 cursor-pointer hover:bg-gray-100 px-3 py-2 rounded-xl transition-all duration-300">

          <img
            src="https://i.pravatar.cc/100"
            alt="User"
            className="w-11 h-11 rounded-full"
          />

          <div>
            <h3 className="font-semibold text-gray-800">
              John Doe
            </h3>

            <p className="text-xs text-gray-500">
              HR Manager
            </p>
          </div>

          <ChevronDown size={18} />
        </div>

      </div>

    </header>
  );
}