# Wallet Tags Service

A comprehensive online service for generating Apple Wallet and Google Wallet passes with NFC and QR code support. Built with Node.js, TypeScript, Fastify, and designed to run on Google Cloud Run.

## Features

- 🍎 **Apple Wallet Integration** - Generate .pkpass files using passkit-generator
- 🤖 **Google Wallet Integration** - Create passes for Google Wallet using Google Wallet API
- 📶 **NFC Support** - Enable near-field communication for contactless interactions
- 🔲 **QR Code Generation** - Automatic QR code generation for easy pass distribution
- 👤 **User Management** - Complete user registration, authentication, and profile management
- 📋 **Template System** - Save and reuse pass templates for consistent branding
- 🛡️ **Admin Interface** - Comprehensive admin panel for user and pass management
- ☁️ **Cloud Native** - Designed to run on Google Cloud Run with Cloud Storage integration
- 🎨 **Modern UI** - Clean, responsive interface inspired by OpenAI/Claude developer portals

## Tech Stack

### Backend
- **Node.js** with **TypeScript**
- **Fastify** - Fast and efficient web framework
- **PostgreSQL** - Reliable relational database
- **passkit-generator** - Apple Wallet pass generation
- **Google Wallet API** - Google Wallet integration
- **Google Cloud Storage** - File storage for passes and certificates
- **JWT** - Secure authentication

### Frontend
- **Vanilla JavaScript** - Modern ES6+ with modules
- **CSS3** - Custom design system with CSS Grid and Flexbox
- **Responsive Design** - Mobile-first approach

### Infrastructure
- **Google Cloud Run** - Serverless container platform
- **Google Cloud Storage** - Object storage
- **Google Cloud SQL** - Managed PostgreSQL
- **Docker** - Containerization

## Quick Start

### Prerequisites

1. Node.js 18+ installed
2. PostgreSQL database
3. Google Cloud account with the following APIs enabled:
   - Cloud Run API
   - Cloud Storage API
   - Cloud SQL API
   - Google Wallet API
4. Apple Developer account (for Apple Wallet certificates)

### Installation

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd wallet-tags-service
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up environment variables:**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Set up the database:**
   ```bash
   # Create a PostgreSQL database
   createdb wallet_tags

   # The application will automatically create tables on first run
   ```

5. **Set up Apple Wallet certificates:**
   ```bash
   mkdir certificates
   # Place your Apple Wallet certificates in the certificates directory:
   # - wwdr.pem (Apple WWDR certificate)
   # - signerCert.pem (Your signing certificate)
   # - signerKey.key (Your private key)
   ```

6. **Start the development server:**
   ```bash
   npm run dev
   ```

The application will be available at `http://localhost:3000`.

## Configuration

### Environment Variables

```env
# Server Configuration
PORT=3000
NODE_ENV=development

# Database Configuration
DATABASE_URL=postgresql://username:password@localhost:5432/wallet_tags
DB_HOST=localhost
DB_PORT=5432
DB_NAME=wallet_tags
DB_USER=username
DB_PASSWORD=password

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRES_IN=7d

# Google Cloud Configuration
GOOGLE_CLOUD_PROJECT_ID=your-project-id
GOOGLE_CLOUD_STORAGE_BUCKET=your-storage-bucket
GOOGLE_APPLICATION_CREDENTIALS=path/to/service-account.json

# Google Wallet Configuration
GOOGLE_WALLET_ISSUER_ID=your-issuer-id
GOOGLE_WALLET_SERVICE_ACCOUNT_EMAIL=your-service-account@your-project.iam.gserviceaccount.com

# Apple Wallet Configuration
APPLE_WALLET_TEAM_ID=your-team-id
APPLE_WALLET_PASS_TYPE_ID=pass.com.yourcompany.walletapp
APPLE_WALLET_KEY_ID=your-key-id
APPLE_WALLET_KEY_PASSPHRASE=your-key-passphrase

# Application URLs
FRONTEND_URL=http://localhost:3001
API_BASE_URL=http://localhost:3000
```

## Deployment

### Google Cloud Run

1. **Set up Google Cloud infrastructure:**
   ```bash
   ./setup-gcp.sh
   # or for manual setup:
   ./setup-gcp-manual.sh
   ```

2. **Deploy the application:**
   ```bash
   ./deploy.sh
   ```

3. **Configure sensitive environment variables:**
   ```bash
   ./set-env-vars.sh
   ```
   This script will securely prompt for:
   - Database password
   - JWT secret
   - Apple Wallet credentials (optional)
   - Google Wallet credentials (optional)

