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

## Trial credentials

| Role        | Username           | Password      |
|-------------|--------------------|---------------|
| User        | `user_test`        | `password123` |
| Admin       | `admin_test`       | `admin123`    |
| Technician  | `technician_test`  | `tech123`     |
| Pathologist | `pathologist_test` | `patho123`    |

Use the matching login tab (User vs Admin) on the login page. Technician and Pathologist use the User tab.

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
