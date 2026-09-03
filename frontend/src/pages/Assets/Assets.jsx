/**
 * Asset Management Page — Module 12
 * Backend + Prisma version
 *
 * Tabs:
 * Inventory | Requests | My Assets
 */

import { useState, useEffect } from "react";

import {
  Boxes,
  ClipboardList,
  Laptop,
  Plus,
  CheckCircle2,
  RotateCcw,
  AlertTriangle,
  ShieldAlert,
} from "lucide-react";

import MainLayout from "../../components/layout/MainLayout";
import PageHeader from "../../components/shared/PageHeader";
import StatusBadge from "../../components/shared/StatusBadge";
import Spinner from "../../components/shared/Spinner";
import EmptyState from "../../components/shared/EmptyState";
import Modal from "../../components/shared/Modal";

import {
  getInventory,
  addInventoryItem,
  getLicenseAlerts,
  getAllRequests,
  getMyAssets,
  raiseRequest,
  approveRequest,
  rejectRequest,
  fulfillRequest,
  acknowledgeReceipt,
  returnAsset,
} from "../../services/assetService";
import { useAuth } from "../../context/AuthContext";

/* =========================================================
   CONSTANTS
========================================================= */

const ASSET_CATEGORIES = [
  "Laptop",
  "Desktop",
  "Monitor",
  "Mobile Phone",
  "Tablet",
  "Printer",
  "Software License",
  "Other",
];

const CATEGORIES_REQUIRING_APPROVAL = [
  "Laptop",
  "Desktop",
  "Mobile Phone",
  "Tablet",
  "Software License",
];

const DATA_BEARING_CATEGORIES = [
  "Laptop",
  "Desktop",
  "Mobile Phone",
  "Tablet",
];

const ASSET_STATUS = {
  IN_STOCK: "IN_STOCK",
  ASSIGNED: "ASSIGNED",
  MAINTENANCE: "MAINTENANCE",
  RETIRED: "RETIRED",
  LOST: "LOST",
  DAMAGED: "DAMAGED",
};

/*
 * Keep these values aligned with your Prisma RequestStatus enum.
 * If your backend uses different names, change only these constants.
 */
const REQUEST_STATUS = {
  PENDING_APPROVAL: "PENDING_APPROVAL",
  APPROVED: "APPROVED",
  REJECTED: "REJECTED",
  FULFILLED: "FULFILLED",
  PENDING_PROCUREMENT: "PENDING_PROCUREMENT",
};

/* =========================================================
   STATUS META
========================================================= */

const assetStatusMeta = {
  IN_STOCK: {
    label: "In Stock",
    color: "#15803d",
    bg: "#dcfce7",
  },

  ASSIGNED: {
    label: "Assigned",
    color: "#2563eb",
    bg: "#dbeafe",
  },

  MAINTENANCE: {
    label: "Maintenance",
    color: "#d97706",
    bg: "#fef3c7",
  },

  RETIRED: {
    label: "Retired",
    color: "#6b7280",
    bg: "#f3f4f6",
  },

  LOST: {
    label: "Lost",
    color: "#dc2626",
    bg: "#fee2e2",
  },

  DAMAGED: {
    label: "Damaged",
    color: "#dc2626",
    bg: "#fee2e2",
  },
};

const requestStatusMeta = {
  PENDING_APPROVAL: {
    label: "Pending Approval",
    color: "#d97706",
    bg: "#fef3c7",
  },

  APPROVED: {
    label: "Approved",
    color: "#15803d",
    bg: "#dcfce7",
  },

  REJECTED: {
    label: "Rejected",
    color: "#dc2626",
    bg: "#fee2e2",
  },

  FULFILLED: {
    label: "Fulfilled",
    color: "#2563eb",
    bg: "#dbeafe",
  },

  PENDING_PROCUREMENT: {
    label: "Pending Procurement",
    color: "#7c3aed",
    bg: "#ede9fe",
  },
};

/* =========================================================
   HELPERS
========================================================= */

const fmtDate = (d) => {
  if (!d) return "—";

  const date = new Date(d);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const normalizeStatus = (status) => {
  if (!status) return "";

  return String(status)
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, "_");
};

const getAssetStatusMeta = (status) => {
  const normalized = normalizeStatus(status);

  return (
    assetStatusMeta[normalized] || {
      label: status || "Unknown",
      color: "var(--subtext)",
      bg: "var(--border)",
    }
  );
};

