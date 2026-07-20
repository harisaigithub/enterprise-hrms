import MainLayout from "../../components/layout/MainLayout";

export default function EmployeeDashboard() {
  return (
    <MainLayout>
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold">Employee Dashboard</h1>
        <p className="text-gray-500 mt-2">
          Welcome! Your dashboard will include attendance, leave, payslips, and announcements.
        </p>
      </div>
    </MainLayout>
  );
}