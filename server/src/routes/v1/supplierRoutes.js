import express from 'express';
import {
    createSupplier,
    getSuppliers,
    getSupplierById,
    updateSupplier,
    deleteSupplier,
    addProductPricing,
    removeProductPricing,
    getSupplierProducts
} from '../../controllers/supplierController.js';
import { authenticate, authorize } from '../../middleware/auth.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Create supplier
router.post('/', authorize('create_suppliers'), createSupplier);

// Get all suppliers
router.get('/', authorize('view_suppliers'), getSuppliers);

// Get supplier by ID
router.get('/:id', authorize('view_suppliers'), getSupplierById);

// Update supplier
router.put('/:id', authorize('edit_suppliers'), updateSupplier);

// Delete supplier
router.delete('/:id', authorize('delete_suppliers'), deleteSupplier);

// Add/update product pricing
router.post('/:id/pricing', authorize('edit_suppliers'), addProductPricing);

// Remove product pricing
router.delete('/:id/pricing/:productId', authorize('edit_suppliers'), removeProductPricing);

// Get supplier's products with prices
router.get('/:id/products', authorize('view_suppliers'), getSupplierProducts);

export default router;

