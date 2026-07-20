import MainLayout from "../../components/layout/MainLayout";

export default function ManagerDashboard() {
  return (
    <MainLayout>
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold">Manager Dashboard</h1>
        <p className="text-gray-500 mt-2">
          This dashboard will include team attendance, leave approvals, and performance insights.
        </p>
      </div>
    </MainLayout>
  );
}