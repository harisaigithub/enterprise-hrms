# Enterprise HRMS

A comprehensive Enterprise Human Resource Management System with 23 modules covering the complete employee lifecycle — from recruitment through separation.

## Current Status

**Frontend-only prototype with mock data.** This is an internship project with a fully designed frontend UI but no backend implementation. The application demonstrates the planned UX, data models, and workflows.

## Features (Implemented)

- **Dashboard**: Role-based HR dashboard with alerts, hiring insights, quick actions, team snapshot, payroll summary
- **Employee Management**: Searchable/filterable table, add employee modal, employee profile with 3 tabs
- **Attendance Tracking**: Check-in/out toggle, team summary, monthly records with status badges
- **Leave Management**: Leave balances with usage bars, apply for leave modal, requests table
- **Payroll**: Payroll runs, payslip detail view, run payroll with confirmation dialog
- **Global Search**: Ctrl+K command palette searching employees, leave, and payroll

## Features (Planned — 18 modules)

Recruitment (ATS), Onboarding, Performance Management, LMS, Asset Management, Task Management, Expense Management, Travel Management, Employee Self Service, Helpdesk, Policy Management, Separation Management, Organization Management, Workflow Engine, Reports & Analytics, Notifications, Compliance, Security & Administration

## Tech Stack

| Technology | Version | Purpose |
|------------|---------|---------|
| React | 19.2.7 | UI framework |
| Vite | 8.1.1 | Build tool |
| React Router | 7.18.1 | Routing |
| Tailwind CSS | 4.3.3 | Styling |
| TanStack React Query | 5.101.2 | State management |
| Axios | 1.18.1 | HTTP client |
| Recharts | 3.9.2 | Charts |
| Lucide React | 1.25.0 | Icons |
| React Hook Form | 7.82.0 | Forms |

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                 React SPA (Vite)                        │
│  ┌──────────┐  ┌────────────┐  ┌───────────────────┐  │
│  │ Auth     │  │ Search     │  │ 23 Page Modules   │  │
│  │ Context  │  │ Context    │  │ (5 complete)      │  │
│  └──────────┘  └────────────┘  └───────────────────┘  │
│         ↓              ↓              ↓                 │
│  ┌─────────────────────────────────────────────────┐  │
│  │              Service Layer (Mock)                │  │
│  └──────────────────────┬──────────────────────────┘  │
│                         ↓                              │
│              ┌────────────────────┐                    │
│              │   Mock Data (5)    │                    │
│              └────────────────────┘                    │
└─────────────────────────────────────────────────────────┘
```

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the full architecture diagram.

## Folder Structure

```
enterprise-hrms/
├── frontend/                    # React application
│   ├── src/
│   │   ├── components/
│   │   │   ├── dashboard/       # Dashboard widgets (8)
│   │   │   ├── layout/          # App shell (Sidebar, Navbar, MainLayout)
│   │   │   └── shared/          # Reusable UI (7 components)
│   │   ├── context/             # AuthContext, SearchContext
│   │   ├── data/                # Static dashboard data
│   │   ├── mock/                # Mock API data (employees, leave, etc.)
│   │   ├── pages/               # 28 page components (23 modules)
│   │   │   ├── Dashboard/       # HR, Admin, Manager, Employee
│   │   │   ├── Employees/       # List + Profile
│   │   │   ├── Attendance/      # Check-in/out, records
│   │   │   ├── Leave/           # Balances, requests
│   │   │   ├── Payroll/         # Runs, payslips
│   │   │   └── ...              # 18 stub pages
│   │   ├── routes/              # AppRouter, DashboardRouter (deprecated)
│   │   ├── services/            # API service layer (5 services)
│   │   └── styles/              # CSS variables, global styles
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
├── docs/                        # Documentation
├── .env.example                 # Empty — no env vars yet
├── docker-compose.yml           # Empty
└── README.md
```

## Installation

```bash
# Clone the repository
git clone <repo-url>
cd enterprise-hrms/frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

## Environment Variables

| Variable | Default | Purpose |
|----------|---------|---------|
| `VITE_API_URL` | `/api` | Backend API base URL |

Copy `.env.example` to `.env` to customize.

## Running Locally

```bash
cd enterprise-hrms/frontend
npm install
npm run dev
```

The app starts at `http://localhost:5173`.

## Build for Production

```bash
npm run build
npm run preview
```

## Database Setup (Planned)

The intended database is PostgreSQL. The schema design document is at `docs/DATABASE.md`.

To apply the schema when backend is ready:

```bash
psql -U hrms_admin -d hrms_db -f schema.sql
```

## API Documentation

See [docs/API.md](docs/API.md) for detailed API documentation.

## Documentation Index

| Document | Description |
|----------|-------------|
| [ARCHITECTURE.md](docs/ARCHITECTURE.md) | System architecture and design |
| [API.md](docs/API.md) | API endpoints and service layer |
| [DATABASE.md](docs/DATABASE.md) | Database schema and ER diagram |
| [BACKEND.md](docs/BACKEND.md) | Backend analysis and plan |
| [FRONTEND.md](docs/FRONTEND.md) | Frontend analysis and pages |
| [AUTHENTICATION.md](docs/AUTHENTICATION.md) | Auth flow and security |
| [FEATURES.md](docs/FEATURES.md) | Feature inventory |
| [PROGRESS.md](docs/PROGRESS.md) | Project completion status |
| [TODO.md](docs/TODO.md) | TODOs and code quality issues |
| [SECURITY.md](docs/SECURITY.md) | Security analysis |

## Future Improvements

1. **Backend Implementation**: Node.js/Express REST API with PostgreSQL
2. **Real Authentication**: JWT-based login with role-based access control
3. **Remaining 18 Modules**: Full feature implementation
4. **TypeScript Migration**: Add type safety
5. **Unit & Integration Tests**: Test coverage
6. **CI/CD Pipeline**: Automated build, test, deploy
7. **Docker Setup**: Containerized deployment
8. **Internationalization**: Multi-language support
9. **Dark Mode**: Theme toggle
10. **Accessibility**: WCAG compliance
