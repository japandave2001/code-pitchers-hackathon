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
  MenuItem,
  CircularProgress,
} from '@mui/material'
import SearchIcon from '@mui/icons-material/Search'
import AddIcon from '@mui/icons-material/Add'
import VisibilityIcon from '@mui/icons-material/Visibility'
import FilterListOffIcon from '@mui/icons-material/FilterListOff'
import { useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'
import StatusChip from '../components/StatusChip'
import api from '../api/axios'

type Order = {
  id: string
  description: string
  status: string
  priority: string
  customerName: string
  deliveryCity: string
  isUrban: boolean
  zone: string | null
  totalPrice: number | null
  createdAt: string
  trackingToken: string
}

const ALL_STATUSES = [
  'PENDING', 'CONFIRMED', 'PICKED_UP', 'AT_MAIN_HUB',
  'IN_TRANSIT', 'IN_TRANSIT_TO_LOCAL_HUB', 'AT_LOCAL_HUB',
  'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED',
]

const ALL_PRIORITIES = ['STANDARD', 'EXPRESS', 'SAME_DAY']

const ROUTE_OPTIONS = [
  { value: '', label: 'All Routes' },
  { value: 'urban', label: 'Urban' },
  { value: 'semi-urban', label: 'Semi-Urban' },
]

export default function Orders() {
  const navigate = useNavigate()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [priorityFilter, setPriorityFilter] = useState('')
  const [routeFilter, setRouteFilter] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  useEffect(() => {
    api.get('/orders')
      .then((res) => setOrders(res.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const hasFilters = search || statusFilter || priorityFilter || routeFilter || dateFrom || dateTo

  const clearFilters = () => {
    setSearch('')
    setStatusFilter('')
    setPriorityFilter('')
    setRouteFilter('')
    setDateFrom('')
    setDateTo('')
  }

  const filtered = useMemo(() => {
    let result = orders

    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(
        (o) => o.customerName.toLowerCase().includes(q) || o.deliveryCity.toLowerCase().includes(q)
      )
    }

    if (statusFilter) {
      result = result.filter((o) => o.status === statusFilter)
    }

    if (priorityFilter) {
      result = result.filter((o) => o.priority === priorityFilter)
    }

    if (routeFilter === 'urban') {
      result = result.filter((o) => o.isUrban)
    } else if (routeFilter === 'semi-urban') {
      result = result.filter((o) => !o.isUrban)
    }

    if (dateFrom) {
      const from = new Date(dateFrom)
      result = result.filter((o) => new Date(o.createdAt) >= from)
    }

    if (dateTo) {
      const to = new Date(dateTo)
      to.setHours(23, 59, 59, 999)
      result = result.filter((o) => new Date(o.createdAt) <= to)
    }

    return result
  }, [orders, search, statusFilter, priorityFilter, routeFilter, dateFrom, dateTo])

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
          {/* Search bar */}
          <TextField
            placeholder="Search by customer name or city..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            fullWidth
            sx={{ mb: 2 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon color="action" />
                </InputAdornment>
              ),
            }}
          />

          {/* Filter row */}
          <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap', alignItems: 'center' }}>
            <TextField
              select
              label="Status"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              size="small"
              sx={{ minWidth: 180 }}
            >
              <MenuItem value="">All Statuses</MenuItem>
              {ALL_STATUSES.map((s) => (
                <MenuItem key={s} value={s}>{s.replace(/_/g, ' ')}</MenuItem>
              ))}
            </TextField>

            <TextField
              select
              label="Priority"
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              size="small"
              sx={{ minWidth: 150 }}
            >
              <MenuItem value="">All Priorities</MenuItem>
              {ALL_PRIORITIES.map((p) => (
                <MenuItem key={p} value={p}>{p.replace(/_/g, ' ')}</MenuItem>
              ))}
            </TextField>

            <TextField
              select
              label="Route"
              value={routeFilter}
              onChange={(e) => setRouteFilter(e.target.value)}
              size="small"
              sx={{ minWidth: 150 }}
            >
              {ROUTE_OPTIONS.map((r) => (
                <MenuItem key={r.value} value={r.value}>{r.label}</MenuItem>
              ))}
            </TextField>

            <TextField
              label="From"
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              size="small"
              InputLabelProps={{ shrink: true }}
              sx={{ minWidth: 150 }}
            />

            <TextField
              label="To"
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              size="small"
              InputLabelProps={{ shrink: true }}
              sx={{ minWidth: 150 }}
            />

            {hasFilters && (
              <Button
                size="small"
                startIcon={<FilterListOffIcon />}
                onClick={clearFilters}
                sx={{ textTransform: 'none' }}
              >
                Clear
              </Button>
            )}
          </Box>

          {/* Results count */}
          {!loading && (
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              {filtered.length} of {orders.length} orders
              {hasFilters ? ' (filtered)' : ''}
            </Typography>
          )}

          <Paper variant="outlined" sx={{ borderRadius: 2 }}>
            <Table>
              <TableHead>
                <TableRow sx={{ bgcolor: '#F8FAFC' }}>
                  <TableCell sx={{ fontWeight: 600 }}>Order ID</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Customer</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>City</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Route</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Priority</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                  <TableCell sx={{ fontWeight: 600 }} align="right">Charge</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Order Date</TableCell>
                  <TableCell sx={{ fontWeight: 600 }} align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={9} align="center" sx={{ py: 6 }}>
                      <CircularProgress size={32} />
                    </TableCell>
                  </TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                      {orders.length === 0 ? 'No orders yet.' : 'No orders match your filters.'}
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
                        <Chip
                          size="small"
                          label={o.priority?.replace(/_/g, ' ') || 'STANDARD'}
                          sx={{
                            fontWeight: 600,
                            fontSize: '0.65rem',
                            bgcolor: o.priority === 'SAME_DAY' ? '#FCE4EC' : o.priority === 'EXPRESS' ? '#FFF3E0' : '#F5F5F5',
                            color: o.priority === 'SAME_DAY' ? '#AD1457' : o.priority === 'EXPRESS' ? '#E65100' : '#616161',
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <StatusChip status={o.status} />
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: 600 }}>
                        {o.totalPrice != null ? `₹${o.totalPrice}` : '—'}
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
