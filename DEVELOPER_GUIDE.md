# Developer Guide — Enterprise HRMS

## How the Project Works Internally

This is a **frontend-only React SPA** that simulates a full HRMS application using mock data. The architecture follows a layered pattern:

1. **Pages** (UI layer) → 2. **Services** (API layer) → 3. **Mock Data** (data layer)

### Key Files to Understand First

| File | Purpose |
|------|---------|
| `frontend/src/App.jsx` | Root component, wraps providers |
| `frontend/src/main.jsx` | Entry point, renders App |
| `frontend/src/routes/AppRouter.jsx` | All 23 routes with lazy loading |
| `frontend/src/context/AuthContext.jsx` | Authentication state |
| `frontend/src/context/SearchContext.jsx` | Global search state |
| `frontend/src/components/layout/MainLayout.jsx` | App shell (Sidebar + Navbar) |
| `frontend/src/services/api.js` | Axios instance with interceptors |

## Request Lifecycle

```
User Action (click, navigation, form submit)
    │
    ▼
Page Component (e.g., Employees.jsx)
    │
    ├── useEffect() on mount → calls service function
    ├── useState() for local state
    └── Renders UI with data, loading, error states
    │
    ▼
Service Function (e.g., getEmployees())
    │
    ├── CURRENT: Reads from mock/ file, simulates delay
    └── FUTURE: Calls Axios API endpoint
    │
    ▼
Returns { data: [...] } (same shape as Axios response)
    │
    ▼
Page Component updates state → re-renders
```

## Database Flow

**Current**: No database. Mock data files in `frontend/src/mock/` provide all data.

**Future**:
1. Service function → Axios GET/POST request
2. Backend controller → Prisma/Sequelize query → PostgreSQL
3. Response → Axios response interceptor → Service → Page

## Authentication Flow

**Current** (Mock):
1. `AuthContext.login(role)` sets mock user and permissions
2. Role stored in `localStorage.setItem("hrms_role", role)`
3. On app load, reads saved role from localStorage
4. No token verification, no password

**Planned** (see `docs/AUTHENTICATION.md`):
1. Login form → `POST /api/auth/login` with email/password
2. Backend validates with bcrypt, returns JWT
3. Frontend stores token in localStorage
4. Axios interceptor attaches `Authorization: Bearer <token>`
5. Backend middleware verifies JWT and checks permissions

## How to Add New APIs

1. **Add mock data** in `frontend/src/mock/<module>.js`
2. **Create/update service** in `frontend/src/services/<module>Service.js`

   ```jsx
   // Current pattern (mock):
   import { data } from "../mock/<module>";
   const delay = (ms = 300) => new Promise((r) => setTimeout(r, ms));
   export const getData = async (params) => {
     await delay();
     return { data: filterData(params) };
   };
   ```

3. To switch to real API later, replace the import:

   ```jsx
   // Future pattern (real API):
   import api from "./api";
   export const getData = (params) => api.get("/<module>", { params });
   ```

4. **Test the service** by importing in any page component.

## How to Add New Frontend Pages

1. **Create page component** in `frontend/src/pages/<Module>/<Module>.jsx`:

   ```jsx
   import MainLayout from "../../components/layout/MainLayout";
   export default function MyModule() {
     return (
       <MainLayout>
         <div>My Module Content</div>
       </MainLayout>
     );
   }
   ```

2. **Add route** in `frontend/src/routes/AppRouter.jsx`:

   ```jsx
   // Add lazy import
   const MyModule = lazy(() => import("../pages/MyModule/MyModule"));
   
   // Add route
   <Route path="/my-module" element={<MyModule />} />
   ```

3. **Add sidebar nav item** in `frontend/src/components/layout/Sidebar.jsx`:

   ```jsx
   { icon: MyIcon, title: "My Module", href: "/my-module" },
   ```

4. **Add permission strings** in `frontend/src/context/AuthContext.jsx` (in the appropriate role array).

## Coding Conventions

### Architecture & Patterns
- Use `MainLayout` wrapper for every authenticated page
- Use `PageHeader` for consistent page titles and actions
- Use `Spinner` for loading states
- Use `EmptyState` when lists have no data
- Use `StatusBadge` for all status indicators
- Use `Modal` for overlay forms
- Use `ConfirmDialog` for destructive actions
- Services must return `{ data: ... }` to match Axios convention

### Component Patterns
- Page components: `export default function PageName()`
- Shared components: accept `children`, styled via props
- Dashboard widgets: self-contained, import data directly

### Styling
- Use inline styles with CSS custom properties from `variables.css`
- Available variables: `--primary`, `--background`, `--card`, `--text`, `--subtext`, `--border`, `--shadow-sm`, `--radius`, `--sidebar-width`, etc.
- Mouse enter/leave event handlers for hover effects
- Avoid Tailwind utility classes (project uses inline styles)

### State Management
- Use `useState` + `useEffect` for local page state
- Use `AuthContext` for user/permissions
- Use `SearchContext` for global search
- TanStack React Query is available but not yet used

### Naming
- Files: `PascalCase.jsx` for components
- Functions: `camelCase`
- Constants: `UPPER_SNAKE_CASE`
- CSS variables: `--kebab-case`

### Data Mocking
- All mock files in `frontend/src/mock/`
- Match the exact shape planned for real API responses
- Services should wrap mock data with `setTimeout` delay
- Each service file should have a comment showing the real API equivalent

### Error Handling
- Wrap async calls in try/catch
- Set error state for display
- Normalize errors to `{ status, message }` shape
- Show user-friendly error messages

### Performance Notes
- All module pages use `React.lazy()` for code splitting
- Search is debounced at 150ms
- Search results capped at 20 items
- Pagination: 8 items per page on employee list

## Important Notes

- The `MainLayout` is NOT a route layout — each page must wrap itself
- `DashboardRouter.jsx` is deprecated — use `AppRouter.jsx`
- `Login.jsx` and `Settings.jsx` are empty files (not yet implemented)
- Permissions are defined but NOT enforced in UI components
- The `data/user.js` file appears unused — no component imports it
