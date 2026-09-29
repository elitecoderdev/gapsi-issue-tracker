#!/usr/bin/env bash
set -euo pipefail

PROJECT_ID="${PROJECT_ID:?Set PROJECT_ID}"
REGION="${REGION:-us-central1}"

gcloud config set project "$PROJECT_ID"
gcloud run services delete issue-tracker-web --region "$REGION" --quiet || true
gcloud run services delete issue-tracker-api --region "$REGION" --quiet || true
gcloud secrets delete jwt-secret-key --quiet || true
for image in issue-tracker-api issue-tracker-web; do
  gcloud artifacts docker images delete \
    "${REGION}-docker.pkg.dev/${PROJECT_ID}/cloud-run-source-deploy/${image}" --delete-tags --quiet || true
done
gcloud iam service-accounts delete "issue-tracker-api@${PROJECT_ID}.iam.gserviceaccount.com" --quiet || true
