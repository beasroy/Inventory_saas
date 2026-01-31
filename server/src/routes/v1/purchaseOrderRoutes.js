import express from 'express';
import {
    createPurchaseOrder,
    getPurchaseOrders,
    getPurchaseOrderById,
    updatePurchaseOrder,
    deletePurchaseOrder,
    updatePurchaseOrderStatus,
    createPurchaseOrderReceipt,
    getPurchaseOrderReceipts
} from '../../controllers/purchaseOrderController.js';
import { authenticate, authorize } from '../../middleware/auth.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Create purchase order
router.post('/', authorize('create_purchase_orders'), createPurchaseOrder);

// Get all purchase orders
router.get('/', authorize('view_purchase_orders'), getPurchaseOrders);

// Get purchase order by ID
router.get('/:id', authorize('view_purchase_orders'), getPurchaseOrderById);

// Update purchase order (only if Draft)
router.put('/:id', authorize('edit_purchase_orders'), updatePurchaseOrder);

// Delete purchase order (only if Draft)
router.delete('/:id', authorize('delete_purchase_orders'), deletePurchaseOrder);

// Update purchase order status
router.patch('/:id/status', authorize('edit_purchase_orders'), updatePurchaseOrderStatus);

// Create purchase order receipt
router.post('/:id/receipts', authorize('create_purchase_orders'), createPurchaseOrderReceipt);

// Get purchase order receipts
router.get('/:id/receipts', authorize('view_purchase_orders'), getPurchaseOrderReceipts);

export default router;

