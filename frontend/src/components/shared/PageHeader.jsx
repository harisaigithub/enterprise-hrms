/**
 * PageHeader — Standard header for every module page.
 *
 * Usage:
 *   <PageHeader title="Employees" subtitle="32 active employees">
 *     <button className="btn btn-primary">Add Employee</button>
 *   </PageHeader>
 */

export default function PageHeader({ title, subtitle, children }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: "24px",
        flexWrap: "wrap",
        gap: "14px",
        paddingBottom: "20px",
        borderBottom: "1px solid var(--border)",
        animation: "slideUp 0.3s ease",
      }}
    >
      <div>
        <h1 style={{
          fontSize: "21px",
          fontWeight: 800,
          color: "var(--text)",
          letterSpacing: "-0.3px",
          lineHeight: 1.25,
        }}>
          {title}
        </h1>
        {subtitle && (
          <p style={{ fontSize: "13.5px", color: "var(--subtext)", marginTop: "4px" }}>
            {subtitle}
          </p>
        )}
      </div>

      {children && (
        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "center" }}>
          {children}
        </div>
      )}
    </div>
  );
}
