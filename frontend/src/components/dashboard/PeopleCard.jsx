import { people } from "../../data/people";

export default function PeopleCard() {
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
          marginBottom: "16px",
        }}
      >
        <h2 style={{ fontSize: "14px", fontWeight: 700, color: "var(--text)" }}>
          People
        </h2>
        <span
          style={{
            fontSize: "11px",
            color: "var(--primary)",
            fontWeight: 600,
            background: "var(--primary-light)",
            padding: "2px 8px",
            borderRadius: "99px",
          }}
        >
          32 total
        </span>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, 1fr)",
          gap: "10px",
          marginBottom: "14px",
        }}
      >
        {people.map((person) => (
          <div
            key={person.name}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "9px",
              padding: "8px",
              borderRadius: "var(--radius-sm)",
              background: "var(--background)",
              cursor: "pointer",
              transition: "background 0.15s",
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.background = "var(--primary-light)")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.background = "var(--background)")
            }
          >
            <img
              src={person.img}
              alt={person.name}
              style={{
                width: "32px",
                height: "32px",
                borderRadius: "50%",
                objectFit: "cover",
                border: "2px solid var(--border)",
                flexShrink: 0,
              }}
            />
            <p
              style={{
                fontSize: "12px",
                fontWeight: 500,
                color: "var(--text)",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {person.name}
            </p>
          </div>
        ))}
      </div>

      <button
        id="see-all-people-btn"
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
        See all people →
      </button>
    </div>
  );
}