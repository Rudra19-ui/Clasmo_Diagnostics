# CLASMO Diagnostics — Website & Platform Overview

**Document type:** Client-facing product overview  
**Organization:** Clasmo Diagnostics Pvt. Ltd.  
**Tagline:** *Where Accuracy Saves Lives*

---

## 1. What Is This Website?

**CLASMO Diagnostics** is a digital platform for a multi-branch diagnostic laboratory network. It serves two main audiences:

1. **The public** — patients, partners, and job seekers who visit the marketing website.
2. **Lab staff** — reception, technicians, pathologists, HR, and administrators who run day-to-day lab operations through a secure login area.

At its core, the platform is a **Laboratory Information Management System (LIMS)**. It helps CLASMO manage the full lifecycle of diagnostic testing: from patient registration and billing, through sample collection and result entry, to report authorization, printing, and release to patients.

The system is designed for a growing lab business with multiple branches and collection centers, supporting both walk-in (OPD) and referred patients, home sample collection, and partner/franchise expansion.

---

## 2. Who Uses the Platform?

| User type | Primary purpose |
|-----------|-----------------|
| **Patient / Public visitor** | View lab information, check test reports online, apply for franchise or jobs |
| **Receptionist / Front desk** | Register patients, search records, handle billing and sample workflows |
| **Technician** | Enter test results after sample processing |
| **Pathologist** | Review, verify, and authorize diagnostic reports |
| **HR** | Manage staff-related administration and website enquiries |
| **Admin** | Full control over users, lab settings, test catalog, accounting, and all modules |
| **General User** | Front-desk and registration workflows with broad operational access |

Each role sees only the modules relevant to their job. Access is controlled by role-based permissions.

---

## 3. Public Website (No Login Required)

### 3.1 Home Page

The landing page introduces **CLASMO Diagnostics** as an ISO-certified diagnostic laboratory brand.

**Key sections:**

- **Brand identity** — Logo, name, and tagline: *Where Accuracy Saves Lives*
- **Test Quorum** — Quick link for patients to view their reports online
- **Come and Join With Clasmo** — Partnership and career enquiry forms
- **Our Branches** — Mumbai, Pune, Nashik, Dhule, Ratnagiri
- **Our Expertise** — Clinical departments offered:
  - Clinical Pathology
  - Haematology
  - Clinical Biochemistry
  - Histopathology
  - Microbiology
  - Serology
  - Biochemical Genetics
  - Cytogenetics
  - Molecular Diagnostics
- **Log In** — Secure entry for lab staff
- **Contact / Footer** — Address, contacts, and bank details (placeholders on public page)

### 3.2 Test Quorum — Patient Report Portal

Patients can **view their diagnostic reports online** without staff login.

**How it works:**

1. Patient opens **Test Quorum** from the home page.
2. Enters their **Lab Code** (assigned at registration) and **registered mobile number**.
3. System retrieves and displays the report if details match.
4. Patient can view and print the report.

This gives patients self-service access to results while keeping data protected through lab code + mobile verification.

### 3.3 Come and Join With Clasmo

Public enquiry form for business and career opportunities. Two paths:

**A. Franchise / Partnership application**

- Register as a **CLASMO Brand Partner** or **Self-Operated Lab**
- Submit: contact person, full address, pincode, proof of address
- Upload: letterhead photo, lab interior photo
- Enquiries are received by the lab administration team for review

**B. Job application**

- Apply for a position at an existing CLASMO branch (Mumbai, Pune, Nashik, Dhule, Ratnagiri)
- Submit: name, experience (fresher/experienced), current employer, phone, total experience, last salary
- Upload: resume
- HR/admin can review submissions in the Administration area

### 3.4 Staff Login

Lab employees log in with username and password. After login:

- **Admin** users land on the **Dashboard**
- **Other roles** land on **Search** (main operational workspace)

Features include optional “save info,” password visibility toggle, and forgot-password flow (mobile-based reset).

---

## 4. Internal Lab Platform (After Login)

Once authenticated, staff work inside a unified lab workspace with a sidebar navigation. The main lab is identified as **CLASMO DIAGNOSTICS PVT. LTD.** (with ability to switch lab context where configured).

### 4.1 Main Navigation Modules

| Module | Purpose |
|--------|---------|
| **Dashboard** | Welcome hub and quick access for admins |
| **Search** | Central workspace to find and manage patient registrations |
| **Test Registration** | Register new patients and order tests |
| **Test Result** | Track and manage results across workflow stages |
| **Administration** | Master data, users, lab config, accounting, test catalog |
| **Reports** | Business and operational reports |
| **Device Request** | Home collection, appointments, messaging, scheduling |
| **Elab-PAY** | Online payments for patient bills and settlements |
| **Help** | Support contacts and quick guides |
| **New User Sign Up** | Admin-only staff account creation |

