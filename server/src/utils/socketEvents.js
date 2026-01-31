import { emitToTenant } from '../config/socket.js';


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

