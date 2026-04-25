import { useEffect, useRef, useState } from 'react'
import {
  Box,
  Typography,
  Card,
  CardContent,
  Stepper,
  Step,
  StepLabel,
  CircularProgress,
  Alert,
  Grid,
  Divider,
  Chip,
  GlobalStyles,
} from '@mui/material'
import BoltIcon from '@mui/icons-material/Bolt'
import LocalShippingIcon from '@mui/icons-material/LocalShipping'
import WarehouseIcon from '@mui/icons-material/Warehouse'
import HomeIcon from '@mui/icons-material/Home'
import Inventory2Icon from '@mui/icons-material/Inventory2'
import ArrowForwardIcon from '@mui/icons-material/ArrowForward'
import { useParams } from 'react-router-dom'
import api from '../api/axios'
import StatusChip from '../components/StatusChip'

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

const URBAN_LABELS: Record<string, string> = {
  PENDING: 'Order Placed',
  CONFIRMED: 'Confirmed',
  AT_MAIN_HUB: 'At Main Hub',
  OUT_FOR_DELIVERY: 'Out for Delivery',
  DELIVERED: 'Delivered',
}

const SEMI_LABELS: Record<string, string> = {
  PENDING: 'Order Placed',
  CONFIRMED: 'Confirmed',
  AT_MAIN_HUB: 'At Main Hub',
  IN_TRANSIT_TO_LOCAL_HUB: 'In Transit to Local Hub',
  AT_LOCAL_HUB: 'At Local Hub',
  OUT_FOR_DELIVERY: 'Out for Delivery',
  DELIVERED: 'Delivered',
}

type HubLite = { id: string; name: string; city: string }
type AgentLite = {
  name: string
  phone: string
  vehicle: string
  agentType: string
  hub?: { name: string; city: string } | null
}

type Tracking = {
  trackingToken: string
  status: string
  customerName: string
  deliveryCity: string
  pickupCity: string
  description: string
  priority: string
  isUrban: boolean
  createdAt: string
  updatedAt: string
  assignedHub: HubLite | null
  localHub: HubLite | null
  agent: AgentLite | null
}

