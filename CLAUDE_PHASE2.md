# CLAUDE_PHASE2.md — SwiftDrop Phase 2: Agents + Hub & Spoke Routing + Live Tracking

## Context

Phase 1 is already built and running:
- Vendor signup / login (JWT)
- Order intake via UI and API (x-api-key)
- Order list, order detail, public tracking page
- Basic status updates via PUT /api/orders/:id/status

**Do not touch or re-implement Phase 1 code.**

---

## What We're Adding (Phase 2)

1. **Hub & Spoke Model** — two-tier delivery network (Main Hub → Local Hub → Customer)
2. **Smart Order Routing** — auto-detect urban vs semi-urban, route through nearest local hub
3. **Delivery Agent Assignment** — agents belong to hubs, auto-assigned on dispatch
4. **Map View** — show multi-hop routes on an interactive map
5. **Live Tracking** — tracking page auto-polls every 5 seconds with rich status stepper

---

## The Operational Model (important — read this first)

### Two types of hubs:
- **Main Hub** — located in major metros (Mumbai, Delhi, Bangalore etc.). All vendor orders arrive here first.
- **Local Hub** — located in smaller towns (Nashik, Mysore, Coimbatore etc.). Receives batches from main hub and handles last-mile in surrounding semi-urban/rural areas.

### Two types of delivery agents:
- **Line Haul Agent** — moves parcels from main hub → local hub (truck/van drivers, inter-city)
- **Last Mile Agent** — based at a local hub or main hub, does doorstep delivery within ~40km radius

### Routing logic:
- If delivery city is a **Main Hub city** → direct delivery (urban), no local hub needed
- If delivery city is **not** a Main Hub city → find the nearest local hub → route through it (semi-urban)

### Order status flow for semi-urban orders:
```
PENDING → CONFIRMED → AT_MAIN_HUB → IN_TRANSIT_TO_LOCAL_HUB → AT_LOCAL_HUB → OUT_FOR_DELIVERY → DELIVERED
```

### Order status flow for urban (direct) orders:
```
PENDING → CONFIRMED → AT_MAIN_HUB → OUT_FOR_DELIVERY → DELIVERED
```

---

## DB Changes

Replace/extend the existing Prisma schema with these new models.
Add them to `prisma/schema.prisma`:

```prisma
model Hub {
  id        String   @id @default(cuid())
  name      String
  city      String
  type      String   // "MAIN" | "LOCAL"
  parentId  String?  // for LOCAL hubs: ID of their parent MAIN hub
  lat       Float
  lng       Float

  agents    DeliveryAgent[]
  orders    Order[]          @relation("assignedHub")
}

model DeliveryAgent {
  id          String  @id @default(cuid())
  name        String
  phone       String
  vehicle     String  // "BIKE" | "VAN" | "TRUCK"
  agentType   String  // "LAST_MILE" | "LINE_HAUL"
  isAvailable Boolean @default(true)
  hubId       String
  hub         Hub     @relation(fields: [hubId], references: [id])

  orders Order[]
}
```

Also update the `Order` model — add these fields:
```prisma
  agentId       String?
  agent         DeliveryAgent? @relation(fields: [agentId], references: [id])
  assignedHubId String?
  assignedHub   Hub?           @relation("assignedHub", fields: [assignedHubId], references: [id])
  isUrban       Boolean        @default(true)  // false = semi-urban, routed via local hub
```

Run: `npx prisma migrate dev --name phase2_hubs_agents`

---

## Seed Data

Create `prisma/seed.ts` — run once with `npx ts-node prisma/seed.ts`

