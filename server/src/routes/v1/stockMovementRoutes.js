import express from 'express';
import {
    createStockMovement,
    getStockMovements,
    getStockHistory
} from '../../controllers/stockMovementController.js';
import { authenticate, authorize } from '../../middleware/auth.js';

const router = express.Router();


router.use(authenticate);


router.post('/', authorize('adjust_inventory'), createStockMovement);


router.get('/', authorize('view_inventory'), getStockMovements);


router.get('/products/:productId/variants/:sku', authorize('view_inventory'), getStockHistory);

export default router;

