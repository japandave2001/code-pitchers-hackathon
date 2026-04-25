CLAUDE.md — SwiftDrop: Last Mile Delivery SaaS

## What This Is

SwiftDrop is a B2B SaaS where vendors (like Amazon, Flipkart, or small D2C brands) sign up,
log in, and submit delivery orders. They can either use the UI or hit our API directly.
We handle the order intake, show them their orders, and let anyone track a parcel publicly.

**The backend just needs to work. The UI needs to look great.**

---

## Monorepo Setup

- **Package manager:** pnpm (v10.27.0) with workspaces
- **Task runner:** Turborepo
- **Workspaces:** `frontend/`, `backend/`

### Commands

```bash
pnpm dev          # Start both frontend (5173) and backend (3000) via Turbo
pnpm build        # Build both packages
pnpm --filter backend prisma:generate   # Regenerate Prisma client
pnpm --filter backend prisma:migrate    # Run migrations
```

---

## Tech Stack

| Layer      | Tech                                                     |
|------------|----------------------------------------------------------|
| Frontend   | React 18 + Vite 5 + MUI v5 + React Router v6            |
| Backend    | Express 4 + TypeScript (tsx for dev)                     |
| Database   | PostgreSQL + Prisma 7 (adapter pattern with `pg` driver) |
| Auth       | JWT (7-day expiry) stored in localStorage + API key auth |

---

## Folder Structure (current state)

```
swiftdrop/
├── package.json              # Root — pnpm workspaces + turbo scripts
├── pnpm-workspace.yaml       # Workspaces: frontend, backend
├── turbo.json                # Task config: dev, build, prisma tasks
│
├── backend/
│   ├── prisma.config.ts      # Prisma 7 config — dotenv, adapter, datasource URL
│   ├── prisma/
│   │   ├── schema.prisma     # Vendor + Order models (NO url in datasource — Prisma 7 style)
│   │   └── migrations/       # Applied: 20260425094748_init
│   ├── src/
│   │   ├── index.ts          # Express app — cors, json, route mounting
│   │   ├── routes/
│   │   │   ├── auth.ts       # POST /signup, POST /login, GET /me (DONE)
│   │   │   ├── orders.ts     # CRUD + status update (DONE)
│   │   │   ├── tracking.ts   # GET /:token — public (DONE)
│   │   │   └── vendor.ts     # GET /stats — order counts by status (DONE)
│   │   ├── middleware/
│   │   │   └── auth.ts       # flexAuth (JWT or API key) + jwtOnly
│   │   └── lib/
│   │       └── prisma.ts     # Prisma client singleton with pg adapter
│   ├── .env                  # DATABASE_URL, JWT_SECRET, PORT
│   ├── package.json
│   └── tsconfig.json
│
└── frontend/
    ├── src/
    │   ├── api/
    │   │   └── axios.ts       # Axios instance — baseURL from env, JWT interceptor (DONE)
    │   ├── context/
    │   │   └── AuthContext.tsx # login, signup, logout, vendor state (DONE)
    │   ├── components/
    │   │   ├── Layout.tsx     # Sidebar (dark #0D1B2A) + top bar wrapper (DONE)
    │   │   ├── ProtectedRoute.tsx  # Redirect to /login if no vendor (DONE)
    │   │   └── StatusChip.tsx # Color-coded status chip for all statuses (DONE)
    │   ├── pages/
    │   │   ├── Login.tsx      # Centered card, email+password, links to signup (DONE)
    │   │   ├── Signup.tsx     # Centered card, company+email+phone+password (DONE)
    │   │   ├── Dashboard.tsx  # Greeting, 4 stat cards, recent orders table (DONE)
    │   │   ├── Orders.tsx     # Full orders table with search + create button (DONE)
    │   │   ├── CreateOrder.tsx # 3-step stepper: parcel → pickup → delivery (DONE)
    │   │   ├── OrderDetail.tsx # Pickup/delivery columns, tracking token copy, status stepper, demo controls (DONE)
    │   │   ├── Track.tsx      # Public standalone tracking page — no sidebar (DONE)
    │   │   └── Profile.tsx    # Vendor info + API key with copy button (DONE)
    │   ├── theme.ts           # MUI theme — primary #1565C0, secondary #FF6F00, Inter font (DONE)
    │   ├── App.tsx            # BrowserRouter with all routes + ProtectedRoute (DONE)
    │   └── main.tsx           # ReactDOM root (DONE)
    ├── .env                   # VITE_API_BASE_URL=http://localhost:3000/api
    ├── index.html
    ├── vite.config.ts         # React plugin, port 5173
    ├── package.json
    └── tsconfig.json
```

