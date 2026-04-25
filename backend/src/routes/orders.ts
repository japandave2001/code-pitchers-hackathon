import { Router } from 'express'
import { prisma } from '../lib/prisma'
import { flexAuth } from '../middleware/auth'
import { resolveRoute, findNearestLocalHub } from '../utils/routing'

const router = Router()

router.use(flexAuth)

router.post('/', async (req: any, res) => {
  const {
    description,
    weight,
    priority,
    pickupAddress,
    pickupCity,
    pickupPincode,
    pickupContact,
    pickupPhone,
    deliveryAddress,
    deliveryCity,
    deliveryPincode,
    customerName,
    customerPhone,
    customerEmail,
  } = req.body

  const { isUrban, mainHub } = await resolveRoute(pickupCity || '', deliveryCity || '')

  const order = await prisma.order.create({
    data: {
      vendorId: req.vendor.id,
      description,
      weight: parseFloat(weight),
      priority: priority || 'STANDARD',
      pickupAddress,
      pickupCity,
      pickupPincode,
      pickupContact,
      pickupPhone,
      deliveryAddress,
      deliveryCity,
      deliveryPincode,
      customerName,
      customerPhone,
      customerEmail: customerEmail || null,
      isUrban,
      assignedHubId: mainHub?.id || null,
    },
  })

  res.json({
    id: order.id,
    trackingToken: order.trackingToken,
    status: order.status,
    isUrban: order.isUrban,
    createdAt: order.createdAt,
  })
})

router.get('/', async (req: any, res) => {
  const orders = await prisma.order.findMany({
    where: { vendorId: req.vendor.id },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      description: true,
      status: true,
      customerName: true,
      deliveryCity: true,
      isUrban: true,
      createdAt: true,
      trackingToken: true,
    },
  })
  res.json(orders)
})

// Map data — must come BEFORE the /:id route, otherwise "/map-data" will be
// captured as an order id.
router.get('/map-data', async (req: any, res) => {
  const orders = await prisma.order.findMany({
    where: { vendorId: req.vendor.id },
    orderBy: { createdAt: 'desc' },
    include: { assignedHub: true, agent: { include: { hub: true } } },
  })

  // Resolve a local hub for each semi-urban order so the FE can draw the route
  const enriched = await Promise.all(
    orders.map(async (o) => {
      const localHub = !o.isUrban ? await findNearestLocalHub(o.deliveryCity) : null
      return { ...o, localHub }
    })
  )

  res.json(enriched)
})

router.get('/:id', async (req: any, res) => {
  const order = await prisma.order.findUnique({
    where: { id: req.params.id },
    include: { assignedHub: true, agent: { include: { hub: true } } },
  })
  if (!order || order.vendorId !== req.vendor.id) {
    return res.status(404).json({ error: 'Order not found' })
  }

  const localHub = !order.isUrban ? await findNearestLocalHub(order.deliveryCity) : null
  res.json({ ...order, localHub })
})

router.put('/:id/status', async (req: any, res) => {
  const { status } = req.body
  if (!status) return res.status(400).json({ error: 'Missing status' })

  const order = await prisma.order.findUnique({ where: { id: req.params.id } })
  if (!order || order.vendorId !== req.vendor.id) {
    return res.status(404).json({ error: 'Order not found' })
  }

  const updated = await prisma.order.update({
    where: { id: req.params.id },
    data: { status },
    include: { assignedHub: true, agent: { include: { hub: true } } },
  })
  const localHub = !updated.isUrban ? await findNearestLocalHub(updated.deliveryCity) : null
  res.json({ ...updated, localHub })
})

router.post('/:id/dispatch', async (req: any, res) => {
  const order = await prisma.order.findUnique({
    where: { id: req.params.id },
    include: { assignedHub: true },
  })
  if (!order || order.vendorId !== req.vendor.id) {
    return res.status(404).json({ error: 'Order not found' })
  }
  if (!order.assignedHubId) {
    return res.status(400).json({ error: 'Order has no assigned main hub' })
  }
  if (order.agentId) {
    return res.status(400).json({ error: 'Order already dispatched' })
  }

  // Urban → LAST_MILE agent at main hub does direct doorstep
  // Semi-urban → LINE_HAUL agent at main hub moves it to the local hub
  const agentType = order.isUrban ? 'LAST_MILE' : 'LINE_HAUL'

  const agent = await prisma.deliveryAgent.findFirst({
    where: {
      hubId: order.assignedHubId,
      agentType,
      isAvailable: true,
    },
  })

  if (!agent) return res.status(400).json({ error: `No ${agentType.toLowerCase()} agents available at this hub` })

  const updated = await prisma.order.update({
    where: { id: order.id },
    data: { agentId: agent.id, status: 'CONFIRMED' },
    include: { agent: { include: { hub: true } }, assignedHub: true },
  })
  const localHub = !updated.isUrban ? await findNearestLocalHub(updated.deliveryCity) : null
  res.json({ ...updated, localHub })
})

router.delete('/:id', async (req: any, res) => {
  const order = await prisma.order.findUnique({ where: { id: req.params.id } })
  if (!order || order.vendorId !== req.vendor.id) {
    return res.status(404).json({ error: 'Order not found' })
  }
  await prisma.order.update({
    where: { id: req.params.id },
    data: { status: 'CANCELLED' },
  })
  res.json({ ok: true })
})

export default router
