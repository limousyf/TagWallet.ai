#!/bin/bash

# Wallet Tags Service Deployment Script
# This script sets up and deploys the wallet tags service to Google Cloud Run

set -e

# Configuration
PROJECT_ID=${GOOGLE_CLOUD_PROJECT:-"tagwallet-ai"}
REGION=${GOOGLE_CLOUD_REGION:-"us-central1"}
SERVICE_NAME="tagwallet-service"
IMAGE_NAME="gcr.io/$PROJECT_ID/$SERVICE_NAME"

echo "🚀 Starting deployment of Wallet Tags Service"
echo "Project ID: $PROJECT_ID"
echo "Region: $REGION"
echo "Service Name: $SERVICE_NAME"

# Check if gcloud is installed
if ! command -v gcloud &> /dev/null; then
    echo "❌ gcloud CLI is not installed. Please install it first."
    exit 1
fi

# Check if user is authenticated
if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" | head -n 1 > /dev/null; then
    echo "❌ Not authenticated with gcloud. Please run 'gcloud auth login'"
    exit 1
fi

# Set the project
echo "📋 Setting project to $PROJECT_ID"
gcloud config set project $PROJECT_ID

# Enable required APIs
echo "🔧 Enabling required Google Cloud APIs..."
gcloud services enable \
    cloudbuild.googleapis.com \
    run.googleapis.com \
    containerregistry.googleapis.com \
    sql-component.googleapis.com \
    sqladmin.googleapis.com \
    storage.googleapis.com

# Create storage bucket if it doesn't exist
BUCKET_NAME="tagwallet-ai-storage"
echo "📦 Creating storage bucket: $BUCKET_NAME"
gsutil mb -p $PROJECT_ID gs://$BUCKET_NAME || echo "Bucket may already exist"

# Set bucket permissions
gsutil iam ch allUsers:objectViewer gs://$BUCKET_NAME

# Create certificates directory in bucket
echo "📂 Setting up certificates directory in bucket"
echo "Please upload your Apple Wallet certificates to gs://$BUCKET_NAME/certificates/"
echo "Required files: wwdr.pem, signerCert.pem, signerKey.key"

# Build and deploy using Cloud Build
echo "🏗️  Building and deploying with Cloud Build..."
gcloud builds submit --config cloudbuild.yaml .

# Set environment variables for Cloud Run (non-sensitive only)
echo "⚙️  Setting basic environment variables..."
gcloud run services update $SERVICE_NAME \
    --region=$REGION \
    --set-env-vars="NODE_ENV=production" \
    --set-env-vars="PORT=8080" \
    --set-env-vars="GOOGLE_CLOUD_PROJECT_ID=$PROJECT_ID" \
    --set-env-vars="GOOGLE_CLOUD_STORAGE_BUCKET=$BUCKET_NAME" \
    --add-cloudsql-instances=tagwallet-ai:us-central1:tagwallet-db

echo ""
echo "⚠️  IMPORTANT: You need to set sensitive environment variables manually in Cloud Run console:"
echo "   1. Go to: https://console.cloud.google.com/run/detail/$REGION/$SERVICE_NAME?project=$PROJECT_ID"
echo "   2. Click 'Edit & Deploy New Revision'"
echo "   3. Go to 'Variables & Secrets' tab"
echo "   4. Add these environment variables:"
echo ""
echo "   DATABASE_URL=postgresql://tagwallet_user:YOUR_DB_PASSWORD@/wallet_tags?host=/cloudsql/tagwallet-ai:us-central1:tagwallet-db"
echo "   JWT_SECRET=YOUR_SECURE_JWT_SECRET"
echo "   DB_PASSWORD=YOUR_DB_PASSWORD"
echo ""
echo "   Optional (for wallet functionality):"
echo "   APPLE_WALLET_TEAM_ID=YOUR_APPLE_TEAM_ID"
echo "   APPLE_WALLET_PASS_TYPE_ID=YOUR_PASS_TYPE_ID"
echo "   APPLE_WALLET_KEY_ID=YOUR_KEY_ID"
echo "   APPLE_WALLET_KEY_PASSPHRASE=YOUR_KEY_PASSPHRASE"
echo "   GOOGLE_WALLET_ISSUER_ID=YOUR_ISSUER_ID"
echo ""

# Get the service URL
SERVICE_URL=$(gcloud run services describe $SERVICE_NAME --region=$REGION --format="value(status.url)")

echo "✅ Deployment complete!"
echo "🌐 Service URL: $SERVICE_URL"
echo "📊 Health check: $SERVICE_URL/health"
echo ""
echo "📝 Next steps:"
echo "1. Set up your PostgreSQL database (Cloud SQL recommended)"
echo "2. Upload Apple Wallet certificates to gs://$BUCKET_NAME/certificates/"
echo "3. Configure environment variables in Cloud Run console"
echo "4. Set up your custom domain (optional)"
echo ""
echo "🔗 Useful links:"
echo "   Cloud Run Console: https://console.cloud.google.com/run/detail/$REGION/$SERVICE_NAME"
echo "   Cloud Storage: https://console.cloud.google.com/storage/browser/$BUCKET_NAME"
echo "   Cloud Build: https://console.cloud.google.com/cloud-build/builds"