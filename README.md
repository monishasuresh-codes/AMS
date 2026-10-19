# DB Productions - Announcement Management System (AMS)

Enterprise-grade, responsive internal Announcement Management System for **DB Productions**, built strictly to the **Master Blueprint Specification**.

---

## 🎨 Locked UI/UX Design System & Color Palette
The design strictly implements the locked color palette from the Master Blueprint specification:

### **Dark Theme (Default)**
- **Deep Background**: `#0D1016` (Outer background)
- **Primary Surface**: `#1D2029` (Main panels & cards)
- **Secondary Surface**: `#31343C` (Sidebar, topbar, elevated surfaces)
- **Muted Gold Accent**: `#9B8959` (Highlights, active states, charts)
- **Light Text**: `#E9E3DB` (Primary readable text)

### **Light Theme (Visual Reference)**
- **Warm Page Background**: `#F6EDE6` (Outer application background)
- **Warm Beige Surface**: `#DAC6AD` (Cards and soft containers)
- **Muted Brown Accent**: `#81573F` (Navigation, headings, active states)
- **Deep Brown**: `#5D402F` (Strong readable text)

*Theme toggle is available globally on topbar, login page, and user settings, and persists across sessions via `localStorage`.*

---

## 🚀 Key Architectural Features
1. **Source of Truth**: Backend server clock (`Asia/Kolkata` IST) governs all lifecycle operations (`scheduled_at`, `published_at`, `expires_at`, `read_at`).
2. **Automated Background Scheduler**: Built-in scheduler runs continuously without requiring an admin browser session to:
   - Automatically transition `SCHEDULED` announcements to `PUBLISHED` when the server clock reaches `scheduled_at`.
   - Automatically transition `PUBLISHED` announcements to `EXPIRED` when `expires_at` is reached.
   - Idempotently generate employee recipient rows and in-app notifications.
3. **Targeting Matrix**:
   - `ALL`: Resolves all active organization employees.
   - `DEPARTMENT`: Resolves active employees in selected departments.
   - `USER`: Resolves explicitly selected individual employees.
4. **Independent Read Tracking**:
   - Separate recipient records (`announcement_recipients`) with `read_status` and server-side `read_at` timestamps.
   - Opening an announcement automatically confirms read status and notifies the server.
5. **Role-Based Access Control**:
   - Route guards on frontend and permission middlewares on backend.
   - No public employee self-registration; all accounts are provisioned by an Admin.
6. **Immutable Audit Logs**:
   - Chronological logging of all admin actions (creation, editing, scheduling, publishing, cancelling, archiving, deletion) and automated scheduler events.

---

## 🔑 Pre-Seeded System Credentials

| Role | Name | Email | Password | Department |
| :--- | :--- | :--- | :--- | :--- |
| **System Admin** | System Admin | `admin@gmail.com` | `123456` | Administration |

> **Note**: All dummy employee accounts and announcements have been reset. Employees can be provisioned by logging into the Admin account (`admin@gmail.com` / `123456`) and navigating to **Employee Management > Provision Employee**.

### 🏢 Configured Departments
1. Administration
2. 3D Asset Creator
3. 3D Generalist
4. AI Developer
5. Computer Vision Developer
6. Developer
7. Embedded Developer
8. Fullstack Developer
9. Junior Compositor
10. Manager
11. Project Coordinator
12. Python Developer
13. UI/UX Designer
14. Unity Developer
15. Unreal Developer
16. XR Developer

---

## 🛠️ How to Run the Project

### 1. Backend Server
```bash
cd backend
npm install
node server.js
```
The server runs on `http://localhost:5000` and automatically starts the background scheduler.

To re-seed sample announcements and test accounts at any time:
```bash
node src/config/seed.js
```

To run the automated verification test suite:
```bash
node test-flows.js
```

### 2. Frontend Application
```bash
cd frontend
npm install
npm run dev
```
Open `http://localhost:5173` in your browser.
