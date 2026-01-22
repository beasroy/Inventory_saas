import express from 'express';
import authRoutes from './authRoutes.js';

const router = express.Router();

// Mount versioned routes
router.use('/auth', authRoutes);

// Add more route modules here as you create them
// router.use('/products', productRoutes);
// router.use('/orders', orderRoutes);
// router.use('/inventory', inventoryRoutes);

export default router;

