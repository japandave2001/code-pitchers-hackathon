# CLAUDE_PHASE3.md — SwiftDrop Phase 3: Live Agent Tracking

## Context

Phase 1 (order intake, auth) and Phase 2 (hub routing, agent assignment, map view) are done.

This phase adds:
1. **Agent View page** — a mobile-friendly page agents open on their phone to see their delivery and broadcast their GPS location
2. **Live location tracking** — vendor and customer both see the agent's moving pin on a map when status is OUT_FOR_DELIVERY
3. **Token-based agent auth** — no separate login for agents, just a unique link

---

## How Auth Works (Vendor vs Agent)

| | Vendor | Delivery Agent |
|---|---|---|
| Auth method | JWT (email + password login) | Unique `agentToken` in URL |
| Entry point | `/login` → dashboard | `/agent/:agentToken` direct link |
| Who generates it | Self-signup | Auto-generated when order dispatched |
| What they see | Full dashboard, all orders | Only their assigned delivery |

When an order is dispatched (Phase 2), the backend generates an `agentToken` and attaches it to the order. The vendor can copy this link from the Order Detail page and share it with the agent via WhatsApp/SMS.

---

## DB Changes

Add these fields to the `Order` model in `prisma/schema.prisma`:

```prisma
// Add to Order model:
agentToken    String?  @unique  // unique link token for agent access
agentLat      Float?            // agent's last known latitude
agentLng      Float?            // agent's last known longitude
agentLastSeen DateTime?         // when location was last updated
```

Run: `npx prisma migrate dev --name phase3_live_tracking`

---

## Backend Changes

### 1. Generate agentToken on dispatch

In the `/api/orders/:id/dispatch` handler (Phase 2), add agentToken generation:

```typescript
import { randomBytes } from 'crypto'

// Inside dispatch handler, when creating the updated order:
const updated = await prisma.order.update({
  where: { id: order.id },
  data: {
    agentId: agent.id,
    status: 'CONFIRMED',
    agentToken: randomBytes(16).toString('hex')  // add this
  },
  include: { agent: true, assignedHub: true }
})
```

### 2. Agent location update endpoint

No auth middleware — the agentToken in the URL IS the auth.

```typescript
// POST /api/agent/:agentToken/location
// Called by agent's browser every 4 seconds while delivering
app.post('/api/agent/:agentToken/location', async (req, res) => {
  const { lat, lng } = req.body

  const order = await prisma.order.findUnique({
    where: { agentToken: req.params.agentToken }
  })

  if (!order) return res.status(404).json({ error: 'Invalid agent token' })
  if (order.status !== 'OUT_FOR_DELIVERY') {
    return res.status(400).json({ error: 'Order is not out for delivery' })
  }

  await prisma.order.update({
    where: { id: order.id },
    data: { agentLat: lat, agentLng: lng, agentLastSeen: new Date() }
  })

  res.json({ success: true })
})
```

### 3. Get agent order details (for agent view page)

```typescript
// GET /api/agent/:agentToken
// Returns order info for the agent's delivery screen
app.get('/api/agent/:agentToken', async (req, res) => {
  const order = await prisma.order.findUnique({
    where: { agentToken: req.params.agentToken },
    include: { agent: true, assignedHub: true }
  })

  if (!order) return res.status(404).json({ error: 'Invalid link' })

  // Return only what the agent needs
  res.json({
    orderId: order.id,
    status: order.status,
    customerName: order.customerName,
    customerPhone: order.customerPhone,
    deliveryAddress: order.deliveryAddress,
    deliveryCity: order.deliveryCity,
    deliveryPincode: order.deliveryPincode,
    description: order.description,
    agentName: order.agent?.name,
    hubName: order.assignedHub?.name,
  })
})
```

### 4. Mark delivered (agent action)

```typescript
// PUT /api/agent/:agentToken/delivered
app.put('/api/agent/:agentToken/delivered', async (req, res) => {
  const order = await prisma.order.findUnique({
    where: { agentToken: req.params.agentToken }
  })

  if (!order) return res.status(404).json({ error: 'Invalid link' })

  await prisma.order.update({
    where: { id: order.id },
    data: { status: 'DELIVERED', deliveredAt: new Date() }
  })

  res.json({ success: true })
})
```

### 5. Get live agent location (for customer + vendor)

