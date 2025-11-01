#!/bin/bash

# Simple Cloud SQL Setup for TagWallet.ai
# Run this separately if the main setup script has Cloud SQL issues

PROJECT_ID="tagwallet-ai"
REGION="us-central1"
DB_PASSWORD="TagWallet2024SecureDB!"
USER_PASSWORD="TagWallet2024User!"

echo "🗄️  Setting up Cloud SQL for TagWallet.ai"
echo "=========================================="

# Set project
gcloud config set project $PROJECT_ID

# Grant Cloud SQL admin role to your user
echo "🔐 Ensuring you have Cloud SQL admin permissions..."
USER_EMAIL=$(gcloud auth list --filter=status:ACTIVE --format="value(account)" | head -n 1)
echo "   Your email: $USER_EMAIL"

gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="user:$USER_EMAIL" \
    --role="roles/cloudsql.admin" \
    --quiet

echo "⏳ Waiting for permissions to propagate..."
sleep 15

# Check if instance exists
echo "🔍 Checking if Cloud SQL instance exists..."
if gcloud sql instances describe tagwallet-db >/dev/null 2>&1; then
    echo "✅ Cloud SQL instance already exists"
else
    echo "📋 Creating Cloud SQL instance..."
    echo "   This may take 3-5 minutes..."

    gcloud sql instances create tagwallet-db \
        --database-version=POSTGRES_14 \
        --tier=db-f1-micro \
        --region=$REGION \
        --root-password="$DB_PASSWORD" \
        --storage-type=SSD \
        --storage-size=10GB \
        --availability-type=ZONAL \
        --no-backup

    if [ $? -eq 0 ]; then
        echo "✅ Cloud SQL instance created successfully"
    else
        echo "❌ Failed to create Cloud SQL instance"
        echo "   Try creating it manually in the console:"
        echo "   https://console.cloud.google.com/sql/instances?project=$PROJECT_ID"
        exit 1
    fi
fi

# Wait for instance to be ready
echo "⏳ Waiting for instance to be ready..."
sleep 10

# Create database
echo "📊 Creating database..."
if gcloud sql databases describe wallet_tags --instance=tagwallet-db >/dev/null 2>&1; then
    echo "✅ Database already exists"
else
    gcloud sql databases create wallet_tags --instance=tagwallet-db
    if [ $? -eq 0 ]; then
        echo "✅ Database created successfully"
    else
        echo "❌ Failed to create database"
        exit 1
    fi
fi

# Create user
echo "👥 Creating database user..."
if gcloud sql users list --instance=tagwallet-db --filter="name=tagwallet_user" --format="value(name)" | grep -q "tagwallet_user"; then
    echo "✅ Database user already exists"
else
    gcloud sql users create tagwallet_user \
        --instance=tagwallet-db \
        --password="$USER_PASSWORD"

    if [ $? -eq 0 ]; then
        echo "✅ Database user created successfully"
    else
        echo "❌ Failed to create database user"
        exit 1
    fi
fi

# Get connection info
echo "📋 Getting connection information..."
CONNECTION_NAME=$(gcloud sql instances describe tagwallet-db --format="value(connectionName)")
INSTANCE_IP=$(gcloud sql instances describe tagwallet-db --format="value(ipAddresses[0].ipAddress)")

echo ""
echo "✅ Cloud SQL setup complete!"
echo ""
echo "📋 Connection Details:"
echo "   Instance Name: tagwallet-db"
echo "   Connection Name: $CONNECTION_NAME"
echo "   Instance IP: $INSTANCE_IP"
echo "   Database: wallet_tags"
echo "   User: tagwallet_user"
echo "   Password: $USER_PASSWORD"
echo "   Root Password: $DB_PASSWORD"
echo ""
echo "🔗 Connection String for Cloud Run:"
echo "   postgresql://tagwallet_user:$USER_PASSWORD@/wallet_tags?host=/cloudsql/$CONNECTION_NAME"
echo ""
echo "🌐 Console URL:"
echo "   https://console.cloud.google.com/sql/instances/tagwallet-db/overview?project=$PROJECT_ID"
echo ""
echo "💾 Save these credentials securely!"