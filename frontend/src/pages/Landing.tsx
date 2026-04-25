import {
  Box,
  Button,
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  AppBar,
  Toolbar,
  Stack,
  Chip,
} from '@mui/material'
import BoltIcon from '@mui/icons-material/Bolt'
import LocalShippingIcon from '@mui/icons-material/LocalShipping'
import TrackChangesIcon from '@mui/icons-material/TrackChanges'
import SpeedIcon from '@mui/icons-material/Speed'
import IntegrationInstructionsIcon from '@mui/icons-material/IntegrationInstructions'
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive'
import BarChartIcon from '@mui/icons-material/BarChart'
import ArrowForwardIcon from '@mui/icons-material/ArrowForward'
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const features = [
  {
    icon: <LocalShippingIcon sx={{ fontSize: 36 }} />,
    title: 'Order Management',
    description: 'Create, track, and manage delivery orders from a single dashboard. Support for standard, express, and same-day priorities.',
  },
  {
    icon: <TrackChangesIcon sx={{ fontSize: 36 }} />,
    title: 'Real-Time Tracking',
    description: 'Share public tracking links with customers. Live status updates from pickup to doorstep delivery.',
  },
  {
    icon: <IntegrationInstructionsIcon sx={{ fontSize: 36 }} />,
    title: 'API-First Design',
    description: 'Integrate with your existing systems using our REST API. Authenticate via JWT or API key — your choice.',
  },
  {
    icon: <SpeedIcon sx={{ fontSize: 36 }} />,
    title: 'Lightning Fast',
    description: 'Built for speed. Create orders in seconds, get tracking tokens instantly, and scale without limits.',
  },
  {
    icon: <NotificationsActiveIcon sx={{ fontSize: 36 }} />,
    title: 'Status Notifications',
    description: 'Automated email notifications keep your customers informed at every stage of the delivery journey.',
  },
  {
    icon: <BarChartIcon sx={{ fontSize: 36 }} />,
    title: 'Analytics Dashboard',
    description: 'Monitor delivery performance with real-time stats. Track pending, in-transit, and delivered orders at a glance.',
  },
]

const steps = [
  { step: '01', title: 'Sign Up', description: 'Create your vendor account in under 30 seconds.' },
  { step: '02', title: 'Create Orders', description: 'Submit delivery orders via our dashboard or API.' },
  { step: '03', title: 'Track & Deliver', description: 'Monitor every parcel from pickup to doorstep.' },
]

