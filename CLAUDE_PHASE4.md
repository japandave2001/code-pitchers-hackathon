# CLAUDE_PHASE4.md — SwiftDrop Phase 4: Dynamic Pricing Engine

## Context

Phases 1, 2, 3 are done:
- Phase 1: Vendor auth, order intake (UI + API)
- Phase 2: Hub & spoke routing, agent assignment, map view
- Phase 3: Live GPS tracking, agent view page

This phase adds a **dynamic pricing engine** — every order gets a price calculated
based on zone, weight, priority, and delivery type. Vendors see a live price
calculator on the Create Order form before submitting.

---

## How Pricing Works (The Full Model)

### Step 1 — Detect Zone

Compare pickup city and delivery city to determine the delivery zone.

| Zone | Condition | Example |
|------|-----------|---------|
| LOCAL | Same city | Mumbai → Mumbai |
| ZONAL | Different city, same state | Mumbai → Pune |
| METRO | Different state, both metro cities | Mumbai → Delhi |
| NATIONAL | Different state, one or both non-metro | Mumbai → Nashik (Nashik is non-metro) |

Semi-urban orders (already detected in Phase 2 via `isUrban`) get an additional surcharge on top of their zone price — they're always ZONAL or NATIONAL since they go through a local hub.

---

### Step 2 — Base Zone Rate (covers first 500g)

| Zone | Base Rate |
|------|-----------|
| LOCAL | ₹35 |
| ZONAL | ₹65 |
| METRO | ₹90 |
| NATIONAL | ₹120 |

---

### Step 3 — Weight Charge

Weight above the first 500g is charged in 500g slabs.

Chargeable weight = `max(actualWeight, volumetricWeight)`

Volumetric weight = `(length × breadth × height) / 5000` (dimensions in cm)
If no dimensions provided, use actual weight only.

Extra slabs = `Math.ceil((chargeableWeight - 0.5) / 0.5)` if chargeableWeight > 0.5kg, else 0

| Zone | Per 500g slab |
|------|--------------|
| LOCAL | ₹10 |
| ZONAL | ₹15 |
| METRO | ₹20 |
| NATIONAL | ₹25 |

---

### Step 4 — Semi-Urban Surcharge

If `isUrban === false` (order routes through a local hub), add a flat surcharge:

| Zone | Semi-Urban Surcharge |
|------|---------------------|
| ZONAL | ₹30 |
| NATIONAL | ₹50 |

Urban orders: ₹0 surcharge.

---

### Step 5 — Priority Multiplier

Applied to (base + weight + surcharge) subtotal:

| Priority | Multiplier |
|----------|------------|
| STANDARD | 1.0× |
| EXPRESS | 1.5× |
| SAME_DAY | 2.0× |

---

### Step 6 — Fuel Surcharge

A flat 5% added on the final amount after priority multiplier.
Standard in all logistics — covers variable fuel costs.

---

### Final Formula

```
chargeableWeight = max(actualWeight, volumetricWeight)
extraSlabs       = max(0, ceil((chargeableWeight - 0.5) / 0.5))

subtotal = zoneBaseRate
         + (extraSlabs × zonePerSlabRate)
         + semiUrbanSurcharge

afterPriority = subtotal × priorityMultiplier

finalPrice = afterPriority × 1.05   ← fuel surcharge
```

---

### Example Calculations

**Example 1 — Urban, same city, light parcel:**
- Mumbai → Mumbai, 0.4kg, Standard
- Zone: LOCAL, base ₹35, no extra slabs, no surcharge
- After priority (1x): ₹35
- Fuel surcharge: ₹35 × 1.05 = **₹36.75 → rounded to ₹37**

**Example 2 — Semi-urban, same state, heavier parcel, Express:**
- Mumbai → Nashik, 1.2kg, Express
- Zone: ZONAL (different city, same state — Maharashtra)
- Base: ₹65
- Extra slabs: ceil((1.2 - 0.5) / 0.5) = ceil(1.4) = 2 slabs × ₹15 = ₹30
- Semi-urban surcharge: ₹30 (isUrban = false)
- Subtotal: ₹65 + ₹30 + ₹30 = ₹125
- Priority Express (1.5x): ₹187.50
- Fuel (5%): **₹196.88 → rounded to ₹197**

