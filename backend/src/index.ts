import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import authRoutes from './routes/auth'
import orderRoutes from './routes/orders'
import trackingRoutes from './routes/tracking'
import vendorRoutes from './routes/vendor'
import hubsRoutes from './routes/hubs'
import agentRoutes from './routes/agent'

const app = express()
app.use(cors())
app.use(express.json())

app.get('/', (_req, res) => {
  res.json({ ok: true, service: 'SwiftDrop API' })
})

app.use('/api/auth', authRoutes)
app.use('/api/orders', orderRoutes)
app.use('/api/tracking', trackingRoutes)
app.use('/api/vendor', vendorRoutes)
app.use('/api/hubs', hubsRoutes)
app.use('/api/agent', agentRoutes)

const PORT = parseInt(process.env.PORT || '3000', 10)
app.listen(PORT, () => {
  console.log(`SwiftDrop API listening on http://localhost:${PORT}`)
})
