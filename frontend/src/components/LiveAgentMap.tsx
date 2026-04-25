import { useEffect, useState } from 'react'
import { Box, Card, CardContent, Typography, Chip, GlobalStyles } from '@mui/material'
import { MapContainer, TileLayer, CircleMarker, Polyline, Tooltip as LeafletTooltip } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import api from '../api/axios'
import { getCoords } from '../utils/cityCoords'

type LocationPayload = {
  lat: number | null
  lng: number | null
  lastSeen: string | null
  status: string
  isLive: boolean
}

function timeAgo(iso: string | null) {
  if (!iso) return null
  const diff = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000)
  if (diff < 5) return 'just now'
  if (diff < 60) return `${Math.floor(diff)}s ago`
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  return `${Math.floor(diff / 3600)}h ago`
}

export default function LiveAgentMap({
  trackingToken,
  deliveryCity,
}: {
  trackingToken: string
  deliveryCity: string
}) {
  const [data, setData] = useState<LocationPayload | null>(null)

  useEffect(() => {
    let cancelled = false
    const fetchLoc = async () => {
      try {
        const res = await api.get(`/tracking/${trackingToken}/location`)
        if (!cancelled) setData(res.data)
      } catch {
        /* swallow — we keep retrying on the next tick */
      }
    }
    fetchLoc()
    const interval = window.setInterval(fetchLoc, 4000)
    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [trackingToken])

  const destCoords = getCoords(deliveryCity)
  const agentCoords: [number, number] | null =
    data?.lat != null && data?.lng != null ? [data.lat, data.lng] : null
  const center = agentCoords || destCoords

  return (
    <Card sx={{ mb: 3, overflow: 'hidden' }}>
      <GlobalStyles styles={{
        '@keyframes pulse-live': {
          '0%, 100%': { opacity: 1 },
          '50%': { opacity: 0.4 },
        },
      }} />
      <CardContent sx={{ p: 4, pb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1, mb: 1.5 }}>
          <Typography variant="h6">Live Agent Tracking</Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {data?.isLive ? (
              <Chip
                size="small"
                label="● LIVE"
                sx={{
                  fontWeight: 700,
                  bgcolor: '#FFEBEE',
                  color: '#C62828',
                  animation: 'pulse-live 1.5s infinite',
                }}
              />
            ) : (
              <Chip size="small" label="Waiting for agent…" variant="outlined" />
            )}
            {data?.lastSeen && (
              <Typography variant="caption" color="text.secondary">
                Updated {timeAgo(data.lastSeen)}
              </Typography>
            )}
          </Box>
        </Box>
      </CardContent>
      <Box sx={{ position: 'relative' }}>
        <MapContainer
          center={center}
          zoom={agentCoords ? 13 : 11}
          style={{ height: 320, width: '100%' }}
          scrollWheelZoom
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; OpenStreetMap'
          />
          <CircleMarker
            center={destCoords}
            radius={11}
            pathOptions={{ color: '#fff', weight: 2, fillColor: '#C62828', fillOpacity: 1 }}
          >
            <LeafletTooltip permanent direction="top" offset={[0, -12]}>
              <strong>Delivery</strong>
            </LeafletTooltip>
          </CircleMarker>
          {agentCoords && (
            <>
              <CircleMarker
                center={agentCoords}
                radius={11}
                pathOptions={{ color: '#fff', weight: 2, fillColor: '#1565C0', fillOpacity: 1 }}
              >
                <LeafletTooltip permanent direction="top" offset={[0, -12]}>
                  <strong>Agent</strong>
                </LeafletTooltip>
              </CircleMarker>
              <Polyline
                positions={[agentCoords, destCoords]}
                pathOptions={{ color: '#FF6F00', weight: 3, dashArray: '8 8' }}
              />
            </>
          )}
        </MapContainer>
      </Box>
      <CardContent sx={{ pt: 1.5, pb: '16px !important' }}>
        <Typography variant="body2" color="text.secondary">
          {agentCoords
            ? "Map updates every few seconds while the agent is broadcasting their location."
            : "The agent hasn't started broadcasting yet — the live pin will appear as soon as they do."}
        </Typography>
      </CardContent>
    </Card>
  )
}
