import { useState } from 'react'
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  Alert,
  Link as MuiLink,
} from '@mui/material'
import BoltIcon from '@mui/icons-material/Bolt'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import InfoTip from '../components/InfoTip'

export default function Signup() {
  const { signup } = useAuth()
  const navigate = useNavigate()
  const [companyName, setCompanyName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await signup({ email, password, companyName, phone })
      navigate('/dashboard')
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Signup failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'background.default',
        p: 2,
      }}
    >
      <Card sx={{ width: '100%', maxWidth: 420 }}>
        <CardContent sx={{ p: 4 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <BoltIcon sx={{ color: '#FFB300', fontSize: 32 }} />
            <Typography variant="h5" sx={{ fontWeight: 700 }}>
              SwiftDrop
            </Typography>
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Create your vendor account
          </Typography>

          <Box component="form" onSubmit={handleSubmit}>
            <TextField
              label="Company Name"
              fullWidth
              required
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              sx={{ mb: 2 }}
              InputProps={{ endAdornment: <InfoTip title="Your business or brand name. Displayed on your dashboard and in tracking pages shared with customers." /> }}
            />
            <TextField
              label="Email"
              type="email"
              fullWidth
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              sx={{ mb: 2 }}
              InputProps={{ endAdornment: <InfoTip title="Your business email. Used for login and to receive order notifications." /> }}
            />
            <TextField
              label="Phone"
              fullWidth
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              sx={{ mb: 2 }}
              InputProps={{ endAdornment: <InfoTip title="Your primary business contact number. Our support team may reach out on this number." /> }}
            />
            <TextField
              label="Password"
              type="password"
              fullWidth
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              sx={{ mb: 2 }}
              InputProps={{ endAdornment: <InfoTip title="Choose a strong password. You'll use this along with your email to log in." /> }}
            />
            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}
            <Button
              type="submit"
              variant="contained"
              fullWidth
              size="large"
              disabled={loading}
              sx={{ mb: 2 }}
            >
              {loading ? 'Creating account...' : 'Create account'}
            </Button>
            <Typography variant="body2" align="center" color="text.secondary">
              Already have an account?{' '}
              <MuiLink component={Link} to="/login" underline="hover">
                Sign in
              </MuiLink>
            </Typography>
          </Box>
        </CardContent>
      </Card>
    </Box>
  )
}
