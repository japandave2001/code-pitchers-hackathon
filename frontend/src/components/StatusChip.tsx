import { Chip } from '@mui/material'

const colorMap: Record<string, { bg: string; fg: string }> = {
  PENDING: { bg: '#ECEFF1', fg: '#455A64' },
  CONFIRMED: { bg: '#E3F2FD', fg: '#1565C0' },
  PICKED_UP: { bg: '#E1F5FE', fg: '#0277BD' },
  IN_TRANSIT: { bg: '#FFF3E0', fg: '#E65100' },
  OUT_FOR_DELIVERY: { bg: '#FFE0B2', fg: '#E65100' },
  DELIVERED: { bg: '#E8F5E9', fg: '#2E7D32' },
  CANCELLED: { bg: '#FFEBEE', fg: '#C62828' },
}

export default function StatusChip({ status }: { status: string }) {
  const c = colorMap[status] || colorMap.PENDING
  return (
    <Chip
      label={status.replace(/_/g, ' ')}
      size="small"
      sx={{
        bgcolor: c.bg,
        color: c.fg,
        fontWeight: 600,
        fontSize: '0.75rem',
      }}
    />
  )
}
