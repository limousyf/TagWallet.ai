#!/bin/bash

# Secure Environment Variables Setup for TagWallet.ai Cloud Run
# This script helps you set sensitive environment variables in Cloud Run

PROJECT_ID="tagwallet-ai"
REGION="us-central1"
SERVICE_NAME="tagwallet-service"

echo "🔐 Setting up environment variables for TagWallet.ai"
echo "=================================================="
echo ""
echo "This script will help you securely set environment variables in Cloud Run."
echo "You'll be prompted to enter sensitive values that won't be stored in git."
echo ""

# Function to read password securely
read_password() {
    local prompt="$1"
    local var_name="$2"
    echo -n "$prompt: "
    read -s value
    echo ""
    export $var_name="$value"
}

# Function to read regular input
read_input() {
    local prompt="$1"
    local var_name="$2"
    local default="$3"
    if [ -n "$default" ]; then
        echo -n "$prompt [$default]: "
    else
        echo -n "$prompt: "
    fi
    read value
    if [ -z "$value" ] && [ -n "$default" ]; then
        value="$default"
    fi
    export $var_name="$value"
}

echo "📋 Required Environment Variables"
echo "================================"

# Database credentials
echo ""
echo "Database Configuration:"
read_password "Database Password (tagwallet_user password)" DB_PASSWORD
read_password "JWT Secret (or press Enter to generate)" JWT_SECRET

# Generate JWT secret if not provided
if [ -z "$JWT_SECRET" ]; then
    JWT_SECRET=$(openssl rand -base64 32 2>/dev/null || echo "TagWallet$(date +%s)SecureSecret")
    echo "Generated JWT secret automatically"
fi

# Optional wallet configurations
echo ""
echo "Wallet Configuration (Optional - press Enter to skip):"
echo "You can configure these later in the Cloud Run console."
echo ""

read_input "Apple Wallet Team ID" APPLE_WALLET_TEAM_ID
read_input "Apple Wallet Pass Type ID" APPLE_WALLET_PASS_TYPE_ID "pass.ai.tagwallet.passes"
read_input "Apple Wallet Key ID" APPLE_WALLET_KEY_ID
read_password "Apple Wallet Key Passphrase" APPLE_WALLET_KEY_PASSPHRASE

read_input "Google Wallet Issuer ID" GOOGLE_WALLET_ISSUER_ID

echo ""
echo "🚀 Setting environment variables in Cloud Run..."

# Build the env vars string
ENV_VARS="DATABASE_URL=postgresql://tagwallet_user:${DB_PASSWORD}@/wallet_tags?host=/cloudsql/tagwallet-ai:us-central1:tagwallet-db"
ENV_VARS="$ENV_VARS,JWT_SECRET=${JWT_SECRET}"
ENV_VARS="$ENV_VARS,DB_PASSWORD=${DB_PASSWORD}"

# Add optional Apple Wallet vars if provided
if [ -n "$APPLE_WALLET_TEAM_ID" ]; then
    ENV_VARS="$ENV_VARS,APPLE_WALLET_TEAM_ID=${APPLE_WALLET_TEAM_ID}"
fi
if [ -n "$APPLE_WALLET_PASS_TYPE_ID" ]; then
    ENV_VARS="$ENV_VARS,APPLE_WALLET_PASS_TYPE_ID=${APPLE_WALLET_PASS_TYPE_ID}"
fi
if [ -n "$APPLE_WALLET_KEY_ID" ]; then
    ENV_VARS="$ENV_VARS,APPLE_WALLET_KEY_ID=${APPLE_WALLET_KEY_ID}"
fi
if [ -n "$APPLE_WALLET_KEY_PASSPHRASE" ]; then
    ENV_VARS="$ENV_VARS,APPLE_WALLET_KEY_PASSPHRASE=${APPLE_WALLET_KEY_PASSPHRASE}"
fi

# Add Google Wallet vars if provided
if [ -n "$GOOGLE_WALLET_ISSUER_ID" ]; then
    ENV_VARS="$ENV_VARS,GOOGLE_WALLET_ISSUER_ID=${GOOGLE_WALLET_ISSUER_ID}"
fi

# Set the environment variables
gcloud run services update $SERVICE_NAME \
    --region=$REGION \
    --set-env-vars="$ENV_VARS" \
    --project=$PROJECT_ID

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Environment variables set successfully!"
    echo ""
    echo "🌐 Your service is now configured with:"
    echo "   ✓ Database connection"
    echo "   ✓ JWT authentication"
    if [ -n "$APPLE_WALLET_TEAM_ID" ]; then
        echo "   ✓ Apple Wallet configuration"
    fi
    if [ -n "$GOOGLE_WALLET_ISSUER_ID" ]; then
        echo "   ✓ Google Wallet configuration"
    fi
    echo ""

    SERVICE_URL=$(gcloud run services describe $SERVICE_NAME --region=$REGION --format="value(status.url)" --project=$PROJECT_ID)
    echo "🚀 Your TagWallet.ai service is ready at:"
    echo "   $SERVICE_URL"
    echo ""
    echo "📋 Next steps:"
    echo "   1. Visit your service URL"
    echo "   2. Create your first admin account"
    echo "   3. Upload Apple Wallet certificates to Cloud Storage (if using Apple Wallet)"
    echo ""
else
    echo "❌ Failed to set environment variables"
    echo "   You can set them manually in the Cloud Run console:"
    echo "   https://console.cloud.google.com/run/detail/$REGION/$SERVICE_NAME?project=$PROJECT_ID"
fi

# Clear sensitive variables from memory
unset DB_PASSWORD JWT_SECRET APPLE_WALLET_KEY_PASSPHRASE ENV_VARS