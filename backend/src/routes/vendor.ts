import { Router } from 'express'
import { prisma } from '../lib/prisma'
import { jwtOnly } from '../middleware/auth'

const router = Router()

router.get('/stats', jwtOnly, async (req: any, res) => {
  const orders = await prisma.order.findMany({
    where: { vendorId: req.vendor.id },
    select: { status: true },
  })

  const total = orders.length
  const pending = orders.filter((o) => o.status === 'PENDING').length
  const inTransit = orders.filter((o) =>
    ['CONFIRMED', 'PICKED_UP', 'IN_TRANSIT', 'OUT_FOR_DELIVERY'].includes(o.status)
  ).length
  const delivered = orders.filter((o) => o.status === 'DELIVERED').length
  const cancelled = orders.filter((o) => o.status === 'CANCELLED').length

  res.json({ total, pending, inTransit, delivered, cancelled })
})

export default router