---

## 5. Core Lab Workflow (End-to-End Flow)

This is the heart of the platform — how a patient test moves from booking to final report.

```
┌─────────────┐    ┌──────────────┐    ┌────────────┐    ┌─────────────┐    ┌──────────────┐
│ Registration│ -> │  Collection  │ -> │  Accession │ -> │   Result    │ -> │ Print &      │
│  & Billing  │    │  (Sample)    │    │            │    │  Entry &    │    │ Release to   │
│             │    │              │    │            │    │  Auth       │    │ Patient      │
└─────────────┘    └──────────────┘    └────────────┘    └─────────────┘    └──────────────┘
```

### Stage 1 — Registration & Billing

**Module:** Test Registration

1. Staff captures patient details:
   - Patient type (OPD, IPD, Corporate)
   - Name, gender, age/DOB, address, contact, email
   - Referring doctor and collection center
2. Staff selects tests from the lab catalog (searchable list).
3. Billing is calculated:
   - Test charges, visiting charges, discounts, payment method (cash/card/cheque)
   - Amount paid and balance due
4. System assigns a unique **Lab Code** for the visit.
5. Registration is saved; bill receipt and barcode labels can be generated.

**Outputs:** Lab code, bill/receipt, barcode labels for samples, optional SMS notification.

### Stage 2 — Search & Operations Hub

**Module:** Search

Search is the **command center** for daily lab work. Staff can:

- Filter registrations by date, lab code, patient name, test, collection center, status, and more
- View records grouped by workflow stage:
  - All
  - Registrations & Collection
  - Results & Authorization
  - Print & Release
  - Pending TAT (turnaround time)
- Perform actions on selected records:
  - Print worksheet, job sheet, barcodes, dispatch sheet
  - View payment history and workflow history
  - Send SMS (single or bulk release)
  - Track pending tests and TAT
  - Pay online, download reports

Each record shows: lab code, patient name, tests, registration date, age, gender, doctor, collection center, total amount, balance, and current status.

### Stage 3 — Sample Collection & Accession

After registration, samples move through:

- **Collection** — Sample collected (at center or via home pickup)
- **Accession** — Sample received and logged in the lab

Status updates are tracked in Search and Test Result modules.

### Stage 4 — Result Entry (Clinical)

**Modules:** Result Entry, Test Parameter Master (Admin)

1. **Admin** maintains the **Test Parameter Master** — defines parameters, reference ranges, and units for each test.
2. **Technician** opens Result Entry, finds the registration by lab code, and enters measured values for each test parameter.
3. System flags abnormal values (Critical, High, Low, Normal) based on reference ranges.
4. Results are saved with status: Pending → Entered → Verified.

### Stage 5 — Report Authorization

**Modules:** Test Result, Report Preview

1. **Pathologist** (or authorized staff) reviews entered results.
2. Reports can be partially or fully authorized.
3. **Report Preview** allows viewing the formatted diagnostic report before release.
4. Status progresses through: Result Ready → Tech Complete Auth → Partially Authorized.

### Stage 6 — Print & Release

1. Authorized reports move to **Print & Release** stage.
2. Staff print reports, send SMS notifications to patients, and mark as **Printed/Released**.
3. Patients can also access reports via **Test Quorum** on the public website.

---

## 6. Supporting Modules

### 6.1 Barcode Printing

After registration, staff print sample barcode labels for test tubes/containers. Supports multiple printer formats (TVSEBC, TSC, ZEBRA) and configurable copy counts per test group.

### 6.2 Bill Receipt

Generates printable bill/receipt for patient payment records linked to a registration.

### 6.3 Reports (Management)

Operational and financial reports for lab management:

| Report | Description |
|--------|-------------|
| **Daily Summary** | Registrations and revenue for the day |
| **Collection Report** | Home collection and phlebotomy activity |
| **Outstanding Report** | Pending payments |
| **TAT Report** | Turnaround time analysis |

Reports can be filtered by date range and previewed/exported.

### 6.4 Elab-PAY

Online payment gateway module for:

- Pending patient payments
- Settlement history
- Refund processing

### 6.5 Device Request (Home Collection & Field Operations)

