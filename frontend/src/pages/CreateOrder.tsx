import { useState } from 'react'
import {
  Box,
  Typography,
  Card,
  CardContent,
  Stepper,
  Step,
  StepLabel,
  TextField,
  Button,
  Grid,
  MenuItem,
  Alert,
} from '@mui/material'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import ArrowForwardIcon from '@mui/icons-material/ArrowForward'
import CheckIcon from '@mui/icons-material/Check'
import { useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'
import PriceCalculator from '../components/PriceCalculator'
import api from '../api/axios'

const steps = ['Parcel Info', 'Pickup Details', 'Delivery Details']

const empty = {
  description: '',
  weight: '',
  dimensions: '',
  priority: 'STANDARD',
  pickupAddress: '',
  pickupCity: '',
  pickupPincode: '',
  pickupContact: '',
  pickupPhone: '',
  deliveryAddress: '',
  deliveryCity: '',
  deliveryPincode: '',
  customerName: '',
  customerPhone: '',
  customerEmail: '',
}

export default function CreateOrder() {
  const navigate = useNavigate()
  const [step, setStep] = useState(0)
  const [form, setForm] = useState(empty)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState<{ trackingToken: string; total: number | null } | null>(null)
  const [loading, setLoading] = useState(false)

  const setField = (k: keyof typeof empty) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm({ ...form, [k]: e.target.value })

  const next = () => setStep((s) => s + 1)
  const back = () => setStep((s) => s - 1)

  const submit = async () => {
    setError('')
    setLoading(true)
    try {
      const res = await api.post('/orders', form)
      setSuccess({ trackingToken: res.data.trackingToken, total: res.data.totalPrice ?? null })
      setTimeout(() => navigate(`/orders/${res.data.id}`), 2500)
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Failed to create order')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Layout title="Create Order">
      <Typography variant="h5" sx={{ mb: 3 }}>
        New Delivery Order
      </Typography>

      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent sx={{ p: 4 }}>
              <Stepper activeStep={step} sx={{ mb: 4 }}>
                {steps.map((label) => (
                  <Step key={label}>
                    <StepLabel>{label}</StepLabel>
                  </Step>
                ))}
              </Stepper>

              {success && (
                <Alert severity="success" sx={{ mb: 3 }}>
                  Order created!{' '}
                  {success.total != null && <>Charge: <strong>₹{success.total}</strong>. </>}
                  Tracking token:{' '}
                  <strong style={{ fontFamily: 'monospace' }}>{success.trackingToken}</strong>
                  <br />
                  Redirecting to order detail…
                </Alert>
              )}
              {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

              {step === 0 && (
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <TextField label="Description" fullWidth required value={form.description} onChange={setField('description')} />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField label="Weight (kg)" type="number" fullWidth required value={form.weight} onChange={setField('weight')} />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField select label="Priority" fullWidth value={form.priority} onChange={setField('priority')}>
                      <MenuItem value="STANDARD">Standard</MenuItem>
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
                      helperText="Used to compute volumetric weight (L×B×H ÷ 5000). Leave blank to bill on actual weight."
                    />
                  </Grid>
                </Grid>
              )}

              {step === 1 && (
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <TextField label="Pickup Address" fullWidth required value={form.pickupAddress} onChange={setField('pickupAddress')} />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField label="City" fullWidth required value={form.pickupCity} onChange={setField('pickupCity')} />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField label="Pincode" fullWidth required value={form.pickupPincode} onChange={setField('pickupPincode')} />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField label="Contact Name" fullWidth required value={form.pickupContact} onChange={setField('pickupContact')} />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField label="Contact Phone" fullWidth required value={form.pickupPhone} onChange={setField('pickupPhone')} />
                  </Grid>
                </Grid>
              )}

              {step === 2 && (
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <TextField label="Delivery Address" fullWidth required value={form.deliveryAddress} onChange={setField('deliveryAddress')} />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField label="City" fullWidth required value={form.deliveryCity} onChange={setField('deliveryCity')} />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField label="Pincode" fullWidth required value={form.deliveryPincode} onChange={setField('deliveryPincode')} />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField label="Customer Name" fullWidth required value={form.customerName} onChange={setField('customerName')} />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField label="Customer Phone" fullWidth required value={form.customerPhone} onChange={setField('customerPhone')} />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField label="Customer Email (optional)" type="email" fullWidth value={form.customerEmail} onChange={setField('customerEmail')} />
                  </Grid>
                </Grid>
              )}

              <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4 }}>
                <Button
                  onClick={back}
                  disabled={step === 0}
                  startIcon={<ArrowBackIcon />}
                >
                  Back
                </Button>
                {step < steps.length - 1 ? (
                  <Button variant="contained" onClick={next} endIcon={<ArrowForwardIcon />}>
                    Next
                  </Button>
                ) : (
                  <Button
                    variant="contained"
                    color="success"
                    onClick={submit}
                    disabled={loading || !!success}
                    startIcon={<CheckIcon />}
                  >
                    {loading ? 'Submitting…' : 'Submit Order'}
                  </Button>
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Live price card — sticks alongside the stepper on wide screens, sits
            below it on mobile. Always visible, always live. */}
        <Grid item xs={12} md={4}>
          <Box sx={{ position: { md: 'sticky' }, top: { md: 88 } }}>
            <PriceCalculator
              pickupCity={form.pickupCity}
              deliveryCity={form.deliveryCity}
              weight={form.weight}
              dimensions={form.dimensions}
              priority={form.priority}
            />
          </Box>
        </Grid>
      </Grid>
    </Layout>
  )
}
