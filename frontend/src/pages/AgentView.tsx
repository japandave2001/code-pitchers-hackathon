import { useEffect, useRef, useState } from 'react'
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  CircularProgress,
  Alert,
  Chip,
  Divider,
  Snackbar,
  GlobalStyles,
} from '@mui/material'
import { MapContainer, TileLayer, CircleMarker, Polyline, Tooltip as LeafletTooltip } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import BoltIcon from '@mui/icons-material/Bolt'
import HomeIcon from '@mui/icons-material/Home'
import PhoneIcon from '@mui/icons-material/Phone'
import Inventory2Icon from '@mui/icons-material/Inventory2'
import MyLocationIcon from '@mui/icons-material/MyLocation'
import StopCircleIcon from '@mui/icons-material/StopCircle'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import LocalShippingIcon from '@mui/icons-material/LocalShipping'
import { useParams } from 'react-router-dom'
import api from '../api/axios'
import StatusChip from '../components/StatusChip'
import { getCoords } from '../utils/cityCoords'

type AgentOrder = {
  orderId: string
  status: string
  isUrban: boolean
  customerName: string
  customerPhone: string
  deliveryAddress: string
  deliveryCity: string
  deliveryPincode: string
  pickupCity: string
  description: string
  weight: number
  priority: string
  agentName: string | null
  agentPhone: string | null
  agentVehicle: string | null
  agentType: string | null
  hubName: string | null
  localHubName: string | null
  localHubCity: string | null
  agentLat: number | null
  agentLng: number | null
  agentLastSeen: string | null
  deliveredAt: string | null
}

