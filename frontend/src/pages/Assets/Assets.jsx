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
  History,
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
  getAssetHistory,
  updateInventoryItem,
  assignInventoryItem,
  retireInventoryItem,
  sendInventoryItemForRepair,
  raiseRequest,
  approveRequest,
  rejectRequest,
  fulfillRequest,
  acknowledgeReceipt,
  returnAsset,
} from "../../services/assetService";
import { useAuth } from "../../context/AuthContext";
import { getEmployees } from "../../services/employeeService";

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

const REQUEST_TYPES = ["New", "Replacement"];

const CATEGORIES_REQUIRING_APPROVAL = [
  "Laptop",
  "Desktop",
  "Mobile Phone",
  "Tablet",
  "Software License",
];
const ASSET_APPROVAL_THRESHOLD = 25000;

const requiresRequestApproval = (category, estimatedCost) => {
  const normalizedCategory = String(category || "").trim().toLowerCase();
  return normalizedCategory === "laptop" ||
    normalizedCategory === "desktop" ||
    (CATEGORIES_REQUIRING_APPROVAL.includes(category) &&
      (estimatedCost == null || Number(estimatedCost) > ASSET_APPROVAL_THRESHOLD));
};

const assetDisplayName = (asset) => {
  const description = [asset?.make, asset?.model].filter(Boolean).join(" ").trim();
  return description ? `${description} (${asset.category})` : asset?.category || "Asset";
};

