# Clasmo Diagnostics — LIMS

Laboratory Information Management System for **Clasmo Diagnostics Pvt. Ltd.**

The app is now split into:
- **React frontend** (`frontend/`) — Vite + React Router
- **Django backend** (`backend/`) — Django REST Framework API

The original static HTML prototype is kept in the repo root for reference (`index.html`, `css/`, `js/`, `device/`).

## Quick start

### 1. Backend (Django)

```bash
cd backend
python -m venv venv
venv\Scripts\activate          # Windows
# source venv/bin/activate     # macOS/Linux
pip install -r requirements.txt
python manage.py migrate
python manage.py seed_data
python manage.py runserver
```

API runs at **http://127.0.0.1:8000/api/**

### 2. Frontend (React)

```bash
cd frontend
npm install
npm run dev
```

App runs at **http://localhost:5173**

## Login credentials

All existing demo accounts are in **Zone 1 — Nashik**. Other zones have their own admin (empty data until that zone creates entries).

| Zone | Role | Username | Password |
|------|------|----------|----------|
| Nashik | Admin | `admin` | `admin123` |
| Nashik | User | `user` | `user123` |
| Nashik | Technician | `technician` | `tech123` |
| Nashik | Pathologist | `pathologist` | `patho123` |
| Nashik | HR | `hr` | `hr123` |
| Nashik | Receptionist | `receptionist` | `reception123` |
| Nashik | Supreme | `supreme` | `supreme123` |
| Nashik | Prime | `prime` | `prime123` |
| Nashik | Sub-Franchise | `sub` | `sub123` |
| Pune | Admin | `pune_admin` | `pune123` |
| Ratnagiri | Admin | `ratnagiri_admin` | `ratnagiri123` |
| Mumbai | Admin | `mumbai_admin` | `mumbai123` |
| Dhule | Admin | `dhule_admin` | `dhule123` |

Reset/create these accounts with:

```bash
cd backend
python manage.py migrate
python manage.py seed_zones
python manage.py seed_test_roles
```

Zone admins manage **only their zone** users and operational data. Patient bookings, doctors, and collection centers do not mix across zones.

## Clinical module

After seeding, run:

```bash
cd backend
python manage.py seed_clinical_data
```

Pages:
- **Test Parameter Master** — `/clinical/test-parameters` (Admin)
- **Result Entry** — `/clinical/result-entry` (Technician, Admin)
- **Report Preview** — `/clinical/report-preview` (All roles)

## Project structure

```
Clasmo_Diagnostics/
├── backend/           # Django + DRF API
│   ├── api/           # Models, serializers, views
│   └── clasmo_backend/
├── frontend/          # React SPA
│   └── src/
│       ├── components/
│       ├── pages/
│       ├── services/
│       └── styles/
├── css/               # Legacy static styles
├── js/                # Legacy static scripts
└── device/            # Legacy device pages
```

## API endpoints

| Endpoint | Description |
|----------|-------------|
| `POST /api/auth/login/` | Login, returns token |
| `POST /api/auth/logout/` | Logout |
| `GET /api/auth/me/` | Current user |
| `GET /api/registrations/` | Search registrations |
| `POST /api/registrations/create/` | Create registration |
| `GET /api/tests/` | Test catalog |
| `GET /api/dashboard/summary/` | Dashboard stats |
| `GET /api/reports/summary/` | Report data |
| `POST /api/pickup-requests/` | Home pickup request |
| `POST /api/messages/` | Message to lab |

## Modules

- Search & patient lookup
- Test Registration & billing
- Test Result & authorization
- Administration (Admin only)
- Reports & Dashboard
- Device Request & home collection
- Elab-PAY & Help
