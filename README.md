# SwiftDrop

> **B2B last-mile delivery SaaS** — vendors plug in once and ship anywhere in India through a tiered hub network, with live agent tracking the customer can watch on a map.

Built for the Code Pitchers Hackathon by team **Code Pitchers**.

---

## 1. The Pitch in 30 Seconds

E-commerce sellers in India fight two problems at once:

1. **Building shipping software is expensive.** Every brand has to wire up order intake, status flows, customer notifications, and tracking pages.
2. **Tier-2 / tier-3 cities are slow and opaque.** Most courier APIs treat semi-urban deliveries as a black box — no live updates, no route visibility, no customer trust.

**SwiftDrop solves both.** Vendors sign up, hit our REST API (or paste orders into our UI), and we handle the rest:

- Auto-route every parcel through the correct **Main Hub → Local Hub → Customer** path based on the destination city.
- Auto-assign a delivery agent on dispatch.
- Send the customer a styled email on every status change.
- Give the agent a single-link mobile page that broadcasts their live GPS to the customer's tracking page.

The customer never has to wonder "where is my parcel?" — the answer is always one tap away on a live map.

---

## 2. What's Built

The product was built in three phases. **All three are complete and running together.**

### Phase 1 — Order Intake & Tracking Foundation
- Vendor signup / login (JWT) and API-key based programmatic access.
- Order CRUD with a status lifecycle (`PENDING → CONFIRMED → … → DELIVERED`).
- Public, tokenised tracking page so anyone with the link can see status.
- A polished MUI dashboard: stat cards, orders table, 3-step create-order wizard, profile + API key reveal.

### Phase 2 — Hub & Spoke Routing + Email
- New `Hub` and `DeliveryAgent` models. Two hub tiers (MAIN in metros, LOCAL in tier-2 cities).
- **Routing engine** ([`backend/src/utils/routing.ts`](backend/src/utils/routing.ts)) decides at order-creation time whether the parcel is **urban** (deliver direct from main hub) or **semi-urban** (route via the geographically nearest local hub, picked by haversine distance from the destination).
- **Dispatch endpoint** auto-assigns an available agent of the right type — `LAST_MILE` for urban, `LINE_HAUL` for semi-urban (the line-haul driver moves the parcel between hubs).
- **Route Map** page in the vendor dashboard shows the entire hub network and every active order's path in one view.
- **Status emails** with tracking link. Every state change — starting from "Order placed" — triggers a styled HTML email to the customer with a `Track your parcel →` CTA pointing at the public tracking page.

### Phase 3 — Live Agent Tracking
- Each dispatched order gets a unique `agentToken`. The vendor copies the agent link from the order detail page and sends it to the agent on WhatsApp/SMS — **no separate login for agents**.
- The agent opens the link on their phone, sees a mobile-first delivery card, and taps **Start Broadcasting**. The browser's `navigator.geolocation.watchPosition` pushes the agent's GPS to our backend every few seconds.
- The customer's tracking page **shows the agent's live pin moving on a map**, with a dashed line to their address.
- The agent taps **Mark as Delivered** when finished — the order flips to `DELIVERED`, the customer gets the final email, and a success screen appears on the agent's phone.

---

## 3. End-to-End Flow (the headline demo)

This is the single thread that ties every page together. It's also the demo we'd run for you.

```
┌─────────┐    1. signup / login (JWT)
│ VENDOR  │───────────────────────────────────────┐
└─────────┘                                       │
     │                                            ▼
     │ 2. POST /api/orders (UI or API key)   ┌──────────────────────────┐
     │  ─ resolveRoute() picks main hub       │ SwiftDrop Backend (API)  │
     │  ─ marks isUrban / semi-urban          │ Express + Prisma + PG    │
     │  ─ Order Placed email sent             └──────────┬───────────────┘
     │                                                   │
     │ 3. click "Dispatch Order" on detail page          │ writes agentToken
     │  ─ nearest-hub agent assigned                     │ generates email
     │  ─ Order Confirmed email sent                     │
     │                                                   ▼
     │ 4. progress status manually (demo) or via API ─→  Postgres
     │    (each step fires its own email)                ▲
     │                                                   │
     │ 5. status flips to OUT_FOR_DELIVERY ──────────────┤
     │                                                   │
     ▼                                                   │
┌─────────────┐  6. opens agent link on phone            │
│   AGENT     │  ─ GET /api/agent/:agentToken            │
│   (mobile)  │  ─ taps Start Broadcasting               │
│             │  ─ POST /api/agent/:token/location  ─────┤  every ~3 s
└─────────────┘  ─ taps Mark as Delivered                │
                 ─ PUT /api/agent/:token/delivered ──────┘
                                                         │
                                                         ▼
                                              ┌──────────────────┐
                                              │     CUSTOMER     │
                                              │ /track/<token>   │
                                              │                  │
                                              │ ─ polls order    │ every 5 s
                                              │ ─ polls location │ every 4 s
                                              │ ─ sees live pin  │
                                              │   on map         │
                                              └──────────────────┘
```