const daysUntil = (dateValue) => {
  if (!dateValue) return null;
  const date = new Date(`${String(dateValue).slice(0, 10)}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return null;
  const today = new Date(`${new Date().toISOString().slice(0, 10)}T00:00:00Z`);
  return Math.round((date.getTime() - today.getTime()) / 86_400_000);
};

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

const fmtDateTime = (d) => {
  if (!d) return "—";

  const date = new Date(d);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
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

const formatApproverName = (value) => {
  if (!value) return "";

  const trimmed = String(value).trim();

  if (!trimmed) return "";

  if (trimmed.includes(":")) {
    const cleaned = trimmed.split(":").slice(1).join(":").trim();
    if (cleaned) {
      return cleaned;
    }
  }

  return trimmed;
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

const filterChipStyle = {
  padding: "6px 10px",
  border: "1px solid var(--border)",
  borderRadius: "999px",
  background: "var(--card)",
  color: "var(--label)",
  fontSize: "11.5px",
  fontWeight: 700,
  cursor: "pointer",
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
  const [purchaseDate, setPurchaseDate] = useState("");
  const [purchaseCost, setPurchaseCost] = useState("");
  const [location, setLocation] = useState("");
  const [warrantyExpiry, setWarrantyExpiry] = useState("");
  const [vendor, setVendor] = useState("");
  const [conditionNotes, setConditionNotes] = useState("");
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

    if (purchaseCost !== "" && Number(purchaseCost) < 0) {
      setError("Purchase cost cannot be negative.");
      return;
    }

    try {
      setSaving(true);
      setError("");

      const item = {
        serial: serial.trim(),
        category,
        make: make.trim() || null,
        model: model.trim() || null,
        purchaseDate: purchaseDate || null,
        purchaseCost: purchaseCost !== "" ? Number(purchaseCost) : null,
        location: location.trim() || null,
        warrantyExpiry: warrantyExpiry || null,
        vendor: vendor.trim() || null,
        conditionNotes: conditionNotes.trim() || null,
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
      setPurchaseDate("");
      setPurchaseCost("");
      setLocation("");
      setWarrantyExpiry("");
      setVendor("");
      setConditionNotes("");
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
            {fieldLabel("Purchase Date")}

            <input
              type="date"
              value={purchaseDate}
              onChange={(e) => setPurchaseDate(e.target.value)}
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
            {fieldLabel("Purchase Cost (₹)")}

            <input
              type="number"
              min={0}
              step="0.01"
              inputMode="decimal"
              placeholder="0.00"
              value={purchaseCost}
              onChange={(e) => setPurchaseCost(e.target.value)}
              style={inputStyle()}
            />
          </div>
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
            {fieldLabel("Location")}

            <input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
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
            {fieldLabel("Vendor")}

            <input
              value={vendor}
              onChange={(e) => setVendor(e.target.value)}
              style={inputStyle()}
            />
          </div>
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
            {fieldLabel("Warranty Expiry")}

            <input
              type="date"
              value={warrantyExpiry}
              onChange={(e) => setWarrantyExpiry(e.target.value)}
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
            {fieldLabel("Condition Notes")}

            <input
              value={conditionNotes}
              onChange={(e) => setConditionNotes(e.target.value)}
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

function AssetHistoryModal({ asset, isOpen, onClose }) {
  const [loadedResult, setLoadedResult] = useState(null);

  useEffect(() => {
    if (!isOpen || !asset) return;
    let active = true;
    getAssetHistory(asset.id)
      .then((response) => {
        if (active) setLoadedResult({ assetId: asset.id, history: response.data || [], error: "" });
      })
      .catch((loadError) => {
        if (active) setLoadedResult({ assetId: asset.id, history: [], error: loadError.message || "Could not load asset history." });
      });
    return () => { active = false; };
  }, [asset, isOpen]);

  const resultIsCurrent = Boolean(asset && loadedResult?.assetId === asset.id);
  const history = resultIsCurrent ? loadedResult.history : [];
  const error = resultIsCurrent ? loadedResult.error : "";
  const loading = Boolean(isOpen && asset && !resultIsCurrent);

  return (
    <Modal isOpen={isOpen} title={`History — ${asset?.serial || "asset"}`} onClose={onClose}>
      {loading ? <Spinner /> : error ? <p role="alert" style={{ color: "var(--red)", fontSize: "12px" }}>{error}</p> : history.length === 0 ? (
        <EmptyState icon={History} title="No history recorded" />
      ) : (
        <div style={{ display: "grid", gap: "10px" }}>
          {history.map((event) => (
            <div key={event.id} style={{ borderLeft: "2px solid var(--border)", paddingLeft: "12px" }}>
              <p style={{ margin: 0, fontSize: "12px", fontWeight: 700, color: "var(--text)" }}>{String(event.action).replaceAll("_", " ")}</p>
              <p style={{ margin: "3px 0 0", fontSize: "11.5px", color: "var(--subtext)" }}>{event.detail || "No details"} • {fmtDateTime(event.createdAt)}</p>
              {event.employee && <p style={{ margin: "3px 0 0", fontSize: "11.5px", color: "var(--subtext)" }}>{[event.employee.firstName, event.employee.lastName].filter(Boolean).join(" ") || event.employee.employeeCode}</p>}
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
}

function EditInventoryModal({ asset, isOpen, onClose, onSaved }) {
  const [make, setMake] = useState(asset?.make || "");
  const [model, setModel] = useState(asset?.model || "");
  const [location, setLocation] = useState(asset?.location || "");
  const [vendor, setVendor] = useState(asset?.vendor || "");
  const [conditionNotes, setConditionNotes] = useState(asset?.conditionNotes || "");
  const [warrantyExpiry, setWarrantyExpiry] = useState(asset?.warrantyExpiry ? String(asset.warrantyExpiry).slice(0, 10) : "");
  const [purchaseCost, setPurchaseCost] = useState(asset?.purchaseCost ?? "");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const response = await updateInventoryItem(asset.id, {
        make: make.trim() || null,
        model: model.trim() || null,
        location: location.trim() || null,
        vendor: vendor.trim() || null,
        conditionNotes: conditionNotes.trim() || null,
        warrantyExpiry: warrantyExpiry || null,
        purchaseCost: purchaseCost === "" ? null : Number(purchaseCost),
      });
      onSaved(response.data);
      onClose();
    } catch (saveError) {
      setError(saveError.message || "Could not update the asset.");
    } finally {
      setSaving(false);
    }
  };

  if (!asset) return null;
  return (
    <Modal isOpen={isOpen} title={`Edit — ${asset.serial}`} onClose={onClose}>
      <form onSubmit={handleSubmit} style={{ display: "grid", gap: "12px" }}>
        {[
          ["Make", make, setMake],
          ["Model", model, setModel],
          ["Location", location, setLocation],
          ["Vendor", vendor, setVendor],
        ].map(([label, value, setter]) => (
          <label key={label} style={{ display: "grid", gap: "5px", fontSize: "12px", fontWeight: 600, color: "var(--label)" }}>
            {label}<input value={value} onChange={(event) => setter(event.target.value)} style={inputStyle()} />
          </label>
        ))}
        <label style={{ display: "grid", gap: "5px", fontSize: "12px", fontWeight: 600, color: "var(--label)" }}>
          Warranty expiry<input type="date" value={warrantyExpiry} onChange={(event) => setWarrantyExpiry(event.target.value)} style={inputStyle()} />
        </label>
        <label style={{ display: "grid", gap: "5px", fontSize: "12px", fontWeight: 600, color: "var(--label)" }}>
          Purchase cost (₹)<input type="number" min="0" step="0.01" value={purchaseCost} onChange={(event) => setPurchaseCost(event.target.value)} style={inputStyle()} />
        </label>
        <label style={{ display: "grid", gap: "5px", fontSize: "12px", fontWeight: 600, color: "var(--label)" }}>
          Condition notes<textarea rows={3} value={conditionNotes} onChange={(event) => setConditionNotes(event.target.value)} style={{ ...inputStyle(), resize: "vertical" }} />
        </label>
        {error && <p role="alert" style={{ color: "var(--red)", fontSize: "12px", margin: 0 }}>{error}</p>}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px" }}>
          <SecondaryButton type="button" onClick={onClose} disabled={saving}>Cancel</SecondaryButton>
          <PrimaryButton type="submit" disabled={saving}>{saving ? "Saving..." : "Save changes"}</PrimaryButton>
        </div>
      </form>
    </Modal>
  );
}

function AssignInventoryModal({ asset, employees, isOpen, onClose, onSaved }) {
  const [employeeId, setEmployeeId] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const response = await assignInventoryItem(asset.id, employeeId);
      onSaved(response.data);
      onClose();
    } catch (saveError) {
      setError(saveError.message || "Could not assign this asset.");
    } finally {
      setSaving(false);
    }
  };

  if (!asset) return null;
  return (
    <Modal isOpen={isOpen} title={`Assign — ${asset.serial}`} onClose={onClose}>
      <form onSubmit={handleSubmit} style={{ display: "grid", gap: "14px" }}>
        <label style={{ display: "grid", gap: "5px", fontSize: "12px", fontWeight: 600, color: "var(--label)" }}>
          Active employee *
          <select required value={employeeId} onChange={(event) => setEmployeeId(event.target.value)} style={{ ...inputStyle(), height: "38px" }}>
            <option value="">Choose employee</option>
            {employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.name || `${employee.firstName || ""} ${employee.lastName || ""}`.trim()} — {employee.employeeCode}</option>)}
          </select>
        </label>
        <p style={{ fontSize: "11.5px", color: "var(--subtext)", margin: 0 }}>Assignment is recorded in asset history. Physical assets remain pending until the employee acknowledges receipt.</p>
        {error && <p role="alert" style={{ color: "var(--red)", fontSize: "12px", margin: 0 }}>{error}</p>}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px" }}>
          <SecondaryButton type="button" onClick={onClose} disabled={saving}>Cancel</SecondaryButton>
          <PrimaryButton type="submit" disabled={saving || !employeeId}>{saving ? "Assigning..." : "Assign asset"}</PrimaryButton>
        </div>
      </form>
    </Modal>
  );
}

function RetireAssetModal({ asset, isOpen, onClose, onSaved }) {
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const response = await retireInventoryItem(asset.id, reason.trim());
      onSaved(response.data);
      setReason("");
      onClose();
    } catch (saveError) {
      setError(saveError.message || "Could not retire this asset.");
    } finally {
      setSaving(false);
    }
  };

  if (!asset) return null;
  return (
    <Modal isOpen={isOpen} title={`Retire — ${asset.serial}`} onClose={onClose}>
      <form onSubmit={handleSubmit} style={{ display: "grid", gap: "12px" }}>
        <p style={{ fontSize: "12px", color: "var(--subtext)", margin: 0 }}>Unassigned in-stock, damaged, or maintenance assets can be retired. The reason is recorded in asset history.</p>
        <label style={{ display: "grid", gap: "5px", fontSize: "12px", fontWeight: 600, color: "var(--label)" }}>
          Reason *
          <textarea required rows={3} maxLength={1000} value={reason} onChange={(event) => setReason(event.target.value)} style={{ ...inputStyle(), resize: "vertical" }} />
        </label>
        {error && <p role="alert" style={{ color: "var(--red)", fontSize: "12px", margin: 0 }}>{error}</p>}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px" }}>
          <SecondaryButton type="button" onClick={onClose} disabled={saving}>Cancel</SecondaryButton>
          <PrimaryButton type="submit" disabled={saving || !reason.trim()}>{saving ? "Retiring..." : "Retire asset"}</PrimaryButton>
        </div>
      </form>
    </Modal>
  );
}

function RepairAssetModal({ asset, isOpen, onClose, onSaved }) {
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const response = await sendInventoryItemForRepair(asset.id, reason.trim());
      onSaved(response.data);
      onClose();
      setReason("");
    } catch (saveError) {
      setError(saveError.message || "Could not send this asset for repair.");
    } finally {
      setSaving(false);
    }
  };

  if (!asset) return null;
  return (
    <Modal isOpen={isOpen} title={`Send for repair — ${asset.serial}`} onClose={onClose}>
      <form onSubmit={handleSubmit} style={{ display: "grid", gap: "12px" }}>
        <p style={{ margin: 0, fontSize: "12px", color: "var(--subtext)" }}>
          This moves the damaged asset into Maintenance and records the repair note in its history.
        </p>
        <label style={{ display: "grid", gap: "5px", fontSize: "12px", fontWeight: 600, color: "var(--label)" }}>
          Repair note *
          <textarea required rows={3} maxLength={1000} value={reason} onChange={(event) => setReason(event.target.value)} style={{ ...inputStyle(), resize: "vertical" }} />
        </label>
        {error && <p role="alert" style={{ color: "var(--red)", fontSize: "12px", margin: 0 }}>{error}</p>}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px" }}>
          <SecondaryButton type="button" onClick={onClose} disabled={saving}>Cancel</SecondaryButton>
          <PrimaryButton type="submit" disabled={saving || !reason.trim()}>{saving ? "Sending..." : "Send for repair"}</PrimaryButton>
        </div>
      </form>
    </Modal>
  );
}

function InventoryTab({
  inventory,
  licenseAlerts,
  onItemAdded,
  onItemChanged,
  canManage,
}) {
  const [showAdd, setShowAdd] = useState(false);
  const [historyTarget, setHistoryTarget] = useState(null);
  const [editTarget, setEditTarget] = useState(null);
  const [assignTarget, setAssignTarget] = useState(null);
  const [retireTarget, setRetireTarget] = useState(null);
  const [repairTarget, setRepairTarget] = useState(null);
  const [reclaimTarget, setReclaimTarget] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [employeeError, setEmployeeError] = useState("");
  const [loadingEmployees, setLoadingEmployees] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const categories = [...new Set(inventory.map((item) => item.category))].sort();
  const filteredInventory = inventory.filter((item) => {
    const query = search.trim().toLowerCase();
    const matchesQuery = !query || [item.make, item.model, item.category, item.serial, item.currentHolderName]
      .some((value) => String(value || "").toLowerCase().includes(query));
    return matchesQuery &&
      (statusFilter === "ALL" || normalizeStatus(item.status) === statusFilter) &&
      (categoryFilter === "ALL" || item.category === categoryFilter);
  });

  const openAssign = async (item) => {
    setEmployeeError("");
    if (employees.length > 0) {
      setAssignTarget(item);
      return;
    }
    setLoadingEmployees(true);
    try {
      const response = await getEmployees({ status: "Active" });
      const rows = response.data?.data || response.data || [];
      setEmployees(rows.filter((employee) => employee.status === "Active"));
      setAssignTarget(item);
    } catch (error) {
      setEmployeeError(error.message || "Could not load active employees for assignment.");
    } finally {
      setLoadingEmployees(false);
    }
  };

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

      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "14px" }}>
        <input aria-label="Search inventory" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search name, serial or holder" style={{ ...inputStyle(), flex: "1 1 220px" }} />
        <select aria-label="Filter inventory by status" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} style={{ ...inputStyle(), width: "auto", minWidth: "145px" }}>
          <option value="ALL">All statuses</option>
          {Object.keys(assetStatusMeta).map((status) => <option key={status} value={status}>{assetStatusMeta[status].label}</option>)}
        </select>
        <select aria-label="Filter inventory by category" value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)} style={{ ...inputStyle(), width: "auto", minWidth: "165px" }}>
          <option value="ALL">All categories</option>
          {categories.map((category) => <option key={category} value={category}>{category}</option>)}
        </select>
      </div>

      {inventory.length === 0 ? (
        <EmptyState
          icon={Boxes}
          title="No inventory yet"
        />
      ) : filteredInventory.length === 0 ? (
        <EmptyState icon={Boxes} title="No matching inventory" />
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fill, minmax(280px, 1fr))",
            gap: "14px",
          }}
        >
          {filteredInventory.map((item) => {
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
                    minWidth: 0,
                  }}
                >
                  <h3
                    title={assetDisplayName(item)}
                    aria-label={assetDisplayName(item)}
                    style={{
                      fontSize: "14px",
                      fontWeight: 700,
                      color: "var(--text)",
                      minWidth: 0,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                    title={assetDisplayName(item)}
                  >
                    {assetDisplayName(item)}
                  </h3>

                  <div style={{ flex: "0 0 auto", whiteSpace: "nowrap" }}>
                    <StatusBadge label={meta.label} color={meta.color} bg={meta.bg} />
                  </div>
                </div>

                <p
                  style={{
                    fontSize: "12px",
                    color: "var(--subtext)",
                    marginBottom: "6px",
                  }}
                >
                  <span style={{ fontFamily: "ui-monospace, SFMono-Regular, Consolas, monospace" }}>Serial: {item.serial}</span>
                </p>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))", gap: "5px 10px", marginTop: "8px", fontSize: "11.5px", color: "var(--subtext)" }}>
                  {item.location && <span>Location: {item.location}</span>}
                  {item.purchaseDate && <span>Purchased: {fmtDate(item.purchaseDate)}</span>}
                  {item.warrantyExpiry && <span>Warranty: {fmtDate(item.warrantyExpiry)}</span>}
                  {item.conditionNotes && <span>Condition: {item.conditionNotes}</span>}
                </div>

                {(item.currentHolderName || item.currentHolder) && (
                  <p
                    style={{
                      fontSize: "12px",
                      color: "var(--text)",
                    }}
                  >
                    Holder:{" "}
                    <strong>
                      {item.currentHolderName || [item.currentHolder?.firstName, item.currentHolder?.lastName].filter(Boolean).join(" ") || item.currentHolder?.employeeCode}
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
                {canManage && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "7px", marginTop: "12px", paddingTop: "10px", borderTop: "1px solid var(--border)" }}>
                    <SecondaryButton type="button" onClick={() => setHistoryTarget(item)} style={{ padding: "6px 9px", fontSize: "11px" }}>History</SecondaryButton>
                    <SecondaryButton type="button" onClick={() => setEditTarget(item)} style={{ padding: "6px 9px", fontSize: "11px" }}>Edit</SecondaryButton>
                    {normalizeStatus(item.status) === ASSET_STATUS.IN_STOCK && (
                      <>
                        <SecondaryButton type="button" onClick={() => openAssign(item)} disabled={loadingEmployees} style={{ padding: "6px 9px", fontSize: "11px" }}>{loadingEmployees ? "Loading..." : "Assign"}</SecondaryButton>
                        <SecondaryButton type="button" onClick={() => setRetireTarget(item)} style={{ padding: "6px 9px", fontSize: "11px", color: "var(--red)" }}>Retire</SecondaryButton>
                      </>
                    )}
                    {normalizeStatus(item.status) === ASSET_STATUS.ASSIGNED && item.currentHolderId && (
                      <SecondaryButton type="button" onClick={() => setReclaimTarget(item)} style={{ padding: "6px 9px", fontSize: "11px" }}>Reclaim</SecondaryButton>
                    )}
                    {normalizeStatus(item.status) === ASSET_STATUS.DAMAGED && (
                      <>
                        <SecondaryButton type="button" onClick={() => setRepairTarget(item)} style={{ padding: "6px 9px", fontSize: "11px" }}>Send for repair</SecondaryButton>
                        <SecondaryButton type="button" onClick={() => setRetireTarget(item)} style={{ padding: "6px 9px", fontSize: "11px", color: "var(--red)" }}>Retire</SecondaryButton>
                      </>
                    )}
                    {normalizeStatus(item.status) === ASSET_STATUS.MAINTENANCE && (
                      <SecondaryButton type="button" onClick={() => setRetireTarget(item)} style={{ padding: "6px 9px", fontSize: "11px", color: "var(--red)" }}>Retire</SecondaryButton>
                    )}
                  </div>
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
      {employeeError && <p role="alert" style={{ color: "var(--red)", fontSize: "12px" }}>{employeeError}</p>}
      <AssetHistoryModal key={historyTarget?.id || "history-closed"} asset={historyTarget} isOpen={!!historyTarget} onClose={() => setHistoryTarget(null)} />
      <EditInventoryModal key={editTarget?.id || "edit-closed"} asset={editTarget} isOpen={!!editTarget} onClose={() => setEditTarget(null)} onSaved={onItemChanged} />
      <AssignInventoryModal key={assignTarget?.id || "assign-closed"} asset={assignTarget} employees={employees} isOpen={!!assignTarget} onClose={() => setAssignTarget(null)} onSaved={onItemChanged} />
      <RetireAssetModal asset={retireTarget} isOpen={!!retireTarget} onClose={() => setRetireTarget(null)} onSaved={onItemChanged} />
      <RepairAssetModal asset={repairTarget} isOpen={!!repairTarget} onClose={() => setRepairTarget(null)} onSaved={onItemChanged} />
      <ReturnAssetModal key={reclaimTarget?.id || "reclaim-closed"} asset={reclaimTarget} isOpen={!!reclaimTarget} onClose={() => setReclaimTarget(null)} onSaved={onItemChanged} isReclaim />
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
      ASSET_STATUS.IN_STOCK &&
      (i.category !== "Software License" ||
        (i.seats != null && (i.seatsUsed || 0) < i.seats))
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
  approverName,
  currentActorCode,
  currentRole,
  canOverrideRoleStep,
}) {
  const [fulfillTarget, setFulfillTarget] =
    useState(null);
  const [rejectTarget, setRejectTarget] = useState(null);
  const [rejectReason, setRejectReason] = useState("");
  const [rejectError, setRejectError] = useState("");
  const [rejectSaving, setRejectSaving] = useState(false);
  const [requestSearch, setRequestSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const handleApprove = async (id) => {
    try {
      const res = await approveRequest(
        id,
        approverName || "Manager"
      );

      onRequestUpdated(res.data);
    } catch (err) {
      console.error("Approve request error:", err);
    }
  };

  const handleReject = async () => {
    if (!rejectTarget || !rejectReason.trim()) {
      setRejectError("A rejection reason is required.");
      return;
    }
    try {
      setRejectSaving(true);
      setRejectError("");
      const res = await rejectRequest(rejectTarget.id, rejectReason.trim());

      onRequestUpdated(res.data);
      setRejectTarget(null);
      setRejectReason("");
    } catch (err) {
      console.error("Reject request error:", err);
      setRejectError(err?.message || "Failed to reject request.");
    } finally {
      setRejectSaving(false);
    }
  };

  const getAvailableInventoryForRequest = (req) => {
    return inventory.filter(
      (item) =>
        item.category === req.category &&
        normalizeStatus(item.status) === ASSET_STATUS.IN_STOCK &&
        (item.category !== "Software License" ||
          (item.seats != null && (item.seatsUsed || 0) < item.seats))
    );
  };

  const fulfillmentAssetByRequest = new Map();
  const reservedUnitsByAsset = new Map();
  [...requests]
    .filter((request) => [REQUEST_STATUS.APPROVED, REQUEST_STATUS.PENDING_PROCUREMENT].includes(normalizeStatus(request.status)))
    .sort((a, b) => new Date(a.raisedAt).getTime() - new Date(b.raisedAt).getTime())
    .forEach((request) => {
      const unit = getAvailableInventoryForRequest(request).find((asset) => {
        const reserved = reservedUnitsByAsset.get(asset.id) || 0;
        return asset.category === "Software License"
          ? (asset.seatsUsed || 0) + reserved < (asset.seats || 0)
          : reserved === 0;
      });
      if (unit) {
        fulfillmentAssetByRequest.set(request.id, unit);
        reservedUnitsByAsset.set(unit.id, (reservedUnitsByAsset.get(unit.id) || 0) + 1);
      }
    });

  const normalizedSearch = requestSearch.trim().toLowerCase();
  const visibleRequests = requests.filter((request) => {
    const status = normalizeStatus(request.status);
    const matchesStatus = statusFilter === "ALL" || status === statusFilter;
    const matchesSearch = !normalizedSearch || [
      request.id,
      request.category,
      request.assetType,
      request.model,
      request.employeeName,
      request.employee?.employeeCode,
      request.justification,
    ].some((value) => String(value || "").toLowerCase().includes(normalizedSearch));
    return matchesStatus && matchesSearch;
  });
  const requestCounts = {
    [REQUEST_STATUS.PENDING_APPROVAL]: requests.filter((request) => normalizeStatus(request.status) === REQUEST_STATUS.PENDING_APPROVAL).length,
    [REQUEST_STATUS.APPROVED]: requests.filter((request) => normalizeStatus(request.status) === REQUEST_STATUS.APPROVED).length,
    [REQUEST_STATUS.FULFILLED]: requests.filter((request) => normalizeStatus(request.status) === REQUEST_STATUS.FULFILLED).length,
    [REQUEST_STATUS.REJECTED]: requests.filter((request) => normalizeStatus(request.status) === REQUEST_STATUS.REJECTED).length,
    [REQUEST_STATUS.PENDING_PROCUREMENT]: requests.filter((request) => normalizeStatus(request.status) === REQUEST_STATUS.PENDING_PROCUREMENT).length,
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

      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
        <input aria-label="Search asset requests" value={requestSearch} onChange={(event) => setRequestSearch(event.target.value)} placeholder="Search employee, category or request ID" style={{ ...inputStyle(), flex: "1 1 240px" }} />
        <button type="button" onClick={() => setStatusFilter("ALL")} aria-pressed={statusFilter === "ALL"} style={{ ...filterChipStyle, opacity: statusFilter === "ALL" ? 1 : 0.65 }}>All {requests.length}</button>
        <button type="button" onClick={() => setStatusFilter(REQUEST_STATUS.PENDING_APPROVAL)} aria-pressed={statusFilter === REQUEST_STATUS.PENDING_APPROVAL} style={{ ...filterChipStyle, opacity: statusFilter === REQUEST_STATUS.PENDING_APPROVAL ? 1 : 0.65 }}>Pending {requestCounts[REQUEST_STATUS.PENDING_APPROVAL]}</button>
        <button type="button" onClick={() => setStatusFilter(REQUEST_STATUS.APPROVED)} aria-pressed={statusFilter === REQUEST_STATUS.APPROVED} style={{ ...filterChipStyle, opacity: statusFilter === REQUEST_STATUS.APPROVED ? 1 : 0.65 }}>Approved {requestCounts[REQUEST_STATUS.APPROVED]}</button>
        <button type="button" onClick={() => setStatusFilter(REQUEST_STATUS.PENDING_PROCUREMENT)} aria-pressed={statusFilter === REQUEST_STATUS.PENDING_PROCUREMENT} style={{ ...filterChipStyle, opacity: statusFilter === REQUEST_STATUS.PENDING_PROCUREMENT ? 1 : 0.65 }}>Procurement {requestCounts[REQUEST_STATUS.PENDING_PROCUREMENT]}</button>
        <button type="button" onClick={() => setStatusFilter(REQUEST_STATUS.FULFILLED)} aria-pressed={statusFilter === REQUEST_STATUS.FULFILLED} style={{ ...filterChipStyle, opacity: statusFilter === REQUEST_STATUS.FULFILLED ? 1 : 0.65 }}>Fulfilled {requestCounts[REQUEST_STATUS.FULFILLED]}</button>
        <button type="button" onClick={() => setStatusFilter(REQUEST_STATUS.REJECTED)} aria-pressed={statusFilter === REQUEST_STATUS.REJECTED} style={{ ...filterChipStyle, opacity: statusFilter === REQUEST_STATUS.REJECTED ? 1 : 0.65 }}>Rejected {requestCounts[REQUEST_STATUS.REJECTED]}</button>
      </div>

      {visibleRequests.length === 0 ? <EmptyState icon={ClipboardList} title="No matching requests" /> : <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "12px",
        }}
      >
        {visibleRequests.map((r) => {
          const normalizedStatus =
            normalizeStatus(r.status);

          const meta =
            getRequestStatusMeta(r.status);

          const needsApproval = requiresRequestApproval(r.category, r.estimatedCost);

          const availableUnits =
            getAvailableInventoryForRequest(r);
          const fulfillmentAsset = fulfillmentAssetByRequest.get(r.id);
          const inventoryAvailable = Boolean(fulfillmentAsset);
          const stockReserved = availableUnits.length > 0 && !inventoryAvailable && [REQUEST_STATUS.APPROVED, REQUEST_STATUS.PENDING_PROCUREMENT].includes(normalizedStatus);
          const awaitingStock = !inventoryAvailable && [REQUEST_STATUS.APPROVED, REQUEST_STATUS.PENDING_PROCUREMENT].includes(normalizedStatus);
          const daysUntilNeeded = daysUntil(r.neededBy);
          const approvalComplete =
            !needsApproval ||
            normalizedStatus !==
            REQUEST_STATUS.PENDING_APPROVAL;
          const fulfillDisabled =
            !canManage ||
            !approvalComplete ||
            !inventoryAvailable;
          const pendingStep = r.workflowInstance?.steps?.find((step) => step.status === "Pending");
          const namedRoleStep = pendingStep?.approverId?.startsWith("role-");
          const requiredRole = pendingStep?.approverId === "role-finance"
            ? "FINANCE"
            : pendingStep?.approverId === "role-hr"
              ? "HR"
              : null;
          const actorCanApprove = Boolean(pendingStep) && (
            pendingStep.approverId === currentActorCode ||
            pendingStep.escalatedTo === currentActorCode ||
            (requiredRole && currentRole === requiredRole) ||
            (namedRoleStep && currentRole === "ADMIN" && canOverrideRoleStep)
          );
          const isRequester = r.employee?.employeeCode === currentActorCode;
          const showApprovalActions = canManage && normalizedStatus === REQUEST_STATUS.PENDING_APPROVAL && actorCanApprove && !isRequester;
          const autoApproved = normalizedStatus === REQUEST_STATUS.APPROVED && !needsApproval;
          const autoApprovalText = CATEGORIES_REQUIRING_APPROVAL.includes(r.category)
            ? "Auto-approved by ₹25,000 threshold"
            : "Auto-approved by category policy";
          const workflowHistory = (r.workflowInstance?.steps || [])
            .filter((step) => step.actedAt)
            .map((step) => ({
              label: step.name,
              time: step.actedAt,
              detail: step.status === "Rejected"
                ? `${step.actedByName || step.approverName || "Approver"} rejected: ${step.rejectionReason || "No reason recorded"}`
                : `${step.actedByName || step.approverName || "Approver"} approved${step.roleApproverOverride ? " (Admin override)" : ""}`,
            }));

          const requestHistory = [
            {
              label: "Raised",
              time: r.raisedAt,
              detail: "Request created",
            },
            ...workflowHistory,
            ...(r.approvedAt && workflowHistory.length === 0
              ? [{
                  label: "Approved",
                  time: r.approvedAt,
                  detail: autoApproved
                    ? autoApprovalText
                    : r.approvedBy
                    ? `Approved by ${formatApproverName(r.approvedBy)}`
                    : "Approved",
                }]
              : []),
            ...(autoApproved && !r.approvedAt
              ? [{ label: "Auto-approved", time: r.raisedAt, detail: "At or below the approval threshold" }]
              : []),
            ...(normalizedStatus ===
              REQUEST_STATUS.PENDING_PROCUREMENT ||
              normalizedStatus ===
              REQUEST_STATUS.FULFILLED
              ? [{
                  label: normalizedStatus ===
                    REQUEST_STATUS.FULFILLED
                    ? "Fulfilled"
                    : "Procurement",
                  time: r.fulfilledAt || r.approvedAt || r.raisedAt,
                  detail:
                    normalizedStatus ===
                    REQUEST_STATUS.FULFILLED
                      ? "Asset assigned to employee"
                      : "Awaiting stock to fulfill",
                }]
              : []),
          ]
            .filter((entry) => entry.time)
            .sort((a, b) => new Date(b.time) - new Date(a.time));

          const pendingStage = pendingStep
            ? `Pending — ${pendingStep.approverId === "role-finance" ? "Finance" : pendingStep.approverId === "role-hr" ? "HR" : "Manager"}`
            : null;
          const statusText =
            normalizedStatus ===
            REQUEST_STATUS.PENDING_APPROVAL
              ? pendingStage || "Pending approval"
              : autoApproved
                ? !inventoryAvailable
                  ? `${autoApprovalText} — waiting for stock`
                  : autoApprovalText
              : normalizedStatus ===
                REQUEST_STATUS.APPROVED &&
                !inventoryAvailable
                ? "Approved — waiting for stock"
                : meta.label;

          return (
            <div
              key={r.id}
              style={{
                ...cardStyle,
                padding: "14px 18px",
                borderLeft: `4px solid ${meta.color}`,
                display: "flex",
                flexDirection: "column",
                gap: "12px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: "10px",
                  flexWrap: "wrap",
                  alignItems: "center",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    flexWrap: "wrap",
                  }}
                >
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      padding: "3px 8px",
                      borderRadius: "999px",
                      fontSize: "11px",
                      fontWeight: 700,
                      color: "var(--primary)",
                      background: "#eef2ff",
                    }}
                  >
                    {r.category}
                  </span>

                  <h3
                    style={{
                      margin: 0,
                      fontSize: "14px",
                      fontWeight: 700,
                      color: "var(--text)",
                    }}
                  >
                    {r.assetType || r.model || r.category}
                  </h3>
                </div>

                <StatusBadge
                  label={statusText}
                  color={meta.color}
                  bg={meta.bg}
                />
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    "repeat(auto-fit, minmax(160px, 1fr))",
                  gap: "8px",
                  fontSize: "12px",
                  color: "var(--subtext)",
                }}
              >
                <span>
                  <strong style={{ color: "var(--text)" }}>
                    Request ID
                  </strong>{" "}
                  {r.id.slice(0, 8)}
                </span>

                <span>
                  <strong style={{ color: "var(--text)" }}>
                    Employee
                  </strong>{" "}
                  {r.employeeName ||
                    r.employee?.name ||
                    [r.employee?.firstName, r.employee?.lastName]
                      .filter(Boolean)
                      .join(" ") ||
                    r.employee?.employeeCode ||
                    "Employee"}
                </span>

                <span>
                  <strong style={{ color: "var(--text)" }}>
                    Qty
                  </strong>{" "}
                  {r.quantity ?? 1}
                </span>

                <span>
                  <strong style={{ color: "var(--text)" }}>Estimated cost</strong>{" "}
                  {r.estimatedCost == null ? "—" : `₹${Number(r.estimatedCost).toLocaleString("en-IN")}`}
                </span>

                {r.asset && <span><strong style={{ color: "var(--text)" }}>Assigned asset</strong> {r.asset.serial}</span>}

                <span>
                  <strong style={{ color: "var(--text)" }}>
                    Needed by
                  </strong>{" "}
                  {r.neededBy ? fmtDate(r.neededBy) : "Not specified"}
                </span>

                <span>
                  <strong style={{ color: "var(--text)" }}>
                    Raised
                  </strong>{" "}
                  {fmtDate(r.raisedAt)}
                </span>

                <span>
                  <strong style={{ color: "var(--text)" }}>
                    Approver
                  </strong>{" "}
                  {pendingStage || (autoApproved
                    ? autoApprovalText
                    : workflowHistory.length
                      ? [...workflowHistory].sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime()).map((step) => step.detail).join(" → ")
                        : formatApproverName(r.approvedBy) || (normalizedStatus === REQUEST_STATUS.FULFILLED ? "Fulfilled — no approval workflow recorded" : "—"))}
                </span>
              </div>

              <p
                style={{
                  margin: 0,
                  fontSize: "12.5px",
                  color: "var(--subtext)",
                }}
              >
                {r.justification}
              </p>
              {awaitingStock && daysUntilNeeded !== null && daysUntilNeeded >= 0 && daysUntilNeeded <= 7 && (
                <p role="status" style={{ margin: "0 0 10px", fontSize: "12px", color: "#b45309", fontWeight: 700 }}>
                  Needed {daysUntilNeeded === 0 ? "today" : `in ${daysUntilNeeded} ${daysUntilNeeded === 1 ? "day" : "days"}`} — no stock
                </p>
              )}

              {r.rejectionReason && <p style={{ margin: 0, padding: "8px 10px", background: "#fef2f2", color: "#991b1b", borderRadius: "6px", fontSize: "12px" }}>Rejection reason: {r.rejectionReason}</p>}

              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: "10px",
                  flexWrap: "wrap",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    flexWrap: "wrap",
                  }}
                >
                  {!approvalComplete && pendingStage && (
                    <span
                      style={{
                        fontSize: "11px",
                        fontWeight: 700,
                        color: "#92400e",
                        background: "#fef3c7",
                        padding: "4px 8px",
                        borderRadius: "999px",
                      }}
                    >
                      {pendingStage}
                    </span>
                  )}

                  {awaitingStock && approvalComplete && (
                    <span
                      style={{
                        fontSize: "11px",
                        fontWeight: 700,
                        color: "#6d28d9",
                        background: "#ede9fe",
                        padding: "4px 8px",
                        borderRadius: "999px",
                      }}
                    >
                      {stockReserved ? "Stock reserved for an earlier request" : "Awaiting stock"}
                    </span>
                  )}
                </div>

                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    flexWrap: "wrap",
                  }}
                >
                  {showApprovalActions && (
                      <>
                        <PrimaryButton
                          onClick={() =>
                            handleApprove(r.id)
                          }
                          style={{ padding: "7px 11px", fontSize: "12px" }}
                        >
                          Approve
                        </PrimaryButton>

                        <SecondaryButton
                          onClick={() => { setRejectTarget(r); setRejectReason(""); setRejectError(""); }}
                          style={{ padding: "7px 11px", fontSize: "12px", color: "var(--red)" }}
                        >
                          Reject
                        </SecondaryButton>
                      </>
                    )}

                  {canManage && [REQUEST_STATUS.APPROVED, REQUEST_STATUS.PENDING_PROCUREMENT].includes(normalizedStatus) && (
                    <SecondaryButton
                      onClick={() =>
                        setFulfillTarget(r)
                      }
                      disabled={fulfillDisabled}
                      title={
                        !approvalComplete
                          ? "Manager approval must be completed before fulfillment."
                          : stockReserved
                            ? "Available stock is reserved for an earlier request."
                            : !inventoryAvailable
                            ? "No stock is currently available for this asset type."
                            : "Ready to fulfill"
                      }
                      style={{
                        color: fulfillDisabled
                          ? "var(--subtext)"
                          : "var(--primary)",
                        cursor: fulfillDisabled
                          ? "not-allowed"
                          : "pointer",
                        opacity: fulfillDisabled ? 0.6 : 1,
                        padding: "7px 11px",
                        fontSize: "12px",
                      }}
                    >
                      Fulfill
                    </SecondaryButton>
                  )}
                </div>
              </div>

              <details style={{ borderTop: "1px solid var(--border)", paddingTop: "10px" }}>
                <summary style={{ cursor: "pointer", fontSize: "11.5px", fontWeight: 700, color: "var(--label)" }}>History ({requestHistory.length})</summary>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "6px",
                  }}
                >
                  {requestHistory.map((entry) => (
                    <div
                      key={`${entry.label}-${entry.time || entry.detail}`}
                      style={{
                        fontSize: "11.5px",
                        color: "var(--subtext)",
                        display: "flex",
                        gap: "6px",
                        flexWrap: "wrap",
                      }}
                    >
                      <span>{fmtDateTime(entry.time)}</span>
                      <span>•</span>
                      <strong style={{ color: "var(--text)" }}>
                        {entry.label}
                      </strong>
                      <span>•</span>
                      <span>{entry.detail}</span>
                    </div>
                  ))}
                </div>
              </details>
            </div>
          );
        })}
      </div>}

      <FulfillModal
        isOpen={!!fulfillTarget}
        onClose={() => setFulfillTarget(null)}
        request={fulfillTarget}
        inventory={fulfillmentAssetByRequest.has(fulfillTarget?.id)
          ? [fulfillmentAssetByRequest.get(fulfillTarget.id)]
          : inventory}
        onSaved={onRequestUpdated}
      />

      <Modal isOpen={!!rejectTarget} title={`Reject ${rejectTarget?.category || "asset"} request`} onClose={() => !rejectSaving && setRejectTarget(null)}>
        <form onSubmit={(event) => { event.preventDefault(); void handleReject(); }} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          <label style={{ display: "flex", flexDirection: "column", gap: "5px", fontSize: "12px", fontWeight: 600, color: "var(--label)" }}>
            Rejection reason *
            <textarea autoFocus rows={3} maxLength={1000} required value={rejectReason} onChange={(event) => setRejectReason(event.target.value)} style={{ ...inputStyle(), resize: "vertical" }} />
          </label>
          {rejectError && <p role="alert" style={{ color: "var(--red)", fontSize: "12px", margin: 0 }}>{rejectError}</p>}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px" }}>
            <SecondaryButton type="button" onClick={() => setRejectTarget(null)} disabled={rejectSaving}>Cancel</SecondaryButton>
            <PrimaryButton type="submit" disabled={rejectSaving || !rejectReason.trim()}>{rejectSaving ? "Rejecting..." : "Confirm rejection"}</PrimaryButton>
          </div>
        </form>
      </Modal>
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
  myAssets = [],
}) {
  const [category, setCategory] = useState(
    ASSET_CATEGORIES[0]
  );
  const [assetType, setAssetType] = useState("");
  const [model, setModel] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [neededBy, setNeededBy] = useState("");
  const [requestType, setRequestType] = useState("New");
  const [replacementAssetId, setReplacementAssetId] = useState("");
  const [estimatedCost, setEstimatedCost] = useState("");
  const [deliveryLocation, setDeliveryLocation] = useState("");
  const [costCenter, setCostCenter] = useState("");
  const [attachmentUrl, setAttachmentUrl] = useState("");
  const [justification, setJustification] = useState("");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!justification.trim()) {
      setError("Business justification is required.");
      return;
    }

    const parsedQuantity = Number(quantity);
    if (!Number.isFinite(parsedQuantity) || parsedQuantity < 1) {
      setError("Quantity must be at least 1.");
      return;
    }

    try {
      setSaving(true);
      setError("");

      const request = {
        category,
        justification: justification.trim(),
        assetType: assetType.trim() || null,
        model: model.trim() || null,
        quantity: parsedQuantity,
        estimatedCost: estimatedCost === "" ? null : Number(estimatedCost),
        neededBy: neededBy || null,
        requestType,
        replacementAssetId: requestType === "Replacement" ? replacementAssetId || null : null,
        deliveryLocation: deliveryLocation.trim() || null,
        costCenter: costCenter.trim() || null,
        attachmentUrl: attachmentUrl.trim() || null,
      };

      const res = await raiseRequest(request);

      onSaved(res.data);

      onClose();

      setJustification("");
      setCategory(ASSET_CATEGORIES[0]);
      setAssetType("");
      setModel("");
      setQuantity("1");
      setNeededBy("");
      setRequestType("New");
      setEstimatedCost("");
      setDeliveryLocation("");
      setCostCenter("");
      setAttachmentUrl("");
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
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "5px",
            }}
          >
            {fieldLabel("Request type")}

            <select
              value={requestType}
              onChange={(e) => {
                setRequestType(e.target.value);
                if (e.target.value === "New") setReplacementAssetId("");
              }}
              style={{
                ...inputStyle(),
                height: "38px",
                cursor: "pointer",
              }}
            >
              {REQUEST_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>
        </div>

        {CATEGORIES_REQUIRING_APPROVAL.includes(category) && (
          <div style={{ padding: "10px 12px", borderRadius: "8px", background: "#eff6ff", border: "1px solid #bfdbfe" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
              {fieldLabel("Estimated cost (₹) — helps determine approval")}
              <input type="number" min={0} max={10000000} step="0.01" value={estimatedCost} onChange={(e) => setEstimatedCost(e.target.value)} style={inputStyle()} placeholder="Enter 0 if unknown" />
              <p style={{ fontSize: "11.5px", color: "var(--subtext)", margin: 0 }}>
                {["Laptop", "Desktop"].includes(category)
                  ? `Laptop and desktop requests always require Manager review${estimatedCost !== "" && Number(estimatedCost) > ASSET_APPROVAL_THRESHOLD ? " and Finance approval above ₹25,000" : ""}.`
                  : estimatedCost === ""
                  ? "Unknown cost requires Manager review. Costs above ₹25,000 also require Finance approval."
                  : Number(estimatedCost) > ASSET_APPROVAL_THRESHOLD
                    ? `₹${Number(estimatedCost).toLocaleString("en-IN")} is above ₹25,000: Manager and Finance approval required.`
                    : `₹${Number(estimatedCost).toLocaleString("en-IN")} is at or below ₹25,000: auto-approved.`}
              </p>
            </div>
          </div>
        )}

        {requestType === "Replacement" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
            {fieldLabel("Asset being replaced *")}
            <select value={replacementAssetId} onChange={(e) => setReplacementAssetId(e.target.value)} style={{ ...inputStyle(), height: "38px", cursor: "pointer" }} required>
              <option value="">Select one of your assigned assets</option>
              {myAssets.map((item) => <option key={item.id} value={item.id}>{item.serial} — {assetDisplayName(item)}</option>)}
            </select>
            {myAssets.length === 0 && <p style={{ fontSize: "11.5px", color: "var(--subtext)", margin: 0 }}>No assigned assets are available to select.</p>}
          </div>
        )}

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
            {fieldLabel("Specific type / model")}

            <input
              value={assetType}
              onChange={(e) => setAssetType(e.target.value)}
              style={inputStyle()}
              placeholder="Ultrabook, ThinkPad X1, ..."
            />
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "5px",
            }}
          >
            {fieldLabel("Model / SKU")}

            <input
              value={model}
              onChange={(e) => setModel(e.target.value)}
              style={inputStyle()}
              placeholder="Optional model reference"
            />
          </div>
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
            {fieldLabel("Quantity *")}

            <input
              type="number"
              min={1}
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
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
            {fieldLabel("Needed by")}

            <input
              type="date"
              min={new Date().toISOString().slice(0, 10)}
              value={neededBy}
              onChange={(e) => setNeededBy(e.target.value)}
              style={inputStyle()}
            />
          </div>
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
            {fieldLabel("Delivery location")}

            <input
              value={deliveryLocation}
              onChange={(e) => setDeliveryLocation(e.target.value)}
              style={inputStyle()}
              placeholder="Office / branch / remote"
            />
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "5px",
            }}
          >
            {fieldLabel("Cost center")}

            <input
              value={costCenter}
              onChange={(e) => setCostCenter(e.target.value)}
              style={inputStyle()}
              placeholder="Optional budget code"
            />
          </div>
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "5px",
          }}
        >
          {fieldLabel("Attachment / supporting document")}

          <input
            value={attachmentUrl}
            onChange={(e) => setAttachmentUrl(e.target.value)}
            style={inputStyle()}
            placeholder="URL or reference"
          />
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "5px",
          }}
        >
          {fieldLabel("Business Justification *")}

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
            position: "sticky",
            bottom: "-24px",
            zIndex: 1,
            background: "var(--card)",
            margin: "0 -24px -24px",
            padding: "14px 24px 24px",
            borderTop: "1px solid var(--border)",
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
            {saving ? "Submitting..." : "Submit Request"}
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
  isReclaim = false,
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
      title={`${isReclaim ? "Reclaim" : "Return"} — ${assetDisplayName(asset)}`}
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
        {isReclaim && (
          <p style={{ margin: 0, fontSize: "12px", color: "var(--subtext)" }}>
            This removes the asset from the current holder. Confirm the required device wipe before reclaiming.
          </p>
        )}
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

        {isDataBearing && (
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
                device can be returned.
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
            {saving ? (isReclaim ? "Reclaiming..." : "Logging...") : (isReclaim ? "Reclaim Asset" : "Log Return")}
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
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "8px", marginBottom: "6px", minWidth: 0 }}>
              <h3
                style={{
                  fontSize: "14px",
                  fontWeight: 700,
                  color: "var(--text)",
                  marginBottom: "6px",
                  minWidth: 0,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {assetDisplayName(item)}
              </h3>
              <div style={{ maxWidth: "48%", minWidth: 0 }}>
                <StatusBadge
                  wrap
                  label={item.acknowledged ? "Assigned" : "Pending acknowledgement"}
                  color={item.acknowledged ? "#15803d" : "#d97706"}
                  bg={item.acknowledged ? "#dcfce7" : "#fef3c7"}
                  style={{ boxSizing: "border-box", maxWidth: "100%", padding: "3px 8px" }}
                />
              </div>
              </div>

              <p
                style={{
                  fontSize: "12px",
                  color: "var(--subtext)",
                  marginBottom: "10px",
                }}
              >
                <span style={{ fontFamily: "ui-monospace, SFMono-Regular, Consolas, monospace" }}>Serial: {item.serial}</span>
              </p>

              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px 14px", marginBottom: "10px", fontSize: "11.5px", color: "var(--subtext)" }}>
                {item.location && <span>Location: {item.location}</span>}
                {item.purchaseDate && <span>Purchased: {fmtDate(item.purchaseDate)}</span>}
                {item.conditionNotes && <span>Condition: {item.conditionNotes}</span>}
              </div>

              {!item.acknowledged ? (
                <SecondaryButton
                  onClick={() =>
                    handleAcknowledge(item.id)
                  }
                >
                  <CheckCircle2 size={14} />
                  Acknowledge Receipt
                </SecondaryButton>
              ) : (
                <SecondaryButton
                  onClick={() =>
                    setReturnTarget(item)
                  }
                >
                  <RotateCcw size={13} />
                  Return Asset
                </SecondaryButton>
              )}
            </div>
          ))}
        </div>
      )}

      <RaiseRequestModal
        isOpen={showRequest}
        onClose={() => setShowRequest(false)}
        onSaved={onAssetAdded}
        myAssets={myAssets}
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
  const { permissions = [], role, user } = useAuth();

  const can = (permission) =>
    permissions.includes(permission);

  const currentApproverName =
    [user?.firstName, user?.lastName]
      .filter(Boolean)
      .join(" ") ||
    user?.name ||
    user?.employeeCode ||
    role ||
    "Manager";

  const canRead = can("assets:read");
  const canWrite = can("assets:write");
  const canViewInventory = ["ADMIN", "HR"].includes(role?.toUpperCase());

  const isEmployee = role?.toUpperCase() === "EMPLOYEE";

  // Admin / HR / Manager
  const canManageAssets =
    canWrite && !isEmployee;

  const [activeTab, setActiveTab] =
    useState(canViewInventory ? "inventory" : "myAssets");

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
          canViewInventory
            ? getInventory()
            : Promise.resolve({ data: [] }),
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
    }
  }, [canRead, canManageAssets, canViewInventory]);

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
          tabs={canViewInventory ? TABS : TABS.filter((tab) => tab.key !== "inventory")}
          active={activeTab}
          onChange={setActiveTab}
        />

        {activeTab === "inventory" && canViewInventory && (
          <InventoryTab
            inventory={inventory}
            licenseAlerts={licenseAlerts}
            onItemAdded={handleInventoryChange}
            onItemChanged={handleInventoryChange}
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
            approverName={currentApproverName}
            currentActorCode={user?.id}
            currentRole={role?.toUpperCase()}
            canOverrideRoleStep={role?.toUpperCase() === "ADMIN" && can("workflows:write")}
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
