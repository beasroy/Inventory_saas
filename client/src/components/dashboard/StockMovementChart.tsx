import { memo, useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { StockMovementDataPoint } from '../../types/dashboard.types';
import { formatDate, formatNumber } from '../../utils/formatters';

interface StockMovementChartProps {
  data: StockMovementDataPoint[];
  loading?: boolean;
}

export const StockMovementChart = memo(({ data, loading }: StockMovementChartProps) => {
  const chartData = useMemo(() => {
    return data.map((point) => ({
      ...point,
      dateLabel: formatDate(point.date),
    }));
  }, [data]);

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="animate-pulse">
          <div className="h-5 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Stock Movement (7 Days)</h3>
      {data.length === 0 ? (
        <p className="text-gray-500 text-sm">No movement data available</p>
      ) : (
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="dateLabel"
              tick={{ fontSize: 12 }}
              angle={-45}
              textAnchor="end"
              height={80}
            />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip
              formatter={(value: number) => formatNumber(value)}
              labelStyle={{ color: '#374151' }}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="purchase"
              stroke="#10b981"
              strokeWidth={2}
              name="Purchases"
              dot={{ r: 4 }}
            />
            <Line
              type="monotone"
              dataKey="sale"
              stroke="#ef4444"
              strokeWidth={2}
              name="Sales"
              dot={{ r: 4 }}
            />
            <Line
              type="monotone"
              dataKey="return"
              stroke="#3b82f6"
              strokeWidth={2}
              name="Returns"
              dot={{ r: 4 }}
            />
            <Line
              type="monotone"
              dataKey="adjustment"
              stroke="#f59e0b"
              strokeWidth={2}
              name="Adjustments"
              dot={{ r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
});

StockMovementChart.displayName = 'StockMovementChart';