The customer never hits any auth — their token is the auth. The agent never hits any auth — their token is the auth. The vendor uses JWT in the dashboard or an API key for server-to-server.

---

## 4. Architecture

### Tech Stack

| Layer | Tech |
|-------|------|
| **Frontend** | React 18 + Vite 5 + MUI v5 + React Router v6 + react-leaflet + Axios |
| **Backend** | Express 4 + TypeScript (`tsx` for dev) |
| **Database** | PostgreSQL + Prisma 7 (adapter pattern with `pg`) |
| **Auth** | Vendor: JWT (7-day) **and** API key. Customer: tracking token in URL. Agent: agent token in URL. |
| **Email** | nodemailer with pluggable SMTP (Gmail App Password / Ethereal / any SMTP) |
| **Maps** | OpenStreetMap tiles via Leaflet |
| **Monorepo** | pnpm workspaces + Turborepo |

### Three Roles, Three Surfaces

| Role | Auth | Where they go | What they see |
|------|------|--------------|---------------|
| **Vendor** | JWT (login) **or** API key (programmatic) | `/login` → dashboard | Stats, orders, create-order wizard, route map, profile |
| **Customer** | None — tracking token in URL | `/track/:trackingToken` | Live status, dual stepper, route path, agent pin on map when out for delivery |
| **Agent** | None — agent token in URL | `/agent/:agentToken` | Mobile delivery card, GPS broadcast toggle, mark-delivered button |

---

## 5. Repository Layout

```
code-pitchers-hackathon/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma                    # Vendor, Hub, DeliveryAgent, Order
│   │   ├── migrations/
│   │   │   ├── 20260425094748_init/         # Phase 1
│   │   │   ├── 20260425160000_phase2_hubs_agents/
│   │   │   └── 20260425180000_phase3_live_tracking/
│   │   └── seed.ts                          # 4 main hubs + 6 local hubs + 17 agents + 5 vendors + 90 orders
│   ├── src/
│   │   ├── index.ts                         # Express app, route mounting
│   │   ├── routes/
│   │   │   ├── auth.ts                      # signup, login, me
│   │   │   ├── orders.ts                    # CRUD + dispatch + map-data
│   │   │   ├── tracking.ts                  # public status + live location poll
│   │   │   ├── vendor.ts                    # stats
│   │   │   ├── hubs.ts                      # public hub list (for map)
│   │   │   └── agent.ts                     # token-auth agent endpoints (Phase 3)
│   │   ├── middleware/auth.ts               # flexAuth (JWT or API key) + jwtOnly
│   │   ├── utils/routing.ts                 # urban detection + nearest-hub haversine
│   │   └── lib/
│   │       ├── prisma.ts                    # Prisma client singleton
│   │       └── email.ts                     # nodemailer + per-status HTML templates
│   ├── prisma.config.ts                     # Prisma 7 dotenv + pg adapter
│   └── .env                                 # DB, JWT, SMTP, public base URL
│
├── frontend/
│   ├── src/
│   │   ├── App.tsx                          # routes (incl. /track, /agent, /map)
│   │   ├── api/axios.ts                     # base URL + JWT interceptor
│   │   ├── context/AuthContext.tsx
│   │   ├── components/
│   │   │   ├── Layout.tsx                   # sidebar + topbar shell
│   │   │   ├── ProtectedRoute.tsx
│   │   │   ├── StatusChip.tsx               # color-coded status pills
│   │   │   └── LiveAgentMap.tsx             # Phase 3 — shared poll + map card
│   │   ├── pages/
│   │   │   ├── Login.tsx, Signup.tsx        # auth
│   │   │   ├── Dashboard.tsx                # 4 stat cards + recent orders
│   │   │   ├── Orders.tsx                   # full table + URBAN/SEMI-URBAN chip
│   │   │   ├── CreateOrder.tsx              # 3-step stepper form
│   │   │   ├── OrderDetail.tsx              # detail + dispatch + agent link + live map
│   │   │   ├── MapView.tsx                  # full-India hub network + active routes
│   │   │   ├── Track.tsx                    # public, polling, dual stepper, live map
│   │   │   ├── AgentView.tsx                # mobile-first agent screen
│   │   │   └── Profile.tsx                  # vendor + API key
│   │   ├── utils/cityCoords.ts              # ~30 city → lat/lng for map fallback
│   │   └── theme.ts
│   └── .env                                 # VITE_API_BASE_URL
│
├── pnpm-workspace.yaml, turbo.json, package.json
└── CLAUDE.md / CLAUDE_PHASE2.md / CLAUDE_PHASE3.md   # original spec docs
```

