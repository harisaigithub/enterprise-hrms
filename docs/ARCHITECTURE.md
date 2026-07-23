# System Architecture

## Current State

The Enterprise HRMS is currently a **frontend-only single-page application (SPA)**. There is no backend server, database, or API layer implemented. All data is served from mock/service modules that simulate API responses with artificial delays.

## Architecture Diagram (Current)

```
┌─────────────────────────────────────────────────────────┐
│                    Browser (SPA)                        │
│                                                         │
│  ┌──────────┐  ┌────────────┐  ┌───────────────────┐  │
│  │ App.jsx  │  │ AuthContext│  │ SearchContext     │  │
│  │ (Root)   │  │ (Mock Auth)│  │ (Global Search)   │  │
│  └────┬─────┘  └────────────┘  └───────────────────┘  │
│       │                                                 │
│  ┌────▼─────────────────────────────────────────────┐  │
│  │              AppRouter (React Router v7)          │  │
│  │  23 Routes → Lazy-loaded Page Components           │  │
│  └────────────────────────┬─────────────────────────┘  │
│                           │                             │
│  ┌────────────────────────▼─────────────────────────┐  │
│  │              MainLayout                          │  │
│  │  ┌─────────┐  ┌──────────┐                      │  │
│  │  │ Sidebar │  │  Navbar  │  → {children}        │  │
│  │  │(23 nav  │  │(Search,  │                      │  │
│  │  │ items)  │  │ Notifs,  │                      │  │
│  │  └─────────┘  │ UserMenu)│                      │  │
│  │               └──────────┘                      │  │
│  └─────────────────────────────────────────────────┘  │
│                           │                             │
│  ┌────────────────────────▼─────────────────────────┐  │
│  │              Page Components                      │  │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────────────┐  │  │
│  │  │HRDashboard│ │Employees │ │ Leave            │  │  │
│  │  │(Complete) │ │(Complete)│ │ (Complete)       │  │  │
│  │  ├──────────┤ ├──────────┤ ├──────────────────┤  │  │
│  │  │Attendance│ │ Payroll  │ │ 18× ModuleStub   │  │  │
│  │  │(Complete) │ │(Complete)│ │ (Placeholder)    │  │  │
│  │  └──────────┘ └──────────┘ └──────────────────┘  │  │
│  └────────────────────────┬─────────────────────────┘  │
│                           │                             │
│  ┌────────────────────────▼─────────────────────────┐  │
│  │         Service Layer (Mock)                      │  │
│  │  ┌──────────────┐ ┌──────────────┐               │  │
│  │  │employeeSvc   │ │ leaveSvc     │               │  │
│  │  │attendanceSvc │ │ payrollSvc   │               │  │
│  │  └──────────────┘ └──────────────┘               │  │
│  │         ↓                                         │  │
│  │  ┌──────────────────────────────────────────────┐ │  │
│  │  │           src/mock/*.js                      │ │  │
│  │  │  (employees, leave, attendance, payroll)     │ │  │
│  │  └──────────────────────────────────────────────┘ │  │
│  └─────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

## Planned Architecture (Backend)

Based on `docs/03_Database_Design.md`, the intended production architecture is:

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   React SPA  │────▶│  Node.js API  │────▶│  PostgreSQL  │
│   (Vite)     │◀────│  (Express)   │◀────│  (Database)  │
└──────────────┘     └──────────────┘     └──────────────┘
                            │
                     ┌──────┴──────┐
                     │   JWT Auth  │
                     │  RBAC Check │
                     └─────────────┘
```

- **Frontend**: Single-page React app communicating via REST API
- **Backend**: Node.js/Express with JWT authentication and role-based access control
- **Database**: PostgreSQL with 15 tables as designed in `03_Database_Design.md`
- **Authentication**: JWT tokens with bcrypt password hashing
- **Authorization**: Role-based (ADMIN, HR, MANAGER, EMPLOYEE) with granular permissions

## Key Design Decisions

1. **No Backend Yet**: The entire project is frontend-only. All API calls are mocked.
2. **Mock Data First**: `src/mock/` files contain realistic data matching the planned API shapes.
3. **Axios Pre-configured**: `src/services/api.js` has interceptors for auth tokens and error handling — ready for backend connection.
4. **Lazy Loading**: All 23 module pages use React.lazy() for code splitting.
5. **CSS Variables**: Consistent theming via CSS custom properties in `variables.css`.
6. **No TypeScript**: Despite being listed in dependencies, no .ts files exist.
