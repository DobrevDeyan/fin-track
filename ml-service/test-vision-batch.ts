/**
 * Batch accuracy harness for the Gemini vision backend (shadow-mode eval).
 *
 * Two passes so you never double-spend the API and scoring is deterministic:
 *
 *   1. RUN   — scan every image in a folder, cache predictions to vision-run.json,
 *              and emit a ground-truth.csv template pre-filled with the file names.
 *        npx ts-node test-vision-batch.ts run "C:/path/to/receipts"
 *
 *   2. label — open ground-truth.csv in Excel, fill true_amount / true_date /
 *              true_merchant for each receipt by looking at the ACTUAL receipt
 *              (don't rubber-stamp the pred_* reference columns — that defeats it).
 *
 *   3. SCORE — join the cache to your labels and print the scorecard.
 *        npx ts-node test-vision-batch.ts score
 *
 * No new dependencies; minimal CSV read/write is inlined.
 */

import * as dotenv from 'dotenv';
dotenv.config({ override: true });
import * as fs from 'fs';
import * as path from 'path';
import { processDocument } from './src/gemini-vision-handler';

const RUN_CACHE = 'vision-run.json';
const TRUTH_CSV = 'ground-truth.csv';
const IMG_EXT = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif', '.pdf']);

interface RunResult {
    file: string;
    ok: boolean;
    amount?: number;
    currency?: string;
    date?: string;
    merchant?: string;
    grounded?: boolean;
    confidence?: number;
    items?: number;
    latencyMs: number;
    error?: string;
}

function mimeFromPath(p: string): string {
    switch (path.extname(p).toLowerCase()) {
        case '.png': return 'image/png';
        case '.webp': return 'image/webp';
        case '.gif': return 'image/gif';
        case '.pdf': return 'application/pdf';
        default: return 'image/jpeg';
    }
}

// ── minimal CSV ──────────────────────────────────────────────────────────────
function csvEscape(v: string): string {
    return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v;
}

function csvParseLine(line: string): string[] {
    const out: string[] = [];
    let cur = '';
    let inQ = false;
    for (let i = 0; i < line.length; i++) {
        const c = line[i];
        if (inQ) {
            if (c === '"' && line[i + 1] === '"') { cur += '"'; i++; }
            else if (c === '"') inQ = false;
            else cur += c;
        } else if (c === '"') inQ = true;
        else if (c === ',') { out.push(cur); cur = ''; }
        else cur += c;
    }
    out.push(cur);
    return out;
}

// ── RUN ──────────────────────────────────────────────────────────────────────
async function run(dir: string) {
    if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) {
        console.error(`Not a directory: ${dir}`);
        process.exit(1);
    }
    const files = fs.readdirSync(dir).filter(f => IMG_EXT.has(path.extname(f).toLowerCase()));
    if (!files.length) {
        console.error(`No images found in ${dir}`);
        process.exit(1);
    }
    console.log(`Scanning ${files.length} images from ${dir}\n`);

    const results: RunResult[] = [];
    for (let i = 0; i < files.length; i++) {
        const f = files[i];
        const t0 = Date.now();
        process.stdout.write(`[${i + 1}/${files.length}] ${f} ... `);
        try {
            const d = await processDocument(path.join(dir, f), mimeFromPath(f), 'batch');
            const grounded = d.rawEntities.amountGrounded === 'true';
            results.push({
                file: f, ok: true, amount: d.amount, currency: d.currency || '', date: d.date,
                merchant: d.merchant, grounded, confidence: d.confidence, items: d.items.length,
                latencyMs: Date.now() - t0,
            });
            console.log(`${d.amount} ${d.currency || ''}  grounded=${grounded}  ${Date.now() - t0}ms`);
        } catch (e: any) {
            results.push({ file: f, ok: false, error: e.message, latencyMs: Date.now() - t0 });
            console.log(`FAILED: ${e.message}`);
        }
    }

    fs.writeFileSync(RUN_CACHE, JSON.stringify(results, null, 2));
    console.log(`\nCached predictions → ${RUN_CACHE}`);

    // Emit / refresh the labeling template. Preserve any labels already filled in.
    const existing: Record<string, string[]> = {};
    if (fs.existsSync(TRUTH_CSV)) {
        const rows = fs.readFileSync(TRUTH_CSV, 'utf8').split(/\r?\n/).filter(Boolean).slice(1);
        for (const r of rows) {
            const c = csvParseLine(r);
            existing[c[0]] = c;
        }
    }
    const header = 'file,true_amount,true_date,true_merchant,pred_amount,pred_date,pred_merchant,grounded';
    const lines = [header];
    for (const r of results) {
        const prev = existing[r.file];
        lines.push([
            csvEscape(r.file),
            prev ? csvEscape(prev[1] || '') : '',
            prev ? csvEscape(prev[2] || '') : '',
            prev ? csvEscape(prev[3] || '') : '',
            String(r.amount ?? ''),
            csvEscape(r.date ?? ''),
            csvEscape(r.merchant ?? ''),
            String(r.grounded ?? ''),
        ].join(','));
    }
    fs.writeFileSync(TRUTH_CSV, lines.join('\n') + '\n');
    console.log(`Labeling template → ${TRUTH_CSV}  (fill true_amount / true_date / true_merchant, then: score)`);
}

