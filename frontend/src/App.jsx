/**
 * App — Root component.
 * Wraps the application with AuthProvider and SearchProvider,
 * then renders the AppRouter (BrowserRouter with all 23 module routes).
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