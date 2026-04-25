import { Router } from 'express'
import { prisma } from '../lib/prisma'
import { flexAuth } from '../middleware/auth'

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
    },
  })

  res.json({
    id: order.id,
    trackingToken: order.trackingToken,
    status: order.status,
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
      createdAt: true,
      trackingToken: true,
    },
  })
  res.json(orders)
})

router.get('/:id', async (req: any, res) => {
  const order = await prisma.order.findUnique({ where: { id: req.params.id } })
  if (!order || order.vendorId !== req.vendor.id) {
    return res.status(404).json({ error: 'Order not found' })
  }
  res.json(order)
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
  })
  res.json(updated)
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
