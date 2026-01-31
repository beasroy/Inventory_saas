import { useEffect, useRef } from 'react';
import { useDispatch } from 'react-redux';
import type { AppDispatch } from '../store';
import { getSocket, connectSocket, disconnectSocket } from '../services/socket';
import { updateInventoryValue, fetchLowStockItems } from '../store/slices/dashboardSlice';
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
    socket.on('stock:updated', (_data: {
      variantId: string;
      variantSku: string;
      productId: string;
      previousStock: number;
      newStock: number;
      movementType: string;
      quantity: number;
    }) => {
      // Stock updated - update low stock items in real-time
      // Inventory value will be updated via inventory:value_updated event
      dispatch(fetchLowStockItems());
    });

    // Listen for inventory value updates (real-time)
    socket.on('inventory:value_updated', (data: { totalValue: number; previousValue?: number }) => {
      // Update inventory value in real-time without refreshing
      dispatch(updateInventoryValue(data.totalValue));
    });

    // Listen for purchase order updates that affect low stock
    socket.on('purchase_order:created', (_data: {
      purchaseOrderId: string;
      poNumber: string;
      items: Array<{ variantId: string; quantityOrdered: number }>;
    }) => {
      // Purchase order created - update low stock items in real-time
      // (pending PO quantities affect low stock calculations)
      dispatch(fetchLowStockItems());
    });

    socket.on('purchase_order:status_updated', (_data: {
      purchaseOrderId: string;
      poNumber: string;
      previousStatus: string;
      newStatus: string;
    }) => {
      // Purchase order status updated - update low stock items in real-time
      // (status changes affect pending quantities, e.g., cancelled POs remove pending quantities)
      dispatch(fetchLowStockItems());
    });

    socket.on('receipt:created', (_data: {
      receiptId: string;
      receiptNumber: string;
      purchaseOrderId: string;
      stockUpdates: Array<{
        variantId: string;
        variantSku: string;
        productId: string;
        quantityReceived: number;
        previousStock: number;
        newStock: number;
      }>;
    }) => {
      // Receipt created - update low stock items in real-time
      // Inventory value will be updated via inventory:value_updated event
      dispatch(fetchLowStockItems());
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.off('stock:updated');
        socketRef.current.off('inventory:value_updated');
        socketRef.current.off('purchase_order:created');
        socketRef.current.off('purchase_order:status_updated');
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

