import Sidebar from "./Sidebar";
import Navbar from "./Navbar";

export default function MainLayout({ children }) {
  return (
    <div className="flex h-screen bg-[#F6F8FC]">
  <Sidebar />

  <div className="flex-1 flex flex-col overflow-auto">
    <Navbar />

    <main className="flex-1 bg-[#F8FAFC] p-8 pt-10 overflow-y-auto">
    {children}

    </main>
  </div>
</div>
  );
}
