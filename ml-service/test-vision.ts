/**
 * Throwaway local harness for the Gemini vision OCR backend.
 *
 * Runs the real handler against a local image — no server, no auth, no quota,
 * no Firestore needed (logging degrades to console). Prints exactly what the
 * model collects and the token usage that drives cost.
 *
 * Usage:
 *   set -a; . ./.env.deploy; set +a      # or just: export GEMINI_API_KEY=...
 *   npx ts-node test-vision.ts path/to/receipt.jpg
 */

import * as dotenv from 'dotenv';
// override:true so the key in ml-service/.env wins over any GEMINI_API_KEY already
// exported in the shell (this machine has a different AQ.* key in its environment).
dotenv.config({ override: true });
import * as fs from 'fs';
import * as path from 'path';
import { processDocument } from './src/gemini-vision-handler';

// Per-scan cost ESTIMATES from docs/GEMINI_VISION_EVALUATION.md. Gemini pricing
// changes — confirm current rates at https://ai.google.dev/pricing. The real
// token counts printed by the handler above let you compute exact cost.
const COST_PER_SCAN_USD: Record<string, number> = {
    'gemini-3.5-flash-lite': 0.0005,
    'gemini-3.6-flash': 0.002,
};

function mimeFromPath(p: string): string {
    const ext = path.extname(p).toLowerCase();
    switch (ext) {
        case '.png': return 'image/png';
        case '.webp': return 'image/webp';
        case '.gif': return 'image/gif';
        case '.pdf': return 'application/pdf';
        default: return 'image/jpeg';
    }
}

async function main() {
    const file = process.argv[2];
    if (!file) {
        console.error('Usage: npx ts-node test-vision.ts <path-to-receipt-image>');
        process.exit(1);
    }
    if (!fs.existsSync(file)) {
        console.error(`File not found: ${file}`);
        process.exit(1);
    }
    if (!process.env.GEMINI_API_KEY) {
        console.error('GEMINI_API_KEY not set. Run: export GEMINI_API_KEY=your_key');
        process.exit(1);
    }

    const model = process.env.GEMINI_VISION_MODEL || 'gemini-3.5-flash-lite';
    console.log(`\n=== Gemini vision scan: ${file} (model: ${model}) ===\n`);

    const started = Date.now();
    const data = await processDocument(file, mimeFromPath(file), 'local-test');
    const elapsed = Date.now() - started;

    console.log('\n--- Data collected ---');
    console.log('merchant  :', data.merchant);
    console.log('amount    :', data.amount, data.currency || '');
    console.log('date      :', data.date);
    console.log('confidence:', data.confidence, data.confidence < 0.7 ? '(LOW — would warn the user)' : '');
    console.log('items     :', data.items.length ? data.items : '(none)');
    console.log('grounded? :', data.rawEntities.amountGrounded);
    console.log('\n--- rawText (verbatim OCR) ---');
    console.log(data.rawText || '(empty)');

    console.log('\n--- Timing & cost ---');
    console.log(`latency   : ${elapsed}ms  (see "Tokens:" line above for usage)`);
    const est = COST_PER_SCAN_USD[model];
    if (est != null) {
        console.log(`est. cost : ~$${est.toFixed(4)}/scan  →  1,000 scans ≈ $${(est * 1000).toFixed(2)}`);
    } else {
        console.log(`est. cost : unknown for "${model}" — see the Tokens line + https://ai.google.dev/pricing`);
    }
    console.log('(estimate from docs/GEMINI_VISION_EVALUATION.md — confirm current pricing)\n');
}

main().catch((e) => {
    console.error('\nScan failed:', e.message);
    process.exit(1);
});
