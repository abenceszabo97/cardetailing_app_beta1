# X-CLEAN Car Wash Management System - Backend

## Environment Variables

Required environment variables for production:

```
# MongoDB Connection
MONGO_URL=mongodb+srv://user:password@cluster.mongodb.net/xclean
DB_NAME=xclean_production

# CORS Origins (comma-separated for multiple domains)
CORS_ORIGINS=https://admin.yourdomain.com,https://booking.yourdomain.com

# AI Integration (Emergent LLM)
EMERGENT_LLM_KEY=sk-emergent-xxxxx

# SMS Notifications (Twilio) - Optional
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=+1234567890

# Email Notifications (Resend) - Optional
RESEND_API_KEY=re_xxxxx
SENDER_EMAIL=noreply@yourdomain.com
```

## Running Locally

```bash
cd backend
pip install -r requirements.txt
uvicorn server:app --reload --host 0.0.0.0 --port 8001
```

## Deployment on Railway

1. Connect your GitHub repository to Railway
2. Set the root directory to `/backend`
3. Add environment variables in Railway dashboard
4. Railway will auto-detect Python and use Procfile

## API Endpoints

- `GET /api/health` - Health check
- `POST /api/auth/google` - Google OAuth login
- `GET /api/jobs/today` - Today's jobs (includes bookings)
- `POST /api/bookings` - Create booking (public)
- `POST /api/ai/upsell` - AI upsell suggestions
- `POST /api/ai/photo-analysis` - AI car photo analysis
