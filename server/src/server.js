import http from 'http';
import app from './app.js';
import dotenv from 'dotenv';
import connectDB from './config/database.js';
import { initializeSocket } from './config/socket.js';

dotenv.config();

const PORT = process.env.PORT || 5000;

connectDB();

// Create HTTP server
const httpServer = http.createServer(app);

// Initialize Socket.io
const io = initializeSocket(httpServer);

// Make io available globally for use in controllers
app.set('io', io);

// Start server
httpServer.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Socket.io initialized`);
});