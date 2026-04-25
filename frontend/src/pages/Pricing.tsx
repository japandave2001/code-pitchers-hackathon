import { useState } from 'react'
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  TextField,
  MenuItem,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Paper,
  Chip,
} from '@mui/material'
import CalculateIcon from '@mui/icons-material/Calculate'
import Layout from '../components/Layout'
import PriceCalculator from '../components/PriceCalculator'

const empty = {
  pickupCity: '',
  deliveryCity: '',
  weight: '',
  dimensions: '',
  priority: 'STANDARD',
}

const ZONE_RATES = [
  { zone: 'LOCAL',    base: 35,  perSlab: 10, semi: '—',   note: 'Same city' },
  { zone: 'ZONAL',    base: 65,  perSlab: 15, semi: '₹30', note: 'Different city, same state' },
  { zone: 'METRO',    base: 90,  perSlab: 20, semi: '—',   note: 'Different state, both metros' },
  { zone: 'NATIONAL', base: 120, perSlab: 25, semi: '₹50', note: 'Different state, one or both non-metro' },
]

const ZONE_BG: Record<string, string> = {
  LOCAL:    '#E8F5E9',
  ZONAL:    '#E3F2FD',
  METRO:    '#EDE7F6',
  NATIONAL: '#FFF3E0',
}
const ZONE_FG: Record<string, string> = {
  LOCAL:    '#2E7D32',
  ZONAL:    '#1565C0',
  METRO:    '#5E35B1',
  NATIONAL: '#E65100',
}

export default function Pricing() {
  const [form, setForm] = useState(empty)
  const setField = (k: keyof typeof empty) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm({ ...form, [k]: e.target.value })

  return (
    <Layout title="Price Calculator">
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
        <CalculateIcon color="primary" />
        <Typography variant="h5">Live Shipping Calculator</Typography>
      </Box>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Estimate the cost of any shipment before placing the order. The price you see here is exactly what we'll charge.
      </Typography>

      <Grid container spacing={3}>
        <Grid item xs={12} md={7}>
          <Card>
            <CardContent sx={{ p: 4 }}>
              <Typography variant="overline" color="text.secondary">Estimate</Typography>
              <Grid container spacing={2} sx={{ mt: 0.5 }}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Pickup City"
                    placeholder="e.g. Mumbai"
                    fullWidth
                    value={form.pickupCity}
                    onChange={setField('pickupCity')}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Delivery City"
                    placeholder="e.g. Nashik"
                    fullWidth
                    value={form.deliveryCity}
                    onChange={setField('deliveryCity')}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Weight (kg)"
                    type="number"
                    fullWidth
                    value={form.weight}
                    onChange={setField('weight')}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    select
                    label="Priority"
                    fullWidth
                    value={form.priority}
                    onChange={setField('priority')}
                  >
                    <MenuItem value="STANDARD">Standard (1×)</MenuItem>
                    <MenuItem value="EXPRESS">Express (1.5×)</MenuItem>
                    <MenuItem value="SAME_DAY">Same Day (2×)</MenuItem>
                  </TextField>
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    label="Dimensions L×B×H (cm) — optional"
                    placeholder="e.g. 30x20x10"
                    fullWidth
                    value={form.dimensions}
                    onChange={setField('dimensions')}
                    helperText="Volumetric weight = (L × B × H) ÷ 5000. We bill on the higher of actual vs volumetric."
                  />
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={5}>
          <PriceCalculator
            pickupCity={form.pickupCity}
            deliveryCity={form.deliveryCity}
            weight={form.weight}
            dimensions={form.dimensions}
            priority={form.priority}
          />
        </Grid>
      </Grid>

      <Box sx={{ mt: 5 }}>
        <Typography variant="h6" sx={{ mb: 1.5 }}>Our Pricing Structure</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Base rate covers the first 500 g. Additional weight is charged in 500 g slabs (chargeable weight is the higher of actual and volumetric).
        </Typography>

        <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden' }}>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: '#F8FAFC' }}>
                <TableCell sx={{ fontWeight: 600 }}>Zone</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>When it applies</TableCell>
                <TableCell sx={{ fontWeight: 600 }} align="right">Base (first 500g)</TableCell>
                <TableCell sx={{ fontWeight: 600 }} align="right">Per extra 500g</TableCell>
                <TableCell sx={{ fontWeight: 600 }} align="right">Semi-urban surcharge</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {ZONE_RATES.map((r) => (
                <TableRow key={r.zone}>
                  <TableCell>
                    <Chip
                      size="small"
                      label={r.zone}
                      sx={{ fontWeight: 700, fontSize: '0.7rem', bgcolor: ZONE_BG[r.zone], color: ZONE_FG[r.zone] }}
                    />
                  </TableCell>
                  <TableCell sx={{ color: 'text.secondary' }}>{r.note}</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600 }}>₹{r.base}</TableCell>
                  <TableCell align="right">₹{r.perSlab}</TableCell>
                  <TableCell align="right">{r.semi}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Paper>

        <Box sx={{ display: 'flex', gap: 1.5, mt: 2, flexWrap: 'wrap' }}>
          <Chip label="Standard: 1.0×" variant="outlined" />
          <Chip label="Express: 1.5×" variant="outlined" sx={{ color: '#1565C0', borderColor: '#90CAF9' }} />
          <Chip label="Same Day: 2.0×" variant="outlined" sx={{ color: '#5E35B1', borderColor: '#B39DDB' }} />
          <Chip label="Fuel surcharge: +5% on all orders" variant="outlined" sx={{ color: '#E65100', borderColor: '#FFB74D' }} />
        </Box>
      </Box>

      <Box sx={{ mt: 4, p: 3, bgcolor: '#F8FAFC', borderRadius: 2, border: '1px solid #E5E9F0' }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
          Worked example — Mumbai → Nashik, 1.2 kg, Express
        </Typography>
        <Typography variant="body2" color="text.secondary" component="div">
          <ul style={{ marginTop: 4, paddingLeft: 18 }}>
            <li>Zone: <strong>ZONAL</strong> (different city, same state)</li>
            <li>Base: ₹65 + weight (2 extra 500 g slabs × ₹15) = ₹95</li>
            <li>Semi-urban surcharge (Nashik routes via local hub): +₹30 → subtotal ₹125</li>
            <li>Express multiplier × 1.5 → ₹187.50</li>
            <li>Fuel +5% → <strong>₹197</strong></li>
          </ul>
        </Typography>
      </Box>
    </Layout>
  )
}
