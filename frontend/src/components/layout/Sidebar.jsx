// Sidebar navigation — collapsible groups for enterprise HRMS.
// Preserves existing icon-only collapse mode, adds group expand/collapse with localStorage persistence.

import {
  LayoutDashboard, Users, UserCheck, CalendarDays, Wallet, TrendingUp,
  GraduationCap, Laptop, CheckSquare, Receipt, Plane, Home, Headphones,
  FileText, LogOut, Building2, GitBranch, BarChart3, Bell, Shield, UserPlus,
  ClipboardList, ChevronDown, UserRound, CreditCard, Briefcase, ClipboardCheck,
} from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useState, useEffect, useMemo } from "react";

/* ─── Navigation structure ─────────────────────────────── */
// Each group has a label, icon, and items. Items reference existing routes.
// Permission strings match backend RBAC (e.g., "employees:read").
const NAV_GROUPS = [
  {
    key: "workforce",
    label: "Workforce",
    icon: Users,
    category: "CORE HR",
    items: [
      { icon: LayoutDashboard, title: "Dashboard", href: "/", permission: "dashboard" },
      { icon: Users, title: "Employees", href: "/employees", permission: "employees" },
      { icon: UserCheck, title: "Attendance", href: "/attendance", permission: "attendance" },
      { icon: CalendarDays, title: "Leave", href: "/leave", permission: "leave" },
      { icon: Wallet, title: "Payroll", href: "/payroll", permission: "payroll" },
      { icon: TrendingUp, title: "Performance", href: "/performance", permission: "performance" },
    ],
  },
  {
    key: "talent",
    label: "Talent Management",
    icon: UserPlus,
    category: "TALENT",
    items: [
      { icon: UserPlus, title: "Recruitment", href: "/recruitment", permission: "recruitment" },
      { icon: ClipboardList, title: "Onboarding", href: "/onboarding", permission: "onboarding" },
      { icon: GraduationCap, title: "LMS", href: "/lms", permission: "lms" },
    ],
  },
  {
    key: "operations",
    label: "Operations",
    icon: Briefcase,
    category: "OPERATIONS",
    items: [
      { icon: CreditCard, title: "Expenses", href: "/expenses", permission: "expenses" },
      { icon: Laptop, title: "Assets", href: "/assets", permission: "assets" },
      { icon: CheckSquare, title: "Tasks", href: "/tasks", permission: "tasks" },
      { icon: Plane, title: "Travel", href: "/travel", permission: "travel" },
    ],
  },
  {
    key: "selfservice",
    label: "Self Service",
    icon: UserRound,
    category: "EMPLOYEE",
    items: [
      { icon: Home, title: "My Profile", href: "/ess", permission: "ess" },
      { icon: UserCheck, title: "My Attendance", href: "/attendance", permission: "attendance" },
      { icon: CalendarDays, title: "My Leave", href: "/leave", permission: "leave" },
      { icon: CreditCard, title: "My Expenses", href: "/expenses", permission: "expenses" },
    ],
  },
  {
    key: "admin",
    label: "Administration",
    icon: Shield,
    category: "ADMIN",
    items: [
      { icon: LogOut, title: "Separation", href: "/separation", permission: "separation" },
      { icon: Building2, title: "Org Management", href: "/org-management", permission: "orgmanagement" },
      { icon: GitBranch, title: "Workflows", href: "/workflows", permission: "workflows" },
      { icon: BarChart3, title: "Reports", href: "/reports", permission: "reports" },
      { icon: Bell, title: "Notifications", href: "/notifications", permission: "notifications" },
      { icon: Shield, title: "Compliance", href: "/compliance", permission: "compliance" },
      { icon: Shield, title: "Security", href: "/security", permission: "security" },
    ],
  },
];

const STORAGE_KEY = "proteccio_sidebar_groups";

