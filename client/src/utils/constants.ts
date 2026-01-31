export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';
export const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:8000';

export const LOW_STOCK_THRESHOLD = 10;

export const DASHBOARD_REFRESH_INTERVAL = 5 * 60 * 1000; // 5 minutes

export const ROUTES = {
  LOGIN: '/login',
  REGISTER: '/register',
  DASHBOARD: '/dashboard',
  PRODUCTS: '/products',
  SUPPLIERS: '/suppliers',
  PURCHASE_ORDERS: '/purchase-orders',
  STOCK_MOVEMENTS: '/stock-movements',
} as const;

