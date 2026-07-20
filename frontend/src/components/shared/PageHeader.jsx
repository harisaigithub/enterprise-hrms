/**
 * PageHeader — standard header for every module page
 * Usage: <PageHeader title="Employees" subtitle="32 active employees">
 *          <Button>Add Employee</Button>
 *        </PageHeader>
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
        gap: "12px",
      }}
    >
      <div>
        <h1
          style={{
            fontSize: "20px",
            fontWeight: 700,
            color: "var(--text)",
            letterSpacing: "-0.2px",
            lineHeight: 1.25,
          }}
        >
          {title}
        </h1>
        {subtitle && (
          <p style={{ fontSize: "13.5px", color: "var(--subtext)", marginTop: "3px" }}>
            {subtitle}
          </p>
        )}
      </div>
      {children && (
        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          {children}
        </div>
      )}
    </div>
  );
}
