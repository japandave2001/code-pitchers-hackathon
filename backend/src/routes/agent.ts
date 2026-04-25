import { Router } from 'express'
import { prisma } from '../lib/prisma'
import { sendStatusEmail } from '../lib/email'
import { findNearestLocalHub } from '../utils/routing'

const router = Router()

// The agentToken in the URL is the auth — anyone who has the link can act as
// the agent for that single order. No middleware.

router.get('/:agentToken', async (req, res) => {
  const order = await prisma.order.findUnique({
    where: { agentToken: req.params.agentToken },
    include: { agent: { include: { hub: true } }, assignedHub: true },
  })
  if (!order) return res.status(404).json({ error: 'Invalid link' })

  const localHub = !order.isUrban ? await findNearestLocalHub(order.deliveryCity) : null

  res.json({
    orderId: order.id,
    status: order.status,
    isUrban: order.isUrban,
    customerName: order.customerName,
    customerPhone: order.customerPhone,
    deliveryAddress: order.deliveryAddress,
    deliveryCity: order.deliveryCity,
    deliveryPincode: order.deliveryPincode,
    pickupCity: order.pickupCity,
    description: order.description,
    weight: order.weight,
    priority: order.priority,
    agentName: order.agent?.name || null,
    agentPhone: order.agent?.phone || null,
    agentVehicle: order.agent?.vehicle || null,
    agentType: order.agent?.agentType || null,
    hubName: order.assignedHub?.name || null,
    localHubName: localHub?.name || null,
    localHubCity: localHub?.city || null,
    agentLat: order.agentLat,
    agentLng: order.agentLng,
    agentLastSeen: order.agentLastSeen,
    deliveredAt: order.deliveredAt,
    createdAt: order.createdAt,
  })
})

router.post('/:agentToken/location', async (req, res) => {
  const lat = Number(req.body?.lat)
  const lng = Number(req.body?.lng)
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return res.status(400).json({ error: 'lat/lng must be numbers' })
  }

  const order = await prisma.order.findUnique({
    where: { agentToken: req.params.agentToken },
  })
  if (!order) return res.status(404).json({ error: 'Invalid agent token' })
  if (order.status !== 'OUT_FOR_DELIVERY') {
    return res.status(400).json({ error: 'Order is not out for delivery' })
  }

  await prisma.order.update({
    where: { id: order.id },
    data: { agentLat: lat, agentLng: lng, agentLastSeen: new Date() },
  })

  res.json({ success: true, recordedAt: new Date().toISOString() })
})

router.put('/:agentToken/delivered', async (req, res) => {
  const order = await prisma.order.findUnique({
    where: { agentToken: req.params.agentToken },
  })
  if (!order) return res.status(404).json({ error: 'Invalid link' })
  if (order.status === 'DELIVERED') {
    return res.json({ success: true, alreadyDelivered: true })
  }
  if (order.status === 'CANCELLED') {
    return res.status(400).json({ error: 'Order was cancelled' })
  }

  const updated = await prisma.order.update({
    where: { id: order.id },
    data: { status: 'DELIVERED', deliveredAt: new Date() },
  })

  sendStatusEmail(updated).catch((e) => console.error('[email] post-agent-delivered:', e))

  res.json({ success: true, deliveredAt: updated.deliveredAt })
})

export default router
