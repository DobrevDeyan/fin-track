import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import multer from 'multer';
import { processDocument } from './document-ai-handler';
import * as fs from 'fs';

const app = express();

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
    console.log(`[REQ] ${method} ${url} origin=${headers.origin || 'none'}`);
    _res.on('finish', () => {
        console.log(`[RES] ${method} ${url} status=${_res.statusCode} duration=${Date.now() - start}ms`);
    });
    next();
});

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

// Health check endpoint
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

// Receipt/bill upload endpoint
app.post('/api/upload-bill', upload.single('billFile'), async (req: Request, res: Response, _next: NextFunction) => {
    if (!req.file) {
        res.status(400).json({
            success: false,
            error: 'No file uploaded.',
            message: 'Please provide a file with the key "billFile".',
        });
        return;
    }

    try {
        const { requestId, userId } = req.body;
        
        // Process the document with Document AI
        const extractedData = await processDocument(
            req.file.path, 
            req.file.mimetype,
            requestId ? String(requestId) : undefined,
            userId ? String(userId) : undefined
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
});
