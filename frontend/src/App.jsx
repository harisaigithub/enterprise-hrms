/**
 * App — TEMPORARY preview mode.
 * Renders EmployeeDashboard directly for quick viewing, wrapped in the same
 * providers the real app tree gives it (BrowserRouter for useNavigate(),
 * AuthProvider for useAuth(), SearchProvider in case Navbar needs it).
 *
 * Swap back to the commented-out AppRouter version below once you're
 * ready to view this through real routing/auth instead.
 */

import { AuthProvider } from "./context/AuthContext";
import { SearchProvider } from "./context/SearchContext";
import AppRouter from "./routes/AppRouter";

export default function App() {
  return (
    <AuthProvider>
      <SearchProvider>
        <AppRouter />
      </SearchProvider>
    </AuthProvider>
  );
}
