/**
 * Asset Management Page — Module 12
 * Tabs: Inventory · Requests · My Assets
 */

import { useState, useEffect } from "react";
import {
  Boxes,
  ClipboardList,
  Laptop,
  Plus,
  CheckCircle2,
  XCircle,
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
  raiseRequest,
  approveRequest,
  rejectRequest,
  fulfillRequest,
  acknowledgeReceipt,
  returnAsset,
} from "../../services/assetService";
import { ASSET_CATEGORIES, CATEGORIES_REQUIRING_APPROVAL, DATA_BEARING_CATEGORIES, assetStatusMeta, requestStatusMeta } from "../../mock/assets";

const ME = { id: "EMP001", name: "Matsya Singh" };
const fmtDate = (d) => new Date(d + "T00:00:00").toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });

/* ---------------------------------- shared bits ---------------------------------- */

const cardStyle = {
  background: "var(--card)",
  borderRadius: "var(--radius-lg)",
  border: "1px solid var(--border)",
  boxShadow: "var(--shadow-sm)",
};

function inputStyle() {
  return {
    width: "100%", padding: "9px 12px",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius-sm)", fontSize: "13.5px", color: "var(--text)",
    outline: "none", background: "var(--card)", fontFamily: "inherit",
  };
}

function fieldLabel(text) {
  return <label style={{ fontSize: "12px", fontWeight: 600, color: "var(--label)" }}>{text}</label>;
}

function PrimaryButton({ children, ...props }) {
  return (
    <button {...props} style={{
      display: "flex", alignItems: "center", gap: "6px", padding: "9px 16px",
      background: "var(--primary)", color: "#fff", border: "none", borderRadius: "var(--radius-sm)",
      fontWeight: 600, fontSize: "13px", cursor: props.disabled ? "not-allowed" : "pointer",
      opacity: props.disabled ? 0.6 : 1, ...props.style,
    }}>
      {children}
    </button>
  );
}

function SecondaryButton({ children, ...props }) {
  return (
    <button {...props} style={{
      padding: "9px 16px", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)",
      background: "none", color: "var(--label)", fontWeight: 600, fontSize: "13px", cursor: "pointer", ...props.style,
    }}>
      {children}
    </button>
  );
}

function TabNav({ tabs, active, onChange }) {
  return (
    <div style={{ display: "flex", gap: "4px", borderBottom: "1px solid var(--border)", marginBottom: "22px", overflowX: "auto" }}>
      {tabs.map((t) => {
        const isActive = t.key === active;
        return (
          <button key={t.key} onClick={() => onChange(t.key)} style={{
            display: "flex", alignItems: "center", gap: "7px", padding: "10px 16px",
            border: "none", borderBottom: isActive ? "2px solid var(--primary)" : "2px solid transparent",
            background: "none", color: isActive ? "var(--primary)" : "var(--subtext)",
            fontWeight: 600, fontSize: "13.5px", cursor: "pointer", whiteSpace: "nowrap",
          }}>
            <t.icon size={15} />
            {t.label}
          </button>
        );
      })}
    </div>
  );
}

/* ---------------------------------- Inventory tab ---------------------------------- */

