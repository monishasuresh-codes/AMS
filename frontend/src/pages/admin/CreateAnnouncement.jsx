import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  ArrowLeft,
  Calendar,
  Clock,
  Users,
  Paperclip,
  CheckCircle,
  AlertCircle,
  FileText,
  Send,
  X,
} from "lucide-react";
import { api } from "../../services/api";

const CATEGORIES = [
  "Holiday",
  "Meeting",
  "Training",
  "Policy",
  "Emergency",
  "Maintenance",
  "Celebration",
  "Department Update",
  "General",
  "Instructions",
];

export default function CreateAnnouncement() {
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("General");
  const [categoriesList, setCategoriesList] = useState(CATEGORIES);
  const [showNewCatInput, setShowNewCatInput] = useState(false);
  const [newCatName, setNewCatName] = useState("");

  const [priority, setPriority] = useState("NORMAL");
  const [prioritiesList, setPrioritiesList] = useState(["NORMAL", "IMPORTANT", "URGENT"]);
  const [showNewPriorityInput, setShowNewPriorityInput] = useState(false);
  const [newPriorityName, setNewPriorityName] = useState("");

  const [description, setDescription] = useState("");
  const [targetType, setTargetType] = useState("ALL"); // ALL, DEPARTMENT, USER
  const [selectedDepartments, setSelectedDepartments] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [scheduledAt, setScheduledAt] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [files, setFiles] = useState([]);

  const [departments, setDepartments] = useState([]);
  const [showNewDeptInTarget, setShowNewDeptInTarget] = useState(false);
  const [newDeptTargetName, setNewDeptTargetName] = useState("");
  const [savingDeptTarget, setSavingDeptTarget] = useState(false);

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const navigate = useNavigate();

  const handleAddNewCategory = () => {
    if (!newCatName.trim()) return;
    const trimmed = newCatName.trim();
    if (!categoriesList.includes(trimmed)) {
      setCategoriesList((prev) => [...prev, trimmed]);
    }
    setCategory(trimmed);
    setNewCatName("");
    setShowNewCatInput(false);
  };

  const handleAddNewPriority = () => {
    if (!newPriorityName.trim()) return;
    const formatted = newPriorityName.trim().toUpperCase().replace(/\s+/g, "_");
    if (!prioritiesList.includes(formatted)) {
      setPrioritiesList((prev) => [...prev, formatted]);
    }
    setPriority(formatted);
    setNewPriorityName("");
    setShowNewPriorityInput(false);
  };

  const handleCreateDeptInTarget = async () => {
    if (!newDeptTargetName.trim()) return;
    try {
      setSavingDeptTarget(true);
      const res = await api.createDepartment({ name: newDeptTargetName.trim() });
      const created = res.department || { id: res.id, name: newDeptTargetName.trim() };
      setDepartments((prev) => [...prev, created]);
      setSelectedDepartments((prev) => [...prev, created.id]);
      setNewDeptTargetName("");
      setShowNewDeptInTarget(false);
    } catch (err) {
      alert(err.message || "Failed to create department");
    } finally {
      setSavingDeptTarget(false);
    }
  };

  useEffect(() => {
    async function loadMeta() {
      try {
        const [deptRes, userRes] = await Promise.all([
          api.getDepartments(),
          api.getUsers({ limit: 100, is_active: 1 }),
        ]);
        setDepartments(deptRes.data || []);
        // Exclude system admin from user targeting picker if desired, or keep all
        setUsers(userRes.data?.filter((u) => u.role === "EMPLOYEE") || []);
      } catch (err) {
        console.error("Failed to load metadata:", err);
      }
    }
    loadMeta();
  }, []);

  const handleDepartmentToggle = (id) => {
    setSelectedDepartments((prev) =>
      prev.includes(id) ? prev.filter((d) => d !== id) : [...prev, id]
    );
  };

  const handleUserToggle = (id) => {
    setSelectedUsers((prev) =>
      prev.includes(id) ? prev.filter((u) => u !== id) : [...prev, id]
    );
  };

  const handleFileChange = (e) => {
    if (e.target.files) {
      setFiles(Array.from(e.target.files));
    }
  };

  const handleRemoveFile = (index) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const submitAnnouncement = async (actionType) => {
    setError("");

    if (!title.trim()) {
      setError("Please provide an announcement title");
      return;
    }
    if (!description.trim()) {
      setError("Please provide announcement description content");
      return;
    }

    if (actionType === "SCHEDULE" && !scheduledAt) {
      setError("Please select a scheduled date and time to schedule this announcement");
      return;
    }

    if (scheduledAt && expiresAt && new Date(expiresAt) <= new Date(scheduledAt)) {
      setError("Expiry date must be after scheduled publish date");
      return;
    }

    if (targetType === "DEPARTMENT" && selectedDepartments.length === 0) {
      setError("Please select at least one department for targeting");
      return;
    }

    if (targetType === "USER" && selectedUsers.length === 0) {
      setError("Please select at least one specific employee for targeting");
      return;
    }

    try {
      setLoading(true);

      const formData = new FormData();
      formData.append("title", title);
      formData.append("category", category);
      formData.append("description", description);
      formData.append("priority", priority);
      formData.append("action", actionType); // DRAFT, SCHEDULE, PUBLISH
      if (scheduledAt) formData.append("scheduled_at", scheduledAt);
      if (expiresAt) formData.append("expires_at", expiresAt);
      formData.append("target_type", targetType);

      if (targetType === "DEPARTMENT") {
        selectedDepartments.forEach((dId) => formData.append("department_ids[]", dId));
      } else if (targetType === "USER") {
        selectedUsers.forEach((uId) => formData.append("user_ids[]", uId));
      }

      files.forEach((file) => {
        formData.append("attachments", file);
      });

      const res = await api.createAnnouncement(formData);
      navigate(`/admin/announcements/${res.announcementId}`);
    } catch (err) {
      setError(err.message || "Failed to create announcement");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {/* Top Header */}
      <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
        <Link to="/admin/announcements" className="btn-icon">
          <ArrowLeft size={18} />
        </Link>
        <div>
          <h1 style={{ fontSize: "1.6rem", fontWeight: 700 }}>
            Create Announcement
          </h1>
          <p style={{ fontSize: "0.85rem", color: "var(--color-text-secondary)" }}>
            Draft, target, schedule, or immediately publish an organization announcement
          </p>
        </div>
      </div>

      {error && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.75rem",
            padding: "0.85rem 1rem",
            borderRadius: 8,
            backgroundColor: "rgba(239, 68, 68, 0.15)",
            border: "1px solid rgba(239, 68, 68, 0.35)",
            color: "#EF4444",
            fontSize: "0.88rem",
          }}
        >
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Main Form Cards */}
      <div className="card" style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
        {/* Title */}
        <div>
          <label
            style={{
              display: "block",
              fontSize: "0.82rem",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.5px",
              color: "var(--color-text-secondary)",
              marginBottom: "0.4rem",
            }}
          >
            Announcement Title *
          </label>
          <input
            type="text"
            required
            placeholder="e.g. Q4 Townhall Meeting & Strategy Presentation"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="input-field"
            style={{ fontSize: "1rem", fontWeight: 500 }}
          />
        </div>

        {/* Category & Priority Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.25rem" }}>
          <div>
            <label
              style={{
                display: "block",
                fontSize: "0.82rem",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.5px",
                color: "var(--color-text-secondary)",
                marginBottom: "0.4rem",
              }}
            >
              Category *
            </label>
            <select
              value={showNewCatInput ? "__NEW__" : category}
              onChange={(e) => {
                if (e.target.value === "__NEW__") {
                  setShowNewCatInput(true);
                } else {
                  setShowNewCatInput(false);
                  setCategory(e.target.value);
                }
              }}
              className="input-field"
            >
              {categoriesList.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
              <option value="__NEW__">+ Add New Category...</option>
            </select>

            {showNewCatInput && (
              <div style={{ display: "flex", gap: "0.4rem", marginTop: "0.5rem" }}>
                <input
                  type="text"
                  placeholder="e.g. Townhall"
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  className="input-field"
                  style={{ fontSize: "0.82rem", padding: "0.4rem 0.6rem" }}
                  autoFocus
                />
                <button
                  type="button"
                  onClick={handleAddNewCategory}
                  className="btn btn-primary"
                  style={{ padding: "0.4rem 0.75rem", fontSize: "0.78rem", whiteSpace: "nowrap" }}
                >
                  Add Category
                </button>
              </div>
            )}
          </div>

          <div>
            <label
              style={{
                display: "block",
                fontSize: "0.82rem",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.5px",
                color: "var(--color-text-secondary)",
                marginBottom: "0.4rem",
              }}
            >
              Priority Level *
            </label>
            <select
              value={showNewPriorityInput ? "__NEW__" : priority}
              onChange={(e) => {
                if (e.target.value === "__NEW__") {
                  setShowNewPriorityInput(true);
                } else {
                  setShowNewPriorityInput(false);
                  setPriority(e.target.value);
                }
              }}
              className="input-field"
            >
              {prioritiesList.map((p) => (
                <option key={p} value={p}>
                  {p === "NORMAL"
                    ? "Normal"
                    : p === "IMPORTANT"
                    ? "Important"
                    : p === "URGENT"
                    ? "Urgent (Alert Flag)"
                    : p}
                </option>
              ))}
              <option value="__NEW__">+ Add Custom Priority...</option>
            </select>

            {showNewPriorityInput && (
              <div style={{ display: "flex", gap: "0.4rem", marginTop: "0.5rem" }}>
                <input
                  type="text"
                  placeholder="e.g. CRITICAL or LOW"
                  value={newPriorityName}
                  onChange={(e) => setNewPriorityName(e.target.value)}
                  className="input-field"
                  style={{ fontSize: "0.82rem", padding: "0.4rem 0.6rem" }}
                  autoFocus
                />
                <button
                  type="button"
                  onClick={handleAddNewPriority}
                  className="btn btn-primary"
                  style={{ padding: "0.4rem 0.75rem", fontSize: "0.78rem", whiteSpace: "nowrap" }}
                >
                  Add Priority
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Content / Description */}
        <div>
          <label
            style={{
              display: "block",
              fontSize: "0.82rem",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.5px",
              color: "var(--color-text-secondary)",
              marginBottom: "0.4rem",
            }}
          >
            Announcement Content & Instructions *
          </label>
          <textarea
            rows={7}
            required
            placeholder="Write the full announcement body. Be clear on key deadlines, instructions, and organizational impact..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="input-field"
            style={{ resize: "vertical", lineHeight: 1.6 }}
          />
        </div>

        {/* Targeting Selector */}
        <div style={{ paddingTop: "0.5rem", borderTop: "1px solid var(--color-border)" }}>
          <label
            style={{
              display: "block",
              fontSize: "0.82rem",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.5px",
              color: "var(--color-text-secondary)",
              marginBottom: "0.5rem",
            }}
          >
            Target Audience (Delivery Resolution)
          </label>

          <div style={{ display: "flex", gap: "1rem", marginBottom: "1rem" }}>
            <label style={{ display: "flex", alignItems: "center", gap: "0.4rem", cursor: "pointer" }}>
              <input
                type="radio"
                name="target_type"
                value="ALL"
                checked={targetType === "ALL"}
                onChange={() => setTargetType("ALL")}
              />
              <span style={{ fontSize: "0.9rem", fontWeight: 600 }}>All Employees</span>
            </label>

            <label style={{ display: "flex", alignItems: "center", gap: "0.4rem", cursor: "pointer" }}>
              <input
                type="radio"
                name="target_type"
                value="DEPARTMENT"
                checked={targetType === "DEPARTMENT"}
                onChange={() => setTargetType("DEPARTMENT")}
              />
              <span style={{ fontSize: "0.9rem", fontWeight: 600 }}>Specific Departments</span>
            </label>

            <label style={{ display: "flex", alignItems: "center", gap: "0.4rem", cursor: "pointer" }}>
              <input
                type="radio"
                name="target_type"
                value="USER"
                checked={targetType === "USER"}
                onChange={() => setTargetType("USER")}
              />
              <span style={{ fontSize: "0.9rem", fontWeight: 600 }}>Selected Individuals</span>
            </label>
          </div>

          {/* Department Selection */}
          {targetType === "DEPARTMENT" && (
            <div
              style={{
                padding: "1rem",
                borderRadius: 8,
                backgroundColor: "var(--color-secondary-surface)",
                display: "flex",
                flexDirection: "column",
                gap: "0.85rem",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "0.8rem", color: "var(--color-text-secondary)", fontWeight: 600 }}>
                  Select targeted business units:
                </span>
                <button
                  type="button"
                  onClick={() => setShowNewDeptInTarget(!showNewDeptInTarget)}
                  className="btn btn-secondary"
                  style={{ padding: "0.3rem 0.65rem", fontSize: "0.78rem" }}
                >
                  {showNewDeptInTarget ? "Cancel" : "+ Add New Department"}
                </button>
              </div>

              {showNewDeptInTarget && (
                <div style={{ display: "flex", gap: "0.5rem", padding: "0.5rem", backgroundColor: "var(--color-primary-surface)", borderRadius: 6 }}>
                  <input
                    type="text"
                    placeholder="New department name..."
                    value={newDeptTargetName}
                    onChange={(e) => setNewDeptTargetName(e.target.value)}
                    className="input-field"
                    style={{ fontSize: "0.82rem", padding: "0.4rem 0.6rem" }}
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={handleCreateDeptInTarget}
                    disabled={savingDeptTarget}
                    className="btn btn-primary"
                    style={{ padding: "0.4rem 0.75rem", fontSize: "0.78rem", whiteSpace: "nowrap" }}
                  >
                    {savingDeptTarget ? "Creating..." : "Create & Select"}
                  </button>
                </div>
              )}

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
                  gap: "0.75rem",
                }}
              >
                {departments.map((dept) => (
                  <label
                    key={dept.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                      cursor: "pointer",
                      fontSize: "0.85rem",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={selectedDepartments.includes(dept.id)}
                      onChange={() => handleDepartmentToggle(dept.id)}
                    />
                    <span>
                      {dept.name} ({dept.employee_count || 0})
                    </span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* User Selection */}
          {targetType === "USER" && (
            <div
              style={{
                padding: "1rem",
                borderRadius: 8,
                backgroundColor: "var(--color-secondary-surface)",
                maxHeight: 200,
                overflowY: "auto",
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
                gap: "0.6rem",
              }}
            >
              {users.map((u) => (
                <label
                  key={u.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    cursor: "pointer",
                    fontSize: "0.82rem",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={selectedUsers.includes(u.id)}
                    onChange={() => handleUserToggle(u.id)}
                  />
                  <span>
                    {u.first_name} {u.last_name} ({u.employee_code})
                  </span>
                </label>
              ))}
            </div>
          )}
        </div>

        {/* Scheduling & Expiry */}
        <div
          style={{
            paddingTop: "0.5rem",
            borderTop: "1px solid var(--color-border)",
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "1.25rem",
          }}
        >
          <div>
            <label
              style={{
                display: "block",
                fontSize: "0.82rem",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.5px",
                color: "var(--color-text-secondary)",
                marginBottom: "0.4rem",
              }}
            >
              Scheduled Publish Time (Optional)
            </label>
            <input
              type="datetime-local"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
              className="input-field"
            />
            <p style={{ fontSize: "0.72rem", color: "var(--color-text-muted)", marginTop: 4 }}>
              Leave blank to publish immediately or save as draft.
            </p>
          </div>

          <div>
            <label
              style={{
                display: "block",
                fontSize: "0.82rem",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.5px",
                color: "var(--color-text-secondary)",
                marginBottom: "0.4rem",
              }}
            >
              Expiry Date / Time (Optional)
            </label>
            <input
              type="datetime-local"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
              className="input-field"
            />
            <p style={{ fontSize: "0.72rem", color: "var(--color-text-muted)", marginTop: 4 }}>
              After this time, announcement is automatically expired from active employee feeds.
            </p>
          </div>
        </div>

        {/* Attachments */}
        <div style={{ paddingTop: "0.5rem", borderTop: "1px solid var(--color-border)" }}>
          <label
            style={{
              display: "block",
              fontSize: "0.82rem",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.5px",
              color: "var(--color-text-secondary)",
              marginBottom: "0.4rem",
            }}
          >
            File Attachments (PDF, Images, Office Docs up to 15MB)
          </label>
          <input
            type="file"
            multiple
            onChange={handleFileChange}
            className="input-field"
            style={{ padding: "0.5rem" }}
          />

          {files.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginTop: "0.75rem" }}>
              {files.map((file, idx) => (
                <div
                  key={idx}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    padding: "0.4rem 0.75rem",
                    borderRadius: 6,
                    backgroundColor: "var(--color-secondary-surface)",
                    fontSize: "0.8rem",
                    border: "1px solid var(--color-border)",
                  }}
                >
                  <Paperclip size={14} color="var(--color-accent)" />
                  <span>
                    {file.name} ({(file.size / 1024).toFixed(0)} KB)
                  </span>
                  <button
                    type="button"
                    onClick={() => handleRemoveFile(idx)}
                    style={{ color: "var(--color-text-muted)" }}
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-end",
            gap: "0.85rem",
            paddingTop: "1rem",
            borderTop: "1px solid var(--color-border)",
            flexWrap: "wrap",
          }}
        >
          <Link to="/admin/announcements" className="btn btn-secondary">
            Cancel
          </Link>

          <button
            type="button"
            disabled={loading}
            onClick={() => submitAnnouncement("DRAFT")}
            className="btn btn-secondary"
          >
            <FileText size={16} />
            <span>Save as Draft</span>
          </button>

          {scheduledAt && (
            <button
              type="button"
              disabled={loading}
              onClick={() => submitAnnouncement("SCHEDULE")}
              className="btn btn-secondary"
              style={{ borderColor: "var(--color-status-scheduled)", color: "var(--color-status-scheduled)" }}
            >
              <Clock size={16} />
              <span>Schedule Release</span>
            </button>
          )}

          <button
            type="button"
            disabled={loading}
            onClick={() => submitAnnouncement("PUBLISH")}
            className="btn btn-primary"
          >
            <Send size={16} />
            <span>Publish Immediately</span>
          </button>
        </div>
      </div>
    </div>
  );
}