```typescript
import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  // ── MAIN HUBS ──────────────────────────────────────────────────────
  const mumbai = await prisma.hub.create({ data: {
    name: 'Mumbai Main Hub', city: 'Mumbai', type: 'MAIN', lat: 19.0760, lng: 72.8777
  }})
  const delhi = await prisma.hub.create({ data: {
    name: 'Delhi Main Hub', city: 'Delhi', type: 'MAIN', lat: 28.6139, lng: 77.2090
  }})
  const bangalore = await prisma.hub.create({ data: {
    name: 'Bangalore Main Hub', city: 'Bangalore', type: 'MAIN', lat: 12.9716, lng: 77.5946
  }})
  const chennai = await prisma.hub.create({ data: {
    name: 'Chennai Main Hub', city: 'Chennai', type: 'MAIN', lat: 13.0827, lng: 80.2707
  }})

  // ── LOCAL HUBS (children of main hubs) ───────────────────────────
  const nashik = await prisma.hub.create({ data: {
    name: 'Nashik Local Hub', city: 'Nashik', type: 'LOCAL', parentId: mumbai.id,
    lat: 19.9975, lng: 73.7898
  }})
  const aurangabad = await prisma.hub.create({ data: {
    name: 'Aurangabad Local Hub', city: 'Aurangabad', type: 'LOCAL', parentId: mumbai.id,
    lat: 19.8762, lng: 75.3433
  }})
  const mysore = await prisma.hub.create({ data: {
    name: 'Mysore Local Hub', city: 'Mysore', type: 'LOCAL', parentId: bangalore.id,
    lat: 12.2958, lng: 76.6394
  }})
  const hubli = await prisma.hub.create({ data: {
    name: 'Hubli Local Hub', city: 'Hubli', type: 'LOCAL', parentId: bangalore.id,
    lat: 15.3647, lng: 75.1240
  }})
  const coimbatore = await prisma.hub.create({ data: {
    name: 'Coimbatore Local Hub', city: 'Coimbatore', type: 'LOCAL', parentId: chennai.id,
    lat: 11.0168, lng: 76.9558
  }})
  const agra = await prisma.hub.create({ data: {
    name: 'Agra Local Hub', city: 'Agra', type: 'LOCAL', parentId: delhi.id,
    lat: 27.1767, lng: 78.0081
  }})

  // ── DELIVERY AGENTS ───────────────────────────────────────────────
  const agents = [
    // Mumbai Main Hub - Line Haul (truck drivers to local hubs)
    { name: 'Ravi Patil',    phone: '9100000001', vehicle: 'TRUCK', agentType: 'LINE_HAUL', hubId: mumbai.id },
    { name: 'Suresh More',   phone: '9100000002', vehicle: 'VAN',   agentType: 'LINE_HAUL', hubId: mumbai.id },
    // Mumbai Main Hub - Last Mile (urban Mumbai delivery)
    { name: 'Amit Shah',     phone: '9100000003', vehicle: 'BIKE',  agentType: 'LAST_MILE', hubId: mumbai.id },
    { name: 'Priya Joshi',   phone: '9100000004', vehicle: 'BIKE',  agentType: 'LAST_MILE', hubId: mumbai.id },
    // Nashik Local Hub - Last Mile
    { name: 'Ganesh Wagh',   phone: '9100000005', vehicle: 'BIKE',  agentType: 'LAST_MILE', hubId: nashik.id },
    { name: 'Sunita Bhosle', phone: '9100000006', vehicle: 'BIKE',  agentType: 'LAST_MILE', hubId: nashik.id },
    // Aurangabad Local Hub - Last Mile
    { name: 'Raj Deshmukh',  phone: '9100000007', vehicle: 'BIKE',  agentType: 'LAST_MILE', hubId: aurangabad.id },
    // Delhi Main Hub
    { name: 'Vikram Singh',  phone: '9100000008', vehicle: 'TRUCK', agentType: 'LINE_HAUL', hubId: delhi.id },
    { name: 'Neha Gupta',    phone: '9100000009', vehicle: 'BIKE',  agentType: 'LAST_MILE', hubId: delhi.id },
    // Agra Local Hub
    { name: 'Ramesh Yadav',  phone: '9100000010', vehicle: 'BIKE',  agentType: 'LAST_MILE', hubId: agra.id },
    // Bangalore Main Hub
    { name: 'Kiran Reddy',   phone: '9100000011', vehicle: 'TRUCK', agentType: 'LINE_HAUL', hubId: bangalore.id },
    { name: 'Deepa Nair',    phone: '9100000012', vehicle: 'BIKE',  agentType: 'LAST_MILE', hubId: bangalore.id },
    // Mysore Local Hub
    { name: 'Arjun Kumar',   phone: '9100000013', vehicle: 'BIKE',  agentType: 'LAST_MILE', hubId: mysore.id },
    // Chennai Main Hub
    { name: 'Murugan S',     phone: '9100000014', vehicle: 'BIKE',  agentType: 'LAST_MILE', hubId: chennai.id },
    // Coimbatore Local Hub
    { name: 'Kavitha R',     phone: '9100000015', vehicle: 'BIKE',  agentType: 'LAST_MILE', hubId: coimbatore.id },
  ]

  for (const agent of agents) {
    await prisma.deliveryAgent.create({ data: agent })
  }

  console.log('Hubs and agents seeded!')
}

main().finally(() => prisma.$disconnect())
```