**Example 3 — Metro to metro, 2kg, Same Day:**
- Mumbai → Delhi, 2kg, Same Day
- Zone: METRO
- Base: ₹90
- Extra slabs: ceil((2 - 0.5) / 0.5) = 3 slabs × ₹20 = ₹60
- No semi-urban surcharge (both metros, isUrban = true)
- Subtotal: ₹150
- Priority Same Day (2x): ₹300
- Fuel (5%): **₹315**

---

## City → State Mapping (for zone detection)

Create `src/utils/pricing.ts` on the backend:

```typescript
const CITY_STATE: Record<string, string> = {
  // Maharashtra
  'mumbai': 'maharashtra', 'pune': 'maharashtra', 'nashik': 'maharashtra',
  'aurangabad': 'maharashtra', 'nagpur': 'maharashtra', 'thane': 'maharashtra',
  // Delhi / NCR
  'delhi': 'delhi', 'new delhi': 'delhi', 'gurgaon': 'haryana', 'noida': 'uttar pradesh',
  'agra': 'uttar pradesh', 'lucknow': 'uttar pradesh',
  // Karnataka
  'bangalore': 'karnataka', 'mysore': 'karnataka', 'hubli': 'karnataka',
  // Tamil Nadu
  'chennai': 'tamil nadu', 'coimbatore': 'tamil nadu', 'madurai': 'tamil nadu',
  // Telangana
  'hyderabad': 'telangana', 'warangal': 'telangana',
  // West Bengal
  'kolkata': 'west bengal',
  // Gujarat
  'ahmedabad': 'gujarat', 'surat': 'gujarat', 'vadodara': 'gujarat',
  // Rajasthan
  'jaipur': 'rajasthan', 'jodhpur': 'rajasthan',
}

const METRO_CITIES = ['mumbai', 'delhi', 'bangalore', 'chennai', 'hyderabad', 'kolkata', 'pune', 'ahmedabad']

function getState(city: string): string | null {
  const key = Object.keys(CITY_STATE).find(k => city.toLowerCase().includes(k))
  return key ? CITY_STATE[key] : null
}

function isMetro(city: string): boolean {
  return METRO_CITIES.some(m => city.toLowerCase().includes(m))
}

export function detectZone(pickupCity: string, deliveryCity: string): string {
  const p = pickupCity.toLowerCase()
  const d = deliveryCity.toLowerCase()

  if (p === d || p.includes(d) || d.includes(p)) return 'LOCAL'

  const pState = getState(pickupCity)
  const dState = getState(deliveryCity)

  if (pState && dState && pState === dState) return 'ZONAL'

  if (isMetro(pickupCity) && isMetro(deliveryCity)) return 'METRO'

  return 'NATIONAL'
}
```

---

## Pricing Calculation Function

