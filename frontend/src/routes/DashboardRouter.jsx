/**
 * DashboardRouter — deprecated. The new routing is in src/routes/AppRouter.jsx.
 * This file is kept so any imports referencing it don't break during transition.
 * @deprecated Use AppRouter instead.
 */

import HRDashboard from "../pages/Dashboard/HRDashboard";

export default function DashboardRouter() {
  return <HRDashboard />;
}