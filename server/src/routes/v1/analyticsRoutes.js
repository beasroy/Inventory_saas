import express from 'express';
import { getDashboardData } from '../../controllers/analyticsController.js';
import { authenticate, authorize } from '../../middleware/auth.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Get dashboard analytics
router.get('/dashboard', authorize('view_inventory'), getDashboardData);

export default router;

