import { memo } from 'react';
import { formatCurrency } from '../../utils/formatters';

interface InventoryValueCardProps {
  value: number;
  loading?: boolean;
}

export const InventoryValueCard = memo(({ value, loading }: InventoryValueCardProps) => {
  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
          <div className="h-8 bg-gray-200 rounded w-3/4"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-2">
        Total Inventory Value
      </h3>
      <p className="text-3xl font-bold text-gray-900">{formatCurrency(value)}</p>
    </div>
  );
});

InventoryValueCard.displayName = 'InventoryValueCard';