```typescript
// src/utils/pricing.ts (continued)

const ZONE_BASE: Record<string, number> = {
  LOCAL: 35, ZONAL: 65, METRO: 90, NATIONAL: 120
}

const ZONE_PER_SLAB: Record<string, number> = {
  LOCAL: 10, ZONAL: 15, METRO: 20, NATIONAL: 25
}

const SEMI_URBAN_SURCHARGE: Record<string, number> = {
  LOCAL: 0, ZONAL: 30, METRO: 0, NATIONAL: 50
}

const PRIORITY_MULTIPLIER: Record<string, number> = {
  STANDARD: 1.0, EXPRESS: 1.5, SAME_DAY: 2.0
}

export function calculatePrice(params: {
  pickupCity: string
  deliveryCity: string
  weight: number           // in kg
  dimensions?: string      // "LxBxH" in cm e.g. "30x20x10"
  priority: string
  isUrban: boolean
}) {
  const { pickupCity, deliveryCity, weight, dimensions, priority, isUrban } = params

  // Zone
  const zone = detectZone(pickupCity, deliveryCity)

  // Chargeable weight
  let volumetricWeight = 0
  if (dimensions) {
    const parts = dimensions.split('x').map(Number)
    if (parts.length === 3) {
      volumetricWeight = (parts[0] * parts[1] * parts[2]) / 5000
    }
  }
  const chargeableWeight = Math.max(weight, volumetricWeight)

  // Extra weight slabs
  const extraSlabs = chargeableWeight > 0.5
    ? Math.ceil((chargeableWeight - 0.5) / 0.5)
    : 0

  // Base + weight + surcharge
  const baseRate = ZONE_BASE[zone]
  const weightCharge = extraSlabs * ZONE_PER_SLAB[zone]
  const surcharge = isUrban ? 0 : (SEMI_URBAN_SURCHARGE[zone] || 0)
  const subtotal = baseRate + weightCharge + surcharge

  // Priority
  const multiplier = PRIORITY_MULTIPLIER[priority] || 1.0
  const afterPriority = subtotal * multiplier

  // Fuel surcharge (5%)
  const fuelSurcharge = afterPriority * 0.05
  const total = Math.round(afterPriority + fuelSurcharge)

  return {
    zone,
    chargeableWeight: Math.round(chargeableWeight * 100) / 100,
    baseRate,
    weightCharge,
    surcharge,
    priorityMultiplier: multiplier,
    fuelSurcharge: Math.round(fuelSurcharge),
    total,
    breakdown: {
      base: baseRate,
      weight: weightCharge,
      semiUrbanSurcharge: surcharge,
      subtotal,
      afterPriority: Math.round(afterPriority),
      fuelSurcharge: Math.round(fuelSurcharge),
      total,
    }
  }
}
```

---

## DB Changes

Add pricing fields to the `Order` model in `prisma/schema.prisma`:

```prisma
// Add to Order model:
zone              String?   // LOCAL | ZONAL | METRO | NATIONAL
chargeableWeight  Float?
baseRate          Float?
weightCharge      Float?
surcharge         Float?
priorityMultiplier Float?
fuelSurcharge     Float?
totalPrice        Float?    // final price charged to vendor
```

Run: `npx prisma migrate dev --name phase4_pricing`

---

## Backend Changes

### 1. New public pricing endpoint (no auth — used by frontend calculator)

```typescript
// POST /api/pricing/calculate
app.post('/api/pricing/calculate', async (req, res) => {
  const { pickupCity, deliveryCity, weight, dimensions, priority } = req.body

  if (!pickupCity || !deliveryCity || !weight || !priority) {
    return res.status(400).json({ error: 'Missing required fields' })
  }

  // Detect isUrban using same logic as routing util
  const MAIN_HUB_CITIES = ['Mumbai','Delhi','Bangalore','Chennai','Hyderabad','Kolkata','Pune']
  const isUrban = MAIN_HUB_CITIES.some(c =>
    deliveryCity.toLowerCase().includes(c.toLowerCase())
  )

  const result = calculatePrice({ pickupCity, deliveryCity, weight, dimensions, priority, isUrban })
  res.json(result)
})
```

### 2. Update order creation to save price

In `POST /api/orders`, after resolving route, calculate price and save it:

```typescript
import { calculatePrice } from '../utils/pricing'

// Inside POST /api/orders handler:
const { isUrban, mainHub, localHub } = await resolveRoute(body.pickupCity, body.deliveryCity)

const pricing = calculatePrice({
  pickupCity: body.pickupCity,
  deliveryCity: body.deliveryCity,
  weight: body.weight,
  dimensions: body.dimensions,
  priority: body.priority || 'STANDARD',
  isUrban,
})

const order = await prisma.order.create({
  data: {
    ...body,
    vendorId: req.vendor.id,
    isUrban,
    assignedHubId: mainHub?.id || null,
    zone: pricing.zone,
    chargeableWeight: pricing.chargeableWeight,
    baseRate: pricing.baseRate,
    weightCharge: pricing.weightCharge,
    surcharge: pricing.surcharge,
    priorityMultiplier: pricing.priorityMultiplier,
    fuelSurcharge: pricing.fuelSurcharge,
    totalPrice: pricing.total,
  }
})
```

