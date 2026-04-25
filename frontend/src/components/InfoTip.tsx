import { Tooltip, InputAdornment } from '@mui/material'
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined'

export default function InfoTip({ title }: { title: string }) {
  return (
    <InputAdornment position="end">
      <Tooltip title={title} arrow placement="top">
        <InfoOutlinedIcon sx={{ fontSize: 18, color: 'text.disabled', cursor: 'help' }} />
      </Tooltip>
    </InputAdornment>
  )
}