---

## Routing Logic (Backend)

Create `src/utils/routing.ts`:

```typescript
import { prisma } from '../lib/prisma'

// Cities that have a Main Hub — direct urban delivery
const MAIN_HUB_CITIES = ['Mumbai', 'Delhi', 'Bangalore', 'Chennai', 'Hyderabad', 'Kolkata', 'Pune']

function isMainHubCity(city: string) {
  return MAIN_HUB_CITIES.some(c => city.toLowerCase().includes(c.toLowerCase()))
}

function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = Math.sin(dLat/2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng/2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

// City coordinates for distance calculation
const CITY_COORDS: Record<string, [number, number]> = {
  'mumbai': [19.0760, 72.8777], 'delhi': [28.6139, 77.2090],
  'bangalore': [12.9716, 77.5946], 'chennai': [13.0827, 80.2707],
  'pune': [18.5204, 73.8567], 'hyderabad': [17.3850, 78.4867],
  'nashik': [19.9975, 73.7898], 'aurangabad': [19.8762, 75.3433],
  'mysore': [12.2958, 76.6394], 'hubli': [15.3647, 75.1240],
  'coimbatore': [11.0168, 76.9558], 'agra': [27.1767, 78.0081],
}

function getCityCoords(city: string): [number, number] | null {
  const key = Object.keys(CITY_COORDS).find(k => city.toLowerCase().includes(k))
  return key ? CITY_COORDS[key] : null
}

export async function resolveRoute(pickupCity: string, deliveryCity: string) {
  // Find main hub for pickup city
  const mainHub = await prisma.hub.findFirst({
    where: { type: 'MAIN', city: { contains: pickupCity, mode: 'insensitive' } }
  }) || await prisma.hub.findFirst({ where: { type: 'MAIN' } }) // fallback to any main hub

  const isUrban = isMainHubCity(deliveryCity)

  if (isUrban) {
    // Urban: route directly via main hub
    return { isUrban: true, mainHub, localHub: null }
  }

  // Semi-urban: find nearest local hub
  const localHubs = await prisma.hub.findMany({ where: { type: 'LOCAL' } })
  const deliveryCoords = getCityCoords(deliveryCity)

  let nearestLocalHub = localHubs[0]

  if (deliveryCoords) {
    let minDist = Infinity
    for (const hub of localHubs) {
      const dist = haversineDistance(deliveryCoords[0], deliveryCoords[1], hub.lat, hub.lng)
      if (dist < minDist) { minDist = dist; nearestLocalHub = hub }
    }
  }

  return { isUrban: false, mainHub, localHub: nearestLocalHub }
}
```

---

## Updated Order Creation

In `src/routes/orders.ts`, update the POST /orders handler to call `resolveRoute`:

```typescript
import { resolveRoute } from '../utils/routing'

// Inside POST /api/orders:
const { isUrban, mainHub, localHub } = await resolveRoute(
  req.body.pickupCity,
  req.body.deliveryCity
)

const order = await prisma.order.create({
  data: {
    ...req.body,
    vendorId: req.vendor.id,
    isUrban,
    assignedHubId: mainHub?.id || null,
    status: 'PENDING',
  }
})
```

---

## New API Endpoints

### POST `/api/orders/:id/dispatch`
Auto-assigns an agent and sets status to CONFIRMED.

```typescript
app.post('/api/orders/:id/dispatch', flexAuth, async (req, res) => {
  const order = await prisma.order.findFirst({
    where: { id: req.params.id, vendorId: req.vendor.id },
    include: { assignedHub: true }
  })
  if (!order) return res.status(404).json({ error: 'Order not found' })

  // For urban: find last-mile agent at main hub
  // For semi-urban: find line-haul agent at main hub (they'll move it to local hub first)
  const agentType = order.isUrban ? 'LAST_MILE' : 'LINE_HAUL'

  const agent = await prisma.deliveryAgent.findFirst({
    where: {
      hubId: order.assignedHubId!,
      agentType,
      isAvailable: true
    }
  })

  if (!agent) return res.status(400).json({ error: 'No agents available' })

  const updated = await prisma.order.update({
    where: { id: order.id },
    data: { agentId: agent.id, status: 'CONFIRMED' },
    include: { agent: true, assignedHub: true }
  })

  res.json(updated)
})
```