---

## 6. Setup

### Prerequisites
- Node.js 18+
- pnpm 10+ (`npm i -g pnpm`)
- PostgreSQL running locally (or any reachable DB)

### One-time setup

```bash
# Install all workspaces
pnpm install

# Configure backend/.env (template already in repo)
#   DATABASE_URL=postgresql://user:password@localhost:5432/swiftdrop
#   JWT_SECRET=hackathon_secret_key
#   PORT=3000
#   PUBLIC_TRACKING_BASE_URL=http://localhost:5173
#   SMTP_HOST= (leave blank to log instead of sending)
#   SMTP_PORT=587
#   SMTP_USER= / SMTP_PASS=
#   SMTP_FROM="SwiftDrop <no-reply@swiftdrop.dev>"

# Apply migrations + generate Prisma client
pnpm --filter swiftdrop-backend prisma:migrate
pnpm --filter swiftdrop-backend prisma:generate

# Seed: 5 vendors, 10 hubs, 17 agents, 90 realistic orders
pnpm --filter swiftdrop-backend prisma:seed
```

### Run

```bash
pnpm dev
# Backend on http://localhost:3000
# Frontend on http://localhost:5173
```

### Default seeded credentials

All seeded vendors share the password `password123`:

| Company | Email |
|---------|-------|
| Amazon India | admin@amazon.in |
| Flipkart | ops@flipkart.com |
| Meesho | dispatch@meesho.com |
| Myntra | logistics@myntra.com |
| Nykaa | ship@nykaa.com |

Each vendor has a unique API key surfaced on their **Profile** page (or printed by the seed script).

---

## 7. Live Demo Script (90 seconds)

Open three browser tabs side by side: **Vendor**, **Customer**, **Agent**.

### Setup (do before pitching)
1. Log in as `admin@amazon.in` / `password123`.
2. Click **Create Order**, fill the wizard with a **Nashik** delivery (semi-urban example).

### The talk

> "I'm a vendor like Amazon. I just placed an order on SwiftDrop."

3. On the order detail page, point at the **Route Banner** — `Mumbai Main Hub → Nashik Local Hub → Customer`. **The system already knew.** Nashik isn't a metro, so we route it through the nearest local hub, computed by haversine distance.

> "Now I'm dispatching the parcel."

4. Click **Dispatch Order**. An agent card appears with name, phone, vehicle, and hub. Below it: a unique **Agent Link** — copy it.

5. Open **Route Map** in another tab. Show the full hub network with this order's two-hop route drawn in blue → orange → red dashed.

> "Here's what every order looks like across the network at a glance."

6. Back on order detail, walk through the status dropdown: `AT_MAIN_HUB → IN_TRANSIT_TO_LOCAL_HUB → AT_LOCAL_HUB → OUT_FOR_DELIVERY`. The stepper progresses visually, **and the customer is getting a styled email at every step**.

7. Open the **Customer tab** — paste the public tracking link (from the order detail "Copy public link" button).

> "This is what the customer sees. Live status, route path, the seven-step semi-urban stepper. And right now…"

8. Open the **Agent link** in a new tab (or scan to your phone). Tap **Start Broadcasting**. Allow location.

> "The agent just went live. Watch the customer's screen."

9. The blue agent pin appears on the customer's tracking page. Walk around (or use Chrome DevTools → Sensors → Location to fake movement). The pin updates every 4 seconds.

10. Tap **Mark as Delivered** on the agent screen. The status flips to `DELIVERED` everywhere within the 5-second poll, and the customer gets the final email.

> "From order placement to doorstep delivery, the customer sees every step. The vendor sees the whole network. The agent doesn't even need an app — just a link. That's SwiftDrop."

---

## 8. User Journeys

