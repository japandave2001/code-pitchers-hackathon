import { useEffect, useMemo, useState } from 'react'
import {
  Box,
  Typography,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Paper,
  TextField,
  InputAdornment,
  Button,
  IconButton,
  Chip,
} from '@mui/material'
import SearchIcon from '@mui/icons-material/Search'
import AddIcon from '@mui/icons-material/Add'
import VisibilityIcon from '@mui/icons-material/Visibility'
import { useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'
import StatusChip from '../components/StatusChip'
import api from '../api/axios'

type Order = {
  id: string
  description: string
  status: string
  customerName: string
  deliveryCity: string
  isUrban: boolean
  createdAt: string
  trackingToken: string
}

export default function Orders() {
  const navigate = useNavigate()
  const [orders, setOrders] = useState<Order[]>([])
  const [search, setSearch] = useState('')

  useEffect(() => {
    api.get('/orders').then((res) => setOrders(res.data)).catch(() => {})
  }, [])

  const filtered = useMemo(() => {
    if (!search.trim()) return orders
    const q = search.toLowerCase()
    return orders.filter(
      (o) => o.customerName.toLowerCase().includes(q) || o.deliveryCity.toLowerCase().includes(q)
    )
  }, [orders, search])

  return (
    <Layout title="Orders">
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3, gap: 2 }}>
        <Typography variant="h5">All Orders</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => navigate('/orders/new')}
        >
          Create Order
        </Button>
      </Box>

      <Card>
        <CardContent>
          <TextField
            placeholder="Search by customer name or city..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            fullWidth
            sx={{ mb: 3 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon color="action" />
                </InputAdornment>
              ),
            }}
          />

          <Paper variant="outlined" sx={{ borderRadius: 2 }}>
            <Table>
              <TableHead>
                <TableRow sx={{ bgcolor: '#F8FAFC' }}>
                  <TableCell sx={{ fontWeight: 600 }}>Order ID</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Customer</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>City</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Route</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Date</TableCell>
                  <TableCell sx={{ fontWeight: 600 }} align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                      {orders.length === 0 ? 'No orders yet.' : 'No orders match your search.'}
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((o) => (
                    <TableRow
                      key={o.id}
                      hover
                      sx={{ cursor: 'pointer' }}
                      onClick={() => navigate(`/orders/${o.id}`)}
                    >
                      <TableCell sx={{ fontFamily: 'monospace', fontSize: 13 }}>
                        {o.id.slice(0, 10)}...
                      </TableCell>
                      <TableCell>{o.customerName}</TableCell>
                      <TableCell>{o.deliveryCity}</TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          label={o.isUrban ? 'URBAN' : 'SEMI-URBAN'}
                          sx={{
                            fontWeight: 700,
                            fontSize: '0.65rem',
                            bgcolor: o.isUrban ? '#E8F5E9' : '#FFEBEE',
                            color: o.isUrban ? '#2E7D32' : '#C62828',
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <StatusChip status={o.status} />
                      </TableCell>
                      <TableCell sx={{ color: 'text.secondary', fontSize: 13 }}>
                        {new Date(o.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell align="right">
                        <IconButton size="small" onClick={(e) => { e.stopPropagation(); navigate(`/orders/${o.id}`) }}>
                          <VisibilityIcon fontSize="small" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Paper>
        </CardContent>
      </Card>
    </Layout>
  )
}
