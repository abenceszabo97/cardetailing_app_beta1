# Frontend Refactor Documentation

## Overview
The original monolithic frontend has been split into two independent applications:
1. **frontend-admin** - Admin dashboard for internal management
2. **frontend-booking** - Public booking website for customers

Both applications share the same backend API.

---

## Directory Structure

```
/app/
├── backend/                  # Unchanged - shared API
├── frontend/                 # Original (kept as reference)
├── frontend-admin/           # Admin Dashboard App
│   ├── src/
│   │   ├── App.js           # Admin routing (protected routes)
│   │   ├── components/
│   │   │   ├── Sidebar.jsx
│   │   │   ├── NotificationBell.jsx
│   │   │   └── ui/          # Shadcn components
│   │   └── pages/
│   │       ├── Login.jsx
│   │       ├── Dashboard.jsx
│   │       ├── Calendar.jsx
│   │       ├── Customers.jsx
│   │       ├── CustomerDetail.jsx
│   │       ├── Workers.jsx
│   │       ├── Inventory.jsx
│   │       ├── Statistics.jsx
│   │       ├── Services.jsx
│   │       ├── DayManagement.jsx
│   │       └── Settings.jsx
│   ├── .env
│   └── package.json
│
└── frontend-booking/         # Public Booking App
    ├── src/
    │   ├── App.js           # Public routing (no auth)
    │   ├── components/
    │   │   ├── AIComponents.jsx
    │   │   └── ui/          # Shadcn components
    │   └── pages/
    │       └── BookingPage.jsx
    ├── .env
    └── package.json
```

---

## What Was Removed

### From frontend-admin:
- `BookingPage.jsx` - Public booking wizard
- `BookingCalendar.jsx` - Public calendar view
- `AIComponents.jsx` - AI recommendation components (only used in booking)

### From frontend-booking:
- `Dashboard.jsx` - Admin dashboard
- `Customers.jsx`, `CustomerDetail.jsx` - Customer management
- `Workers.jsx` - Employee management
- `Inventory.jsx` - Inventory management
- `Statistics.jsx` - Analytics and reports
- `Services.jsx` - Service configuration
- `DayManagement.jsx` - Day open/close management
- `Settings.jsx` - System settings
- `Login.jsx` - Admin authentication
- `Calendar.jsx` - Admin calendar view
- `BookingCalendar.jsx` - Unused calendar component
- `Sidebar.jsx` - Admin navigation
- `NotificationBell.jsx` - Admin notifications

---

## Routing

### Admin App Routes
| Route | Component | Auth |
|-------|-----------|------|
| `/login` | Login | No |
| `/dashboard` | Dashboard | Yes |
| `/calendar` | Calendar | Yes |
| `/customers` | Customers | Yes |
| `/customers/:id` | CustomerDetail | Yes |
| `/workers` | Workers | Yes |
| `/inventory` | Inventory | Yes |
| `/statistics` | Statistics | Yes |
| `/services` | Services | Yes |
| `/day-management` | DayManagement | Yes |
| `/settings` | Settings | Yes |
| `/` | Redirect to /dashboard | - |

### Booking App Routes
| Route | Component | Auth |
|-------|-----------|------|
| `/` | BookingPage | No |
| `/booking` | BookingPage | No |
| `*` | Redirect to / | - |

---

## API Connection

Both apps use the same environment variable:
```
REACT_APP_BACKEND_URL=https://your-backend-url.com
```

API calls use the `/api` prefix automatically.

---

## Deployment Options

### Option 1: Same Domain, Different Paths
```
admin.yourdomain.com    → frontend-admin
booking.yourdomain.com  → frontend-booking
```

### Option 2: Subpaths (requires reverse proxy)
```
yourdomain.com/admin    → frontend-admin
yourdomain.com/         → frontend-booking
```

### Option 3: Separate Platforms
- Deploy frontend-admin to Vercel/Netlify (admin subdomain)
- Deploy frontend-booking to Vercel/Netlify (main domain)

---

## Build Commands

### Admin App
```bash
cd /app/frontend-admin
yarn install
yarn build
# Output: /app/frontend-admin/build/
```

### Booking App
```bash
cd /app/frontend-booking
yarn install
yarn build
# Output: /app/frontend-booking/build/
```

---

## Build Sizes (gzipped)

| App | JS Bundle | CSS |
|-----|-----------|-----|
| frontend-admin | ~430 KB | ~12 KB |
| frontend-booking | ~150 KB | ~12 KB |

The booking app is **~65% smaller** than the admin app.

---

## Notes

1. The original `/app/frontend/` directory is kept as a reference
2. Both apps share the same UI components (Shadcn/UI)
3. No backend changes were required
4. Each app can be deployed and scaled independently
