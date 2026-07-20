import MainLayout from "../../components/layout/MainLayout";

export default function AdminDashboard() {
  return (
    <MainLayout>
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold">Admin Dashboard</h1>
        <p className="text-gray-500 mt-2">
          This dashboard will display company-wide analytics, user management, and system settings.
        </p>
      </div>
    </MainLayout>
  );
}