/* ─── NavItem ──────────────────────────────────────────── */
function NavItem({ item, isActive, onClick, showLabel }) {
  return (
    <button
      onClick={() => onClick(item.href)}
      title={item.title}
      aria-current={isActive ? "page" : undefined}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: showLabel ? "flex-start" : "center",
        gap: showLabel ? "10px" : "0",
        padding: showLabel ? "9px 12px 9px 14px" : "9px 0",
        borderRadius: "10px",
        border: "none",
        background: isActive ? "rgba(15,118,110,0.16)" : "transparent",
        color: isActive ? "#ffffff" : "var(--sidebar-text)",
        fontWeight: isActive ? 600 : 400,
        fontSize: "13px",
        cursor: "pointer",
        width: "100%",
        textAlign: "left",
        position: "relative",
        transition: "background 0.15s, color 0.15s",
        overflow: "hidden",
      }}
      onMouseEnter={(e) => {
        if (!isActive) {
          e.currentTarget.style.background = "rgba(255,255,255,0.06)";
          e.currentTarget.style.color = "#e2eaf2";
        }
      }}
      onMouseLeave={(e) => {
        if (!isActive) {
          e.currentTarget.style.background = "transparent";
          e.currentTarget.style.color = "var(--sidebar-text)";
        }
      }}
    >
      {/* Teal accent left border for active item */}
      {isActive && (
        <span style={{
          position: "absolute",
          left: 0, top: "50%", transform: "translateY(-50%)",
          width: "3px", height: "22px",
          borderRadius: "0 3px 3px 0",
          background: "var(--primary)",
          boxShadow: "0 0 8px rgba(15,118,110,0.7)",
        }} />
      )}

      <item.icon
        size={16}
        style={{
          color: isActive ? "#5eead4" : "var(--sidebar-text)",
          flexShrink: 0,
          transition: "color 0.15s",
        }}
      />

      {/* Label only shown when sidebar is expanded */}
      {showLabel && (
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {item.title}
        </span>
      )}
    </button>
  );
}

/* ─── NavGroup ─────────────────────────────────────────── */
function NavGroup({ group, isExpanded, onToggle, items, isOpen, location, navigate }) {
  const hasActiveChild = items.some((item) => {
    if (item.href === "/") return location.pathname === "/";
    return location.pathname.startsWith(item.href);
  });

  const handleKeyDown = (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onToggle();
    }
  };

  return (
    <div style={{ marginBottom: "4px" }}>
      {/* Group header — clickable when sidebar is expanded */}
      {isOpen && (
        <button
          onClick={onToggle}
          onKeyDown={handleKeyDown}
          aria-expanded={isExpanded}
          aria-controls={`${group.key}-items`}
          id={`${group.key}-header`}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            padding: "9px 12px 9px 14px",
            borderRadius: "10px",
            border: "none",
            background: isExpanded ? "rgba(15,118,110,0.1)" : "transparent",
            color: "var(--sidebar-section)",
            fontWeight: 600,
            fontSize: "12px",
            textTransform: "uppercase",
            letterSpacing: "0.6px",
            cursor: "pointer",
            width: "100%",
            textAlign: "left",
            transition: "background 0.15s, color 0.15s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "rgba(255,255,255,0.06)";
            e.currentTarget.style.color = "#e2eaf2";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = isExpanded ? "rgba(15,118,110,0.1)" : "transparent";
            e.currentTarget.style.color = "var(--sidebar-section)";
          }}
        >
          <group.icon
            size={15}
            style={{
              color: "var(--sidebar-section)",
              flexShrink: 0,
              transition: "color 0.15s",
            }}
          />
          <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {group.label}
          </span>
          <ChevronDown
            size={14}
            style={{
              color: "var(--sidebar-section)",
              flexShrink: 0,
              transition: "transform 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
              transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)",
            }}
          />
        </button>
      )}

      {/* When sidebar collapsed, show category label only on hover via tooltip */}
      {!isOpen && (
        <div
          style={{ height: "10px" }}
          title={group.category}
        />
      )}

      {/* Collapsible items */}
      <div
        id={`${group.key}-items`}
        role="region"
        aria-labelledby={`${group.key}-header`}
        style={{
          overflow: "hidden",
          maxHeight: isExpanded ? "500px" : "0",
          opacity: isExpanded ? 1 : 0,
          transition: "max-height 0.25s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.15s ease",
        }}
      >
        {items.map((item) => (
          <NavItem
            key={item.href}
            item={item}
            isActive={
              item.href === "/"
                ? location.pathname === "/"
                : location.pathname.startsWith(item.href)
            }
            onClick={navigate}
            showLabel={isOpen}
          />
        ))}
      </div>
    </div>
  );
}