4. **Upload Apple Wallet certificates (if using Apple Wallet):**
   ```bash
   gsutil cp certificates/* gs://tagwallet-ai-storage/certificates/
   ```

### Manual Deployment

1. **Build and push the Docker image:**
   ```bash
   docker build -t gcr.io/YOUR_PROJECT_ID/wallet-tags-service .
   docker push gcr.io/YOUR_PROJECT_ID/wallet-tags-service
   ```

2. **Deploy to Cloud Run:**
   ```bash
   gcloud run deploy wallet-tags-service \
     --image gcr.io/YOUR_PROJECT_ID/wallet-tags-service \
     --region us-central1 \
     --platform managed \
     --allow-unauthenticated
   ```

## API Documentation

### Authentication

All API endpoints except registration and login require a JWT token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

### Endpoints

#### Authentication
- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user info
- `POST /api/auth/refresh` - Refresh JWT token

#### User Management
- `GET /api/users/profile` - Get user profile
- `PUT /api/users/profile` - Update user profile

#### Pass Templates
- `POST /api/templates` - Create a new template
- `GET /api/templates` - Get user templates
- `GET /api/templates/:id` - Get specific template
- `PUT /api/templates/:id` - Update template
- `DELETE /api/templates/:id` - Delete template

#### Pass Management
- `POST /api/passes` - Create a new pass
- `GET /api/passes` - Get user passes
- `GET /api/passes/stats` - Get pass statistics
- `GET /api/passes/:id` - Get specific pass
- `GET /api/passes/:serialNumber/:walletType` - Get pass by serial number
- `DELETE /api/passes/:id` - Delete pass

#### Admin (Admin users only)
- `GET /api/admin/users` - Get all users
- `GET /api/admin/templates` - Get all templates
- `GET /api/admin/passes` - Get all passes
- `GET /api/admin/stats` - Get global statistics
- `DELETE /api/admin/users/:id` - Delete user
- `DELETE /api/admin/templates/:id` - Delete template
- `DELETE /api/admin/passes/:id` - Delete pass

## Usage Examples

### Creating a Pass

```javascript
const passData = {
  walletType: 'apple', // or 'google'
  passData: {
    organizationName: 'My Company',
    logoText: 'Event Pass',
    description: 'Access pass for Tech Conference 2024',
    backgroundColor: '#1a1a1a',
    foregroundColor: '#ffffff',
    barcode: {
      message: 'CONFERENCE2024-12345',
      format: 'PKBarcodeFormatQR',
      messageEncoding: 'iso-8859-1'
    },
    nfc: {
      message: 'CONFERENCE2024-12345'
    }
  }
};

const response = await fetch('/api/passes', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify(passData)
});

const result = await response.json();
console.log('Pass created:', result.pass);
```

### Creating a Template

```javascript
const templateData = {
  name: 'Event Pass Template',
  description: 'Standard template for event passes',
  template: {
    organizationName: 'My Company',
    logoText: 'Event Pass',
    description: 'Access pass template',
    backgroundColor: '#1a1a1a',
    foregroundColor: '#ffffff'
  }
};

const response = await fetch('/api/templates', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify(templateData)
});
```

## Apple Wallet Setup

1. **Join the Apple Developer Program**
2. **Create a Pass Type ID:**
   - Go to Apple Developer Console
   - Create a new Pass Type ID (e.g., `pass.com.yourcompany.walletapp`)
3. **Generate certificates:**
   - Create a Pass Type ID certificate
   - Download the certificate and private key
   - Convert to PEM format if needed
4. **Download WWDR certificate:**
   - Download the Apple Worldwide Developer Relations certificate

## Google Wallet Setup

1. **Create a Google Cloud Project**
2. **Enable the Google Wallet API**
3. **Create a service account:**
   - Generate a service account key file
   - Grant necessary permissions
4. **Register as a Google Wallet API issuer:**
   - Submit your application for review
   - Get your issuer ID

## Security Considerations

- All passwords are hashed using bcrypt
- JWT tokens are used for authentication
- Environment variables store sensitive configuration
- HTTPS is enforced in production
- Input validation on all endpoints
- SQL injection protection through parameterized queries

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support, please open an issue in the GitHub repository or contact the development team.

## Roadmap

- [ ] Template marketplace
- [ ] Advanced analytics
- [ ] Bulk pass generation
- [ ] Custom branding options
- [ ] Multi-language support
- [ ] API rate limiting
- [ ] Webhook support for pass updates
- [ ] Integration with more wallet providers