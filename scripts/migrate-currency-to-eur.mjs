/**
 * One-time migration: normalise all stored monetary values to the canonical
 * base currency (EUR) for Model A (base-currency storage + display conversion).
 *
 * What it does:
 *   1. Fetches today's USD→EUR fixing from Frankfurter (ECB data).
 *   2. Converts every document whose `currency` is USD to EUR:
 *        entries.amount, budgets.amount, goals.targetAmount/currentAmount,
 *        savingsAccounts.balance, assets.value, userDebts.* (balance/amount fields)
 *      Sets currency:"EUR" and records originalAmount/originalCurrency for audit.
 *   3. Rebuilds financialSummaries/{uid} for every affected user from their
 *      (now EUR) entries, so all aggregates are EUR-consistent.
 *
 * Auth: uses Application Default Credentials. Run `gcloud auth application-default
 * login` first, or set GOOGLE_APPLICATION_CREDENTIALS to a service-account key.
 *
 * Usage:
 *   node scripts/migrate-currency-to-eur.mjs            # DRY RUN (no writes)
 *   node scripts/migrate-currency-to-eur.mjs --apply    # perform the migration
 *
 * NOTE: historical entries are converted at TODAY's rate (a one-time approximation).
 * Back up Firestore (or export the affected collections) before running with --apply.
 */

import admin from "firebase-admin";

const APPLY = process.argv.includes("--apply");
const BASE = "EUR";

admin.initializeApp();
const db = admin.firestore();

async function getUsdToEur() {
  const res = await fetch("https://api.frankfurter.app/latest?from=USD&to=EUR");
  if (!res.ok) throw new Error(`Rate fetch failed: ${res.status}`);
  const data = await res.json();
  const rate = data?.rates?.EUR;
  if (!rate) throw new Error("USD→EUR rate missing in response");
  return rate;
}

const round2 = (n) => Math.round(n * 100) / 100;

/** Convert one numeric field on docs in a collection where currency==='USD'. */
async function convertCollection(collection, fields, usdToEur) {
  const snap = await db.collection(collection).where("currency", "==", "USD").get();
  if (snap.empty) {
    console.log(`  ${collection}: nothing to convert`);
    return new Set();
  }

  const affectedUsers = new Set();
  let batch = db.batch();
  let ops = 0;
  let converted = 0;

  for (const doc of snap.docs) {
    const data = doc.data();
    const update = { currency: BASE, originalCurrency: "USD" };
    for (const f of fields) {
      if (typeof data[f] === "number") {
        update[`original_${f}`] = data[f];
        update[f] = round2(data[f] * usdToEur);
      }
    }
    if (data.userId) affectedUsers.add(data.userId);

    if (APPLY) {
      batch.update(doc.ref, update);
      if (++ops >= 450) { await batch.commit(); batch = db.batch(); ops = 0; }
    }
    converted++;
  }
  if (APPLY && ops > 0) await batch.commit();
  console.log(`  ${collection}: ${converted} doc(s) ${APPLY ? "converted" : "would convert"}`);
  return affectedUsers;
}

/** Recompute financialSummaries/{uid} from a user's (now-EUR) entries. */
async function rebuildSummary(userId) {
  const entriesSnap = await db.collection("entries").where("userId", "==", userId).get();

  let totalIncome = 0, totalExpenses = 0, totalSalary = 0;
  const months = {};
  for (const d of entriesSnap.docs) {
    const e = d.data();
    const dt = e.date.toDate ? e.date.toDate() : new Date(e.date);
    const key = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}`;
    months[key] ??= { income: 0, expenses: 0, salary: 0, expensesByCategory: {}, incomeByCategory: {} };
    const m = months[key];
    if (e.type === "income") {
      totalIncome += e.amount; m.income += e.amount;
      m.incomeByCategory[e.category] = (m.incomeByCategory[e.category] || 0) + e.amount;
      if (e.category === "Salary" || e.categoryId === "salary") { totalSalary += e.amount; m.salary += e.amount; }
    } else {
      totalExpenses += e.amount; m.expenses += e.amount;
      m.expensesByCategory[e.category] = (m.expensesByCategory[e.category] || 0) + e.amount;
    }
  }

  if (APPLY) {
    await db.collection("financialSummaries").doc(userId).set({
      userId, totalIncome, totalExpenses, totalSalary,
      entryCount: entriesSnap.size, months,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  }
}

async function main() {
  console.log(APPLY ? "=== APPLYING currency migration ===" : "=== DRY RUN (no writes) — pass --apply to execute ===");
  const usdToEur = await getUsdToEur();
  console.log(`USD→EUR rate: ${usdToEur}\n`);

  const affected = new Set();
  for (const u of await convertCollection("entries", ["amount"], usdToEur)) affected.add(u);
  await convertCollection("budgets", ["amount"], usdToEur);
  await convertCollection("goals", ["targetAmount", "currentAmount"], usdToEur);
  await convertCollection("savingsAccounts", ["balance"], usdToEur);
  await convertCollection("assets", ["value"], usdToEur);
  await convertCollection("userDebts", ["balance", "amount"], usdToEur);

  console.log(`\nRebuilding summaries for ${affected.size} affected user(s)...`);
  for (const uid of affected) await rebuildSummary(uid);

  console.log(APPLY ? "\nMigration complete." : "\nDry run complete. Re-run with --apply to write changes.");
  process.exit(0);
}

main().catch((err) => { console.error(err); process.exit(1); });
