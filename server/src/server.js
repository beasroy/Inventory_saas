import http from 'http';
import app from './app.js';
import dotenv from 'dotenv';
import connectDB from './config/database.js';
import { initializeSocket } from './config/socket.js';

dotenv.config();

const PORT = process.env.PORT || 5000;

connectDB();


const httpServer = http.createServer(app);

const io = initializeSocket(httpServer);

app.set('io', io);


httpServer.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Socket.io initialized`);
});