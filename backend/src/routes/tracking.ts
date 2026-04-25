import { Router } from 'express'
import { prisma } from '../lib/prisma'

const router = Router()

router.get('/:token', async (req, res) => {
  const order = await prisma.order.findUnique({ where: { trackingToken: req.params.token } })
  if (!order) return res.status(404).json({ error: 'Tracking token not found' })
  res.json({
    trackingToken: order.trackingToken,
    status: order.status,
    customerName: order.customerName,
    deliveryCity: order.deliveryCity,
    description: order.description,
    priority: order.priority,
    createdAt: order.createdAt,
  })
})

export default router
