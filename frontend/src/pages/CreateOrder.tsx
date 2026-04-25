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
import InfoTip from '../components/InfoTip'
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
                    <TextField
                      label="Description"
                      fullWidth required value={form.description} onChange={setField('description')}
                      InputProps={{ endAdornment: <InfoTip title="Brief description of the parcel contents, e.g. 'Mobile Phone', 'Laptop', 'Books'" /> }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      label="Weight (kg)"
                      type="number" fullWidth required value={form.weight} onChange={setField('weight')}
                      InputProps={{ endAdornment: <InfoTip title="Actual weight of the parcel in kilograms. Used along with volumetric weight to calculate shipping charges." /> }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      select
                      label="Priority"
                      fullWidth value={form.priority} onChange={setField('priority')}
                      SelectProps={{ IconComponent: () => null }}
                      InputProps={{ endAdornment: <InfoTip title="Standard: 3-5 days. Express (1.5x charge): 1-2 days. Same Day (2x charge): delivered within hours." /> }}
                    >
                      <MenuItem value="STANDARD">Standard</MenuItem>
                      <MenuItem value="EXPRESS">Express (1.5x)</MenuItem>
                      <MenuItem value="SAME_DAY">Same Day (2x)</MenuItem>
                    </TextField>
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      label="Dimensions LxBxH (cm)"
                      placeholder="e.g. 30x20x10"
                      fullWidth
                      value={form.dimensions}
                      onChange={setField('dimensions')}
                      helperText="Optional — leave blank to bill on actual weight only."
                      InputProps={{ endAdornment: <InfoTip title="Enter parcel dimensions in centimeters (e.g. 30x20x10). Used to calculate volumetric weight. If volumetric weight exceeds actual weight, the higher value is billed." /> }}
                    />
                  </Grid>
                </Grid>
              )}

              {step === 1 && (
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <TextField
                      label="Pickup Address"
                      fullWidth required value={form.pickupAddress} onChange={setField('pickupAddress')}
                      InputProps={{ endAdornment: <InfoTip title="Full address of your warehouse or store where the parcel will be collected from." /> }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      label="Pickup City"
                      fullWidth required value={form.pickupCity} onChange={setField('pickupCity')}
                      InputProps={{ endAdornment: <InfoTip title="City where your warehouse/store is located. This determines the shipping zone and pricing." /> }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      label="Pincode"
                      fullWidth required value={form.pickupPincode} onChange={setField('pickupPincode')}
                      InputProps={{ endAdornment: <InfoTip title="6-digit postal code of the pickup location." /> }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      label="Contact Name"
                      fullWidth required value={form.pickupContact} onChange={setField('pickupContact')}
                      InputProps={{ endAdornment: <InfoTip title="Name of the person at the pickup location who will hand over the parcel to our delivery agent." /> }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      label="Contact Phone"
                      fullWidth required value={form.pickupPhone} onChange={setField('pickupPhone')}
                      InputProps={{ endAdornment: <InfoTip title="Phone number of the pickup contact. Our agent will call this number upon arrival." /> }}
                    />
                  </Grid>
                </Grid>
              )}

              {step === 2 && (
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <TextField
                      label="Delivery Address"
                      fullWidth required value={form.deliveryAddress} onChange={setField('deliveryAddress')}
                      InputProps={{ endAdornment: <InfoTip title="Complete delivery address including flat/house number, street, and landmark." /> }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      label="Delivery City"
                      fullWidth required value={form.deliveryCity} onChange={setField('deliveryCity')}
                      InputProps={{ endAdornment: <InfoTip title="Destination city. Along with pickup city, this determines the shipping zone (Local, Zonal, Metro, National)." /> }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      label="Pincode"
                      fullWidth required value={form.deliveryPincode} onChange={setField('deliveryPincode')}
                      InputProps={{ endAdornment: <InfoTip title="6-digit postal code of the delivery location." /> }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      label="Customer Name"
                      fullWidth required value={form.customerName} onChange={setField('customerName')}
                      InputProps={{ endAdornment: <InfoTip title="Name of the person receiving the parcel. This will appear on the tracking page." /> }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      label="Customer Phone"
                      fullWidth required value={form.customerPhone} onChange={setField('customerPhone')}
                      InputProps={{ endAdornment: <InfoTip title="Recipient's phone number. The delivery agent will contact this number for last-mile delivery." /> }}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      label="Customer Email (optional)"
                      type="email" fullWidth value={form.customerEmail} onChange={setField('customerEmail')}
                      InputProps={{ endAdornment: <InfoTip title="If provided, the customer will receive a tracking link via email when the order is created." /> }}
                    />
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