### GET `/api/orders/:id` — update to include hub and agent
```typescript
include: { agent: { include: { hub: true } }, assignedHub: true }
```

### GET `/api/hubs` — for map view (no auth needed)
```typescript
app.get('/api/hubs', async (req, res) => {
  const hubs = await prisma.hub.findMany()
  res.json(hubs)
})
```

### GET `/api/orders/map-data` — requires JWT, returns all orders with coordinates
```typescript
app.get('/api/orders/map-data', flexAuth, async (req, res) => {
  const orders = await prisma.order.findMany({
    where: { vendorId: req.vendor.id },
    include: { assignedHub: true },
    orderBy: { createdAt: 'desc' }
  })
  res.json(orders)
})
```

---

## Frontend — Map View Page (`/map`)

### Install Leaflet
```bash
cd frontend
npm install leaflet react-leaflet
npm install -D @types/leaflet
```

### City Coordinates Util (`src/utils/cityCoords.ts`)
```typescript
export const cityCoords: Record<string, [number, number]> = {
  'mumbai': [19.0760, 72.8777], 'delhi': [28.6139, 77.2090],
  'bangalore': [12.9716, 77.5946], 'chennai': [13.0827, 80.2707],
  'pune': [18.5204, 73.8567], 'hyderabad': [17.3850, 78.4867],
  'kolkata': [22.5726, 88.3639], 'nashik': [19.9975, 73.7898],
  'aurangabad': [19.8762, 75.3433], 'mysore': [12.2958, 76.6394],
  'hubli': [15.3647, 75.1240], 'coimbatore': [11.0168, 76.9558],
  'agra': [27.1767, 78.0081],
}

export const getCoords = (city: string): [number, number] => {
  const key = Object.keys(cityCoords).find(k => city.toLowerCase().includes(k))
  return key ? cityCoords[key] : [20.5937, 78.9629]
}
```

### Map View (`src/pages/MapView.tsx`)

Full-page map showing:

**Hub markers:**
- Main Hubs → large blue circle marker with label
- Local Hubs → medium orange circle marker with label
- Draw a grey dashed line between each local hub and its parent main hub (shows the hub network)

**Order markers:**
- Urban order pickup → green pin, delivery → green pin, green line between them (direct route)
- Semi-urban order pickup → blue pin, delivery → red pin
  - Draw route: pickup → (via assigned main hub) → (via local hub) → delivery
  - Two-segment polyline: pickup→main hub (blue), main hub→local hub (orange), local hub→delivery (red dashed)

**Map setup:**
```tsx
import { MapContainer, TileLayer, Marker, Popup, Polyline, CircleMarker } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'

// Center of India, zoom 5
<MapContainer center={[20.5937, 78.9629]} zoom={5} style={{ height: 'calc(100vh - 64px)' }}>
  <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
  {/* Render hubs, then order routes */}
</MapContainer>
```

**Legend card** (absolute top-right, MUI Paper):
```
🔵 Main Hub    🟠 Local Hub
🟢 Urban Order Route
🔵→🟠→🔴 Semi-Urban Route
```

**Popup on each order pin:**
- Order ID (truncated), Customer Name, Status chip, City, Urban/Semi-Urban badge

---

## Frontend — Order Detail Page Updates

### Dispatch Button
Show "Dispatch Order" button when status is PENDING:
- On click → POST `/api/orders/:id/dispatch`
- On success → show snackbar "Agent assigned!" and refetch order

### Agent Info Card (show after dispatch)
```
┌──────────────────────────────────────────┐
│  🏍️  Assigned Agent                       │
│                                           │
│  Ravi Patil                               │
│  📞 9100000001  •  🚛 LINE HAUL           │
│  Hub: Mumbai Main Hub                     │
└──────────────────────────────────────────┘
```

