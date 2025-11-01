#!/bin/bash

# TagWallet.ai Google Cloud Setup Script
# This script automates the setup of Google Cloud infrastructure for TagWallet.ai

set -e

PROJECT_ID="tagwallet-ai"
REGION="us-central1"
DB_PASSWORD="TagWallet2024SecureDB!"
USER_PASSWORD="TagWallet2024User!"

echo "🚀 Setting up TagWallet.ai on Google Cloud"
echo "Project ID: $PROJECT_ID"
echo "Region: $REGION"

# Check if gcloud is installed
if ! command -v gcloud &> /dev/null; then
    echo "❌ gcloud CLI is not installed. Please install it first:"
    echo "   https://cloud.google.com/sdk/docs/install"
    exit 1
fi

# Authenticate if needed
echo "🔐 Checking authentication..."
if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" | head -n 1 > /dev/null; then
    echo "Please authenticate with Google Cloud:"
    gcloud auth login
fi

# Create project
echo "📋 Creating project: $PROJECT_ID"
gcloud projects create $PROJECT_ID --name="TagWallet AI" --set-as-default || {
    echo "Project may already exist, setting as default..."
    gcloud config set project $PROJECT_ID
}

# Check if billing is enabled
echo "💳 Checking billing status..."
BILLING_ENABLED=$(gcloud billing projects describe $PROJECT_ID --format="value(billingEnabled)" 2>/dev/null || echo "false")
if [ "$BILLING_ENABLED" != "True" ]; then
    echo "⚠️  Billing is not enabled for this project."
    echo "   Please enable billing at: https://console.cloud.google.com/billing/linkedaccount?project=$PROJECT_ID"
    echo "   Press Enter to continue after enabling billing..."
    read
    echo "ℹ️  Continuing with setup..."
fi

# Enable APIs
echo "🔧 Enabling required APIs..."
gcloud services enable \
    cloudbuild.googleapis.com \
    run.googleapis.com \
    containerregistry.googleapis.com \
    sql-component.googleapis.com \
    sqladmin.googleapis.com \
    storage.googleapis.com \
    walletobjects.googleapis.com \
    iam.googleapis.com

# Create service account
echo "👤 Creating service account..."
if ! gcloud iam service-accounts describe tagwallet-service@$PROJECT_ID.iam.gserviceaccount.com >/dev/null 2>&1; then
    gcloud iam service-accounts create tagwallet-service \
        --display-name="TagWallet Service Account" \
        --description="Service account for TagWallet AI application"
    echo "✅ Service account created successfully"
else
    echo "ℹ️  Service account already exists"
fi

# Wait a moment for service account to propagate
echo "⏳ Waiting for service account to propagate..."
sleep 10

# Grant permissions
echo "🔑 Setting up permissions..."
gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:tagwallet-service@$PROJECT_ID.iam.gserviceaccount.com" \
    --role="roles/storage.admin" \
    --quiet

gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:tagwallet-service@$PROJECT_ID.iam.gserviceaccount.com" \
    --role="roles/cloudsql.client" \
    --quiet

gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:tagwallet-service@$PROJECT_ID.iam.gserviceaccount.com" \
    --role="roles/run.invoker" \
    --quiet

# Grant your user Cloud SQL admin permissions
echo "🔐 Granting Cloud SQL admin permissions to your account..."
USER_EMAIL=$(gcloud auth list --filter=status:ACTIVE --format="value(account)" | head -n 1)
gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="user:$USER_EMAIL" \
    --role="roles/cloudsql.admin" \
    --quiet

# Create service account key
echo "🗝️  Creating service account key..."
if [ ! -f tagwallet-service-key.json ]; then
    gcloud iam service-accounts keys create tagwallet-service-key.json \
        --iam-account=tagwallet-service@$PROJECT_ID.iam.gserviceaccount.com
    echo "✅ Service account key created"
else
    echo "ℹ️  Service account key already exists"
fi

# Create storage bucket
echo "📦 Creating storage bucket..."
gsutil mb -p $PROJECT_ID gs://tagwallet-ai-storage || echo "Bucket may already exist"

# Set bucket permissions
echo "🔓 Setting bucket permissions..."
gsutil iam ch allUsers:objectViewer gs://tagwallet-ai-storage

# Create Cloud SQL instance
echo "🗄️  Creating Cloud SQL database instance..."
if ! gcloud sql instances describe tagwallet-db >/dev/null 2>&1; then
    gcloud sql instances create tagwallet-db \
        --database-version=POSTGRES_14 \
        --tier=db-f1-micro \
        --region=$REGION \
        --root-password=$DB_PASSWORD \
        --storage-type=SSD \
        --storage-size=10GB \
        --backup-start-time=03:00
    echo "✅ Database instance created successfully"

    # Wait for instance to be ready
    echo "⏳ Waiting for database instance to be ready..."
    gcloud sql instances patch tagwallet-db --backup-start-time=03:00 --quiet
    sleep 30