### Vendor journey (`/login` → `/dashboard` → `/orders/:id`)
1. **Sign up / log in.** Email + password → JWT stored in `localStorage`.
2. **Dashboard.** Greets the vendor by name. Shows total / pending / in-transit / delivered counts. Below, the 10 most recent orders.
3. **Create order.** Three-step stepper: parcel info → pickup address → delivery address. Submitting POSTs to `/api/orders` and redirects to the new order's detail page.
4. **Order detail.** Pickup + delivery columns, urban / semi-urban chip, route banner, status stepper, agent card with copyable agent link, live map when out-for-delivery, demo controls (status dropdown, cancel button, copy public tracking link).
5. **Route map.** Entire India view. Main hubs as large blue dots, local hubs as smaller orange dots. Each active order draws a polyline in colours that match its route type. Filter toggle (All / Urban / Semi-Urban) and a legend overlay.
6. **Profile.** Vendor info plus a copy-to-clipboard API key for programmatic access.

### Customer journey (`/track/:trackingToken`)
1. Receives an email after every status change with a `Track your parcel →` button.
2. Opens the link. Sees a pulsing **LIVE** badge, current status, and "auto-updating every 5 s".
3. The page is **dual-aware**: urban orders show a 5-step stepper, semi-urban orders show a 7-step stepper, plus a route-path visual (`Pickup → Main Hub → Local Hub → Customer`).
4. When status hits `OUT_FOR_DELIVERY`, a **Live Agent Tracking** map card slides in above the stepper. They watch the agent's pin move toward their address.
5. When status flips to `DELIVERED`, the icon turns green and the journey is over.

### Agent journey (`/agent/:agentToken`)
1. Receives the link from the vendor (WhatsApp / SMS).
2. Opens it on their phone. Sees their delivery: parcel, customer name + address, **Call Customer** button, mini map.
3. While status is below `OUT_FOR_DELIVERY`, sees "Waiting for vendor to mark Out for Delivery". The page silently refetches every 8 s.
4. Once `OUT_FOR_DELIVERY`, the **Start Broadcasting** button activates. Tapping it requests geolocation permission and starts pushing the GPS to the backend (throttled to one POST every 3 s to be kind to battery).
5. When delivered, taps the big green **Mark as Delivered** button. A success screen renders.

---

## 9. API Reference

Base URL: `http://localhost:3000`

### Auth — `/api/auth`
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/signup` | none | Create vendor → returns JWT + API key |
| POST | `/login` | none | Login → returns JWT |
| GET | `/me` | JWT | Vendor profile |

### Orders — `/api/orders`
All routes accept either `Authorization: Bearer <JWT>` or `x-api-key: <key>`.
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/` | Create order. Auto-resolves route + isUrban + assignedHubId. Sends "Order placed" email. |
| GET | `/` | List vendor's orders (desc) |
| GET | `/map-data` | All orders enriched with main hub + resolved local hub for the map |
| GET | `/:id` | Full order detail incl. agent + hub + local hub |
| PUT | `/:id/status` | Update status. Sends a status email if it changed. |
| POST | `/:id/dispatch` | Auto-assigns the right type of agent at the main hub, generates `agentToken`, flips to `CONFIRMED`, emails the customer. |
| DELETE | `/:id` | Soft cancel (`status = CANCELLED`) + email. |

### Tracking — `/api/tracking` (public)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/:token` | Customer-facing status with isUrban, hub names, agent meta |
| GET | `/:token/location` | Live agent coords + `isLive` flag (polled every 4 s by tracking page + vendor detail) |

### Hubs — `/api/hubs` (public)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | All hubs with type, parentId, lat/lng — used by the route map |

### Vendor — `/api/vendor`
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/stats` | JWT | `{ total, pending, inTransit, delivered, cancelled }` (in-transit counts every Phase 2 intermediate status) |

### Agent — `/api/agent` (public, token-auth via URL)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/:agentToken` | Order info for the agent screen |
| POST | `/:agentToken/location` | Body `{ lat, lng }`. Only writes when status is `OUT_FOR_DELIVERY`. |
| PUT | `/:agentToken/delivered` | Marks `DELIVERED`, sets `deliveredAt`, emails the customer |

---

## 10. Data Model

