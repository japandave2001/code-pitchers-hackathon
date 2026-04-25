import { useEffect, useState } from 'react'
import { Box, Typography, Card, CardContent, Grid, IconButton, Tooltip, Alert } from '@mui/material'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import Layout from '../components/Layout'
import api from '../api/axios'

type Me = { id: string; email: string; companyName: string; phone: string; apiKey: string }

export default function Profile() {
  const [me, setMe] = useState<Me | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    api.get('/auth/me').then((res) => setMe(res.data))
  }, [])

  const copyKey = () => {
    if (!me) return
    navigator.clipboard.writeText(me.apiKey)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <Layout title="Profile">
      <Typography variant="h5" sx={{ mb: 3 }}>Vendor Profile</Typography>

      {me && (
        <>
          <Card sx={{ mb: 3 }}>
            <CardContent sx={{ p: 4 }}>
              <Grid container spacing={3}>
                <Grid item xs={12} sm={6}>
                  <Typography variant="caption" color="text.secondary">Company Name</Typography>
                  <Typography variant="body1">{me.companyName}</Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="caption" color="text.secondary">Email</Typography>
                  <Typography variant="body1">{me.email}</Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="caption" color="text.secondary">Phone</Typography>
                  <Typography variant="body1">{me.phone}</Typography>
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          <Card>
            <CardContent sx={{ p: 4 }}>
              <Typography variant="h6" sx={{ mb: 1 }}>API Key</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Use this key in the <code>x-api-key</code> header to programmatically create orders.
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, p: 2, bgcolor: '#F8FAFC', borderRadius: 2 }}>
                <Typography sx={{ flex: 1, fontFamily: 'monospace', fontSize: 14, wordBreak: 'break-all' }}>
                  {me.apiKey}
                </Typography>
                <Tooltip title={copied ? 'Copied!' : 'Copy'}>
                  <IconButton onClick={copyKey}>
                    {copied ? <CheckCircleIcon color="success" /> : <ContentCopyIcon />}
                  </IconButton>
                </Tooltip>
              </Box>
              <Alert severity="info" sx={{ mt: 2 }}>
                Keep this key secret. Treat it like a password.
              </Alert>
            </CardContent>
          </Card>
        </>
      )}
    </Layout>
  )
}