function AddInventoryModal({ isOpen, onClose, onSaved }) {
  const [serial, setSerial] = useState("");
  const [category, setCategory] = useState(ASSET_CATEGORIES[0]);
  const [make, setMake] = useState("");
  const [model, setModel] = useState("");
  const [seats, setSeats] = useState("");
  const [licenseExpiry, setLicenseExpiry] = useState("");
  const [saving, setSaving] = useState(false);

  const isLicense = category === "Software License";

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!serial.trim()) return;
    setSaving(true);
    const item = {
      id: `as-${Date.now()}`,
      serial: serial.trim(),
      category,
      make: make.trim(),
      model: model.trim(),
      ...(isLicense ? { seats: Number(seats) || 0, seatsUsed: 0, licenseExpiry: licenseExpiry || null } : {}),
    };
    const res = await addInventoryItem(item);
    setSaving(false);
    onSaved(res.data);
    onClose();
    setSerial(""); setMake(""); setModel(""); setSeats(""); setLicenseExpiry("");
  };

  return (
    <Modal isOpen={isOpen} title="Add Inventory Item" onClose={onClose}>
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
          {fieldLabel("Category *")}
          <select value={category} onChange={(e) => setCategory(e.target.value)} style={{ ...inputStyle(), height: "38px", cursor: "pointer" }}>
            {ASSET_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
          {fieldLabel(isLicense ? "License Key / Identifier *" : "Serial Number *")}
          <input value={serial} onChange={(e) => setSerial(e.target.value)} style={inputStyle()} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
            {fieldLabel("Make")}
            <input value={make} onChange={(e) => setMake(e.target.value)} style={inputStyle()} />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
            {fieldLabel("Model")}
            <input value={model} onChange={(e) => setModel(e.target.value)} style={inputStyle()} />
          </div>
        </div>
        {isLicense && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
              {fieldLabel("Seat Count *")}
              <input type="number" min={1} value={seats} onChange={(e) => setSeats(e.target.value)} style={inputStyle()} />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
              {fieldLabel("Expiry Date *")}
              <input type="date" value={licenseExpiry} onChange={(e) => setLicenseExpiry(e.target.value)} style={inputStyle()} />
            </div>
          </div>
        )}
        <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
          <SecondaryButton type="button" onClick={onClose}>Cancel</SecondaryButton>
          <PrimaryButton type="submit" disabled={saving}>{saving ? "Saving…" : "Add to Inventory"}</PrimaryButton>
        </div>
      </form>
    </Modal>
  );
}

