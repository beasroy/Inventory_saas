import { useEffect, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { RootState, AppDispatch } from '../store';
import { fetchDashboardData } from '../store/slices/dashboardSlice';
import { useSocket } from '../hooks/useSocket';
import { Layout } from '../components/layout/Layout';
import { InventoryValueCard } from '../components/dashboard/InventoryValueCard';
import { LowStockAlert } from '../components/dashboard/LowStockAlert';
import { TopSellersList } from '../components/dashboard/TopSellersList';
import { StockMovementChart } from '../components/dashboard/StockMovementChart';
import { DASHBOARD_REFRESH_INTERVAL } from '../utils/constants';
import { formatDateTime } from '../utils/formatters';

export const DashboardPage = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { data, loading, error, lastUpdated } = useSelector(
    (state: RootState) => state.dashboard
  );

  // Initialize socket connection
  useSocket();

  const loadDashboardData = useCallback(() => {
    dispatch(fetchDashboardData());
  }, [dispatch]);

  useEffect(() => {
    loadDashboardData();

    // Auto-refresh every 5 minutes
    const interval = setInterval(loadDashboardData, DASHBOARD_REFRESH_INTERVAL);

    return () => clearInterval(interval);
  }, [loadDashboardData]);

  return (
    <Layout>
      <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Dashboard</h1>
          {lastUpdated && (
            <p className="text-xs sm:text-sm text-gray-500 mt-1">
              Last updated: {formatDateTime(lastUpdated)}
            </p>
          )}
        </div>
        <button
          onClick={loadDashboardData}
          disabled={loading}
          className="w-full sm:w-auto px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base"
        >
          {loading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {data && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Inventory Value - Full width on large screens */}
          <div className="lg:col-span-2">
            <InventoryValueCard value={data.inventoryValue} loading={loading} />
          </div>

          {/* Low Stock Items */}
          <div>
            <LowStockAlert items={data.lowStockItems} loading={loading} />
          </div>

          {/* Top Sellers */}
          <div>
            <TopSellersList sellers={data.topSellers} loading={loading} />
          </div>

          {/* Stock Movement Chart - Full width */}
          <div className="lg:col-span-2">
            <StockMovementChart data={data.stockMovementGraph} loading={loading} />
          </div>
        </div>
      )}

      {!data && !loading && !error && (
        <div className="text-center py-12">
          <p className="text-gray-500">No data available</p>
        </div>
      )}
    </Layout>
  );
};

