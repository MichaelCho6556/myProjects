# Environment Variables Setup Guide

This guide provides comprehensive information about setting up environment variables for the AniManga Recommender project.

## Quick Start

1. Copy the `.env.example` file to `.env` in your project root
2. Update all placeholder values with your actual configuration
3. Ensure sensitive keys are kept secure and never committed to version control

## Required Environment Variables

### Supabase Configuration

| Variable               | Description                     | Example                                   | Required |
| ---------------------- | ------------------------------- | ----------------------------------------- | -------- |
| `SUPABASE_URL`         | Your Supabase project URL       | `https://abcdefgh.supabase.co`            | ✅ Yes   |
| `SUPABASE_KEY`         | Public anonymous key            | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` | ✅ Yes   |
| `SUPABASE_SERVICE_KEY` | Service role key (backend only) | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` | ✅ Yes   |

**Security Note:** The `SUPABASE_SERVICE_KEY` has admin privileges and should NEVER be exposed to frontend code.

### JWT Authentication

| Variable         | Description                      | Example                             | Required |
| ---------------- | -------------------------------- | ----------------------------------- | -------- |
| `JWT_SECRET_KEY` | Secret key for JWT token signing | `your_32_character_secret_key_here` | ✅ Yes   |

**Generation Command:**

```bash
openssl rand -hex 32
```

### Frontend Configuration

| Variable                      | Description               | Example                        | Required |
| ----------------------------- | ------------------------- | ------------------------------ | -------- |
| `REACT_APP_API_URL`           | Backend API base URL      | `http://localhost:5000`        | ✅ Yes   |
| `REACT_APP_SUPABASE_URL`      | Supabase URL for frontend | `https://abcdefgh.supabase.co` | ✅ Yes   |
| `REACT_APP_SUPABASE_ANON_KEY` | Public key for frontend   | `eyJhbGciOiJIUzI1NiI...`       | ✅ Yes   |

## Optional Environment Variables

### Flask Backend Configuration

| Variable           | Description          | Default       | Example             |
| ------------------ | -------------------- | ------------- | ------------------- |
| `FLASK_ENV`        | Flask environment    | `development` | `production`        |
| `FLASK_DEBUG`      | Enable debug mode    | `true`        | `false`             |
| `FLASK_HOST`       | Host to bind to      | `localhost`   | `0.0.0.0`           |
| `FLASK_PORT`       | Port to run on       | `5000`        | `8080`              |
| `FLASK_SECRET_KEY` | Flask session secret | Generated     | `your_flask_secret` |

### CORS Configuration

| Variable       | Description          | Default                 | Example                  |
| -------------- | -------------------- | ----------------------- | ------------------------ |
| `CORS_ORIGINS` | Allowed CORS origins | `http://localhost:3000` | `https://yourdomain.com` |

### Security Configuration

| Variable                   | Description                 | Default   | Example            |
| -------------------------- | --------------------------- | --------- | ------------------ |
| `CSRF_SECRET_KEY`          | CSRF protection secret      | Generated | `your_csrf_secret` |
| `RATE_LIMIT_AUTHENTICATED` | Requests/min for auth users | `60`      | `100`              |
| `RATE_LIMIT_ANONYMOUS`     | Requests/min for anon users | `30`      | `50`               |

### Performance Configuration

| Variable                | Description               | Default | Example |
| ----------------------- | ------------------------- | ------- | ------- |
| `CACHE_TTL_MINUTES`     | Cache time-to-live        | `5`     | `10`    |
| `MAX_ITEMS_PER_REQUEST` | Max items in API response | `100`   | `200`   |
| `SIMILARITY_THRESHOLD`  | Recommendation threshold  | `0.1`   | `0.2`   |

### Logging Configuration

| Variable                 | Description      | Default      | Example        |
| ------------------------ | ---------------- | ------------ | -------------- |
| `LOG_LEVEL`              | Logging level    | `INFO`       | `DEBUG`        |
| `LOG_FILE`               | Log file path    | Console only | `logs/app.log` |
| `ENABLE_REQUEST_LOGGING` | Log API requests | `true`       | `false`        |

## Environment-Specific Configuration

### Development Environment

```env
FLASK_ENV=development
FLASK_DEBUG=true
REACT_APP_API_URL=http://localhost:5000
CORS_ORIGINS=http://localhost:3000
LOG_LEVEL=DEBUG
ENABLE_REQUEST_LOGGING=true
```

### Production Environment

```env
FLASK_ENV=production
FLASK_DEBUG=false
REACT_APP_API_URL=https://api.yourdomain.com
CORS_ORIGINS=https://yourdomain.com
LOG_LEVEL=WARNING
ENABLE_REQUEST_LOGGING=false
USE_SSL=true
```

### Testing Environment

