import { prisma } from '../lib/prisma'

// Cities that have a Main Hub — direct urban delivery.
// Keep this aligned with seeded main hubs in prisma/seed.ts.
const MAIN_HUB_CITIES = ['Mumbai', 'Delhi', 'New Delhi', 'Bangalore', 'Chennai']

export function isMainHubCity(city: string) {
  return MAIN_HUB_CITIES.some((c) => city.toLowerCase().includes(c.toLowerCase()))
}

export function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

// Used as a fallback when a city has no hub record — lets us still place a marker
// on the map and pick the nearest hub when needed.
export const CITY_COORDS: Record<string, [number, number]> = {
  mumbai: [19.0760, 72.8777], delhi: [28.6139, 77.2090],
  bangalore: [12.9716, 77.5946], chennai: [13.0827, 80.2707],
  pune: [18.5204, 73.8567], hyderabad: [17.3850, 78.4867],
  kolkata: [22.5726, 88.3639], 'new delhi': [28.6139, 77.2090],
  noida: [28.5355, 77.3910], gurgaon: [28.4595, 77.0266],
  jaipur: [26.9124, 75.7873], lucknow: [26.8467, 80.9462],
  ahmedabad: [23.0225, 72.5714], indore: [22.7196, 75.8577],
  patna: [25.5941, 85.1376], guwahati: [26.1445, 91.7362],
  shimla: [31.1048, 77.1734], gangtok: [27.3389, 88.6065],
  vizag: [17.6868, 83.2185], kochi: [9.9312, 76.2673],
  surat: [21.1702, 72.8311], varanasi: [25.3176, 82.9739],
  tirupur: [11.1085, 77.3411], panipat: [29.3909, 76.9635],
  'navi mumbai': [19.0330, 73.0297],
  nashik: [19.9975, 73.7898], aurangabad: [19.8762, 75.3433],
  mysore: [12.2958, 76.6394], hubli: [15.3647, 75.1240],
  coimbatore: [11.0168, 76.9558], agra: [27.1767, 78.0081],
}

export function getCityCoords(city: string): [number, number] | null {
  const key = Object.keys(CITY_COORDS).find((k) => city.toLowerCase().includes(k))
  return key ? CITY_COORDS[key] : null
}

type HubRow = {
  id: string
  name: string
  city: string
  type: string
  parentId: string | null
  lat: number
  lng: number
}

async function findNearestMainHub(city: string): Promise<HubRow | null> {
  const mainHubs = (await prisma.hub.findMany({ where: { type: 'MAIN' } })) as HubRow[]
  if (mainHubs.length === 0) return null
  // exact / substring city match first
  const direct = mainHubs.find((h) => city.toLowerCase().includes(h.city.toLowerCase()))
  if (direct) return direct
  const coords = getCityCoords(city)
  if (!coords) return mainHubs[0]
  let nearest = mainHubs[0]
  let min = Infinity
  for (const h of mainHubs) {
    const d = haversineDistance(coords[0], coords[1], h.lat, h.lng)
    if (d < min) { min = d; nearest = h }
  }
  return nearest
}

export async function findNearestLocalHub(city: string): Promise<HubRow | null> {
  const localHubs = (await prisma.hub.findMany({ where: { type: 'LOCAL' } })) as HubRow[]
  if (localHubs.length === 0) return null
  // exact / substring city match first
  const direct = localHubs.find((h) => city.toLowerCase().includes(h.city.toLowerCase()))
  if (direct) return direct
  const coords = getCityCoords(city)
  if (!coords) return localHubs[0]
  let nearest = localHubs[0]
  let min = Infinity
  for (const h of localHubs) {
    const d = haversineDistance(coords[0], coords[1], h.lat, h.lng)
    if (d < min) { min = d; nearest = h }
  }
  return nearest
}

export async function resolveRoute(pickupCity: string, deliveryCity: string) {
  const mainHub = await findNearestMainHub(pickupCity)
  const isUrban = isMainHubCity(deliveryCity)

  if (isUrban) {
    return { isUrban: true, mainHub, localHub: null as HubRow | null }
  }

  const localHub = await findNearestLocalHub(deliveryCity)
  return { isUrban: false, mainHub, localHub }
}
