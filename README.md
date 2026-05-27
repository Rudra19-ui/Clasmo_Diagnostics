# Clasmo Diagnostics — LIMS Website

Laboratory Information Management System for **Clasmo Diagnostics Pvt. Ltd.**

## Quick start

1. Open `index.html` in your browser.
2. Use **trial login** (see below) or click **Use User/Admin credentials**.
3. After login you land on **Search**.

```bash
npx serve .
```

## Trial login (for testing)

| Role  | Username    | Password      |
|-------|-------------|---------------|
| User  | `user_test` | `password123` |
| Admin | `admin_test`| `admin123`    |

- **User** can access: Search, Test Registration, Test Result, Reports, Device Request, Dashboard, Elab-PAY, Help.
- **Admin** has all user access plus **Administration** and **ChangeLab → Admin**.

## Site structure (navigation)

Main menu uses nested `<ul>` / `<li>`:

- Search
- Test Registration
- Test Result
- **Administration** (admin only)
  - User Management, Test Master, Collection Center, Doctor Master, Rate Master
- **Reports**
  - Daily Summary, Collection Report, Outstanding Report, TAT Report
- **Device Request**
  - Pickup Request Page, Patient Appointment, Message To Lab, Schedular, Trip Management, Batch Upload, Test Result Batch
- **ChangeLab**
  - CLASMO DIAGNOSTICS PVT.LTD., Admin
- Dashboard
- Elab-PAY
- Help

## Files

| Path | Description |
|------|-------------|
| `index.html` | Login (User / Admin tabs) |
| `search.html` | Patient search & filters |
| `registration.html` | Test registration & billing |
| `test-result.html` | Results & authorization |
| `administration.html` | Admin modules |
| `reports.html` | Reports hub |
| `dashboard.html` | eLab dashboard |
| `device/*.html` | Device Request sub-pages |
| `js/auth.js` | Session & trial accounts |
| `js/layout.js` | Shared header & nav |
