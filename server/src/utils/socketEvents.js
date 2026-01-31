import { emitToTenant } from '../config/socket.js';

/**
 * Emit stock updated event to tenant
 * @param {Object} req - Express request object
 * @param {Object} stockData - Stock update data
 */
export const emitStockUpdated = (req, stockData) => {
    const io = req.app.get('io');
    if (!io) return;

    const tenantId = req.tenant?._id?.toString();
    if (!tenantId) return;

    emitToTenant(io, tenantId, 'stock:updated', {
        variantId: stockData.variantId,
        variantSku: stockData.variantSku,
        productId: stockData.productId,
        previousStock: stockData.previousStock,
        newStock: stockData.newStock,
        movementType: stockData.movementType,
        quantity: stockData.quantity,
        referenceId: stockData.referenceId,
        referenceType: stockData.referenceType
    });
};

/**
 * Emit purchase order created event
 * @param {Object} req - Express request object
 * @param {Object} poData - Purchase order data
 */
export const emitPurchaseOrderCreated = (req, poData) => {
    const io = req.app.get('io');
    if (!io) return;

    const tenantId = req.tenant?._id?.toString();
    if (!tenantId) return;

    emitToTenant(io, tenantId, 'purchase_order:created', {
        purchaseOrderId: poData.purchaseOrderId,
        poNumber: poData.poNumber,
        supplierId: poData.supplierId,
        status: poData.status,
        items: poData.items
    });
};

/**
 * Emit purchase order status updated event
 * @param {Object} req - Express request object
 * @param {Object} poData - Purchase order data
 */
export const emitPurchaseOrderStatusUpdated = (req, poData) => {
    const io = req.app.get('io');
    if (!io) return;

    const tenantId = req.tenant?._id?.toString();
    if (!tenantId) return;

    emitToTenant(io, tenantId, 'purchase_order:status_updated', {
        purchaseOrderId: poData.purchaseOrderId,
        poNumber: poData.poNumber,
        previousStatus: poData.previousStatus,
        newStatus: poData.newStatus
    });
};

/**
 * Emit receipt created event (triggers stock update)
 * @param {Object} req - Express request object
 * @param {Object} receiptData - Receipt data
 */
export const emitReceiptCreated = (req, receiptData) => {
    const io = req.app.get('io');
    if (!io) return;

    const tenantId = req.tenant?._id?.toString();
    if (!tenantId) return;

    emitToTenant(io, tenantId, 'receipt:created', {
        receiptId: receiptData.receiptId,
        receiptNumber: receiptData.receiptNumber,
        purchaseOrderId: receiptData.purchaseOrderId,
        items: receiptData.items,
        stockUpdates: receiptData.stockUpdates // Array of stock changes
    });
};

/**
 * Emit order created event (for sales tracking)
 * @param {Object} req - Express request object
 * @param {Object} orderData - Order data
 */
export const emitOrderCreated = (req, orderData) => {
    const io = req.app.get('io');
    if (!io) return;

    const tenantId = req.tenant?._id?.toString();
    if (!tenantId) return;

    emitToTenant(io, tenantId, 'order:created', {
        orderId: orderData.orderId,
        items: orderData.items,
        totalAmount: orderData.totalAmount
    });
};

/**
 * Emit order fulfilled event (triggers stock update and sales tracking)
 * @param {Object} req - Express request object
 * @param {Object} orderData - Order data
 */
export const emitOrderFulfilled = (req, orderData) => {
    const io = req.app.get('io');
    if (!io) return;

    const tenantId = req.tenant?._id?.toString();
    if (!tenantId) return;

    emitToTenant(io, tenantId, 'order:fulfilled', {
        orderId: orderData.orderId,
        items: orderData.items,
        stockUpdates: orderData.stockUpdates,
        totalAmount: orderData.totalAmount
    });
};

/**
 * Emit inventory value updated event
 * @param {Object} req - Express request object
 * @param {Object} inventoryData - Inventory data
 */
export const emitInventoryValueUpdated = (req, inventoryData) => {
    const io = req.app.get('io');
    if (!io) return;

    const tenantId = req.tenant?._id?.toString();
    if (!tenantId) return;

    emitToTenant(io, tenantId, 'inventory:value_updated', {
        totalValue: inventoryData.totalValue,
        previousValue: inventoryData.previousValue
    });
};

