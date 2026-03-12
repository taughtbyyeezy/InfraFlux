import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import routes from './routes.js';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

dotenv.config();

const app = express();

// Basic security headers
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'"], // unsafe-inline needed for some dev tools, but ideally restricted
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
            imgSrc: ["'self'", "data:", "https://*.basemaps.cartocdn.com", "https://*.ibb.co", "https://raw.githubusercontent.com"],
            connectSrc: ["'self'", "https://api.imgbb.com", "http://localhost:3001", "https://*.basemaps.cartocdn.com"],
            fontSrc: ["'self'", "https://fonts.gstatic.com"],
            objectSrc: ["'none'"],
            upgradeInsecureRequests: [],
        },
    },
}));

app.use(cors({
    origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-admin-secret']
}));
app.use(express.json());

// Rate limiting: 10 reports per hour per IP
const hourlyReportLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 10,
    message: { error: 'Hourly limit reached: Max 10 reports per hour.' },
    standardHeaders: true,
    legacyHeaders: false,
});

// Rate limiting: 25 reports per day per IP
const dailyReportLimiter = rateLimit({
    windowMs: 24 * 60 * 60 * 1000, // 24 hours
    max: 25,
    message: { error: 'Daily limit reached: Max 25 reports per day for your safety.' },
    standardHeaders: true,
    legacyHeaders: false,
});

// Apply daily limit first, then hourly limit
app.use('/api/report', dailyReportLimiter, hourlyReportLimiter);

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api', routes);

export default app;
