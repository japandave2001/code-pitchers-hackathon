import { Fragment, useEffect, useMemo, useState } from 'react'
import {
  Box,
  Paper,
  Typography,
  CircularProgress,
  ToggleButton,
  ToggleButtonGroup,
  Chip,
} from '@mui/material'
import { MapContainer, TileLayer, Polyline, CircleMarker, Tooltip as LeafletTooltip, Popup } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import Layout from '../components/Layout'
import StatusChip from '../components/StatusChip'
import api from '../api/axios'
import { getCoords } from '../utils/cityCoords'

type Hub = {
  id: string
  name: string
  city: string
  type: 'MAIN' | 'LOCAL'
  parentId: string | null
  lat: number
  lng: number
}

type MapOrder = {
  id: string
  description: string
  status: string
  isUrban: boolean
  pickupCity: string
  deliveryCity: string
  customerName: string
  assignedHub: Hub | null
  localHub: Hub | null
}

type Filter = 'ALL' | 'URBAN' | 'SEMI_URBAN'

export default function MapView() {
  const [hubs, setHubs] = useState<Hub[]>([])
  const [orders, setOrders] = useState<MapOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<Filter>('ALL')

  useEffect(() => {
    Promise.all([api.get('/hubs'), api.get('/orders/map-data')])
      .then(([h, o]) => {
        setHubs(h.data)
        setOrders(o.data)
      })
      .finally(() => setLoading(false))
  }, [])

  const mainHubs = hubs.filter((h) => h.type === 'MAIN')
  const localHubs = hubs.filter((h) => h.type === 'LOCAL')

  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      if (filter === 'URBAN') return o.isUrban
      if (filter === 'SEMI_URBAN') return !o.isUrban
      // Skip cancelled / pending — they have no meaningful route
      return o.status !== 'CANCELLED'
    })
  }, [orders, filter])

  return (
    <Layout title="Route Map">
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="body2" color="text.secondary">
            Live view of the SwiftDrop hub network and active deliveries across India
          </Typography>
        </Box>
        <ToggleButtonGroup
          value={filter}
          exclusive
          size="small"
          onChange={(_e, v) => v && setFilter(v)}
        >
          <ToggleButton value="ALL">All ({orders.filter((o) => o.status !== 'CANCELLED').length})</ToggleButton>
          <ToggleButton value="URBAN">Urban ({orders.filter((o) => o.isUrban && o.status !== 'CANCELLED').length})</ToggleButton>
          <ToggleButton value="SEMI_URBAN">Semi-Urban ({orders.filter((o) => !o.isUrban && o.status !== 'CANCELLED').length})</ToggleButton>
        </ToggleButtonGroup>
      </Box>

      <Box sx={{ position: 'relative', borderRadius: 3, overflow: 'hidden', boxShadow: '0 2px 12px rgba(0,0,0,0.08)' }}>
        {loading && (
          <Box sx={{
            position: 'absolute', inset: 0, display: 'flex', alignItems: 'center',
            justifyContent: 'center', bgcolor: 'rgba(255,255,255,0.7)', zIndex: 500,
          }}>
            <CircularProgress />
          </Box>
        )}

        <MapContainer
          center={[22.5, 79]}
          zoom={5}
          style={{ height: 'calc(100vh - 220px)', minHeight: 520, width: '100%' }}
          scrollWheelZoom
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          />

          {/* Hub network — dashed grey lines from each local hub to its parent main hub */}
          {localHubs.map((local) => {
            const parent = mainHubs.find((m) => m.id === local.parentId)
            if (!parent) return null
            return (
              <Polyline
                key={`net-${local.id}`}
                positions={[[parent.lat, parent.lng], [local.lat, local.lng]]}
                pathOptions={{ color: '#90A4AE', weight: 2, dashArray: '6 8', opacity: 0.7 }}
              />
            )
          })}

          {/* Order routes */}
          {filteredOrders.map((o) => {
            const pickup = getCoords(o.pickupCity)
            const delivery = getCoords(o.deliveryCity)
            const main = o.assignedHub
            const local = o.localHub

            if (o.isUrban && main) {
              return (
                <Polyline
                  key={`route-${o.id}`}
                  positions={[pickup, [main.lat, main.lng], delivery]}
                  pathOptions={{ color: '#2E7D32', weight: 3, opacity: 0.55 }}
                />
              )
            }

            if (!o.isUrban && main && local) {
              return (
                <Fragment key={`route-${o.id}`}>
                  <Polyline
                    positions={[pickup, [main.lat, main.lng]]}
                    pathOptions={{ color: '#1565C0', weight: 3, opacity: 0.6 }}
                  />
                  <Polyline
                    positions={[[main.lat, main.lng], [local.lat, local.lng]]}
                    pathOptions={{ color: '#FF6F00', weight: 3, opacity: 0.65 }}
                  />
                  <Polyline
                    positions={[[local.lat, local.lng], delivery]}
                    pathOptions={{ color: '#C62828', weight: 2, opacity: 0.65, dashArray: '6 6' }}
                  />
                </Fragment>
              )
            }
            return null
          })}

          {/* Order endpoint pins */}
          {filteredOrders.map((o) => {
            const delivery = getCoords(o.deliveryCity)
            const color = o.isUrban ? '#2E7D32' : '#C62828'
            return (
              <CircleMarker
                key={`pin-${o.id}`}
                center={delivery}
                radius={5}
                pathOptions={{ color: '#fff', weight: 1.5, fillColor: color, fillOpacity: 0.9 }}
              >
                <Popup>
                  <Box sx={{ minWidth: 200 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace' }}>
                      {o.id.slice(0, 12)}…
                    </Typography>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, mt: 0.5 }}>
                      {o.customerName}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">{o.deliveryCity}</Typography>
                    <Box sx={{ mt: 1, display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                      <StatusChip status={o.status} />
                      <Chip
                        size="small"
                        label={o.isUrban ? 'URBAN' : 'SEMI-URBAN'}
                        sx={{
                          fontSize: '0.65rem',
                          fontWeight: 700,
                          bgcolor: o.isUrban ? '#E8F5E9' : '#FFEBEE',
                          color: o.isUrban ? '#2E7D32' : '#C62828',
                        }}
                      />
                    </Box>
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                      {o.description}
                    </Typography>
                  </Box>
                </Popup>
              </CircleMarker>
            )
          })}

          {/* Local hubs */}
          {localHubs.map((h) => (
            <CircleMarker
              key={h.id}
              center={[h.lat, h.lng]}
              radius={9}
              pathOptions={{ color: '#fff', weight: 2, fillColor: '#FF6F00', fillOpacity: 1 }}
            >
              <LeafletTooltip direction="top" offset={[0, -8]} permanent={false}>
                <strong>{h.name}</strong>
              </LeafletTooltip>
              <Popup>
                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>{h.name}</Typography>
                <Typography variant="caption" color="text.secondary">Local Hub · {h.city}</Typography>
              </Popup>
            </CircleMarker>
          ))}

          {/* Main hubs */}
          {mainHubs.map((h) => (
            <CircleMarker
              key={h.id}
              center={[h.lat, h.lng]}
              radius={13}
              pathOptions={{ color: '#fff', weight: 3, fillColor: '#1565C0', fillOpacity: 1 }}
            >
              <LeafletTooltip direction="top" offset={[0, -10]} permanent={false}>
                <strong>{h.name}</strong>
              </LeafletTooltip>
              <Popup>
                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>{h.name}</Typography>
                <Typography variant="caption" color="text.secondary">Main Hub · {h.city}</Typography>
              </Popup>
            </CircleMarker>
          ))}
        </MapContainer>

        {/* Legend */}
        <Paper
          elevation={3}
          sx={{
            position: 'absolute',
            top: 16,
            right: 16,
            p: 2,
            zIndex: 500,
            minWidth: 220,
            borderRadius: 2,
          }}
        >
          <Typography variant="overline" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
            Legend
          </Typography>
          <LegendDot color="#1565C0" size={13} label="Main Hub" />
          <LegendDot color="#FF6F00" size={9} label="Local Hub" />
          <LegendDot color="#2E7D32" size={6} label="Urban delivery" />
          <LegendDot color="#C62828" size={6} label="Semi-urban delivery" />
          <Box sx={{ mt: 1, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
            <LegendLine color="#2E7D32" label="Urban route" />
            <LegendLine color="#1565C0" label="To main hub" />
            <LegendLine color="#FF6F00" label="Main → local hub" />
            <LegendLine color="#C62828" dashed label="Local hub → customer" />
          </Box>
        </Paper>
      </Box>
    </Layout>
  )
}

function LegendDot({ color, size, label }: { color: string; size: number; label: string }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
      <Box sx={{ width: size * 2, height: size * 2, borderRadius: '50%', bgcolor: color, border: '2px solid #fff', boxShadow: '0 0 0 1px #ccc' }} />
      <Typography variant="caption">{label}</Typography>
    </Box>
  )
}

function LegendLine({ color, label, dashed }: { color: string; label: string; dashed?: boolean }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      <Box
        sx={{
          width: 28,
          height: 0,
          borderTop: `3px ${dashed ? 'dashed' : 'solid'} ${color}`,
        }}
      />
      <Typography variant="caption">{label}</Typography>
    </Box>
  )
}