const getRequestStatusMeta = (status) => {
  const normalized = normalizeStatus(status);

  return (
    requestStatusMeta[normalized] || {
      label: status || "Unknown",
      color: "var(--subtext)",
      bg: "var(--border)",
    }
  );
};

/* =========================================================
   SHARED UI
========================================================= */

const cardStyle = {
  background: "var(--card)",
  borderRadius: "var(--radius-lg)",
  border: "1px solid var(--border)",
  boxShadow: "var(--shadow-sm)",
};

function inputStyle() {
  return {
    width: "100%",
    padding: "9px 12px",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius-sm)",
    fontSize: "13.5px",
    color: "var(--text)",
    outline: "none",
    background: "var(--card)",
    fontFamily: "inherit",
    boxSizing: "border-box",
  };
}

function fieldLabel(text) {
  return (
    <label
      style={{
        fontSize: "12px",
        fontWeight: 600,
        color: "var(--label)",
      }}
    >
      {text}
    </label>
  );
}

function PrimaryButton({ children, ...props }) {
  return (
    <button
      {...props}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "6px",
        padding: "9px 16px",
        background: "var(--primary)",
        color: "#fff",
        border: "none",
        borderRadius: "var(--radius-sm)",
        fontWeight: 600,
        fontSize: "13px",
        cursor: props.disabled ? "not-allowed" : "pointer",
        opacity: props.disabled ? 0.6 : 1,
        ...props.style,
      }}
    >
      {children}
    </button>
  );
}

function SecondaryButton({ children, ...props }) {
  return (
    <button
      {...props}
      style={{
        padding: "9px 16px",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-sm)",
        background: "none",
        color: "var(--label)",
        fontWeight: 600,
        fontSize: "13px",
        cursor: props.disabled ? "not-allowed" : "pointer",
        ...props.style,
      }}
    >
      {children}
    </button>
  );
}

function TabNav({ tabs, active, onChange }) {
  return (
    <div
      style={{
        display: "flex",
        gap: "4px",
        borderBottom: "1px solid var(--border)",
        marginBottom: "22px",
        overflowX: "auto",
      }}
    >
      {tabs.map((t) => {
        const isActive = t.key === active;

        return (
          <button
            key={t.key}
            onClick={() => onChange(t.key)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "7px",
              padding: "10px 16px",
              border: "none",
              borderBottom: isActive
                ? "2px solid var(--primary)"
                : "2px solid transparent",
              background: "none",
              color: isActive
                ? "var(--primary)"
                : "var(--subtext)",
              fontWeight: 600,
              fontSize: "13.5px",
              cursor: "pointer",
              whiteSpace: "nowrap",
            }}
          >
            <t.icon size={15} />
            {t.label}
          </button>
        );
      })}
    </div>
  );
}

/* =========================================================
   ADD INVENTORY MODAL
========================================================= */

