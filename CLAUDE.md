CLAUDE.md — SwiftDrop: Last Mile Delivery SaaS

## What We're Building

SwiftDrop is a B2B SaaS where vendors (like Amazon, Flipkart, or small D2C brands) sign up,
log in, and submit delivery orders. They can either use the UI or hit our API directly.
We handle the order intake, show them their orders, and let anyone track a parcel publicly.

**The backend just needs to work. The UI needs to look great.**

---

## Tech Stack

- **Frontend:** React + Vite + Material UI (MUI v5)
- **Backend:** Express + TypeScript (keep it simple, avoid over-engineering)
- **Database:** PostgreSQL + Prisma ORM
- **Auth:** JWT stored in localStorage

---

## Folder Structure

```
swiftdrop/
├── backend/
│   ├── prisma/
│   │   └── schema.prisma
│   ├── src/
│   │   ├── routes/
│   │   │   ├── auth.ts
│   │   │   ├── orders.ts
│   │   │   └── tracking.ts
│   │   ├── middleware/
│   │   │   └── auth.ts         # JWT check
│   │   ├── lib/
│   │   │   └── prisma.ts       # Prisma client singleton
│   │   └── index.ts
│   ├── .env
│   └── package.json
│
└── frontend/
    ├── src/
    │   ├── api/
    │   │   └── axios.ts         # Axios instance with base URL + auth header
    │   ├── pages/
    │   │   ├── Login.tsx
    │   │   ├── Signup.tsx
    │   │   ├── Dashboard.tsx
    │   │   ├── Orders.tsx
    │   │   ├── CreateOrder.tsx
    │   │   ├── OrderDetail.tsx
    │   │   └── Track.tsx        # Public tracking page
    │   ├── components/
    │   │   ├── Layout.tsx       # Sidebar + topbar wrapper
    │   │   └── ProtectedRoute.tsx
    │   ├── context/
    │   │   └── AuthContext.tsx
    │   ├── theme.ts
    │   ├── App.tsx
    │   └── main.tsx
    └── package.json
```

---

## Database Schema (Prisma)

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model Vendor {
  id          String   @id @default(cuid())
  email       String   @unique
  password    String
  companyName String
  phone       String
  apiKey      String   @unique @default(cuid())
  createdAt   DateTime @default(now())

  orders Order[]
}

