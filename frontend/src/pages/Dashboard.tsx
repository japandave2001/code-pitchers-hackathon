import { useEffect, useState } from 'react'
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Paper,
  IconButton,
} from '@mui/material'
import InventoryIcon from '@mui/icons-material/Inventory2'
import ScheduleIcon from '@mui/icons-material/Schedule'
import LocalShippingIcon from '@mui/icons-material/LocalShipping'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import VisibilityIcon from '@mui/icons-material/Visibility'
import { useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'
import StatusChip from '../components/StatusChip'
import { useAuth } from '../context/AuthContext'
import api from '../api/axios'

type Stats = { total: number; pending: number; inTransit: number; delivered: number; cancelled: number }
type Order = {
  id: string
  description: string
  status: string
  customerName: string
  deliveryCity: string
  totalPrice: number | null
  createdAt: string
  trackingToken: string
}

const statCards = [
  { key: 'total', label: 'Total Orders', icon: <InventoryIcon />, color: '#1565C0', bg: '#E3F2FD' },
  { key: 'pending', label: 'Pending', icon: <ScheduleIcon />, color: '#E65100', bg: '#FFF3E0' },
  { key: 'inTransit', label: 'In Transit', icon: <LocalShippingIcon />, color: '#6A1B9A', bg: '#F3E5F5' },
  { key: 'delivered', label: 'Delivered', icon: <CheckCircleIcon />, color: '#2E7D32', bg: '#E8F5E9' },
] as const

const greeting = () => {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 18) return 'Good afternoon'
  return 'Good evening'
}

export default function Dashboard() {
  const { vendor } = useAuth()
  const navigate = useNavigate()
  const [stats, setStats] = useState<Stats | null>(null)
  const [orders, setOrders] = useState<Order[]>([])

  useEffect(() => {
    api.get('/vendor/stats').then((res) => setStats(res.data)).catch(() => {})
    api.get('/orders').then((res) => setOrders(res.data.slice(0, 10))).catch(() => {})
  }, [])

  return (
    <Layout title="Dashboard">
      <Typography variant="h5" sx={{ mb: 0.5 }}>
        {greeting()}, {vendor?.companyName} 👋
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
        Here's an overview of your deliveries today
      </Typography>

      <Grid container spacing={3} sx={{ mb: 4 }}>
        {statCards.map((s) => (
          <Grid item xs={12} sm={6} md={3} key={s.key}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Box
                    sx={{
                      bgcolor: s.bg,
                      color: s.color,
                      width: 48,
                      height: 48,
                      borderRadius: 2,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {s.icon}
                  </Box>
                  <Box>
                    <Typography variant="h5" sx={{ fontWeight: 700 }}>
                      {stats ? (stats as any)[s.key] : '—'}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {s.label}
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Card>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Recent Orders
          </Typography>
          <Paper variant="outlined" sx={{ borderRadius: 2 }}>
            <Table>
              <TableHead>
                <TableRow sx={{ bgcolor: '#F8FAFC' }}>
                  <TableCell sx={{ fontWeight: 600 }}>Order ID</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Customer</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>City</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                  <TableCell sx={{ fontWeight: 600 }} align="right">Charge</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Date</TableCell>
                  <TableCell sx={{ fontWeight: 600 }} align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {orders.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                      No orders yet. Create your first order to get started.
                    </TableCell>
                  </TableRow>
                ) : (
                  orders.map((o) => (
                    <TableRow
                      key={o.id}
                      hover
                      sx={{ cursor: 'pointer' }}
                      onClick={() => navigate(`/orders/${o.id}`)}
                    >
                      <TableCell sx={{ fontFamily: 'monospace', fontSize: 13 }}>
                        {o.id.slice(0, 10)}...
                      </TableCell>
                      <TableCell>{o.customerName}</TableCell>
                      <TableCell>{o.deliveryCity}</TableCell>
                      <TableCell>
                        <StatusChip status={o.status} />
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: 600 }}>
                        {o.totalPrice != null ? `₹${o.totalPrice}` : '—'}
                      </TableCell>
                      <TableCell sx={{ color: 'text.secondary', fontSize: 13 }}>
                        {new Date(o.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell align="right">
                        <IconButton size="small" onClick={(e) => { e.stopPropagation(); navigate(`/orders/${o.id}`) }}>
                          <VisibilityIcon fontSize="small" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Paper>
        </CardContent>
      </Card>
    </Layout>
  )
}
