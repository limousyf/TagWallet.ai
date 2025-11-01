#!/bin/bash

# TagWallet.ai Setup Validation Script
# This script validates that your Google Cloud setup is correct

PROJECT_ID="tagwallet-ai"

echo "🔍 Validating TagWallet.ai Google Cloud setup..."
echo "================================================"

# Check if authenticated
echo "1. Checking authentication..."
if gcloud auth list --filter=status:ACTIVE --format="value(account)" | head -n 1 > /dev/null; then
    ACCOUNT=$(gcloud auth list --filter=status:ACTIVE --format="value(account)" | head -n 1)
    echo "✅ Authenticated as: $ACCOUNT"
else
    echo "❌ Not authenticated. Run: gcloud auth login"
    exit 1
fi

# Check if project exists
echo "2. Checking project..."
if gcloud projects describe $PROJECT_ID >/dev/null 2>&1; then
    echo "✅ Project $PROJECT_ID exists"
    gcloud config set project $PROJECT_ID
else
    echo "❌ Project $PROJECT_ID not found"
    echo "   Create it with: gcloud projects create $PROJECT_ID --name=\"TagWallet AI\""
    exit 1
fi

# Check billing
echo "3. Checking billing..."
BILLING_ENABLED=$(gcloud billing projects describe $PROJECT_ID --format="value(billingEnabled)" 2>/dev/null || echo "false")
if [ "$BILLING_ENABLED" = "True" ]; then
    echo "✅ Billing is enabled"
else
    echo "⚠️  Billing not enabled - some services may not work"
fi

# Check APIs
echo "4. Checking required APIs..."
REQUIRED_APIS=(
    "cloudbuild.googleapis.com"
    "run.googleapis.com"
    "containerregistry.googleapis.com"
    "sql-component.googleapis.com"
    "sqladmin.googleapis.com"
    "storage.googleapis.com"
    "walletobjects.googleapis.com"
    "iam.googleapis.com"
)

for api in "${REQUIRED_APIS[@]}"; do
    if gcloud services list --enabled --filter="name:$api" --format="value(name)" | grep -q "$api"; then
        echo "✅ $api enabled"
    else
        echo "❌ $api not enabled"
        echo "   Enable it with: gcloud services enable $api"
    fi
done

# Check service account
echo "5. Checking service account..."
if gcloud iam service-accounts describe tagwallet-service@$PROJECT_ID.iam.gserviceaccount.com >/dev/null 2>&1; then
    echo "✅ Service account exists"
else
    echo "❌ Service account not found"
    echo "   Create it with: gcloud iam service-accounts create tagwallet-service"
fi

# Check service account key
echo "6. Checking service account key..."
if [ -f "tagwallet-service-key.json" ]; then
    echo "✅ Service account key file exists"
else
    echo "❌ Service account key file not found"
    echo "   Create it with: gcloud iam service-accounts keys create tagwallet-service-key.json --iam-account=tagwallet-service@$PROJECT_ID.iam.gserviceaccount.com"
fi

# Check storage bucket
echo "7. Checking storage bucket..."
if gsutil ls gs://tagwallet-ai-storage >/dev/null 2>&1; then
    echo "✅ Storage bucket exists"
else
    echo "❌ Storage bucket not found"
    echo "   Create it with: gsutil mb -p $PROJECT_ID gs://tagwallet-ai-storage"
fi

# Check Cloud SQL instance
echo "8. Checking Cloud SQL instance..."
if gcloud sql instances describe tagwallet-db >/dev/null 2>&1; then
    echo "✅ Cloud SQL instance exists"
    CONNECTION_NAME=$(gcloud sql instances describe tagwallet-db --format="value(connectionName)")
    echo "   Connection name: $CONNECTION_NAME"

    # Check database
    if gcloud sql databases describe wallet_tags --instance=tagwallet-db >/dev/null 2>&1; then
        echo "✅ Database 'wallet_tags' exists"
    else
        echo "⚠️  Database 'wallet_tags' not found"
    fi

    # Check user
    if gcloud sql users list --instance=tagwallet-db --filter="name=tagwallet_user" --format="value(name)" | grep -q "tagwallet_user"; then
        echo "✅ Database user 'tagwallet_user' exists"
    else
        echo "⚠️  Database user 'tagwallet_user' not found"
    fi
else
    echo "❌ Cloud SQL instance not found"
    echo "   Run: ./setup-cloudsql.sh to create it"
fi

# Check environment file
echo "9. Checking environment configuration..."
if [ -f ".env.production" ]; then
    echo "✅ Production environment file exists"
else
    echo "⚠️  Production environment file not found"
    echo "   You'll need to create .env.production with your database credentials"
fi

echo ""
echo "🎯 Validation complete!"
echo ""
echo "If you see any ❌ errors above, please fix them before deploying."
echo "If you see ⚠️  warnings, the setup will work but may need additional configuration."
echo ""
echo "To deploy your application, run: ./deploy.sh"