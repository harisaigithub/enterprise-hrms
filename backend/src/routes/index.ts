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
if (!serviceName || serviceName === "onboarding") { router.use("/onboarding", onboardingRoutes);}
if (!serviceName || serviceName === "lms") { router.use("/lms", lmsRoutes);}

export default router;
