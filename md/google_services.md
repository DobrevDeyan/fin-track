# Google Services Inventory & Cost Tracking

This document provides a comprehensive list of Google services used in the **Pocket (fin-track)** project, including their pricing models, free tier limits, and links to track usage.

## Project Overview
- **Project ID:** `fin-track-adc2c`
- **Primary Region:** `europe-west1` (Cloud Run) / `eu` (Document AI)
- **Firebase Services Region:** Default (`us-central1` for Functions; Firestore region set at project creation)
- **Region Strategy:** EU for ML/Document AI (lower latency, data residency), Firebase defaults for everything else

---

## 1. Firebase Suite (Frontend & Logic)
Managed via the [Firebase Console](https://console.firebase.google.com/project/fin-track-adc2c/overview).

| Service | Purpose | Free Tier (Spark/Blaze) | Tracker Link |
| :--- | :--- | :--- | :--- |
| **Firebase Authentication** | User login (Email/PW) | 50,000 Monthly Active Users | [Auth Dashboard](https://console.firebase.google.com/project/fin-track-adc2c/authentication/users) |
| **Cloud Firestore** | Primary NoSQL Database | 1GB storage, 50k reads/day, 20k writes/day, 20k deletes/day | [Firestore Usage](https://console.firebase.google.com/project/fin-track-adc2c/firestore/usage) |
| **Firebase Hosting** | Web app deployment | 10GB data transfer/month, 1GB storage | [Hosting Usage](https://console.firebase.google.com/project/fin-track-adc2c/hosting/main) |
| **Firebase Storage** | File storage (receipts) | 5GB storage, 1GB/day download, 20k/day uploads | [Storage Usage](https://console.firebase.google.com/project/fin-track-adc2c/storage) |
| **Cloud Functions** | Backend logic (TS) | 2M invocations/month, 400k GB-sec, 200k GHz-sec (Blaze required*) | [Functions Usage](https://console.firebase.google.com/project/fin-track-adc2c/functions/list) |

*\*Note: Cloud Functions requires the Blaze (Pay-as-you-go) plan to deploy, but usually stays within the free tier for small projects.*

**Security note:** No `storage.rules` file exists in the project. Firebase Storage is in use but has no custom security rules defined — consider adding rules to restrict access.

---

## 2. Google Cloud Platform (GCP) Services
Managed via the [Google Cloud Console](https://console.cloud.google.com/).

| Service | Purpose | Pricing / Free Tier Details | Tracker Link |
| :--- | :--- | :--- | :--- |
| **Google Cloud Run** | Hosting the `ml-service` (receipt scanning + AI insights) | **Note:** Deployed to `europe-west1`. Free tier (180k vCPU-sec, 360k GiB-sec) only applies to US regions. Estimated cost ~$1-2/month with `min-instances: 0`. | [Cloud Run Services](https://console.cloud.google.com/run?project=fin-track-adc2c) |
| **Document AI** | Receipt/Bill scanning | **Expense Parser** (`566b35e21d475435`, `eu` region): ~$0.01 per page. No permanent free tier beyond trial credits. | [Document AI Console](https://console.cloud.google.com/ai/document-ai/processors?project=fin-track-adc2c) |
| **Google Gemini AI** | AI Monthly Digest + AI Budget Coach Chat | Free tier via Google AI Studio (`aistudio.google.com`). Project: `gen-lang-client-0231536440` (Pocket). Model: `gemini-2.5-flash`. ~15 RPM, 1500 RPD. No billing required. | [Google AI Studio](https://aistudio.google.com) |
| **Artifact Registry** | Storing Docker images | 0.5 GB storage free per month. | [Artifact Registry](https://console.cloud.google.com/artifacts?project=fin-track-adc2c) |
| **Cloud Build** | CI/CD for ML service | 120 build-minutes free per day. | [Cloud Build History](https://console.cloud.google.com/cloud-build/builds?project=fin-track-adc2c) |
| **Cloud Storage** | Persistent file storage | 5 GB Standard Storage free (US regions only). | [Storage Browser](https://console.cloud.google.com/storage/browser?project=fin-track-adc2c) |

---

## 3. Reference for Exact Cost & Usage

To see exactly how much you are spending:

1.  **GCP Billing Dashboard:** [Google Cloud Billing](https://console.cloud.google.com/billing)
    -   Go here to see "Cost at a Glance" and "Cost by Service".
    -   Set **Budgets & Alerts** to avoid unexpected charges.
2.  **Firebase Usage & Billing:** [Firebase Usage Tab](https://console.firebase.google.com/project/fin-track-adc2c/usage)
    -   Gives a high-level view of how much of your Spark/Blaze quotas you've used.
3.  **Document AI Activity:** [Document AI Monitoring](https://console.cloud.google.com/ai/document-ai/monitoring?project=fin-track-adc2c)
    -   Tracks number of pages processed by your specific processors.

---

## 4. Key Recommendations

1.  **Cloud Run Region:** Deployed to `europe-west1` intentionally — lower latency from EU, financial data stays in EU. The free tier (US-only) savings are minimal (~$1-2/month) and not worth the trade-off.
2.  **Storage Rules:** Add `storage.rules` to secure Firebase Storage uploads (currently no custom rules defined).
3.  **IAM Cleanup:** Review service account permissions periodically — remove unused roles (e.g., Document AI from `firebase-adminsdk`, A/B Testing Admin if unused).
4.  **Processor ID:** Current live processor is `expense_parser` (`566b35e21d475435`, `eu` region). Referenced in both `deploy.sh` and `.env.example`.

---

## 5. Other Integrations
- **Google Fonts:** Used for *Inter* and *Poppins* via `next/font/google`. No cost or usage limits.
- **Google Analytics (GA4):** Configured with measurement ID `G-YRYCTR1THT`. Initialized in `frontend/lib/firebase.ts` with deferred loading (3s delay). Track at [Google Analytics Console](https://analytics.google.com/).

---

## 6. Service Accounts (IAM)

| Service Account | Purpose | Key Roles |
| :--- | :--- | :--- |
| `185936461123-compute@developer.gserviceaccount.com` | Default Compute Engine SA | Editor (GCP default) |
| `bill-parser@fin-track-adc2c.iam.gserviceaccount.com` | ML service (local dev) | Cloud Datastore User, Document AI API User |
| `fin-track-adc2c@appspot.gserviceaccount.com` | App Engine / Cloud Run SA | Editor, Document AI API User |
| `firebase-adminsdk-fbsvc@fin-track-adc2c.iam.gserviceaccount.com` | Firebase Admin SDK | Firebase Auth Admin, Admin SDK Agent, Service Token Creator |
