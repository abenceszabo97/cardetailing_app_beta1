# X-CLEAN Deployment Guide

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     YOUR DOMAIN                              │
├─────────────────┬─────────────────┬─────────────────────────┤
│ admin.domain.com│booking.domain.com│   api.domain.com       │
│   (Admin App)   │  (Public Booking)│     (Backend API)      │
│   React SPA     │    React SPA     │     FastAPI            │
└────────┬────────┴────────┬─────────┴──────────┬─────────────┘
         │                 │                     │
         └─────────────────┴──────────┬──────────┘
                                      │
                            ┌─────────▼─────────┐
                            │   MongoDB Atlas   │
                            │    (Database)     │
                            └───────────────────┘
```

## Deployment Options

### Option 1: Railway (Recommended for Backend)

1. **Backend Deployment**
   - Create new Railway project
   - Connect GitHub repo, set root directory to `/backend`
   - Add environment variables (see `.env.example`)
   - Railway auto-deploys on push

2. **Environment Variables on Railway:**
   ```
   MONGO_URL=mongodb+srv://...
   DB_NAME=xclean_production
   CORS_ORIGINS=https://admin.yourdomain.com,https://booking.yourdomain.com
   EMERGENT_LLM_KEY=sk-emergent-...
   ```

### Option 2: Frontend Deployment (Vercel/Netlify)

#### Admin App
1. Create new Vercel project
2. Set root directory: `/frontend`
3. Build command: `npm run build`
4. Output directory: `build`
5. Environment variable:
   ```
   REACT_APP_BACKEND_URL=https://api.yourdomain.com
   ```
6. Set custom domain: `admin.yourdomain.com`

#### Booking App (Same frontend, different entry)
- Currently uses same codebase
- Route `/booking` is public (no auth required)
- Can be same deployment or separate

### Option 3: VPS/Docker Deployment

```dockerfile
# Backend Dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY backend/requirements.txt .
RUN pip install -r requirements.txt
COPY backend/ .
CMD ["uvicorn", "server:app", "--host", "0.0.0.0", "--port", "8001"]
```

## Domain Configuration

### DNS Setup (Cloudflare/Your DNS Provider)

| Type  | Name    | Content                           |
|-------|---------|-----------------------------------|
| A     | admin   | Your frontend IP/CNAME            |
| A     | booking | Your frontend IP/CNAME            |
| A     | api     | Your backend IP/Railway URL       |

### For Railway:
Use CNAME record pointing to `*.up.railway.app`

### For Vercel:
Use CNAME record pointing to `cname.vercel-dns.com`

## SSL Certificates

- Railway: Automatic SSL included
- Vercel: Automatic SSL included
- Custom VPS: Use Let's Encrypt (certbot)

## MongoDB Atlas Setup

1. Create free cluster at mongodb.com/atlas
2. Create database user
3. Whitelist IP addresses (0.0.0.0/0 for Railway)
4. Get connection string
5. Replace `<password>` with actual password

## Post-Deployment Checklist

- [ ] Backend health check: `https://api.yourdomain.com/api/health`
- [ ] CORS configured for frontend domains
- [ ] MongoDB Atlas IP whitelist includes backend IP
- [ ] Environment variables set in all services
- [ ] Custom domains configured with SSL
- [ ] Test booking flow end-to-end
- [ ] Test admin login (Google OAuth)

## Troubleshooting

### CORS Errors
- Ensure `CORS_ORIGINS` includes exact frontend URLs (with https://)
- No trailing slashes in URLs

### MongoDB Connection
- Check IP whitelist in Atlas
- Verify connection string format
- Test with `mongosh` locally first

### Google OAuth
- Update authorized redirect URIs in Google Console
- Add production domains to allowed origins
