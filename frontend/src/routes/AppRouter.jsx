/**
 * AppRouter — All 23 HRMS module routes with React Router v7.
 * All module pages are lazily loaded for performance.
 * The layout route (MainLayout) wraps all authenticated pages.
 */

import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Spinner from "../components/shared/Spinner";
import RequireAuth from "../components/auth/RequireAuth";
import DashboardRouter from "./DashboardRouter";

// ── Eagerly loaded (critical path) ─────────────────────────────────────────
import Login from "../pages/Auth/Login";

// ── Lazily loaded modules ────────────────────────────────────────────────────
const Employees = lazy(() => import("../pages/Employees/Employees"));
const EmployeeProfile = lazy(() => import("../pages/Employees/EmployeeProfile"));
const Attendance = lazy(() => import("../pages/Attendance/Attendance"));
const Leave = lazy(() => import("../pages/Leave/Leave"));
const Payroll = lazy(() => import("../pages/Payroll/Payroll"));
const Recruitment         = lazy(() => import("../pages/Recruitment/Recruitment"));
const Onboarding          = lazy(() => import("../pages/Onboarding/Onboarding"));
const Performance         = lazy(() => import("../pages/Performance/Performance"));
const LMS                 = lazy(() => import("../pages/LMS/LMS"));
const CertificateVerificationPage = lazy(
  () => import("../pages/LMS/CertificateVerificationPage")
);
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
const CandidatePortal     = lazy(() => import("../pages/CandidatePortal/CandidatePortal"));


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
          {/* Public */}
          <Route path="/login" element={<Login />} />
          <Route path="/careers" element={<CandidatePortal />} />
          <Route path="/candidate/offer/:token" element={<CandidatePortal />} />

          <Route
            path="/certificates/verify/:token"
            element={<CertificateVerificationPage />}
          />


          {/* Authenticated — dashboard chosen by the logged-in user's real role */}
          <Route path="/" element={<RequireAuth><DashboardRouter /></RequireAuth>} />

          {/* Core HR */}
          <Route path="/employees" element={<RequireAuth><Employees /></RequireAuth>} />
          <Route path="/employees/:id" element={<RequireAuth><EmployeeProfile /></RequireAuth>} />
          <Route path="/attendance" element={<RequireAuth><Attendance /></RequireAuth>} />
          <Route path="/leave" element={<RequireAuth><Leave /></RequireAuth>} />
          <Route path="/payroll" element={<RequireAuth><Payroll /></RequireAuth>} />
          <Route path="/performance" element={<RequireAuth><Performance /></RequireAuth>} />

          {/* Talent */}
          <Route path="/recruitment"         element={<RequireAuth permission="recruitment:read"><Recruitment /></RequireAuth>} />
          <Route path="/onboarding"          element={<RequireAuth><Onboarding /></RequireAuth>} />
          <Route path="/lms"                 element={<RequireAuth><LMS /></RequireAuth>} />

          {/* Operations */}
          <Route path="/assets" element={<RequireAuth><Assets /></RequireAuth>} />
          <Route path="/tasks" element={<RequireAuth><Tasks /></RequireAuth>} />
          <Route path="/expenses" element={<RequireAuth><Expenses /></RequireAuth>} />
          <Route path="/travel" element={<RequireAuth><Travel /></RequireAuth>} />

          {/* Employee */}
          <Route path="/ess" element={<RequireAuth><ESS /></RequireAuth>} />
          <Route path="/helpdesk" element={<RequireAuth><Helpdesk /></RequireAuth>} />
          <Route path="/policies" element={<RequireAuth><Policies /></RequireAuth>} />

          {/* Admin */}
          <Route path="/separation" element={<RequireAuth><Separation /></RequireAuth>} />
          <Route path="/org-management" element={<RequireAuth><OrgManagement /></RequireAuth>} />
          <Route path="/workflows" element={<RequireAuth><WorkflowEngine /></RequireAuth>} />
          <Route path="/reports" element={<RequireAuth><Reports /></RequireAuth>} />
          <Route path="/notifications" element={<RequireAuth><Notifications /></RequireAuth>} />
          <Route path="/compliance" element={<RequireAuth><Compliance /></RequireAuth>} />
          <Route path="/security" element={<RequireAuth><SecurityAdmin /></RequireAuth>} />

          {/* Fallback — redirect unknown routes to dashboard */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
