import express from 'express';
import authRoutes from './authRoutes.js';
import productRoutes from './productRoutes.js';
import stockMovementRoutes from './stockMovementRoutes.js';
import supplierRoutes from './supplierRoutes.js';
import purchaseOrderRoutes from './purchaseOrderRoutes.js';

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/products', productRoutes);
router.use('/stock-movements', stockMovementRoutes);
router.use('/suppliers', supplierRoutes);
router.use('/purchase-orders', purchaseOrderRoutes);

export default router;

