import { useEffect, useState } from 'react'
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Stepper,
  Step,
  StepLabel,
  TextField,
  MenuItem,
  Button,
  IconButton,
  Tooltip,
  CircularProgress,
  Divider,
} from '@mui/material'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import { useParams, useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'
import StatusChip from '../components/StatusChip'
import api from '../api/axios'

const flow = ['PENDING', 'CONFIRMED', 'PICKED_UP', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED']

const statusOptions = [...flow, 'CANCELLED']

type Order = {
  id: string
  description: string
  weight: number
  priority: string
  status: string
  trackingToken: string
  pickupAddress: string
  pickupCity: string
  pickupPincode: string
  pickupContact: string
  pickupPhone: string
  deliveryAddress: string
  deliveryCity: string
  deliveryPincode: string
  customerName: string
  customerPhone: string
  customerEmail: string | null
  createdAt: string
}

export default function OrderDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [order, setOrder] = useState<Order | null>(null)
  const [copied, setCopied] = useState(false)
  const [updating, setUpdating] = useState(false)

  const load = () => {
    api.get(`/orders/${id}`).then((res) => setOrder(res.data)).catch(() => setOrder(null))
  }

  useEffect(() => {
    load()
  }, [id])

  const copyToken = () => {
    if (!order) return
    navigator.clipboard.writeText(order.trackingToken)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  const updateStatus = async (status: string) => {
    if (!order) return
    setUpdating(true)
    try {
      const res = await api.put(`/orders/${order.id}/status`, { status })
      setOrder(res.data)
    } finally {
      setUpdating(false)
    }
  }

  const cancel = async () => {
    if (!order) return
    if (!confirm('Cancel this order?')) return
    await api.delete(`/orders/${order.id}`)
    load()
  }

  if (!order) {
    return (
      <Layout title="Order Detail">
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 6 }}>
          <CircularProgress />
        </Box>
      </Layout>
    )
  }

  const activeStep = flow.indexOf(order.status)

  return (
    <Layout title="Order Detail">
      <Button onClick={() => navigate('/orders')} sx={{ mb: 2 }}>← Back to orders</Button>

      <Card sx={{ mb: 3 }}>
        <CardContent sx={{ p: 4 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 2, mb: 3 }}>
            <Box>
              <Typography variant="overline" color="text.secondary">Order ID</Typography>
              <Typography variant="h6" sx={{ fontFamily: 'monospace' }}>{order.id}</Typography>
            </Box>
            <StatusChip status={order.status} />
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, p: 2, bgcolor: '#F8FAFC', borderRadius: 2, mb: 3 }}>
            <Box sx={{ flex: 1 }}>
              <Typography variant="caption" color="text.secondary">Tracking Token (share with customer)</Typography>
              <Typography sx={{ fontFamily: 'monospace', fontSize: 14 }}>{order.trackingToken}</Typography>
            </Box>
            <Tooltip title={copied ? 'Copied!' : 'Copy'}>
              <IconButton onClick={copyToken}>
                {copied ? <CheckCircleIcon color="success" /> : <ContentCopyIcon />}
              </IconButton>
            </Tooltip>
          </Box>

          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Typography variant="overline" color="text.secondary">Pickup</Typography>
              <Box sx={{ p: 2, border: '1px solid #E5E9F0', borderRadius: 2, mt: 0.5 }}>
                <Typography sx={{ mb: 0.5 }}>{order.pickupAddress}</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  {order.pickupCity}, {order.pickupPincode}
                </Typography>
                <Divider sx={{ my: 1 }} />
                <Typography variant="body2"><strong>{order.pickupContact}</strong></Typography>
                <Typography variant="body2" color="text.secondary">{order.pickupPhone}</Typography>
              </Box>
            </Grid>

            <Grid item xs={12} md={6}>
              <Typography variant="overline" color="text.secondary">Delivery</Typography>
              <Box sx={{ p: 2, border: '1px solid #E5E9F0', borderRadius: 2, mt: 0.5 }}>
                <Typography sx={{ mb: 0.5 }}>{order.deliveryAddress}</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  {order.deliveryCity}, {order.deliveryPincode}
                </Typography>
                <Divider sx={{ my: 1 }} />
                <Typography variant="body2"><strong>{order.customerName}</strong></Typography>
                <Typography variant="body2" color="text.secondary">{order.customerPhone}</Typography>
                {order.customerEmail && (
                  <Typography variant="body2" color="text.secondary">{order.customerEmail}</Typography>
                )}
              </Box>
            </Grid>

            <Grid item xs={12}>
              <Typography variant="overline" color="text.secondary">Parcel</Typography>
              <Box sx={{ p: 2, border: '1px solid #E5E9F0', borderRadius: 2, mt: 0.5, display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                <Box>
                  <Typography variant="caption" color="text.secondary">Description</Typography>
                  <Typography>{order.description}</Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">Weight</Typography>
                  <Typography>{order.weight} kg</Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">Priority</Typography>
                  <Typography>{order.priority.replace(/_/g, ' ')}</Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">Created</Typography>
                  <Typography>{new Date(order.createdAt).toLocaleString()}</Typography>
                </Box>
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      <Card sx={{ mb: 3 }}>
        <CardContent sx={{ p: 4 }}>
          <Typography variant="h6" sx={{ mb: 3 }}>Delivery Progress</Typography>
          <Stepper activeStep={activeStep === -1 ? 0 : activeStep} alternativeLabel>
            {flow.map((s) => (
              <Step key={s}>
                <StepLabel>{s.replace(/_/g, ' ')}</StepLabel>
              </Step>
            ))}
          </Stepper>
        </CardContent>
      </Card>

      <Card>
        <CardContent sx={{ p: 4 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>Demo Controls</Typography>
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
            <TextField
              select
              label="Update Status"
              value={order.status}
              onChange={(e) => updateStatus(e.target.value)}
              disabled={updating}
              sx={{ minWidth: 220 }}
            >
              {statusOptions.map((s) => (
                <MenuItem key={s} value={s}>{s.replace(/_/g, ' ')}</MenuItem>
              ))}
            </TextField>
            <Button color="error" variant="outlined" onClick={cancel}>
              Cancel Order
            </Button>
          </Box>
        </CardContent>
      </Card>
    </Layout>
  )
}
