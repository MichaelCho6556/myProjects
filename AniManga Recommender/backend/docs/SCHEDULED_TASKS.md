# Scheduled Tasks Configuration

Since we've removed Celery, scheduled tasks are now handled by external cron services. Here are the recommended approaches:

## Option 1: GitHub Actions (Recommended)

The `.github/workflows/scheduled-tasks.yml` file contains scheduled workflows that call compute endpoints.

### Required GitHub Secrets:
- `API_URL`: Your backend API URL (e.g., https://your-api.onrender.com)
- `API_KEY`: Secret key for authenticating scheduled task requests

### Schedule:
- **Hourly**: Platform statistics update
- **Daily (2 AM UTC)**: User statistics, popular lists calculation
- **Every 6 hours**: Cache cleanup

## Option 2: External Cron Services

### cron-job.org (Free)
1. Sign up at https://cron-job.org
2. Create jobs with these URLs:

**Hourly Jobs:**
- Platform Stats: `POST https://your-api.onrender.com/api/compute/platform-stats`

**Daily Jobs:**
- All User Stats: `POST https://your-api.onrender.com/api/compute/all-user-stats`
- Popular Lists: `POST https://your-api.onrender.com/api/compute/popular-lists`

**Every 6 Hours:**
- Cache Cleanup: `POST https://your-api.onrender.com/api/compute/cleanup-cache`

### Headers for all requests:
```
Authorization: Bearer YOUR_API_KEY
Content-Type: application/json
```

## Option 3: Render Cron Jobs (Paid)

If using Render's paid plan, you can configure native cron jobs:

```yaml
# render.yaml
services:
  - type: cron
    name: platform-stats
    env: python
    schedule: "0 * * * *"
    buildCommand: pip install -r requirements.txt
    startCommand: python scripts/run_task.py platform-stats

  - type: cron
    name: daily-tasks
    env: python
    schedule: "0 2 * * *"
    buildCommand: pip install -r requirements.txt
    startCommand: python scripts/run_task.py daily-tasks
```

## API Authentication

To secure scheduled task endpoints, implement one of these approaches:

### 1. Bearer Token (Current Implementation)
Add to your compute endpoints:
```python
@compute_bp.route('/endpoint', methods=['POST'])
@token_required  # Or custom decorator for API key validation
def scheduled_endpoint():
    # Validate API key from Authorization header
    pass
```

### 2. IP Whitelist
Configure your hosting provider to only accept requests from:
- GitHub Actions IPs
- cron-job.org IPs
- Your own IPs

### 3. Webhook Signature
Implement HMAC signature validation for webhook security.

## Monitoring

Track scheduled task execution:
1. Add logging to each compute endpoint
2. Monitor via your hosting provider's logs
3. Set up alerts for failed jobs
4. Use the `/api/compute/health` endpoint for monitoring

## Local Development

For local testing, manually trigger endpoints:
```bash
# Platform stats
curl -X POST http://localhost:5000/api/compute/platform-stats \
  -H "Authorization: Bearer test-key"

# All user stats
curl -X POST http://localhost:5000/api/compute/all-user-stats \
  -H "Authorization: Bearer test-key"
```