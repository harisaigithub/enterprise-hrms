import { Wallet, TrendingUp } from "lucide-react";
import { payroll } from "../../data/payroll";

export default function PayrollCard() {
  return (
    <div
      style={{
        background: "var(--card)",
        borderRadius: "var(--radius-lg)",
        border: "1px solid var(--border)",
        boxShadow: "var(--shadow-sm)",
        padding: "20px",
        transition: "box-shadow 0.2s ease",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.boxShadow = "var(--shadow-md)")}
      onMouseLeave={(e) => (e.currentTarget.style.boxShadow = "var(--shadow-sm)")}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "14px",
        }}
      >
        <h2 style={{ fontSize: "14px", fontWeight: 700, color: "var(--text)" }}>
          {payroll.title}
        </h2>
        <div
          style={{
            width: "34px",
            height: "34px",
            borderRadius: "var(--radius-sm)",
            background: "var(--green-light)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Wallet size={17} style={{ color: "var(--green)" }} />
        </div>
      </div>

      <p
        style={{
          fontSize: "26px",
          fontWeight: 800,
          color: "var(--text)",
          lineHeight: 1.1,
          letterSpacing: "-0.5px",
        }}
      >
        {payroll.totalPayroll}
      </p>

      <p
        style={{
          fontSize: "12px",
          color: "var(--subtext)",
          marginTop: "5px",
          marginBottom: "16px",
        }}
      >
        {payroll.description}
      </p>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "5px",
          marginBottom: "16px",
          background: "var(--green-light)",
          padding: "6px 10px",
          borderRadius: "var(--radius-sm)",
        }}
      >
        <TrendingUp size={13} style={{ color: "var(--green)" }} />
        <span style={{ fontSize: "11.5px", color: "var(--green)", fontWeight: 600 }}>
          +4.2% vs last month
        </span>
      </div>

      <button
        id="run-payroll-btn"
        style={{
          width: "100%",
          padding: "9px",
          background: "var(--primary)",
          color: "#fff",
          border: "none",
          borderRadius: "var(--radius-sm)",
          fontSize: "12.5px",
          fontWeight: 600,
          cursor: "pointer",
          transition: "background 0.15s ease",
        }}
        onMouseEnter={(e) =>
          (e.currentTarget.style.background = "var(--primary-hover)")
        }
        onMouseLeave={(e) =>
          (e.currentTarget.style.background = "var(--primary)")
        }
      >
        {payroll.buttonText}
      </button>
    </div>
  );
}