else
    echo "ℹ️  Database instance already exists"
fi

# Create database
echo "📊 Creating database..."
if ! gcloud sql databases describe wallet_tags --instance=tagwallet-db >/dev/null 2>&1; then
    gcloud sql databases create wallet_tags --instance=tagwallet-db
    echo "✅ Database created successfully"
else
    echo "ℹ️  Database already exists"
fi

# Create database user
echo "👥 Creating database user..."
if ! gcloud sql users describe tagwallet_user --instance=tagwallet-db >/dev/null 2>&1; then
    gcloud sql users create tagwallet_user \
        --instance=tagwallet-db \
        --password=$USER_PASSWORD
    echo "✅ Database user created successfully"
else
    echo "ℹ️  Database user already exists"
fi

# Get connection name
CONNECTION_NAME=$(gcloud sql instances describe tagwallet-db --format="value(connectionName)")

# Create .env file for production
echo "⚙️  Creating production environment file..."
cat > .env.production << EOF
# Production Environment Configuration for TagWallet.ai

# Server Configuration
PORT=8080
NODE_ENV=production

# Database Configuration (Cloud SQL)
DATABASE_URL=postgresql://tagwallet_user:$USER_PASSWORD@/$PROJECT_ID?host=/cloudsql/$CONNECTION_NAME
DB_HOST=/cloudsql/$CONNECTION_NAME
DB_PORT=5432
DB_NAME=wallet_tags
DB_USER=tagwallet_user
DB_PASSWORD=$USER_PASSWORD

# JWT Configuration (CHANGE THIS IN PRODUCTION!)
JWT_SECRET=$(openssl rand -base64 32)
JWT_EXPIRES_IN=7d

# Google Cloud Configuration
GOOGLE_CLOUD_PROJECT_ID=$PROJECT_ID
GOOGLE_CLOUD_STORAGE_BUCKET=tagwallet-ai-storage
GOOGLE_APPLICATION_CREDENTIALS=/app/tagwallet-service-key.json

# Google Wallet Configuration (TO BE CONFIGURED)
GOOGLE_WALLET_ISSUER_ID=YOUR_GOOGLE_WALLET_ISSUER_ID
GOOGLE_WALLET_SERVICE_ACCOUNT_EMAIL=tagwallet-service@$PROJECT_ID.iam.gserviceaccount.com

# Apple Wallet Configuration (TO BE CONFIGURED)
APPLE_WALLET_TEAM_ID=YOUR_APPLE_TEAM_ID
APPLE_WALLET_PASS_TYPE_ID=pass.ai.tagwallet.passes
APPLE_WALLET_KEY_ID=YOUR_APPLE_KEY_ID
APPLE_WALLET_KEY_PASSPHRASE=YOUR_APPLE_KEY_PASSPHRASE

# Application URLs (Will be updated after deployment)
FRONTEND_URL=https://tagwallet-service-xxxx-uc.a.run.app
API_BASE_URL=https://tagwallet-service-xxxx-uc.a.run.app
EOF

echo "✅ Google Cloud setup complete!"
echo ""
echo "📝 Next steps:"
echo "1. Configure Apple Wallet certificates:"
echo "   - Place certificates in ./certificates/ directory"
echo "   - Update Apple Wallet environment variables in .env.production"
echo ""
echo "2. Configure Google Wallet:"
echo "   - Apply for Google Wallet API access"
echo "   - Update Google Wallet environment variables in .env.production"
echo ""
echo "3. Deploy the application:"
echo "   ./deploy.sh"
echo ""
echo "🔗 Useful links:"
echo "   Project Console: https://console.cloud.google.com/home/dashboard?project=$PROJECT_ID"
echo "   Cloud SQL: https://console.cloud.google.com/sql/instances?project=$PROJECT_ID"
echo "   Cloud Storage: https://console.cloud.google.com/storage/browser/tagwallet-ai-storage?project=$PROJECT_ID"
echo "   Cloud Run: https://console.cloud.google.com/run?project=$PROJECT_ID"
echo ""
echo "💾 Important credentials saved to:"
echo "   - Service account key: ./tagwallet-service-key.json"
echo "   - Production config: ./.env.production"
echo "   - Database password: $DB_PASSWORD"
echo "   - Database user password: $USER_PASSWORD"
echo ""
echo "🔒 Please store these credentials securely!"