export default function AgentView() {
  const { agentToken } = useParams()
  const [order, setOrder] = useState<AgentOrder | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [tracking, setTracking] = useState(false)
  const [agentLocation, setAgentLocation] = useState<[number, number] | null>(null)
  const [snack, setSnack] = useState<{ msg: string; sev: 'success' | 'error' | 'info' } | null>(null)
  const [delivering, setDelivering] = useState(false)
  const watchId = useRef<number | null>(null)
  const lastSent = useRef<number>(0)

  // Initial load + light refresh so the agent sees status changes from the
  // vendor side (e.g. when they flip to OUT_FOR_DELIVERY).
  useEffect(() => {
    let cancelled = false
    const fetchOrder = async () => {
      try {
        const res = await api.get(`/agent/${agentToken}`)
        if (cancelled) return
        setOrder(res.data)
        setError('')
        if (res.data.agentLat != null && res.data.agentLng != null) {
          setAgentLocation([res.data.agentLat, res.data.agentLng])
        }
      } catch (err: any) {
        if (cancelled) return
        setError(err?.response?.data?.error || 'Invalid or expired agent link')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    fetchOrder()
    const interval = window.setInterval(fetchOrder, 8000)
    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [agentToken])

  // Stop watching when leaving the page
  useEffect(() => {
    return () => {
      if (watchId.current !== null) navigator.geolocation.clearWatch(watchId.current)
    }
  }, [])

  const startTracking = () => {
    if (!navigator.geolocation) {
      setSnack({ msg: 'Geolocation not supported on this device', sev: 'error' })
      return
    }
    watchId.current = navigator.geolocation.watchPosition(
      async (position) => {
        const { latitude, longitude } = position.coords
        setAgentLocation([latitude, longitude])
        // Throttle to one POST every ~3 seconds to be kind to the network/battery.
        const now = Date.now()
        if (now - lastSent.current < 3000) return
        lastSent.current = now
        try {
          await api.post(`/agent/${agentToken}/location`, { lat: latitude, lng: longitude })
        } catch (err: any) {
          // If the order is no longer OUT_FOR_DELIVERY, stop politely.
          if (err?.response?.status === 400) {
            setSnack({ msg: err.response.data?.error || 'Cannot broadcast right now', sev: 'info' })
            stopTracking()
          }
        }
      },
      (err) => {
        setSnack({ msg: `Location error: ${err.message}`, sev: 'error' })
        stopTracking()
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 10_000 }
    )
    setTracking(true)
    setSnack({ msg: 'Broadcasting location to the customer', sev: 'success' })
  }

  const stopTracking = () => {
    if (watchId.current !== null) {
      navigator.geolocation.clearWatch(watchId.current)
      watchId.current = null
    }
    setTracking(false)
  }

  const markDelivered = async () => {
    if (!order) return
    if (!confirm('Mark this order as delivered?')) return
    setDelivering(true)
    try {
      await api.put(`/agent/${agentToken}/delivered`)
      stopTracking()
      // Refetch so the success screen renders with the new status
      const res = await api.get(`/agent/${agentToken}`)
      setOrder(res.data)
      setSnack({ msg: 'Delivery marked complete!', sev: 'success' })
    } catch (err: any) {
      setSnack({ msg: err?.response?.data?.error || 'Failed to mark delivered', sev: 'error' })
    } finally {
      setDelivering(false)
    }
  }

  if (loading) {
    return (
      <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <CircularProgress />
      </Box>
    )
  }
  if (error || !order) {
    return (
      <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', p: 3 }}>
        <Alert severity="error">{error || 'Order not found'}</Alert>
      </Box>
    )
  }

  const isOutForDelivery = order.status === 'OUT_FOR_DELIVERY'
  const isDelivered = order.status === 'DELIVERED'
  const destCoords = getCoords(order.deliveryCity)
  const mapCenter: [number, number] = agentLocation || destCoords

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', pb: 6 }}>
      <GlobalStyles styles={{
        '@keyframes pulse': {
          '0%, 100%': { opacity: 1, transform: 'scale(1)' },
          '50%': { opacity: 0.5, transform: 'scale(1.2)' },
        },
      }} />

      <Box sx={{ maxWidth: 480, mx: 'auto', px: 2, pt: 3 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <BoltIcon sx={{ color: '#FFB300', fontSize: 28 }} />
            <Typography variant="h6" sx={{ fontWeight: 700 }}>SwiftDrop</Typography>
          </Box>
          <Chip
            size="small"
            label={order.isUrban ? 'URBAN' : 'SEMI-URBAN'}
            sx={{
              fontWeight: 700,
              fontSize: '0.65rem',
              bgcolor: order.isUrban ? '#E8F5E9' : '#FFEBEE',
              color: order.isUrban ? '#2E7D32' : '#C62828',
            }}
          />
        </Box>

        <Typography variant="overline" color="text.secondary">Your Delivery</Typography>
        <Box sx={{ mb: 2 }}>
          <StatusChip status={order.status} />
        </Box>

        {isDelivered && (
          <Card sx={{ mb: 2, bgcolor: '#E8F5E9' }}>
            <CardContent sx={{ p: 3, textAlign: 'center' }}>
              <CheckCircleIcon sx={{ color: '#2E7D32', fontSize: 56, mb: 1 }} />
              <Typography variant="h5" sx={{ fontWeight: 700, color: '#2E7D32' }}>
                Delivery Complete!
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                Thanks for the smooth handoff.
              </Typography>
            </CardContent>
          </Card>
        )}

        {/* Parcel */}
        <Card sx={{ mb: 2 }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
              <Inventory2Icon sx={{ color: 'text.secondary', mt: 0.3 }} />
              <Box sx={{ flex: 1 }}>
                <Typography variant="caption" color="text.secondary">Parcel</Typography>
                <Typography variant="body1" sx={{ fontWeight: 600 }}>{order.description}</Typography>
                <Typography variant="caption" color="text.secondary">
                  {order.weight} kg · {order.priority.replace(/_/g, ' ')} · #{order.orderId.slice(0, 8)}
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>

        {/* Customer */}
        <Card sx={{ mb: 2 }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
              <HomeIcon sx={{ color: 'text.secondary', mt: 0.3 }} />
              <Box sx={{ flex: 1 }}>
                <Typography variant="caption" color="text.secondary">Deliver To</Typography>
                <Typography variant="body1" sx={{ fontWeight: 700 }}>{order.customerName}</Typography>
                <Typography variant="body2" sx={{ mt: 0.5 }}>{order.deliveryAddress}</Typography>
                <Typography variant="body2" color="text.secondary">
                  {order.deliveryCity}, {order.deliveryPincode}
                </Typography>
              </Box>
            </Box>
            <Divider sx={{ my: 2 }} />
            <Button
              fullWidth
              variant="outlined"
              size="large"
              startIcon={<PhoneIcon />}
              href={`tel:${order.customerPhone}`}
              sx={{ borderRadius: 2 }}
            >
              Call {order.customerPhone}
            </Button>
          </CardContent>
        </Card>

        {/* Map */}
        <Card sx={{ mb: 2, overflow: 'hidden' }}>
          <Box sx={{ position: 'relative' }}>
            <MapContainer
              center={mapCenter}
              zoom={14}
              style={{ height: 250, width: '100%' }}
              scrollWheelZoom
            >
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; OpenStreetMap'
              />
              <CircleMarker
                center={destCoords}
                radius={10}
                pathOptions={{ color: '#fff', weight: 2, fillColor: '#C62828', fillOpacity: 1 }}
              >
                <LeafletTooltip permanent direction="top" offset={[0, -10]}>
                  Customer
                </LeafletTooltip>
              </CircleMarker>
              {agentLocation && (
                <>
                  <CircleMarker
                    center={agentLocation}
                    radius={10}
                    pathOptions={{ color: '#fff', weight: 2, fillColor: '#1565C0', fillOpacity: 1 }}
                  >
                    <LeafletTooltip permanent direction="top" offset={[0, -10]}>
                      You
                    </LeafletTooltip>
                  </CircleMarker>
                  <Polyline
                    positions={[agentLocation, destCoords]}
                    pathOptions={{ color: '#FF6F00', dashArray: '8 8', weight: 3 }}
                  />
                </>
              )}
            </MapContainer>
            {tracking && (
              <Chip
                size="small"
                label="● LIVE"
                sx={{
                  position: 'absolute',
                  top: 12,
                  right: 12,
                  fontWeight: 700,
                  bgcolor: '#FFEBEE',
                  color: '#C62828',
                  zIndex: 500,
                  animation: 'pulse 1.5s infinite',
                }}
              />
            )}
          </Box>
        </Card>

        {/* Pre-OUT_FOR_DELIVERY message */}
        {!isOutForDelivery && !isDelivered && (
          <Alert severity="info" sx={{ mb: 2 }}>
            Waiting for the vendor to mark this order <strong>Out for Delivery</strong>.
            You'll be able to start broadcasting your location once it's ready.
          </Alert>
        )}

        {/* Action buttons */}
        {isOutForDelivery && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            {!tracking ? (
              <Button
                fullWidth
                variant="outlined"
                color="primary"
                size="large"
                startIcon={<MyLocationIcon />}
                onClick={startTracking}
                sx={{ py: 1.5, fontWeight: 700, borderRadius: 2 }}
              >
                Start Broadcasting Location
              </Button>
            ) : (
              <Button
                fullWidth
                variant="outlined"
                color="warning"
                size="large"
                startIcon={<StopCircleIcon />}
                onClick={stopTracking}
                sx={{ py: 1.5, fontWeight: 700, borderRadius: 2 }}
              >
                Stop Broadcasting
              </Button>
            )}

            <Button
              fullWidth
              variant="contained"
              size="large"
              startIcon={<CheckCircleIcon />}
              onClick={markDelivered}
              disabled={delivering}
              sx={{
                py: 1.75,
                fontWeight: 700,
                fontSize: 16,
                borderRadius: 2,
                bgcolor: '#2E7D32',
                '&:hover': { bgcolor: '#1B5E20' },
              }}
            >
              {delivering ? 'Marking…' : 'Mark as Delivered'}
            </Button>
          </Box>
        )}

        {/* Agent self info */}
        {order.agentName && (
          <Box sx={{ mt: 3, p: 2, bgcolor: '#F8FAFC', borderRadius: 2, display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <LocalShippingIcon sx={{ color: 'text.secondary' }} />
            <Box>
              <Typography variant="caption" color="text.secondary">Logged in as</Typography>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                {order.agentName} · {order.hubName}
              </Typography>
            </Box>
          </Box>
        )}
      </Box>

      <Snackbar
        open={!!snack}
        autoHideDuration={3500}
        onClose={() => setSnack(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        {snack ? (
          <Alert severity={snack.sev} onClose={() => setSnack(null)} sx={{ width: '100%' }}>
            {snack.msg}
          </Alert>
        ) : undefined}
      </Snackbar>
    </Box>
  )
}