---

## Database Schema (Prisma — current applied state)

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
}

model Vendor {
  id          String   @id @default(cuid())
  email       String   @unique
  password    String
  companyName String
  phone       String
  apiKey      String   @unique @default(cuid())
  createdAt   DateTime @default(now())
  orders      Order[]
}

model Order {
  id          String   @id @default(cuid())
  vendorId    String
  vendor      Vendor   @relation(fields: [vendorId], references: [id])

  description String
  weight      Float
  priority    String   @default("STANDARD")   // STANDARD | EXPRESS | SAME_DAY

  pickupAddress  String
  pickupCity     String
  pickupPincode  String
  pickupContact  String
  pickupPhone    String

  deliveryAddress String
  deliveryCity    String
  deliveryPincode String
  customerName    String
  customerPhone   String
  customerEmail   String?

  status         String   @default("PENDING")
  trackingToken  String   @unique @default(cuid())

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

**Prisma 7 notes:**
- The `datasource` block has NO `url` — Prisma 7 moved that to `prisma.config.ts`
- `prisma.config.ts` loads `dotenv/config`, sets `datasource.url` from env, and provides the `PrismaPg` adapter for migrations
- Runtime Prisma client in `src/lib/prisma.ts` uses the adapter pattern with `pg` Pool

---

## Backend APIs (all implemented)

Base URL: `http://localhost:3000`

### Auth — `/api/auth`

| Method | Endpoint          | Auth     | Description                    |
|--------|-------------------|----------|--------------------------------|
| POST   | `/api/auth/signup` | none    | Create vendor account → JWT    |
| POST   | `/api/auth/login`  | none    | Login → JWT                    |
| GET    | `/api/auth/me`     | JWT only | Get current vendor profile     |

**Signup body:** `{ email, password, companyName, phone }`
**Login body:** `{ email, password }`
**Response:** `{ token, vendor: { id, email, companyName, apiKey } }`

### Orders — `/api/orders`

All order routes use `flexAuth` — accepts `Authorization: Bearer <JWT>` OR `x-api-key: <key>`.

| Method | Endpoint                | Description                              |
|--------|-------------------------|------------------------------------------|
| POST   | `/api/orders`           | Create order → `{ id, trackingToken, status, createdAt }` |
| GET    | `/api/orders`           | List vendor's orders (desc by createdAt) |
| GET    | `/api/orders/:id`       | Full order detail                        |
| PUT    | `/api/orders/:id/status`| Update status `{ status: "IN_TRANSIT" }` |
| DELETE | `/api/orders/:id`       | Cancel order (sets status = CANCELLED)   |

### Tracking — `/api/tracking`

| Method | Endpoint                 | Auth | Description                       |
|--------|--------------------------|------|-----------------------------------|
| GET    | `/api/tracking/:token`   | none | Public tracking info              |

### Vendor — `/api/vendor`

| Method | Endpoint              | Auth     | Description                        |
|--------|-----------------------|----------|------------------------------------|
| GET    | `/api/vendor/stats`   | JWT only | `{ total, pending, inTransit, delivered, cancelled }` |

---

## Auth Middleware

Two middlewares in `backend/src/middleware/auth.ts`:

- **`flexAuth`**: Checks JWT first (`Authorization: Bearer <token>`), falls back to API key lookup (`x-api-key`). Sets `req.vendor = { id, email }`. Used on all order routes.
- **`jwtOnly`**: Only accepts JWT Bearer token. Used on `/api/auth/me` and `/api/vendor/stats`.

---

## Order Status Flow

```
PENDING → CONFIRMED → PICKED_UP → IN_TRANSIT → OUT_FOR_DELIVERY → DELIVERED
                                                                   ↓
                                                              CANCELLED (any time)
```

Status chip colors (in `StatusChip.tsx`):
- PENDING: grey | CONFIRMED: blue | PICKED_UP: light blue
- IN_TRANSIT: orange | OUT_FOR_DELIVERY: amber | DELIVERED: green | CANCELLED: red

---

## Environment Variables

**backend/.env**
```
DATABASE_URL=postgresql://postgres:nilay@localhost:5432/swiftdrop
JWT_SECRET=hackathon_secret_key
PORT=3000
```

**frontend/.env**
```
VITE_API_BASE_URL=http://localhost:3000/api
```

---

## Frontend Routes (all implemented)

| Path              | Component      | Auth      | Description                     |
|-------------------|----------------|-----------|---------------------------------|
| `/login`          | Login.tsx      | public    | Centered card login form        |
| `/signup`         | Signup.tsx     | public    | Centered card signup form       |
| `/track/:token`   | Track.tsx     | public    | Standalone tracking (no sidebar)|
| `/dashboard`      | Dashboard.tsx  | protected | Stats cards + recent orders     |
| `/orders`         | Orders.tsx     | protected | All orders + search + create btn|
| `/orders/new`     | CreateOrder.tsx| protected | 3-step stepper form             |
| `/orders/:id`     | OrderDetail.tsx| protected | Full detail + status controls   |
| `/profile`        | Profile.tsx    | protected | Vendor info + API key           |
| `/`               | redirect       | —         | Redirects to `/dashboard`       |
| `*`               | redirect       | —         | Redirects to `/dashboard`       |

---

## Frontend — UI Details

### Theme (`theme.ts`)
- Primary: `#1565C0` (blue) | Secondary: `#FF6F00` (orange)
- Background: `#F0F4F8` | Paper: `#ffffff`
- Font: Inter, sans-serif
- Border radius: 12px globally, 8px on buttons
- Buttons: no text-transform, fontWeight 600
- Cards: soft shadow `0 2px 12px rgba(0,0,0,0.08)`

### Layout (`Layout.tsx`)
- Left sidebar: 240px, dark navy `#0D1B2A`, brand logo with bolt icon
- Nav items: Dashboard, Orders, Create Order, Profile — with active state highlight
- Top bar: white, page title on left, company name + avatar on right
- Logout button at sidebar bottom

### Axios (`api/axios.ts`)
- Base URL from `VITE_API_BASE_URL` env var
- Request interceptor auto-attaches JWT from `localStorage.getItem('token')`

### AuthContext (`context/AuthContext.tsx`)
- Provides: `vendor`, `loading`, `login()`, `signup()`, `logout()`
- On mount: checks localStorage for token, calls `/auth/me` to restore session
- On login/signup: stores token in localStorage, sets vendor state
- On logout: clears localStorage + vendor state

---

## What's Done (complete implementation)

### Backend — 100% complete
- Express server with CORS and JSON parsing
- All 4 route files: auth, orders, tracking, vendor
- Both auth middlewares: flexAuth + jwtOnly
- Prisma client singleton with pg adapter
- Database migrated (Vendor + Order tables)
- Prisma 7 config with dotenv loading

### Frontend — 100% complete (all pages implemented)
- MUI theme configured
- Axios with auth interceptor
- AuthContext with full auth flow
- Layout with sidebar + top bar
- ProtectedRoute component
- StatusChip with color coding
- All 8 pages: Login, Signup, Dashboard, Orders, CreateOrder, OrderDetail, Track, Profile

---

## What Could Be Added Next

These are potential enhancements — none are started:

- **Email notifications** — send tracking link to customer on order creation
- **Webhook support** — notify vendor's system on status changes
- **Bulk order import** — CSV/Excel upload for batch order creation
- **Analytics dashboard** — charts for delivery times, volumes, city breakdown
- **Driver/delivery agent module** — assign orders to drivers, real-time location
- **Rate limiting** — protect API from abuse
- **Pagination** — orders list currently loads all, add cursor/offset pagination
- **Search/filter improvements** — filter by status, date range, priority
- **PDF labels** — generate shipping labels for orders
- **Multi-tenant admin panel** — super-admin view across all vendors
- **Audit log** — track status change history with timestamps
- **Testing** — unit tests for routes, integration tests for auth flow

---

## Development Notes

- Prisma 7 does NOT use `url` in the `datasource` block of `schema.prisma` — it goes in `prisma.config.ts`
- Always import `dotenv/config` at the top of `prisma.config.ts` for env vars to load during CLI commands
- The `prisma.config.ts` needs both `datasource.url` (for migrations) and `migrate.adapter` (for the pg driver)
- Frontend dev server runs on port 5173, backend on port 3000 — no proxy configured, relies on CORS
- JWT tokens expire in 7 days
- Order deletion is a soft delete — sets status to CANCELLED rather than removing the row
- The `inTransit` stat count includes CONFIRMED, PICKED_UP, IN_TRANSIT, and OUT_FOR_DELIVERY
