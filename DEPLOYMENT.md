# Deployment Guide

## Environment Variables Setup

### Backend (Render)

Set these environment variables in your Render service dashboard:

```bash
# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-anon-key

# CORS Configuration  
ALLOWED_ORIGINS=https://your-frontend.vercel.app,http://localhost:3000

# Optional API Key (leave empty for MVP)
API_KEY=your-secret-api-key
```

### Frontend (Vercel)

Set these environment variables in your Vercel project settings:

```bash
# Backend API URL
NEXT_PUBLIC_API_URL=https://your-backend.onrender.com

# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# API Key (same as backend if using)
API_KEY=your-secret-api-key
```

## Supabase Setup

1. **Create Supabase Project**
   - Go to [supabase.com](https://supabase.com)
   - Create new project
   - Note your project URL and anon key

2. **Run Database Schema**
   - Go to SQL Editor in Supabase dashboard
   - Copy and paste the contents of `supabase-schema.sql`
   - Execute the SQL to create tables

3. **Get Credentials**
   - Project URL: Found in Settings > API
   - Anon Key: Found in Settings > API (public anon key)

## Deployment Steps

### 1. Deploy Backend to Render

1. Connect your GitHub repository to Render
2. Create new Web Service
3. Configure:
   - Build Command: `pip install -r requirements.txt`
   - Start Command: `uvicorn app:app --host 0.0.0.0 --port $PORT`
   - Environment: Python 3.11
4. Set environment variables (see above)
5. Deploy

### 2. Deploy Frontend to Vercel

1. Connect your GitHub repository to Vercel
2. Configure:
   - Framework: Next.js
   - Root Directory: `frontend`
   - Build Command: `npm run build`
3. Set environment variables (see above)
4. Deploy

### 3. Update CORS Settings

After both deployments are complete:

1. Get your Vercel URL (e.g., `https://your-app.vercel.app`)
2. Update `ALLOWED_ORIGINS` in Render with your Vercel URL
3. Redeploy backend

## Testing Deployment

1. **Test Backend Health**: `https://your-backend.onrender.com/health`
2. **Test Scoring**: Submit a loan application on your Vercel site
3. **Test Dashboard**: Check if portfolio data loads
4. **Test Simulator**: Adjust threshold slider

## Troubleshooting

### Common Issues

1. **CORS Errors**: Ensure `ALLOWED_ORIGINS` includes your Vercel URL
2. **Database Connection**: Verify Supabase URL and key are correct
3. **API Key Mismatch**: Ensure same `API_KEY` on both services
4. **Model Not Loading**: Check that `model.pkl` exists in backend

### Health Check Endpoints

- Backend: `GET /health` - Shows model and database status
- Frontend: Check browser console for API errors

## Production Considerations

- Set up proper API key rotation
- Enable Supabase Row Level Security for production
- Add rate limiting to prevent abuse
- Set up monitoring and alerting
- Consider caching for portfolio aggregates
