import { useEffect, useRef } from 'react';
import { useDispatch } from 'react-redux';
import type { AppDispatch } from '../store';
import { getSocket, connectSocket, disconnectSocket } from '../services/socket';
import { updateInventoryValue, updateLowStockItems } from '../store/slices/dashboardSlice';
import { useAuth } from './useAuth';

export const useSocket = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { isAuthenticated } = useAuth();
  const socketRef = useRef<ReturnType<typeof getSocket>>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    // Socket will use cookies (httpOnly) for auth automatically
    // We don't need to pass token explicitly since it's in httpOnly cookie
    const socket = connectSocket();
    socketRef.current = socket;

    // Listen for stock updates
    socket.on('stock:updated', (data: { variantId: string; newStock: number }) => {
      // Trigger dashboard refresh or update specific values
      // For now, we'll just log - actual update will come from dashboard refresh
      console.log('Stock updated:', data);
    });

    // Listen for inventory value updates
    socket.on('inventory:value_updated', (data: { inventoryValue: number }) => {
      dispatch(updateInventoryValue(data.inventoryValue));
    });

    // Listen for purchase order updates that affect low stock
    socket.on('purchase_order:created', () => {
      // Low stock items might change, but we'll refresh on next dashboard load
      console.log('Purchase order created');
    });

    socket.on('receipt:created', () => {
      // Inventory value and low stock might change
      console.log('Receipt created');
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.off('stock:updated');
        socketRef.current.off('inventory:value_updated');
        socketRef.current.off('purchase_order:created');
        socketRef.current.off('receipt:created');
      }
    };
  }, [isAuthenticated, dispatch]);

  useEffect(() => {
    return () => {
      if (!isAuthenticated) {
        disconnectSocket();
      }
    };
  }, [isAuthenticated]);

  return socketRef.current;
};