```typescript
// GET /api/tracking/:token/location
// Called by customer tracking page and vendor order detail every 4 seconds
app.get('/api/tracking/:token/location', async (req, res) => {
  const order = await prisma.order.findUnique({
    where: { trackingToken: req.params.token },
    select: { agentLat: true, agentLng: true, agentLastSeen: true, status: true }
  })

  if (!order) return res.status(404).json({ error: 'Not found' })

  res.json({
    lat: order.agentLat,
    lng: order.agentLng,
    lastSeen: order.agentLastSeen,
    isLive: order.status === 'OUT_FOR_DELIVERY' && order.agentLat !== null,
  })
})
```

---

## Frontend — Agent View Page (`/agent/:agentToken`)

### Route setup
This is a **public route** (no ProtectedRoute wrapper). Add to `App.tsx`:
```tsx
<Route path="/agent/:agentToken" element={<AgentView />} />
```

### AgentView.tsx

This page is designed for mobile (the agent's phone). Keep layout simple and large.

**On load:**
- Fetch `GET /api/agent/:agentToken` to get order details
- Show order info (customer name, address, phone)

**"Start Delivery" button:**
- Appears when status is `OUT_FOR_DELIVERY` (or vendor can update it from their side)
- On click: calls `navigator.geolocation.watchPosition()` to get live GPS
- Every position update → POST to `/api/agent/:agentToken/location`
- Button changes to "📍 Broadcasting Location..." with a pulsing green dot

**"Mark as Delivered" button:**
- Big green button at the bottom
- On click: PUT `/api/agent/:agentToken/delivered`
- On success: show "✅ Delivery Complete!" screen

**Map on agent page:**
- Small map (height: 250px) showing two markers:
  - Agent's current location (blue blinking dot)
  - Delivery destination (red pin)
- Draws a line between them

```tsx
// Geolocation setup
const startTracking = () => {
  if (!navigator.geolocation) return alert('Geolocation not supported')

  watchId.current = navigator.geolocation.watchPosition(
    async (position) => {
      const { latitude, longitude } = position.coords
      setAgentLocation([latitude, longitude])
      // Send to backend
      await axios.post(`/api/agent/${agentToken}/location`, {
        lat: latitude,
        lng: longitude
      })
    },
    (err) => console.error(err),
    { enableHighAccuracy: true, maximumAge: 0, timeout: 5000 }
  )
  setTracking(true)
}

// Cleanup on unmount
useEffect(() => {
  return () => {
    if (watchId.current) navigator.geolocation.clearWatch(watchId.current)
  }
}, [])
```

**Full page layout (mobile-first):**
```
┌─────────────────────────┐
│  ⚡ SwiftDrop             │
│  Your Delivery           │
├─────────────────────────┤
│  📦 Mobile Phone         │
│  Order #abc123           │
├─────────────────────────┤
│  🏠 Deliver To           │
│  Harsh Desai             │
│  📞 9876543210  [Call]   │
│  Flat 4B, Baner, Pune    │
├─────────────────────────┤
│  [Map: your loc → dest]  │
│  (height 250px)          │
├─────────────────────────┤
│  [📍 Start Broadcasting] │  ← green outlined button
│                          │
│  [✅ Mark as Delivered]  │  ← big green filled button
└─────────────────────────┘
```

Use MUI with `maxWidth: 480px`, centered. Large touch-friendly buttons (`size="large"`).

---

## Frontend — Customer Tracking Page Updates

When `order.status === 'OUT_FOR_DELIVERY'`, show a live map section above the stepper.

### Live Location Polling

```typescript
// Poll agent location every 4 seconds when OUT_FOR_DELIVERY
useEffect(() => {
  if (order?.status !== 'OUT_FOR_DELIVERY') return

  const pollLocation = async () => {
    const res = await axios.get(`/api/tracking/${token}/location`)
    if (res.data.isLive) {
      setAgentLocation([res.data.lat, res.data.lng])
    }
  }

  pollLocation()
  const interval = setInterval(pollLocation, 4000)
  return () => clearInterval(interval)
}, [order?.status])
```

### Live Map Section (only shown when OUT_FOR_DELIVERY)

```tsx
{order.status === 'OUT_FOR_DELIVERY' && (
  <Box sx={{ mb: 3 }}>
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
      <Typography variant="h6">Live Tracking</Typography>
      <Chip label="● LIVE" size="small" color="error"
        sx={{ fontWeight: 700, animation: 'pulse 1.5s infinite' }} />
    </Box>

    <MapContainer
      center={agentLocation || deliveryCoords}
      zoom={13}
      style={{ height: 300, borderRadius: 12 }}
    >
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

      {/* Agent marker — animated blue dot */}
      {agentLocation && (
        <CircleMarker center={agentLocation} radius={10}
          color="#1565C0" fillColor="#1565C0" fillOpacity={0.8}>
          <Popup>🏍️ Delivery Agent</Popup>
        </CircleMarker>
      )}

      {/* Delivery destination — red pin */}
      <Marker position={deliveryCoords}>
        <Popup>📦 Your delivery address</Popup>
      </Marker>

      {/* Line from agent to destination */}
      {agentLocation && (
        <Polyline positions={[agentLocation, deliveryCoords]}
          color="#FF6F00" dashArray="8" weight={2} />
      )}
    </MapContainer>

    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
      Your delivery agent is on the way. Map updates every few seconds.
    </Typography>
  </Box>
)}
```

---

## Frontend — Vendor Order Detail Updates

### Show Agent Link (copy to share with agent)

After dispatch, show a copyable agent link on the Order Detail page:

```tsx
<Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
  <Typography variant="body2" sx={{ flex: 1, fontFamily: 'monospace' }}>
    {`${window.location.origin}/agent/${order.agentToken}`}
  </Typography>
  <Tooltip title="Copied!" open={copied}>
    <IconButton onClick={() => {
      navigator.clipboard.writeText(`${window.location.origin}/agent/${order.agentToken}`)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }}>
      <ContentCopyIcon />
    </IconButton>
  </Tooltip>
</Box>
<Typography variant="caption" color="text.secondary">
  Share this link with the delivery agent
</Typography>
```

### Live Map on Vendor Order Detail

Same as customer tracking map above — vendor sees the agent's live location too.
Poll `GET /api/tracking/:trackingToken/location` every 4 seconds.
Show it in the Order Detail page when status is OUT_FOR_DELIVERY.

---

## Demo Script for Live Tracking (the most impressive part)

**Setup before demo (takes 2 mins):**
1. Create an order and dispatch it
2. Update status to OUT_FOR_DELIVERY
3. Copy the agent link from Order Detail
4. Open the agent link on your phone (or second browser tab)
5. Allow location permission when prompted

**During demo:**
1. Show the **customer tracking page** on main screen — map is waiting, LIVE badge pulsing
2. On your phone (or second tab), click **"Start Broadcasting"** on the Agent View
3. Watch the **blue dot appear on the customer's map** — the agent is now visible
4. Walk around the room with your phone — the dot moves on the customer's screen
5. Say: *"This is what the customer sees the moment their agent leaves the hub. Live location, updating every few seconds, right in the tracking link we sent them."*
6. Click **"Mark as Delivered"** on the phone — status updates to DELIVERED on the customer screen automatically (via the 5-second poll)

**For DevTools simulation (if no phone):**
Chrome DevTools → More Tools → Sensors → Location → set custom lat/lng
Change the values manually every few seconds — the dot will move on the map.

---

## Build Order for Phase 3

1. DB: add `agentToken`, `agentLat`, `agentLng`, `agentLastSeen` to Order → migrate
2. Backend: update dispatch to generate agentToken
3. Backend: add `GET /api/agent/:token`, `POST /api/agent/:token/location`, `PUT /api/agent/:token/delivered`
4. Backend: add `GET /api/tracking/:token/location`
5. Frontend: build AgentView page (mobile layout, geolocation, map)
6. Frontend: add agent link copy UI to Order Detail page
7. Frontend: add live map to Customer Tracking page (only when OUT_FOR_DELIVERY)
8. Frontend: add live map to Vendor Order Detail page
9. Add `/agent/:agentToken` as public route in App.tsx

---

## Summary of New Endpoints (Phase 3)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/agent/:agentToken` | Token in URL | Get order details for agent |
| POST | `/api/agent/:agentToken/location` | Token in URL | Agent sends GPS location |
| PUT | `/api/agent/:agentToken/delivered` | Token in URL | Agent marks delivered |
| GET | `/api/tracking/:token/location` | None | Customer/vendor polls agent location |
