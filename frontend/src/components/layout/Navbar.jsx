/**
 * Navbar — Global search (Ctrl+K), notifications, user menu
 * Reads from SearchContext for unified search state.
 */

import { Bell, Search, ChevronDown, X } from "lucide-react";
import { useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useSearch } from "../../context/SearchContext";
import { useAuth } from "../../context/AuthContext";

const TYPE_COLOR = {
  Employee:     { color: "#4f46e5", bg: "#eef2ff" },
  "Leave Request": { color: "#d97706", bg: "#fffbeb" },
  "Payroll Run":   { color: "#16a34a", bg: "#f0fdf4" },
};

export default function Navbar() {
  const { query, setQuery, results, isOpen, setIsOpen, clear } = useSearch();
  const { user } = useAuth();
  const navigate = useNavigate();
  const inputRef = useRef(null);
  const dropRef  = useRef(null);

  // Ctrl+K / Cmd+K focuses search
  useEffect(() => {
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        inputRef.current?.focus();
        setIsOpen(true);
      }
      if (e.key === "Escape") clear();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [clear, setIsOpen]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (dropRef.current && !dropRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [setIsOpen]);

  const handleSelect = (entry) => {
    navigate(entry.href);
    clear();
  };

  return (
    <header
      style={{
        position: "sticky", top: 0, zIndex: 50,
        background: "var(--navbar-bg)",
        height: "64px",
        borderBottom: "1px solid var(--border)",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 28px",
        boxShadow: "var(--shadow-sm)",
        flexShrink: 0,
      }}
    >
      {/* Search */}
      <div ref={dropRef} style={{ position: "relative", maxWidth: "420px", width: "100%" }}>
        <Search size={15} style={{ position: "absolute", left: "13px", top: "50%", transform: "translateY(-50%)", color: "var(--subtext)", pointerEvents: "none", zIndex: 1 }} />
        <input
          id="global-search-input"
          ref={inputRef}
          type="text"
          value={query}
          placeholder="Search employees, payroll, leave… (Ctrl+K)"
          onChange={(e) => { setQuery(e.target.value); setIsOpen(true); }}
          onFocus={() => setIsOpen(true)}
          style={{
            width: "100%", height: "40px",
            paddingLeft: "38px", paddingRight: query ? "36px" : "14px",
            border: "1px solid var(--border)", borderRadius: "var(--radius)",
            background: "var(--background)",
            fontSize: "13px", color: "var(--text)", outline: "none",
            transition: "border-color 0.15s, box-shadow 0.15s",
          }}
          onFocus={(e) => {
            e.target.style.borderColor = "var(--border-focus)";
            e.target.style.boxShadow = "0 0 0 3px rgba(99,102,241,0.1)";
            e.target.style.background = "#fff";
          }}
          onBlur={(e) => {
            e.target.style.borderColor = "var(--border)";
            e.target.style.boxShadow = "none";
            e.target.style.background = "var(--background)";
          }}
        />
        {query && (
          <button onClick={clear} aria-label="Clear search"
            style={{ position: "absolute", right: "10px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--subtext)", display: "flex", alignItems: "center", padding: "2px" }}>
            <X size={14} />
          </button>
        )}

        {/* Search Dropdown */}
        {isOpen && query.length >= 2 && (
          <div
            style={{
              position: "absolute", top: "calc(100% + 6px)", left: 0, right: 0,
              background: "#fff", border: "1px solid var(--border)",
              borderRadius: "var(--radius-lg)", boxShadow: "var(--shadow-lg)",
              zIndex: 200, overflow: "hidden", maxHeight: "400px", overflowY: "auto",
              animation: "dialog-in 0.15s ease",
            }}
          >
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

      {/* Right section */}
      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
        <button id="notification-btn" aria-label="Notifications"
          style={{ position: "relative", background: "none", border: "none", cursor: "pointer", padding: "8px", borderRadius: "var(--radius)", color: "var(--label)", display: "flex", alignItems: "center", transition: "background 0.15s" }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "var(--background)")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "none")}>
          <Bell size={20} />
          <span style={{ position: "absolute", top: "5px", right: "5px", background: "var(--red)", color: "#fff", borderRadius: "99px", fontSize: "10px", fontWeight: 700, minWidth: "16px", height: "16px", display: "flex", alignItems: "center", justifyContent: "center", border: "2px solid #fff" }}>
            3
          </span>
        </button>

        <div style={{ width: "1px", height: "28px", background: "var(--border)", margin: "0 4px" }} />

        <button id="user-menu-btn" aria-label="User menu"
          style={{ display: "flex", alignItems: "center", gap: "10px", background: "none", border: "none", cursor: "pointer", padding: "6px 10px", borderRadius: "var(--radius)", transition: "background 0.15s" }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "var(--background)")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "none")}>
          <img src={user.avatar} alt={user.firstName} style={{ width: "34px", height: "34px", borderRadius: "50%", objectFit: "cover", border: "2px solid var(--border)" }} />
          <div style={{ textAlign: "left" }}>
            <p style={{ fontWeight: 600, fontSize: "13.5px", color: "var(--text)", lineHeight: 1.3 }}>{user.firstName} {user.lastName}</p>
            <p style={{ fontSize: "11.5px", color: "var(--subtext)", lineHeight: 1.3 }}>{user.designation}</p>
          </div>
          <ChevronDown size={15} style={{ color: "var(--subtext)" }} />
        </button>
      </div>
    </header>
  );
}