```env
FLASK_ENV=testing
FLASK_DEBUG=false
SUPABASE_URL=https://test-project.supabase.co
JWT_SECRET_KEY=test_secret_key_for_testing_only
LOG_LEVEL=ERROR
```

## Setup Instructions

### 1. Supabase Setup

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to Settings > API in your Supabase dashboard
3. Copy the following values:
   - Project URL → `SUPABASE_URL`
   - Anonymous public key → `SUPABASE_KEY`
   - Service role key → `SUPABASE_SERVICE_KEY`

### 2. Database Migration

Run the database migration scripts to set up required tables:

```bash
cd backend
python scripts/migrate_csv_to_supabase.py
```

### 3. Frontend Configuration

Ensure your React app can connect to the backend:

```bash
cd frontend
npm install
npm start
```

### 4. Backend Configuration

Start the Flask backend server:

```bash
cd backend
pip install -r requirements.txt
python app.py
```

## Security Best Practices

### 1. Secret Management

- **Never commit** `.env` files to version control
- Use different secrets for each environment
- Rotate secrets regularly
- Store production secrets in secure vault services

### 2. Key Generation

Generate strong random keys for all secret values:

```bash
# JWT Secret Key
openssl rand -hex 32

# Flask Secret Key
python -c "import secrets; print(secrets.token_hex(32))"

# CSRF Secret Key
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 3. Environment Separation

Use separate environment files for different stages:

```
.env.development
.env.staging
.env.production
```

### 4. Access Control

- `SUPABASE_SERVICE_KEY` should only be accessible to backend servers
- Frontend should only use `SUPABASE_KEY` (anonymous key)
- Use environment-specific IAM roles and permissions

## Troubleshooting

### Common Issues

#### 1. "Authentication required" Error

**Cause:** Missing or incorrect Supabase configuration

**Solution:**

```bash
# Verify your Supabase keys
echo $SUPABASE_URL
echo $SUPABASE_KEY
```

#### 2. CORS Errors

**Cause:** Frontend URL not allowed in CORS configuration

**Solution:**

```env
CORS_ORIGINS=http://localhost:3000,https://yourdomain.com
```

#### 3. "Dataset not available" Error

**Cause:** Database not properly migrated or Supabase connection failed

**Solution:**

```bash
# Test Supabase connection
curl -H "apikey: $SUPABASE_KEY" "$SUPABASE_URL/rest/v1/items?limit=1"
```

#### 4. JWT Token Issues

**Cause:** Mismatched JWT secret keys between frontend and backend

**Solution:**

```bash
# Ensure both environments use the same JWT_SECRET_KEY
grep JWT_SECRET_KEY .env
```

#### 5. Rate Limiting Issues

**Cause:** Too many requests exceeding configured limits

**Solution:**

```env
# Adjust rate limits
RATE_LIMIT_AUTHENTICATED=120
RATE_LIMIT_ANONYMOUS=60
```

### Health Check Commands

Test your configuration with these commands:

```bash
# Backend health check
curl http://localhost:5000/

# API items endpoint
curl http://localhost:5000/api/items?limit=1

# Authentication test (with valid token)
curl -H "Authorization: Bearer $JWT_TOKEN" http://localhost:5000/api/auth/profile
```

## Monitoring and Logging

### Environment Variable Validation

Add this to your application startup to validate required variables:

```python
required_vars = [
    'SUPABASE_URL',
    'SUPABASE_KEY',
    'SUPABASE_SERVICE_KEY',
    'JWT_SECRET_KEY'
]

missing_vars = [var for var in required_vars if not os.getenv(var)]
if missing_vars:
    raise ValueError(f"Missing required environment variables: {missing_vars}")
```

### Logging Configuration

```python
import logging
import os

log_level = os.getenv('LOG_LEVEL', 'INFO')
logging.basicConfig(
    level=getattr(logging, log_level),
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
```

## Production Deployment

### Docker Configuration

```dockerfile
# Use build args for environment-specific values
ARG SUPABASE_URL
ARG SUPABASE_KEY
ARG JWT_SECRET_KEY

ENV SUPABASE_URL=$SUPABASE_URL
ENV SUPABASE_KEY=$SUPABASE_KEY
ENV JWT_SECRET_KEY=$JWT_SECRET_KEY
```

### Kubernetes Secrets

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: animanga-secrets
type: Opaque
data:
  supabase-service-key: <base64-encoded-key>
  jwt-secret-key: <base64-encoded-key>
```

### Cloud Provider Integration

- **AWS:** Use Parameter Store or Secrets Manager
- **Google Cloud:** Use Secret Manager
- **Azure:** Use Key Vault
- **Heroku:** Use Config Vars
- **Vercel:** Use Environment Variables dashboard

---

**Last Updated:** January 2024  
**Version:** 1.0.0
