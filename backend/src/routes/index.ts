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

const router = Router();

router.use("/auth", authRoutes);
router.use(
    "/organization",
    organizationManagementRoutes
);
router.use("/employees", employeeRoutes);
router.use("/recruitment", recruitmentRoutes);
router.use("/attendance", attendanceRoutes);
router.use("/leave", leaveRoutes);
router.use("/payroll", payrollRoutes);
router.use("/search", searchRoutes);
router.use("/workflow", workflowRoutes);

export default router;
