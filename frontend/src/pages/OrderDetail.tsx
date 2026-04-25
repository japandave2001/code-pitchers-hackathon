import { useEffect, useMemo, useState } from 'react'
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
  Alert,
  Snackbar,
  Chip,
} from '@mui/material'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import LocalShippingIcon from '@mui/icons-material/LocalShipping'
import TwoWheelerIcon from '@mui/icons-material/TwoWheeler'
import WarehouseIcon from '@mui/icons-material/Warehouse'
import HomeIcon from '@mui/icons-material/Home'
import ArrowForwardIcon from '@mui/icons-material/ArrowForward'
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch'
import { useParams, useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'
import StatusChip from '../components/StatusChip'
import api from '../api/axios'

const URBAN_FLOW = ['PENDING', 'CONFIRMED', 'AT_MAIN_HUB', 'OUT_FOR_DELIVERY', 'DELIVERED']
const SEMI_URBAN_FLOW = [
  'PENDING',
  'CONFIRMED',
  'AT_MAIN_HUB',
  'IN_TRANSIT_TO_LOCAL_HUB',
  'AT_LOCAL_HUB',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
]

type Hub = { id: string; name: string; city: string; type: string }
type Agent = {
  name: string
  phone: string
  vehicle: string
  agentType: string
  hub?: Hub | null
}

type Order = {
  id: string
  description: string
  weight: number
  priority: string
  status: string
  trackingToken: string
  isUrban: boolean
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
  agentId: string | null
  agent: Agent | null
  assignedHubId: string | null
  assignedHub: Hub | null
  localHub: Hub | null
  createdAt: string
}

export default function OrderDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [order, setOrder] = useState<Order | null>(null)
  const [copied, setCopied] = useState(false)
  const [updating, setUpdating] = useState(false)
  const [dispatching, setDispatching] = useState(false)
  const [snack, setSnack] = useState<{ msg: string; sev: 'success' | 'error' | 'info' } | null>(null)

  const load = () => {
    api.get(`/orders/${id}`).then((res) => setOrder(res.data)).catch(() => setOrder(null))
  }

  useEffect(() => {
    load()
  }, [id])

  const flow = useMemo(() => (order?.isUrban ? URBAN_FLOW : SEMI_URBAN_FLOW), [order?.isUrban])
  const statusOptions = useMemo(() => [...flow, 'CANCELLED'], [flow])

  const copyToken = () => {
    if (!order) return
    navigator.clipboard.writeText(order.trackingToken)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  const copyTrackingLink = () => {
    if (!order) return
    const link = `${window.location.origin}/track/${order.trackingToken}`
    navigator.clipboard.writeText(link)
    setSnack({ msg: 'Tracking link copied!', sev: 'success' })
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

  const dispatchOrder = async () => {
    if (!order) return
    setDispatching(true)
    try {
      const res = await api.post(`/orders/${order.id}/dispatch`)
      setOrder(res.data)
      setSnack({ msg: `Agent ${res.data.agent?.name} assigned!`, sev: 'success' })
    } catch (err: any) {
      setSnack({ msg: err?.response?.data?.error || 'Dispatch failed', sev: 'error' })
    } finally {
      setDispatching(false)
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
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
              <Chip
                size="small"
                label={order.isUrban ? 'URBAN' : 'SEMI-URBAN'}
                sx={{
                  fontWeight: 700,
                  fontSize: '0.7rem',
                  bgcolor: order.isUrban ? '#E8F5E9' : '#FFEBEE',
                  color: order.isUrban ? '#2E7D32' : '#C62828',
                }}
              />
              <StatusChip status={order.status} />
            </Box>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, p: 2, bgcolor: '#F8FAFC', borderRadius: 2, mb: 3 }}>
            <Box sx={{ flex: 1 }}>
              <Typography variant="caption" color="text.secondary">Tracking Token</Typography>
              <Typography sx={{ fontFamily: 'monospace', fontSize: 14 }}>{order.trackingToken}</Typography>
            </Box>
            <Tooltip title={copied ? 'Copied!' : 'Copy token'}>
              <IconButton onClick={copyToken}>
                {copied ? <CheckCircleIcon color="success" /> : <ContentCopyIcon />}
              </IconButton>
            </Tooltip>
            <Button size="small" variant="outlined" onClick={copyTrackingLink}>
              Copy public link
            </Button>
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

      {/* Route Banner */}
      <Alert
        severity={order.isUrban ? 'info' : 'warning'}
        icon={<LocalShippingIcon />}
        sx={{ mb: 3, alignItems: 'center', '& .MuiAlert-message': { width: '100%' } }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
          <Box>
            <Typography variant="overline" sx={{ fontWeight: 700 }}>
              {order.isUrban ? 'URBAN ORDER' : 'SEMI-URBAN ORDER'} · Delivery Route
            </Typography>
            <RoutePath
              hops={
                order.isUrban
                  ? [
                      { icon: <WarehouseIcon fontSize="small" />, label: order.assignedHub?.name || 'Main Hub' },
                      { icon: <HomeIcon fontSize="small" />, label: `${order.customerName} (${order.deliveryCity})` },
                    ]
                  : [
                      { icon: <WarehouseIcon fontSize="small" />, label: order.assignedHub?.name || 'Main Hub' },
                      { icon: <WarehouseIcon fontSize="small" />, label: order.localHub?.name || 'Local Hub' },
                      { icon: <HomeIcon fontSize="small" />, label: `${order.customerName} (${order.deliveryCity})` },
                    ]
              }
            />
          </Box>
        </Box>
      </Alert>

      {/* Agent Card or Dispatch Button */}
      <Card sx={{ mb: 3 }}>
        <CardContent sx={{ p: 4 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 2 }}>
            <Typography variant="h6">Delivery Agent</Typography>
            {!order.agent && order.status === 'PENDING' && (
              <Button
                variant="contained"
                color="primary"
                size="large"
                startIcon={<RocketLaunchIcon />}
                onClick={dispatchOrder}
                disabled={dispatching}
              >
                {dispatching ? 'Dispatching…' : 'Dispatch Order'}
              </Button>
            )}
          </Box>

          {order.agent ? (
            <Box
              sx={{
                p: 3,
                bgcolor: '#F8FAFC',
                borderRadius: 2,
                display: 'flex',
                alignItems: 'center',
                gap: 3,
                flexWrap: 'wrap',
              }}
            >
              <Box
                sx={{
                  width: 64,
                  height: 64,
                  borderRadius: '50%',
                  bgcolor: order.agent.agentType === 'LINE_HAUL' ? '#E3F2FD' : '#FFF3E0',
                  color: order.agent.agentType === 'LINE_HAUL' ? '#1565C0' : '#E65100',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                {order.agent.vehicle === 'BIKE' ? <TwoWheelerIcon sx={{ fontSize: 32 }} /> : <LocalShippingIcon sx={{ fontSize: 32 }} />}
              </Box>
              <Box sx={{ flex: 1, minWidth: 200 }}>
                <Typography variant="h6">{order.agent.name}</Typography>
                <Typography variant="body2" color="text.secondary">
                  📞 {order.agent.phone}
                </Typography>
                <Box sx={{ mt: 1, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  <Chip
                    size="small"
                    label={order.agent.agentType.replace('_', ' ')}
                    sx={{ fontWeight: 600, fontSize: '0.7rem' }}
                  />
                  <Chip size="small" label={order.agent.vehicle} variant="outlined" sx={{ fontSize: '0.7rem' }} />
                </Box>
              </Box>
              {order.agent.hub && (
                <Box sx={{ textAlign: 'right' }}>
                  <Typography variant="caption" color="text.secondary">Based at</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>{order.agent.hub.name}</Typography>
                </Box>
              )}
            </Box>
          ) : (
            <Box sx={{ p: 3, textAlign: 'center', color: 'text.secondary' }}>
              <Typography variant="body2">
                {order.status === 'PENDING'
                  ? 'No agent assigned yet — dispatch the order to auto-assign an available agent.'
                  : 'No agent on file for this order.'}
              </Typography>
            </Box>
          )}
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
              sx={{ minWidth: 260 }}
              helperText={`${flow.length} steps for this ${order.isUrban ? 'urban' : 'semi-urban'} order`}
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

      <Snackbar
        open={!!snack}
        autoHideDuration={3500}
        onClose={() => setSnack(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        {snack ? (
          <Alert severity={snack.sev} onClose={() => setSnack(null)} sx={{ width: '100%' }}>
            {snack.msg}
          </Alert>
        ) : undefined}
      </Snackbar>
    </Layout>
  )
}

function RoutePath({ hops }: { hops: { icon: React.ReactNode; label: string }[] }) {
  return (
    <Box sx={{ mt: 1, display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
      {hops.map((h, i) => (
        <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, fontWeight: 600 }}>
            {h.icon}
            <Typography variant="body2" sx={{ fontWeight: 600 }}>{h.label}</Typography>
          </Box>
          {i < hops.length - 1 && <ArrowForwardIcon fontSize="small" sx={{ opacity: 0.6 }} />}
        </Box>
      ))}
    </Box>
  )
}
