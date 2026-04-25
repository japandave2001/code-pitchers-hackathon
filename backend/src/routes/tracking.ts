import { Router } from 'express'
import { prisma } from '../lib/prisma'
import { findNearestLocalHub } from '../utils/routing'

const router = Router()

// Public live-location poll — used by the customer tracking page and the
// vendor order detail page when status is OUT_FOR_DELIVERY.
// Defined BEFORE `/:token` so Express matches the more specific path first.
router.get('/:token/location', async (req, res) => {
  const order = await prisma.order.findUnique({
    where: { trackingToken: req.params.token },
    select: {
      agentLat: true,
      agentLng: true,
      agentLastSeen: true,
      status: true,
      deliveryCity: true,
    },
  })
  if (!order) return res.status(404).json({ error: 'Not found' })

  res.json({
    lat: order.agentLat,
    lng: order.agentLng,
    lastSeen: order.agentLastSeen,
    status: order.status,
    isLive:
      order.status === 'OUT_FOR_DELIVERY' &&
      order.agentLat !== null &&
      order.agentLng !== null,
  })
})

router.get('/:token', async (req, res) => {
  const order = await prisma.order.findUnique({
    where: { trackingToken: req.params.token },
    include: { assignedHub: true, agent: { include: { hub: true } } },
  })
  if (!order) return res.status(404).json({ error: 'Tracking token not found' })

  const localHub = !order.isUrban ? await findNearestLocalHub(order.deliveryCity) : null

  res.json({
    trackingToken: order.trackingToken,
    status: order.status,
    customerName: order.customerName,
    deliveryCity: order.deliveryCity,
    deliveryAddress: order.deliveryAddress,
    deliveryPincode: order.deliveryPincode,
    pickupCity: order.pickupCity,
    description: order.description,
    priority: order.priority,
    isUrban: order.isUrban,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
    deliveredAt: order.deliveredAt,
    assignedHub: order.assignedHub
      ? { id: order.assignedHub.id, name: order.assignedHub.name, city: order.assignedHub.city }
      : null,
    localHub: localHub ? { id: localHub.id, name: localHub.name, city: localHub.city } : null,
    agent: order.agent
      ? {
          name: order.agent.name,
          phone: order.agent.phone,
          vehicle: order.agent.vehicle,
          agentType: order.agent.agentType,
          hub: order.agent.hub ? { name: order.agent.hub.name, city: order.agent.hub.city } : null,
        }
      : null,
  })
})

export default router
