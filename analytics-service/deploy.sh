#!/bin/bash

PROJECT_ID="fin-track-adc2c"
SERVICE_NAME="analytics-service"
REGION="europe-west1"
FRONTEND_URL="https://fin-track-adc2c.web.app,https://fin-track-adc2c.firebaseapp.com,http://localhost:3001,http://localhost:3000"

echo "Deploying $SERVICE_NAME to Google Cloud Run..."

cd "$(dirname "$0")"

echo "Enabling required APIs..."
gcloud services enable \
  cloudbuild.googleapis.com \
  run.googleapis.com \
  artifactregistry.googleapis.com \
  --project "$PROJECT_ID"

echo "Ensuring Artifact Registry repository exists..."
gcloud artifacts repositories describe docker-repo \
  --location="$REGION" \
  --project="$PROJECT_ID" 2>/dev/null || \
gcloud artifacts repositories create docker-repo \
  --repository-format=docker \
  --location="$REGION" \
  --project="$PROJECT_ID"

IMAGE_URL="$REGION-docker.pkg.dev/$PROJECT_ID/docker-repo/$SERVICE_NAME"

echo "Building and pushing Docker image..."
gcloud builds submit \
  --tag "$IMAGE_URL" \
  --project "$PROJECT_ID"

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
  --set-env-vars "^@^FIREBASE_PROJECT_ID=$PROJECT_ID@ALLOWED_ORIGINS=$FRONTEND_URL"

SERVICE_URL=$(gcloud run services describe "$SERVICE_NAME" \
  --region "$REGION" \
  --project "$PROJECT_ID" \
  --format "value(status.url)")

echo ""
echo "Deployment complete!"
echo "Service URL: $SERVICE_URL"
echo ""
echo "Next steps:"
echo "  1. Add NEXT_PUBLIC_ANALYTICS_SERVICE_URL=$SERVICE_URL to your frontend environment"
echo "  2. Grant the Cloud Run service account Firestore read permissions if needed"
echo ""
echo "Test the health endpoint:"
echo "  curl $SERVICE_URL/api/health"
