#!/bin/bash

# Check if TagWallet.ai is ready for deployment

PROJECT_ID="tagwallet-ai"

echo "🔍 Checking deployment readiness for TagWallet.ai"
echo "==============================================="

READY=true

# Check 1: Project setup
echo "1. Checking project setup..."
if gcloud config get-value project | grep -q "$PROJECT_ID"; then
    echo "✅ Project set to $PROJECT_ID"
else
    echo "❌ Project not set correctly"
    echo "   Run: gcloud config set project $PROJECT_ID"
    READY=false
fi

# Check 2: APIs enabled
echo "2. Checking APIs..."
REQUIRED_APIS=("cloudbuild.googleapis.com" "run.googleapis.com" "containerregistry.googleapis.com")
for api in "${REQUIRED_APIS[@]}"; do
    if gcloud services list --enabled --filter="name:$api" --format="value(name)" | grep -q "$api"; then
        echo "✅ $api enabled"
    else
        echo "❌ $api not enabled"
        READY=false
    fi
done

# Check 3: Service account
echo "3. Checking service account..."
if gcloud iam service-accounts describe tagwallet-service@$PROJECT_ID.iam.gserviceaccount.com >/dev/null 2>&1; then
    echo "✅ Service account exists"
else
    echo "❌ Service account missing"
    READY=false
fi

# Check 4: Service account key
echo "4. Checking service account key..."
if [ -f "tagwallet-service-key.json" ]; then
    echo "✅ Service account key file exists"
else
    echo "❌ Service account key file missing"
    echo "   Run: gcloud iam service-accounts keys create tagwallet-service-key.json --iam-account=tagwallet-service@$PROJECT_ID.iam.gserviceaccount.com"
    READY=false
fi

# Check 5: Storage bucket
echo "5. Checking storage bucket..."
if gsutil ls gs://tagwallet-ai-storage >/dev/null 2>&1; then
    echo "✅ Storage bucket exists"
else
    echo "❌ Storage bucket missing"
    READY=false
fi

# Check 6: Cloud SQL
echo "6. Checking Cloud SQL..."
if gcloud sql instances describe tagwallet-db >/dev/null 2>&1; then
    echo "✅ Cloud SQL instance exists"
else
    echo "❌ Cloud SQL instance missing"
    READY=false
fi

# Check 7: Environment configuration
echo "7. Checking environment template..."
if [ -f ".env.template" ]; then
    echo "✅ Environment template exists"
    echo "   Note: You'll set actual credentials after deployment with ./set-env-vars.sh"
else
    echo "❌ Environment template missing"
    READY=false
fi

# Check 8: Build configuration
echo "8. Checking build configuration..."
if [ -f "cloudbuild.yaml" ]; then
    echo "✅ Cloud Build configuration exists"
else
    echo "❌ Cloud Build configuration missing"
    READY=false
fi

if [ -f "Dockerfile" ]; then
    echo "✅ Dockerfile exists"
else
    echo "❌ Dockerfile missing"
    READY=false
fi

echo ""
if [ "$READY" = true ]; then
    echo "🎉 All checks passed! Ready to deploy."
    echo ""
    echo "🚀 To deploy your TagWallet.ai service:"
    echo "   1. ./deploy.sh                 # Deploy the application"
    echo "   2. ./set-env-vars.sh           # Set secure environment variables"
    echo ""
    echo "📋 Your database info:"
    echo "   Instance: tagwallet-db"
    echo "   Database: wallet_tags"
    echo "   User: tagwallet_user"
    echo "   Password: [You have this from the Cloud SQL setup]"
    echo ""
    echo "🔗 After deployment, you can:"
    echo "   1. Visit your service URL to access the app"
    echo "   2. Create an admin user account"
    echo "   3. Configure Apple/Google Wallet credentials"
else
    echo "❌ Some checks failed. Please fix the issues above before deploying."
    echo ""
    echo "🔧 Quick fixes:"
    echo "   - Run: ./validate-setup.sh for detailed diagnostics"
    echo "   - Run: ./setup-gcp.sh to complete missing setup"
fi