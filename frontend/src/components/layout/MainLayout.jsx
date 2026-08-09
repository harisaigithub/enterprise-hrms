/**
 * MainLayout
 * Wraps every authenticated page with Sidebar + Navbar.
 *
 * Responsiveness:
 *   - Desktop (>768px): Sidebar sits to the left, content takes remaining width.
 *   - Mobile (≤768px): Sidebar renders as an overlay. A backdrop closes it.
 *
 * sidebarOpen state is lifted here so Navbar's toggle button and Sidebar
 * both read from the same source.
 */

import { useState, useEffect } from "react";
import Sidebar from "./Sidebar";
import Navbar from "./Navbar";

export default function MainLayout({ children }) {
  // Open by default on desktop, closed on mobile
  const [sidebarOpen, setSidebarOpen] = useState(() => window.innerWidth > 768);

  // Track whether we're on a mobile-sized screen
  const [isMobile, setIsMobile] = useState(() => window.innerWidth <= 768);

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth <= 768;
      setIsMobile(mobile);
      // Auto-close sidebar when resizing to mobile
      if (mobile) setSidebarOpen(false);
      else setSidebarOpen(true);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const toggleSidebar = () => setSidebarOpen((prev) => !prev);
  const closeSidebar  = () => setSidebarOpen(false);

  return (
    <div style={{ display: "flex", height: "100vh", background: "var(--background)", overflow: "hidden" }}>

      {/* ── Mobile overlay backdrop ── */}
      {isMobile && sidebarOpen && (
        <div
          onClick={closeSidebar}
          style={{
            position: "fixed", inset: 0, zIndex: 40,
            background: "rgba(13,27,42,0.5)",
            backdropFilter: "blur(2px)",
            animation: "fadeIn 0.2s ease",
          }}
        />
      )}

      {/* ── Sidebar ── */}
      <div style={{
        // On mobile, position the sidebar absolutely so it overlays content
        position: isMobile ? "fixed" : "relative",
        zIndex: isMobile ? 50 : "auto",
        top: 0, left: 0, height: "100vh",
        // Slide the sidebar off-screen when closed on mobile
        transform: isMobile && !sidebarOpen ? "translateX(-100%)" : "translateX(0)",
        transition: "transform 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
      }}>
        <Sidebar isOpen={isMobile ? true : sidebarOpen} />
      </div>

      {/* ── Main content area ── */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0, overflow: "hidden" }}>
        <Navbar onToggleSidebar={toggleSidebar} sidebarOpen={sidebarOpen} />

        <main style={{
          flex: 1,
          background: "var(--background)",
          padding: "28px 32px",
          overflowY: "auto",
        }}>
          {children}
        </main>
      </div>
    </div>
  );
}