function AddInventoryModal({
  isOpen,
  onClose,
  onSaved,
}) {
  const [serial, setSerial] = useState("");
  const [category, setCategory] = useState(
    ASSET_CATEGORIES[0]
  );
  const [make, setMake] = useState("");
  const [model, setModel] = useState("");
  const [seats, setSeats] = useState("");
  const [licenseExpiry, setLicenseExpiry] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const isLicense = category === "Software License";

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!serial.trim()) {
      setError("Serial number is required.");
      return;
    }

    if (isLicense && !seats) {
      setError("Seat count is required.");
      return;
    }

    if (isLicense && !licenseExpiry) {
      setError("License expiry date is required.");
      return;
    }

    try {
      setSaving(true);
      setError("");

      /*
       * IMPORTANT:
       * Do NOT send id from frontend.
       * Prisma should generate the UUID.
       */
      const item = {
        serial: serial.trim(),
        category,
        make: make.trim() || null,
        model: model.trim() || null,
      };

      if (isLicense) {
        item.seats = Number(seats);
        item.licenseExpiry = licenseExpiry;
      }

      const res = await addInventoryItem(item);

      onSaved(res.data);

      onClose();

      setSerial("");
      setCategory(ASSET_CATEGORIES[0]);
      setMake("");
      setModel("");
      setSeats("");
      setLicenseExpiry("");
      setError("");
    } catch (err) {
      console.error("Add inventory error:", err);

      setError(
        err?.response?.data?.message ||
        err?.message ||
        "Failed to add inventory item."
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      title="Add Inventory Item"
      onClose={onClose}
    >
      <form
        onSubmit={handleSubmit}
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "16px",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "5px",
          }}
        >
          {fieldLabel("Category *")}

          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            style={{
              ...inputStyle(),
              height: "38px",
              cursor: "pointer",
            }}
          >
            {ASSET_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "5px",
          }}
        >
          {fieldLabel(
            isLicense
              ? "License Key / Identifier *"
              : "Serial Number *"
          )}

          <input
            value={serial}
            onChange={(e) => setSerial(e.target.value)}
            style={inputStyle()}
          />
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "12px",
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "5px",
            }}
          >
            {fieldLabel("Make")}

            <input
              value={make}
              onChange={(e) => setMake(e.target.value)}
              style={inputStyle()}
            />
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "5px",
            }}
          >
            {fieldLabel("Model")}

            <input
              value={model}
              onChange={(e) => setModel(e.target.value)}
              style={inputStyle()}
            />
          </div>
        </div>

        {isLicense && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "12px",
            }}
          >
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "5px",
              }}
            >
              {fieldLabel("Seat Count *")}

              <input
                type="number"
                min={1}
                value={seats}
                onChange={(e) => setSeats(e.target.value)}
                style={inputStyle()}
              />
            </div>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "5px",
              }}
            >
              {fieldLabel("Expiry Date *")}

              <input
                type="date"
                value={licenseExpiry}
                onChange={(e) =>
                  setLicenseExpiry(e.target.value)
                }
                style={inputStyle()}
              />
            </div>
          </div>
        )}

        {error && (
          <p
            style={{
              margin: 0,
              fontSize: "12px",
              color: "var(--red)",
            }}
          >
            {error}
          </p>
        )}

        <div
          style={{
            display: "flex",
            gap: "10px",
            justifyContent: "flex-end",
          }}
        >
          <SecondaryButton
            type="button"
            onClick={onClose}
            disabled={saving}
          >
            Cancel
          </SecondaryButton>

          <PrimaryButton
            type="submit"
            disabled={saving}
          >
            {saving ? "Saving..." : "Add to Inventory"}
          </PrimaryButton>
        </div>
      </form>
    </Modal>
  );
}

/* =========================================================
   INVENTORY TAB
========================================================= */

