import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import v1Routes from './routes/v1/index.js';

const app = express();
  
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));

app.use(helmet());
app.use(cookieParser());
app.use(express.json());


app.use('/api/v1', v1Routes);

app.get('/health', (req, res) => {
    res.status(200).json({ 
        status: 'healthy', 
        service: 'Inventory SaaS API', 
        timestamp: new Date().toISOString()
     });
});

app.use((req, res) => {
    res.status(404).json({ 
        status: 'not_found', 
        message: 'Route not found' 
    });
});

app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
  
    const statusCode = err.status || 500;
    const message = process.env.NODE_ENV === 'production' 
      ? 'Internal server error' 
      : err.message;
    
    res.status(statusCode).json({
      status: 'error',
      message: message
    });
});


export default app;