export default function Track() {
  const { token } = useParams()
  const [data, setData] = useState<Tracking | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [tickedAt, setTickedAt] = useState<Date | null>(null)
  const intervalRef = useRef<number | null>(null)

  useEffect(() => {
    let cancelled = false

    const fetchData = async () => {
      try {
        const res = await api.get(`/tracking/${token}`)
        if (cancelled) return
        setData(res.data)
        setTickedAt(new Date())
        setError('')
      } catch (err: any) {
        if (cancelled) return
        setError(err?.response?.data?.error || 'Tracking token not found')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetchData()
    intervalRef.current = window.setInterval(fetchData, 5000)
    return () => {
      cancelled = true
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [token])

  const flow = data?.isUrban ? URBAN_FLOW : SEMI_URBAN_FLOW
  const labels = data?.isUrban ? URBAN_LABELS : SEMI_LABELS
  const activeStep = data ? Math.max(0, flow.indexOf(data.status)) : 0

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', py: 6 }}>
      <GlobalStyles styles={{
        '@keyframes pulse': {
          '0%, 100%': { opacity: 1 },
          '50%': { opacity: 0.4 },
        },
      }} />

      <Box sx={{ maxWidth: 760, mx: 'auto', px: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 4, justifyContent: 'center' }}>
          <BoltIcon sx={{ color: '#FFB300', fontSize: 32 }} />
          <Typography variant="h5" sx={{ fontWeight: 700 }}>SwiftDrop</Typography>
        </Box>

        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 6 }}>
            <CircularProgress />
          </Box>
        )}

        {error && !data && <Alert severity="error">{error}</Alert>}

        {data && (
          <>
            <Card sx={{ mb: 3 }}>
              <CardContent sx={{ p: 4, textAlign: 'center' }}>
                <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
                  <Chip
                    label="● LIVE"
                    size="small"
                    sx={{
                      fontWeight: 700,
                      fontSize: '0.7rem',
                      bgcolor: '#FFEBEE',
                      color: '#C62828',
                      animation: 'pulse 1.5s ease-in-out infinite',
                    }}
                  />
                </Box>
                <Box
                  sx={{
                    width: 72,
                    height: 72,
                    borderRadius: '50%',
                    bgcolor: data.status === 'DELIVERED' ? '#E8F5E9' : '#FFF3E0',
                    color: data.status === 'DELIVERED' ? '#2E7D32' : '#E65100',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    mx: 'auto',
                    mb: 2,
                  }}
                >
                  <LocalShippingIcon sx={{ fontSize: 36 }} />
                </Box>
                <Typography variant="overline" color="text.secondary">Current Status</Typography>
                <Box sx={{ mb: 1, mt: 0.5 }}>
                  <StatusChip status={data.status} />
                </Box>
                <Typography variant="body2" color="text.secondary">
                  Tracking ID: <span style={{ fontFamily: 'monospace' }}>{data.trackingToken}</span>
                </Typography>
                {tickedAt && (
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                    Last refreshed {tickedAt.toLocaleTimeString()} · auto-updating every 5s
                  </Typography>
                )}
              </CardContent>
            </Card>

            <Card sx={{ mb: 3 }}>
              <CardContent sx={{ p: 4 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 1 }}>
                  <Typography variant="h6">Delivery Progress</Typography>
                  <Chip
                    size="small"
                    label={data.isUrban ? 'URBAN' : 'SEMI-URBAN'}
                    sx={{
                      fontWeight: 700,
                      fontSize: '0.65rem',
                      bgcolor: data.isUrban ? '#E8F5E9' : '#FFEBEE',
                      color: data.isUrban ? '#2E7D32' : '#C62828',
                    }}
                  />
                </Box>
                <Stepper activeStep={activeStep} alternativeLabel>
                  {flow.map((s) => (
                    <Step key={s}>
                      <StepLabel>{labels[s] || s.replace(/_/g, ' ')}</StepLabel>
                    </Step>
                  ))}
                </Stepper>

                <Divider sx={{ my: 3 }} />

                <Typography variant="overline" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>
                  Route Path
                </Typography>
                <RouteVisual
                  hops={
                    data.isUrban
                      ? [
                          { icon: <Inventory2Icon />, title: 'Pickup', subtitle: data.pickupCity },
                          { icon: <WarehouseIcon />, title: data.assignedHub?.name || 'Main Hub', subtitle: data.assignedHub?.city || '', highlight: true },
                          { icon: <HomeIcon />, title: 'Customer', subtitle: data.deliveryCity },
                        ]
                      : [
                          { icon: <Inventory2Icon />, title: 'Pickup', subtitle: data.pickupCity },
                          { icon: <WarehouseIcon />, title: data.assignedHub?.name || 'Main Hub', subtitle: data.assignedHub?.city || '', highlight: true },
                          { icon: <WarehouseIcon />, title: data.localHub?.name || 'Local Hub', subtitle: data.localHub?.city || '', highlight: true },
                          { icon: <HomeIcon />, title: 'Customer', subtitle: data.deliveryCity },
                        ]
                  }
                />
              </CardContent>
            </Card>

            {data.agent && (
              <Card sx={{ mb: 3 }}>
                <CardContent sx={{ p: 4 }}>
                  <Typography variant="h6" sx={{ mb: 2 }}>Your Delivery Agent</Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
                    <Box
                      sx={{
                        width: 56, height: 56, borderRadius: '50%',
                        bgcolor: '#FFF3E0', color: '#E65100',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}
                    >
                      <LocalShippingIcon />
                    </Box>
                    <Box sx={{ flex: 1, minWidth: 180 }}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>{data.agent.name}</Typography>
                      <Typography variant="body2" color="text.secondary">📞 {data.agent.phone}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {data.agent.vehicle} · {data.agent.agentType.replace('_', ' ')}
                        {data.agent.hub ? ` · ${data.agent.hub.name}` : ''}
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardContent sx={{ p: 4 }}>
                <Typography variant="h6" sx={{ mb: 2 }}>Shipment Details</Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="caption" color="text.secondary">Customer</Typography>
                    <Typography>{data.customerName}</Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="caption" color="text.secondary">Destination</Typography>
                    <Typography>{data.deliveryCity}</Typography>
                  </Grid>
                  <Grid item xs={12}><Divider /></Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="caption" color="text.secondary">Parcel</Typography>
                    <Typography>{data.description}</Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="caption" color="text.secondary">Priority</Typography>
                    <Typography>{data.priority.replace(/_/g, ' ')}</Typography>
                  </Grid>
                  <Grid item xs={12}>
                    <Typography variant="caption" color="text.secondary">Order Date</Typography>
                    <Typography>{new Date(data.createdAt).toLocaleString()}</Typography>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </>
        )}
      </Box>
    </Box>
  )
}

function RouteVisual({ hops }: { hops: { icon: React.ReactNode; title: string; subtitle: string; highlight?: boolean }[] }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
      {hops.map((h, i) => (
        <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              p: 1.25,
              borderRadius: 2,
              bgcolor: h.highlight ? '#E3F2FD' : '#F5F7FA',
              border: '1px solid',
              borderColor: h.highlight ? '#BBDEFB' : '#E5E9F0',
              minWidth: 130,
            }}
          >
            <Box sx={{ color: h.highlight ? '#1565C0' : 'text.secondary', display: 'flex' }}>
              {h.icon}
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', lineHeight: 1.2 }}>
                {h.subtitle}
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 600, lineHeight: 1.2 }}>
                {h.title}
              </Typography>
            </Box>
          </Box>
          {i < hops.length - 1 && <ArrowForwardIcon fontSize="small" sx={{ color: 'text.disabled' }} />}
        </Box>
      ))}
    </Box>
  )
}
