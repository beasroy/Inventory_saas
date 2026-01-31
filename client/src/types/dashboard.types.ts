export interface LowStockItem {
  variantId: string;
  variantSku: string;
  productId: string;
  productName: string;
  productCode: string;
  size: string;
  color: string;
  currentStock: number;
  reservedStock: number;
  availableStock: number;
  pendingQuantity: number;
  totalAvailable: number;
  price: number;
  isLowStock: boolean;
}

export interface TopSeller {
  productId: string;
  productName: string;
  productCode: string;
  totalQuantitySold: number;
  basePrice: number;
}

export interface StockMovementDataPoint {
  date: string;
  purchase: number;
  sale: number;
  return: number;
  adjustment: number;
}

export interface DashboardData {
  inventoryValue: number;
  lowStockItems: LowStockItem[];
  topSellers: TopSeller[];
  stockMovementGraph: StockMovementDataPoint[];
}

export interface DashboardState {
  data: DashboardData | null;
  loading: boolean;
  error: string | null;
  lastUpdated: string | null;
}