### Route Info Banner (show always)
```
┌──────────────────────────────────────────────────────┐
│  📦 Delivery Route                                    │
│                                                       │
│  URBAN ORDER                                          │
│  Mumbai Main Hub → Customer (direct)                  │
│                                                       │
│  — or for semi-urban —                               │
│                                                       │
│  SEMI-URBAN ORDER                                     │
│  Mumbai Main Hub → Nashik Local Hub → Customer        │
└──────────────────────────────────────────────────────┘
```

Use MUI `Alert` with `severity="info"` for urban and `severity="warning"` for semi-urban.
Show the actual hub names from the order data.

---

## Frontend — Public Tracking Page Updates

### Auto-Polling (every 5 seconds)
```typescript
useEffect(() => {
  const fetch = async () => {
    const res = await axios.get(`/api/tracking/${token}`)
    setOrder(res.data)
  }
  fetch()
  const interval = setInterval(fetch, 5000)
  return () => clearInterval(interval)
}, [token])
```

### LIVE Badge
```tsx
<Chip label="● LIVE" size="small" color="error"
  sx={{ fontWeight: 700, animation: 'pulse 1.5s infinite' }} />
```

### Status Stepper

**For urban orders** — 5 steps:
```
Order Placed → Confirmed → At Main Hub → Out for Delivery → Delivered
```

**For semi-urban orders** — 7 steps:
```
Order Placed → Confirmed → At Main Hub → In Transit to Local Hub → At Local Hub → Out for Delivery → Delivered
```

Detect which stepper to show using `order.isUrban`.

```typescript
const urbanSteps    = ['PENDING','CONFIRMED','AT_MAIN_HUB','OUT_FOR_DELIVERY','DELIVERED']
const semiUrbanSteps = ['PENDING','CONFIRMED','AT_MAIN_HUB','IN_TRANSIT_TO_LOCAL_HUB','AT_LOCAL_HUB','OUT_FOR_DELIVERY','DELIVERED']

const steps = order.isUrban ? urbanSteps : semiUrbanSteps
const activeStep = steps.indexOf(order.status)
```

Use MUI `Stepper` with `alternativeLabel`. Completed steps show green check icon. Current step shows animated blue dot.

### Route Path on Tracking Page
Below the stepper, show a simple route visual:

**Urban:**
```
📦 Mumbai Hub  ──────────────────→  🏠 Customer
```

**Semi-Urban:**
```
📦 Mumbai Hub  ──→  🏭 Nashik Hub  ──→  🏠 Customer
```

Build this with MUI Box + Divider or just flex with icons and arrows. Keep it simple but visual.

---

## Updated Status Update Endpoint (for demo)

The existing `PUT /api/orders/:id/status` stays as is. On the Order Detail page,
add a dropdown so you can manually walk through statuses during the presentation:

```
[PENDING → CONFIRMED → AT_MAIN_HUB → IN_TRANSIT_TO_LOCAL_HUB → AT_LOCAL_HUB → OUT_FOR_DELIVERY → DELIVERED]
```

Show only the statuses relevant to the order type (urban vs semi-urban).

---

## Build Order for Phase 2

1. DB: add Hub + DeliveryAgent models → migrate → run seed
2. Backend: add routing util → update order creation to auto-resolve route
3. Backend: add /dispatch endpoint, update GET /orders/:id to include hub + agent
4. Backend: add /hubs and /orders/map-data endpoints
5. Frontend: install Leaflet → build MapView page → add "Route Map" to sidebar
6. Frontend: update Order Detail → dispatch button + agent card + route banner
7. Frontend: update Tracking page → polling + dual stepper + route path visual

---

## Demo Script (60 seconds)

1. **Create a semi-urban order** — delivery city: "Nashik" (not a metro)
2. Open Order Detail — show the **Route Banner**: "Mumbai Main Hub → Nashik Local Hub → Customer"
3. Click **Dispatch Order** — show agent assigned (line haul agent, Mumbai hub)
4. Open **Route Map** — show the two-hop route on the map: blue line to Nashik hub, red dashed line to delivery pin
5. Use the status dropdown to advance: AT_MAIN_HUB → IN_TRANSIT_TO_LOCAL_HUB → AT_LOCAL_HUB
6. Open the **public tracking link** in another tab — show the semi-urban stepper updating live, route path below it
7. Say: *"This is what the customer in Nashik sees — exactly where their parcel is in the hub network, updating in real time."*
