import { ReactNode } from 'react'
import {
  Box,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  AppBar,
  Toolbar,
  Typography,
  Avatar,
  Divider,
  Button,
} from '@mui/material'
import DashboardIcon from '@mui/icons-material/Dashboard'
import InventoryIcon from '@mui/icons-material/Inventory2'
import AddBoxIcon from '@mui/icons-material/AddBox'
import MapIcon from '@mui/icons-material/Map'
import PersonIcon from '@mui/icons-material/Person'
import LogoutIcon from '@mui/icons-material/Logout'
import BoltIcon from '@mui/icons-material/Bolt'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const drawerWidth = 240

const navItems = [
  { label: 'Dashboard', icon: <DashboardIcon />, path: '/dashboard' },
  { label: 'Orders', icon: <InventoryIcon />, path: '/orders' },
  { label: 'Create Order', icon: <AddBoxIcon />, path: '/orders/new' },
  { label: 'Route Map', icon: <MapIcon />, path: '/map' },
  { label: 'Profile', icon: <PersonIcon />, path: '/profile' },
]

export default function Layout({ children, title }: { children: ReactNode; title: string }) {
  const navigate = useNavigate()
  const location = useLocation()
  const { vendor, logout } = useAuth()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
      <Drawer
        variant="permanent"
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: drawerWidth,
            boxSizing: 'border-box',
            bgcolor: '#0D1B2A',
            color: '#fff',
            borderRight: 'none',
          },
        }}
      >
        <Box sx={{ p: 3, display: 'flex', alignItems: 'center', gap: 1 }}>
          <BoltIcon sx={{ color: '#FFB300', fontSize: 28 }} />
          <Typography variant="h6" sx={{ fontWeight: 700, color: '#fff' }}>
            SwiftDrop
          </Typography>
        </Box>
        <Divider sx={{ borderColor: 'rgba(255,255,255,0.1)' }} />
        <List sx={{ flex: 1, px: 1, mt: 1 }}>
          {navItems.map((item) => {
            const active = location.pathname === item.path
            return (
              <ListItem key={item.path} disablePadding sx={{ mb: 0.5 }}>
                <ListItemButton
                  onClick={() => navigate(item.path)}
                  sx={{
                    borderRadius: 2,
                    bgcolor: active ? 'rgba(255,255,255,0.1)' : 'transparent',
                    '&:hover': { bgcolor: 'rgba(255,255,255,0.08)' },
                  }}
                >
                  <ListItemIcon sx={{ color: active ? '#FFB300' : 'rgba(255,255,255,0.7)', minWidth: 40 }}>
                    {item.icon}
                  </ListItemIcon>
                  <ListItemText
                    primary={item.label}
                    primaryTypographyProps={{
                      fontSize: 14,
                      fontWeight: active ? 600 : 500,
                    }}
                  />
                </ListItemButton>
              </ListItem>
            )
          })}
        </List>
        <Box sx={{ p: 2 }}>
          <Button
            fullWidth
            startIcon={<LogoutIcon />}
            onClick={handleLogout}
            sx={{
              color: 'rgba(255,255,255,0.8)',
              justifyContent: 'flex-start',
              '&:hover': { bgcolor: 'rgba(255,255,255,0.08)' },
            }}
          >
            Logout
          </Button>
        </Box>
      </Drawer>

      <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
        <AppBar
          position="static"
          elevation={0}
          sx={{
            bgcolor: '#fff',
            color: 'text.primary',
            borderBottom: '1px solid #E5E9F0',
          }}
        >
          <Toolbar sx={{ justifyContent: 'space-between' }}>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              {title}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                {vendor?.companyName}
              </Typography>
              <Avatar sx={{ bgcolor: 'primary.main', width: 36, height: 36, fontSize: 14 }}>
                {vendor?.companyName?.charAt(0).toUpperCase()}
              </Avatar>
            </Box>
          </Toolbar>
        </AppBar>
        <Box sx={{ flex: 1, p: 4 }}>{children}</Box>
      </Box>
    </Box>
  )
}
