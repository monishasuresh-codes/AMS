import React, { useEffect, useState } from "react";
import {
  UserPlus,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  MoreVertical,
  Mail,
  Building,
  Shield,
  X,
  AlertCircle,
} from "lucide-react";
import { api } from "../../services/api";
import { LoadingSpinner, EmptyState } from "../../components/common/LoadingSpinner";

export default function EmployeesList() {
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Dynamic role & department creation state
  const [availableRoles, setAvailableRoles] = useState(["EMPLOYEE", "ADMIN"]);
  const [showNewRoleInput, setShowNewRoleInput] = useState(false);
  const [customRoleName, setCustomRoleName] = useState("");

  const [showNewDeptInput, setShowNewDeptInput] = useState(false);
  const [newDeptName, setNewDeptName] = useState("");
  const [creatingDept, setCreatingDept] = useState(false);

  // New Employee Form
  const [form, setForm] = useState({
    employee_code: "",
    first_name: "",
    last_name: "",
    email: "",
    password: "",
    department_id: "",
    role: "EMPLOYEE",
  });

  const handleAddNewRole = () => {
    if (!customRoleName.trim()) return;
    const formatted = customRoleName.trim().toUpperCase().replace(/\s+/g, "_");
    if (!availableRoles.includes(formatted)) {
      setAvailableRoles((prev) => [...prev, formatted]);
    }
    setForm((prev) => ({ ...prev, role: formatted }));
    setCustomRoleName("");
    setShowNewRoleInput(false);
  };

  const handleAddNewDepartment = async () => {
    if (!newDeptName.trim()) return;
    try {
      setCreatingDept(true);
      const res = await api.createDepartment({ name: newDeptName.trim() });
      const created = res.department || { id: res.id, name: newDeptName.trim() };
      setDepartments((prev) => [...prev, created]);
      setForm((prev) => ({ ...prev, department_id: created.id }));
      setNewDeptName("");
      setShowNewDeptInput(false);
    } catch (err) {
      alert(err.message || "Failed to create department");
    } finally {
      setCreatingDept(false);
    }
  };

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      const params = { limit: 100 };
      if (search.trim()) params.search = search.trim();
      if (departmentFilter) params.department_id = departmentFilter;
      if (statusFilter !== "") params.is_active = statusFilter;

      const [res, deptRes] = await Promise.all([
        api.getUsers(params),
        api.getDepartments(),
      ]);

      setEmployees(res.data || []);
      setDepartments(deptRes.data || []);
      if (deptRes.data?.length > 0 && !form.department_id) {
        setForm((prev) => ({ ...prev, department_id: deptRes.data[0].id }));
      }
    } catch (err) {
      console.error("Failed to load employees:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, [departmentFilter, statusFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchEmployees();
  };

  const handleToggleStatus = async (user) => {
    const action = user.is_active ? "deactivate" : "activate";
    if (!window.confirm(`Are you sure you want to ${action} ${user.first_name} ${user.last_name}?`)) return;

    try {
      await api.toggleUserStatus(user.id, !user.is_active);
      setEmployees((prev) =>
        prev.map((e) =>
          e.id === user.id ? { ...e, is_active: user.is_active ? 0 : 1 } : e
        )
      );
    } catch (err) {
      alert(err.message || "Status change failed");
    }
  };

  const handleDeleteUser = async (user) => {
    if (
      !window.confirm(
        `Are you sure you want to permanently delete ${user.first_name} ${user.last_name || ""} (${user.email})? This action cannot be undone.`
      )
    )
      return;

    try {
      await api.deleteUser(user.id);
      setEmployees((prev) => prev.filter((e) => e.id !== user.id));
    } catch (err) {
      alert(err.message || "Failed to delete user account");
    }
  };

  const handleCreateEmployee = async (e) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      await api.createUser(form);
      setModalOpen(false);
      setForm({
        employee_code: "",
        first_name: "",
        last_name: "",
        email: "",
        password: "",
        department_id: departments[0]?.id || "",
        role: "EMPLOYEE",
      });
      fetchEmployees();
    } catch (err) {
      setError(err.message || "Failed to provision employee");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "1rem",
        }}
      >
        <div>
          <h1 style={{ fontSize: "1.65rem", fontWeight: 700 }}>
            Employee Directory & Provisioning
          </h1>
          <p style={{ fontSize: "0.88rem", color: "var(--color-text-secondary)" }}>
            Authorized administrator provisioning and role-based access management
          </p>
        </div>

        <button onClick={() => setModalOpen(true)} className="btn btn-primary">
          <UserPlus size={16} />
          <span>Provision Employee</span>
        </button>
      </div>

      {/* Filters */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "0.75rem",
        }}
      >
        <form onSubmit={handleSearchSubmit} style={{ display: "flex", gap: "0.5rem", flex: "1 1 280px" }}>
          <div style={{ position: "relative", width: "100%" }}>
            <input
              type="text"
              placeholder="Search by code, name, or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input-field"
              style={{ paddingLeft: "2.3rem" }}
            />
            <Search
              size={16}
              style={{
                position: "absolute",
                left: "0.8rem",
                top: "50%",
                transform: "translateY(-50%)",
                color: "var(--color-text-muted)",
              }}
            />
          </div>
          <button type="submit" className="btn btn-secondary">
            Search
          </button>
        </form>

        <div style={{ display: "flex", gap: "0.6rem" }}>
          <select
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
            className="input-field"
            style={{ width: "auto" }}
          >
            <option value="">All Departments</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="input-field"
            style={{ width: "auto" }}
          >
            <option value="">All Statuses</option>
            <option value="1">Active</option>
            <option value="0">Deactivated</option>
          </select>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <LoadingSpinner text="Fetching employee records..." />
      ) : employees.length === 0 ? (
        <EmptyState
          icon={Filter}
          title="No employees found"
          description="Try clearing your filters or provision a new employee account."
          action={
            <button onClick={() => setModalOpen(true)} className="btn btn-primary">
              <UserPlus size={16} />
              <span>Provision Employee</span>
            </button>
          }
        />
      ) : (
        <div className="data-table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Employee Code</th>
                <th>Name & Email</th>
                <th>Department</th>
                <th>Role</th>
                <th>Announcements Read</th>
                <th>Account Status</th>
                <th style={{ textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {employees.map((emp) => (
                <tr key={emp.id}>
                  <td>
                    <span
                      style={{
                        fontFamily: "monospace",
                        fontWeight: 700,
                        color: "var(--color-accent)",
                      }}
                    >
                      {emp.employee_code}
                    </span>
                  </td>
                  <td>
                    <div style={{ fontWeight: 600 }}>
                      {emp.first_name} {emp.last_name}
                    </div>
                    <div style={{ fontSize: "0.78rem", color: "var(--color-text-secondary)" }}>
                      {emp.email}
                    </div>
                  </td>
                  <td>{emp.department_name || "Unassigned"}</td>
                  <td>
                    <span
                      className="badge"
                      style={{
                        backgroundColor:
                          emp.role === "ADMIN"
                            ? "rgba(155, 137, 89, 0.2)"
                            : "var(--color-secondary-surface)",
                        color:
                          emp.role === "ADMIN"
                            ? "var(--color-accent)"
                            : "var(--color-text-secondary)",
                      }}
                    >
                      {emp.role}
                    </span>
                  </td>
                  <td>
                    <div style={{ fontSize: "0.82rem" }}>
                      <span style={{ fontWeight: 600 }}>
                        {emp.total_announcements_read || 0}
                      </span>{" "}
                      / {emp.total_announcements_received || 0} read
                    </div>
                  </td>
                  <td>
                    <span
                      className="badge"
                      style={{
                        backgroundColor: emp.is_active
                          ? "rgba(16, 185, 129, 0.15)"
                          : "rgba(239, 68, 68, 0.15)",
                        color: emp.is_active
                          ? "var(--color-status-published)"
                          : "var(--color-status-cancelled)",
                      }}
                    >
                      {emp.is_active ? "Active" : "Deactivated"}
                    </span>
                  </td>
                  <td style={{ textAlign: "right" }}>
                    {emp.id !== 1 && ( // Prevent modifying primary system admin
                      <div
                        style={{
                          display: "inline-flex",
                          gap: "0.4rem",
                          alignItems: "center",
                          justifyContent: "flex-end",
                        }}
                      >
                        <button
                          onClick={() => handleToggleStatus(emp)}
                          className="btn btn-secondary"
                          style={{ padding: "0.35rem 0.65rem", fontSize: "0.75rem" }}
                        >
                          {emp.is_active ? "Deactivate" : "Activate"}
                        </button>
                        <button
                          onClick={() => handleDeleteUser(emp)}
                          className="btn btn-secondary"
                          style={{
                            padding: "0.35rem 0.65rem",
                            fontSize: "0.75rem",
                            color: "#EF4444",
                            borderColor: "rgba(239, 68, 68, 0.35)",
                          }}
                          title="Permanently Delete User"
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Provision Employee Modal - Viewport Center */}
      {modalOpen && (
        <div className="modal-overlay" onClick={() => setModalOpen(false)}>
          <div
            className="modal-dialog"
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: "1.25rem",
              }}
            >
              <h2 style={{ fontSize: "1.25rem", fontWeight: 700 }}>
                Provision New Employee
              </h2>
              <button onClick={() => setModalOpen(false)} className="btn-icon">
                <X size={16} />
              </button>
            </div>

            {error && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.6rem",
                  padding: "0.75rem",
                  borderRadius: 8,
                  backgroundColor: "rgba(239, 68, 68, 0.15)",
                  color: "#EF4444",
                  fontSize: "0.85rem",
                  marginBottom: "1rem",
                }}
              >
                <AlertCircle size={16} />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleCreateEmployee} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "0.78rem",
                      fontWeight: 700,
                      textTransform: "uppercase",
                      color: "var(--color-text-secondary)",
                      marginBottom: 4,
                    }}
                  >
                    Employee Code *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="EMP007"
                    value={form.employee_code}
                    onChange={(e) => setForm({ ...form, employee_code: e.target.value })}
                    className="input-field"
                  />
                </div>

                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "0.78rem",
                      fontWeight: 700,
                      textTransform: "uppercase",
                      color: "var(--color-text-secondary)",
                      marginBottom: 4,
                    }}
                  >
                    Role *
                  </label>
                  <select
                    value={showNewRoleInput ? "__NEW__" : form.role}
                    onChange={(e) => {
                      if (e.target.value === "__NEW__") {
                        setShowNewRoleInput(true);
                      } else {
                        setShowNewRoleInput(false);
                        setForm({ ...form, role: e.target.value });
                      }
                    }}
                    className="input-field"
                  >
                    {availableRoles.map((r) => (
                      <option key={r} value={r}>
                        {r === "EMPLOYEE" ? "Employee" : r === "ADMIN" ? "Administrator" : r}
                      </option>
                    ))}
                    <option value="__NEW__">+ Add New Role...</option>
                  </select>

                  {showNewRoleInput && (
                    <div style={{ display: "flex", gap: "0.4rem", marginTop: "0.5rem" }}>
                      <input
                        type="text"
                        placeholder="e.g. MANAGER"
                        value={customRoleName}
                        onChange={(e) => setCustomRoleName(e.target.value)}
                        className="input-field"
                        style={{ fontSize: "0.82rem", padding: "0.4rem 0.6rem" }}
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={handleAddNewRole}
                        className="btn btn-primary"
                        style={{ padding: "0.4rem 0.75rem", fontSize: "0.78rem", whiteSpace: "nowrap" }}
                      >
                        Set Role
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "0.78rem",
                      fontWeight: 700,
                      textTransform: "uppercase",
                      color: "var(--color-text-secondary)",
                      marginBottom: 4,
                    }}
                  >
                    First Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Siddharth"
                    value={form.first_name}
                    onChange={(e) => setForm({ ...form, first_name: e.target.value })}
                    className="input-field"
                  />
                </div>

                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "0.78rem",
                      fontWeight: 700,
                      textTransform: "uppercase",
                      color: "var(--color-text-secondary)",
                      marginBottom: 4,
                    }}
                  >
                    Last Name
                  </label>
                  <input
                    type="text"
                    placeholder="Mehta"
                    value={form.last_name}
                    onChange={(e) => setForm({ ...form, last_name: e.target.value })}
                    className="input-field"
                  />
                </div>
              </div>

              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "0.78rem",
                    fontWeight: 700,
                    textTransform: "uppercase",
                    color: "var(--color-text-secondary)",
                    marginBottom: 4,
                  }}
                >
                  Email Address *
                </label>
                <input
                  type="email"
                  required
                  placeholder="siddharth.m@ams.com"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="input-field"
                />
              </div>

              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "0.78rem",
                    fontWeight: 700,
                    textTransform: "uppercase",
                    color: "var(--color-text-secondary)",
                    marginBottom: 4,
                  }}
                >
                  Department *
                </label>
                <select
                  required
                  value={showNewDeptInput ? "__NEW__" : form.department_id}
                  onChange={(e) => {
                    if (e.target.value === "__NEW__") {
                      setShowNewDeptInput(true);
                    } else {
                      setShowNewDeptInput(false);
                      setForm({ ...form, department_id: e.target.value });
                    }
                  }}
                  className="input-field"
                >
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                  <option value="__NEW__">+ Add New Department...</option>
                </select>

                {showNewDeptInput && (
                  <div style={{ display: "flex", gap: "0.4rem", marginTop: "0.5rem" }}>
                    <input
                      type="text"
                      placeholder="e.g. Quality Assurance"
                      value={newDeptName}
                      onChange={(e) => setNewDeptName(e.target.value)}
                      className="input-field"
                      style={{ fontSize: "0.82rem", padding: "0.4rem 0.6rem" }}
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={handleAddNewDepartment}
                      disabled={creatingDept}
                      className="btn btn-primary"
                      style={{ padding: "0.4rem 0.75rem", fontSize: "0.78rem", whiteSpace: "nowrap" }}
                    >
                      {creatingDept ? "Saving..." : "Add Dept"}
                    </button>
                  </div>
                )}
              </div>

              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "0.78rem",
                    fontWeight: 700,
                    textTransform: "uppercase",
                    color: "var(--color-text-secondary)",
                    marginBottom: 4,
                  }}
                >
                  Temporary Password *
                </label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className="input-field"
                />
              </div>

              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: "0.75rem",
                  marginTop: "1rem",
                }}
              >
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn btn-primary"
                >
                  {submitting ? "Provisioning..." : "Create Account"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
