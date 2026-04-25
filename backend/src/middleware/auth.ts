import jwt from 'jsonwebtoken'
import { prisma } from '../lib/prisma'

export const flexAuth = async (req: any, res: any, next: any) => {
  const authHeader = req.headers['authorization']
  const apiKey = req.headers['x-api-key']

  if (authHeader?.startsWith('Bearer ')) {
    try {
      const token = authHeader.split(' ')[1]
      const payload: any = jwt.verify(token, process.env.JWT_SECRET!)
      req.vendor = payload
      return next()
    } catch {
      return res.status(401).json({ error: 'Invalid token' })
    }
  }

  if (apiKey) {
    const vendor = await prisma.vendor.findUnique({ where: { apiKey: apiKey as string } })
    if (!vendor) return res.status(401).json({ error: 'Invalid API key' })
    req.vendor = { id: vendor.id, email: vendor.email }
    return next()
  }

  return res.status(401).json({ error: 'Unauthorized' })
}

export const jwtOnly = (req: any, res: any, next: any) => {
  const authHeader = req.headers['authorization']
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' })
  }
  try {
    const token = authHeader.split(' ')[1]
    const payload: any = jwt.verify(token, process.env.JWT_SECRET!)
    req.vendor = payload
    return next()
  } catch {
    return res.status(401).json({ error: 'Invalid token' })
  }
}
