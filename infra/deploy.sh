#!/usr/bin/env bash
set -euo pipefail

PROJECT_ID="${PROJECT_ID:?Set PROJECT_ID}"
REGION="${REGION:-us-central1}"
API_SERVICE="issue-tracker-api"
WEB_SERVICE="issue-tracker-web"
API_SA="${API_SERVICE}@${PROJECT_ID}.iam.gserviceaccount.com"
ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"

gcloud config set project "$PROJECT_ID"

gcloud services enable run.googleapis.com firestore.googleapis.com cloudbuild.googleapis.com \
  artifactregistry.googleapis.com secretmanager.googleapis.com

gcloud firestore databases describe --database="(default)" >/dev/null 2>&1 \
  || gcloud firestore databases create --location="$REGION" --type=firestore-native

for fields in "status" "priority" "status priority"; do
  args=()
  for field in $fields; do args+=("--field-config=field-path=${field},order=ascending"); done
  gcloud firestore indexes composite create --collection-group=issues --query-scope=COLLECTION \
    "${args[@]}" --field-config=field-path=created_at,order=descending --async || true
done

gcloud iam service-accounts describe "$API_SA" >/dev/null 2>&1 \
  || gcloud iam service-accounts create "$API_SERVICE" --display-name="Issue Tracker API"
gcloud projects add-iam-policy-binding "$PROJECT_ID" --member="serviceAccount:${API_SA}" \
  --role="roles/datastore.user" --condition=None >/dev/null

if ! gcloud secrets describe jwt-secret-key >/dev/null 2>&1; then
  python3 -c "import secrets; print(secrets.token_urlsafe(64), end='')" \
    | gcloud secrets create jwt-secret-key --replication-policy=automatic --data-file=-
fi
gcloud secrets add-iam-policy-binding jwt-secret-key --member="serviceAccount:${API_SA}" \
  --role="roles/secretmanager.secretAccessor" >/dev/null

gcloud run deploy "$API_SERVICE" --source "${ROOT_DIR}/backend" --region "$REGION" \
  --service-account "$API_SA" \
  --set-secrets "JWT_SECRET_KEY=jwt-secret-key:latest" \
  --set-env-vars "ENVIRONMENT=production,REPOSITORY_BACKEND=firestore,GCP_PROJECT_ID=${PROJECT_ID}" \
  --no-invoker-iam-check --min-instances 0 --max-instances 2 --memory 512Mi --cpu 1 --timeout 30 --quiet

API_URL="$(gcloud run services describe "$API_SERVICE" --region "$REGION" --format='value(status.url)')"

gcloud run deploy "$WEB_SERVICE" --source "${ROOT_DIR}/frontend" --region "$REGION" \
  --set-env-vars "API_UPSTREAM=${API_URL}" \
  --no-invoker-iam-check --min-instances 0 --max-instances 2 --memory 256Mi --cpu 1 --concurrency 200 --quiet

echo "API: ${API_URL}"
echo "Web: $(gcloud run services describe "$WEB_SERVICE" --region "$REGION" --format='value(status.url)')"
