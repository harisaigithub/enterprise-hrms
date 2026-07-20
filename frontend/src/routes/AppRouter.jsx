/**
 * AppRouter — All 23 HRMS module routes with React Router v7.
 * All module pages are lazily loaded for performance.
 * The layout route (MainLayout) wraps all authenticated pages.
 */

import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Spinner from "../components/shared/Spinner";

// ── Eagerly loaded (critical path) ─────────────────────────────────────────
import HRDashboard        from "../pages/Dashboard/HRDashboard";

// ── Lazily loaded modules ────────────────────────────────────────────────────
const Employees           = lazy(() => import("../pages/Employees/Employees"));
const EmployeeProfile     = lazy(() => import("../pages/Employees/EmployeeProfile"));
const Attendance          = lazy(() => import("../pages/Attendance/Attendance"));
const Leave               = lazy(() => import("../pages/Leave/Leave"));
const Payroll             = lazy(() => import("../pages/Payroll/Payroll"));

const Recruitment         = lazy(() => import("../pages/Recruitment/Recruitment"));
const Onboarding          = lazy(() => import("../pages/Onboarding/Onboarding"));
const Performance         = lazy(() => import("../pages/Performance/Performance"));
const LMS                 = lazy(() => import("../pages/LMS/LMS"));
const Assets              = lazy(() => import("../pages/Assets/Assets"));
const Tasks               = lazy(() => import("../pages/Tasks/Tasks"));
const Expenses            = lazy(() => import("../pages/Expenses/Expenses"));
const Travel              = lazy(() => import("../pages/Travel/Travel"));
const ESS                 = lazy(() => import("../pages/ESS/ESS"));
const Helpdesk            = lazy(() => import("../pages/Helpdesk/Helpdesk"));
const Policies            = lazy(() => import("../pages/Policies/Policies"));
const Separation          = lazy(() => import("../pages/Separation/Separation"));
const OrgManagement       = lazy(() => import("../pages/OrgManagement/OrgManagement"));
const WorkflowEngine      = lazy(() => import("../pages/WorkflowEngine/WorkflowEngine"));
const Reports             = lazy(() => import("../pages/Reports/Reports"));
const Notifications       = lazy(() => import("../pages/Notifications/Notifications"));
const Compliance          = lazy(() => import("../pages/Compliance/Compliance"));
const SecurityAdmin       = lazy(() => import("../pages/SecurityAdmin/SecurityAdmin"));

function Loading() {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", background: "var(--background)" }}>
      <Spinner size={32} />
    </div>
  );
}

export default function AppRouter() {
  return (
    <BrowserRouter>
      <Suspense fallback={<Loading />}>
        <Routes>
          {/* Dashboard */}
          <Route path="/"             element={<HRDashboard />} />

          {/* Core HR */}
          <Route path="/employees"           element={<Employees />} />
          <Route path="/employees/:id"       element={<EmployeeProfile />} />
          <Route path="/attendance"          element={<Attendance />} />
          <Route path="/leave"               element={<Leave />} />
          <Route path="/payroll"             element={<Payroll />} />
          <Route path="/performance"         element={<Performance />} />

          {/* Talent */}
          <Route path="/recruitment"         element={<Recruitment />} />
          <Route path="/onboarding"          element={<Onboarding />} />
          <Route path="/lms"                 element={<LMS />} />

          {/* Operations */}
          <Route path="/assets"              element={<Assets />} />
          <Route path="/tasks"               element={<Tasks />} />
          <Route path="/expenses"            element={<Expenses />} />
          <Route path="/travel"              element={<Travel />} />

          {/* Employee */}
          <Route path="/ess"                 element={<ESS />} />
          <Route path="/helpdesk"            element={<Helpdesk />} />
          <Route path="/policies"            element={<Policies />} />

          {/* Admin */}
          <Route path="/separation"          element={<Separation />} />
          <Route path="/org-management"      element={<OrgManagement />} />
          <Route path="/workflows"           element={<WorkflowEngine />} />
          <Route path="/reports"             element={<Reports />} />
          <Route path="/notifications"       element={<Notifications />} />
          <Route path="/compliance"          element={<Compliance />} />
          <Route path="/security"            element={<SecurityAdmin />} />

          {/* Fallback — redirect unknown routes to dashboard */}
          <Route path="*"                    element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
