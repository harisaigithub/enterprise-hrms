import { Router } from "express";
import authRoutes from "../modules/auth/auth.routes";
import organizationManagementRoutes from "../modules/organization/organizationManagement.routes";
import employeeRoutes from "../modules/employees/employee.routes";
import recruitmentRoutes from "../modules/recruitment/recruitment.routes";
import attendanceRoutes from "../modules/attendance/attendance.routes";
import leaveRoutes from "../modules/leave/leave.routes";
import payrollRoutes from "../modules/payroll/payroll.routes";
import searchRoutes from "../modules/search/search.routes";
import workflowRoutes from "../modules/workflow/workflow.routes";
import performanceRoutes from "../modules/performance/performance.routes";
import candidateLifecycleRoutes from "../modules/candidateLifecycle/candidateLifecycle.routes";
import helpdeskRoutes from "../modules/helpdesk/helpdesk.routes";
import onboardingRoutes from "../modules/onboarding/onboarding.routes";
import lmsRoutes from "../modules/lms/lms.routes";
import taskRoutes from "../modules/task/task.routes";
import assetRoutes from "../modules/asset/asset.routes";
import separationRoutes from "../modules/separation/separation.routes";
import policiesRoutes from "../modules/policies/policies.routes";
import complianceRoutes from "../modules/compliance/compliance.routes";
import reportsRoutes from "../modules/reports/reports.routes";
import dashboardRoutes from "../modules/dashboard/dashboard.routes";
import notificationRoutes from "../modules/notifications/notifications.routes";


const router = Router();

const serviceName = process.env.SERVICE_NAME;

if (!serviceName || serviceName === "auth") router.use("/auth", authRoutes);
if (!serviceName || serviceName === "organization") router.use("/organization", organizationManagementRoutes);
if (!serviceName || serviceName === "employees") router.use("/employees", employeeRoutes);
if (!serviceName || serviceName === "recruitment") router.use("/recruitment", recruitmentRoutes);
if (!serviceName || serviceName === "recruitment") router.use("/candidate-lifecycle", candidateLifecycleRoutes);
if (!serviceName || serviceName === "attendance") router.use("/attendance", attendanceRoutes);
if (!serviceName || serviceName === "leave") router.use("/leave", leaveRoutes);
if (!serviceName || serviceName === "payroll") router.use("/payroll", payrollRoutes);
if (!serviceName || serviceName === "search") router.use("/search", searchRoutes);
if (!serviceName || serviceName === "workflow") router.use("/workflow", workflowRoutes);
if (!serviceName || serviceName === "performance") router.use("/performance", performanceRoutes);
if (!serviceName || serviceName === "helpdesk") router.use("/helpdesk", helpdeskRoutes);
if (!serviceName || serviceName === "onboarding") { router.use("/onboarding", onboardingRoutes); }
if (!serviceName || serviceName === "lms") { router.use("/lms", lmsRoutes); }
if (!serviceName || serviceName === "task") {
    router.use("/tasks", taskRoutes);
}
if (!serviceName || serviceName === "asset") {
    router.use("/assets", assetRoutes);
}
if (!serviceName || serviceName === "separation") {
  router.use("/separations", separationRoutes);
}
if (!serviceName || serviceName === "policies") router.use("/policies", policiesRoutes);
if (!serviceName || serviceName === "compliance") router.use("/compliance", complianceRoutes);
if (!serviceName || serviceName === "reports") router.use("/reports", reportsRoutes);
if (!serviceName || serviceName === "dashboard") router.use("/dashboard", dashboardRoutes);
if (!serviceName || serviceName === "notifications") router.use("/notifications", notificationRoutes);

export default router;