/* ─── Sidebar ──────────────────────────────────────────── */
export default function Sidebar({ isOpen }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, permissions } = useAuth();

  // Load persisted expanded state from localStorage
  const [expandedGroups, setExpandedGroups] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) return JSON.parse(stored);
    } catch {}
    // Default: expand Workforce and Self Service
    return { workforce: true, selfservice: true };
  });

  // Persist expanded state
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(expandedGroups));
    } catch {}
  }, [expandedGroups]);

  const isActive = (href) => {
    if (href === "/") return location.pathname === "/";
    return location.pathname.startsWith(href);
  };

  const canView = (item) => permissions.includes(`${item.permission}:read`);

  // Filter groups by permissions, drop empty groups
  const visibleGroups = useMemo(() =>
    NAV_GROUPS
      .map((group) => ({ ...group, items: group.items.filter(canView) }))
      .filter((group) => group.items.length > 0),
    [permissions]
  );

  // Auto-expand group if one of its children is the active route
  useEffect(() => {
    const newExpanded = { ...expandedGroups };
    let changed = false;

    visibleGroups.forEach((group) => {
      const hasActive = group.items.some((item) => isActive(item.href));
      if (hasActive && !newExpanded[group.key]) {
        newExpanded[group.key] = true;
        changed = true;
      }
    });

    if (changed) setExpandedGroups(newExpanded);
  }, [location.pathname, visibleGroups, expandedGroups]);

  const toggleGroup = (key) => {
    setExpandedGroups((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <aside
      style={{
        width: isOpen ? "var(--sidebar-width)" : "var(--sidebar-collapsed)",
        background: "var(--sidebar-gradient)",
        flexShrink: 0,
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        position: "sticky",
        top: 0,
        overflowY: "auto",
        overflowX: "hidden",
        transition: "width 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
        borderRight: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      {/* ── Brand / Logo ── */}
      <div style={{
        height: "var(--navbar-height)",
        display: "flex",
        alignItems: "center",
        justifyContent: isOpen ? "flex-start" : "center",
        gap: "10px",
        padding: isOpen ? "0 18px" : "0",
        borderBottom: "1px solid rgba(255,255,255,0.07)",
        flexShrink: 0,
        overflow: "hidden",
      }}>
        <img
          src="/logo.png"
          alt="Proteccio HRMS Logo"
          style={{
            width: "34px", height: "34px",
            borderRadius: "9px",
            objectFit: "contain",
            flexShrink: 0,
            filter: "brightness(1.1) drop-shadow(0 2px 6px rgba(15,118,110,0.5))",
          }}
        />
        {isOpen && (
          <div style={{ overflow: "hidden", whiteSpace: "nowrap" }}>
            <p style={{ fontWeight: 800, fontSize: "14.5px", color: "#f0f9ff", lineHeight: 1.2, letterSpacing: "-0.2px" }}>
              Proteccio HRMS
            </p>
            <p style={{ fontSize: "10px", color: "var(--sidebar-text)", lineHeight: 1.3 }}>
              Enterprise Suite
            </p>
          </div>
        )}
      </div>

      {/* ── Navigation groups ── */}
      <nav style={{ flex: 1, padding: "10px 8px", overflowY: "auto", overflowX: "hidden" }}>
        {visibleGroups.map((group, groupIndex) => (
          <div key={group.key} style={{ marginBottom: groupIndex === visibleGroups.length - 1 ? "0" : "8px" }}>
            {/* Category label — shown above group when expanded */}
            {isOpen && (
              <p style={{
                fontSize: "9px",
                fontWeight: 700,
                color: "var(--sidebar-section)",
                textTransform: "uppercase",
                letterSpacing: "0.9px",
                padding: "10px 12px 4px",
                whiteSpace: "nowrap",
                margin: 0,
              }}>
                {group.category}
              </p>
            )}
            {!isOpen && <div style={{ height: "10px" }} />}

            <NavGroup
              group={group}
              isExpanded={expandedGroups[group.key] ?? false}
              onToggle={() => toggleGroup(group.key)}
              items={group.items}
              isOpen={isOpen}
              location={location}
              navigate={navigate}
            />
          </div>
        ))}
      </nav>

      {/* ── User footer ── */}
      <div style={{
        padding: isOpen ? "12px 14px" : "12px 0",
        borderTop: "1px solid rgba(255,255,255,0.07)",
        flexShrink: 0,
        display: "flex",
        justifyContent: isOpen ? "flex-start" : "center",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", overflow: "hidden" }}>
          {/* Avatar with teal ring */}
          <div style={{
            position: "relative",
            flexShrink: 0,
            width: "34px", height: "34px",
          }}>
            <img
              src={user.avatar}
              alt="User"
              title={`${user.firstName} ${user.lastName}`}
              style={{
                width: "34px", height: "34px",
                borderRadius: "50%",
                objectFit: "cover",
                border: "2px solid rgba(15,118,110,0.7)",
              }}
            />
            {/* Online dot */}
            <span style={{
              position: "absolute", bottom: 0, right: 0,
              width: "9px", height: "9px",
              borderRadius: "50%",
              background: "#10b981",
              border: "2px solid var(--sidebar-bg)",
            }} />
          </div>

          {/* Name + role — only when expanded */}
          {isOpen && (
            <div style={{ minWidth: 0 }}>
              <p style={{
                fontSize: "12.5px", fontWeight: 700, color: "#f0f9ff",
                whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
              }}>
                {user.firstName} {user.lastName}
              </p>
              <p style={{ fontSize: "10.5px", color: "var(--sidebar-text)" }}>
                {user.role}
              </p>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}