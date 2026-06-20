import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import multer from 'multer';
import rateLimit from 'express-rate-limit';
import { processDocument } from './document-ai-handler';
import insightsRouter from './insights-routes';
import { requireAuth } from './middleware/auth';
import { checkSubscriptionTier, checkAndIncrementScanQuota, refundScanQuota } from './firestore-quota';
import * as fs from 'fs';

const app = express();

// Cloud Run terminates TLS at Google's front end and forwards the real client IP
// in X-Forwarded-For. Trust exactly one proxy hop so express-rate-limit keys on the
// actual client IP instead of bucketing every user under the proxy's address.
app.set('trust proxy', 1);

// Configure CORS - supports comma-separated origins for multiple environments
const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:3001')
    .split(',')
    .map(url => url.trim());

const corsOptions = {
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
        // Allow requests with no origin (health checks, server-to-server)
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            console.warn(`CORS blocked request from origin: ${origin}`);
            callback(new Error('Not allowed by CORS'));
        }
    },
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
};
app.use(cors(corsOptions));

// Parse JSON bodies
app.use(express.json());

// Request logging middleware
app.use((req: Request, _res: Response, next: NextFunction) => {
    const start = Date.now();
    const { method, url, headers } = req;
    _res.on('finish', () => {
        console.log(`[RES] ${method} ${url} status=${_res.statusCode} duration=${Date.now() - start}ms`);
    });
    next();
});

// ── Rate Limiters ─────────────────────────────────────────────────────────────

// Global: 200 requests per 15 minutes per IP
const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 200,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, error: 'Too Many Requests', message: 'Rate limit exceeded. Please try again later.' },
});
app.use(globalLimiter);

// Receipt upload: 10 requests per day per IP
const uploadLimiter = rateLimit({
    windowMs: 24 * 60 * 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, error: 'Too Many Requests', message: 'Daily receipt scan limit reached (10/day).' },
});

// AI insights: 50 requests per day per IP
const insightsLimiter = rateLimit({
    windowMs: 24 * 60 * 60 * 1000,
    max: 50,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, error: 'Too Many Requests', message: 'Daily AI insights limit reached (50/day).' },
});

// ─────────────────────────────────────────────────────────────────────────────

// Configure multer for file uploads
const upload = multer({
    dest: 'uploads/',
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB max file size
    },
    fileFilter: (_req, file, cb) => {
        // Accept images and PDFs
        const allowedMimes = [
            'image/jpeg',
            'image/png',
            'image/webp',
            'image/gif',
            'application/pdf',
        ];
        if (allowedMimes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type. Only images (JPEG, PNG, WebP, GIF) and PDFs are allowed.'));
        }
    },
});

const PORT = process.env.PORT || 8000;

// Health check endpoint — no auth required
app.get('/api/health', (_req: Request, res: Response) => {
    res.status(200).json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        environment: {
            hasProjectId: !!process.env.GCP_PROJECT_ID,
            hasProcessorId: !!process.env.GCP_PROCESSOR_ID,
            authMode: process.env.GOOGLE_APPLICATION_CREDENTIALS ? 'key-file' : 'adc',
        },
    });
});

// AI Insights routes — auth + rate limiting required
app.use('/api/insights', insightsLimiter, requireAuth, insightsRouter);

// Receipt/bill upload endpoint — auth + rate limiting required
app.post('/api/upload-bill', uploadLimiter, requireAuth, upload.single('billFile'), async (req: Request, res: Response, _next: NextFunction) => {
    if (!req.file) {
        res.status(400).json({
            success: false,
            error: 'No file uploaded.',
            message: 'Please provide a file with the key "billFile".',
        });
        return;
    }

    try {
        const { requestId } = req.body;
        // Use the verified uid from auth middleware instead of trusting client-provided userId
        const userId = req.uid!;

        // Check subscription tier and scan quota before hitting Document AI
        const tier = await checkSubscriptionTier(userId);
        const quota = await checkAndIncrementScanQuota(userId, tier);

        if (!quota.allowed) {
            if (req.file && fs.existsSync(req.file.path)) {
                fs.unlinkSync(req.file.path);
            }
            res.status(402).json({
                success: false,
                error: 'QuotaExceeded',
                message: quota.limit === 0
                    ? 'Receipt scanning requires a Pro or Business subscription.'
                    : `You have used all ${quota.limit} receipt scans for this month. Upgrade to scan more.`,
                count: quota.count,
                limit: quota.limit,
            });
            return;
        }

        // Process the document with Document AI
        const extractedData = await processDocument(
            req.file.path,
            req.file.mimetype,
            requestId ? String(requestId) : undefined,
            userId,
        );

        // Clean up the temporary file
        fs.unlinkSync(req.file.path);

        res.status(200).json({
            success: true,
            message: 'Successfully extracted data from receipt',
            data: extractedData,
        });
    } catch (error: any) {
        // Ensure file is cleaned up even on error
        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }

        // The scan was already counted before Document AI ran; since it failed,
        // refund the quota so users aren't charged for a failure (review RC1).
        if (req.uid) {
            await refundScanQuota(req.uid);
        }

        console.error('Error processing document:', error);

        res.status(500).json({
            success: false,
            error: 'Document processing failed',
            message: error.message || 'Failed to process document with AI.',
        });
    }
});

// Global error handler
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    console.error('Unhandled error:', err);

    if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
            res.status(400).json({
                success: false,
                error: 'File too large',
                message: 'File size must be less than 10MB.',
            });
            return;
        }
    }

    res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: err.message || 'An unexpected error occurred.',
    });
});

// 404 handler
app.use((_req: Request, res: Response) => {
    res.status(404).json({
        success: false,
        error: 'Not found',
        message: 'The requested endpoint does not exist.',
    });
});

app.listen(PORT, () => {
    console.log(`ML Service running on http://localhost:${PORT}`);
    console.log(`Health check: http://localhost:${PORT}/api/health`);
    console.log(`Upload endpoint: POST http://localhost:${PORT}/api/upload-bill`);
    console.log(`AI Insights: POST http://localhost:${PORT}/api/insights/digest`);
    console.log(`AI Chat:     POST http://localhost:${PORT}/api/insights/chat`);
    console.log(`Gemini AI:   ${process.env.GEMINI_API_KEY ? 'configured' : 'NOT configured (add GEMINI_API_KEY)'}`);
});
