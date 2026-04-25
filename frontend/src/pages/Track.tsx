import { useEffect, useState } from 'react'
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
} from '@mui/material'
import BoltIcon from '@mui/icons-material/Bolt'
import LocalShippingIcon from '@mui/icons-material/LocalShipping'
import { useParams } from 'react-router-dom'
import api from '../api/axios'
import StatusChip from '../components/StatusChip'

const flow = ['PENDING', 'CONFIRMED', 'PICKED_UP', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED']

type Tracking = {
  trackingToken: string
  status: string
  customerName: string
  deliveryCity: string
  description: string
  priority: string
  createdAt: string
}

export default function Track() {
  const { token } = useParams()
  const [data, setData] = useState<Tracking | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    setLoading(true)
    api
      .get(`/tracking/${token}`)
      .then((res) => setData(res.data))
      .catch((err) => setError(err?.response?.data?.error || 'Tracking token not found'))
      .finally(() => setLoading(false))
  }, [token])

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', py: 6 }}>
      <Box sx={{ maxWidth: 720, mx: 'auto', px: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 4, justifyContent: 'center' }}>
          <BoltIcon sx={{ color: '#FFB300', fontSize: 32 }} />
          <Typography variant="h5" sx={{ fontWeight: 700 }}>SwiftDrop</Typography>
        </Box>

        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 6 }}>
            <CircularProgress />
          </Box>
        )}

        {error && <Alert severity="error">{error}</Alert>}

        {data && (
          <>
            <Card sx={{ mb: 3 }}>
              <CardContent sx={{ p: 4, textAlign: 'center' }}>
                <Box
                  sx={{
                    width: 72,
                    height: 72,
                    borderRadius: '50%',
                    bgcolor: '#FFF3E0',
                    color: '#E65100',
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
              </CardContent>
            </Card>

            <Card sx={{ mb: 3 }}>
              <CardContent sx={{ p: 4 }}>
                <Typography variant="h6" sx={{ mb: 2 }}>Delivery Progress</Typography>
                <Stepper activeStep={Math.max(0, flow.indexOf(data.status))} alternativeLabel>
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
                  <Grid item xs={12}>
                    <Divider />
                  </Grid>
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
