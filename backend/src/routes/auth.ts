import { Router } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { prisma } from '../lib/prisma'
import { jwtOnly } from '../middleware/auth'

const router = Router()

const sign = (vendor: { id: string; email: string }) =>
  jwt.sign({ id: vendor.id, email: vendor.email }, process.env.JWT_SECRET!, { expiresIn: '7d' })

router.post('/signup', async (req, res) => {
  const { email, password, companyName, phone } = req.body
  if (!email || !password || !companyName || !phone) {
    return res.status(400).json({ error: 'Missing fields' })
  }
  const existing = await prisma.vendor.findUnique({ where: { email } })
  if (existing) return res.status(409).json({ error: 'Email already in use' })

  const hashed = await bcrypt.hash(password, 10)
  const vendor = await prisma.vendor.create({
    data: { email, password: hashed, companyName, phone },
  })
  const token = sign(vendor)
  res.json({
    token,
    vendor: {
      id: vendor.id,
      email: vendor.email,
      companyName: vendor.companyName,
      apiKey: vendor.apiKey,
    },
  })
})

router.post('/login', async (req, res) => {
  const { email, password } = req.body
  if (!email || !password) return res.status(400).json({ error: 'Missing fields' })

  const vendor = await prisma.vendor.findUnique({ where: { email } })
  if (!vendor) return res.status(401).json({ error: 'Invalid credentials' })

  const ok = await bcrypt.compare(password, vendor.password)
  if (!ok) return res.status(401).json({ error: 'Invalid credentials' })

  const token = sign(vendor)
  res.json({
    token,
    vendor: {
      id: vendor.id,
      email: vendor.email,
      companyName: vendor.companyName,
      apiKey: vendor.apiKey,
    },
  })
})

router.get('/me', jwtOnly, async (req: any, res) => {
  const vendor = await prisma.vendor.findUnique({ where: { id: req.vendor.id } })
  if (!vendor) return res.status(404).json({ error: 'Vendor not found' })
  res.json({
    id: vendor.id,
    email: vendor.email,
    companyName: vendor.companyName,
    phone: vendor.phone,
    apiKey: vendor.apiKey,
  })
})

export default router
