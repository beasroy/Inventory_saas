import { memo } from 'react';
import type { TopSeller } from '../../types/dashboard.types';
import { formatNumber, formatCurrency } from '../../utils/formatters';

interface TopSellersListProps {
  sellers: TopSeller[];
  loading?: boolean;
}

export const TopSellersList = memo(({ sellers, loading }: TopSellersListProps) => {
  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="animate-pulse space-y-3">
          <div className="h-5 bg-gray-200 rounded w-1/3"></div>
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-12 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Top 5 Sellers (30 Days)</h3>
      {sellers.length === 0 ? (
        <p className="text-gray-500 text-sm">No sales data available</p>
      ) : (
        <div className="space-y-3">
          {sellers.map((seller, index) => (
            <div key={seller.productId} className="flex items-center justify-between p-3 bg-gray-50 rounded">
              <div className="flex items-center gap-3">
                <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-semibold">
                  {index + 1}
                </div>
                <div>
                  <p className="font-medium text-gray-900">{seller.productName}</p>
                  <p className="text-sm text-gray-500">{seller.productCode}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-semibold text-gray-900">{formatNumber(seller.totalQuantitySold)}</p>
                <p className="text-sm text-gray-500">
                  {formatCurrency(seller.totalQuantitySold * seller.basePrice)}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
});

TopSellersList.displayName = 'TopSellersList';

