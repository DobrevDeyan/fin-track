# Google Services Inventory & Cost Tracking

This document provides a comprehensive list of Google services used in the **Pocket (fin-track)** project, including their pricing models, free tier limits, and links to track usage.

## Project Overview
- **Project ID:** `fin-track-adc2c`
- **Primary Region:** `europe-west1` (Cloud Run / ML service) / `eu` (Document AI)
- **Firestore Region:** `europe-west4` (set at project creation — cannot be changed)
- **Firebase Functions Region:** `us-central1` (scheduled + callable functions) / `europe-west4` (Firestore triggers — must match database region)
- **Region Strategy:** EU for ML/Document AI (lower latency, data residency); Firestore triggers co-located with database in `europe-west4`; other functions remain in `us-central1`

---

## 1. Firebase Suite (Frontend & Logic)
Managed via the [Firebase Console](https://console.firebase.google.com/project/fin-track-adc2c/overview).

| Service | Purpose | Free Tier (Spark/Blaze) | Tracker Link |
| :--- | :--- | :--- | :--- |
| **Firebase Authentication** | User login (Email/Password + Google) | 50,000 Monthly Active Users | [Auth Dashboard](https://console.firebase.google.com/project/fin-track-adc2c/authentication/users) |
| **Cloud Firestore** | Primary NoSQL database (`europe-west4`) | 1GB storage, 50k reads/day, 20k writes/day, 20k deletes/day | [Firestore Usage](https://console.firebase.google.com/project/fin-track-adc2c/firestore/usage) |
| **Firebase Hosting** | Web app deployment (PWA) | 10GB data transfer/month, 1GB storage | [Hosting Usage](https://console.firebase.google.com/project/fin-track-adc2c/hosting/main) |
| **Firebase Storage** | Receipt image storage | 5GB storage, 1GB/day download, 20k/day uploads | [Storage Usage](https://console.firebase.google.com/project/fin-track-adc2c/storage) |
| **Cloud Functions (v2)** | Backend logic — 5 custom functions (see below) | 2M invocations/month, 400k GB-sec, 200k GHz-sec (Blaze required*) | [Functions Console](https://console.firebase.google.com/project/fin-track-adc2c/functions/list) |
| **Eventarc** | Event routing for Firestore-triggered functions | 2.5M events/month free | [Eventarc Console](https://console.cloud.google.com/eventarc/triggers?project=fin-track-adc2c) |
| **Firebase Extensions** | Stripe payments integration (6 managed functions) | Billed per invocation same as Cloud Functions | [Extensions Console](https://console.firebase.google.com/project/fin-track-adc2c/extensions) |
| **Firebase Cloud Messaging (FCM)** | Push notifications — budget alerts, goal milestones | **Free, unlimited** — no pricing tier exists | [FCM Console](https://console.firebase.google.com/project/fin-track-adc2c/messaging) |

*\*Note: Cloud Functions requires the Blaze (Pay-as-you-go) plan to deploy, but usually stays within the free tier for small projects.*

---

## 2. Cloud Functions Inventory (v2)

### Custom Functions
| Function | Region | Trigger | Schedule | Purpose |
| :--- | :--- | :--- | :--- | :--- |
| `checkBudgetOnEntry` | `europe-west4` | `document.created` (entries) | On every entry creation | Checks if any monthly budget crossed 80%/100% threshold → sends FCM push notification |
| `onEntryDeleted` | `europe-west4` | `document.deleted` (entries) | On every entry deletion | Audit log — writes to `auditLog` collection |
| `onLargeEntryCreated` | `europe-west4` | `document.created` (entries) | On every entry creation | Flags transactions ≥ €10,000 in `auditLog` |
| `processMyRecurringTransactions` | `us-central1` | HTTP (callable) | On-demand | User-triggered recurring transaction processing. Rate limited: 3 calls / 5 min |
| `processRecurringTransactionsScheduled` | `us-central1` | Cloud Scheduler | Daily at 01:00 UTC | Auto-processes all due recurring transactions |
| `resetMonthlyScanCounts` | `us-central1` | Cloud Scheduler | 1st of month at 00:05 UTC | Resets OCR scan quota for all users |
| `getMyHousehold` | `europe-west4` | HTTP (callable) | On-demand | Returns household data via Admin SDK (bypasses rules/cache). Backfills `memberUids` if missing |
| `createHousehold` | `europe-west4` | HTTP (callable) | On-demand | Creates household, sets owner as first member (email from auth token, lowercased) |
| `sendHouseholdInvite` | `europe-west4` | HTTP (callable) | On-demand | Creates 7-day invite token; expires existing pending invites for same email+household |
| `acceptHouseholdInvite` | `europe-west4` | HTTP (callable) | On-demand | Validates token + email; adds member via `arrayUnion`; sets `householdId` on user doc |
| `getHouseholdEntries` | `europe-west4` | HTTP (callable) | On-demand | Returns merged entries for all household members |
| `leaveHousehold` | `europe-west4` | HTTP (callable) | On-demand | Removes member; transfers ownership if owner; deletes household if last member |

### Stripe Extension Functions (v1, managed by Firebase Extension)
| Function | Region | Trigger | Purpose |
| :--- | :--- | :--- | :--- |
| `ext-firestore-stripe-payments-createCheckoutSession` | `us-central1` | `document.create` (`customers/{uid}/checkout_sessions/{id}`) | Creates Stripe checkout session |
| `ext-firestore-stripe-payments-createCustomer` | `us-central1` | `user.create` | Creates Stripe customer on new user |
| `ext-firestore-stripe-payments-createPortalLink` | `us-central1` | HTTP | Generates Stripe customer portal link |
| `ext-firestore-stripe-payments-handleWebhookEvents` | `us-central1` | HTTP | Handles Stripe webhook events |
| `ext-firestore-stripe-payments-onCustomerDataDeleted` | `us-central1` | `document.delete` (`customers/{uid}`) | Cleans up Stripe customer on data deletion |
| `ext-firestore-stripe-payments-onUserDeleted` | `us-central1` | `user.delete` | Removes Stripe customer when user is deleted |

*Note: Stripe extension functions are v1 (1st gen) — upgrade is "Ready" but managed by the extension, not custom code.*

---

## 3. Google Cloud Platform (GCP) Services
Managed via the [Google Cloud Console](https://console.cloud.google.com/).

| Service | Purpose | Pricing / Free Tier Details | Tracker Link |
| :--- | :--- | :--- | :--- |
| **Google Cloud Run** | Hosts `ml-service` (receipt scanning + AI insights) in `europe-west1` | Free tier applies to US regions only. Estimated ~$1-2/month with `min-instances: 0`. | [Cloud Run Services](https://console.cloud.google.com/run?project=fin-track-adc2c) |
| **Document AI** | Receipt/bill OCR parsing | **Expense Parser** processor ID `566b35e21d475435`, `eu` region. ~$0.01/page. No permanent free tier. | [Document AI Console](https://console.cloud.google.com/ai/document-ai/processors?project=fin-track-adc2c) |
| **Google Gemini AI** | AI Monthly Digest + AI Budget Coach Chat | Free tier via Google AI Studio. Project: `gen-lang-client-0231536440`. Model: `gemini-2.5-flash`. ~15 RPM, 1500 RPD. No billing required. | [Google AI Studio](https://aistudio.google.com) |
| **Cloud Scheduler** | Triggers scheduled Cloud Functions | 3 free jobs/month. Both jobs active and healthy. | [Cloud Scheduler](https://console.cloud.google.com/cloudscheduler?project=fin-track-adc2c) |
| **Cloud Pub/Sub** | Message bus backing Cloud Scheduler | 10GB/month free. | [Pub/Sub Console](https://console.cloud.google.com/cloudpubsub?project=fin-track-adc2c) |
| **Artifact Registry** | Stores Docker images for Cloud Functions (v2) and Cloud Run | 0.5 GB free/month. **Cleanup policy set to 30 days** (europe-west4 + us-central1). | [Artifact Registry](https://console.cloud.google.com/artifacts?project=fin-track-adc2c) |
| **Cloud Build** | CI/CD for ML service Docker builds | 120 build-minutes free/day. | [Cloud Build History](https://console.cloud.google.com/cloud-build/builds?project=fin-track-adc2c) |
| **Cloud Storage** | Backing store for Firebase Storage and build artifacts | 5 GB Standard Storage free (US regions only). | [Storage Browser](https://console.cloud.google.com/storage/browser?project=fin-track-adc2c) |

---

## 4. Firestore Collections

| Collection | Purpose | Access |
| :--- | :--- | :--- |
| `users` | User profiles + `fcmTokens[]` + `householdId` pointer | Owner only |
| `entries` | Financial transactions | Owner only |
| `budgets` | Monthly budgets | Owner only |
| `savingsAccounts` | Savings accounts | Owner only |
| `goals` | Financial goals | Owner only |
| `recurringTransactions` | Recurring transaction templates | Owner only |
| `financialSummaries` | Aggregated financial data cache | Owner only (doc ID = userId) |
| `aiInsights` | AI-generated monthly digest cache | Owner only (doc ID = userId) |
| `scanUsage` | OCR scan quota per user | Read only (written by Admin SDK) |
| `assets` | Net worth assets tracking | Owner only |
| `households` | Household name, ownerUid, members[], memberUids[] | Members (`uid in memberUids`) — read only; all writes via CF |
| `householdInvites` | 7-day email invite tokens | Owner/inviter only (written by CF) |
| `userDebts` | Debt Payoff Planner items | Owner only (doc ID = userId) |
| `auditLog` | Security audit trail (deletions, large transactions) | Admin SDK only — no client access |
| `rateLimits` | Per-user rate limit tracking for callable functions | Admin SDK only — no client access |
| `customers` | Stripe customer data (managed by extension) | Owner only |
| `products` | Stripe products/prices (managed by extension) | Read-only for authenticated users |

---

## 5. Reference for Exact Cost & Usage

1. **GCP Billing Dashboard:** [Google Cloud Billing](https://console.cloud.google.com/billing)
   - "Cost at a Glance" and "Cost by Service" breakdown.
   - Set **Budgets & Alerts** to avoid unexpected charges.
2. **Firebase Usage & Billing:** [Firebase Usage Tab](https://console.firebase.google.com/project/fin-track-adc2c/usage)
   - High-level view of Spark/Blaze quota usage.
3. **Document AI Activity:** [Document AI Monitoring](https://console.cloud.google.com/ai/document-ai/monitoring?project=fin-track-adc2c)
   - Tracks pages processed by the expense parser.
4. **Cloud Scheduler Health:** [Cloud Scheduler Console](https://console.cloud.google.com/cloudscheduler?project=fin-track-adc2c)
   - Verify scheduled jobs show "Success" on last execution.

---

## 6. Key Recommendations & Notes

1. **Cloud Run Region:** Deployed to `europe-west1` intentionally — lower latency from EU, financial data stays in EU. Free tier (US-only) savings minimal (~$1-2/month).
2. **Storage Rules:** `storage.rules` configured — `receipts/{userId}/**` read/write requires `auth.uid == userId`, all other paths deny by default. ✅
3. **Firestore Trigger Region:** `onEntryDeleted` and `onLargeEntryCreated` deployed to `europe-west4` to match Firestore database region. Eventarc triggers are created in the same region as the database. ✅
4. **Artifact Registry Cleanup:** 30-day image retention policy set for both `europe-west4` and `us-central1` repositories to prevent storage accumulation. ✅
5. **Node.js 20 Deprecation:** Cloud Functions runtime Node.js 20 deprecated **2026-04-30**, decommissioned **2026-10-30**. Upgrade `functions/package.json` engines to `"node": "22"` before April 2026.
6. **firebase-functions package:** Outdated version in `functions/package.json`. Run `npm install --save firebase-functions@latest` in `functions/` directory.
7. **Stripe Extension v1:** 6 Stripe extension functions are v1 (1st gen) and flagged "Ready to upgrade". This is managed by the Firebase Extension, not custom code — upgrade via Firebase Extensions console when available.
8. **IAM Cleanup:** Review service account permissions periodically — remove unused roles (e.g., A/B Testing Admin if unused).
9. **Processor ID:** Current live processor is `expense_parser` (`566b35e21d475435`, `eu` region). Referenced in both `deploy.sh` and `.env.example`.

---

## 7. Other Integrations
- **Google Fonts:** Used for *Inter* and *Poppins* via `next/font/google`. No cost or usage limits.
- **Google Analytics (GA4):** Measurement ID `G-YRYCTR1THT`. Initialized in `frontend/lib/firebase.ts` with deferred loading (3s delay). Track at [Google Analytics Console](https://analytics.google.com/).
- **Firebase Cloud Messaging (FCM):** VAPID key pair generated 26 Mar 2026. Public key stored in `NEXT_PUBLIC_FCM_VAPID_KEY`. Background push handled in `sw.js` via `firebase-messaging-compat` SDK. Foreground messages shown as toasts. Tokens stored in `users/{uid}.fcmTokens[]`, auto-cleaned on invalidation by `sendPushToUser()` in Functions.

---

## 8. Service Accounts (IAM)

| Service Account | Purpose | Key Roles |
| :--- | :--- | :--- |
| `185936461123-compute@developer.gserviceaccount.com` | Default Compute Engine SA | Editor (GCP default) |
| `bill-parser@fin-track-adc2c.iam.gserviceaccount.com` | ML service (local dev) | Cloud Datastore User, Document AI API User |
| `fin-track-adc2c@appspot.gserviceaccount.com` | App Engine / Cloud Run SA | Editor, Document AI API User |
| `firebase-adminsdk-fbsvc@fin-track-adc2c.iam.gserviceaccount.com` | Firebase Admin SDK (Cloud Functions) | Firebase Auth Admin, Admin SDK Agent, Service Token Creator |