function InventoryTab({
  inventory,
  licenseAlerts,
  onItemAdded,
  canManage,
}) {
  const [showAdd, setShowAdd] = useState(false);

  return (
    <div>
      {canManage && licenseAlerts.length > 0 && (
        <div
          style={{
            ...cardStyle,
            padding: "14px 18px",
            marginBottom: "16px",
            background: "#fffbeb",
            border: "1px solid #fde68a",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              marginBottom: "8px",
            }}
          >
            <AlertTriangle
              size={16}
              style={{ color: "#d97706" }}
            />

            <h3
              style={{
                fontSize: "13px",
                fontWeight: 700,
                color: "#92400e",
              }}
            >
              License alerts
            </h3>
          </div>

          {licenseAlerts.map(({ asset, alerts }) => (
            <p
              key={asset.id}
              style={{
                fontSize: "12.5px",
                color: "#92400e",
                margin: "2px 0",
              }}
            >
              <strong>
                {asset.model || asset.make || "License"}
              </strong>{" "}
              ({asset.serial}) —{" "}
              {alerts.join(" — ")}
            </p>
          ))}
        </div>
      )}

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "14px",
        }}
      >
        <h2
          style={{
            fontSize: "14px",
            fontWeight: 700,
            color: "var(--text)",
          }}
        >
          Inventory
        </h2>

        {canManage && (
          <PrimaryButton
            onClick={() => setShowAdd(true)}
          >
            <Plus size={16} />
            Add Item
          </PrimaryButton>
        )}
      </div>

      {inventory.length === 0 ? (
        <EmptyState
          icon={Boxes}
          title="No inventory yet"
        />
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fill, minmax(280px, 1fr))",
            gap: "14px",
          }}
        >
          {inventory.map((item) => {
            const meta = getAssetStatusMeta(item.status);

            return (
              <div
                key={item.id}
                style={{
                  ...cardStyle,
                  padding: "16px 18px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    gap: "8px",
                    marginBottom: "6px",
                  }}
                >
                  <h3
                    style={{
                      fontSize: "14px",
                      fontWeight: 700,
                      color: "var(--text)",
                    }}
                  >
                    {item.make || ""}{" "}
                    {item.model || item.category}
                  </h3>

                  <StatusBadge
                    label={meta.label}
                    color={meta.color}
                    bg={meta.bg}
                  />
                </div>

                <p
                  style={{
                    fontSize: "12px",
                    color: "var(--subtext)",
                    marginBottom: "6px",
                  }}
                >
                  {item.category} — {item.serial}
                </p>

                {item.currentHolderName && (
                  <p
                    style={{
                      fontSize: "12px",
                      color: "var(--text)",
                    }}
                  >
                    Holder:{" "}
                    <strong>
                      {item.currentHolderName}
                    </strong>

                    {item.acknowledged === false &&
                      " (not yet acknowledged)"}
                  </p>
                )}

                {item.category === "Software License" && (
                  <p
                    style={{
                      fontSize: "12px",
                      color: "var(--subtext)",
                    }}
                  >
                    Seats {item.seatsUsed || 0}/
                    {item.seats || 0} — expires{" "}
                    {fmtDate(item.licenseExpiry)}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}

      <AddInventoryModal
        isOpen={showAdd}
        onClose={() => setShowAdd(false)}
        onSaved={onItemAdded}
      />
    </div>
  );
}

/* =========================================================
   FULFILL MODAL
========================================================= */

function FulfillModal({
  isOpen,
  onClose,
  request,
  inventory,
  onSaved,
}) {
  const [assetId, setAssetId] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const available = inventory.filter(
    (i) =>
      i.category === request?.category &&
      normalizeStatus(i.status) ===
      ASSET_STATUS.IN_STOCK
  );

  const handleFulfill = async () => {
    if (available.length > 0 && !assetId) {
      setError("Please select an asset.");
      return;
    }

    try {
      setSaving(true);
      setError("");

      const res = await fulfillRequest(
        request.id,
        assetId || null
      );

      onSaved(res.data);

      setAssetId("");
      onClose();
    } catch (err) {
      console.error("Fulfill request error:", err);

      setError(
        err?.response?.data?.message ||
        err?.message ||
        "Failed to fulfill request."
      );
    } finally {
      setSaving(false);
    }
  };

  if (!request) return null;

  return (
    <Modal
      isOpen={isOpen}
      title={`Fulfill — ${request.category} request`}
      onClose={onClose}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "16px",
        }}
      >
        {available.length === 0 ? (
          <p
            style={{
              fontSize: "13px",
              color: "var(--red)",
            }}
          >
            No in-stock {request.category} units.
            Fulfilling now will mark this request
            as pending procurement.
          </p>
        ) : (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "5px",
            }}
          >
            {fieldLabel("Select unit to assign *")}

            <select
              value={assetId}
              onChange={(e) =>
                setAssetId(e.target.value)
              }
              style={{
                ...inputStyle(),
                height: "38px",
                cursor: "pointer",
              }}
            >
              <option value="">
                Select unit
              </option>

              {available.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.serial} — {i.make} {i.model}
                </option>
              ))}
            </select>
          </div>
        )}

        {error && (
          <p
            style={{
              margin: 0,
              fontSize: "12px",
              color: "var(--red)",
            }}
          >
            {error}
          </p>
        )}

        <div
          style={{
            display: "flex",
            gap: "10px",
            justifyContent: "flex-end",
          }}
        >
          <SecondaryButton
            onClick={onClose}
            disabled={saving}
          >
            Cancel
          </SecondaryButton>

          <PrimaryButton
            onClick={handleFulfill}
            disabled={
              saving ||
              (available.length > 0 && !assetId)
            }
          >
            {saving
              ? "Fulfilling..."
              : available.length === 0
                ? "Mark Pending Procurement"
                : "Assign Unit"}
          </PrimaryButton>
        </div>
      </div>
    </Modal>
  );
}

/* =========================================================
   REQUESTS TAB
========================================================= */

