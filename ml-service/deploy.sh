#!/bin/bash
# Stop on the first error so a failed gcloud step can't sail through to a false
# "Deployment complete!" with a blank URL (every gcloud call used to fail silently
# when run under bash without a working Python — see CLOUDSDK_PYTHON below).
set -e

# Configuration
PROJECT_ID="fin-track-adc2c"
SERVICE_NAME="ml-service"
REGION="europe-west1"
PROCESSOR_ID="566b35e21d475435"

# Your Firebase Hosting URLs + local dev (Cloud Run needs to allow CORS from these)
FRONTEND_URL="https://fin-track-adc2c.web.app,https://fin-track-adc2c.firebaseapp.com,http://localhost:3001,http://localhost:3000"

# Load local, untracked deploy config (gitignored) so future deploys are just
# `bash deploy.sh` with nothing to remember. It holds:
#   GEMINI_API_KEY=...      the Gemini key (never hardcode it in this committed file)
#   CLOUDSDK_PYTHON=...     path to gcloud's Python — REQUIRED on this machine, where
#                           bash can't find Python and gcloud would otherwise fail
#                           silently (Windows Store python stub).
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
if [ -f "$SCRIPT_DIR/.env.deploy" ]; then
  set -a
  . "$SCRIPT_DIR/.env.deploy"
  set +a
fi
GEMINI_API_KEY="${GEMINI_API_KEY:?Set GEMINI_API_KEY (export it, or put GEMINI_API_KEY=your_key in ml-service/.env.deploy) before deploying}"

echo "Deploying $SERVICE_NAME to Google Cloud Run..."

# Ensure we are in the correct directory
cd "$(dirname "$0")"

# 1. Enable necessary APIs
echo "Enabling required APIs..."
gcloud services enable \
  cloudbuild.googleapis.com \
  run.googleapis.com \
  artifactregistry.googleapis.com \
  documentai.googleapis.com \
  --project "$PROJECT_ID"

# 2. Create Artifact Registry repository (if it doesn't exist)
echo "Ensuring Artifact Registry repository exists..."
gcloud artifacts repositories describe docker-repo \
  --location="$REGION" \
  --project="$PROJECT_ID" 2>/dev/null || \
gcloud artifacts repositories create docker-repo \
  --repository-format=docker \
  --location="$REGION" \
  --project="$PROJECT_ID"

IMAGE_URL="$REGION-docker.pkg.dev/$PROJECT_ID/docker-repo/$SERVICE_NAME"

# 3. Build and push the Docker image
echo "Building and pushing Docker image..."
gcloud builds submit \
  --tag "$IMAGE_URL" \
  --project "$PROJECT_ID"

# 4. Deploy to Cloud Run
echo "Deploying to Cloud Run..."
gcloud run deploy "$SERVICE_NAME" \
  --image "$IMAGE_URL" \
  --platform managed \
  --region "$REGION" \
  --project "$PROJECT_ID" \
  --allow-unauthenticated \
  --port 8080 \
  --memory 512Mi \
  --cpu 1 \
  --min-instances 0 \
  --max-instances 3 \
  --set-env-vars "^@^GCP_PROJECT_ID=$PROJECT_ID@GCP_LOCATION=eu@GCP_PROCESSOR_ID=$PROCESSOR_ID@FRONTEND_URL=$FRONTEND_URL@GEMINI_API_KEY=$GEMINI_API_KEY"

# 5. Get the service URL
SERVICE_URL=$(gcloud run services describe "$SERVICE_NAME" \
  --region "$REGION" \
  --project "$PROJECT_ID" \
  --format "value(status.url)")

echo ""
echo "Deployment complete!"
echo "Service URL: $SERVICE_URL"
echo ""
echo "Next steps:"
echo "  1. Set NEXT_PUBLIC_ML_SERVICE_URL=$SERVICE_URL in your frontend environment"
echo "  2. Grant the Cloud Run service account Document AI permissions:"
echo "     gcloud projects add-iam-policy-binding $PROJECT_ID \\"
echo "       --member='serviceAccount:$PROJECT_ID@appspot.gserviceaccount.com' \\"
echo "       --role='roles/documentai.apiUser'"
echo ""
echo "Test the health endpoint:"
echo "  curl $SERVICE_URL/api/health"
