/**
 * HR Dashboard mock data — mirrors the shape of data/adminDashboard.js.
 * Swap this file's contents for a real API response later; the service/
 * hook/widget layers above it don't need to change either way.
 */

export const hrDashboardSnapshot = {
  hiringInsights: {
    stats: [
      { title: "Applicants", value: "158", growth: "+15.7%", color: "#4f46e5" },
      { title: "Interviewing", value: "58", growth: "+7.3%", color: "#7c3aed" },
      { title: "Offer Extended", value: "32", growth: "+12.6%", color: "#059669" },
      { title: "Onboarded", value: "5", growth: "+89.5%", color: "#0284c7" },
    ],
  },
  payroll: {
    title: "Payroll",
    totalPayroll: "₹12.5L",
    description: "Total Payroll This Month",
    changePct: "+4.2%",
    changeLabel: "vs last month",
    buttonText: "Run Payroll",
  },
  people: {
    total: 32,
    list: [
      { name: "Matsya M.", img: "https://i.pravatar.cc/150?img=1" },
      { name: "vijay D.", img: "https://i.pravatar.cc/150?img=2" },
      { name: "Vikas A.", img: "https://i.pravatar.cc/150?img=3" },
      { name: "Gary C.", img: "https://i.pravatar.cc/150?img=4" },
      { name: "Alice Q.", img: "https://i.pravatar.cc/150?img=5" },
      { name: "James S.", img: "https://i.pravatar.cc/150?img=6" },
      { name: "Viki V.", img: "https://i.pravatar.cc/150?img=7" },
      { name: "Kirk W.", img: "https://i.pravatar.cc/150?img=8" },
    ],
  },
  // 3x2 icon grid — actions an HR Manager actually performs, each mapped to
  // an existing sidebar module. (The previous set — Accrual History, Time
  // Tracking, Est. Balance, Benefits, Contact HR — was Employee Self-Service
  // data and belongs on the Employee dashboard, not here: an HR Manager
  // wouldn't need a "Contact HR" button on their own dashboard.)
  quickActions: {
    actions: [
      { id: "add-employee", label: "Add Employee", iconName: "UserPlus", path: "/employees" },
      { id: "post-job", label: "Post a Job", iconName: "Briefcase", path: "/recruitment" },
      { id: "run-payroll", label: "Run Payroll", iconName: "Wallet", path: "/payroll" },
      { id: "approve-leave", label: "Approve Leave", iconName: "CalendarCheck", path: "/leave" },
      { id: "onboarding", label: "Onboarding", iconName: "ClipboardList", path: "/onboarding" },
      { id: "reports", label: "Reports", iconName: "BarChart3", path: "/reports" },
    ],
  },
  // Policy items needing HR attention — pending acknowledgments and upcoming
  // reviews. (The previous version — plain links to "Employee Handbook",
  // "Leave Policy", "Payroll Guidelines" — was reference material for
  // employees looking things up, not something an HR Manager needs: they
  // authored these policies. What HR actually needs at a glance is compliance
  // status, which the Policies page already tracks via its own "Compliance
  // Dashboard" tab and "Mandatory ack." badges.)
  resources: {
    list: [
      { name: "Code of Conduct v2", note: "12 acknowledgments pending", link: "/policies" },
      { name: "IT & Security Policy", note: "Review due in 45 days", link: "/policies" },
      { name: "Leave Policy v1", note: "Fully acknowledged", link: "/policies" },
    ],
  },
  // Banner-style attention items shown at the top of the dashboard
  alerts: {
    list: [
      {
        id: 1,
        severity: "warning",
        message: "You have an expense report pending approval",
        buttonText: "View Expense Reports",
        buttonPath: "/expenses",
      },
      {
        id: 2,
        severity: "urgent",
        message: "Payroll submission for Jul 19 – Aug 1 is due today",
        buttonText: "Go to Payroll",
        buttonPath: "/payroll",
      },
      {
        id: 3,
        severity: "info",
        message: "You have 14 time off requests to approve",
        buttonText: "View Requests",
        buttonPath: "/leave",
      },
    ],
  },
};