export default function Landing() {
  const navigate = useNavigate()
  const { vendor } = useAuth()

  return (
    <Box sx={{ bgcolor: '#fff', minHeight: '100vh' }}>
      {/* Navbar */}
      <AppBar
        position="sticky"
        elevation={0}
        sx={{
          bgcolor: '#fff',
          borderBottom: '1px solid #E5E9F0',
        }}
      >
        <Container maxWidth="lg">
          <Toolbar disableGutters sx={{ justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, cursor: 'pointer' }} onClick={() => navigate('/')}>
              <BoltIcon sx={{ color: '#FFB300', fontSize: 28 }} />
              <Typography variant="h6" sx={{ fontWeight: 700, color: '#0D1B2A' }}>
                SwiftDrop
              </Typography>
            </Box>
            <Stack direction="row" spacing={1.5}>
              {vendor ? (
                <Button
                  variant="contained"
                  onClick={() => navigate('/dashboard')}
                  sx={{ px: 3 }}
                >
                  Go to Dashboard
                </Button>
              ) : (
                <>
                  <Button
                    variant="outlined"
                    onClick={() => navigate('/login')}
                    sx={{ px: 3 }}
                  >
                    Sign In
                  </Button>
                  <Button
                    variant="contained"
                    onClick={() => navigate('/signup')}
                    sx={{ px: 3 }}
                  >
                    Get Started
                  </Button>
                </>
              )}
            </Stack>
          </Toolbar>
        </Container>
      </AppBar>

      {/* Hero Section */}
      <Box
        sx={{
          background: 'linear-gradient(135deg, #0D1B2A 0%, #1B3A5C 60%, #1565C0 100%)',
          color: '#fff',
          pt: { xs: 8, md: 12 },
          pb: { xs: 10, md: 14 },
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Decorative circles */}
        <Box
          sx={{
            position: 'absolute',
            width: 400,
            height: 400,
            borderRadius: '50%',
            bgcolor: 'rgba(255,179,0,0.06)',
            top: -100,
            right: -100,
          }}
        />
        <Box
          sx={{
            position: 'absolute',
            width: 250,
            height: 250,
            borderRadius: '50%',
            bgcolor: 'rgba(21,101,192,0.15)',
            bottom: -80,
            left: -60,
          }}
        />

        <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 1 }}>
          <Grid container spacing={4} alignItems="center">
            <Grid item xs={12} md={7}>
              <Chip
                label="Last-Mile Delivery SaaS"
                sx={{
                  bgcolor: 'rgba(255,179,0,0.15)',
                  color: '#FFB300',
                  fontWeight: 600,
                  fontSize: 13,
                  mb: 3,
                  height: 32,
                }}
              />
              <Typography
                variant="h2"
                sx={{
                  fontWeight: 800,
                  fontSize: { xs: '2.2rem', md: '3.2rem' },
                  lineHeight: 1.15,
                  mb: 3,
                }}
              >
                Deliver faster.{' '}
                <Box component="span" sx={{ color: '#FFB300' }}>
                  Track smarter.
                </Box>
                <br />
                Scale effortlessly.
              </Typography>
              <Typography
                variant="h6"
                sx={{
                  fontWeight: 400,
                  color: 'rgba(255,255,255,0.75)',
                  mb: 4,
                  maxWidth: 520,
                  lineHeight: 1.6,
                  fontSize: { xs: '1rem', md: '1.15rem' },
                }}
              >
                SwiftDrop gives vendors a powerful platform to manage delivery orders,
                track parcels in real-time, and keep customers informed — all through
                a beautiful dashboard or a simple API.
              </Typography>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <Button
                  variant="contained"
                  size="large"
                  endIcon={<ArrowForwardIcon />}
                  onClick={() => navigate('/signup')}
                  sx={{
                    px: 4,
                    py: 1.5,
                    fontSize: '1rem',
                    bgcolor: '#FF6F00',
                    '&:hover': { bgcolor: '#E65100' },
                  }}
                >
                  Start Free
                </Button>
                <Button
                  variant="outlined"
                  size="large"
                  onClick={() => navigate('/login')}
                  sx={{
                    px: 4,
                    py: 1.5,
                    fontSize: '1rem',
                    borderColor: 'rgba(255,255,255,0.3)',
                    color: '#fff',
                    '&:hover': {
                      borderColor: 'rgba(255,255,255,0.6)',
                      bgcolor: 'rgba(255,255,255,0.05)',
                    },
                  }}
                >
                  Sign In
                </Button>
              </Stack>
            </Grid>
            <Grid item xs={12} md={5} sx={{ display: { xs: 'none', md: 'flex' }, justifyContent: 'center' }}>
              {/* Hero illustration card */}
              <Card
                sx={{
                  width: 340,
                  bgcolor: 'rgba(255,255,255,0.07)',
                  backdropFilter: 'blur(16px)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  color: '#fff',
                  borderRadius: 3,
                  p: 3,
                }}
              >
                <Typography variant="subtitle2" sx={{ color: 'rgba(255,255,255,0.6)', mb: 2 }}>
                  Live Order Status
                </Typography>
                {[
                  { label: 'PICKED_UP', color: '#29B6F6' },
                  { label: 'IN_TRANSIT', color: '#FF6F00' },
                  { label: 'OUT_FOR_DELIVERY', color: '#FFB300' },
                  { label: 'DELIVERED', color: '#2E7D32' },
                ].map((s) => (
                  <Box
                    key={s.label}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1.5,
                      mb: 1.5,
                      p: 1.5,
                      borderRadius: 2,
                      bgcolor: 'rgba(255,255,255,0.05)',
                    }}
                  >
                    <CheckCircleOutlineIcon sx={{ color: s.color, fontSize: 20 }} />
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                      {s.label.replace(/_/g, ' ')}
                    </Typography>
                  </Box>
                ))}
                <Box sx={{ mt: 2, p: 2, borderRadius: 2, bgcolor: 'rgba(46,125,50,0.15)', textAlign: 'center' }}>
                  <Typography variant="caption" sx={{ color: '#66BB6A' }}>
                    Order #SD-4821 delivered successfully
                  </Typography>
                </Box>
              </Card>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* Features Section */}
      <Box sx={{ py: { xs: 8, md: 12 }, bgcolor: '#F0F4F8' }}>
        <Container maxWidth="lg">
          <Box sx={{ textAlign: 'center', mb: 8 }}>
            <Typography
              variant="h4"
              sx={{ fontWeight: 700, color: '#0D1B2A', mb: 2 }}
            >
              Everything you need for last-mile delivery
            </Typography>
            <Typography
              variant="body1"
              sx={{ color: 'text.secondary', maxWidth: 560, mx: 'auto', lineHeight: 1.7 }}
            >
              From order creation to doorstep delivery, SwiftDrop handles the entire
              logistics workflow so you can focus on growing your business.
            </Typography>
          </Box>
          <Grid container spacing={3}>
            {features.map((feature) => (
              <Grid item xs={12} sm={6} md={4} key={feature.title}>
                <Card
                  sx={{
                    height: '100%',
                    transition: 'transform 0.2s, box-shadow 0.2s',
                    '&:hover': {
                      transform: 'translateY(-4px)',
                      boxShadow: '0 8px 30px rgba(0,0,0,0.12)',
                    },
                  }}
                >
                  <CardContent sx={{ p: 3.5 }}>
                    <Box
                      sx={{
                        width: 56,
                        height: 56,
                        borderRadius: 2,
                        bgcolor: 'rgba(21,101,192,0.08)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'primary.main',
                        mb: 2,
                      }}
                    >
                      {feature.icon}
                    </Box>
                    <Typography variant="h6" sx={{ fontWeight: 600, mb: 1, fontSize: '1.05rem' }}>
                      {feature.title}
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'text.secondary', lineHeight: 1.7 }}>
                      {feature.description}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* How It Works */}
      <Box sx={{ py: { xs: 8, md: 12 }, bgcolor: '#fff' }}>
        <Container maxWidth="lg">
          <Box sx={{ textAlign: 'center', mb: 8 }}>
            <Typography variant="h4" sx={{ fontWeight: 700, color: '#0D1B2A', mb: 2 }}>
              How it works
            </Typography>
            <Typography variant="body1" sx={{ color: 'text.secondary' }}>
              Get up and running in three simple steps.
            </Typography>
          </Box>
          <Grid container spacing={4} justifyContent="center">
            {steps.map((s) => (
              <Grid item xs={12} sm={4} key={s.step}>
                <Box sx={{ textAlign: 'center', px: 2 }}>
                  <Typography
                    sx={{
                      fontSize: '3rem',
                      fontWeight: 800,
                      color: 'rgba(21,101,192,0.1)',
                      lineHeight: 1,
                      mb: 1,
                    }}
                  >
                    {s.step}
                  </Typography>
                  <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
                    {s.title}
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'text.secondary', lineHeight: 1.7 }}>
                    {s.description}
                  </Typography>
                </Box>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* CTA Section */}
      <Box
        sx={{
          py: { xs: 8, md: 10 },
          background: 'linear-gradient(135deg, #0D1B2A 0%, #1565C0 100%)',
          textAlign: 'center',
        }}
      >
        <Container maxWidth="sm">
          <BoltIcon sx={{ color: '#FFB300', fontSize: 48, mb: 2 }} />
          <Typography
            variant="h4"
            sx={{ fontWeight: 700, color: '#fff', mb: 2 }}
          >
            Ready to streamline your deliveries?
          </Typography>
          <Typography
            variant="body1"
            sx={{ color: 'rgba(255,255,255,0.7)', mb: 4, lineHeight: 1.7 }}
          >
            Join vendors who trust SwiftDrop for fast, reliable last-mile delivery management.
          </Typography>
          <Button
            variant="contained"
            size="large"
            endIcon={<ArrowForwardIcon />}
            onClick={() => navigate('/signup')}
            sx={{
              px: 5,
              py: 1.5,
              fontSize: '1.05rem',
              bgcolor: '#FF6F00',
              '&:hover': { bgcolor: '#E65100' },
            }}
          >
            Get Started Free
          </Button>
        </Container>
      </Box>

      {/* Footer */}
      <Box sx={{ py: 4, bgcolor: '#0D1B2A', textAlign: 'center' }}>
        <Container>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, mb: 1 }}>
            <BoltIcon sx={{ color: '#FFB300', fontSize: 20 }} />
            <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.6)', fontWeight: 600 }}>
              SwiftDrop
            </Typography>
          </Box>
          <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.4)' }}>
            &copy; {new Date().getFullYear()} SwiftDrop. Built for the last mile.
          </Typography>
        </Container>
      </Box>
    </Box>
  )
}