model Order {
  id          String      @id @default(cuid())
  vendorId    String
  vendor      Vendor      @relation(fields: [vendorId], references: [id])

  // Parcel
  description String
  weight      Float
  priority    String      @default("STANDARD")  // STANDARD | EXPRESS | SAME_DAY

  // Pickup
  pickupAddress  String
  pickupCity     String
  pickupPincode  String
  pickupContact  String
  pickupPhone    String

  // Delivery
  deliveryAddress String
  deliveryCity    String
  deliveryPincode String
  customerName    String
  customerPhone   String
  customerEmail   String?

  // Tracking
  status         String   @default("PENDING")
  trackingToken  String   @unique @default(cuid())

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

Run: `npx prisma migrate dev --name init`

---

## Backend APIs

Keep it simple. No complex validation. Just make it work.

### Auth — `/api/auth`

**POST `/api/auth/signup`**
```json
// Body
{ "email": "", "password": "", "companyName": "", "phone": "" }

// Response
{ "token": "jwt...", "vendor": { "id": "", "email": "", "companyName": "", "apiKey": "" } }
```

**POST `/api/auth/login`**
```json
// Body
{ "email": "", "password": "" }

// Response
{ "token": "jwt...", "vendor": { "id": "", "email": "", "companyName": "", "apiKey": "" } }
```

**GET `/api/auth/me`** — requires JWT
```json
// Response
{ "id": "", "email": "", "companyName": "", "phone": "", "apiKey": "" }
```

---

### Orders — `/api/orders`

All order routes accept **either** `Authorization: Bearer <JWT>` or `x-api-key: <apiKey>` header.
Write a single middleware that checks JWT first, then falls back to API key lookup.

**POST `/api/orders`** — Create order
```json
// Body
{
  "description": "Mobile Phone",
  "weight": 0.5,
  "priority": "EXPRESS",
  "pickupAddress": "Warehouse B, Andheri",
  "pickupCity": "Mumbai",
  "pickupPincode": "400069",
  "pickupContact": "Ravi Kumar",
  "pickupPhone": "9123456780",
  "deliveryAddress": "Flat 4B, Baner",
  "deliveryCity": "Pune",
  "deliveryPincode": "411045",
  "customerName": "Harsh Desai",
  "customerPhone": "9876543210",
  "customerEmail": "harsh@example.com"
}

// Response
{ "id": "", "trackingToken": "", "status": "PENDING", "createdAt": "" }
```

**GET `/api/orders`** — List vendor's orders
```json
// Response
[{ "id": "", "description": "", "status": "", "customerName": "", "deliveryCity": "", "createdAt": "", "trackingToken": "" }]
```

**GET `/api/orders/:id`** — Single order detail (full fields)

**PUT `/api/orders/:id/status`** — Update order status (for demo simulation)
```json
// Body
{ "status": "IN_TRANSIT" }
```

**DELETE `/api/orders/:id`** — Cancel order (just delete or set status = CANCELLED)

---

### Tracking — `/api/tracking`

No auth required.

**GET `/api/tracking/:token`**
```json
// Response
{
  "trackingToken": "",
  "status": "IN_TRANSIT",
  "customerName": "Harsh Desai",
  "deliveryCity": "Pune",
  "description": "Mobile Phone",
  "priority": "EXPRESS",
  "createdAt": ""
}
```

---

### Vendor — `/api/vendor`

**GET `/api/vendor/stats`** — requires JWT
```json
// Response
{ "total": 50, "pending": 5, "inTransit": 20, "delivered": 22, "cancelled": 3 }
```

---

## Auth Middleware

```typescript
// src/middleware/auth.ts
import jwt from 'jsonwebtoken'
import { prisma } from '../lib/prisma'

export const flexAuth = async (req: any, res: any, next: any) => {
  const authHeader = req.headers['authorization']
  const apiKey = req.headers['x-api-key']

  if (authHeader?.startsWith('Bearer ')) {
    try {
      const token = authHeader.split(' ')[1]
      const payload: any = jwt.verify(token, process.env.JWT_SECRET!)
      req.vendor = payload
      return next()
    } catch {
      return res.status(401).json({ error: 'Invalid token' })
    }
  }

  if (apiKey) {
    const vendor = await prisma.vendor.findUnique({ where: { apiKey: apiKey as string } })
    if (!vendor) return res.status(401).json({ error: 'Invalid API key' })
    req.vendor = { id: vendor.id, email: vendor.email }
    return next()
  }

  return res.status(401).json({ error: 'Unauthorized' })
}
```

---

## Environment Variables

**backend/.env**
```
DATABASE_URL=postgresql://user:password@localhost:5432/swiftdrop
JWT_SECRET=hackathon_secret_key
PORT=3000
```

**frontend/.env**
```
VITE_API_BASE_URL=http://localhost:3000/api
```

---

## Frontend — UI Guidelines

**This is the most important part. Make it look polished.**

### Theme

```typescript
// theme.ts
import { createTheme } from '@mui/material/styles'

export const theme = createTheme({
  palette: {
    primary: { main: '#1565C0' },
    secondary: { main: '#FF6F00' },
    background: { default: '#F0F4F8', paper: '#ffffff' },
    success: { main: '#2E7D32' },
    warning: { main: '#E65100' },
  },
  typography: {
    fontFamily: 'Inter, sans-serif',
    h5: { fontWeight: 700 },
    h6: { fontWeight: 600 },
  },
  shape: { borderRadius: 12 },
  components: {
    MuiButton: {
      styleOverrides: {
        root: { textTransform: 'none', fontWeight: 600, borderRadius: 8 }
      }
    },
    MuiCard: {
      styleOverrides: {
        root: { boxShadow: '0 2px 12px rgba(0,0,0,0.08)', borderRadius: 12 }
      }
    }
  }
})
```

---

### Pages & UI Details

#### Login / Signup Pages
- Centered card layout (max-width 420px), logo/brand name at top
- Clean form with email + password fields
- Primary button full-width
- Link to switch between login/signup
- Show error messages inline under the button

#### Dashboard Page (`/dashboard`)
- Top greeting: "Good morning, Amazon India 👋"
- 4 stats cards in a row: **Total Orders**, **Pending**, **In Transit**, **Delivered**
  - Each card has an icon, big number, and label
  - Color-coded: blue for total, orange for pending, purple for transit, green for delivered
- Below: a table of **Recent Orders** (last 10) with columns: Order ID, Customer, City, Status chip, Date, Actions
- Status chips should be color-coded:
  - PENDING → grey
  - CONFIRMED → blue
  - IN_TRANSIT → orange
  - DELIVERED → green
  - CANCELLED → red

#### Orders Page (`/orders`)
- Full table with all orders, same columns as dashboard
- Search bar at top to filter by customer name or city
- "Create Order" button (primary, top right) → goes to `/orders/new`
- Clicking a row → goes to `/orders/:id`

#### Create Order Page (`/orders/new`)
- Stepper with 3 steps:
  1. **Parcel Info** — description, weight, priority (dropdown: Standard / Express / Same Day)
  2. **Pickup Details** — address, city, pincode, contact name, phone
  3. **Delivery Details** — address, city, pincode, customer name, phone, email
- "Next" and "Back" buttons
- On final step show a "Submit Order" button
- After success: show a success alert with the tracking token, then redirect to orders list

#### Order Detail Page (`/orders/:id`)
- Show full order info in two columns (pickup on left, delivery on right)
- Status badge at top
- Tracking token displayed with a copy-to-clipboard button
- Timeline/stepper at the bottom showing status history visually:
  `PENDING → CONFIRMED → PICKED_UP → IN_TRANSIT → OUT_FOR_DELIVERY → DELIVERED`
  Highlight current step
- For demo: dropdown to manually update status

#### Public Tracking Page (`/track/:token`)
- No sidebar/navbar — standalone page
- Brand logo at top
- Big status indicator with icon
- Show: customer name, delivery city, parcel description, priority, date
- Simple visual stepper for stages
- Anyone can access this without logging in

#### Layout (for protected pages)
- Left sidebar (240px) with:
  - Brand logo at top ("⚡ SwiftDrop")
  - Nav links: Dashboard, Orders, Create Order, Profile
  - Logout button at bottom
- Top bar with page title and user's company name
- Main content area with padding

---

## Frontend Routes

```
/login                 → Login page (public)
/signup                → Signup page (public)
/track/:token          → Public tracking page (public)
/dashboard             → Dashboard (protected)
/orders                → Orders list (protected)
/orders/new            → Create order (protected)
/orders/:id            → Order detail (protected)
```

---

## Axios Setup

```typescript
// api/axios.ts
import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

export default api
```

---

## Build Order

1. Set up backend: Prisma schema → migrate → auth routes → order routes → tracking
2. Set up frontend: Vite + MUI theme → auth pages → layout → dashboard → orders

Keep things moving. Don't over-think backend. Ship the UI.