function RequestsTab({
  requests,
  inventory,
  onRequestUpdated,
  canManage,
}) {
  const [fulfillTarget, setFulfillTarget] =
    useState(null);

  const handleApprove = async (id) => {
    try {
      const res = await approveRequest(
        id,
        "Manager"
      );

      onRequestUpdated(res.data);
    } catch (err) {
      console.error("Approve request error:", err);
    }
  };

  const handleReject = async (id) => {
    try {
      const res = await rejectRequest(id);

      onRequestUpdated(res.data);
    } catch (err) {
      console.error("Reject request error:", err);
    }
  };

  if (requests.length === 0) {
    return (
      <EmptyState
        icon={ClipboardList}
        title="No asset requests"
      />
    );
  }

  return (
    <div>
      <h2
        style={{
          fontSize: "14px",
          fontWeight: 700,
          color: "var(--text)",
          marginBottom: "14px",
        }}
      >
        Asset Requests
      </h2>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "12px",
        }}
      >
        {requests.map((r) => {
          const normalizedStatus =
            normalizeStatus(r.status);

          const meta =
            getRequestStatusMeta(r.status);

          const needsApproval =
            CATEGORIES_REQUIRING_APPROVAL.includes(
              r.category
            );

          return (
            <div
              key={r.id}
              style={{
                ...cardStyle,
                padding: "14px 18px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: "10px",
              }}
            >
              <div>
                <p
                  style={{
                    fontSize: "13.5px",
                    fontWeight: 700,
                    color: "var(--text)",
                  }}
                >
                  {r.employeeName ||
                    r.employee?.name ||
                    "Employee"}{" "}
                  — {r.category}
                </p>

                <p
                  style={{
                    fontSize: "12px",
                    color: "var(--subtext)",
                  }}
                >
                  {r.justification}
                </p>

                <p
                  style={{
                    fontSize: "11px",
                    color: "var(--subtext)",
                  }}
                >
                  Raised {fmtDate(r.raisedAt)}{" "}
                  {needsApproval
                    ? "— requires manager approval"
                    : "— auto-approved"}
                </p>
              </div>

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                }}
              >
                <StatusBadge
                  label={meta.label}
                  color={meta.color}
                  bg={meta.bg}
                />

                {canManage &&
                  normalizedStatus ===
                  REQUEST_STATUS.PENDING_APPROVAL && (
                    <>
                      <button
                        onClick={() =>
                          handleApprove(r.id)
                        }
                        style={{
                          fontSize: "12px",
                          fontWeight: 700,
                          color: "var(--primary)",
                          border: "none",
                          background: "none",
                          cursor: "pointer",
                        }}
                      >
                        Approve
                      </button>

                      <button
                        onClick={() =>
                          handleReject(r.id)
                        }
                        style={{
                          fontSize: "12px",
                          fontWeight: 700,
                          color: "var(--red)",
                          border: "none",
                          background: "none",
                          cursor: "pointer",
                        }}
                      >
                        Reject
                      </button>
                    </>
                  )}

                {canManage &&
                  normalizedStatus ===
                  REQUEST_STATUS.APPROVED && (
                    <button
                      onClick={() =>
                        setFulfillTarget(r)
                      }
                      style={{
                        fontSize: "12px",
                        fontWeight: 700,
                        color: "var(--primary)",
                        border: "none",
                        background: "none",
                        cursor: "pointer",
                      }}
                    >
                      Fulfill
                    </button>
                  )}
              </div>
            </div>
          );
        })}
      </div>

      <FulfillModal
        isOpen={!!fulfillTarget}
        onClose={() => setFulfillTarget(null)}
        request={fulfillTarget}
        inventory={inventory}
        onSaved={onRequestUpdated}
      />
    </div>
  );
}

/* =========================================================
   RAISE REQUEST MODAL
========================================================= */