```prisma
Vendor              # the seller
  id, email, password (bcrypt), companyName, phone
  apiKey              @unique             # for server-to-server posting
  orders Order[]

Hub                 # main or local hub
  id, name, city
  type                # "MAIN" or "LOCAL"
  parentId String?    # local hubs link to their parent main hub
  lat, lng
  agents DeliveryAgent[]
  orders Order[]      @relation("assignedHub")

DeliveryAgent       # the rider / driver
  id, name, phone
  vehicle             # BIKE | VAN | TRUCK
  agentType           # LAST_MILE | LINE_HAUL
  isAvailable
  hubId  → Hub
  orders Order[]

Order               # the parcel
  id, vendorId, description, weight, priority

  pickup*  (address, city, pincode, contact, phone)
  delivery* (address, city, pincode)
  customer* (name, phone, email)

  status              # PENDING → CONFIRMED → AT_MAIN_HUB → [IN_TRANSIT_TO_LOCAL_HUB → AT_LOCAL_HUB →] OUT_FOR_DELIVERY → DELIVERED
  trackingToken       @unique             # used by /track/:token
  isUrban             # true = direct from main hub, false = via local hub

  agentId       → DeliveryAgent
  assignedHubId → Hub                     # always the main hub
  # ── Phase 3 ──
  agentToken    @unique                   # used by /agent/:token
  agentLat / agentLng / agentLastSeen
  deliveredAt
```

---

## 11. Engineering Decisions Worth Calling Out

- **Three independent auth schemes**, one for each role, all working off Express middleware:
  - `flexAuth` — JWT *or* API key, used on the order routes so vendors can use their dashboard *or* hit the API directly.
  - `jwtOnly` — for routes that only make sense from a logged-in browser (`/api/auth/me`, `/api/vendor/stats`).
  - **No middleware** for tracking + agent routes — the URL token is the auth. Simple, sharable, no login friction for the people who matter most (the customer and the agent).

- **Routing engine is data-driven, not hard-coded.** The list of "main hub cities" is in one place ([`backend/src/utils/routing.ts`](backend/src/utils/routing.ts)). Adding a new metro just means inserting a `Hub` row + adding the city to `MAIN_HUB_CITIES`. The seed mirrors the same set so the demo data is self-consistent.

- **Nearest-hub picking uses haversine distance** with a static city-coords table. Good enough for a hackathon — and a clean integration point for a real geocoder (Mapbox / Google) later.

- **The map view never asks the backend for line geometry.** The backend gives endpoints + hub coords; the frontend draws polylines. Cheap, no map provider lock-in.

- **Email is fire-and-forget.** The `sendStatusEmail` calls `.catch(console.error)` instead of being awaited inline, so a slow SMTP server can never tank API latency. If `SMTP_HOST` is blank the service logs `[email] (SMTP not configured) Would send …` instead — so dev works zero-config.

- **Live tracking does not require WebSockets.** A 4-second poll keeps the demo simple, the backend stateless, and works through any CDN. The trade-off is acceptable at hackathon scale; switching to WebSockets / Server-Sent Events would be a one-file change.

- **Pre-seeded GPS positions for `OUT_FOR_DELIVERY` orders** in the seed file mean the live map looks alive from the moment you log in — no need to plug in a phone before judges sit down.

- **Phase 2 status flow is split per-route-type.** Urban orders have 5 steps; semi-urban orders have 7. The status dropdown on the order detail page only shows the relevant subset, so a vendor demoing urban can never accidentally pick `IN_TRANSIT_TO_LOCAL_HUB`.

---

## 12. What's Next (post-hackathon roadmap)

- **Real geocoder + reverse-geocoding** so `pickupCity` / `deliveryCity` aren't string matched against a static table.
- **Webhook callbacks** — vendors register a URL, we POST status changes to it. (The internals already have one place to bolt this in: [`backend/src/lib/email.ts`](backend/src/lib/email.ts) — the same call-site.)
- **WebSocket live updates** instead of polling, once the volume justifies it.
- **Agent app** (PWA → React Native) with background GPS so they don't have to keep the tab open.
- **Admin / superuser** view for ops: see every vendor's volume, agent utilisation per hub, average dwell-time per status.
- **Analytics dashboard** — delivery time histograms, top destination cities, percentage of semi-urban deliveries.
- **PDF shipping labels** + bulk CSV import for high-volume vendors.

---

## 13. Credits

Built by **Code Pitchers** for the hackathon, with Claude Code as a paired coding assistant.

Spec docs that drove the build live alongside the code:
- [CLAUDE.md](CLAUDE.md) — Phase 1 (intake + tracking)
- [CLAUDE_PHASE2.md](CLAUDE_PHASE2.md) — Phase 2 (hubs + routing + email)
- [CLAUDE_PHASE3.md](CLAUDE_PHASE3.md) — Phase 3 (live agent tracking)
