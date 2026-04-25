import { useEffect, useState } from 'react'
import {
  Box,
  Card,
  CardContent,
  Typography,
  Divider,
  Chip,
  CircularProgress,
} from '@mui/material'
import LocalAtmIcon from '@mui/icons-material/LocalAtm'
import api from '../api/axios'

export type PriceResult = {
  zone: 'LOCAL' | 'ZONAL' | 'METRO' | 'NATIONAL'
  chargeableWeight: number
  volumetricWeight: number
  baseRate: number
  weightCharge: number
  surcharge: number
  priorityMultiplier: number
  fuelSurcharge: number
  total: number
  isUrban: boolean
  breakdown: {
    base: number
    weight: number
    semiUrbanSurcharge: number
    subtotal: number
    afterPriority: number
    fuelSurcharge: number
    total: number
  }
}

type Props = {
  pickupCity: string
  deliveryCity: string
  weight: number | string
  dimensions?: string
  priority: string
  variant?: 'compact' | 'full'
  onResult?: (result: PriceResult | null) => void
}

const ZONE_COLORS: Record<string, { bg: string; fg: string }> = {
  LOCAL:    { bg: '#E8F5E9', fg: '#2E7D32' },
  ZONAL:    { bg: '#E3F2FD', fg: '#1565C0' },
  METRO:    { bg: '#EDE7F6', fg: '#5E35B1' },
  NATIONAL: { bg: '#FFF3E0', fg: '#E65100' },
}

export default function PriceCalculator({
  pickupCity,
  deliveryCity,
  weight,
  dimensions,
  priority,
  variant = 'full',
  onResult,
}: Props) {
  const [pricing, setPricing] = useState<PriceResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const ready =
    !!pickupCity?.trim() &&
    !!deliveryCity?.trim() &&
    Number(weight) > 0 &&
    !!priority

  useEffect(() => {
    if (!ready) {
      setPricing(null)
      onResult?.(null)
      return
    }

    let cancelled = false
    const t = setTimeout(async () => {
      setLoading(true)
      setError('')
      try {
        const res = await api.post('/pricing/calculate', {
          pickupCity,
          deliveryCity,
          weight: Number(weight),
          dimensions: dimensions || undefined,
          priority,
        })
        if (cancelled) return
        setPricing(res.data)
        onResult?.(res.data)
      } catch (err: any) {
        if (cancelled) return
        setPricing(null)
        onResult?.(null)
        setError(err?.response?.data?.error || 'Could not estimate price')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }, 500)

    return () => {
      cancelled = true
      clearTimeout(t)
    }
    // onResult is intentionally not in deps — parents typically pass an inline
    // callback which would create infinite re-fetches.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pickupCity, deliveryCity, weight, dimensions, priority, ready])

  if (!ready) {
    return (
      <Card variant="outlined" sx={{ borderStyle: 'dashed' }}>
        <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <LocalAtmIcon sx={{ color: 'text.disabled' }} />
          <Typography variant="body2" color="text.secondary">
            Fill in pickup city, delivery city, weight and priority to see live shipping cost.
          </Typography>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card
      variant="outlined"
      sx={{
        borderColor: 'primary.main',
        borderWidth: 1.5,
        bgcolor: '#FAFCFE',
      }}
    >
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5, flexWrap: 'wrap', gap: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <LocalAtmIcon color="primary" />
            <Typography variant="subtitle1" sx={{ fontWeight: 700, color: 'primary.main' }}>
              Estimated Shipping Cost
            </Typography>
          </Box>
          {loading && <CircularProgress size={18} />}
        </Box>

        {error && (
          <Typography variant="body2" color="error">{error}</Typography>
        )}

        {pricing && !loading && (
          <>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 1.5 }}>
              <Chip
                label={pricing.zone}
                size="small"
                sx={{
                  fontWeight: 700,
                  fontSize: '0.7rem',
                  bgcolor: ZONE_COLORS[pricing.zone].bg,
                  color: ZONE_COLORS[pricing.zone].fg,
                }}
              />
              <Chip
                size="small"
                label={pricing.isUrban ? 'URBAN DIRECT' : 'SEMI-URBAN ROUTE'}
                sx={{
                  fontWeight: 700,
                  fontSize: '0.7rem',
                  bgcolor: pricing.isUrban ? '#E8F5E9' : '#FFEBEE',
                  color: pricing.isUrban ? '#2E7D32' : '#C62828',
                }}
              />
              {pricing.chargeableWeight !== Number(weight) && (
                <Chip
                  size="small"
                  variant="outlined"
                  label={`Volumetric: ${pricing.chargeableWeight}kg`}
                  sx={{ fontSize: '0.7rem' }}
                />
              )}
            </Box>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
              <Row label={`Base rate (${pricing.zone})`} value={`₹${pricing.breakdown.base}`} />
              {pricing.breakdown.weight > 0 && (
                <Row
                  label={`Weight (${pricing.chargeableWeight}kg chargeable)`}
                  value={`₹${pricing.breakdown.weight}`}
                />
              )}
              {pricing.breakdown.semiUrbanSurcharge > 0 && (
                <Row
                  label="Semi-urban surcharge"
                  value={`₹${pricing.breakdown.semiUrbanSurcharge}`}
                />
              )}
              <Row
                label="Subtotal"
                value={`₹${pricing.breakdown.subtotal}`}
                muted
              />
              {pricing.priorityMultiplier > 1 && (
                <Row
                  label={`Priority (× ${pricing.priorityMultiplier})`}
                  value={`₹${pricing.breakdown.afterPriority}`}
                />
              )}
              <Row
                label="Fuel surcharge (5%)"
                value={`₹${pricing.breakdown.fuelSurcharge}`}
              />
            </Box>

            <Divider sx={{ my: 1.5 }} />

            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>Total payable</Typography>
              <Typography variant="h4" sx={{ fontWeight: 800, color: 'primary.main' }}>
                ₹{pricing.total}
              </Typography>
            </Box>

            {variant === 'full' && (
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                Final price is locked when you submit the order. Vendors only pay for chargeable weight ({pricing.chargeableWeight}kg in this case
                {pricing.volumetricWeight > Number(weight) ? ' — volumetric weight is higher than actual' : ''}).
              </Typography>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}

function Row({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
      <Typography variant="body2" color={muted ? 'text.disabled' : 'text.secondary'}>{label}</Typography>
      <Typography variant="body2" sx={{ fontWeight: 600, color: muted ? 'text.disabled' : 'text.primary' }}>
        {value}
      </Typography>
    </Box>
  )
}