function InventoryTab({ inventory, licenseAlerts, onItemAdded }) {
  const [showAdd, setShowAdd] = useState(false);

  return (
    <div>
      {licenseAlerts.length > 0 && (
        <div style={{ ...cardStyle, padding: "14px 18px", marginBottom: "16px", background: "#fffbeb", border: "1px solid #fde68a" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
            <AlertTriangle size={16} style={{ color: "#d97706" }} />
            <h3 style={{ fontSize: "13px", fontWeight: 700, color: "#92400e" }}>License alerts</h3>
          </div>
          {licenseAlerts.map(({ asset, alerts }) => (
            <p key={asset.id} style={{ fontSize: "12.5px", color: "#92400e", margin: "2px 0" }}>
              <strong>{asset.model}</strong> ({asset.serial}) — {alerts.join(" · ")}
            </p>
          ))}
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
        <h2 style={{ fontSize: "14px", fontWeight: 700, color: "var(--text)" }}>Inventory</h2>
        <PrimaryButton onClick={() => setShowAdd(true)}><Plus size={16} /> Add Item</PrimaryButton>
      </div>

      {inventory.length === 0 ? (
        <EmptyState icon={Boxes} title="No inventory yet" />
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "14px" }}>
          {inventory.map((item) => {
            const meta = assetStatusMeta[item.status];
            return (
              <div key={item.id} style={{ ...cardStyle, padding: "16px 18px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "8px", marginBottom: "6px" }}>
                  <h3 style={{ fontSize: "14px", fontWeight: 700, color: "var(--text)" }}>{item.make} {item.model}</h3>
                  <StatusBadge label={item.status} color={meta.color} bg={meta.bg} />
                </div>
                <p style={{ fontSize: "12px", color: "var(--subtext)", marginBottom: "6px" }}>{item.category} · {item.serial}</p>
                {item.currentHolderName && (
                  <p style={{ fontSize: "12px", color: "var(--text)" }}>Holder: <strong>{item.currentHolderName}</strong>{item.acknowledged === false ? " (not yet acknowledged)" : ""}</p>
                )}
                {item.category === "Software License" && (
                  <p style={{ fontSize: "12px", color: "var(--subtext)" }}>Seats {item.seatsUsed}/{item.seats} · expires {fmtDate(item.licenseExpiry)}</p>
                )}
              </div>
            );
          })}
        </div>
      )}

      <AddInventoryModal isOpen={showAdd} onClose={() => setShowAdd(false)} onSaved={onItemAdded} />
    </div>
  );
}

/* ---------------------------------- Requests tab ---------------------------------- */

function FulfillModal({ isOpen, onClose, request, inventory, onSaved }) {
  const [assetId, setAssetId] = useState("");
  const [saving, setSaving] = useState(false);

  const available = inventory.filter((i) => i.category === request?.category && i.status === "In Stock");

  const handleFulfill = async () => {
    setSaving(true);
    const res = await fulfillRequest(request.id, assetId || null);
    setSaving(false);
    onSaved(res.data);
    onClose();
    setAssetId("");
  };

  if (!request) return null;

  return (
    <Modal isOpen={isOpen} title={`Fulfill — ${request.category} request`} onClose={onClose}>
      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        {available.length === 0 ? (
          <p style={{ fontSize: "13px", color: "var(--red)" }}>
            No in-stock {request.category} units. Fulfilling now will mark this request "Pending Procurement" and notify IT/Finance to reorder.
          </p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
            {fieldLabel("Select unit to assign *")}
            <select value={assetId} onChange={(e) => setAssetId(e.target.value)} style={{ ...inputStyle(), height: "38px", cursor: "pointer" }}>
              <option value="">Select unit</option>
              {available.map((i) => <option key={i.id} value={i.id}>{i.serial} — {i.make} {i.model}</option>)}
            </select>
          </div>
        )}
        <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
          <SecondaryButton onClick={onClose}>Cancel</SecondaryButton>
          <PrimaryButton onClick={handleFulfill} disabled={saving || (available.length > 0 && !assetId)}>
            {saving ? "Fulfilling…" : available.length === 0 ? "Mark Pending Procurement" : "Assign Unit"}
          </PrimaryButton>
        </div>
      </div>
    </Modal>
  );
}

function RequestsTab({ requests, inventory, onRequestUpdated }) {
  const [fulfillTarget, setFulfillTarget] = useState(null);

  const handleApprove = async (id) => {
    const res = await approveRequest(id, "Manager");
    onRequestUpdated(res.data);
  };
  const handleReject = async (id) => {
    const res = await rejectRequest(id);
    onRequestUpdated(res.data);
  };

  if (requests.length === 0) return <EmptyState icon={ClipboardList} title="No asset requests" />;

  return (
    <div>
      <h2 style={{ fontSize: "14px", fontWeight: 700, color: "var(--text)", marginBottom: "14px" }}>Asset Requests</h2>
      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        {requests.map((r) => {
          const meta = requestStatusMeta[r.status];
          const needsApproval = CATEGORIES_REQUIRING_APPROVAL.includes(r.category);
          return (
            <div key={r.id} style={{ ...cardStyle, padding: "14px 18px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
              <div>
                <p style={{ fontSize: "13.5px", fontWeight: 700, color: "var(--text)" }}>{r.employeeName} — {r.category}</p>
                <p style={{ fontSize: "12px", color: "var(--subtext)" }}>{r.justification}</p>
                <p style={{ fontSize: "11px", color: "var(--subtext)" }}>Raised {fmtDate(r.raisedAt)}{needsApproval ? " · requires manager approval" : " · auto-approved"}</p>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <StatusBadge label={r.status} color={meta.color} bg={meta.bg} />
                {r.status === "Pending Approval" && (
                  <>
                    <button onClick={() => handleApprove(r.id)} style={{ fontSize: "12px", fontWeight: 700, color: "var(--primary)", border: "none", background: "none", cursor: "pointer" }}>Approve</button>
                    <button onClick={() => handleReject(r.id)} style={{ fontSize: "12px", fontWeight: 700, color: "var(--red)", border: "none", background: "none", cursor: "pointer" }}>Reject</button>
                  </>
                )}
                {r.status === "Approved" && (
                  <button onClick={() => setFulfillTarget(r)} style={{ fontSize: "12px", fontWeight: 700, color: "var(--primary)", border: "none", background: "none", cursor: "pointer" }}>Fulfill</button>
                )}
              </div>
            </div>
          );
        })}
      </div>
      <FulfillModal isOpen={!!fulfillTarget} onClose={() => setFulfillTarget(null)} request={fulfillTarget} inventory={inventory} onSaved={onRequestUpdated} />
    </div>
  );
}

/* ---------------------------------- My Assets tab ---------------------------------- */

function RaiseRequestModal({ isOpen, onClose, onSaved }) {
  const [category, setCategory] = useState(ASSET_CATEGORIES[0]);
  const [justification, setJustification] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!justification.trim()) return;
    setSaving(true);
    const res = await raiseRequest({ employeeId: ME.id, employeeName: ME.name, category, justification: justification.trim() });
    setSaving(false);
    onSaved(res.data);
    onClose();
    setJustification("");
  };

  return (
    <Modal isOpen={isOpen} title="Request an Asset" onClose={onClose}>
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
          {fieldLabel("Category *")}
          <select value={category} onChange={(e) => setCategory(e.target.value)} style={{ ...inputStyle(), height: "38px", cursor: "pointer" }}>
            {ASSET_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          {CATEGORIES_REQUIRING_APPROVAL.includes(category) && (
            <p style={{ fontSize: "11px", color: "var(--subtext)", margin: 0 }}>This category needs manager approval before fulfillment.</p>
          )}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
          {fieldLabel("Business Justification *")}
          <textarea rows={3} value={justification} onChange={(e) => setJustification(e.target.value)} style={{ ...inputStyle(), resize: "vertical" }} />
        </div>
        <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
          <SecondaryButton type="button" onClick={onClose}>Cancel</SecondaryButton>
          <PrimaryButton type="submit" disabled={saving}>{saving ? "Submitting…" : "Submit Request"}</PrimaryButton>
        </div>
      </form>
    </Modal>
  );
}

function ReturnAssetModal({ isOpen, onClose, asset, onSaved }) {
  const [condition, setCondition] = useState("Good");
  const [wipeCompleted, setWipeCompleted] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const isDataBearing = asset && DATA_BEARING_CATEGORIES.includes(asset.category);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    const res = await returnAsset(asset.id, condition, wipeCompleted);
    setSaving(false);
    if (res.data?.error) {
      setError(res.data.error);
      return;
    }
    setError("");
    onSaved(res.data.asset);
    onClose();
    setCondition("Good"); setWipeCompleted(false);
  };

  if (!asset) return null;

  return (
    <Modal isOpen={isOpen} title={`Return — ${asset.make} ${asset.model}`} onClose={onClose}>
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
          {fieldLabel("Condition on return *")}
          <select value={condition} onChange={(e) => setCondition(e.target.value)} style={{ ...inputStyle(), height: "38px", cursor: "pointer" }}>
            <option value="Good">Good — return to stock</option>
            <option value="Damaged">Damaged / write-off</option>
          </select>
        </div>
        {isDataBearing && condition === "Good" && (
          <label style={{ display: "flex", alignItems: "flex-start", gap: "8px", fontSize: "12.5px", color: "var(--label)", cursor: "pointer" }}>
            <input type="checkbox" checked={wipeCompleted} onChange={(e) => setWipeCompleted(e.target.checked)} style={{ marginTop: "2px" }} />
            <span>Disk wipe / reimage checklist completed — required before this device can go back into stock.</span>
          </label>
        )}
        {error && (
          <p style={{ fontSize: "12px", color: "var(--red)", display: "flex", alignItems: "center", gap: "6px" }}>
            <ShieldAlert size={14} /> {error}
          </p>
        )}
        <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
          <SecondaryButton type="button" onClick={onClose}>Cancel</SecondaryButton>
          <PrimaryButton type="submit" disabled={saving}>{saving ? "Logging…" : "Log Return"}</PrimaryButton>
        </div>
      </form>
    </Modal>
  );
}

function MyAssetsTab({ myAssets, onAssetAdded, onAssetUpdated }) {
  const [showRequest, setShowRequest] = useState(false);
  const [returnTarget, setReturnTarget] = useState(null);

  const handleAcknowledge = async (assetId) => {
    const res = await acknowledgeReceipt(assetId, ME.id);
    onAssetUpdated(res.data);
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
        <h2 style={{ fontSize: "14px", fontWeight: 700, color: "var(--text)" }}>My Assets</h2>
        <PrimaryButton onClick={() => setShowRequest(true)}><Plus size={16} /> Request Asset</PrimaryButton>
      </div>

      {myAssets.length === 0 ? (
        <EmptyState icon={Laptop} title="No assets assigned yet" />
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "14px" }}>
          {myAssets.map((item) => (
            <div key={item.id} style={{ ...cardStyle, padding: "16px 18px" }}>
              <h3 style={{ fontSize: "14px", fontWeight: 700, color: "var(--text)", marginBottom: "6px" }}>{item.make} {item.model}</h3>
              <p style={{ fontSize: "12px", color: "var(--subtext)", marginBottom: "10px" }}>{item.category} · {item.serial}</p>
              {!item.acknowledged ? (
                <PrimaryButton onClick={() => handleAcknowledge(item.id)} style={{ padding: "7px 14px", fontSize: "12px" }}>
                  <CheckCircle2 size={14} /> Acknowledge Receipt
                </PrimaryButton>
              ) : (
                <button onClick={() => setReturnTarget(item)} style={{ display: "flex", alignItems: "center", gap: "5px", fontSize: "12px", fontWeight: 700, color: "var(--primary)", border: "none", background: "none", cursor: "pointer" }}>
                  <RotateCcw size={13} /> Return Asset
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      <RaiseRequestModal isOpen={showRequest} onClose={() => setShowRequest(false)} onSaved={onAssetAdded} />
      <ReturnAssetModal isOpen={!!returnTarget} onClose={() => setReturnTarget(null)} asset={returnTarget} onSaved={onAssetUpdated} />
    </div>
  );
}

/* ---------------------------------- Page ---------------------------------- */

const TABS = [
  { key: "inventory", label: "Inventory", icon: Boxes },
  { key: "requests", label: "Requests", icon: ClipboardList },
  { key: "myAssets", label: "My Assets", icon: Laptop },
];

export default function Assets() {
  const [activeTab, setActiveTab] = useState("inventory");
  const [loading, setLoading] = useState(true);
  const [inventory, setInventory] = useState([]);
  const [licenseAlerts, setLicenseAlerts] = useState([]);
  const [requests, setRequests] = useState([]);

  useEffect(() => {
    setLoading(true);
    Promise.all([getInventory(), getLicenseAlerts(), getAllRequests()])
      .then(([inv, alerts, reqs]) => {
        setInventory(inv.data);
        setLicenseAlerts(alerts.data);
        setRequests(reqs.data);
      })
      .finally(() => setLoading(false));
  }, []);

  const myAssets = inventory.filter((i) => i.currentHolderId === ME.id && i.status === "Assigned");

  const handleInventoryChange = (item) => {
    setInventory((prev) => {
      const exists = prev.some((i) => i.id === item.id);
      return exists ? prev.map((i) => (i.id === item.id ? item : i)) : [item, ...prev];
    });
  };

  const handleRequestChange = (result) => {
    // fulfillRequest returns { request, asset } or { request, procurementNeeded }; others return the request directly.
    const request = result?.request ?? result;
    if (request) setRequests((prev) => prev.map((r) => (r.id === request.id ? request : r)));
    if (result?.asset) handleInventoryChange(result.asset);
  };

  if (loading) {
    return (
      <MainLayout>
        <Spinner />
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div style={{ maxWidth: "1480px", margin: "0 auto" }}>
        <PageHeader title="Asset Management" subtitle="Inventory, assignment, and lifecycle tracking for company-owned assets" />
        <TabNav tabs={TABS} active={activeTab} onChange={setActiveTab} />

        {activeTab === "inventory" && (
          <InventoryTab inventory={inventory} licenseAlerts={licenseAlerts} onItemAdded={handleInventoryChange} />
        )}

        {activeTab === "requests" && (
          <RequestsTab requests={requests} inventory={inventory} onRequestUpdated={handleRequestChange} />
        )}

        {activeTab === "myAssets" && (
          <MyAssetsTab myAssets={myAssets} onAssetAdded={(r) => setRequests((prev) => [r, ...prev])} onAssetUpdated={handleInventoryChange} />
        )}
      </div>
    </MainLayout>
  );
}