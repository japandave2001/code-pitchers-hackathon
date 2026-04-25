import { Router } from 'express'
import { prisma } from '../lib/prisma'
import { jwtOnly } from '../middleware/auth'

const router = Router()

const IN_TRANSIT_STATUSES = new Set([
  'CONFIRMED',
  'PICKED_UP',
  'IN_TRANSIT',
  'AT_MAIN_HUB',
  'IN_TRANSIT_TO_LOCAL_HUB',
  'AT_LOCAL_HUB',
  'OUT_FOR_DELIVERY',
])

router.get('/stats', jwtOnly, async (req: any, res) => {
  const orders = await prisma.order.findMany({
    where: { vendorId: req.vendor.id },
    select: { status: true },
  })

  const total = orders.length
  const pending = orders.filter((o) => o.status === 'PENDING').length
  const inTransit = orders.filter((o) => IN_TRANSIT_STATUSES.has(o.status)).length
  const delivered = orders.filter((o) => o.status === 'DELIVERED').length
  const cancelled = orders.filter((o) => o.status === 'CANCELLED').length

  res.json({ total, pending, inTransit, delivered, cancelled })
})

export default router
