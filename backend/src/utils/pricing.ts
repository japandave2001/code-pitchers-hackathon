// Phase 4 — dynamic pricing engine.
//
// Pure functions, no DB calls — keeps the same logic available to the
// /api/pricing/calculate endpoint, the order create handler, and the seed
// without any duplication.

const CITY_STATE: Record<string, string> = {
  // Maharashtra
  mumbai: 'maharashtra', pune: 'maharashtra', nashik: 'maharashtra',
  aurangabad: 'maharashtra', nagpur: 'maharashtra', thane: 'maharashtra',
  'navi mumbai': 'maharashtra',

  // Delhi / NCR
  delhi: 'delhi', 'new delhi': 'delhi',
  gurgaon: 'haryana', faridabad: 'haryana', chandigarh: 'haryana',
  ludhiana: 'punjab', amritsar: 'punjab',
  noida: 'uttar pradesh', agra: 'uttar pradesh', lucknow: 'uttar pradesh',
  varanasi: 'uttar pradesh', kanpur: 'uttar pradesh',

  // Karnataka
  bangalore: 'karnataka', mysore: 'karnataka', hubli: 'karnataka',
  mangalore: 'karnataka',

  // Tamil Nadu
  chennai: 'tamil nadu', coimbatore: 'tamil nadu', madurai: 'tamil nadu',
  trichy: 'tamil nadu', tirupur: 'tamil nadu',

  // Telangana / Andhra
  hyderabad: 'telangana', warangal: 'telangana',
  vijayawada: 'andhra pradesh', vizag: 'andhra pradesh', tirupati: 'andhra pradesh',

  // West Bengal
  kolkata: 'west bengal', siliguri: 'west bengal', durgapur: 'west bengal',

  // Gujarat
  ahmedabad: 'gujarat', surat: 'gujarat', vadodara: 'gujarat', rajkot: 'gujarat',

  // Rajasthan
  jaipur: 'rajasthan', jodhpur: 'rajasthan', udaipur: 'rajasthan',

  // Madhya Pradesh
  indore: 'madhya pradesh', bhopal: 'madhya pradesh',

  // Kerala
  kochi: 'kerala', trivandrum: 'kerala', kozhikode: 'kerala',

  // Bihar / Jharkhand / Odisha
  patna: 'bihar', gaya: 'bihar',
  ranchi: 'jharkhand', jamshedpur: 'jharkhand',
  bhubaneswar: 'odisha', cuttack: 'odisha',

  // Hill states / NE
  shimla: 'himachal pradesh',
  guwahati: 'assam',
  gangtok: 'sikkim',
  panipat: 'haryana',
}

const METRO_CITIES = [
  'mumbai', 'delhi', 'new delhi', 'bangalore', 'chennai',
  'hyderabad', 'kolkata', 'pune', 'ahmedabad',
]

function getState(city: string): string | null {
  const c = city.toLowerCase()
  // Prefer the longest match so "new delhi" beats "delhi".
  const matches = Object.keys(CITY_STATE).filter((k) => c.includes(k))
  if (matches.length === 0) return null
  matches.sort((a, b) => b.length - a.length)
  return CITY_STATE[matches[0]]
}

function isMetro(city: string): boolean {
  const c = city.toLowerCase()
  return METRO_CITIES.some((m) => c.includes(m))
}

export type Zone = 'LOCAL' | 'ZONAL' | 'METRO' | 'NATIONAL'

export function detectZone(pickupCity: string, deliveryCity: string): Zone {
  const p = pickupCity.trim().toLowerCase()
  const d = deliveryCity.trim().toLowerCase()
  if (!p || !d) return 'NATIONAL'
  if (p === d || p.includes(d) || d.includes(p)) return 'LOCAL'

  const pState = getState(pickupCity)
  const dState = getState(deliveryCity)
  if (pState && dState && pState === dState) return 'ZONAL'

  if (isMetro(pickupCity) && isMetro(deliveryCity)) return 'METRO'
  return 'NATIONAL'
}

const ZONE_BASE: Record<Zone, number> = {
  LOCAL: 35, ZONAL: 65, METRO: 90, NATIONAL: 120,
}

const ZONE_PER_SLAB: Record<Zone, number> = {
  LOCAL: 10, ZONAL: 15, METRO: 20, NATIONAL: 25,
}

const SEMI_URBAN_SURCHARGE: Record<Zone, number> = {
  LOCAL: 0, ZONAL: 30, METRO: 0, NATIONAL: 50,
}

const PRIORITY_MULTIPLIER: Record<string, number> = {
  STANDARD: 1.0, EXPRESS: 1.5, SAME_DAY: 2.0,
}

export interface PriceParams {
  pickupCity: string
  deliveryCity: string
  weight: number          // kg
  dimensions?: string     // "LxBxH" in cm; if missing, volumetric weight = 0
  priority: string
  isUrban: boolean
}

export interface PriceResult {
  zone: Zone
  chargeableWeight: number
  volumetricWeight: number
  baseRate: number
  weightCharge: number
  surcharge: number
  priorityMultiplier: number
  fuelSurcharge: number
  total: number
  breakdown: {
    base: number
    weight: number
    semiUrbanSurcharge: number
    subtotal: number
    afterPriority: number
    fuelSurcharge: number
    total: number
  }
}

function parseDimensions(dimensions: string | undefined): number {
  if (!dimensions) return 0
  const parts = dimensions
    .toLowerCase()
    .split(/[x×*,]/)
    .map((p) => Number(p.trim()))
    .filter((n) => Number.isFinite(n) && n > 0)
  if (parts.length !== 3) return 0
  return (parts[0] * parts[1] * parts[2]) / 5000
}

function round2(n: number) {
  return Math.round(n * 100) / 100
}

export function calculatePrice(params: PriceParams): PriceResult {
  const { pickupCity, deliveryCity, weight, dimensions, priority, isUrban } = params

  const zone = detectZone(pickupCity, deliveryCity)
  const volumetricWeight = parseDimensions(dimensions)
  const chargeableWeight = Math.max(weight, volumetricWeight)

  const extraSlabs = chargeableWeight > 0.5 ? Math.ceil((chargeableWeight - 0.5) / 0.5) : 0

  const baseRate = ZONE_BASE[zone]
  const weightCharge = extraSlabs * ZONE_PER_SLAB[zone]
  const surcharge = isUrban ? 0 : SEMI_URBAN_SURCHARGE[zone] || 0
  const subtotal = baseRate + weightCharge + surcharge

  const multiplier = PRIORITY_MULTIPLIER[priority] ?? 1
  const afterPriority = subtotal * multiplier

  const fuelSurcharge = afterPriority * 0.05
  const total = Math.round(afterPriority + fuelSurcharge)

  return {
    zone,
    chargeableWeight: round2(chargeableWeight),
    volumetricWeight: round2(volumetricWeight),
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
    },
  }
}