| Feature | Description |
|---------|-------------|
| **Pickup Request** | Schedule home sample collection (patient name, mobile, address, date) |
| **Patient Appointment** | Schedule home visits and appointments |
| **Message To Lab** | Send messages from field staff to the lab |
| **Schedular** | Collection and trip schedule calendar |
| **Trip Management** | Active trips list and management |
| **Batch Upload** | Bulk registration import from files |
| **Test Result Batch** | Bulk import of analyzer results |

### 6.6 Help & Support

- **Phone:** +91-8975273383 / +91-9146188320
- **Email:** support@clasmodiagnostics.com
- Quick guides for registration, search, and result entry

---

## 7. Administration (Back-Office Management)

The Administration area is organized into four categories:

### 7.1 User Management

- User Lock Management — Lock/unlock accounts
- User Management — Create and manage lab users
- Role Management — Define roles and permissions
- Change Password — Password reset and policies
- Membership — Membership plans and access
- CRM — Customer relationship management
- QC Report — Quality control reports
- Collection Center Boy — Manage collection/phlebotomy staff
- ICMR Batches — ICMR batch tracking
- Discount Reason & Discount Authority — Discount codes and approval limits
- WhatsApp Logger — WhatsApp message logs
- Expense Type — Expense categories

### 7.2 Lab Management

- Collection Center Management
- Doctor Management (referring doctors)
- Patient Management (patient master records)
- Lab Configuration (lab profile and settings)
- Services In Area (service zones)
- Download Offline Data
- CheckList (operational checklists)
- Create Activity / Activities (scheduled lab activities)
- **Enquiries** — Website “Join With Clasmo” submissions
- Machine Mapping (analyzer to test mapping)
- Area Master, Sales Reference Master

### 7.3 Accounting

- Lab Accounting — Revenue and expense summaries
- Billing — Invoices and billing
- Rate Master — Test pricing and MRP

### 7.4 Test Management

- Test Details, Categories, Groups, Profiles
- Test Units, Notes, Popular Tests, Complete Test List
- Upload Special Offers
- Machine Interface (analyzer settings)
- OutSource Lab & External Test Mapping

### 7.5 New User Sign Up (Admin Only)

Admins can create staff accounts with roles: Admin, HR, Pathologist, Technician, User, or Receptionist.

---

## 8. User Journey Summary

### Patient Journey (Public)

```
Visit website → Learn about CLASMO → (Optional) Apply for franchise/job
                ↓
         Visit lab / Home pickup → Get Lab Code at registration
                ↓
         Wait for processing → View report on Test Quorum (Lab Code + Mobile)
```

### Lab Staff Journey (Internal)

```
Login → Search (find patients) OR Register new patient
                ↓
         Sample collection → Result entry (Technician) → Authorization (Pathologist)
                ↓
         Print & release report → SMS to patient → Patient can view on Test Quorum
```

### Admin Journey

```
Login → Dashboard → Administration (configure lab, users, tests, rates)
                ↓
         Reports (monitor revenue, TAT, outstanding) → Manage enquiries & activities
```

---

## 9. Key Business Benefits

1. **Single platform** — Public presence and full lab operations in one system
2. **Traceability** — Every test tracked from registration to release with workflow history
3. **Multi-branch ready** — Supports Mumbai, Pune, Nashik, Dhule, Ratnagiri and collection centers
4. **Role-based access** — Right tools for reception, lab, pathology, HR, and admin
5. **Patient self-service** — Test Quorum reduces front-desk load for report collection
6. **Growth tools** — Franchise enquiries, job applications, and partner onboarding flows
7. **Operational visibility** — Reports on revenue, collections, outstanding payments, and TAT
8. **Home collection** — Pickup requests and field operations integrated with core LIMS

---

## 10. Platform Scope Summary

| Area | What it covers |
|------|----------------|
| **Public website** | Branding, departments, branches, Test Quorum, franchise/job forms, login |
| **Patient management** | Registration, demographics, doctors, collection centers |
| **Test ordering & billing** | Test catalog, pricing, discounts, payments, receipts |
| **Sample workflow** | Collection, accession, barcodes, TAT tracking |
| **Clinical results** | Parameter master, result entry, flags, authorization, report preview |
| **Report delivery** | Print, SMS, bulk release, patient online access |
| **Field operations** | Home pickup, appointments, messaging, trips, batch uploads |
| **Administration** | Users, roles, lab config, accounting, test master, enquiries |
| **Payments** | Elab-PAY for online bill settlement |
| **Support** | Help page with contact and guides |

---

*This document describes the CLASMO Diagnostics platform from a business and workflow perspective. It is intended for client presentation and stakeholder understanding.*

**© 2026 Clasmo Diagnostics · Empowering labs with smarter, faster operations.**