// ── SCORE ────────────────────────────────────────────────────────────────────
function norm(s: string): string {
    return (s || '').toUpperCase().replace(/[^A-Z0-9А-Я]/gi, '');
}

function score() {
    if (!fs.existsSync(RUN_CACHE) || !fs.existsSync(TRUTH_CSV)) {
        console.error(`Need both ${RUN_CACHE} and a filled ${TRUTH_CSV}. Run the "run" pass first.`);
        process.exit(1);
    }
    const preds: RunResult[] = JSON.parse(fs.readFileSync(RUN_CACHE, 'utf8'));
    const predBy: Record<string, RunResult> = {};
    for (const p of preds) predBy[p.file] = p;

    const rows = fs.readFileSync(TRUTH_CSV, 'utf8').split(/\r?\n/).filter(Boolean).slice(1);

    let labeled = 0, amtCorrect = 0, dateCorrect = 0, dateLabeled = 0, merchCorrect = 0, merchLabeled = 0;
    let tp = 0, falseAlarm = 0, silentBad = 0, caught = 0; // grounding confusion matrix
    const failures: string[] = [];
    const dangerous: string[] = [];
    const latencies: number[] = [];

    for (const r of rows) {
        const c = csvParseLine(r);
        const file = c[0];
        const trueAmt = c[1]?.trim();
        const trueDate = c[2]?.trim();
        const trueMerch = c[3]?.trim();
        const p = predBy[file];
        if (!p) continue;
        if (p.ok === false) { failures.push(`${file}: ${p.error}`); continue; }
        if (p.latencyMs) latencies.push(p.latencyMs);

        if (!trueAmt) continue; // unlabeled amount → skip from accuracy
        labeled++;

        const predAmt = p.amount ?? 0;
        const amtOk = Math.abs(predAmt - parseFloat(trueAmt)) < 0.005;
        if (amtOk) amtCorrect++;

        // Grounding confusion matrix — the number that decides prod-safety.
        if (amtOk && p.grounded) tp++;
        else if (amtOk && !p.grounded) falseAlarm++;
        else if (!amtOk && p.grounded) { silentBad++; dangerous.push(`${file}: got ${predAmt}, expected ${trueAmt} (grounded=TRUE → would ship silently)`); }
        else caught++;

        if (trueDate) { dateLabeled++; if (p.date === trueDate) dateCorrect++; }
        if (trueMerch) { merchLabeled++; const a = norm(p.merchant || ''), b = norm(trueMerch); if (a && b && (a.includes(b) || b.includes(a))) merchCorrect++; }
    }

    latencies.sort((a, b) => a - b);
    const pct = (n: number, d: number) => d ? `${((n / d) * 100).toFixed(1)}%` : 'n/a';
    const p = (q: number) => latencies.length ? latencies[Math.min(latencies.length - 1, Math.floor(q * latencies.length))] : 0;

    console.log('\n════════════ VISION ACCURACY SCORECARD ════════════');
    console.log(`Labeled receipts scored : ${labeled}`);
    console.log(`Amount exact-match      : ${amtCorrect}/${labeled}  (${pct(amtCorrect, labeled)})   <- the gate`);
    console.log(`Date exact-match        : ${dateCorrect}/${dateLabeled}  (${pct(dateCorrect, dateLabeled)})`);
    console.log(`Merchant fuzzy-match    : ${merchCorrect}/${merchLabeled}  (${pct(merchCorrect, merchLabeled)})`);
    console.log('\n── Grounding confusion matrix (amount) ──');
    console.log(`  ✅ correct & grounded    : ${tp}`);
    console.log(`  ⚠️  correct & NOT grounded: ${falseAlarm}   (false alarms — safe, user warned needlessly)`);
    console.log(`  ✅ wrong & NOT grounded   : ${caught}   (grounding caught the error)`);
    console.log(`  🔴 wrong & GROUNDED       : ${silentBad}   (SILENT BAD DATA — the prod-safety blocker)`);
    console.log(`\nLatency  p50=${p(0.5)}ms  p99=${p(0.99)}ms`);
    if (dangerous.length) {
        console.log('\n🔴 Silent-bad-data cases (fix before trusting in prod):');
        for (const d of dangerous) console.log('   ' + d);
    }
    if (failures.length) {
        console.log('\nScan failures:');
        for (const f of failures) console.log('   ' + f);
    }
    console.log('\nRule of thumb: 🔴 must be 0, and amount exact-match should beat your Document AI baseline.\n');
}

// ── CLI ──────────────────────────────────────────────────────────────────────
const [, , cmd, arg] = process.argv;
if (cmd === 'run' && arg) run(arg).catch(e => { console.error(e); process.exit(1); });
else if (cmd === 'score') score();
else {
    console.log('Usage:\n  npx ts-node test-vision-batch.ts run "C:/path/to/receipts"\n  npx ts-node test-vision-batch.ts score');
    process.exit(1);
}
