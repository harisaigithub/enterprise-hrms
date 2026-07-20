/**
 * Sidebar — All 23 HRMS modules, grouped by category.
 * Active state driven by current URL (useLocation from React Router).
 */

import {
  LayoutDashboard, Users, UserCheck, CalendarDays, Wallet, TrendingUp,
  GraduationCap, Laptop, CheckSquare, Receipt, Plane, Home, Headphones,
  FileText, LogOut, Building2, GitBranch, BarChart3, Bell, Shield, UserPlus,
  ClipboardList,
} from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

const NAV_GROUPS = [
  {
    label: "Core HR",
    items: [
      { icon: LayoutDashboard, title: "Dashboard",   href: "/"           },
      { icon: Users,           title: "Employees",   href: "/employees"  },
      { icon: UserCheck,       title: "Attendance",  href: "/attendance" },
      { icon: CalendarDays,    title: "Leave",       href: "/leave"      },
      { icon: Wallet,          title: "Payroll",     href: "/payroll"    },
      { icon: TrendingUp,      title: "Performance", href: "/performance"},
    ],
  },
  {
    label: "Talent",
    items: [
      { icon: UserPlus,        title: "Recruitment", href: "/recruitment"},
      { icon: ClipboardList,   title: "Onboarding",  href: "/onboarding" },
      { icon: GraduationCap,   title: "LMS",         href: "/lms"        },
    ],
  },
  {
    label: "Operations",
    items: [
      { icon: Laptop,          title: "Assets",      href: "/assets"   },
      { icon: CheckSquare,     title: "Tasks",       href: "/tasks"    },
      { icon: Receipt,         title: "Expenses",    href: "/expenses" },
      { icon: Plane,           title: "Travel",      href: "/travel"   },
    ],
  },
  {
    label: "Employee",
    items: [
      { icon: Home,        title: "Self Service", href: "/ess"      },
      { icon: Headphones,  title: "Helpdesk",     href: "/helpdesk" },
      { icon: FileText,    title: "Policies",     href: "/policies" },
    ],
  },
  {
    label: "Admin",
    items: [
      { icon: LogOut,      title: "Separation",    href: "/separation"      },
      { icon: Building2,   title: "Org Management",href: "/org-management"  },
      { icon: GitBranch,   title: "Workflows",     href: "/workflows"       },
      { icon: BarChart3,   title: "Reports",       href: "/reports"         },
      { icon: Bell,        title: "Notifications", href: "/notifications"   },
      { icon: Shield,      title: "Compliance",    href: "/compliance"      },
      { icon: Shield,      title: "Security",      href: "/security"        },
    ],
  },
];

function NavItem({ item, isActive, onClick }) {
  return (
    <button
      onClick={() => onClick(item.href)}
      title={item.title}
      style={{
        display: "flex", alignItems: "center", gap: "10px",
        padding: "8px 12px",
        borderRadius: "var(--radius-sm)",
        border: "none",
        background: isActive ? "var(--sidebar-active)" : "transparent",
        color: isActive ? "var(--sidebar-text-active)" : "var(--sidebar-text)",
        fontWeight: isActive ? 600 : 400,
        fontSize: "13px", cursor: "pointer",
        width: "100%", textAlign: "left",
        position: "relative",
        transition: "background 0.12s, color 0.12s",
      }}
      onMouseEnter={(e) => {
        if (!isActive) {
          e.currentTarget.style.background = "rgba(148,163,184,0.08)";
          e.currentTarget.style.color = "#f8fafc";
        }
      }}
      onMouseLeave={(e) => {
        if (!isActive) {
          e.currentTarget.style.background = "transparent";
          e.currentTarget.style.color = "var(--sidebar-text)";
        }
      }}
      aria-current={isActive ? "page" : undefined}
    >
      {isActive && (
        <span style={{ position: "absolute", left: 0, top: "50%", transform: "translateY(-50%)", width: "3px", height: "18px", borderRadius: "0 3px 3px 0", background: "var(--primary)" }} />
      )}
      <item.icon size={16} style={{ color: isActive ? "var(--primary)" : "var(--sidebar-text)", flexShrink: 0, transition: "color 0.12s" }} />
      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.title}</span>
    </button>
  );
}

export default function Sidebar() {
  const navigate  = useNavigate();
  const location  = useLocation();
  const { user }  = useAuth();

  const isActive = (href) => {
    if (href === "/") return location.pathname === "/";
    return location.pathname.startsWith(href);
  };

  return (
    <aside
      style={{
        width: "var(--sidebar-width)", background: "var(--sidebar-bg)",
        flexShrink: 0, height: "100vh",
        display: "flex", flexDirection: "column",
        position: "sticky", top: 0, overflowY: "auto",
      }}
    >
      {/* Logo */}
      <div style={{ height: "64px", display: "flex", alignItems: "center", gap: "10px", padding: "0 18px", borderBottom: "1px solid rgba(148,163,184,0.12)", flexShrink: 0 }}>
        <div style={{ width: "32px", height: "32px", borderRadius: "8px", background: "var(--primary)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 800, fontSize: "13px", flexShrink: 0 }}>
          HR
        </div>
        <div>
          <p style={{ fontWeight: 700, fontSize: "14px", color: "#f8fafc", lineHeight: 1.2 }}>HRMS</p>
          <p style={{ fontSize: "10px", color: "var(--sidebar-text)", lineHeight: 1.2 }}>Workforce Hub</p>
        </div>
      </div>

      {/* Navigation groups */}
      <nav style={{ flex: 1, padding: "10px 8px", overflowY: "auto" }}>
        {NAV_GROUPS.map((group) => (
          <div key={group.label} style={{ marginBottom: "6px" }}>
            <p style={{ fontSize: "9.5px", fontWeight: 700, color: "rgba(148,163,184,0.6)", textTransform: "uppercase", letterSpacing: "0.7px", padding: "8px 12px 4px" }}>
              {group.label}
            </p>
            {group.items.map((item) => (
              <NavItem
                key={item.href}
                item={item}
                isActive={isActive(item.href)}
                onClick={navigate}
              />
            ))}
          </div>
        ))}
      </nav>

      {/* User footer */}
      <div style={{ padding: "14px 14px", borderTop: "1px solid rgba(148,163,184,0.12)", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <img src={user.avatar} alt="User" style={{ width: "32px", height: "32px", borderRadius: "50%", objectFit: "cover", border: "2px solid var(--sidebar-active)", flexShrink: 0 }} />
          <div style={{ minWidth: 0 }}>
            <p style={{ fontSize: "12.5px", fontWeight: 600, color: "#f8fafc", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {user.firstName} {user.lastName}
            </p>
            <p style={{ fontSize: "10.5px", color: "var(--sidebar-text)" }}>{user.role}</p>
          </div>
        </div>
      </div>
    </aside>
  );
}