---

## Frontend — Live Price Calculator on Create Order Form

### How it works

The Create Order form (Phase 1, stepper) already has pickup city, delivery city, weight, dimensions, and priority fields spread across 3 steps.

Add a **persistent price card** that shows at the bottom of every step, updates in real time as the user fills in fields. As soon as all required pricing fields are filled (pickup city, delivery city, weight, priority), it calls the backend and shows the price breakdown.

### Price Card Component (`src/components/PriceCalculator.tsx`)

```tsx
import { useEffect, useState } from 'react'
import { Box, Card, CardContent, Typography, Divider, Chip, CircularProgress } from '@mui/material'
import api from '../api/axios'

interface Props {
  pickupCity: string
  deliveryCity: string
  weight: number | ''
  dimensions: string
  priority: string
}

export function PriceCalculator({ pickupCity, deliveryCity, weight, dimensions, priority }: Props) {
  const [pricing, setPricing] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!pickupCity || !deliveryCity || !weight || !priority) {
      setPricing(null)
      return
    }

    const timer = setTimeout(async () => {
      setLoading(true)
      try {
        const res = await api.post('/pricing/calculate', {
          pickupCity, deliveryCity,
          weight: Number(weight),
          dimensions: dimensions || undefined,
          priority,
        })
        setPricing(res.data)
      } catch {
        setPricing(null)
      } finally {
        setLoading(false)
      }
    }, 500) // debounce 500ms

    return () => clearTimeout(timer)
  }, [pickupCity, deliveryCity, weight, dimensions, priority])

  if (!pickupCity || !deliveryCity || !weight) return null

  return (
    <Card variant="outlined" sx={{ mt: 2, borderColor: 'primary.main', borderWidth: 1.5 }}>
      <CardContent>
        <Typography variant="subtitle2" color="primary" fontWeight={700} gutterBottom>
          Estimated Shipping Cost
        </Typography>

        {loading && <CircularProgress size={20} />}

        {pricing && !loading && (
          <>
            {/* Zone badge */}
            <Box sx={{ display: 'flex', gap: 1, mb: 1.5 }}>
              <Chip label={pricing.zone} size="small" color="primary" variant="outlined" />
              {pricing.zone === 'NATIONAL' || pricing.zone === 'ZONAL'
                ? <Chip label="Semi-Urban Route" size="small" color="warning" variant="outlined" />
                : <Chip label="Urban Direct" size="small" color="success" variant="outlined" />
              }
            </Box>

            {/* Breakdown */}
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
              <Row label={`Base rate (${pricing.zone})`} value={`₹${pricing.breakdown.base}`} />
              {pricing.breakdown.weight > 0 &&
                <Row label={`Weight charge (${pricing.chargeableWeight}kg)`} value={`₹${pricing.breakdown.weight}`} />
              }
              {pricing.breakdown.semiUrbanSurcharge > 0 &&
                <Row label="Semi-urban surcharge" value={`₹${pricing.breakdown.semiUrbanSurcharge}`} />
              }
              {pricing.priorityMultiplier > 1 &&
                <Row label={`Priority (${pricing.priorityMultiplier}×)`} value={`×${pricing.priorityMultiplier}`} />
              }
              <Row label="Fuel surcharge (5%)" value={`₹${pricing.breakdown.fuelSurcharge}`} />
            </Box>

            <Divider sx={{ my: 1 }} />

            {/* Total */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="subtitle1" fontWeight={700}>Total</Typography>
              <Typography variant="h5" fontWeight={800} color="primary">
                ₹{pricing.total}
              </Typography>
            </Box>

            <Typography variant="caption" color="text.secondary">
              Chargeable weight: {pricing.chargeableWeight}kg
              {pricing.chargeableWeight !== Number(weight) && ' (volumetric)'}
            </Typography>
          </>
        )}
      </CardContent>
    </Card>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
      <Typography variant="body2" color="text.secondary">{label}</Typography>
      <Typography variant="body2" fontWeight={600}>{value}</Typography>
    </Box>
  )
}
```

