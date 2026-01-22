import express from 'express';
import { login, register, logout, acceptInvite, getCurrentUser } from '../../controllers/authController.js';
import { authenticate } from '../../middleware/auth.js';

const router = express.Router();

router.post('/login', login);
router.post('/register', register);
router.post('/logout', logout); 
router.post('/accept-invite', acceptInvite);

// Protected routes (authentication required)
router.get('/current-user', authenticate, getCurrentUser);

export default router;

