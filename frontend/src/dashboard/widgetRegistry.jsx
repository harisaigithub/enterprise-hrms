/**
 * Widget registry — maps the server catalog's stable widget ids to the React
 * components that render them. The server catalog (role/permission filtered)
 * drives which widgets a user may place; this registry only resolves ids to
 * components. Unknown ids are skipped gracefully.
 */
import DashboardQuickActions from "../components/dashboard/DashboardQuickActions";
import AttendanceWidget from "../components/dashboard/AttendanceWidget";
import LeaveBalanceWidget from "../components/dashboard/LeaveBalanceWidget";
import PayslipWidget from "../components/dashboard/PayslipWidget";
import SelfAssessmentWidget from "../components/dashboard/SelfAssessmentWidget";
import ComplianceCoursesWidget from "../components/dashboard/ComplianceCoursesWidget";
import PendingPoliciesWidget from "../components/dashboard/PendingPoliciesWidget";
import RecentNotificationsWidget from "../components/dashboard/RecentNotificationsWidget";
import BirthdaysWidget from "../components/dashboard/BirthdaysWidget";
import HolidaysWidget from "../components/dashboard/HolidaysWidget";
import AnnouncementsWidget from "../components/dashboard/AnnouncementsWidget";
import ManagerQuickActions from "../components/dashboard/ManagerQuickActions";
import TeamApprovalsWidget from "../components/dashboard/TeamApprovalsWidget";
import TeamAttendanceWidget from "../components/dashboard/TeamAttendanceWidget";
import TeamRosterWidget from "../components/dashboard/TeamRosterWidget";
import TeamAttendanceTrendChart from "../components/dashboard/charts/TeamAttendanceTrendChart";
import QuickActions from "../components/dashboard/QuickActions";
import AlertCard from "../components/dashboard/AlertCard";
import HiringInsights from "../components/dashboard/HiringInsights";
import HiringFunnelBarChart from "../components/dashboard/HiringFunnelBarChart";
import PeopleCard from "../components/dashboard/PeopleCard";
import PayrollCard from "../components/dashboard/PayrollCard";
import ResourcesCard from "../components/dashboard/ResourcesCard";
import FinanceExpenseBacklogWidget from "../components/dashboard/FinanceExpenseBacklogWidget";
import AdminOrgKpisWidget from "../components/dashboard/AdminOrgKpisWidget";
import DepartmentHeadcountChart from "../components/dashboard/charts/DepartmentHeadcountChart";
import HiringFunnelDonut from "../components/dashboard/charts/HiringFunnelDonut";
import PayrollTrendArea from "../components/dashboard/charts/PayrollTrendArea";
import TaskProgressWidget from "../components/dashboard/TaskProgressWidget";
import InsightsWidget from "../components/dashboard/InsightsWidget";

export const WIDGET_COMPONENTS = {
  "quick.actions": DashboardQuickActions,
  "attendance.today": AttendanceWidget,
  "leave.balances": LeaveBalanceWidget,
  "payroll.payslip": PayslipWidget,
  "performance.selfAssessment": SelfAssessmentWidget,
  "lms.complianceCourses": ComplianceCoursesWidget,
  "policies.pending": PendingPoliciesWidget,
  "notifications.recent": RecentNotificationsWidget,
  "people.birthdays": BirthdaysWidget,
  "ess.holidays": HolidaysWidget,
  "ess.announcements": AnnouncementsWidget,
  "manager.quickActions": ManagerQuickActions,
  "manager.teamApprovals": TeamApprovalsWidget,
  "manager.teamAttendance": TeamAttendanceWidget,
  "manager.attendanceTrend": TeamAttendanceTrendChart,
  "manager.teamRoster": TeamRosterWidget,
  "hr.quickActions": QuickActions,
  "hr.alerts": AlertCard,
  "hr.hiringInsights": HiringInsights,
  "hr.hiringFunnelChart": HiringFunnelBarChart,
  "hr.people": PeopleCard,
  "hr.payroll": PayrollCard,
  "hr.resources": ResourcesCard,
  "finance.expenseBacklog": FinanceExpenseBacklogWidget,
  "admin.orgKpis": AdminOrgKpisWidget,
  "admin.departmentHeadcount": DepartmentHeadcountChart,
  "admin.hiringFunnel": HiringFunnelDonut,
  "admin.payrollTrend": PayrollTrendArea,
  "admin.taskProgress": TaskProgressWidget,
  "admin.insights": InsightsWidget,
};

export function resolveWidget(id) {
  return WIDGET_COMPONENTS[id] ?? null;
}
