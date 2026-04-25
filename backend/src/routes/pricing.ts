import { Router } from 'express'
import { calculatePrice } from '../utils/pricing'
import { isMainHubCity } from '../utils/routing'

const router = Router()

// Public — used by the live calculator on the Create Order form and by the
// standalone /pricing page. No auth so vendors can preview before signing up.
router.post('/calculate', (req, res) => {
  const { pickupCity, deliveryCity, weight, dimensions, priority } = req.body || {}

  if (!pickupCity || !deliveryCity || weight == null || !priority) {
    return res.status(400).json({ error: 'pickupCity, deliveryCity, weight, priority are required' })
  }
  const w = Number(weight)
  if (!Number.isFinite(w) || w <= 0) {
    return res.status(400).json({ error: 'weight must be a positive number' })
  }

  // Urban classification mirrors the routing engine — we want the customer to
  // pay the same surcharge on this preview as the order will actually get.
  const isUrban = isMainHubCity(deliveryCity)

  const result = calculatePrice({
    pickupCity,
    deliveryCity,
    weight: w,
    dimensions: dimensions || undefined,
    priority,
    isUrban,
  })

  res.json({ ...result, isUrban })
})

export default router
