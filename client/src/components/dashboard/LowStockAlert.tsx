import { memo } from 'react';
import { Link } from 'react-router-dom';
import type { LowStockItem } from '../../types/dashboard.types';
import { formatNumber } from '../../utils/formatters';

interface LowStockAlertProps {
  items: LowStockItem[];
  loading?: boolean;
}

export const LowStockAlert = memo(({ items, loading }: LowStockAlertProps) => {
  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="animate-pulse space-y-3">
          <div className="h-5 bg-gray-200 rounded w-1/3"></div>
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  const getUrgencyColor = (stock: number) => {
    if (stock < 5) return 'bg-red-50 border-red-200';
    if (stock < 10) return 'bg-orange-50 border-orange-200';
    return 'bg-yellow-50 border-yellow-200';
  };

  const getUrgencyText = (stock: number) => {
    if (stock < 5) return 'text-red-700';
    if (stock < 10) return 'text-orange-700';
    return 'text-yellow-700';
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Low Stock Items</h3>
      {items.length === 0 ? (
        <p className="text-gray-500 text-sm">No low stock items</p>
      ) : (
        <div className="space-y-3">
          {items.slice(0, 10).map((item) => (
            <div
              key={item.variantId}
              className={`border rounded-lg p-4 ${getUrgencyColor(item.currentStock)}`}
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <Link
                    to={`/products/${item.productId}`}
                    className="font-medium text-gray-900 hover:text-blue-600"
                  >
                    {item.productName}
                  </Link>
                  <p className="text-sm text-gray-600 mt-1">
                    {item.variantSku} • {item.size} • {item.color}
                  </p>
                  <div className="mt-2 flex items-center gap-4 text-sm">
                    <span className={getUrgencyText(item.currentStock)}>
                      Stock: <strong>{formatNumber(item.currentStock)}</strong>
                    </span>
                    {item.pendingQuantity > 0 && (
                      <span className="text-blue-600">
                        Pending PO: <strong>{formatNumber(item.pendingQuantity)}</strong>
                      </span>
                    )}
                    <span className="text-gray-600">
                      Total Available: <strong>{formatNumber(item.totalAvailable)}</strong>
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
          {items.length > 10 && (
            <p className="text-sm text-gray-500 text-center pt-2">
              Showing 10 of {items.length} low stock items
            </p>
          )}
        </div>
      )}
    </div>
  );
});

LowStockAlert.displayName = 'LowStockAlert';

