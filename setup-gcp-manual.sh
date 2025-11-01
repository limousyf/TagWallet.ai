#!/bin/bash

# TagWallet.ai Manual Google Cloud Setup Script
# This script provides step-by-step commands for manual setup

set -e

PROJECT_ID="tagwallet-ai"
REGION="us-central1"

echo "🚀 TagWallet.ai Google Cloud Setup - Manual Mode"
echo "================================================"
echo ""
echo "This script will guide you through setting up Google Cloud for TagWallet.ai"
echo "You'll run each command manually and verify success before proceeding."
echo ""
echo "Project ID: $PROJECT_ID"
echo "Region: $REGION"
echo ""

# Function to wait for user confirmation
wait_for_confirmation() {
    echo "Press Enter to continue, or Ctrl+C to exit..."
    read
}

echo "Step 1: Authenticate with Google Cloud"
echo "======================================="
echo "Run this command:"
echo "gcloud auth login"
echo ""
wait_for_confirmation

echo "Step 2: Create the project"
echo "=========================="
echo "Run this command:"
echo "gcloud projects create $PROJECT_ID --name=\"TagWallet AI\""
echo ""
echo "If the project already exists, run:"
echo "gcloud config set project $PROJECT_ID"
echo ""
wait_for_confirmation

echo "Step 3: Enable billing"
echo "======================"
echo "Go to the Google Cloud Console and enable billing:"
echo "https://console.cloud.google.com/billing/linkedaccount?project=$PROJECT_ID"
echo ""
echo "Billing must be enabled before proceeding."
echo ""
wait_for_confirmation

echo "Step 4: Enable required APIs"
echo "============================"
echo "Run this command:"
cat << 'EOF'
gcloud services enable \
    cloudbuild.googleapis.com \
    run.googleapis.com \
    containerregistry.googleapis.com \
    sql-component.googleapis.com \
    sqladmin.googleapis.com \
    storage.googleapis.com \
    walletobjects.googleapis.com \
    iam.googleapis.com
EOF
echo ""
wait_for_confirmation

echo "Step 5: Create service account"
echo "=============================="
echo "Run this command:"
echo "gcloud iam service-accounts create tagwallet-service --display-name=\"TagWallet Service Account\""
echo ""
wait_for_confirmation

echo "Step 6: Grant permissions to service account"
echo "============================================"
echo "Run these commands one by one:"
echo ""
echo "gcloud projects add-iam-policy-binding $PROJECT_ID --member=\"serviceAccount:tagwallet-service@$PROJECT_ID.iam.gserviceaccount.com\" --role=\"roles/storage.admin\""
echo ""
echo "gcloud projects add-iam-policy-binding $PROJECT_ID --member=\"serviceAccount:tagwallet-service@$PROJECT_ID.iam.gserviceaccount.com\" --role=\"roles/cloudsql.client\""
echo ""
echo "gcloud projects add-iam-policy-binding $PROJECT_ID --member=\"serviceAccount:tagwallet-service@$PROJECT_ID.iam.gserviceaccount.com\" --role=\"roles/run.invoker\""
echo ""
wait_for_confirmation

echo "Step 7: Create service account key"
echo "=================================="
echo "Run this command:"
echo "gcloud iam service-accounts keys create tagwallet-service-key.json --iam-account=tagwallet-service@$PROJECT_ID.iam.gserviceaccount.com"
echo ""
wait_for_confirmation

echo "Step 8: Create storage bucket"
echo "============================="
echo "Run these commands:"
echo "gsutil mb -p $PROJECT_ID gs://tagwallet-ai-storage"
echo "gsutil iam ch allUsers:objectViewer gs://tagwallet-ai-storage"
echo ""
wait_for_confirmation

echo "Step 9: Create Cloud SQL database"
echo "================================="
echo "Run these commands (replace YOUR_SECURE_PASSWORD with a strong password):"
echo ""
echo "gcloud sql instances create tagwallet-db --database-version=POSTGRES_14 --tier=db-f1-micro --region=$REGION --root-password=YOUR_SECURE_PASSWORD"
echo ""
echo "gcloud sql databases create wallet_tags --instance=tagwallet-db"
echo ""
echo "gcloud sql users create tagwallet_user --instance=tagwallet-db --password=YOUR_USER_PASSWORD"
echo ""
wait_for_confirmation

echo "Step 10: Get database connection info"
echo "====================================="
echo "Run this command to get the connection name:"
echo "gcloud sql instances describe tagwallet-db --format=\"value(connectionName)\""
echo ""
echo "Save this connection name - you'll need it for the environment configuration."
echo ""
wait_for_confirmation

echo "✅ Manual setup complete!"
echo ""
echo "Next steps:"
echo "1. Create your .env.production file with the database connection string"
echo "2. Add your Apple Wallet certificates to ./certificates/"
echo "3. Configure Google Wallet API access"
echo "4. Run ./deploy.sh to deploy your application"
echo ""
echo "Example .env.production:"
cat << 'EOF'
NODE_ENV=production
PORT=8080
DATABASE_URL=postgresql://tagwallet_user:YOUR_PASSWORD@/wallet_tags?host=/cloudsql/CONNECTION_NAME
GOOGLE_CLOUD_PROJECT_ID=tagwallet-ai
GOOGLE_CLOUD_STORAGE_BUCKET=tagwallet-ai-storage
GOOGLE_APPLICATION_CREDENTIALS=/app/tagwallet-service-key.json
JWT_SECRET=your-generated-secret
EOF
echo ""
echo "🔗 Useful links:"
echo "   Project Console: https://console.cloud.google.com/home/dashboard?project=$PROJECT_ID"
echo "   Cloud SQL: https://console.cloud.google.com/sql/instances?project=$PROJECT_ID"
echo "   Cloud Storage: https://console.cloud.google.com/storage/browser/tagwallet-ai-storage?project=$PROJECT_ID"