/**
 * Navbar — Global search (Ctrl+K), notifications dropdown, user menu with logout.
 * Reads from SearchContext for unified search state.
 *
 * Props:
 *   onToggleSidebar  {function} — called when sidebar toggle button is clicked
 *   sidebarOpen      {boolean}  — current sidebar state (for icon switching)
 */

import {
  Bell, Search, ChevronDown, X, LogOut, UserRound,
  CheckCheck, Settings, PanelLeftClose, PanelLeftOpen,
} from "lucide-react";
import { useRef, useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useSearch } from "../../context/SearchContext";
import { useAuth } from "../../context/AuthContext";
<<<<<<< HEAD
import { RAW_INBOX } from "../../mock/notifications";
=======
import { getInboxNotifications, markAllRead as markAllNotificationsRead, markAsRead } from "../../services/notificationService";
>>>>>>> 6131c0564256db16d13c9827b08130599434aac1

/* ─── Constants ──────────────────────────────────────── */
const TYPE_COLOR = {
  Employee:        { color: "#0f766e", bg: "#f0fdfa" },
  "Leave Request": { color: "#d97706", bg: "#fffbeb" },
  "Payroll Run":   { color: "#059669", bg: "#ecfdf5" },
};

/* ─── Helpers ────────────────────────────────────────── */
function timeAgo(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

/* ─── Navbar ─────────────────────────────────────────── */
export default function Navbar({ onToggleSidebar, sidebarOpen }) {
  const { query, setQuery, results, isOpen, setIsOpen, clear } = useSearch();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const inputRef = useRef(null);
  const dropRef  = useRef(null);
  const notifRef = useRef(null);
  const menuRef  = useRef(null);
  const [openMenu, setOpenMenu] = useState(null); // "notif" | "user" | null

  const [inbox, setInbox] = useState([]);

  const unreadCount = inbox.filter((n) => !n.read).length;

  const loadNotifications = useCallback(async () => {
    try {
      const result = await getInboxNotifications();
      setInbox(result.data.slice(0, 5));
    } catch {
      setInbox([]);
    }
  }, []);

  // The effect intentionally starts an authenticated external-system fetch.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void loadNotifications(); }, [loadNotifications]);

  const markAllRead = useCallback(async () => {
    await markAllNotificationsRead();
    setInbox((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  // Ctrl+K / Cmd+K focuses search
  useEffect(() => {
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        inputRef.current?.focus();
        setIsOpen(true);
      }
      if (e.key === "Escape") { clear(); setOpenMenu(null); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [clear, setIsOpen]);

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = (e) => {
      if (dropRef.current  && !dropRef.current.contains(e.target))  setIsOpen(false);
      if (notifRef.current && !notifRef.current.contains(e.target)) setOpenMenu((m) => (m === "notif" ? null : m));
      if (menuRef.current  && !menuRef.current.contains(e.target))  setOpenMenu((m) => (m === "user"  ? null : m));
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [setIsOpen]);

  const handleSelect = (entry) => { navigate(entry.href); clear(); };

  const handleLogout = async () => {
    setOpenMenu(null);
    await logout();
    navigate("/login", { replace: true });
  };

  const handleNotificationClick = async (n) => {
    if (!n.read) await markAsRead(n.id);
    setInbox((prev) => prev.map((x) => (x.id === n.id ? { ...x, read: true } : x)));
    setOpenMenu(null);
    if (n.link) navigate(n.link);
  };

  /* shared icon-button style */
  const iconBtn = {
    position: "relative", background: "none", border: "none", cursor: "pointer",
    padding: "8px", borderRadius: "var(--radius-sm)", color: "var(--label)",
    display: "flex", alignItems: "center", transition: "background 0.15s, color 0.15s",
  };

  return (
    <header
      style={{
        position: "sticky", top: 0, zIndex: 50,
        // Glassmorphism effect
        background: "var(--navbar-bg)",
        backdropFilter: "var(--navbar-blur)",
        WebkitBackdropFilter: "var(--navbar-blur)",
        height: "var(--navbar-height)",
        borderBottom: "1px solid rgba(13,27,42,0.08)",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 24px",
        boxShadow: "0 1px 0 rgba(13,27,42,0.06), 0 2px 8px rgba(13,27,42,0.04)",
        flexShrink: 0,
        gap: "16px",
      }}
    >
      {/* ── Left: toggle + search ── */}
      <div style={{ display: "flex", alignItems: "center", gap: "10px", flex: 1, minWidth: 0 }}>

        {/* Sidebar toggle */}
        <button
          id="sidebar-toggle-btn"
          aria-label={sidebarOpen ? "Close sidebar" : "Open sidebar"}
          title={sidebarOpen ? "Close sidebar" : "Open sidebar"}
          onClick={onToggleSidebar}
          style={{ ...iconBtn, flexShrink: 0 }}
          onMouseEnter={(e) => { e.currentTarget.style.background = "var(--background)"; e.currentTarget.style.color = "var(--primary)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "none"; e.currentTarget.style.color = "var(--label)"; }}
        >
          {sidebarOpen ? <PanelLeftClose size={20} /> : <PanelLeftOpen size={20} />}
        </button>

        {/* Search */}
        <div ref={dropRef} style={{ position: "relative", maxWidth: "440px", width: "100%" }}>
          <Search
            size={15}
            style={{
              position: "absolute", left: "13px", top: "50%", transform: "translateY(-50%)",
              color: "var(--subtext)", pointerEvents: "none", zIndex: 1,
            }}
          />
          <input
            id="global-search-input"
            ref={inputRef}
            type="text"
            value={query}
            placeholder="Search employees, payroll, leave… (Ctrl+K)"
            onChange={(e) => { setQuery(e.target.value); setIsOpen(true); }}
            onFocus={(e) => {
              setIsOpen(true);
              e.target.style.borderColor = "var(--border-focus)";
              e.target.style.boxShadow = "0 0 0 3px rgba(15,118,110,0.12)";
              e.target.style.background = "#fff";
            }}
            onBlur={(e) => {
              e.target.style.borderColor = "var(--border)";
              e.target.style.boxShadow = "none";
              e.target.style.background = "var(--background)";
            }}
            style={{
              width: "100%", height: "38px",
              paddingLeft: "38px", paddingRight: query ? "36px" : "14px",
              border: "1.5px solid var(--border)", borderRadius: "var(--radius)",
              background: "var(--background)",
              fontSize: "13px", color: "var(--text)", outline: "none",
              transition: "border-color 0.15s, box-shadow 0.15s, background 0.15s",
            }}
          />
          {query && (
            <button
              onClick={clear}
              aria-label="Clear search"
              style={{
                position: "absolute", right: "10px", top: "50%", transform: "translateY(-50%)",
                background: "none", border: "none", cursor: "pointer", color: "var(--subtext)",
                display: "flex", alignItems: "center", padding: "2px",
              }}
            >
              <X size={14} />
            </button>
          )}

          {/* Search results dropdown */}
          {isOpen && query.length >= 2 && (
            <div style={{
              position: "absolute", top: "calc(100% + 6px)", left: 0, right: 0,
              background: "#fff", border: "1px solid var(--border)",
              borderRadius: "var(--radius-lg)", boxShadow: "var(--shadow-lg)",
              zIndex: 200, overflow: "hidden", maxHeight: "400px", overflowY: "auto",
              animation: "dialog-in 0.15s ease",
            }}>
              {results.length === 0 ? (
                <div style={{ padding: "20px", textAlign: "center", color: "var(--subtext)", fontSize: "13px" }}>
                  No results for &ldquo;<strong>{query}</strong>&rdquo;
                </div>
              ) : (
                <>
                  <div style={{ padding: "8px 14px 4px", fontSize: "10px", fontWeight: 700, color: "var(--subtext)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                    {results.length} result{results.length !== 1 ? "s" : ""}
                  </div>
                  {results.map((entry) => {
                    const tc = TYPE_COLOR[entry.type] || TYPE_COLOR.Employee;
                    return (
                      <button
                        key={entry.id}
                        onClick={() => handleSelect(entry)}
                        style={{
                          display: "flex", alignItems: "center", gap: "12px",
                          width: "100%", padding: "10px 14px",
                          background: "none", border: "none", cursor: "pointer",
                          textAlign: "left", transition: "background 0.12s",
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = "var(--background)")}
                        onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
                      >
                        {entry.avatar ? (
                          <img src={entry.avatar} alt="" style={{ width: "30px", height: "30px", borderRadius: "50%", objectFit: "cover", border: "1px solid var(--border)", flexShrink: 0 }} />
                        ) : (
                          <div style={{ width: "30px", height: "30px", borderRadius: "var(--radius-sm)", background: tc.bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                            <span style={{ fontSize: "10px", fontWeight: 800, color: tc.color }}>{entry.type[0]}</span>
                          </div>
                        )}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontSize: "13.5px", fontWeight: 600, color: "var(--text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{entry.title}</p>
                          <p style={{ fontSize: "11.5px", color: "var(--subtext)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{entry.subtitle}</p>
                        </div>
                        <span style={{ fontSize: "10px", fontWeight: 600, color: tc.color, background: tc.bg, padding: "2px 7px", borderRadius: "99px", flexShrink: 0 }}>
                          {entry.type}
                        </span>
                      </button>
                    );
                  })}
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Right: notifications + divider + user ── */}
      <div style={{ display: "flex", alignItems: "center", gap: "4px", flexShrink: 0 }}>

        {/* Notification bell */}
        <div ref={notifRef} style={{ position: "relative" }}>
          <button
            id="notification-btn"
            aria-label="Notifications"
            onClick={() => setOpenMenu((m) => (m === "notif" ? null : "notif"))}
            style={iconBtn}
            onMouseEnter={(e) => { e.currentTarget.style.background = "var(--background)"; e.currentTarget.style.color = "var(--primary)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "none"; e.currentTarget.style.color = "var(--label)"; }}
          >
            <Bell size={20} />
            {unreadCount > 0 && (
              <span style={{
                position: "absolute", top: "4px", right: "4px",
                background: "var(--red)", color: "#fff",
                borderRadius: "99px", fontSize: "9px", fontWeight: 800,
                minWidth: "16px", height: "16px",
                display: "flex", alignItems: "center", justifyContent: "center",
                border: "2px solid #fff", lineHeight: 1,
              }}>
                {unreadCount}
              </span>
            )}
          </button>

          {openMenu === "notif" && (
            <div style={{
              position: "absolute", right: 0, top: "calc(100% + 8px)",
              width: "360px", maxHeight: "440px", overflowY: "auto",
              background: "#fff", border: "1px solid var(--border)",
              borderRadius: "var(--radius-lg)", boxShadow: "var(--shadow-lg)",
              zIndex: 200, animation: "dialog-in 0.15s ease",
            }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", borderBottom: "1px solid var(--border)" }}>
                <p style={{ fontSize: "14px", fontWeight: 700, color: "var(--text)" }}>Notifications</p>
                {unreadCount > 0 && (
                  <button
                    onClick={() => void markAllRead()}
                    style={{ display: "flex", alignItems: "center", gap: "5px", background: "none", border: "none", cursor: "pointer", color: "var(--primary)", fontSize: "12px", fontWeight: 600 }}
                  >
                    <CheckCheck size={14} /> Mark all read
                  </button>
                )}
              </div>

              {inbox.length === 0 ? (
                <div style={{ padding: "24px", textAlign: "center", color: "var(--subtext)", fontSize: "13px" }}>
                  You&apos;re all caught up 🎉
                </div>
              ) : (
                inbox.map((n) => (
                  <button
                    key={n.id}
                    onClick={() => void handleNotificationClick(n)}
                    style={{
                      display: "flex", gap: "12px", width: "100%", padding: "12px 16px",
                      background: n.read ? "none" : "var(--primary-light)",
                      border: "none", borderBottom: "1px solid var(--border)",
                      cursor: "pointer", textAlign: "left",
                      transition: "background 0.12s",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = n.read ? "var(--background)" : "var(--primary-light)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = n.read ? "none" : "var(--primary-light)")}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <p style={{ fontSize: "13px", fontWeight: 700, color: "var(--text)" }}>{n.title}</p>
                        {!n.read && <span style={{ width: "7px", height: "7px", borderRadius: "99px", background: "var(--primary)", flexShrink: 0 }} />}
                      </div>
                      <p style={{ fontSize: "12.5px", color: "var(--label)", marginTop: "2px", lineHeight: 1.45 }}>{n.body}</p>
                      <p style={{ fontSize: "11px", color: "var(--subtext)", marginTop: "4px" }}>{timeAgo(n.timestamp)}</p>
                    </div>
                  </button>
                ))
              )}

              <button
                onClick={() => { setOpenMenu(null); navigate("/notifications"); }}
                style={{
                  width: "100%", padding: "11px 16px",
                  background: "var(--background)", border: "none",
                  borderTop: "1px solid var(--border)", cursor: "pointer",
                  color: "var(--primary)", fontSize: "12.5px", fontWeight: 700,
                  transition: "background 0.12s",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "var(--primary-light)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "var(--background)")}
              >
                View all notifications
              </button>
            </div>
          )}
        </div>

        {/* Divider */}
        <div style={{ width: "1px", height: "26px", background: "var(--border)", margin: "0 4px" }} />

        {/* User menu */}
        <div ref={menuRef} style={{ position: "relative" }}>
          <button
            id="user-menu-btn"
            aria-label="User menu"
            onClick={() => setOpenMenu((m) => (m === "user" ? null : "user"))}
            style={{
              display: "flex", alignItems: "center", gap: "8px",
              background: "none", border: "none", cursor: "pointer",
              padding: "5px 8px 5px 5px", borderRadius: "var(--radius)",
              transition: "background 0.15s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "var(--background)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
          >
            <div style={{ position: "relative" }}>
              <img
                src={user.avatar}
                alt={user.firstName}
                style={{ width: "34px", height: "34px", borderRadius: "50%", objectFit: "cover", border: "2px solid var(--primary-light)" }}
              />
              {/* Online indicator */}
              <span style={{
                position: "absolute", bottom: 0, right: 0,
                width: "9px", height: "9px", borderRadius: "50%",
                background: "#10b981", border: "2px solid #fff",
              }} />
            </div>
            <div style={{ textAlign: "left" }}>
              <p style={{ fontWeight: 700, fontSize: "13px", color: "var(--text)", lineHeight: 1.25 }}>{user.firstName} {user.lastName}</p>
              <p style={{ fontSize: "11px", color: "var(--subtext)", lineHeight: 1.25 }}>{user.designation}</p>
            </div>
            <ChevronDown size={14} style={{ color: "var(--subtext)", flexShrink: 0 }} />
          </button>

          {openMenu === "user" && (
            <div style={{
              position: "absolute", right: 0, top: "calc(100% + 8px)",
              width: "240px", background: "#fff", border: "1px solid var(--border)",
              borderRadius: "var(--radius-lg)", boxShadow: "var(--shadow-lg)",
              zIndex: 200, overflow: "hidden", animation: "dialog-in 0.15s ease",
            }}>
              {/* User header */}
              <div style={{ padding: "14px 16px", borderBottom: "1px solid var(--border)", background: "var(--primary-light)" }}>
                <p style={{ fontSize: "14px", fontWeight: 700, color: "var(--text)", lineHeight: 1.3 }}>
                  {user.firstName} {user.lastName}
                </p>
                <p style={{ fontSize: "11.5px", color: "var(--subtext)", marginTop: "2px" }}>{user.email}</p>
                <span style={{ display: "inline-block", marginTop: "8px", fontSize: "10.5px", fontWeight: 700, color: "var(--primary)", background: "#fff", padding: "2px 9px", borderRadius: "99px", border: "1px solid rgba(15,118,110,0.2)" }}>
                  {user.role}
                </span>
              </div>

              <button onClick={() => { setOpenMenu(null); navigate(`/employees/${user.id}`); }} style={menuItemStyle} onMouseEnter={(e) => (e.currentTarget.style.background = "var(--background)")} onMouseLeave={(e) => (e.currentTarget.style.background = "none")}>
                <UserRound size={15} /> My Profile
              </button>
              <button onClick={() => { setOpenMenu(null); navigate("/notifications"); }} style={menuItemStyle} onMouseEnter={(e) => (e.currentTarget.style.background = "var(--background)")} onMouseLeave={(e) => (e.currentTarget.style.background = "none")}>
                <Bell size={15} /> Notifications
              </button>
              <button onClick={() => { setOpenMenu(null); navigate("/ess"); }} style={menuItemStyle} onMouseEnter={(e) => (e.currentTarget.style.background = "var(--background)")} onMouseLeave={(e) => (e.currentTarget.style.background = "none")}>
                <Settings size={15} /> Settings
              </button>

              <div style={{ height: "1px", background: "var(--border)" }} />

              <button
                onClick={handleLogout}
                style={{ ...menuItemStyle, color: "var(--red)" }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "var(--red-light)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "none"; }}
              >
                <LogOut size={15} /> Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

/* ─── Styles ─────────────────────────────────────────── */
const menuItemStyle = {
  display: "flex", alignItems: "center", gap: "10px",
  width: "100%", padding: "10px 16px",
  background: "none", border: "none", cursor: "pointer",
  fontSize: "13px", fontWeight: 600, color: "var(--label)",
  textAlign: "left", transition: "background 0.12s",
};
