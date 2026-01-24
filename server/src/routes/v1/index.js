import express from 'express';
import authRoutes from './authRoutes.js';
import productRoutes from './productRoutes.js';
import stockMovementRoutes from './stockMovementRoutes.js';

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/products', productRoutes);
router.use('/stock-movements', stockMovementRoutes);

export default router;

