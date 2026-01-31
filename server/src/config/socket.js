import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Tenant from '../models/Tenant.js';

// Store connected clients by tenantId
const connectedClients = new Map(); // tenantId -> Set of socketIds

export const initializeSocket = (httpServer) => {
    const io = new Server(httpServer, {
        cors: {
            origin: process.env.FRONTEND_URL || 'http://localhost:5173',
            credentials: true,
            methods: ['GET', 'POST']
        },
        transports: ['websocket', 'polling']
    });

    // Authentication middleware for Socket.io
    io.use(async (socket, next) => {
        try {
            const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');
            
            if (!token) {
                return next(new Error('Authentication error: No token provided'));
            }

            // Verify JWT token
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            
            // Get user and tenant
            const user = await User.findById(decoded.userId);
            if (!user || user.status === 'suspended') {
                return next(new Error('Authentication error: Invalid user'));
            }

            const tenant = await Tenant.findById(user.tenantId);
            if (!tenant || tenant.status !== 'active') {
                return next(new Error('Authentication error: Invalid tenant'));
            }

            // Attach user and tenant to socket
            socket.userId = user._id.toString();
            socket.tenantId = tenant._id.toString();
            socket.userRole = user.role;

            next();
        } catch (error) {
            console.error('Socket authentication error:', error);
            next(new Error('Authentication error: Invalid token'));
        }
    });

    // Handle connections
    io.on('connection', (socket) => {
        const tenantId = socket.tenantId;
        const userId = socket.userId;

        console.log(`Socket connected: ${socket.id} (User: ${userId}, Tenant: ${tenantId})`);

        // Add socket to tenant's connected clients
        if (!connectedClients.has(tenantId)) {
            connectedClients.set(tenantId, new Set());
        }
        connectedClients.get(tenantId).add(socket.id);

        // Join tenant-specific room for targeted broadcasts
        socket.join(`tenant:${tenantId}`);

        // Handle disconnection
        socket.on('disconnect', () => {
            console.log(`Socket disconnected: ${socket.id}`);
            
            // Remove from connected clients
            if (connectedClients.has(tenantId)) {
                connectedClients.get(tenantId).delete(socket.id);
                if (connectedClients.get(tenantId).size === 0) {
                    connectedClients.delete(tenantId);
                }
            }
        });

        // Handle ping/pong for connection health
        socket.on('ping', () => {
            socket.emit('pong');
        });
    });

    return io;
};

// Helper function to emit events to a specific tenant
export const emitToTenant = (io, tenantId, event, data) => {
    if (!io) {
        console.warn('Socket.io server not initialized');
        return;
    }

    io.to(`tenant:${tenantId}`).emit(event, {
        ...data,
        timestamp: new Date().toISOString()
    });
};

// Helper function to emit events to all connected clients of a tenant
export const broadcastToTenant = (io, tenantId, event, data) => {
    emitToTenant(io, tenantId, event, data);
};

export default { initializeSocket, emitToTenant, broadcastToTenant };