function RaiseRequestModal({
  isOpen,
  onClose,
  onSaved,
}) {
  const [category, setCategory] = useState(
    ASSET_CATEGORIES[0]
  );

  const [justification, setJustification] =
    useState("");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!justification.trim()) {
      setError("Business justification is required.");
      return;
    }

    try {
      setSaving(true);
      setError("");

      const request = {
        category,
        justification: justification.trim(),
      };

      const res = await raiseRequest(request);

      onSaved(res.data);

      onClose();

      setJustification("");
      setCategory(ASSET_CATEGORIES[0]);
    } catch (err) {
      console.error("Raise request error:", err);

      setError(
        err?.response?.data?.message ||
        err?.message ||
        "Failed to raise asset request."
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      title="Request an Asset"
      onClose={onClose}
    >
      <form
        onSubmit={handleSubmit}
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "16px",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "5px",
          }}
        >
          {fieldLabel("Category *")}

          <select
            value={category}
            onChange={(e) =>
              setCategory(e.target.value)
            }
            style={{
              ...inputStyle(),
              height: "38px",
              cursor: "pointer",
            }}
          >
            {ASSET_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          {CATEGORIES_REQUIRING_APPROVAL.includes(
            category
          ) && (
              <p
                style={{
                  fontSize: "11px",
                  color: "var(--subtext)",
                  margin: 0,
                }}
              >
                This category needs manager approval
                before fulfillment.
              </p>
            )}
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "5px",
          }}
        >
          {fieldLabel(
            "Business Justification *"
          )}

          <textarea
            rows={3}
            value={justification}
            onChange={(e) =>
              setJustification(e.target.value)
            }
            style={{
              ...inputStyle(),
              resize: "vertical",
            }}
          />
        </div>

        {error && (
          <p
            style={{
              margin: 0,
              fontSize: "12px",
              color: "var(--red)",
            }}
          >
            {error}
          </p>
        )}

        <div
          style={{
            display: "flex",
            gap: "10px",
            justifyContent: "flex-end",
          }}
        >
          <SecondaryButton
            type="button"
            onClick={onClose}
            disabled={saving}
          >
            Cancel
          </SecondaryButton>

          <PrimaryButton
            type="submit"
            disabled={saving}
          >
            {saving
              ? "Submitting..."
              : "Submit Request"}
          </PrimaryButton>
        </div>
      </form>
    </Modal>
  );
}

/* =========================================================
   RETURN ASSET MODAL
========================================================= */

function ReturnAssetModal({
  isOpen,
  onClose,
  asset,
  onSaved,
}) {
  const [condition, setCondition] =
    useState("Good");

  const [wipeCompleted, setWipeCompleted] =
    useState(false);

  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const isDataBearing =
    asset &&
    DATA_BEARING_CATEGORIES.includes(
      asset.category
    );

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setSaving(true);
      setError("");

      const res = await returnAsset(
        asset.id,
        condition,
        wipeCompleted
      );

      if (res.data?.error) {
        setError(res.data.error);
        return;
      }

      /*
       * Backend may return:
       * { asset }
       * or directly asset.
       */
      const updatedAsset =
        res.data?.asset ?? res.data;

      onSaved(updatedAsset);

      onClose();

      setCondition("Good");
      setWipeCompleted(false);
      setError("");
    } catch (err) {
      console.error("Return asset error:", err);

      setError(
        err?.response?.data?.message ||
        err?.message ||
        "Failed to return asset."
      );
    } finally {
      setSaving(false);
    }
  };

  if (!asset) return null;

  return (
    <Modal
      isOpen={isOpen}
      title={`Return — ${asset.make || ""} ${asset.model || asset.category
        }`}
      onClose={onClose}
    >
      <form
        onSubmit={handleSubmit}
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "16px",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "5px",
          }}
        >
          {fieldLabel("Condition on return *")}

          <select
            value={condition}
            onChange={(e) =>
              setCondition(e.target.value)
            }
            style={{
              ...inputStyle(),
              height: "38px",
              cursor: "pointer",
            }}
          >
            <option value="Good">
              Good — return to stock
            </option>

            <option value="Damaged">
              Damaged / write-off
            </option>
          </select>
        </div>

        {isDataBearing &&
          condition === "Good" && (
            <label
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: "8px",
                fontSize: "12.5px",
                color: "var(--label)",
                cursor: "pointer",
              }}
            >
              <input
                type="checkbox"
                checked={wipeCompleted}
                onChange={(e) =>
                  setWipeCompleted(
                    e.target.checked
                  )
                }
                style={{ marginTop: "2px" }}
              />

              <span>
                Disk wipe / reimage checklist
                completed — required before this
                device can go back into stock.
              </span>
            </label>
          )}

        {error && (
          <p
            style={{
              fontSize: "12px",
              color: "var(--red)",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              margin: 0,
            }}
          >
            <ShieldAlert size={14} />
            {error}
          </p>
        )}

        <div
          style={{
            display: "flex",
            gap: "10px",
            justifyContent: "flex-end",
          }}
        >
          <SecondaryButton
            type="button"
            onClick={onClose}
            disabled={saving}
          >
            Cancel
          </SecondaryButton>

          <PrimaryButton
            type="submit"
            disabled={saving}
          >
            {saving ? "Logging..." : "Log Return"}
          </PrimaryButton>
        </div>
      </form>
    </Modal>
  );
}