### Where to put it

In `CreateOrderPage.tsx`, render `<PriceCalculator />` at the bottom of the stepper
(outside the step content, always visible):

```tsx
<PriceCalculator
  pickupCity={formData.pickupCity}
  deliveryCity={formData.deliveryCity}
  weight={formData.weight}
  dimensions={formData.dimensions}
  priority={formData.priority}
/>
```

It debounces by 500ms so it doesn't spam the API on every keystroke.

---

## Frontend — Show Price on Order Detail and Order List

### Order Detail Page
Add a **Pricing Summary card** alongside the order info:

```
┌─────────────────────────────────┐
│  💰 Shipping Charges            │
│                                 │
│  Zone:         ZONAL            │
│  Base rate:    ₹65              │
│  Weight:       ₹30              │
│  Semi-urban:   ₹30              │
│  Priority:     ×1.5             │
│  Fuel:         ₹9               │
│  ─────────────────────────      │
│  Total:        ₹197             │
└─────────────────────────────────┘
```

Pull from `order.totalPrice`, `order.zone`, `order.baseRate` etc. (all stored in DB).

### Order List / Orders Table
Add a **"Charge" column** to the orders table showing `₹{order.totalPrice}`.

---

## Frontend — Pricing Page (`/pricing`)

Add a standalone pricing/calculator page accessible from the sidebar.
Vendors can use this to estimate costs before placing an order.

**Sidebar nav item:** "Price Calculator" with a CalculateIcon.

Simple form:
- Pickup City (text field)
- Delivery City (text field)
- Weight in kg (number field)
- Dimensions L×B×H (optional, text field)
- Priority (dropdown)

Below the form: the same `<PriceCalculator />` component showing live results.

Also show a **pricing table** below the calculator:

```
┌──────────────────────────────────────────────────────┐
│  Our Pricing Structure                                │
├──────────────┬──────────┬────────────┬───────────────┤
│  Zone        │ Base     │ Per 500g   │ Semi-urban +  │
├──────────────┼──────────┼────────────┼───────────────┤
│  Local       │ ₹35      │ ₹10        │ —             │
│  Zonal       │ ₹65      │ ₹15        │ ₹30           │
│  Metro       │ ₹90      │ ₹20        │ —             │
│  National    │ ₹120     │ ₹25        │ ₹50           │
├──────────────┴──────────┴────────────┴───────────────┤
│  Express: 1.5×  •  Same Day: 2×  •  Fuel: +5%       │
└──────────────────────────────────────────────────────┘
```

Use MUI Table component for this.

---

## Build Order for Phase 4

1. Backend: create `src/utils/pricing.ts` with `detectZone` and `calculatePrice`
2. Backend: add `POST /api/pricing/calculate` endpoint (public, no auth)
3. Backend: update `POST /api/orders` to call `calculatePrice` and save pricing fields
4. DB: add pricing fields to Order model → migrate
5. Frontend: build `PriceCalculator` component
6. Frontend: add PriceCalculator to CreateOrderPage (always visible at bottom)
7. Frontend: show pricing card on OrderDetail page
8. Frontend: add price column to Orders table
9. Frontend: build `/pricing` page with calculator + pricing table

---

## New Endpoints Summary (Phase 4)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/pricing/calculate` | None | Live price calculation |

That's it — one new endpoint. Everything else is stored at order creation time and read from the DB.

---

## Demo Script for Pricing

1. Open the **Price Calculator page** — show the pricing table to judges
2. Fill in: Mumbai → Nashik, 1.2kg, Express → watch the card update live
3. Show the breakdown: base + weight slab + semi-urban surcharge + priority multiplier + fuel
4. Say: *"Pricing is dynamic — same-state semi-urban costs more than local metro because it routes through a local hub. Express doubles the base. Vendors always know their cost before submitting."*
5. Then go to **Create Order** — fill in the same details, show the price card auto-updating at the bottom as they type
6. Submit the order — open Order Detail, show the saved pricing breakdown
