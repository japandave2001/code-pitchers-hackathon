import { Router } from 'express'
import { prisma } from '../lib/prisma'

const router = Router()

// Public endpoint — used by the map view to render the hub network
router.get('/', async (_req, res) => {
  const hubs = await prisma.hub.findMany({
    select: {
      id: true,
      name: true,
      city: true,
      type: true,
      parentId: true,
      lat: true,
      lng: true,
    },
  })
  res.json(hubs)
})

export default router