/* =========================================================
   MY ASSETS TAB
========================================================= */

function MyAssetsTab({
  myAssets,
  onAssetAdded,
  onAssetUpdated,
}) {
  const [showRequest, setShowRequest] =
    useState(false);

  const [returnTarget, setReturnTarget] =
    useState(null);

  const handleAcknowledge = async (assetId) => {
    try {
      const res = await acknowledgeReceipt(assetId);

      onAssetUpdated(res.data);
    } catch (err) {
      console.error(
        "Acknowledge receipt error:",
        err
      );
    }
  };

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "14px",
        }}
      >
        <h2
          style={{
            fontSize: "14px",
            fontWeight: 700,
            color: "var(--text)",
          }}
        >
          My Assets
        </h2>

        <PrimaryButton
          onClick={() => setShowRequest(true)}
        >
          <Plus size={16} />
          Request Asset
        </PrimaryButton>
      </div>

      {myAssets.length === 0 ? (
        <EmptyState
          icon={Laptop}
          title="No assets assigned yet"
        />
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fill, minmax(280px, 1fr))",
            gap: "14px",
          }}
        >
          {myAssets.map((item) => (
            <div
              key={item.id}
              style={{
                ...cardStyle,
                padding: "16px 18px",
              }}
            >
              <h3
                style={{
                  fontSize: "14px",
                  fontWeight: 700,
                  color: "var(--text)",
                  marginBottom: "6px",
                }}
              >
                {item.make || ""}{" "}
                {item.model || item.category}
              </h3>

              <p
                style={{
                  fontSize: "12px",
                  color: "var(--subtext)",
                  marginBottom: "10px",
                }}
              >
                {item.category} — {item.serial}
              </p>

              {!item.acknowledged ? (
                <PrimaryButton
                  onClick={() =>
                    handleAcknowledge(item.id)
                  }
                  style={{
                    padding: "7px 14px",
                    fontSize: "12px",
                  }}
                >
                  <CheckCircle2 size={14} />
                  Acknowledge Receipt
                </PrimaryButton>
              ) : (
                <button
                  onClick={() =>
                    setReturnTarget(item)
                  }
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "5px",
                    fontSize: "12px",
                    fontWeight: 700,
                    color: "var(--primary)",
                    border: "none",
                    background: "none",
                    cursor: "pointer",
                  }}
                >
                  <RotateCcw size={13} />
                  Return Asset
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      <RaiseRequestModal
        isOpen={showRequest}
        onClose={() => setShowRequest(false)}
        onSaved={onAssetAdded}
      />

      <ReturnAssetModal
        isOpen={!!returnTarget}
        onClose={() => setReturnTarget(null)}
        asset={returnTarget}
        onSaved={onAssetUpdated}
      />
    </div>
  );
}

/* =========================================================
   TABS
========================================================= */

const TABS = [
  {
    key: "inventory",
    label: "Inventory",
    icon: Boxes,
  },
  {
    key: "requests",
    label: "Requests",
    icon: ClipboardList,
  },
  {
    key: "myAssets",
    label: "My Assets",
    icon: Laptop,
  },
];

/* =========================================================
   PAGE
========================================================= */

export default function Assets() {
  const { permissions = [], role } = useAuth();

  const can = (permission) =>
    permissions.includes(permission);

  const canRead = can("assets:read");
  const canWrite = can("assets:write");

  const isEmployee = role?.toUpperCase() === "EMPLOYEE";

  // Admin / HR / Manager
  const canManageAssets =
    canWrite && !isEmployee;

  const [activeTab, setActiveTab] =
    useState("inventory");

  const [loading, setLoading] =
    useState(true);

  const [error, setError] = useState("");

  const [inventory, setInventory] =
    useState([]);

  const [licenseAlerts, setLicenseAlerts] =
    useState([]);

  const [requests, setRequests] =
    useState([]);

  const [myAssets, setMyAssets] = useState([]);

  /* =====================================================
     LOAD DATA
  ===================================================== */

  if (!canRead) {
    return (
      <MainLayout>
        <EmptyState
          icon={AlertTriangle}
          title="Access Denied"
          subtitle="You do not have permission to view Asset Management."
        />
      </MainLayout>
    );
  }

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError("");

        const [
          inventoryRes,
          alertsRes,
          requestsRes,
          myAssetsRes,
        ] = await Promise.all([
          getInventory(),
          canManageAssets
            ? getLicenseAlerts()
            : Promise.resolve({ data: [] }),
          getAllRequests(),
          getMyAssets(),
        ]);

        setInventory(
          inventoryRes?.data || []
        );

        setLicenseAlerts(
          alertsRes?.data || []
        );

        setRequests(
          requestsRes?.data || []
        );

        setMyAssets(
          myAssetsRes?.data || []
        );
      } catch (err) {
        console.error(
          "Asset page load error:",
          err
        );

        setError(
          err?.response?.data?.message ||
          err?.message ||
          "Failed to load asset data."
        );
      } finally {
        setLoading(false);
      }
    };

    if (canRead) {
      loadData();
    } else {
      setLoading(false);
    }
  }, [canRead, canManageAssets]);

  /* =====================================================
     INVENTORY CHANGE
  ===================================================== */

  const handleInventoryChange = (item) => {
    if (!item) return;

    setInventory((prev) => {
      const exists = prev.some(
        (i) => i.id === item.id
      );

      if (exists) {
        return prev.map((i) =>
          i.id === item.id ? item : i
        );
      }

      return [item, ...prev];
    });
  };

  /* =====================================================
     REQUEST CHANGE
  ===================================================== */

  const handleRequestChange = (result) => {
    if (!result) return;

    /*
     * fulfillRequest:
     * {
     *   request,
     *   asset
     * }
     *
     * Other APIs:
     * request directly
     */

    const request =
      result?.request ?? result;

    if (request?.id) {
      setRequests((prev) =>
        prev.map((r) =>
          r.id === request.id
            ? request
            : r
        )
      );
    }

    if (result?.asset) {
      handleInventoryChange(result.asset);
    }
  };

  /* =====================================================
     LOADING
  ===================================================== */

  if (loading) {
    return (
      <MainLayout>
        <Spinner />
      </MainLayout>
    );
  }

  /* =====================================================
     ERROR
  ===================================================== */

  if (error) {
    return (
      <MainLayout>
        <div
          style={{
            maxWidth: "1480px",
            margin: "0 auto",
          }}
        >
          <PageHeader
            title="Asset Management"
            subtitle="Inventory, assignment, and lifecycle tracking for company-owned assets"
          />

          <div
            style={{
              ...cardStyle,
              padding: "20px",
              color: "var(--red)",
            }}
          >
            <strong>
              Failed to load Asset Management
            </strong>

            <p
              style={{
                marginBottom: 0,
                fontSize: "13px",
              }}
            >
              {error}
            </p>
          </div>
        </div>
      </MainLayout>
    );
  }

  /* =====================================================
     RENDER
  ===================================================== */

  return (
    <MainLayout>
      <div
        style={{
          maxWidth: "1480px",
          margin: "0 auto",
        }}
      >
        <PageHeader
          title="Asset Management"
          subtitle="Inventory, assignment, and lifecycle tracking for company-owned assets"
        />

        <TabNav
          tabs={TABS}
          active={activeTab}
          onChange={setActiveTab}
        />

        {activeTab === "inventory" && (
          <InventoryTab
            inventory={inventory}
            licenseAlerts={licenseAlerts}
            onItemAdded={handleInventoryChange}
            canManage={canManageAssets}
          />
        )}

        {activeTab === "requests" && (
          <RequestsTab
            requests={requests}
            inventory={inventory}
            onRequestUpdated={
              handleRequestChange
            }
            canManage={canManageAssets}
          />
        )}

        {activeTab === "myAssets" && (
          <MyAssetsTab
            myAssets={myAssets}
            onAssetAdded={(request) =>
              setRequests((prev) => [
                request,
                ...prev,
              ])
            }
            onAssetUpdated={
              handleInventoryChange
            }
          />
        )}
      </div>
    </MainLayout>
  );
}