import express from 'express';
import {
    createProduct,
    getProducts,
    getProductById,
    updateProduct,
    deleteProduct,
    getProductVariants
} from '../../controllers/productController.js';
import { authenticate, authorize } from '../../middleware/auth.js';

const router = express.Router();


router.use(authenticate);


router.post('/', authorize('create_products'), createProduct);


router.get('/', authorize('view_products'), getProducts);


router.get('/:id', authorize('view_products'), getProductById);


router.put('/:id', authorize('edit_products'), updateProduct);


router.delete('/:id', authorize('delete_products'), deleteProduct);


router.get('/:id/variants', authorize('view_products'), getProductVariants);

export default router;

